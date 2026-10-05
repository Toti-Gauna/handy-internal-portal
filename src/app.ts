import { renderFrame, type PortalSection } from "./components/frame.ts";
import { escapeHtml } from "./components/escape.ts";
import { renderStatePanel } from "./components/states.ts";
import { demoSpecialists, demoUsers } from "./data/demo-data.ts";
import { DemoPortalDataSource } from "./data/portal-source.ts";
import type { SpecialistSearch, UserSearch } from "./domain/directories.ts";
import { isSpecialistStage, type VerificationLevel } from "./domain/specialists.ts";
import { canOpenInternalRoute, shouldShowSyntheticPreview, type SessionState } from "./security/access.ts";
import { renderHomePage } from "./pages/home.ts";
import { renderOperationsPage } from "./pages/operations.ts";
import { renderSpecialistDetail, renderSpecialistResults, renderSpecialistsPage } from "./pages/specialists.ts";
import { renderUserDetail, renderUserResults, renderUsersPage } from "./pages/users.ts";

interface Route {
  section: PortalSection;
  id?: string;
}

const appRoot = document.querySelector<HTMLDivElement>("#app");
if (!appRoot) throw new Error("No se encontró el contenedor de la aplicación.");
const root: HTMLDivElement = appRoot;

const previewMode = shouldShowSyntheticPreview(new URLSearchParams(window.location.search).get("demo") === "1");
// No existe aún un adaptador de sesión: el estado por defecto es anónimo y deniega rutas internas.
const session: SessionState = "anonymous";
const previewSource = new DemoPortalDataSource();

const specialistFilters: SpecialistSearch = {
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

const userFilters: UserSearch = {
  search: "",
  state: "any",
  page: 1,
  pageSize: 5,
};

let specialistRequest = 0;
let userRequest = 0;
let specialistDebounce = 0;
let userDebounce = 0;

function readRoute(): Route {
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

function renderLockedView(): string {
  return `
    <main class="access-screen">
      <div class="access-card">
        <a class="brand brand--access" href="#" aria-label="Handy">
          <span class="brand__mark" aria-hidden="true">H</span><span class="brand__word">handy</span>
        </a>
        <span class="access-icon" aria-hidden="true">⌑</span>
        <p class="eyebrow">PORTAL INTERNO</p>
        <h1>Acceso interno no configurado</h1>
        <p>La autenticación administrativa segura todavía requiere definiciones de servidor. Este portal deniega por defecto las rutas y los datos operativos.</p>
        ${renderStatePanel("permission", "No hay una sesión autorizada", "No ingreses credenciales en esta vista. La integración de autenticación sigue pendiente.", "TECH-06 · TECH-08")}
        <a class="button button--primary button--wide" href="${escapeHtml(`${window.location.pathname}?demo=1#/inicio`)}">Abrir vista de muestra</a>
        <p class="access-card__footnote">La vista de muestra contiene solo datos inventados y no habilita operaciones.</p>
      </div>
      <footer class="access-footer">Handy · Herramientas internas · Vista no operativa</footer>
    </main>
  `;
}

function renderSection(route: Route): { section: PortalSection; title: string; content: string } {
  if (route.section === "especialistas") {
    if (route.id) {
      const record = demoSpecialists.find((item) => item.id === route.id);
      return { section: "especialistas", title: "Especialistas", content: renderSpecialistDetail(record) };
    }
    return { section: "especialistas", title: "Especialistas", content: renderSpecialistsPage(specialistFilters) };
  }

  if (route.section === "usuarios") {
    if (route.id) {
      const record = demoUsers.find((item) => item.id === route.id);
      return { section: "usuarios", title: "Usuarios", content: renderUserDetail(record) };
    }
    return { section: "usuarios", title: "Usuarios", content: renderUsersPage(userFilters) };
  }

  if (route.section === "operaciones") {
    return { section: "operaciones", title: "Operaciones", content: renderOperationsPage() };
  }

  return { section: "inicio", title: "Inicio", content: renderHomePage() };
}

function renderApp(): void {
  if (!previewMode && !canOpenInternalRoute(session)) {
    root.innerHTML = renderLockedView();
    return;
  }

  const route = readRoute();
  const page = renderSection(route);
  root.innerHTML = renderFrame(page.section, page.title, page.content);

  if (page.section === "especialistas" && !route.id) void loadSpecialists();
  if (page.section === "usuarios" && !route.id) void loadUsers();
}

async function loadSpecialists(): Promise<void> {
  const target = root.querySelector<HTMLDivElement>("#specialist-results");
  if (!target) return;
  const requestId = ++specialistRequest;
  target.innerHTML = renderStatePanel("loading", "Cargando registros de muestra", "Se están aplicando los filtros a la vista ficticia.");

  try {
    const result = await previewSource.searchSpecialists({ ...specialistFilters });
    if (requestId !== specialistRequest || !target.isConnected) return;
    target.innerHTML = renderSpecialistResults(result);
  } catch {
    if (requestId !== specialistRequest || !target.isConnected) return;
    target.innerHTML = `${renderStatePanel("error", "No se pudieron cargar los registros", "La consulta de muestra falló. No se cambió ningún dato.")}
      <button class="button button--secondary" type="button" data-action="retry-specialists">Reintentar</button>`;
  }
}

async function loadUsers(): Promise<void> {
  const target = root.querySelector<HTMLDivElement>("#user-results");
  if (!target) return;
  const requestId = ++userRequest;
  target.innerHTML = renderStatePanel("loading", "Cargando cuentas de muestra", "Se están aplicando los filtros a la vista ficticia.");

  try {
    const result = await previewSource.searchUsers({ ...userFilters });
    if (requestId !== userRequest || !target.isConnected) return;
    target.innerHTML = renderUserResults(result);
  } catch {
    if (requestId !== userRequest || !target.isConnected) return;
    target.innerHTML = `${renderStatePanel("error", "No se pudieron cargar las cuentas", "La consulta de muestra falló. No se cambió ningún dato.")}
      <button class="button button--secondary" type="button" data-action="retry-users">Reintentar</button>`;
  }
}

function readSpecialistFilters(): void {
  const value = (id: string): string => root.querySelector<HTMLSelectElement>(`#${id}`)?.value ?? "any";
  const stage = value("specialist-stage");
  const verification = value("specialist-verification");
  const trades = new Set(demoSpecialists.map((record) => record.trade));
  const zones = new Set(demoSpecialists.map((record) => record.zone));
  const verificationLevels: VerificationLevel[] = ["sin_iniciar", "en_curso", "nivel_1", "nivel_2"];
  const activities = new Set(["any", "active", "inactive"]);

  specialistFilters.trade = trades.has(value("specialist-trade")) ? value("specialist-trade") : "any";
  specialistFilters.zone = zones.has(value("specialist-zone")) ? value("specialist-zone") : "any";
  specialistFilters.stage = isSpecialistStage(stage) ? stage : "any";
  specialistFilters.verification = verificationLevels.includes(verification as VerificationLevel)
    ? (verification as VerificationLevel)
    : "any";
  specialistFilters.enabled = ["yes", "no"].includes(value("specialist-enabled"))
    ? (value("specialist-enabled") as SpecialistSearch["enabled"])
    : "any";
  specialistFilters.activity = activities.has(value("specialist-activity"))
    ? (value("specialist-activity") as SpecialistSearch["activity"])
    : "any";
}

fun