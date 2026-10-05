import type { PageResult, UserRecord, UserSearch } from "../domain/directories.ts";
import { demoUsers } from "../data/demo-data.ts";
import { escapeHtml } from "../components/escape.ts";
import { pageHeading } from "../components/frame.ts";
import { renderStatePanel } from "../components/states.ts";

function selectOption(value: string, label: string, selected: string): string {
  return `<option value="${escapeHtml(value)}" ${selected === value ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

export function renderUsersPage(filters: UserSearch): string {
  return `
    <div class="page-content">
      ${pageHeading("CONSULTA DE CUENTAS", "Usuarios", "Localizá una cuenta y revisá un estado de ejemplo. No se muestran datos de contacto ni actividad privada.")}
      <section class="surface directory-surface" aria-labelledby="users-list-title">
        <div class="section-heading section-heading--compact">
          <div><p class="eyebrow">DIRECTORIO DE MUESTRA</p><h2 id="users-list-title">Cuentas</h2></div>
          <span class="result-hint">${demoUsers.length} cuentas ficticias</span>
        </div>
        <form class="filters filters--users" id="user-filters" aria-label="Filtros de usuarios">
          <label class="filter-control filter-control--search"><span>Buscar cuenta</span><span class="input-wrap"><span aria-hidden="true">⌕</span><input id="user-search" name="search" type="search" placeholder="ID o nombre de muestra…" value="${escapeHtml(filters.search)}" autocomplete="off" /></span></label>
          <label class="filter-control"><span>Estado de ejemplo</span><select id="user-state" name="state">${selectOption("any", "Todos", filters.state)}${selectOption("Activa · ficticio", "Activa · ficticio", filters.state)}${selectOption("Pendiente · ficticio", "Pendiente · ficticio", filters.state)}</select></label>
        </form>
        <div id="user-results" class="results-container">${renderStatePanel("loading", "Cargando cuentas de muestra", "Se están aplicando los filtros a la vista ficticia.")}</div>
      </section>
      <div class="privacy-note"><span class="privacy-note__icon" aria-hidden="true">✓</span><p><strong>Consulta mínima.</strong> La vista excluye chats, teléfonos, direcciones, ubicación histórica y medios de pago.</p></div>
    </div>
  `;
}

export function renderUserResults(result: PageResult<UserRecord>): string {
  if (result.total === 0) {
    return renderStatePanel("empty", "No encontramos cuentas", "Probá con otro ID de muestra.");
  }

  const rows = result.rows
    .map(
      (record) => `
        <tr>
          <td><a class="record-link" href="#/usuarios/${encodeURIComponent(record.id)}"><strong>${escapeHtml(record.label)}</strong><small>${escapeHtml(record.id)}</small></a></td>
          <td>${escapeHtml(record.registeredOn)} · fecha ficticia</td>
          <td><span class="status-pill status-pill--neutral">${escapeHtml(record.sampleState)}</span></td>
          <td><a class="row-action" href="#/usuarios/${encodeURIComponent(record.id)}">Ver ficha <span aria-hidden="true">→</span></a></td>
        </tr>
      `,
    )
    .join("");

  return `
    <div class="table-scroll"><table class="data-table data-table--users"><caption class="sr-only">Cuentas de usuario ficticias</caption><thead><tr><th scope="col">Cuenta</th><th scope="col">Registro</th><th scope="col">Estado de ejemplo</th><th scope="col"><span class="sr-only">Acción</span></th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="pagination"><span>Mostrando <strong>${result.rows.length}</strong> de <strong>${result.total}</strong> cuentas ficticias · Página ${result.page} de ${result.totalPages}</span><div class="pagination__controls"><button type="button" class="button button--quiet button--small" data-page-action="previous" ${result.page <= 1 ? "disabled" : ""}>Anterior</button><button type="button" class="button button--quiet button--small" data-page-action="next" ${result.page >= result.totalPages ? "disabled" : ""}>Siguiente</button></div></div>
  `;
}

export function renderUserDetail(record: UserRecord | undefined): string {
  if (!record) return `<div class="page-content">${renderStatePanel("empty", "No encontramos esa cuenta de muestra", "Volvé al listado para buscar otra cuenta.")}<a class="button button--secondary" href="#/usuarios">Volver al listado</a></div>`;

  return `
    <div class="page-content">
      <a class="back-link" href="#/usuarios"><span aria-hidden="true">←</span> Volver a usuarios</a>
      <section class="profile-heading profile-heading--user"><div class="profile-avatar profile-avatar--user" aria-hidden="true">◎</div><div class="profile-heading__main"><p class="eyebrow">FICHA MÍNIMA · DATOS FICTICIOS</p><h1>${escapeHtml(record.label)}</h1><p>${escapeHtml(record.id)}</p></div><span class="status-pill status-pill--neutral">${escapeHtml(record.sampleState)}</span></section>
      <section class="surface user-detail-card" aria-labelledby="user-state-title"><p class="eyebrow">ESTADO OPERATIVO DE EJEMPLO</p><h2 id="user-state-title">${escapeHtml(record.sampleState)}</h2><dl class="detail-list"><div><dt>Alta</dt><dd>${escapeHtml(record.registeredOn)} · fecha ficticia</dd></div><div><dt>Acciones administrativas</dt><dd>No disponibles en esta vista</dd></div></dl>
        <div class="blocked-action"><button class="button button--disabled" type="button" disabled>Editar cuenta</button><span>Acciones no habilitadas · TECH-06 · TECH-08 · LEG-36</span></div>
      </section>
      <div class="privacy-note"><span class="privacy-note__icon" aria-hidden="true">✓</span><p><strong>Ficha acotada.</strong> No incluye chat, direcciones guardadas, teléfono, ubicación ni medios de pago. No existe una acción de borrado manual.</p></div>
    </div>
  `;
}
