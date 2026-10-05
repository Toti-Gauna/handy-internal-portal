import type { PortalSection } from "../components/frame.ts";
import { DemoPortalDataSource } from "../data/portal-source.ts";
import type { SpecialistSearch } from "../domain/directories.ts";
import type { EspecialistaPreSearch, UsuarioPreSearch } from "../domain/preregistros.ts";
import { shouldShowSyntheticPreview, type SessionState } from "../security/access.ts";

export interface Route {
  section: PortalSection;
  id?: string;
}

const appRoot = document.querySelector<HTMLDivElement>("#app");
if (!appRoot) throw new Error("No se encontró el contenedor de la aplicación.");
export const root: HTMLDivElement = appRoot;

export const previewMode = shouldShowSyntheticPreview(new URLSearchParams(window.location.search).get("demo") === "1");
// No existe aún un adaptador de sesión: el estado por defecto es anónimo y deniega rutas internas.
export const session: SessionState = "anonymous";
export const previewSource = new DemoPortalDataSource();

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
  cuit: "any",
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
