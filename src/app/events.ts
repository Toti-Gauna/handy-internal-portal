import { root, readRoute, requestState, specialistFilters, userFilters } from "./state.ts";
import { readSpecialistFilters, readUserFilters } from "./filters.ts";
import { loadSpecialists, loadUsers, renderApp } from "./render.ts";

root.addEventListener("input", (event: Event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;

  if (target.id === "specialist-search") {
    specialistFilters.search = target.value;
    specialistFilters.page = 1;
    window.clearTimeout(requestState.specialistDebounce);
    requestState.specialistDebounce = window.setTimeout(() => void loadSpecialists(), 180);
  }
  if (target.id === "user-search") {
    userFilters.search = target.value;
    userFilters.page = 1;
    window.clearTimeout(requestState.userDebounce);
    requestState.userDebounce = window.setTimeout(() => void loadUsers(), 180);
  }
});

root.addEventListener("change", (event: Event) => {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) return;

  if (target.closest("#specialist-filters")) {
    readSpecialistFilters();
    specialistFilters.page = 1;
    void loadSpecialists();
  }
  if (target.id === "user-state") {
    readUserFilters();
    userFilters.page = 1;
    void loadUsers();
  }
});

root.addEventListener("submit", (event: SubmitEvent) => {
  event.preventDefault();
});

root.addEventListener("click", (event: MouseEvent) => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest<HTMLButtonElement>("button[data-action], button[data-page-action]");
  if (!button) return;

  const action = button.dataset.action;
  if (action === "exit-demo") {
    window.location.assign(window.location.pathname);
    return;
  }
  if (action === "toggle-nav") {
    const expanded = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!expanded));
    button.setAttribute("aria-label", expanded ? "Abrir navegación" : "Cerrar navegación");
    document.body.classList.toggle("nav-open", !expanded);
    return;
  }
  if (action === "retry-specialists") {
    void loadSpecialists();
    return;
  }
  if (action === "retry-users") {
    void loadUsers();
    return;
  }

  const direction = button.dataset.pageAction;
  if (direction === "previous" || direction === "next") {
    if (readRoute().section === "especialistas") {
      specialistFilters.page = Math.max(1, specialistFilters.page + (direction === "next" ? 1 : -1));
      void loadSpecialists();
    } else if (readRoute().section === "usuarios") {
      userFilters.page = Math.max(1, userFilters.page + (direction === "next" ? 1 : -1));
      void loadUsers();
    }
  }
});

window.addEventListener("hashchange", () => {
  document.body.classList.remove("nav-open");
  renderApp();
});

document.addEventListener("click", (event: MouseEvent) => {
  if (!document.body.classList.contains("nav-open")) return;
  if (!(event.target instanceof Element)) return;
  if (event.target.closest(".sidebar, .menu-toggle")) return;
  document.body.classList.remove("nav-open");
  const toggle = root.querySelector<HTMLButtonElement>("[data-action='toggle-nav']");
  toggle?.setAttribute("aria-expanded", "false");
  toggle?.setAttribute("aria-label", "Abrir navegación");
});

window.addEventListener("keydown", (event: KeyboardEvent) => {
  if (event.key !== "Escape" || !document.body.classList.contains("nav-open")) return;
  document.body.classList.remove("nav-open");
  const toggle = root.querySelector<HTMLButtonElement>("[data-action='toggle-nav']");
  toggle?.setAttribute("aria-expanded", "false");
  toggle?.setAttribute("aria-label", "Abrir navegación");
  toggle?.focus();
});
