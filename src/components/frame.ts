import logoUrl from "../img/logo-handy.webp";
import { escapeHtml } from "./escape.ts";
import { icon, type IconName } from "./icons.ts";

export type PortalSection = "inicio" | "preregistros" | "especialistas";

const navigation: Array<{ section: PortalSection; label: string; icon: IconName; path: string }> = [
  { section: "inicio", label: "Inicio", icon: "casa", path: "/inicio" },
  { section: "preregistros", label: "Pre-registros", icon: "lista", path: "/preregistros" },
  { section: "especialistas", label: "Especialistas", icon: "maletin", path: "/especialistas" },
];

export type NavBadges = Partial<Record<PortalSection, number>>;

/** Escapa el texto y convierte ==texto== en el marcador amarillo de la marca. */
export function brandTitle(text: string): string {
  return escapeHtml(text).replace(/==(.+?)==/g, '<span class="marca">$1</span>');
}

export function renderLogo(extraClass = ""): string {
  return `
    <a class="logo ${extraClass}" href="#/inicio" aria-label="Handy, ir a Inicio">
      <img class="logo__marca" src="${logoUrl}" alt="" width="720" height="194" />
      <span class="logo__bajada">Portal interno</span>
    </a>
  `;
}

export function renderFrame(section: PortalSection, body: string, badges: NavBadges = {}): string {
  const links = navigation
    .map(({ section: itemSection, label, icon: iconName, path }) => {
      const current = itemSection === section;
      const badge = badges[itemSection];
      return `
        <a class="nav-link${current ? " nav-link--actual" : ""}" href="#${path}" ${current ? 'aria-current="page"' : ""}>
          ${icon(iconName, "icono nav-link__icono")}
          <span class="nav-link__texto">${label}</span>
          ${badge ? `<span class="nav-link__badge" aria-label="${badge} para contactar">${badge}</span>` : ""}
        </a>
      `;
    })
    .join("");

  return `
    <a class="skip-link" href="#main-content">Saltar al contenido</a>
    <header class="header">
      <div class="header__interior contenedor">
        ${renderLogo()}
        <nav class="nav" aria-label="Navegación principal">${links}</nav>
        <button class="boton boton--contorno boton--chico header__salir" type="button" data-action="exit-demo">
          ${icon("salir")}<span>Salir de la muestra</span>
        </button>
      </div>
    </header>

    <div class="aviso-muestra" role="note">
      <div class="contenedor aviso-muestra__interior">
        <span class="aviso-muestra__etiqueta">Muestra</span>
        <p>Todos los registros son ficticios. No hay conexión con la landing ni con Handy, y las acciones están bloqueadas.</p>
      </div>
    </div>

    <main id="main-content" class="contenido contenedor" tabindex="-1">
      ${body}
    </main>
  `;
}

export function pageHeading(eyebrow: string, title: string, description: string, aside = ""): string {
  return `
    <section class="encabezado">
      <div class="encabezado__texto">
        <p class="eyebrow">${escapeHtml(eyebrow)}</p>
        <h1 class="titulo">${brandTitle(title)}</h1>
        <p class="encabezado__bajada">${escapeHtml(description)}</p>
      </div>
      ${aside ? `<div class="encabezado__aside">${aside}</div>` : ""}
    </section>
  `;
}
