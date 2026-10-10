// Servidor falso para las pruebas del cliente HTTP. No lo importa la app: solo los *.test.ts.
// Todos los datos son sintéticos (example.test / UUIDs inventados).

export interface Call {
  method: string;
  /** Ruta con query, sin la URL base. */
  path: string;
  /** Cabeceras en minúsculas. */
  headers: Record<string, string>;
  body: unknown;
  credentials: RequestCredentials | undefined;
}

export interface Reply {
  status: number;
  body?: unknown;
}

type Handler = Reply | ((call: Call) => Reply | Promise<Reply>);

export const BASE = "https://api.example.test";

/** `routes["GET /auth/admin/me"]`: una respuesta fija, una función, o una lista que se consume en orden (la última se repite). */
export function fakeApi(routes: Record<string, Handler | Handler[]>) {
  const calls: Call[] = [];
  const cursors = new Map<string, number>();

  async function fetcher(input: string, init: RequestInit = {}): Promise<Response> {
    const method = init.method ?? "GET";
    const path = input.startsWith(BASE) ? input.slice(BASE.length) : input;
    const headers: Record<string, string> = {};
    for (const [name, value] of Object.entries((init.headers ?? {}) as Record<string, string>)) headers[name.toLowerCase()] = value;
    const call: Call = {
      method,
      path,
      headers,
      body: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
      credentials: init.credentials,
    };
    calls.push(call);

    const key = `${method} ${path}`;
    const route = routes[key] ?? routes[`${method} ${path.split("?")[0]}`];
    if (route === undefined) return new Response(JSON.stringify({ error: "sin_ruta_de_prueba" }), { status: 599 });
    let handler: Handler;
    if (Array.isArray(route)) {
      const index = Math.min(cursors.get(key) ?? 0, route.length - 1);
      cursors.set(key, index + 1);
      handler = route[index] as Handler;
    } else {
      handler = route;
    }
    const reply = typeof handler === "function" ? await handler(call) : handler;
    if (reply.status === 204) return new Response(null, { status: 204 });
    return new Response(reply.body === undefined ? null : JSON.stringify(reply.body), {
      status: reply.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const count = (method: string, path: string): number => calls.filter((call) => call.method === method && call.path.split("?")[0] === path).length;
  return { fetch: fetcher, calls, count };
}

export const PERFIL_COMPLETO = {
  id: "5b1c1b0e-3f0b-4a7e-9d4c-0a1b2c3d4e5f",
  email: "operadora@example.test",
  permissions: ["auth:read", "preregistros:read", "preregistros:contact", "preregistros:support"],
  mfa: false,
};

export const sesion = (csrfToken = "csrf-sesion-1", admin = PERFIL_COMPLETO) => ({ admin, csrfToken });

export const ID_ESPECIALISTA = "0b6f0a52-6a40-4d6b-8f43-3a2d6c1e9a11";
export const ID_USUARIO = "9c1e5d77-1f3a-4c0e-b0c9-4d5e6f708192";

export const filaEspecialista = {
  id: ID_ESPECIALISTA,
  tipo: "especialista",
  nombre: "Ana Prueba",
  whatsapp: "+5492230000001",
  whatsappNormalizado: true,
  email: null,
  rubros: ["gas"],
  zona: "Centro",
  creadoEn: "2026-10-01T13:00:00.000Z",
  venceEn: "2027-10-01T13:00:00.000Z",
  etapa: "identificado",
  contacto: "con_intentos",
  intentos: 1,
  proximoSeguimiento: "2026-10-12T13:00:00.000Z",
  fechaAltaAceptada: null,
  version: 2,
};

export const fichaEspecialista = {
  ...filaEspecialista,
  eventos: [
    {
      id: "1d2e3f40-aaaa-4bbb-8ccc-000000000001",
      fecha: "2026-10-02T13:00:00.000Z",
      tipo: "intento",
      actorId: PERFIL_COMPLETO.id,
      actor: "operadora@example.test",
      motivo: "Sin respuesta",
      proximoSeguimiento: "2026-10-12T13:00:00.000Z",
      fechaAltaAceptada: null,
    },
  ],
};

export const filaUsuario = { id: ID_USUARIO, tipo: "usuario", creadoEn: "2026-10-03T13:00:00.000Z", venceEn: "2027-10-03T13:00:00.000Z" };

export const porEstado = { todos: 1, sin_contactar: 0, con_intentos: 1, contactado: 0, comprometido: 0 };

export const UUID_V4 = "7f9c1d2e-3b4a-4c5d-8e6f-0a1b2c3d4e5f";
