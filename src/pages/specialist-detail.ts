import { stageGroup, stageLabels, type SpecialistRecord, type VerificationLevel } from "../domain/specialists.ts";
import { escapeHtml, formatDemoDate } from "../components/escape.ts";
import { renderStatePanel } from "../components/states.ts";

const verificationLabels: Record<VerificationLevel, string> = {
  sin_iniciar: "Sin iniciar",
  en_curso: "En curso",
  nivel_1: "Nivel 1 · muestra",
  nivel_2: "Nivel 2 · muestra",
};

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
  return "El estado activo se determina según MET-01 y no habilita una acción manual en esta vista.";
}

function renderMilestoneState(state: string): string {
  if (state === "complete") return '<span class="milestone-state milestone-state--complete">Completo · muestra</span>';
  if (state === "not_applicable") return '<span class="milestone-state milestone-state--muted">No aplica · muestra</span>';
  return '<span class="milestone-state milestone-state--pending">Pendiente · muestra</span>';
}

export function renderSpecialistDetail(record: SpecialistRecord | undefined): string {
  if (!record) {
    return `<div class="page-content">${renderStatePanel("empty", "No encontramos ese registro de muestra", "Volvé a la lista de especialistas.")}<a class="button button--secondary" href="#/especialistas">Volver al listado</a></div>`;
  }

  const groupLabel = stageGroup(record.stage) === "pre_registro" ? "Pre-registro" : "Post-registro";
  const milestones = record.verificationMilestones
    .map((item) => `<li><span>${escapeHtml(item.label)}</span>${renderMilestoneState(item.state)}</li>`)
    .join("");
  const timeline = record.timeline.length
    ? record.timeline
        .map((event) => {
          const kind = event.kind === "contact_attempt" ? "Intento de contacto" : event.kind === "effective_contact" ? "Contacto efectivo" : event.kind === "follow_up" ? "Seguimiento" : "Transición";
          return `
            <li class="timeline-item">
              <span class="timeline-item__dot timeline-item__dot--${event.kind}" aria-hidden="true"></span>
              <div class="timeline-item__body">
                <div class="timeline-item__top"><strong>${escapeHtml(kind)}</strong><time datetime="${escapeHtml(event.at)}">${escapeHtml(formatDemoDate(event.at))}</time></div>
                <p>${escapeHtml(event.summary)}</p>
                ${event.reason ? `<small>Motivo breve · ${escapeHtml(event.reason)}</small>` : ""}
                ${event.nextFollowUp ? `<small>Próximo seguimiento · ${escapeHtml(formatDemoDate(event.nextFollowUp))}</small>` : ""}
                <small>Actor · ${escapeHtml(event.actor)}</small>
              </div>
            </li>
          `;
        })
        .join("")
    : `<li class="timeline-empty">Sin eventos de muestra.</li>`;

  return `
    <div class="page-content">
      <a class="back-link" href="#/especialistas"><span aria-hidden="true">←</span> Volver a especialistas</a>
      <section class="profile-heading">
        <div class="profile-avatar" aria-hidden="true">◇</div>
        <div class="profile-heading__main"><p class="eyebrow">FICHA OPERATIVA · ${groupLabel.toUpperCase()}</p><h1>${escapeHtml(record.label)}</h1><p>${escapeHtml(record.id)} <span aria-hidden="true">·</span> ${escapeHtml(record.trade)} <span aria-hidden="true">·</span> ${escapeHtml(record.zone)}</p></div>
        <span class="stage-chip stage-chip--${record.stage}">${escapeHtml(stageLabels[record.stage])}</span>
      </section>

      <div class="profile-grid">
        <div class="profile-column">
          <section class="surface profile-card" aria-labelledby="pre-reg-title">
            <div class="section-heading section-heading--compact"><div><p class="eyebrow">ANTES DEL REGISTRO</p><h2 id="pre-reg-title">Compromiso</h2></div><span class="status-pill status-pill--neutral">OPS-01</span></div>
            <dl class="detail-list">
              <div><dt>Aviso de privacidad aceptado</dt><dd>${record.noticeAccepted ? "Sí · muestra" : "Sin dato de muestra"}</dd></div>
              <div><dt>Fecha de alta aceptada</dt><dd>${record.onboardingDateAccepted ? "Sí · muestra" : "Sin dato de muestra"}</dd></div>
              <div><dt>Grupo de etapa</dt><dd>${groupLabel}</dd></div>
            </dl>
          </section>

          <section class="surface profile-card" aria-labelledby="verification-title">
            <div class="section-heading section-heading--compact"><div><p class="eyebrow">ALTA · LEG-08</p><h2 id="verification-title">Hitos de verificación</h2></div><span class="status-pill status-pill--pending">Nivel: ${escapeHtml(verificationLabels[record.verificationLevel])}</span></div>
            <p class="profile-card__intro">La constancia del certificado se representa sin guardar el archivo ni el resultado.</p>
            <ul class="milestone-list">${milestones}</ul>
          </section>

          <section class="surface profile-card" aria-labelledby="registration-title">
            <div class="section-heading section-heading--compact"><div><p class="eyebrow">DESPUÉS DEL REGISTRO</p><h2 id="registration-title">Registro y habilitación</h2></div></div>
            <dl class="detail-list">
              <div><dt>Contrato y términos</dt><dd>${record.contractAcceptance.accepted ? `Aceptados · ${escapeHtml(record.contractAcceptance.version ?? "versión de muestra")}` : "Pendientes · muestra"}</dd></div>
              <div><dt>Cuenta de cobro</dt><dd>${record.payoutAccount === "linked_name_confirmed" ? "Vinculada · titular confirmado · muestra" : "No vinculada · muestra"}</dd></div>
              <div><dt>Habilitado para recibir pedidos</dt><dd>${record.enabled ? "Sí · muestra" : "No · muestra"}</dd></div>
            </dl>
            <p class="safe-value-note">No se muestra ningún número de cuenta, DNI, certificado ni credencial fiscal.</p>
          </section>
        </div>

        <aside class="profile-column profile-column--aside">
          <section class="next-step-card" aria-labelledby="next-step-title">
            <p class="eyebrow">PASO QUE FALTA</p>
            <h2 id="next-step-title">${escapeHtml(stageLabels[record.stage])}</h2>
            <p>${escapeHtml(nextStageNote(record))}</p>
            <div class="blocked-action"><button class="button button--disabled button--wide" type="button" disabled>Registrar transición</button><span>Bloqueado · TECH-06 · TECH-08 · LEG-08</span></div>
            ${record.nextFollowUp ? `<div class="next-step-followup"><strong>Seguimiento de muestra</strong><span>${escapeHtml(formatDemoDate(record.nextFollowUp))}</span></div>` : ""}
          </section>

          <section class="surface profile-card" aria-labelledby="timeline-title">
            <div class="section-heading section-heading--compact"><div><p class="eyebrow">AUDITORÍA</p><h2 id="timeline-title">Línea de tiempo</h2></div></div>
            <ol class="timeline">${timeline}</ol>
            <p class="timeline-note">Solo eventos sintéticos. El registro real debe ser auditable en backend y no admite borrado silencioso.</p>
          </section>
        </aside>
      </div>
    </div>
  `;
}
