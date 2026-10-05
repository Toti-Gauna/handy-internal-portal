import assert from "node:assert/strict";
import test from "node:test";
import { DemoPortalDataSource, PortalSourceError } from "./portal-source.ts";
import { especialistasQuery, HttpPortalDataSource, usuariosQuery } from "./http-source.ts";

const especialistaApi = {
  id: "PRE-1",
  tipo: "especialista",
  nombre: "Ana P.",
  email: "ana@example.com",
  whatsapp: "223 000-0001",
  rubros: ["gas"],
  zona: "Centro",
  cuit: "si",
  creadoEn: "2026-10-01T10:00:00-03:00",
  etapa: "identificado",
  eventos: [{ fecha: "2026-10-02T10:00:00-03:00", tipo: "intento", actor: "Operador/a", motivo: null, proximoSeguimiento: "2026-10-03T10:00:00-03:00" }],
  proximoSeguimiento: "2026-10-03T10:00:00-03:00",
  especialistaId: null,
};

const porEstado = { todos: 1, sin_contactar: 0, con_intentos: 1, contactado: 0, comprometido: 0 };

interface Call {
  url: string;
  init?: RequestInit;
}

function fakeFetch(status: number, body: unknown, calls: Call[] = []) {
  return async (url: string, init?: RequestInit): Promise<Response> => {
    calls.push({ url, init });
    return new Response(typeof body === "string" ? body : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  };
}

const filters = { search: " gas ", rubro: "gas", cuit: "any", contacto: "con_intentos", orden: "antiguos", page: 2, pageSize: 500 } as const;

test("los filtros viajan al servidor sin valores vacíos y con pageSize acotado", () => {
  assert.equal(especialistasQuery(filters), "tipo=especialista&q=gas&rubro=gas&contacto=con_intentos&orden=antiguos&page=2&pageSize=50");
  assert.equal(usuariosQuery({ search: "", orden: "recientes", page: 1, pageSize: 8 }), "tipo=usuario&orden=recientes&page=1&pageSize=8");
});

test("la lista se valida, se mapea al dominio y manda credenciales de sesión", async () => {
  const calls: Call[] = [];
  const source = new HttpPortalDataSource(
    "https://api.example.com/",
    fakeFetch(200, { rows: [especialistaApi], total: 1, page: 1, pageSize: 8, totalPages: 1, porEstado }, calls),
  );
  const page = await source.searchPreregistrosEspecialistas({ ...filters, pageSize: 8 });

  assert.equal(calls[0]?.url.startsWith("https://api.example.com/admin/preregistros?tipo=especialista"), true);
  assert.equal(calls[0]?.init?.credentials, "include");
  assert.equal(page.porEstado.any, 1);
  assert.equal(page.rows[0]?.eventos[0]?.kind, "contact_attempt");
  assert.equal(page.rows[0]?.especialistaId, undefined);
});

test("el resumen completa con 0 los rubros que el servidor omite", async () => {
  const source = new HttpPortalDataSource(
    "https://api.example.com",
    fakeFetch(200, { especialistas: 1, usuarios: 3, porEstado, porRubro: { gas: 1 }, cola: [especialistaApi] }),
  );
  const resumen = await source.getResumen();
  assert.equal(resumen.porRubro.gas, 1);
  assert.equal(resumen.porRubro.plomeria, 0);
  assert.equal(resumen.porEstado.con_intentos, 1);
  assert.equal(resumen.cola[0]?.id, "PRE-1");
});

test("una respuesta con forma inesperada no llega a la UI", async () => {
  const source = new HttpPortalDataSource("https://api.example.com", fakeFetch(200, { rows: [{ ...especialistaApi, rubros: ["jardineria"] }] }));
  await assert.rejects(source.searchPreregistrosUsuarios({ search: "", orden: "recientes", page: 1, pageSize: 8 }), (error: unknown) => {
    return error instanceof PortalSourceError && error.kind === "invalid_response";
  });
});

test("los errores HTTP se normalizan sin exponer el cuerpo del servidor", async () => {
  const cases: Array<[number, string]> = [[401, "unauthorized"], [403, "forbidden"], [500, "server"], [422, "invalid_request"]];
  for (const [status, kind] of cases) {
    const source = new HttpPortalDataSource("https://api.example.com", fakeFetch(status, "stack trace con datos"));
    await assert.rejects(source.getResumen(), (error: unknown) => {
      return error instanceof PortalSourceError && error.kind === kind && !error.message.includes("stack");
    });
  }
  const offline = new HttpPortalDataSource("https://api.example.com", async () => {
    throw new TypeError("Failed to fetch");
  });
  await assert.rejects(offline.getResumen(), (error: unknown) => error instanceof PortalSourceError && error.kind === "network");
});

test("una ficha inexistente devuelve undefined en vez de error", async () => {
  const source = new HttpPortalDataSource("https://api.example.com", fakeFetch(404, { error: "no_encontrado" }));
  assert.equal(await source.getPreregistro("PRE-X"), undefined);
});

test("registrar contacto valida antes de enviar y manda POST con JSON", async () => {
  const calls: Call[] = [];
  const source = new HttpPortalDataSource("https://api.example.com", fakeFetch(201, especialistaApi, calls));
  await assert.rejects(source.registrarContacto("PRE-1", { tipo: "intento", motivo: "  " }), PortalSourceError);
  assert.equal(calls.length, 0);

  await source.registrarContacto("PRE 1", { tipo: "conversacion", motivo: "Hablamos por WhatsApp" });
  assert.equal(calls[0]?.url, "https://api.example.com/admin/preregistros/PRE%201/eventos");
  assert.equal(calls[0]?.init?.method, "POST");
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), { tipo: "conversacion", motivo: "Hablamos por WhatsApp" });
});

test("especialistas no consulta ningún endpoint hasta tener contrato con api-especialista", async () => {
  const calls: Call[] = [];
  const source = new HttpPortalDataSource("https://api.example.com", fakeFetch(200, {}, calls));
  await assert.rejects(source.getSpecialistStageCounts(), (error: unknown) => error instanceof PortalSourceError && error.kind === "pending");
  assert.equal(calls.length, 0);
});

test("la fuente de muestra nunca entrega email ni WhatsApp de usuarios y bloquea el registro", async () => {
  const demo = new DemoPortalDataSource();
  const page = await demo.searchPreregistrosUsuarios({ search: "usuario03@example.com", orden: "recientes", page: 1, pageSize: 8 });
  assert.equal(page.total, 1);
  assert.equal("email" in (page.rows[0] ?? {}), false);
  const detail = await demo.getPreregistro("PRE-DEMO-U03");
  assert.equal(detail && "email" in detail, false);
  await assert.rejects(demo.registrarContacto("PRE-DEMO-E02", { tipo: "intento", motivo: "x" }), PortalSourceError);
});
