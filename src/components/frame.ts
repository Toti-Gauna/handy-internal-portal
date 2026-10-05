import { escapeHtml } from "./escape.ts";

export type PortalSection = "inicio" | "especialistas" | "usuarios" | "operaciones";

const navigation: Array<{ section: PortalSection; label: string; icon: string; path: string }> = [
  { section: "inicio", label: "Inicio", icon: "⌂", path: "/inicio" },
  { section: "especialistas", label: "Especialistas", icon: "◇", path: "/especialistas" },
  { section: "usuarios", label: "Usuarios", icon: "◎", path: "/usuarios" },
  { section: "operaciones", label: "Operaciones", icon: "▦", path: "/operaciones" },
];

export function renderFrame(section: PortalSection, title: string, body: string): string {
  const links = navigation
    .map(({ section: itemSection, label, icon, path }) => {
      const current = itemSection === section;
      return `
        <a class="nav-link${current ? " nav-link--current" : ""}" href="#${path}" ${current ? 'aria-current="page"' : ""}>
          <span class="nav-link__icon" aria-hidden="true">${icon}</span>
          <span>${label}</span>
        </a>
      `;
    })
    .join("");

  return `
    <a class="skip-link" href="#main-content">Saltar al contenido</a>
    <div class="portal-shell">
      <aside class="sidebar" aria-label="Navegación principal">
        <a class="brand" href="#/inicio" aria-label="Handy, ir a Inicio">
          <span class="brand__mark" aria-hidden="true">H</span>
          <span class="brand__word">handy</span>
          <span class="brand__caption">OPERACIONES</span>
        </a>
        <div class="sidebar__label">Espacio de trabajo</div>
        <nav class="main-nav">${links}</nav>
        <div class="sidebar__footer">
          <span class="sidebar__footer-dot" aria-hidden="true"></span>
          <span>Vista de referencia</span>
        </div>
      </aside>

      <div class="portal-main">
        <header class="topbar">
          <div class="topbar__left">
            <button class="menu-toggle" type="button" data-action="toggle-nav" aria-label="Abrir navegación" aria-expanded="false">
              <span aria-hidden="true">☰</span>
            </button>
            <div class="breadcrumbs"><span>Handy</span><span aria-hidden="true">/</span><strong>${escapeHtml(title)}</strong></div>
          </div>
          <button class="button button--quiet button--small" type="button" data-action="exit-demo">Salir de la muestra</button>
        </header>

        <main id="main-content" class="content" tabindex="-1">
          <div class="demo-banner" role="note">
            <span class="demo-banner__dot" aria-hidden="true"></span>
            <p><strong>Vista de muestra.</strong> Todos los registros son ficticios. No hay conexión a Handy y las acciones están desactivadas.</p>
          </div>
          ${body}
        </main>
      </div>
    </div>
  `;
}

export function pageHeading(eyebrow: string, title: string, description: string, action = ""): string {
  return `
    <section class="page-heading">
      <div class="page-heading__copy">
        <p class="eyebrow">${escapeHtml(eyebrow)}</p>
        <h1>${escapeHtml(title)}</h1>
        <p class="page-heading__description">${escapeHtml(description)}</p>
      </div>
      ${action ? `<div class="page-heading__action">${action}</div>` : ""}
    </section>
  `;
}
