import assert from "node:assert/strict";
import test from "node:test";
import { AdminSessionClient } from "./admin-session.ts";
import { especialistasQuery, HttpPortalDataSource, usuariosQuery } from "./http-source.ts";
import { DemoPortalDataSource, PortalSourceError } from "./portal-source.ts";
import {
  BASE,
  ID_ESPECIALISTA,
  ID_USUARIO,
  UUID_V4,
  fakeApi,
  fichaEspecialista,
  filaEspecialista,
  filaUsuario,
  porEstado,
  sesion,
} from "./test-helpers.ts";

const loginRoutes = {
  "GET /auth/csrf": { status: 200, body: { csrfToken: "pre-1" } },
  "POST /auth/admin/login": { status: 200, body: sesion("csrf-1") },
};

async function connect(routes: Record<string, Parameters<typeof fakeApi>[0][string]>) {
  const api = fakeApi({ ...loginRoutes, ...routes });
  const session = new AdminSessionClient(BASE, api.fetch);
  await session.login("operadora@example.test", "clave-sintetica-123");
  api.calls.length = 0;
  return { api, source: new HttpPortalDataSource(session), session };
}

const filters = { search: " 2230000001 ", rubro: "gas", zona: " Zona norte ", contacto: "con_intentos", orden: "seguimiento", page: 2, pageSize: 500 } as const;
const blank = { search: "", rubro: "any", zona: "", contacto: "any", orden: "recientes", page: 1, pageSize: 8 } as const;

test("los filtros viajan al servidor sin valores vacíos, con q y zona exactas y pageSize acotado a 50", () => {
  assert.equal(
    especialistasQuery(filters),
    "tipo=especialista&q=2230000001&rubro=gas&zona=Zona+norte&contacto=con_intentos&orden=seguimiento&page=2&pageSize=50",
  );
  assert.equal(especialistasQuery(blank), "tipo=especialista&orden=recientes&page=1&pageSize=8");
  // Los filtros de especialista no existen para usuarios: el servidor los rechazaría con 400.
  assert.equal(usuariosQuery({ search: "", orden: "recientes", page: 1, pageSize: 8 }), "tipo=usuario&orden=recientes&page=1&pageSize=8");
  assert.equal(usuariosQuery({ search: ID_USUARIO, orden: "antiguos", page: 0, pageSize: 0 }), `tipo=usuario&q=${ID_USUARIO}&orden=antiguos&page=1&pageSize=1`);
});

test("la lista de especialistas se valida, acepta email null y trae contacto, intentos, versión y whatsappNormalizado", async () => {
  const { api, source } = await connect({
    [`GET /admin/preregistros?${especialistasQuery(blank)}`]: { status: 200, body: { rows: [filaEspecialista], total: 1, page: 1, pageSize: 8, totalPages: 1, porEstado } },
  });
  const page = await source.searchPreregistrosEspecialistas({ ...blank });

  assert.equal(api.calls[0]?.credentials, "include");
  assert.equal(page.porEstado.any, 1, "todos se muestra como la pestaña 'Todos'");
  const row = page.rows[0];
  assert.equal(row?.email, undefined);
  assert.equal(row?.contacto, "con_intentos");
  assert.equal(row?.intentos, 1);
  assert.equal(row?.version, 2);
  assert.equal(row?.whatsappNormalizado, true);
  assert.equal(row?.fechaAltaAceptada, undefined);
  assert.equal("cuit" in (row ?? {}), false);
});

test("la lista de usuarios solo tiene id y fechas, y descarta cualquier campo personal que llegara de más", async () => {
  const { source } = await connect({
    [`GET /admin/preregistros?${usuariosQuery({ search: "", orden: "recientes", page: 1, pageSize: 8 })}`]: {
      status: 200,
      body: { rows: [{ ...filaUsuario, nombre: "No debería", email: "x@example.test" }], total: 1, page: 1, pageSize: 8, totalPages: 1 },
    },
  });
  const page = await source.searchPreregistrosUsuarios({ search: "", orden: "recientes", page: 1, pageSize: 8 });
  assert.deepEqual(Object.keys(page.rows[0] ?? {}).sort(), ["creadoEn", "id", "tipo", "venceEn"]);
});

test("el resumen completa con 0 los rubros que el servidor omite y mapea porEstado", async () => {
  const { source } = await connect({
    "GET /admin/preregistros/resumen": { status: 200, body: { especialistas: 1, usuarios: 3, porEstado, porRubro: { gas: 1 }, cola: [filaEspecialista] } },
  });
  const resumen = await source.getResumen();
  assert.equal(resumen.porRubro.gas, 1);
  assert.equal(resumen.porRubro.plomeria, 0);
  assert.equal(resumen.porEstado.con_intentos, 1);
  assert.equal(resumen.cola[0]?.id, ID_ESPECIALISTA);
});

test("la ficha de especialista trae los eventos; la de usuario no trae nada personal; una inexistente es undefined", async () => {
  const { source } = await connect({
    [`GET /admin/preregistros/${ID_ESPECIALISTA}`]: { status: 200, body: fichaEspecialista },
    [`GET /admin/preregistros/${ID_USUARIO}`]: { status: 200, body: filaUsuario },
    "GET /admin/preregistros/no-existe": { status: 404, body: { error: "no_encontrado" } },
  });
  const especialista = await source.getPreregistro(ID_ESPECIALISTA);
  assert.equal(especialista?.tipo === "especialista" && especialista.eventos[0]?.tipo, "intento");
  assert.equal(especialista?.tipo === "especialista" && especialista.eventos[0]?.actor, "operadora@example.test");
  const usuario = await source.getPreregistro(ID_USUARIO);
  assert.equal(usuario?.tipo, "usuario");
  assert.equal(await source.getPreregistro("no-existe"), undefined);
});

test("una respuesta con forma inesperada (rubro desconocido) no llega a la UI", async () => {
  const { source } = await connect({
    [`GET /admin/preregistros?${usuariosQuery({ search: "", orden: "recientes", page: 1, pageSize: 8 })}`]: { status: 200, body: { rows: [{ id: "x" }] } },
  });
  await assert.rejects(source.searchPreregistrosUsuarios({ search: "", orden: "recientes", page: 1, pageSize: 8 }), (error: unknown) => {
    return error instanceof PortalSourceError && error.kind === "invalid_response";
  });
});

test("registrar evento: POST con Idempotency-Key, X-CSRF-Token, version y fechaAltaAceptada distinta del seguimiento", async () => {
  const { api, source } = await connect({
    [`POST /admin/preregistros/${ID_ESPECIALISTA}/eventos`]: { status: 201, body: { ...fichaEspecialista, etapa: "comprometido", contacto: "comprometido", version: 3 } },
  });
  const input = {
    tipo: "compromiso",
    motivo: "  Acordamos el alta  ",
    version: 2,
    proximoSeguimiento: "2026-10-20T12:00:00.000Z",
    fechaAltaAceptada: "2026-10-25T12:00:00.000Z",
  } as const;
  const result = await source.registrarEvento(ID_ESPECIALISTA, input, UUID_V4);

  const call = api.calls[0];
  assert.equal(call?.method, "POST");
  assert.equal(call?.headers["idempotency-key"], UUID_V4);
  assert.equal(call?.headers["x-csrf-token"], "csrf-1");
  assert.equal(call?.headers["content-type"], "application/json");
  assert.deepEqual(call?.body, { ...input, motivo: "Acordamos el alta" });
  assert.equal(result.repetido, false);
  assert.equal(result.ficha.version, 3);
});

test("registrar evento: 200 = repetición idéntica, no se duplicó", async () => {
  const { source } = await connect({ [`POST /admin/preregistros/${ID_ESPECIALISTA}/eventos`]: { status: 200, body: fichaEspecialista } });
  const result = await source.registrarEvento(ID_ESPECIALISTA, { tipo: "intento", motivo: "Sin respuesta", version: 2 }, UUID_V4);
  assert.equal(result.repetido, true);
});

test("la Idempotency-Key se reusa en el reintento tras el refresh de sesión", async () => {
  const { api, source } = await connect({
    [`POST /admin/preregistros/${ID_ESPECIALISTA}/eventos`]: [{ status: 401, body: { error: "no_autenticado" } }, { status: 201, body: fichaEspecialista }],
    "POST /auth/admin/refresh": { status: 200, body: sesion("csrf-2") },
  });
  await source.registrarEvento(ID_ESPECIALISTA, { tipo: "intento", motivo: "Sin respuesta", version: 2 }, UUID_V4);
  const posts = api.calls.filter((call) => call.path.endsWith("/eventos"));
  assert.deepEqual(posts.map((call) => call.headers["idempotency-key"]), [UUID_V4, UUID_V4]);
  assert.deepEqual(posts.map((call) => call.headers["x-csrf-token"]), ["csrf-1", "csrf-2"]);
});

test("registrar evento valida antes de enviar: nada viaja si el cuerpo o la clave son inválidos", async () => {
  const { api, source } = await connect({});
  const invalid = [
    { tipo: "intento", motivo: "  ", version: 2 },
    { tipo: "intento", motivo: "x".repeat(141), version: 2 },
    { tipo: "intento", motivo: "ok", version: 0 },
    { tipo: "compromiso", motivo: "ok", version: 2 },
    { tipo: "intento", motivo: "ok", version: 2, fechaAltaAceptada: "2026-10-25T12:00:00.000Z" },
    { tipo: "compromiso", motivo: "ok", version: 2, proximoSeguimiento: "2026-10-25T12:00:00.000Z", fechaAltaAceptada: "2026-10-25T12:00:00.000Z" },
  ] as const;
  for (const input of invalid) {
    await assert.rejects(source.registrarEvento(ID_ESPECIALISTA, input, UUID_V4), (error: unknown) => {
      return error instanceof PortalSourceError && error.kind === "invalid_request";
    });
  }
  await assert.rejects(source.registrarEvento(ID_ESPECIALISTA, { tipo: "intento", motivo: "ok", version: 2 }, "no-es-un-uuid"), PortalSourceError);
  assert.equal(api.calls.length, 0);
});

test("registrar evento: el 409 de versión llega con su motivo para recargar la ficha", async () => {
  const { source } = await connect({ [`POST /admin/preregistros/${ID_ESPECIALISTA}/eventos`]: { status: 409, body: { error: "conflicto", motivo: "version" } } });
  await assert.rejects(source.registrarEvento(ID_ESPECIALISTA, { tipo: "intento", motivo: "ok", version: 1 }, UUID_V4), (error: unknown) => {
    return error instanceof PortalSourceError && error.kind === "conflict" && error.conflict === "version";
  });
});

test("especialistas con alta completa no consulta ningún endpoint: no hay contrato", async () => {
  const { api, source } = await connect({});
  await assert.rejects(source.getSpecialistStageCounts(), (error: unknown) => error instanceof PortalSourceError && error.kind === "pending");
  assert.equal(api.calls.length, 0);
});

test("la fuente de muestra solo entrega id y fechas de usuarios, busca de forma exacta y bloquea el registro", async () => {
  const demo = new DemoPortalDataSource();
  const exact = await demo.searchPreregistrosUsuarios({ search: "usuario03@example.com", orden: "recientes", page: 1, pageSize: 8 });
  assert.equal(exact.total, 1);
  assert.equal("email" in (exact.rows[0] ?? {}), false);
  const partial = await demo.searchPreregistrosUsuarios({ search: "usuario03", orden: "recientes", page: 1, pageSize: 8 });
  assert.equal(partial.total, 0, "la búsqueda exacta no encuentra por parte del email");
  const detail = await demo.getPreregistro("PRE-DEMO-U03");
  assert.equal(detail && "email" in detail, false);
  await assert.rejects(
    demo.registrarEvento("PRE-DEMO-E02", { tipo: "intento", motivo: "x", version: 1 }, UUID_V4),
    (error: unknown) => error instanceof PortalSourceError && error.kind === "blocked",
  );
});
