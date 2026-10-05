import { demoSpecialists } from "../data/demo-data.ts";
import type { PageResult, SpecialistSearch } from "../domain/directories.ts";
import { postRegistrationStages, stageLabels, type SpecialistRecord, type VerificationLevel } from "../domain/specialists.ts";
import { escapeHtml, formatDateTime } from "../components/escape.ts";
import { pageHeading } from "../components/frame.ts";
import { icon } from "../components/icons.ts";
import { renderStatePanel } from "../components/states.ts";
import { avatar } from "./preregistro-parts.ts";

export const verificationLabels: Record<VerificationLevel, string> = {
  sin_iniciar: "Sin iniciar",
  en_curso: "En curso",
  nivel_1: "Nivel 1",
  nivel_2: "Nivel 2",
};

function option(value: string, label: string, selected: string): string {
  return `<option value="${escapeHtml(value)}" ${selected === value ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

function select(id: string, label: string, options: string): string {
  return `<label class="campo campo--select"><span class="campo__label">${escapeHtml(label)}</span><select id="${id}">${options}</select></label>`;
}

export function renderSpecialistsPage(filters: SpecialistSearch): string {
  const trades = Array.from(new Set(demoSpecialists.map((item) => item.trade))).sort();

  return `
    ${pageHeading("Embudo OPS-01 · post-registro", "==Especialistas==", "Desde Verificado hasta Activo. Las etapas anteriores se trabajan en Pre-registros.")}
    <section class="tarjeta" aria-label="Especialistas">
      <form class="filtros" id="specialist-filters" aria-label="Filtros de especialistas">
        <label class="campo campo--busqueda"><span class="sr-only">Buscar</span>${icon("lupa")}<input id="specialist-search" type="search" placeholder="Nombre, ID, rubro o zona…" value="${escapeHtml(filters.search)}" autocomplete="off" /></label>
        ${select("specialist-trade", "Rubro", option("any", "Todos", filters.trade) + trades.map((trade) => option(trade, trade, filters.trade)).join(""))}
        ${select("specialist-stage", "Etapa", option("any", "Todas", filters.stage) + postRegistrationStages.map((stage) => option(stage, stageLabels[stage], filters.stage)).join(""))}
        ${select("specialist-verification", "Verificación", option("any", "Todas", filters.verification) + (Object.keys(verificationLabels) as VerificationLevel[]).map((level) => option(level, verificationLabels[level], filters.verification)).join(""))}
        ${select("specialist-enabled", "Habilitado", option("any", "Todos", filters.enabled) + option("yes", "Sí", filters.enabled) + option("no", "No", filters.enabled))}
        ${select("specialist-activity", "Actividad", option("any", "Todas", filters.activity) + option("active", "Activo · MET-01", filters.activity) + option("inactive", "Sin actividad", filters.activity))}
      </form>
      <div id="specialist-results">${renderStatePanel("loading", "Cargando especialistas", "Aplicando filtros a la muestra.")}</div>
    </section>
    <p class="nota nota--pie">La muestra filtra localmente. Búsqueda, filtros y paginación en servidor requieren el contrato de TECH-03/TECH-06.</p>
  `;
}

function activityLabel(record: SpecialistRecord): string {
  if (record.activity === "active") return "Activo";
  if (record.activity === "inactive") return "Sin actividad";
  return "Sin dato";
}

export function renderSpecialistResults(result: PageResult<SpecialistRecord>): string {
  if (result.total === 0) {
    return renderStatePanel("empty", "No encontramos especialistas", "Probá con otros filtros.");
  }

  const rows = result.rows
    .map(
      (record) => `
      <li>
        <a class="fila fila--especialista" href="#/especialistas/${encodeURIComponent(record.id)}">
          ${avatar(record.label)}
          <span class="fila__principal">
            <strong class="fila__nombre">${escapeHtml(record.label)}</strong>
            <span class="fila__meta">${escapeHtml(record.trade)} <span aria-hidden="true">·</span> ${icon("pin")}${escapeHtml(record.zone)}</span>
          </span>
          <span class="fila__detalle">
            <span>Verificación: ${escapeHtml(verificationLabels[record.verificationLevel])}</span>
            <span class="fila__meta">${record.nextFollowUp ? `${icon("reloj")}Seguimiento ${escapeHtml(formatDateTime(record.nextFollowUp))}` : `Actividad: ${escapeHtml(activityLabel(record))}`}</span>
          </span>
          <span class="fila__estado">
            <span class="pastilla pastilla--etapa-${record.stage}">${escapeHtml(stageLabels[record.stage])}</span>
            <span class="pastilla ${record.enabled ? "pastilla--si" : "pastilla--neutra"}">${record.enabled ? "Recibe pedidos" : "No recibe pedidos"}</span>
          </span>
          <span class="fila__flecha">${icon("derecha")}</span>
        </a>
      </li>`,
    )
    .join("");

  const pages =
    result.totalPages > 1
      ? `<div class="paginacion"><p class="paginacion__resumen">${result.rows.length} de ${result.total} · Página ${result.page} de ${result.totalPages}</p>
        <div class="paginacion__botones">
          <button type="button" class="boton boton--contorno boton--chico" data-page-action="previous" ${result.page <= 1 ? "disabled" : ""}>Anterior</button>
          <button type="button" class="boton boton--contorno boton--chico" data-page-action="next" ${result.page >= result.totalPages ? "disabled" : ""}>Siguiente</button>
        </div></div>`
      : `<p class="paginacion__resumen">${result.total} especialistas</p>`;

  return `<ul class="filas">${rows}</ul>${pages}`;
}
