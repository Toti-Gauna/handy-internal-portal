import { demoFollowUps, demoSpecialists } from "../data/demo-data.ts";
import { specialistStages, stageGroup, stageLabels, type SpecialistStage } from "../domain/specialists.ts";
import { escapeHtml, formatDemoDate } from "../components/escape.ts";
import { renderStatePanel } from "../components/states.ts";

function stageCount(stage: SpecialistStage): number {
  return demoSpecialists.filter((record) => record.stage === stage).length;
}

function renderStageGroup(group: "pre_registro" | "post_registro", title: string, stages: SpecialistStage[]): string {
  const stageRows = stages
    .map(
      (stage) => `
        <div class="stage-row">
          <span class="stage-row__name"><span class="stage-row__bullet stage-row__bullet--${stage}" aria-hidden="true"></span>${stageLabels[stage]}</span>
          <strong class="stage-row__count">${stageCount(stage)}</strong>
        </div>
      `,
    )
    .join("");

  return `
    <section class="funnel-group funnel-group--${group}" aria-labelledby="funnel-${group}">
      <div class="funnel-group__heading">
        <div>
          <h3 id="funnel-${group}">${title}</h3>
          <p>${group === "pre_registro" ? "Antes del registro en la app" : "Después del registro en la app"}</p>
        </div>
        <span class="funnel-group__count">${stages.reduce((total, stage) => total + stageCount(stage), 0)}</span>
      </div>
      <div class="stage-list">${stageRows}</div>
    </section>
  `;
}

export function renderHomePage(): string {
  const preRegistration = specialistStages.filter((stage) => stageGroup(stage) === "pre_registro");
  const postRegistration = specialistStages.filter((stage) => stageGroup(stage) === "post_registro");
  const followUps = demoFollowUps
    .map(
      (item) => `
        <a class="follow-up" href="#/especialistas/${encodeURIComponent(item.specialistId)}">
          <span class="follow-up__date">${escapeHtml(formatDemoDate(item.dueAt))}</span>
          <span class="follow-up__main">
            <strong>${escapeHtml(item.label)}</strong>
            <span>${escapeHtml(item.reason)}</span>
          </span>
          <span class="follow-up__arrow" aria-hidden="true">↗</span>
        </a>
      `,
    )
    .join("");

  return `
    <div class="page-content">
      <section class="welcome-row">
        <div>
          <p class="eyebrow">OPERACIÓN · MUESTRA</p>
          <h1>Inicio</h1>
          <p class="welcome-row__description">Un vistazo al embudo de especialistas y los próximos seguimientos.</p>
        </div>
        <div class="sample-total">
          <span class="sample-total__icon" aria-hidden="true">◇</span>
          <span><strong>${demoSpecialists.length}</strong><small>registros ficticios</small></span>
        </div>
      </section>

      <section class="surface funnel-surface" aria-labelledby="funnel-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">EMBUDO OPS-01</p>
            <h2 id="funnel-title">Especialistas por etapa</h2>
          </div>
          <span class="section-heading__note">Datos de muestra · sin metas</span>
        </div>
        <div class="funnel-grid">
          ${renderStageGroup("pre_registro", "Pre-registro", preRegistration)}
          <div class="funnel-divider" aria-hidden="true"><span></span></div>
          ${renderStageGroup("post_registro", "Post-registro", postRegistration)}
        </div>
        <p class="funnel-footnote">El contacto efectivo requiere conversación; un intento sin respuesta queda separado. “Activo” es un estado derivado según MET-01.</p>
      </section>

      <div class="home-grid">
        <section class="surface follow-ups-surface" aria-labelledby="followups-title">
          <div class="section-heading section-heading--compact">
            <div>
              <p class="eyebrow">AGENDA</p>
              <h2 id="followups-title">Próximos seguimientos</h2>
            </div>
            <a class="text-link" href="#/especialistas">Ver especialistas <span aria-hidden="true">→</span></a>
          </div>
          ${followUps ? `<div class="follow-ups">${followUps}</div>` : renderStatePanel("empty", "No hay seguimientos de muestra", "Cuando existan datos operativos, se mostrarán aquí.")}
        </section>

        <aside class="attention-card" aria-labelledby="attention-title">
          <div class="attention-card__icon" aria-hidden="true">✳</div>
          <p class="eyebrow">PARA REVISAR</p>
          <h2 id="attention-title">Vistas operativas pendientes</h2>
          <p>Los pedidos sin oferta y la conciliación necesitan contratos backend antes de mostrar registros o permitir intervención.</p>
          <div class="attention-card__ids"><span>TECH-15</span><span>TECH-28</span></div>
          <a class="text-link text-link--light" href="#/operaciones">Ver dependencias <span aria-hidden="true">→</span></a>
        </aside>
      </div>
    </div>
  `;
}
