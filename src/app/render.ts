import { renderFrame, renderLogo, type PortalSection } from "../components/frame.ts";
import { escapeHtml } from "../components/escape.ts";
import { icon } from "../components/icons.ts";
import { renderStatePanel } from "../components/states.ts";
import { demoPreregistrosEspecialistas, demoSpecialists } from "../data/demo-data.ts";
import { needsContact } from "../domain/preregistros.ts";
import { renderHomePage } from "../pages/home.ts";
import { renderPreregistroDetail } from "../pages/preregistro-detail.ts";
import {
  renderContactStatusTabs,
  renderEspecialistaResults,
  renderPreregistrosPage,
  renderUsuarioResults,
} from "../pages/preregistros-list.ts";
import { renderSpecialistDetail, renderSpecialistResults, renderSpecialistsPage } from "../pages/specialists.ts";
import { canOpenInternalRoute, canRunAdministrativeAction } from "../security/access.ts";
import {
  preEspecialistaFilters,
  preregistroTab,
  preUsuarioFilters,
  previewMode,
  previewSource,
  readRoute,
  requestState,
  root,
  session,
  specialistFilters,
  type Route,
} from "./state.ts";

function renderLockedView(): string {
  return `
    <main class="acceso">
      <div class="acceso__tarjeta">
        ${renderLogo("logo--acceso")}
        <p class="eyebrow">Portal interno · Eclipse</p>
        <h1 class="titulo titulo--acceso">Acceso interno no configurado</h1>
        <p>La autenticación administrativa segura todavía requiere definiciones de servidor. Este portal deniega por defecto las rutas y los datos operativos.</p>
        ${renderStatePanel("permission", "No hay una sesión autorizada", "No ingreses credenciales en esta vista. La integración de autenticación sigue pendiente.", "TECH-06 · TECH-08")}
        <a class="boton boton--azul boton--ancho" href="${escapeHtml(`${window.location.pathname}?demo=1#/inicio`)}">Abrir vista de muestra ${icon("flecha")}</a>
        <p class="nota">La vista de muestra contiene solo datos inventados y no habilita operaciones.</p>
      </div>
    </main>
  `;
}

async function renderSection(route: Route): Promise<{ section: PortalSection; content: string }> {
  if (route.section === "especialistas") {
    if (route.id) {
      const record = demoSpecialists.find((item) => item.id === route.id);
      return { section: "especialistas", content: renderSpecialistDetail(record) };
    }
    return { section: "especialistas", content: renderSpecialistsPage(specialistFilters) };
  }

  if (route.section === "preregistros") {
    const tab = preregistroTab(route);
    if (tab) return { section: "preregistros", content: renderPreregistrosPage(tab, preEspecialistaFilters, preUsuarioFilters) };
    const record = route.id ? await previewSource.getPreregistro(route.id) : undefined;
    const actionsEnabled = canRunAdministrativeAction(session, "unknown", previewMode);
    return { section: "preregistros", content: renderPreregistroDetail(record, previewMode, actionsEnabled) };
  }

  return { section: "inicio", content: renderHomePage() };
}

let renderRequest = 0;

export async function renderApp(): Promise<void> {
  if (!previewMode && !canOpenInternalRoute(session)) {
    root.innerHTML = renderLockedView();
    return;
  }

  const requestId = ++renderRequest;
  const route = readRoute();
  const page = await renderSection(route);
  if (requestId !== renderRequest) return;

  const badges = { preregistros: demoPreregistrosEspecialistas.filter(needsContact).length };
  root.innerHTML = renderFrame(page.section, page.content, badges);

  if (page.section === "especialistas" && !route.id) void loadSpecialists();
  if (preregistroTab(route)) void loadPreregistros();
}

export async function loadSpecialists(): Promise<void> {
  const target = root.querySelector<HTMLDivElement>("#specialist-results");
  if (!target) return;
  const requestId = ++requestState.specialistRequest;
  target.innerHTML = renderStatePanel("loading", "Cargando especialistas", "Aplicando filtros a la muestra.");

  try {
    const result = await previewSource.searchSpecialists({ ...specialistFilters });
    if (requestId !== requestState.specialistRequest || !target.isConnected) return;
    target.innerHTML = renderSpecialistResults(result);
  } catch {
    if (requestId !== requestState.specialistRequest || !target.isConnected) return;
    target.innerHTML = `${renderStatePanel("error", "No se pudieron cargar los especialistas", "La consulta falló. No se cambió ningún dato.")}
      <button class="boton boton--contorno boton--chico" type="button" data-action="retry-specialists">Reintentar</button>`;
  }
}

export async function loadPreregistros(): Promise<void> {
  const target = root.querySelector<HTMLDivElement>("#preregistro-resultados");
  const tab = preregistroTab(readRoute());
  if (!target || !tab) return;
  const requestId = ++requestState.preregistroRequest;

  const statusTabs = root.querySelector<HTMLDivElement>("#filtro-estados");
  if (statusTabs) statusTabs.innerHTML = renderContactStatusTabs(preEspecialistaFilters);

  try {
    const html =
      tab === "especialistas"
        ? renderEspecialistaResults(await previewSource.searchPreregistrosEspecialistas({ ...preEspecialistaFilters }))
        : renderUsuarioResults(await previewSource.searchPreregistrosUsuarios({ ...preUsuarioFilters }));
    if (requestId !== requestState.preregistroRequest || !target.isConnected) return;
    target.innerHTML = html;
  } catch {
    if (requestId !== requestState.preregistroRequest || !target.isConnected) return;
    target.innerHTML = `${renderStatePanel("error", "No se pudieron cargar los pre-registros", "La consulta falló. No se cambió ningún dato.")}
      <button class="boton boton--contorno boton--chico" type="button" data-action="retry-preregistros">Reintentar</button>`;
  }
}
