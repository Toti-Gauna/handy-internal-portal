import { preEspecialistaFilters, preregistroTab, preUsuarioFilters, readRoute, requestState, root, specialistFilters } from "./state.ts";
import { readPreregistroFilters, readSpecialistFilters, setContactFilter, toggleRubro } from "./filters.ts";
import { loadPreregistros, loadSpecialists, renderApp, submitContact } from "./render.ts";

function debounce(key: "specialistDebounce" | "preregistroDebounce", run: () => void): void {
  window.clearTimeout(requestState[key]);
  requestState[key] = window.setTimeout(run, 180);
}

root.addEventListener("input", (event: Event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;

  if (target.id === "specialist-search") {
    specialistFilters.search = target.value;
    specialistFilters.page = 1;
    debounce("specialistDebounce", () => void loadSpecialists());
  }
  if (target.id === "especialista-busqueda") {
    preEspecialistaFilters.search = target.value;
    preEspecialistaFilters.page = 1;
    debounce("preregistroDebounce", () => void loadPreregistros());
  }
  if (target.id === "usuario-busqueda") {
    preUsuarioFilters.search = target.value;
    preUsuarioFilters.page = 1;
    debounce("preregistroDebounce", () => void loadPreregistros());
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
  if (target.closest("#especialista-filtros, #usuario-filtros")) {
    readPreregistroFilters();
    void loadPreregistros();
  }
});

root.addEventListener("submit", (event: SubmitEvent) => {
  event.preventDefault();
  if (event.target instanceof HTMLFormElement && event.target.id === "registro-contacto") void submitContact(event.target);
});

function syncPressed(selector: string, isCurrent: (button: HTMLButtonElement) => boolean, currentClass: string): void {
  root.querySelectorAll<HTMLButtonElement>(selector).forEach((button) => {
    const current = isCurrent(button);
    button.classList.toggle(currentClass, current);
    button.setAttribute("aria-pressed", String(current));
  });
}

async function copyMessage(button: HTMLButtonElement): Promise<void> {
  const text = document.getElementById(button.dataset.target ?? "")?.textContent ?? "";
  const label = button.querySelector("span");
  try {
    await navigator.clipboard.writeText(text);
    if (label) label.textContent = "¡Copiado!";
  } catch {
    if (label) label.textContent = "No se pudo copiar";
  }
  window.setTimeout(() => {
    if (label) label.textContent = "Copiar mensaje";
  }, 2000);
}

root.addEventListener("click", (event: MouseEvent) => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest<HTMLButtonElement>("button[data-action], button[data-page-action]");
  if (!button) return;

  const action = button.dataset.action;
  if (action === "exit-demo") {
    window.location.assign(window.location.pathname);
    return;
  }
  if (action === "reload") {
    void renderApp();
    return;
  }
  if (action === "retry-specialists") {
    void loadSpecialists();
    return;
  }
  if (action === "retry-preregistros") {
    void loadPreregistros();
    return;
  }
  if (action === "copy-message") {
    void copyMessage(button);
    return;
  }
  if (action === "filter-rubro") {
    const onList = preregistroTab(readRoute()) === "especialistas";
    toggleRubro(button.dataset.rubro ?? "", !onList);
    if (!onList) {
      window.location.hash = "#/preregistros";
      return;
    }
    syncPressed("[data-action='filter-rubro']", (item) => item.dataset.rubro === preEspecialistaFilters.rubro, "mosaico--actual");
    void loadPreregistros();
    return;
  }
  if (action === "filter-contacto") {
    setContactFilter(button.dataset.contacto ?? "any");
    void loadPreregistros();
    return;
  }

  const direction = button.dataset.pageAction;
  if (direction !== "previous" && direction !== "next") return;
  const step = direction === "next" ? 1 : -1;
  const route = readRoute();
  if (route.section === "especialistas") {
    specialistFilters.page = Math.max(1, specialistFilters.page + step);
    void loadSpecialists();
  } else if (preregistroTab(route) === "especialistas") {
    preEspecialistaFilters.page = Math.max(1, preEspecialistaFilters.page + step);
    void loadPreregistros();
  } else if (preregistroTab(route) === "usuarios") {
    preUsuarioFilters.page = Math.max(1, preUsuarioFilters.page + step);
    void loadPreregistros();
  }
});

window.addEventListener("hashchange", () => {
  void renderApp().then(() => window.scrollTo({ top: 0 }));
});
