import { renderFrame, type PortalSection } from "../components/frame.ts";
import { fromLocalInput } from "../components/escape.ts";
import { renderStatePanel } from "../components/states.ts";
import { TIPOS_EVENTO, type TipoEvento } from "../contracts/landing-api.ts";
import { PortalSourceError } from "../data/portal-source.ts";
import {
  buildEventoEntrada,
  validateEvento,
  type BorradorEvento,
  type CamposEvento,
  type ErroresEvento,
} from "../domain/evento.ts";
import { isUuid, type PreregistroResumen, type PreregistroStage } from "../domain/preregistros.ts";
import { renderBootErrorView, renderBootView, renderDeniedView, renderLoginView, renderNotConnectedView } from "../pages/login.ts";
import { renderHomePage } from "../pages/home.ts";
import { renderPreregistroDetail, type ContactMode } from "../pages/preregistro-detail.ts";
import {
  renderContactStatusTabs,
  renderEspecialistaResults,
  renderPreregistrosPage,
  renderUsuarioResults,
} from "../pages/preregistros-list.ts";
import { renderSpecialistDetail, renderSpecialistResults, renderSpecialistsPage } from "../pages/specialists.ts";
import { canRegisterContact, canSearchUsersByEmail } from "../security/access.ts";
import {
  activePermissions,
  currentSession,
  ficha,
  loginUi,
  preEspecialistaFilters,
  preregistroTab,
  preUsuarioFilters,
  previewMode,
  readRoute,
  requestState,
  root,
  sessionClient,
  source,
  specialistFilters,
  submissionKeys,
  type Route,
} from "./state.ts";

// ── Errores ─────────────────────────────────────────────────────────────

interface ErrorView {
  title: string;
  state: "error" | "permission";
  /** El error se arregla reintentando (red, 429, 503…). */
  retry: boolean;
  /** Acción extra que ofrece el panel. */
  resync?: boolean;
}

function describeError(error: unknown, permissionHint?: string): ErrorView {
  if (!(error instanceof PortalSourceError)) return { title: "No se pudieron cargar los datos", state: "error", retry: true };
  switch (error.kind) {
    case "pending":
      return { title: "Todavía no disponible", state: "permission", retry: false };
    case "unauthorized":
      return { title: "Tu sesión venció", state: "permission", retry: false };
    case "forbidden":
      if (error.reason === "csrf_invalido") return { title: "La protección de la sesión no coincide", state: "permission", retry: false, resync: true };
      if (error.reason === "origen_no_permitido") return { title: "Este sitio no está autorizado por el servidor", state: "permission", retry: false };
      return { title: permissionHint ? `Falta el permiso ${permissionHint}` : "Tu cuenta no tiene permiso para esto", state: "permission", retry: false };
    case "rate_limited":
      return { title: "Demasiados pedidos seguidos", state: "error", retry: true };
    case "unavailable":
      return { title: "El servidor no está disponible", state: "error", retry: true };
    case "network":
      return { title: "Sin conexión con el servidor", state: "error", retry: true };
    case "invalid_request":
      return { title: error.campos.includes("q") ? "La búsqueda no es válida" : "El servidor rechazó la consulta", state: "error", retry: false };
    default:
      return { title: "No se pudieron cargar los datos", state: "error", retry: true };
  }
}

function errorDetail(error: unknown): string {
  if (!(error instanceof PortalSourceError)) return "La consulta falló. No se cambió ningún dato.";
  if (error.kind === "invalid_request" && error.campos.includes("q")) {
    return "La búsqueda es exacta: ID, o WhatsApp completo con código de área (usuarios: email completo, con el permiso de soporte). Corregila y probá de nuevo.";
  }
  return error.message;
}

/** Panel para cualquier falla de la fuente. Nunca muestra detalles internos ni cuerpos del servidor. */
export function renderSourceError(error: unknown, retryAction?: string, permissionHint?: string): string {
  const view = describeError(error, permissionHint);
  const buttons = [
    retryAction && view.retry ? `<button class="boton boton--contorno boton--chico" type="button" data-action="${retryAction}">Reintentar</button>` : "",
    view.resync ? `<button class="boton boton--contorno boton--chico" type="button" data-action="resync-session">Recargar la sesión</button>` : "",
  ].join("");
  return `${renderStatePanel(view.state, view.title, errorDetail(error))}${buttons}`;
}

// ── Pantallas por estado de sesión ──────────────────────────────────────

type Settled<T> = { ok: true; value: T } | { ok: false; error: unknown };

async function settle<T>(load: () => Promise<T>): Promise<Settled<T>> {
  try {
    return { ok: true, value: await load() };
  } catch (error) {
    return { ok: false, error };
  }
}

function contactMode(): ContactMode {
  if (previewMode) return "preview";
  const { state, permissions } = currentSession();
  return canRegisterContact(state, permissions, previewMode) ? "enabled" : "sin_permiso";
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
    if (tab) {
      const context = { previewMode, canSearchUsersByEmail: canSearchUsersByEmail(activePermissions()) };
      return { section: "preregistros", content: renderPreregistrosPage(tab, preEspecialistaFilters, preUsuarioFilters, resumen, context) };
    }
    try {
      const record = route.id ? await source.getPreregistro(route.id) : undefined;
      const draft = ficha.draft && ficha.draft.preregistroId === route.id ? ficha.draft : undefined;
      return { section: "preregistros", content: renderPreregistroDetail(record, { contactMode: contactMode(), flash: ficha.flash, draft }) };
    } catch (error) {
      return { section: "preregistros", content: renderSourceError(error, "reload", "preregistros:read") };
    }
  }

  if (!settled.ok) return { section: "inicio", content: renderSourceError(settled.error, "reload", "preregistros:read") };
  const postCounts = await settle(() => source.getSpecialistStageCounts());
  return { section: "inicio", content: renderHomePage(settled.value, postCounts.ok ? postCounts.value : null) };
}

let renderRequest = 0;

async function renderOperational(): Promise<void> {
  const requestId = ++renderRequest;
  const route = readRoute();
  const resumen = await settle(() => source.getResumen());
  const page = await renderSection(route, resumen);
  // Una navegación más nueva, o una sesión que se perdió mientras tanto (el login ya se dibujó), manda sobre esta.
  if (requestId !== renderRequest) return;

  const paraContactar = resumen.ok ? resumen.value.porEstado.sin_contactar + resumen.value.porEstado.con_intentos : 0;
  root.innerHTML = renderFrame(page.section, page.content, { preregistros: paraContactar }, { preview: previewMode, email: currentSession().email });
  ficha.flash = undefined;
  ficha.draft = undefined;

  if (page.section === "especialistas" && !route.id) void loadSpecialists();
  if (preregistroTab(route)) void loadPreregistros();
}

/** Dibuja la pantalla que corresponde al estado de la sesión: ingreso, acceso denegado o el portal. */
export async function renderApp(): Promise<void> {
  if (previewMode) return renderOperational();

  if (!sessionClient) {
    root.innerHTML = renderNotConnectedView(`${window.location.pathname}?demo=1#/inicio`);
    return;
  }

  if (sessionClient.snapshot.state === "loading") {
    const requestId = ++renderRequest;
    root.innerHTML = renderBootView();
    try {
      await sessionClient.bootstrap();
    } catch (error) {
      if (requestId !== renderRequest) return;
      root.innerHTML = renderBootErrorView(renderSourceError(error, "reload"));
      return;
    }
    if (requestId !== renderRequest) return;
  }

  const session = sessionClient.snapshot;
  if (session.state === "anonymous") {
    renderRequest += 1;
    root.innerHTML = renderLoginView(loginUi);
    return;
  }
  if (session.state === "denied") {
    renderRequest += 1;
    root.innerHTML = renderDeniedView(session.email);
    return;
  }
  return renderOperational();
}

/** Redibuja solo la pantalla de ingreso (errores, paso MFA), sin tocar el resto. */
export function renderLogin(): void {
  renderRequest += 1;
  root.innerHTML = renderLoginView(loginUi);
}

// ── Registrar contacto ──────────────────────────────────────────────────

const FIELD_INPUTS: Record<CamposEvento, string> = {
  tipo: "",
  motivo: "motivo",
  proximoSeguimiento: "proximo-seguimiento",
  fechaAltaAceptada: "fecha-alta",
};

function isTipo(value: string): value is TipoEvento {
  return (TIPOS_EVENTO as readonly string[]).includes(value);
}

function readDraft(form: HTMLFormElement): BorradorEvento {
  const data = new FormData(form);
  const tipo = String(data.get("tipo-contacto") ?? "");
  return {
    tipo: isTipo(tipo) ? tipo : "",
    motivo: String(data.get("motivo") ?? ""),
    // datetime-local no trae zona: se interpreta en la hora local del navegador y viaja en ISO 8601.
    proximoSeguimiento: fromLocalInput(String(data.get("proximo-seguimiento") ?? "")),
    fechaAltaAceptada: fromLocalInput(String(data.get("fecha-alta") ?? "")),
  };
}

function showFieldErrors(form: HTMLFormElement, errors: ErroresEvento): void {
  for (const field of Object.keys(FIELD_INPUTS) as CamposEvento[]) {
    const message = errors[field] ?? "";
    const holder = form.querySelector<HTMLElement>(`[data-error-for="${field}"]`);
    if (holder) holder.textContent = message;
    const input = FIELD_INPUTS[field] ? form.querySelector<HTMLInputElement>(`[name="${FIELD_INPUTS[field]}"]`) : null;
    if (input) input.setAttribute("aria-invalid", String(message !== ""));
  }
}

function setStatus(form: HTMLFormElement, message: string): void {
  const status = form.querySelector<HTMLElement>("[data-contacto-estado]");
  if (status) status.textContent = message;
}

/** Nombres de campo que rechazó el servidor (400) → mensajes en el campo correcto. */
function serverFieldErrors(campos: string[]): ErroresEvento {
  const errors: ErroresEvento = {};
  if (campos.includes("motivo")) errors.motivo = "El servidor no aceptó la nota: sin teléfonos, emails, enlaces, documentos ni cuentas, y hasta 140 caracteres.";
  if (campos.includes("proximoSeguimiento")) errors.proximoSeguimiento = "El servidor no aceptó el seguimiento: tiene que ser futuro y antes del vencimiento.";
  if (campos.includes("fechaAltaAceptada")) errors.fechaAltaAceptada = "El servidor no aceptó la fecha de alta: desde hoy hasta 90 días, y antes del vencimiento.";
  if (campos.includes("tipo")) errors.tipo = "El servidor no aceptó ese tipo de contacto para esta etapa.";
  return errors;
}

/** Envía "Registrar contacto". La UI solo lo habilita con sesión y permiso; el servidor decide igual. */
export async function submitContact(form: HTMLFormElement): Promise<void> {
  if (form.getAttribute("aria-busy") === "true") return;
  const id = form.dataset.preregistro ?? "";
  const version = Number(form.dataset.version);
  const etapa = form.dataset.etapa;
  const venceEn = form.dataset.vence ?? "";
  const draft = readDraft(form);

  const errors = validateEvento(draft, { etapa: etapa as PreregistroStage, venceEn }, new Date());
  showFieldErrors(form, errors);
  if (Object.keys(errors).length > 0 || draft.tipo === "" || !Number.isInteger(version)) {
    setStatus(form, "Revisá los campos marcados.");
    return;
  }

  const body = buildEventoEntrada({ ...draft, tipo: draft.tipo }, version);
  // Misma clave mientras se reintente este mismo envío; otro cuerpo u otra ficha estrena clave.
  const key = submissionKeys.keyFor(id, body);

  form.setAttribute("aria-busy", "true");
  setStatus(form, "Guardando…");
  try {
    const { repetido } = await source.registrarEvento(id, body, key);
    submissionKeys.release();
    ficha.flash = repetido ? "Ese contacto ya estaba registrado: no se duplicó." : "Contacto registrado.";
    ficha.draft = undefined;
    await renderApp();
  } catch (error) {
    form.removeAttribute("aria-busy");
    await handleContactError(form, id, draft, error);
  }
}

async function handleContactError(form: HTMLFormElement, id: string, draft: BorradorEvento, error: unknown): Promise<void> {
  if (!(error instanceof PortalSourceError)) {
    setStatus(form, "No se pudo guardar el contacto.");
    return;
  }

  if (error.kind === "conflict") {
    submissionKeys.release();
    if (error.conflict === "version") {
      // Alguien más tocó la ficha: se recarga con lo vigente y se conserva lo que se había escrito.
      ficha.draft = { ...draft, preregistroId: id };
      ficha.flash = "Alguien actualizó esta ficha mientras la mirabas. La recargamos: revisá los datos y volvé a guardar.";
      await renderApp();
    } else if (error.conflict === "transicion") {
      ficha.draft = undefined;
      ficha.flash = "La etapa cambió y esa acción ya no corresponde. Recargamos la ficha con lo vigente.";
      await renderApp();
    } else {
      setStatus(form, "Ese envío ya se había usado con otros datos. Revisá y volvé a guardar: se genera un envío nuevo.");
    }
    return;
  }

  if (error.kind === "invalid_request") {
    const fieldErrors = serverFieldErrors(error.campos);
    showFieldErrors(form, fieldErrors);
    setStatus(form, Object.keys(fieldErrors).length > 0 ? "El servidor rechazó algunos campos." : error.message);
    return;
  }

  // 401 ya dibujó el login (la sesión se perdió); 403, 404, 429, 503 y red conservan lo escrito y la clave para reintentar.
  if (error.kind === "forbidden" && error.reason === "csrf_invalido") {
    setStatus(form, `${error.message} Probá de nuevo: se vuelve a pedir el código de la sesión.`);
    if (sessionClient) await sessionClient.resync().catch(() => undefined);
    return;
  }
  if (error.kind === "not_found") {
    setStatus(form, "Este pre-registro ya no existe (puede haber vencido).");
    return;
  }
  setStatus(form, error.kind === "network" || error.kind === "unavailable" || error.kind === "server" ? `${error.message} Podés reintentar: no se duplica.` : error.message);
}

// ── Listas ──────────────────────────────────────────────────────────────

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

  // Sin `preregistros:support` el servidor rechaza buscar usuarios por email (403): no se manda el pedido.
  const search = preUsuarioFilters.search.trim();
  if (tab === "usuarios" && search !== "" && !canSearchUsersByEmail(activePermissions()) && !isUuid(search)) {
    target.innerHTML = renderStatePanel(
      "permission",
      "Falta el permiso para buscar por email",
      "Con tu cuenta podés buscar usuarios por ID. Buscar por email requiere el permiso preregistros:support.",
    );
    return;
  }

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
    target.innerHTML = renderSourceError(error, "retry-preregistros", "preregistros:read");
    if (statusTabs) statusTabs.innerHTML = renderContactStatusTabs(preEspecialistaFilters);
  }
}
