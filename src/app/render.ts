import { renderFrame, renderLogo, type PortalSection } from "../components/frame.ts";
import { escapeHtml } from "../components/escape.ts";
import { icon } from "../components/icons.ts";
import { renderStatePanel } from "../components/states.ts";
import { PortalSourceError } from "../data/portal-source.ts";
import type { PreregistroResumen } from "../domain/preregistros.ts";
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
  readRoute,
  requestState,
  root,
  session,
  source,
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

/** Panel para cualquier falla de la fuente. Nunca muestra detalles internos. */
export function renderSourceError(error: unknown, retryAction?: string): string {
  const known = error instanceof PortalSourceError ? error : undefined;
  const kind = known?.kind;
  const title =
    kind === "pending"
      ? "Todavía no hay conexión con el backend"
      : kind === "unauthorized" || kind === "forbidden"
        ? "Sin permiso para ver esto"
        : "No se pudieron cargar los datos";
  const state = kind === "pending" || kind === "unauthorized" || kind === "forbidden" ? "permission" : "error";
  const retry = retryAction && state === "error"
    ? `<button class="boton boton--contorno boton--chico" type="button" data-action="${retryAction}">Reintentar</button>`
    : "";
  return `${renderStatePanel(state, title, known?.message ?? "La consulta falló. No se cambió ningún dato.")}${retry}`;
}

type Settled<T> = { ok: true; value: T } | { ok: false; error: unknown };

async function settle<T>(load: () => Promise<T>): Promise<Settled<T>> {
  try {
    return { ok: true, value: await load() };
  } catch (error) {
    return { ok: false, error };
  }
}

async function renderSection(route: Route, settled: Settled<PreregistroResumen>): Promise<{ section: PortalSection; content: string }> {
  const resumen = settled.ok ? settled.value : null;
  if (route.section === "especialistas") {
    if (route.id) {
      const id = route.id;
      try {
        return { section: "especialistas", content: renderSpecialistDetail(await source.getSpecialist(id)) };
      } catch (error) {
        return { section: "especialistas", content: renderSourceError(error, "reload") };
      }
    }
    return { section: "especialistas", content: renderSpecialistsPage(specialistFilters) };
  }

  if (route.section === "preregistros") {
    const tab = preregistroTab(route);
    if (tab) return { section: "preregistros", content: renderPreregistrosPage(tab, preEspecialistaFilters, preUsuarioFilters, resumen) };
    try {
      const record = route.id ? await source.getPreregistro(route.id) : undefined;
      const actionsEnabled = canRunAdministrativeAction(session, "unknown", previewMode);
      return { section: "preregistros", content: renderPreregistroDetail(record, previewMode, actionsEnabled) };
    } catch (error) {
      return { section: "preregistros", content: renderSourceError(error, "reload") };
    }
  }

  if (!settled.ok) return { section: "inicio", content: renderSourceError(settled.error, "reload") };
  const postCounts = await settle(() => source.getSpecialistStageCounts());
  return { section: "inicio", content: renderHomePage(settled.value, postCounts.ok ? postCounts.value : null) };
}

let renderRequest = 0;

export async function renderApp(): Promise<void> {
  if (!previewMode && !canOpenInternalRoute(session)) {
    root.innerHTML = renderLockedView();
    return;
  }

  const requestId = ++renderRequest;
  const route = readRoute();
  const resumen = await settle(() => source.getResumen());
  const page = await renderSection(route, resumen);
  if (requestId !== renderRequest) return;

  const paraContactar = resumen.ok ? resumen.value.porEstado.sin_contactar + resumen.value.porEstado.con_intentos : 0;
  root.innerHTML = renderFrame(page.section, page.content, { preregistros: paraContactar });

  if (page.section === "especialistas" && !route.id) void loadSpecialists();
  if (preregistroTab(route)) void loadPreregistros();
}

/** Envía "Registrar contacto". La UI solo lo habilita con sesión y permiso server-side. */
export async function submitContact(form: HTMLFormElement): Promise<void> {
  const id = form.dataset.preregistro ?? "";
  const status = form.querySelector<HTMLElement>("[data-contacto-estado]");
  const data = new FormData(form);
  const tipo = String(data.get("tipo-contacto") ?? "");
  const seguimiento = String(data.get("proximo-seguimiento") ?? "");
  if (tipo !== "intento" && tipo !== "conversacion" && tipo !== "compromiso") {
    if (status) status.textContent = "Elegí qué pasó con el contacto.";
    return;
  }
  form.setAttribute("aria-busy", "true");
  try {
    await source.registrarContacto(id, {
      tipo,
      motivo: String(data.get("motivo") ?? ""),
      // datetime-local no trae zona: se interpreta en la hora local del navegador.
      proximoSeguimiento: seguimiento ? new Date(seguimiento).toISOString() : undefined,
    });
    await renderApp();
  } catch (error) {
    if (status) status.textContent = error instanceof PortalSourceError ? error.message : "No se pudo guardar el contacto.";
  } finally {
    form.removeAttribute("aria-busy");
  }
}

export async function loadSpecialists(): Promise<void> {
  const target = root.querySelector<HTMLDivElement>("#specialist-results");
  if (!target) return;
  const requestId = ++requestState.specialistRequest;
  target.innerHTML = renderStatePanel("loading", "Cargando especialistas", "Aplicando filtros.");

  try {
    const result = await source.searchSpecialists({ ...specialistFilters });
    if (requestId !== requestState.specialistRequest || !target.isConnected) return;
    target.innerHTML = renderSpecialistResults(result);
  } catch (error) {
    if (requestId !== requestState.specialistRequest || !target.isConnected) return;
    target.innerHTML = renderSourceError(error, "retry-specialists");
  }
}

export async function loadPreregistros(): Promise<void> {
  const target = root.querySelector<HTMLDivElement>("#preregistro-resultados");
  const tab = preregistroTab(readRoute());
  if (!target || !tab) return;
  const requestId = ++requestState.preregistroRequest;
  const statusTabs = root.querySelector<HTMLDivElement>("#filtro-estados");

  try {
    if (tab === "especialistas") {
      const result = await source.searchPreregistrosEspecialistas({ ...preEspecialistaFilters });
      if (requestId !== requestState.preregistroRequest || !target.isConnected) return;
      target.innerHTML = renderEspecialistaResults(result);
      if (statusTabs) statusTabs.innerHTML = renderContactStatusTabs(preEspecialistaFilters, result.porEstado);
    } else {
      const result = await source.searchPreregistrosUsuarios({ ...preUsuarioFilters });
      if (requestId !== requestState.preregistroRequest || !target.isConnected) return;
      target.innerHTML = renderUsuarioResults(result);
    }
  } catch (error) {
    if (requestId !== requestState.preregistroRequest || !target.isConnected) return;
    target.innerHTML = renderSourceError(error, "retry-preregistros");
    if (statusTabs) statusTabs.innerHTML = renderContactStatusTabs(preEspecialistaFilters);
  }
}
