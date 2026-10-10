import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { AdminSessionClient } from "./admin-session.ts";
import { PortalSourceError } from "./portal-source.ts";
import { BASE, PERFIL_COMPLETO, fakeApi, sesion, type Reply } from "./test-helpers.ts";

const okSchema = z.object({ ok: z.literal(true) });
const ok: Reply = { status: 200, body: { ok: true } };
const sinSesion: Reply = { status: 401, body: { error: "no_autenticado" } };
const PASSWORD = "clave-sintetica-123";

async function logged(api: ReturnType<typeof fakeApi>): Promise<AdminSessionClient> {
  const session = new AdminSessionClient(BASE, api.fetch);
  await session.login("operadora@example.test", PASSWORD);
  return session;
}

const loginRoutes = {
  "GET /auth/csrf": { status: 200, body: { csrfToken: "pre-1" } },
  "POST /auth/admin/login": { status: 200, body: sesion("csrf-1") },
};

function kindOf(error: unknown): string {
  return error instanceof PortalSourceError ? error.kind : "otro";
}

test("login: pide el CSRF previo, lo manda en X-CSRF-Token y abre la sesión con cookies (credentials include)", async () => {
  const api = fakeApi(loginRoutes);
  const session = new AdminSessionClient(BASE, api.fetch);
  assert.equal(session.snapshot.state, "loading");

  assert.deepEqual(await session.login("operadora@example.test", PASSWORD), { kind: "session" });

  assert.equal(api.calls[0]?.path, "/auth/csrf");
  assert.equal(api.calls[1]?.path, "/auth/admin/login");
  assert.equal(api.calls[1]?.headers["x-csrf-token"], "pre-1");
  assert.deepEqual(api.calls[1]?.body, { email: "operadora@example.test", password: PASSWORD });
  assert.ok(api.calls.every((call) => call.credentials === "include"));
  assert.equal(session.snapshot.state, "authenticated");
  assert.equal(session.snapshot.email, "operadora@example.test");
  assert.ok(session.snapshot.permissions.includes("preregistros:contact"));
});

test("login con TOTP: el primer paso pide el código y el segundo reusa el CSRF previo", async () => {
  const api = fakeApi({
    "GET /auth/csrf": { status: 200, body: { csrfToken: "pre-9" } },
    "POST /auth/admin/login": { status: 200, body: { mfaRequired: true, expiresAt: "2026-10-10T12:05:00.000Z" } },
    "POST /auth/admin/login/mfa": { status: 200, body: sesion("csrf-mfa") },
  });
  const session = new AdminSessionClient(BASE, api.fetch);

  const first = await session.login("operadora@example.test", PASSWORD);
  assert.equal(first.kind, "mfa");
  assert.equal(session.snapshot.state, "loading", "todavía no hay sesión");

  await session.verifyMfa("123456");
  assert.equal(api.calls[2]?.path, "/auth/admin/login/mfa");
  assert.equal(api.calls[2]?.headers["x-csrf-token"], "pre-9");
  assert.deepEqual(api.calls[2]?.body, { code: "123456" });
  assert.equal(session.snapshot.state, "authenticated");
});

test("el paso MFA sin CSRF previo falla sin tocar la red", async () => {
  const api = fakeApi({});
  const session = new AdminSessionClient(BASE, api.fetch);
  await assert.rejects(session.verifyMfa("123456"), (error: unknown) => error instanceof PortalSourceError && error.reason === "csrf_invalido");
  assert.equal(api.calls.length, 0);
});

test("credenciales inválidas: 401 sin intentar refresh y la sesión queda anónima", async () => {
  const api = fakeApi({ ...loginRoutes, "POST /auth/admin/login": sinSesion });
  const session = new AdminSessionClient(BASE, api.fetch);
  await assert.rejects(session.login("operadora@example.test", "otra-clave-123"), (error: unknown) => kindOf(error) === "unauthorized");
  assert.equal(api.count("POST", "/auth/admin/refresh"), 0);
  assert.notEqual(session.snapshot.state, "authenticated");
});

test("bootstrap al recargar: GET /auth/admin/me y GET /auth/admin/csrf", async () => {
  const api = fakeApi({
    "GET /auth/admin/me": { status: 200, body: { admin: PERFIL_COMPLETO } },
    "GET /auth/admin/csrf": { status: 200, body: { csrfToken: "csrf-recarga" } },
    "POST /auth/admin/logout": { status: 204 },
  });
  const session = new AdminSessionClient(BASE, api.fetch);
  const snapshot = await session.bootstrap();

  assert.deepEqual(api.calls.map((call) => `${call.method} ${call.path}`), ["GET /auth/admin/me", "GET /auth/admin/csrf"]);
  assert.equal(snapshot.state, "authenticated");
  // El CSRF recuperado es el que viaja después en los POST.
  await session.logout();
  assert.equal(api.calls[2]?.headers["x-csrf-token"], "csrf-recarga");
});

test("bootstrap con el acceso vencido pero el refresh vivo: renueva una vez y reintenta /me", async () => {
  const api = fakeApi({
    "GET /auth/admin/me": [sinSesion, { status: 200, body: { admin: PERFIL_COMPLETO } }],
    "GET /auth/admin/csrf": { status: 200, body: { csrfToken: "csrf-viejo" } },
    "POST /auth/admin/refresh": { status: 200, body: sesion("csrf-nuevo") },
  });
  const session = new AdminSessionClient(BASE, api.fetch);
  assert.equal((await session.bootstrap()).state, "authenticated");
  assert.deepEqual(api.calls.map((call) => `${call.method} ${call.path}`), [
    "GET /auth/admin/me",
    "GET /auth/admin/csrf",
    "POST /auth/admin/refresh",
    "GET /auth/admin/me",
  ]);
  assert.equal(api.calls[2]?.headers["x-csrf-token"], "csrf-viejo");
});

test("bootstrap sin sesión: queda anónima, sin error", async () => {
  const api = fakeApi({ "GET /auth/admin/me": sinSesion, "GET /auth/admin/csrf": sinSesion });
  const session = new AdminSessionClient(BASE, api.fetch);
  assert.equal((await session.bootstrap()).state, "anonymous");
  assert.equal(api.count("POST", "/auth/admin/refresh"), 0);
});

test("bootstrap: una cuenta sin permisos de lectura queda 'denied' (puede cerrar sesión, no operar)", async () => {
  const api = fakeApi({ "GET /auth/admin/me": { status: 403, body: { error: "sin_permiso" } } });
  const session = new AdminSessionClient(BASE, api.fetch);
  const snapshot = await session.bootstrap();
  assert.equal(snapshot.state, "denied");
  assert.deepEqual(snapshot.permissions, []);
});

test("bootstrap: un corte de red se propaga y no da la sesión por perdida", async () => {
  const session = new AdminSessionClient(BASE, async () => {
    throw new TypeError("Failed to fetch");
  });
  await assert.rejects(session.bootstrap(), (error: unknown) => kindOf(error) === "network");
  assert.equal(session.snapshot.state, "loading");
});

test("una cuenta con sesión pero sin preregistros:read queda 'denied' tras el login", async () => {
  const limitada = { ...PERFIL_COMPLETO, permissions: ["auth:read"] };
  const api = fakeApi({ ...loginRoutes, "POST /auth/admin/login": { status: 200, body: sesion("csrf-1", limitada) } });
  const session = await logged(api);
  assert.equal(session.snapshot.state, "denied");
});

test("refresh SERIALIZADO: tres pedidos que reciben 401 a la vez comparten un único refresh y se reintentan una vez", async () => {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const api = fakeApi({
    ...loginRoutes,
    "GET /admin/preregistros/resumen": [sinSesion, sinSesion, sinSesion, ok],
    "POST /auth/admin/refresh": async () => {
      await gate;
      return { status: 200, body: sesion("csrf-2") };
    },
  });
  const session = await logged(api);

  const pedidos = [1, 2, 3].map(() => session.request("/admin/preregistros/resumen", okSchema));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(api.count("POST", "/auth/admin/refresh"), 1, "un solo refresh en vuelo mientras los tres esperan");
  release();
  const resultados = await Promise.all(pedidos);

  assert.equal(api.count("POST", "/auth/admin/refresh"), 1);
  assert.equal(api.count("GET", "/admin/preregistros/resumen"), 6, "3 intentos fallidos + 3 reintentos únicos");
  assert.ok(resultados.every((result) => result.status === 200));
});

test("un 401 que llega después de un refresh ya hecho se reintenta sin refrescar de nuevo", async () => {
  let soltarViejo: () => void = () => undefined;
  const viejo = new Promise<void>((resolve) => {
    soltarViejo = resolve;
  });
  let llamadas = 0;
  const api = fakeApi({
    ...loginRoutes,
    // El primer pedido sale con la cookie vieja y su 401 llega tarde; el segundo ya disparó el refresh.
    "GET /admin/preregistros/resumen": async () => {
      llamadas += 1;
      if (llamadas === 1) {
        await viejo;
        return sinSesion;
      }
      return llamadas === 2 ? sinSesion : ok;
    },
    "POST /auth/admin/refresh": { status: 200, body: sesion("csrf-2") },
  });
  const session = await logged(api);

  const lento = session.request("/admin/preregistros/resumen", okSchema);
  const rapido = session.request("/admin/preregistros/resumen", okSchema);
  await rapido;
  assert.equal(api.count("POST", "/auth/admin/refresh"), 1);
  soltarViejo();
  await lento;
  assert.equal(api.count("POST", "/auth/admin/refresh"), 1, "el refresh no se repite");
});

test("si después del refresh sigue el 401, se reintenta UNA sola vez, la sesión se da por vencida y se avisa", async () => {
  const api = fakeApi({
    ...loginRoutes,
    "GET /admin/preregistros/resumen": sinSesion,
    "POST /auth/admin/refresh": { status: 200, body: sesion("csrf-2") },
  });
  const session = await logged(api);
  const avisos: string[] = [];
  session.subscribe((snapshot, previous) => avisos.push(`${previous}>${snapshot.state}`));

  await assert.rejects(session.request("/admin/preregistros/resumen", okSchema), (error: unknown) => kindOf(error) === "unauthorized");
  assert.equal(api.count("GET", "/admin/preregistros/resumen"), 2);
  assert.equal(api.count("POST", "/auth/admin/refresh"), 1);
  assert.equal(session.snapshot.state, "anonymous");
  assert.deepEqual(avisos, ["authenticated>anonymous"]);
});

test("refresh rechazado (401): la sesión vence y no se reintenta el pedido", async () => {
  const api = fakeApi({ ...loginRoutes, "GET /admin/preregistros/resumen": sinSesion, "POST /auth/admin/refresh": sinSesion });
  const session = await logged(api);
  await assert.rejects(session.request("/admin/preregistros/resumen", okSchema), (error: unknown) => kindOf(error) === "unauthorized");
  assert.equal(api.count("GET", "/admin/preregistros/resumen"), 1);
  assert.equal(session.snapshot.state, "anonymous");
});

test("un corte de red durante el refresh NO tira la sesión", async () => {
  const api = fakeApi({
    ...loginRoutes,
    "GET /admin/preregistros/resumen": sinSesion,
    "POST /auth/admin/refresh": () => {
      throw new TypeError("Failed to fetch");
    },
  });
  const session = await logged(api);
  await assert.rejects(session.request("/admin/preregistros/resumen", okSchema), (error: unknown) => kindOf(error) === "network");
  assert.equal(session.snapshot.state, "authenticated");
});

test("CSRF: solo viaja en los POST, y tras el refresh el reintento usa el token nuevo con la MISMA Idempotency-Key", async () => {
  const api = fakeApi({
    ...loginRoutes,
    "GET /admin/preregistros/resumen": ok,
    "POST /admin/preregistros/abc/eventos": [sinSesion, { status: 201, body: { ok: true } }],
    "POST /auth/admin/refresh": { status: 200, body: sesion("csrf-2") },
  });
  const session = await logged(api);

  await session.request("/admin/preregistros/resumen", okSchema);
  assert.equal(api.calls.at(-1)?.headers["x-csrf-token"], undefined);

  const key = "7f9c1d2e-3b4a-4c5d-8e6f-0a1b2c3d4e5f";
  const body = { tipo: "intento", motivo: "Sin respuesta", version: 2 };
  const result = await session.request("/admin/preregistros/abc/eventos", okSchema, {
    method: "POST",
    body,
    headers: { "Idempotency-Key": key },
  });

  const posts = api.calls.filter((call) => call.path === "/admin/preregistros/abc/eventos");
  assert.equal(posts.length, 2);
  assert.equal(posts[0]?.headers["x-csrf-token"], "csrf-1");
  assert.equal(posts[1]?.headers["x-csrf-token"], "csrf-2");
  assert.equal(posts[0]?.headers["idempotency-key"], key);
  assert.equal(posts[1]?.headers["idempotency-key"], key);
  assert.deepEqual(posts[1]?.body, body);
  assert.equal(result.status, 201);
});

test("el 403 distingue permiso faltante, CSRF inválido y origen no permitido", async () => {
  for (const reason of ["sin_permiso", "csrf_invalido", "origen_no_permitido"] as const) {
    const api = fakeApi({ ...loginRoutes, "GET /admin/preregistros/resumen": { status: 403, body: { error: reason } } });
    const session = await logged(api);
    await assert.rejects(session.request("/admin/preregistros/resumen", okSchema), (error: unknown) => {
      return error instanceof PortalSourceError && error.kind === "forbidden" && error.reason === reason;
    });
    assert.equal(api.count("POST", "/auth/admin/refresh"), 0, "un 403 no dispara refresh");
  }
});

test("409 conserva el motivo (version, transicion, idempotencia); 400 trae los nombres de campo", async () => {
  for (const motivo of ["version", "transicion", "idempotencia"] as const) {
    const api = fakeApi({ ...loginRoutes, "POST /admin/preregistros/x/eventos": { status: 409, body: { error: "conflicto", motivo } } });
    const session = await logged(api);
    await assert.rejects(session.request("/admin/preregistros/x/eventos", okSchema, { method: "POST", body: {} }), (error: unknown) => {
      return error instanceof PortalSourceError && error.kind === "conflict" && error.conflict === motivo;
    });
  }
  const api = fakeApi({ ...loginRoutes, "POST /admin/preregistros/x/eventos": { status: 400, body: { error: "validacion", campos: ["motivo"] } } });
  const session = await logged(api);
  await assert.rejects(session.request("/admin/preregistros/x/eventos", okSchema, { method: "POST", body: {} }), (error: unknown) => {
    return error instanceof PortalSourceError && error.kind === "invalid_request" && error.campos[0] === "motivo";
  });
});

test("429, 503, 5xx y 404 son estados propios y no filtran el cuerpo del servidor", async () => {
  const cases: Array<[number, string]> = [[429, "rate_limited"], [503, "unavailable"], [500, "server"], [404, "not_found"]];
  for (const [status, kind] of cases) {
    const api = fakeApi({ ...loginRoutes, "GET /admin/preregistros/resumen": { status, body: { error: "interno", detalle: "stack con datos de prueba" } } });
    const session = await logged(api);
    await assert.rejects(session.request("/admin/preregistros/resumen", okSchema), (error: unknown) => {
      return error instanceof PortalSourceError && error.kind === kind && !error.message.includes("stack");
    });
  }
});

test("una respuesta con forma inesperada no llega a la UI", async () => {
  const api = fakeApi({ ...loginRoutes, "GET /admin/preregistros/resumen": { status: 200, body: { ok: false } } });
  const session = await logged(api);
  await assert.rejects(session.request("/admin/preregistros/resumen", okSchema), (error: unknown) => kindOf(error) === "invalid_response");
});

test("logout: POST con el CSRF de la sesión y la memoria queda limpia aunque el servidor falle", async () => {
  const api = fakeApi({ ...loginRoutes, "POST /auth/admin/logout": { status: 204 } });
  const session = await logged(api);
  await session.logout();
  const logout = api.calls.find((call) => call.path === "/auth/admin/logout");
  assert.equal(logout?.headers["x-csrf-token"], "csrf-1");
  assert.equal(session.snapshot.state, "anonymous");
  assert.deepEqual(session.snapshot.permissions, []);
  assert.equal(session.snapshot.email, undefined);

  const caido = fakeApi({ ...loginRoutes, "POST /auth/admin/logout": { status: 500 } });
  const otra = await logged(caido);
  await otra.logout();
  assert.equal(otra.snapshot.state, "anonymous");
});

test("resync reemplaza el CSRF en memoria por el vigente", async () => {
  const api = fakeApi({
    ...loginRoutes,
    "GET /auth/admin/csrf": { status: 200, body: { csrfToken: "csrf-resync" } },
    "POST /auth/admin/logout": { status: 204 },
  });
  const session = await logged(api);
  await session.resync();
  await session.logout();
  assert.equal(api.calls.find((call) => call.path === "/auth/admin/logout")?.headers["x-csrf-token"], "csrf-resync");
});

test("pasar de anónimo a autenticado no avisa (lo dibuja el ingreso); perder la sesión sí", async () => {
  const api = fakeApi({ ...loginRoutes, "POST /auth/admin/logout": { status: 204 } });
  const session = new AdminSessionClient(BASE, api.fetch);
  const avisos: string[] = [];
  session.subscribe((snapshot, previous) => avisos.push(`${previous}>${snapshot.state}`));
  await session.login("operadora@example.test", PASSWORD);
  assert.deepEqual(avisos, []);
  await session.logout();
  assert.deepEqual(avisos, ["authenticated>anonymous"]);
});

test("el CSRF y la contraseña no se guardan en storage ni en el objeto de sesión", async () => {
  const writes: string[] = [];
  const spy = { setItem: (key: string) => writes.push(key), getItem: () => null, removeItem: () => undefined };
  Object.defineProperty(globalThis, "localStorage", { value: spy, configurable: true });
  Object.defineProperty(globalThis, "sessionStorage", { value: spy, configurable: true });
  try {
    const api = fakeApi(loginRoutes);
    const session = await logged(api);
    const visible = JSON.stringify(session) + Object.keys(session).join();
    assert.equal(visible.includes("csrf-1"), false);
    assert.equal(visible.includes(PASSWORD), false);
    assert.deepEqual(writes, []);
  } finally {
    Reflect.deleteProperty(globalThis, "localStorage");
    Reflect.deleteProperty(globalThis, "sessionStorage");
  }
});
