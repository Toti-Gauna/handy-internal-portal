import type { PortalSection } from "../components/frame.ts";
import { DemoPortalDataSource } from "../data/portal-source.ts";
import type { SpecialistSearch, UserSearch } from "../domain/directories.ts";
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
  pageSize: 5,
};

export const userFilters: UserSearch = {
  search: "",
  state: "any",
  page: 1,
  pageSize: 5,
};

export const requestState = { specialistRequest: 0, userRequest: 0, specialistDebounce: 0, userDebounce: 0 };

export function readRoute(): Route {
  const hash = window.location.hash || "#/inicio";
  const match = /^#\/(inicio|especialistas|usuarios|operaciones)(?:\/([^/]+))?\/?$/.exec(hash);
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
