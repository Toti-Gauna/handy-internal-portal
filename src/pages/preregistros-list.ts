import type { PageResult } from "../domain/directories.ts";
import {
  CONTACT_STATUSES,
  RUBROS,
  contactStatusLabels,
  rubroLabels,
  type ContactCounts,
  type ContactStatus,
  type EspecialistaPreSearch,
  type EspecialistasPage,
  type PreregistroUsuario,
  type UsuarioPreSearch,
} from "../domain/preregistros.ts";
import { escapeHtml, formatDate } from "../components/escape.ts";
import { pageHeading } from "../components/frame.ts";
import { icon } from "../components/icons.ts";
import { renderStatePanel } from "../components/states.ts";
import type { PreregistroTab } from "../app/state.ts";
import { avatar, contactPill, rubroChips, rubroIcon } from "./preregistro-parts.ts";

function option(value: string, label: string, selected: string): string {
  return `<option value="${escapeHtml(value)}" ${selected === value ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

export interface PreregistroTotals {
  especialistas: number;
  usuarios: number;
}

export interface ListContext {
  /** Muestra con fixtures (filtra localmente) o backend real (filtra el servidor). */
  previewMode: boolean;
  /** `preregistros:support`: buscar a un usuario por su email exacto. */
  canSearchUsersByEmail: boolean;
}

function tabs(current: PreregistroTab, totals: PreregistroTotals | null): string {
  const tab = (id: PreregistroTab, label: string, count: number | undefined, href: string): string => `
    <a class="pestana${current === id ? " pestana--actual" : ""}" href="${href}" ${current === id ? 'aria-current="page"' : ""}>
      ${escapeHtml(label)}${count === undefined ? "" : ` <span class="pestana__numero">${count}</span>`}
    </a>`;
  return `
    <nav class="pestanas" aria-label="Tipo de pre-registro">
      ${tab("especialistas", "Especialistas", totals?.especialistas, "#/preregistros")}
      ${tab("usuarios", "Usuarios", totals?.usuarios, "#/preregistros/usuarios")}
    </nav>
  `;
}

function searchField(id: string, value: string, placeholder: string, describedBy: string): string {
  return `
    <label class="campo campo--busqueda">
      <span class="sr-only">Buscar (búsqueda exacta)</span>
      ${icon("lupa")}
      <input id="${id}" type="search" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(value)}" autocomplete="off" aria-describedby="${describedBy}" />
    </label>
  `;
}

function orderSelect(id: string, value: string, withFollowUp = false): string {
  return `
    <label class="campo campo--select">
      <span class="campo__label">Orden</span>
      <select id="${id}">${option("recientes", "Más recientes", value)}${option("antiguos", "Más antiguos", value)}${
        withFollowUp ? option("seguimiento", "Seguimiento más próximo", value) : ""
      }</select>
    </label>
  `;
}

/** Sin conteos (todavía cargando o con error) se muestran las pestañas sin número. */
export function renderContactStatusTabs(filters: EspecialistaPreSearch, counts?: ContactCounts): string {
  const item = (value: ContactStatus | "any", label: string): string => `
    <button class="filtro-estado${filters.contacto === value ? " filtro-estado--actual" : ""}" type="button" data-action="filter-contacto" data-contacto="${value}" aria-pressed="${filters.contacto === value}">
      ${escapeHtml(label)}${counts ? ` <span>${counts[value]}</span>` : ""}
    </button>`;
  return `${item("any", "Todos")}${CONTACT_STATUSES.map((status) => item(status, contactStatusLabels[status])).join("")}`;
}

export function renderPreregistrosPage(
  tab: PreregistroTab,
  especialistas: EspecialistaPreSearch,
  usuarios: UsuarioPreSearch,
  totals: PreregistroTotals | null,
  context: ListContext,
): string {
  const heading = pageHeading(
    "Formulario de la landing",
    "Pre-==registros==",
    tab === "especialistas"
      ? "Quién se anotó como especialista, en qué estado de contacto está y qué le falta para comprometerse."
      : "Personas que quieren usar Handy. Se les avisa del lanzamiento; no entran en el embudo de contacto.",
    tabs(tab, totals),
  );
  const loading = renderStatePanel("loading", "Cargando pre-registros", context.previewMode ? "Aplicando filtros a la muestra." : "Consultando al servidor.");

  if (tab === "usuarios") {
    const placeholder = context.canSearchUsersByEmail ? "ID o email exacto…" : "ID exacto…";
    return `
      ${heading}
      <section class="tarjeta" aria-label="Pre-registros de usuarios">
        <form class="filtros" id="usuario-filtros" aria-label="Filtros de usuarios">
          ${searchField("usuario-busqueda", usuarios.search, placeholder, "usuario-busqueda-ayuda")}
          ${orderSelect("usuario-orden", usuarios.orden)}
        </form>
        <p class="nota nota--filtros" id="usuario-busqueda-ayuda">${
          context.canSearchUsersByEmail
            ? "La búsqueda es exacta: ID o email completo (para atender pedidos de baja o acceso). No busca por parte del email."
            : "La búsqueda es exacta y por ID. Buscar a un usuario por su email requiere el permiso preregistros:support."
        }</p>
        <div id="preregistro-resultados">${loading}</div>
      </section>
      <p class="nota nota--pie">Los usuarios solo muestran id y fechas: el email y el WhatsApp se usan solo para avisar el lanzamiento, como dice la política de privacidad de la landing.</p>
    `;
  }

  return `
    ${heading}
    <section class="tarjeta" aria-label="Pre-registros de especialistas">
      <div class="filtro-estados" id="filtro-estados" role="group" aria-label="Estado de contacto">${renderContactStatusTabs(especialistas)}</div>
      <div class="mosaicos mosaicos--filtro" role="group" aria-label="Rubro">
        ${RUBROS.map(
          (rubro) => `
          <button class="mosaico mosaico--chico${especialistas.rubro === rubro ? " mosaico--actual" : ""}" type="button" data-action="filter-rubro" data-rubro="${rubro}" aria-pressed="${especialistas.rubro === rubro}">
            ${rubroIcon(rubro)}<span class="mosaico__nombre">${escapeHtml(rubroLabels[rubro].nombre)}</span>
          </button>`,
        ).join("")}
      </div>
      <form class="filtros" id="especialista-filtros" aria-label="Filtros de especialistas">
        ${searchField("especialista-busqueda", especialistas.search, "ID o WhatsApp completo…", "especialista-busqueda-ayuda")}
        <label class="campo campo--zona">
          <span class="campo__label">Zona (exacta)</span>
          <input id="especialista-zona" type="text" maxlength="120" autocomplete="off" placeholder="Ej.: Zona norte" value="${escapeHtml(especialistas.zona)}" />
        </label>
        ${orderSelect("especialista-orden", especialistas.orden, true)}
      </form>
      <p class="nota nota--filtros" id="especialista-busqueda-ayuda">La búsqueda es exacta: ID o WhatsApp completo, con código de área. No busca por nombre ni por parte del número. La zona también tiene que coincidir entera (da igual mayúsculas y tildes).</p>
      <div id="preregistro-resultados">${loading}</div>
    </section>
    <p class="nota nota--pie">${
      context.previewMode
        ? "La muestra filtra localmente. Con el backend conectado, búsqueda, filtros, orden y paginación (hasta 50 por página) los hace el servidor."
        : "Búsqueda, filtros, orden y paginación los hace el servidor. Cada consulta queda auditada."
    }</p>
  `;
}

function pagination<T>(result: PageResult<T>): string {
  if (result.totalPages <= 1) return `<p class="paginacion__resumen">${result.total} ${result.total === 1 ? "pre-registro" : "pre-registros"}</p>`;
  return `
    <div class="paginacion">
      <p class="paginacion__resumen">${result.rows.length} de ${result.total} · Página ${result.page} de ${result.totalPages}</p>
      <div class="paginacion__botones">
        <button type="button" class="boton boton--contorno boton--chico" data-page-action="previous" ${result.page <= 1 ? "disabled" : ""}>Anterior</button>
        <button type="button" class="boton boton--contorno boton--chico" data-page-action="next" ${result.page >= result.totalPages ? "disabled" : ""}>Siguiente</button>
      </div>
    </div>
  `;
}

export function renderEspecialistaResults(result: EspecialistasPage): string {
  if (result.total === 0) {
    return renderStatePanel("empty", "No hay pre-registros con esos filtros", "Probá sacando algún filtro. Recordá que la búsqueda y la zona son exactas.");
  }
  const rows = result.rows
    .map(
      (record) => `
      <li>
        <a class="fila" href="#/preregistros/${encodeURIComponent(record.id)}">
          ${avatar(record.nombre)}
          <span class="fila__principal">
            <strong class="fila__nombre">${escapeHtml(record.nombre)}</strong>
            <span class="fila__meta">${icon("pin")}${escapeHtml(record.zona)} <span aria-hidden="true">·</span> Se anotó el ${escapeHtml(formatDate(record.creadoEn))}</span>
          </span>
          <span class="fila__rubros">${rubroChips(record.rubros)}</span>
          <span class="fila__estado">${contactPill(record)}</span>
          <span class="fila__flecha">${icon("derecha")}</span>
        </a>
      </li>`,
    )
    .join("");
  return `<ul class="filas">${rows}</ul>${pagination(result)}`;
}

export function renderUsuarioResults(result: PageResult<PreregistroUsuario>): string {
  if (result.total === 0) {
    return renderStatePanel("empty", "No hay pre-registros de usuarios con esa búsqueda", "La búsqueda es exacta: probá con el ID completo o con el email completo.");
  }
  const rows = result.rows
    .map(
      (record) => `
      <li>
        <a class="fila fila--usuario" href="#/preregistros/${encodeURIComponent(record.id)}">
          ${avatar("U", "avatar--claro")}
          <span class="fila__principal">
            <strong class="fila__nombre">Usuario anotado</strong>
            <span class="fila__meta">${escapeHtml(record.id)} <span aria-hidden="true">·</span> Se anotó el ${escapeHtml(formatDate(record.creadoEn))}</span>
          </span>
          <span class="fila__estado"><span class="pastilla pastilla--neutra">Aviso de lanzamiento</span></span>
          <span class="fila__flecha">${icon("derecha")}</span>
        </a>
      </li>`,
    )
    .join("");
  return `<ul class="filas">${rows}</ul>${pagination(result)}`;
}
