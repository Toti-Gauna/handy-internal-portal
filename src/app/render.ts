import { renderFrame, type PortalSection } from "../components/frame.ts";
import { escapeHtml } from "../components/escape.ts";
import { renderStatePanel } from "../components/states.ts";
import { demoSpecialists, demoUsers } from "../data/demo-data.ts";
import { renderHomePage } from "../pages/home.ts";
import { renderOperationsPage } from "../pages/operations.ts";
import { renderSpecialistDetail, renderSpecialistResults, renderSpecialistsPage } from "../pages/specialists.ts";
import { renderUserDetail, renderUserResults, renderUsersPage } from "../pages/users.ts";
import { canOpenInternalRoute } from "../security/access.ts";
import { previewMode, previewSource, readRoute, requestState, root, session, specialistFilters, userFilters, type Route } from "./state.ts";

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

export function renderApp(): void {
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

export async function loadSpecialists(): Promise<void> {
  const target = root.querySelector<HTMLDivElement>("#specialist-results");
  if (!target) return;
  const requestId = ++requestState.specialistRequest;
  target.innerHTML = renderStatePanel("loading", "Cargando registros de muestra", "Se están aplicando los filtros a la vista ficticia.");

  try {
    const result = await previewSource.searchSpecialists({ ...specialistFilters });
    if (requestId !== requestState.specialistRequest || !target.isConnected) return;
    target.innerHTML = renderSpecialistResults(result);
  } catch {
    if (requestId !== requestState.specialistRequest || !target.isConnected) return;
    target.innerHTML = `${renderStatePanel("error", "No se pudieron cargar los registros", "La consulta de muestra falló. No se cambió ningún dato.")}
      <button class="button button--secondary" type="button" data-action="retry-specialists">Reintentar</button>`;
  }
}

export async function loadUsers(): Promise<void> {
  const target = root.querySelector<HTMLDivElement>("#user-results");
  if (!target) return;
  const requestId = ++requestState.userRequest;
  target.innerHTML = renderStatePanel("loading", "Cargando cuentas de muestra", "Se están aplicando los filtros a la vista ficticia.");

  try {
    const result = await previewSource.searchUsers({ ...userFilters });
    if (requestId !== requestState.userRequest || !target.isConnected) return;
    target.innerHTML = renderUserResults(result);
  } catch {
    if (requestId !== requestState.userRequest || !target.isConnected) return;
    target.innerHTML = `${renderStatePanel("error", "No se pudieron cargar las cuentas", "La consulta de muestra falló. No se cambió ningún dato.")}
      <button class="button button--secondary" type="button" data-action="retry-users">Reintentar</button>`;
  }
}
