import { demoSpecialists } from "../data/demo-data.ts";
import type { PageResult, SpecialistSearch } from "../domain/directories.ts";
import { stageGroup, stageLabels, specialistStages, type SpecialistRecord, type VerificationLevel } from "../domain/specialists.ts";
import { escapeHtml, formatDemoDate } from "../components/escape.ts";
import { pageHeading } from "../components/frame.ts";
import { renderStatePanel } from "../components/states.ts";

const verificationLabels: Record<VerificationLevel, string> = {
  sin_iniciar: "Sin iniciar",
  en_curso: "En curso",
  nivel_1: "Nivel 1 · muestra",
  nivel_2: "Nivel 2 · muestra",
};

function selectOption(value: string, label: string, selected: string): string {
  return `<option value="${escapeHtml(value)}" ${selected === value ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

export function renderSpecialistsPage(filters: SpecialistSearch): string {
  const trades = Array.from(new Set(demoSpecialists.map((item) => item.trade))).sort();
  const zones = Array.from(new Set(demoSpecialists.map((item) => item.zone))).sort();

  return `
    <div class="page-content">
      ${pageHeading("CRM LIVIANO", "Especialistas", "Buscá registros de muestra, revisá la etapa OPS-01 y consultá la actividad operativa ficticia.", '<button class="button button--disabled" type="button" disabled aria-describedby="specialist-action-reason">Registrar acción</button><span class="sr-only" id="specialist-action-reason">Acciones bloqueadas hasta definir autorización y contrato backend.</span>')}

      <section class="surface directory-surface" aria-labelledby="specialist-list-title">
        <div class="section-heading section-heading--compact">
          <div><p class="eyebrow">DIRECTORIO DE MUESTRA</p><h2 id="specialist-list-title">Registros de especialistas</h2></div>
          <span class="result-hint">Filtros locales sobre datos ficticios</span>
        </div>

        <form class="filters" id="specialist-filters" aria-label="Filtros de especialistas">
          <label class="filter-control filter-control--search">
            <span>Buscar</span>
            <span class="input-wrap"><span aria-hidden="true">⌕</span><input id="specialist-search" name="search" type="search" placeholder="Nombre de muestra, ID, rubro…" value="${escapeHtml(filters.search)}" autocomplete="off" /></span>
          </label>
          <label class="filter-control"><span>Rubro</span><select id="specialist-trade" name="trade">${selectOption("any", "Todos", filters.trade)}${trades.map((trade) => selectOption(trade, trade, filters.trade)).join("")}</select></label>
          <label class="filter-control"><span>Zona</span><select id="specialist-zone" name="zone">${selectOption("any", "Todas", filters.zone)}${zones.map((zone) => selectOption(zone, zone, filters.zone)).join("")}</select></label>
          <label class="filter-control"><span>Etapa OPS-01</span><select id="specialist-stage" name="stage">${selectOption("any", "Todas", filters.stage)}${specialistStages.map((stage) => selectOption(stage, stageLabels[stage], filters.stage)).join("")}</select></label>
          <label class="filter-control"><span>Nivel de verificación</span><select id="specialist-verification" name="verification">${selectOption("any", "Todos", filters.verification)}${(Object.keys(verificationLabels) as VerificationLevel[]).map((level) => selectOption(level, verificationLabels[level], filters.verification)).join("")}</select></label>
          <label class="filter-control"><span>Habilitado</span><select id="specialist-enabled" name="enabled">${selectOption("any", "Todos", filters.enabled)}${selectOption("yes", "Sí", filters.enabled)}${selectOption("no", "No", filters.enabled)}</select></label>
          <label class="filter-control"><span>Actividad</span><select id="specialist-activity" name="activity">${selectOption("any", "Todas", filters.activity)}${selectOption("active", "Activo · MET-01", filters.activity)}${selectOption("inactive", "Sin actividad", filters.activity)}</select></label>
        </form>

        <div id="specialist-results" class="results-container">${renderStatePanel("loading", "Cargando registros de muestra", "Se están aplicando los filtros a la vista ficticia.")}</div>
      </section>
      <p class="directory-footnote">La vista de muestra pagina sus fixtures localmente. La búsqueda, los filtros y la paginación server-side requieren el contrato que defina TECH-03/TECH-06.</p>
    </div>
  `;
}

function activityLabel(record: SpecialistRecord): string {
  if (record.activity === "active") return "Activo · muestra";
  if (record.activity === "inactive") return "Sin actividad · muestra";
  return "Sin dato de muestra";
}

export function renderSpecialistResults(result: PageResult<SpecialistRecord>): string {
  if (result.total === 0) {
    return renderStatePanel("empty", "No encontramos registros", "Probá con otros filtros. La vista solo contiene datos ficticios.");
  }

  const rows = result.rows
    .map(
      (record) => `
        <tr>
          <td><a class="record-link" href="#/especialistas/${encodeURIComponent(record.id)}"><strong>${escapeHtml(record.label)}</strong><small>${escapeHtml(record.id)}</small></a></td>
          <td>${escapeHtml(record.trade)}</td>
          <td>${escapeHtml(record.zone)}</td>
          <td><span class="stage-chip stage-chip--${record.stage}">${escapeHtml(stageLabels[record.stage])}</span></td>
          <td>${escapeHtml(verificationLabels[record.verificationLevel])}</td>
          <td><span class="boolean-chip ${record.enabled ? "boolean-chip--yes" : "boolean-chip--no"}">${record.enabled ? "Sí" : "No"}</span></td>
          <td>${escapeHtml(activityLabel(record))}</td>
          <td>${record.nextFollowUp ? escapeHtml(formatDemoDate(record.nextFollowUp)) : "—"}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <div class="table-scroll">
      <table class="data-table">
        <caption class="sr-only">Registros ficticios de especialistas</caption>
        <thead><tr><th scope="col">Especialista</th><th scope="col">Rubro</th><th scope="col">Zona</th><th scope="col">Etapa</th><th scope="col">Verificación</th><th scope="col">Habilitado</th><th scope="col">Actividad</th><th scope="col">Seguimiento</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="pagination" aria-label="Paginación de muestra">
      <span>Mostrando <strong>${result.rows.length}</strong> de <strong>${result.total}</strong> registros ficticios · Página ${result.page} de ${result.totalPages}</span>
      <div class="pagination__controls">
        <button type="button" class="button button--quiet button--small" data-page-action="previous" ${result.page <= 1 ? "disabled" : ""}>Anterior</button>
        <button type="button" class="button button--quiet button--small" data-page-action="next" ${result.page >= result.totalPages ? "disabled" : ""}>Siguiente</button>
      </div>
    </div>
  `;
}

function nextStageNote(record: SpecialistRecord): string {
  if (record.stage === "identificado") return "El paso que falta es una conversación efectiva. Un intento de contacto no mueve la etapa.";
  if (record.stage === "contactado") return "Comprometido requiere pre-registro con aviso de privacidad y fecha de alta aceptada.";
  if (record.stage === "comprometido") {
    const missing = record.verificationMilestones.find((milestone) => milestone.state === "pending");
    return missing ? `Falta el hito: ${missing.label}.` : "Completar y confirmar todos los hitos aplicables de LEG-08.";
  }
  if (record.stage === "verificado") return "Registrado requiere cuenta, aceptación de contrato y términos, y cuenta de cobro a nombre del especialista.";
  if (record.stage === "registrado") return "Habilitado requiere verificación y registro completos; la transición debe validarse en servidor.";
  if (record.stage === "habilitado") return "Activo se deriva de MET-01; no es una etiqueta manual.";
  r