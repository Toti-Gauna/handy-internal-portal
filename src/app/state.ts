import type { PortalSection } from "../components/frame.ts";
import { API_BASE_URL, TIMEOUT_MS } from "../config.ts";
import { AdminSessionClient, type SessionSnapshot } from "../data/admin-session.ts";
import { HttpPortalDataSource } from "../data/http-source.ts";
import { DemoPortalDataSource, PendingPortalDataSource, type PortalDataSource } from "../data/portal-source.ts";
import type { SpecialistSearch } from "../domain/directories.ts";
import { SubmissionKeys, type BorradorEvento } from "../domain/evento.ts";
import type { EspecialistaPreSearch, UsuarioPreSearch } from "../domain/preregistros.ts";
import type { Permisos } from "../security/access.ts";
import { shouldShowSyntheticPreview } from "../security/access.ts";

export interface Route {
  section: PortalSection;
  id?: string;
}

const appRoot = document.querySelector<HTMLDivElement>("#app");
if (!appRoot) throw new Error("No se encontró el contenedor de la aplicación.");
export const root: HTMLDivElement = appRoot;

/**
 * La muestra (?demo=1, fixtures ficticios) existe SOLO en un build sin `VITE_API_BASE_URL`. Con un backend
 * configurado, `?demo=1` se ignora: nunca se mezclan datos de muestra con una API real.
 */
export const previewMode = shouldShowSyntheticPreview(!API_BASE_URL && new URLSearchParams(window.location.search).get("demo") === "1");

/**
 * Sesión real contra el backend: solo existe con `VITE_API_BASE_URL` y fuera de la muestra. El CSRF y el perfil
 * viven en memoria de este objeto; nada administrativo se guarda en el navegador.
 */
export const sessionClient: AdminSessionClient | undefined =
  !previewMode && API_BASE_URL ? new AdminSessionClient(API_BASE_URL, undefined, TIMEOUT_MS) : undefined;

/** La muestra es solo lectura de fixtures: puede buscar usuarios por email, nunca registra contactos (ver canRegisterContact). */
const DEMO_SNAPSHOT: SessionSnapshot = { state: "authenticated", permissions: ["preregistros:read", "preregistros:support"], email: undefined };
const NO_SESSION: SessionSnapshot = { state: "anonymous", permissions: [], email: undefined };

export function currentSession(): SessionSnapshot {
  if (previewMode) return DEMO_SNAPSHOT;
  return sessionClient?.snapshot ?? NO_SESSION;
}

export function activePermissions(): Permisos {
  return currentSession().permissions;
}

/**
 * Muestra (?demo=1) → fixtures. Con VITE_API_BASE_URL → backend de la landing (con sesión del equipo).
 * Sin URL → bloqueo explícito, sin pedidos HTTP. Los datos de muestra nunca se mezclan con una API real.
 */
export const source: PortalDataSource = previewMode
  ? new DemoPortalDataSource()
  : sessionClient
    ? new HttpPortalDataSource(sessionClient)
    : new PendingPortalDataSource();

/** Pasos de la pantalla de ingreso. Solo en memoria; la contraseña nunca se guarda. */
export interface LoginUi {
  step: "credentials" | "mfa";
  email: string;
  notice?: string;
  error?: string;
  busy?: boolean;
}

export const loginUi: LoginUi = { step: "credentials", email: "" };

export function resetLoginUi(notice?: string): void {
  loginUi.step = "credentials";
  loginUi.email = "";
  loginUi.notice = notice;
  loginUi.error = undefined;
  loginUi.busy = false;
}

/** Estado efímero de la ficha: aviso de una sola vez y borrador que se conserva si hay que recargarla. */
export const ficha: { flash?: string; draft?: BorradorEvento & { preregistroId: string }; loggingOut: boolean } = { loggingOut: false };

/** Una clave de idempotencia por envío (se reusa mientras se reintenta el mismo cuerpo). */
export const submissionKeys = new SubmissionKeys();

export const specialistFilters: SpecialistSearch = {
  search: "",
  trade: "any",
  zone: "any",
  stage: "any",
  verification: "any",
  enabled: "any",
  activity: "any",
  page: 1,
  pageSize: 8,
};

export const preEspecialistaFilters: EspecialistaPreSearch = {
  search: "",
  rubro: "any",
  zona: "",
  contacto: "any",
  orden: "recientes",
  page: 1,
  pageSize: 8,
};

export const preUsuarioFilters: UsuarioPreSearch = {
  search: "",
  orden: "recientes",
  page: 1,
  pageSize: 8,
};

export const requestState = { specialistRequest: 0, preregistroRequest: 0, specialistDebounce: 0, preregistroDebounce: 0 };

/** Sub-rutas de Pre-registros que son pestañas, no IDs de ficha. */
export const preregistroTabs = ["especialistas", "usuarios"] as const;
export type PreregistroTab = (typeof preregistroTabs)[number];

export function preregistroTab(route: Route): PreregistroTab | undefined {
  if (route.section !== "preregistros") return undefined;
  if (!route.id) return "especialistas";
  return (preregistroTabs as readonly string[]).includes(route.id) ? (route.id as PreregistroTab) : undefined;
}

export function readRoute(): Route {
  const hash = window.location.hash || "#/inicio";
  const match = /^#\/(inicio|preregistros|especialistas)(?:\/([^/]+))?\/?$/.exec(hash);
  if (!match) return { section: "inicio" };

  const section = match[1] as PortalSection;
  if (match[2]) {
    try {
      return { section, id: decodeURIComponent(match[2]) };
    } catch {
      return { section };
    }
  }
  return { section };
}
