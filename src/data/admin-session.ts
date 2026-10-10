// Sesión del equipo contra Handy-landing-page-be (docs/auth.md del backend) y transporte HTTP autenticado.
//
// - Las cookies HttpOnly (`handy-admin-access` / `handy-admin-refresh`) las maneja el navegador con
//   `credentials: "include"`. El portal nunca ve ni guarda un token de acceso.
// - El `csrfToken` vive SOLO en memoria de este objeto (campo privado): ni localStorage, ni sessionStorage,
//   ni cookies propias, ni URL. Recargar la página lo recupera con GET /auth/admin/csrf.
// - Un 401 en un pedido autenticado dispara UN refresh serializado (una sola promesa en vuelo para todos los
//   pedidos concurrentes: el backend revoca la familia si se reusa un refresh viejo) y un único reintento.
// - Los mensajes de error son propios y no incluyen cuerpos del servidor ni datos personales.

import type { z } from "zod";
import {
  csrfSchema,
  errorSchema,
  loginRespuestaSchema,
  perfilRespuestaSchema,
  sesionSchema,
  type Permiso,
  type SesionApi,
} from "../contracts/landing-api.ts";
import type { SessionState } from "../security/access.ts";
import { PortalSourceError, type ConflictReason, type ForbiddenReason } from "./portal-source.ts";

export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

export interface SessionSnapshot {
  state: SessionState;
  permissions: readonly Permiso[];
  email: string | undefined;
}

export type LoginOutcome = { kind: "session" } | { kind: "mfa"; expiresAt: string };

export interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  /** Cabeceras extra (ej.: `Idempotency-Key`). Se reenvían tal cual si el pedido se reintenta tras el refresh. */
  headers?: Record<string, string>;
}

export interface ApiResult<T> {
  data: T;
  status: number;
}

type Listener = (snapshot: SessionSnapshot, previous: SessionState) => void;

const FORBIDDEN_REASONS: readonly ForbiddenReason[] = ["sin_permiso", "csrf_invalido", "origen_no_permitido"];
const CONFLICT_REASONS: readonly ConflictReason[] = ["version", "transicion", "idempotencia"];

const messages = {
  network: "No se pudo conectar con el servidor. Revisá la conexión y reintentá.",
  unauthorized: "La sesión no es válida o venció.",
  sin_permiso: "Tu cuenta no tiene permiso para esta acción.",
  csrf_invalido: "La protección de la sesión (CSRF) no coincide. Recargá la sesión y reintentá.",
  origen_no_permitido: "El servidor no autoriza este sitio (origen no permitido). Avisá a quien administra el entorno.",
  not_found: "No encontramos ese registro.",
  invalid_request: "El servidor rechazó los datos enviados.",
  conflict: "El registro cambió o la acción ya no corresponde.",
  rate_limited: "Hay demasiados pedidos seguidos. Esperá unos segundos y reintentá.",
  unavailable: "El servidor no está disponible en este momento. No se cambió ningún dato. Probá de nuevo en un rato.",
  server: "El servidor no pudo responder. Probá de nuevo en un rato.",
  invalid_response: "La respuesta del servidor no tiene el formato esperado.",
} as const;

async function errorBody(response: Response): Promise<z.infer<typeof errorSchema> | undefined> {
  try {
    const parsed = errorSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

/** Traduce un estado HTTP de error a un PortalSourceError con mensaje propio. Solo mira códigos, nunca muestra el cuerpo. */
async function toError(response: Response): Promise<PortalSourceError> {
  const body = await errorBody(response);
  switch (response.status) {
    case 400:
    case 413:
    case 422:
      return new PortalSourceError("invalid_request", messages.invalid_request, { campos: body?.campos ?? [] });
    case 401:
      return new PortalSourceError("unauthorized", messages.unauthorized);
    case 403: {
      const reason = FORBIDDEN_REASONS.find((item) => item === body?.error) ?? "sin_permiso";
      return new PortalSourceError("forbidden", messages[reason], { reason });
    }
    case 404:
      return new PortalSourceError("not_found", messages.not_found);
    case 409:
      return new PortalSourceError("conflict", messages.conflict, { conflict: CONFLICT_REASONS.find((item) => item === body?.motivo) });
    case 429:
      return new PortalSourceError("rate_limited", messages.rate_limited);
    case 503:
      return new PortalSourceError("unavailable", messages.unavailable);
    default:
      return new PortalSourceError("server", messages.server);
  }
}

export class AdminSessionClient {
  readonly #baseUrl: string;
  readonly #fetch: Fetcher;
  readonly #timeoutMs: number;
  readonly #listeners = new Set<Listener>();

  /** CSRF de la sesión: solo en memoria. */
  #csrf: string | undefined;
  /** CSRF previo al login (10 min): lo exige el login y el paso MFA. Solo en memoria. */
  #preauth: string | undefined;
  #state: SessionState = "loading";
  #permissions: readonly Permiso[] = [];
  #email: string | undefined;
  #refreshing: Promise<void> | undefined;
  /** Se incrementa en cada refresh exitoso: un 401 de un pedido anterior al refresh se reintenta sin refrescar de nuevo. */
  #epoch = 0;

  constructor(baseUrl: string, fetcher: Fetcher = (input, init) => fetch(input, init), timeoutMs = 15000) {
    this.#baseUrl = baseUrl.replace(/\/+$/, "");
    this.#fetch = fetcher;
    this.#timeoutMs = timeoutMs;
  }

  get snapshot(): SessionSnapshot {
    return { state: this.#state, permissions: this.#permissions, email: this.#email };
  }

  subscribe(listener: Listener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  // ── Ciclo de la sesión ────────────────────────────────────────────────

  /**
   * Al abrir o recargar la página: GET /auth/admin/me y GET /auth/admin/csrf. Si el acceso venció pero el
   * refresh sigue vivo, el 401 de `/me` dispara el refresh serializado. Sin sesión → "anonymous".
   * Un error transitorio (red, 503, 429) se propaga: la sesión no se da por perdida.
   */
  async bootstrap(): Promise<SessionSnapshot> {
    try {
      const { data } = await this.request("/auth/admin/me", perfilRespuestaSchema);
      this.#setProfile(data.admin.email, data.admin.permissions);
      if (!this.#csrf) this.#csrf = (await this.request("/auth/admin/csrf", csrfSchema)).data.csrfToken;
    } catch (error) {
      if (error instanceof PortalSourceError && error.kind === "unauthorized") {
        this.#clear();
      } else if (error instanceof PortalSourceError && error.kind === "forbidden" && error.reason === "sin_permiso") {
        // Hay sesión, pero la cuenta no tiene ni `auth:read`: se puede cerrar, no operar.
        this.#setProfile(undefined, []);
      } else {
        throw error;
      }
    }
    return this.snapshot;
  }

  /** GET /auth/csrf → POST /auth/admin/login. Si la cuenta tiene TOTP responde `mfa` y falta `verifyMfa`. */
  async login(email: string, password: string): Promise<LoginOutcome> {
    this.#preauth = (await this.#send("/auth/csrf", csrfSchema, {})).data.csrfToken;
    const { data } = await this.#send("/auth/admin/login", loginRespuestaSchema, {
      method: "POST",
      body: { email, password },
      headers: { "X-CSRF-Token": this.#preauth },
    });
    if ("mfaRequired" in data) return { kind: "mfa", expiresAt: data.expiresAt };
    this.#openSession(data);
    return { kind: "session" };
  }

  /** POST /auth/admin/login/mfa con el código TOTP de 6 dígitos. */
  async verifyMfa(code: string): Promise<void> {
    if (!this.#preauth) throw new PortalSourceError("forbidden", messages.csrf_invalido, { reason: "csrf_invalido" });
    const { data } = await this.#send("/auth/admin/login/mfa", sesionSchema, {
      method: "POST",
      body: { code },
      headers: { "X-CSRF-Token": this.#preauth },
    });
    this.#openSession(data);
  }

  /** Abandona el paso MFA (volver al login): descarta el CSRF previo. */
  cancelLogin(): void {
    this.#preauth = undefined;
  }

  /** Descarta el CSRF en memoria y pide el vigente (GET /auth/admin/csrf), p. ej. tras un 403 `csrf_invalido`. */
  async resync(): Promise<void> {
    this.#csrf = undefined;
    try {
      await this.#ensureCsrf();
    } catch (error) {
      if (error instanceof PortalSourceError && error.kind === "unauthorized") this.#clear();
      throw error;
    }
  }

  /** POST /auth/admin/logout. Pase lo que pase en el servidor, la memoria local queda limpia. */
  async logout(): Promise<void> {
    try {
      if (this.#state !== "anonymous") {
        await this.#ensureCsrf();
        await this.#call("/auth/admin/logout", { method: "POST", body: {}, headers: { "X-CSRF-Token": this.#csrf ?? "" } });
      }
    } catch {
      // Sesión ya vencida o servidor caído: igual se cierra del lado del portal.
    } finally {
      this.#clear();
    }
  }

  // ── Pedidos autenticados ──────────────────────────────────────────────

  /**
   * Pedido a una ruta con sesión. En los POST agrega `X-CSRF-Token`. Ante un 401 hace un refresh serializado
   * y reintenta UNA vez (con las mismas cabeceras, incluida `Idempotency-Key`). Si el refresh no alcanza,
   * la sesión se da por vencida.
   */
  async request<S extends z.ZodType>(path: string, schema: S, options: RequestOptions = {}): Promise<ApiResult<z.infer<S>>> {
    const epoch = this.#epoch;
    try {
      return await this.#authorized(path, schema, options);
    } catch (error) {
      if (!(error instanceof PortalSourceError) || error.kind !== "unauthorized") throw error;
    }
    if (this.#epoch === epoch) await this.#refresh();
    try {
      return await this.#authorized(path, schema, options);
    } catch (error) {
      if (error instanceof PortalSourceError && error.kind === "unauthorized") this.#clear();
      throw error;
    }
  }

  async #authorized<S extends z.ZodType>(path: string, schema: S, options: RequestOptions): Promise<ApiResult<z.infer<S>>> {
    const headers = { ...options.headers };
    if (options.method === "POST") {
      await this.#ensureCsrf();
      headers["X-CSRF-Token"] = this.#csrf ?? "";
    }
    return this.#send(path, schema, { ...options, headers });
  }

  async #ensureCsrf(): Promise<void> {
    if (!this.#csrf) this.#csrf = (await this.#send("/auth/admin/csrf", csrfSchema, {})).data.csrfToken;
  }

  /** Una sola promesa en vuelo: los pedidos concurrentes que reciben 401 esperan el mismo refresh. */
  #refresh(): Promise<void> {
    this.#refreshing ??= this.#doRefresh().finally(() => {
      this.#refreshing = undefined;
    });
    return this.#refreshing;
  }

  async #doRefresh(): Promise<void> {
    try {
      await this.#ensureCsrf();
      let result: ApiResult<SesionApi>;
      try {
        result = await this.#send("/auth/admin/refresh", sesionSchema, { method: "POST", body: {}, headers: { "X-CSRF-Token": this.#csrf ?? "" } });
      } catch (error) {
        // CSRF desactualizado (la sesión pudo rotar): se pide el vigente y se reintenta una vez.
        if (!(error instanceof PortalSourceError) || error.reason !== "csrf_invalido") throw error;
        this.#csrf = undefined;
        await this.#ensureCsrf();
        result = await this.#send("/auth/admin/refresh", sesionSchema, { method: "POST", body: {}, headers: { "X-CSRF-Token": this.#csrf ?? "" } });
      }
      this.#csrf = result.data.csrfToken;
      this.#setProfile(result.data.admin.email, result.data.admin.permissions);
      this.#epoch += 1;
    } catch (error) {
      // Refresh rechazado = no hay sesión recuperable. Un corte de red o un 503 NO la tiran.
      if (error instanceof PortalSourceError && error.kind === "unauthorized") this.#clear();
      throw error;
    }
  }

  // ── Transporte ────────────────────────────────────────────────────────

  /** Un pedido: red + estado HTTP. Los errores salen normalizados; el cuerpo de un error nunca se muestra. */
  async #call(path: string, options: RequestOptions): Promise<Response> {
    const method = options.method ?? "GET";
    const hasBody = options.body !== undefined;
    let response: Response;
    try {
      response = await this.#fetch(`${this.#baseUrl}${path}`, {
        method,
        // Cookies HttpOnly de la sesión: las maneja el navegador, el portal no las lee.
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          ...(hasBody ? { "Content-Type": "application/json" } : {}),
          ...options.headers,
        },
        body: hasBody ? JSON.stringify(options.body) : undefined,
        signal: AbortSignal.timeout(this.#timeoutMs),
      });
    } catch {
      throw new PortalSourceError("network", messages.network);
    }
    if (!response.ok) throw await toError(response);
    return response;
  }

  /** Un pedido cuya respuesta se valida con zod: una forma inesperada es un error, nunca llega a la pantalla. */
  async #send<S extends z.ZodType>(path: string, schema: S, options: RequestOptions): Promise<ApiResult<z.infer<S>>> {
    const response = await this.#call(path, options);
    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throw new PortalSourceError("invalid_response", messages.invalid_response);
    }
    const parsed = schema.safeParse(json);
    if (!parsed.success) throw new PortalSourceError("invalid_response", messages.invalid_response);
    return { data: parsed.data, status: response.status };
  }

  // ── Estado ────────────────────────────────────────────────────────────

  #openSession(session: SesionApi): void {
    this.#preauth = undefined;
    this.#csrf = session.csrfToken;
    this.#epoch += 1;
    this.#setProfile(session.admin.email, session.admin.permissions);
  }

  #setProfile(email: string | undefined, permissions: readonly Permiso[]): void {
    this.#email = email;
    this.#permissions = permissions;
    // `preregistros:read` es el mínimo para operar: sin él hay sesión, pero no hay nada que ver.
    this.#set(permissions.includes("preregistros:read") ? "authenticated" : "denied");
  }

  #clear(): void {
    this.#csrf = undefined;
    this.#preauth = undefined;
    this.#permissions = [];
    this.#email = undefined;
    this.#set("anonymous");
  }

  #set(next: SessionState): void {
    const previous = this.#state;
    this.#state = next;
    // Se avisa en todo cambio real; durante el arranque ("loading") la app decide sola qué mostrar.
    if (previous !== next && previous !== "loading") for (const listener of this.#listeners) listener(this.snapshot, previous);
  }
}
