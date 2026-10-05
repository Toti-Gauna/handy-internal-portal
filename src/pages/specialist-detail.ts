import { stageLabels, type SpecialistRecord } from "../domain/specialists.ts";
import { escapeHtml, formatDateTime } from "../components/escape.ts";
import { icon } from "../components/icons.ts";
import { renderStatePanel } from "../components/states.ts";
import { avatar } from "./preregistro-parts.ts";
import { verificationLabels } from "./specialists-list.ts";

function nextStageNote(record: SpecialistRecord): string {
  if (record.stage === "verificado") return "Registrado requiere cuenta, aceptación de contrato y términos, y cuenta de cobro a nombre del especialista.";
  if (record.stage === "registrado") return "Habilitado requiere verificación y registro completos; la transición debe validarse en servidor.";
  if (record.stage === "habilitado") return "Activo se deriva de MET-01; no es una etiqueta manual.";
  if (record.stage === "activo") return "El estado activo se determina según MET-01 y no habilita una acción manual.";
  return "Esta etapa se trabaja desde Pre-registros.";
}

function milestoneState(state: string): string {
  if (state === "complete") return `<span class="pastilla pastilla--si">${icon("check")}Completo</span>`;
  if (state === "not_applicable") return '<span class="pastilla pastilla--neutra">No aplica</span>';
  return '<span class="pastilla pastilla--con_intentos">Pendiente</span>';
}

const eventLabels: Record<string, string> = {
  contact_attempt: "Intento de contacto",
  effective_contact: "Conversación efectiva",
  transition: "Cambio de etapa",
  follow_up: "Seguimiento",
};

function dato(label: string, value: string): string {
  return `<div class="datos__item"><dt>${escapeHtml(label)}</dt><dd>${value}</dd></div>`;
}

export function renderSpecialistDetail(record: SpecialistRecord | undefined): string {
  const back = `<a class="volver" href="#/especialistas">${icon("atras")} Volver a especialistas</a>`;
  if (!record) {
    return `${back}${renderStatePanel("empty", "No encontramos ese especialista", "Volvé al listado.")}`;
  }

  const milestones = record.verificationMilestones
    .map((item) => `<li><span>${escapeHtml(item.label)}</span>${milestoneState(item.state)}</li>`)
    .join("");
  const timeline = record.timeline.length
    ? `<ol class="linea">${[...record.timeline]
        .reverse()
        .map(
          (event) => `
          <li class="linea__item linea__item--${event.kind}">
            <span class="linea__punto" aria-hidden="true"></span>
            <div>
              <p class="linea__titulo"><strong>${escapeHtml(eventLabels[event.kind] ?? event.kind)}</strong><time datetime="${escapeHtml(event.at)}">${escapeHtml(formatDateTime(event.at))}</time></p>
              <p>${escapeHtml(event.summary)}</p>
              ${event.reason ? `<p class="texto-suave">Motivo · ${escapeHtml(event.reason)}</p>` : ""}
              <p class="texto-suave">${escapeHtml(event.actor)}</p>
            </div>
          </li>`,
        )
        .join("")}</ol>`
    : `<p class="texto-suave">Sin eventos registrados.</p>`;

  return `
    ${back}
    <section class="ficha-cabecera">
      ${avatar(record.label, "avatar--grande")}
      <div class="ficha-cabecera__texto">
        <p class="eyebrow">Especialista · post-registro</p>
        <h1 class="titulo titulo--ficha">${escapeHtml(record.label)}</h1>
        <p class="texto-suave">${escapeHtml(record.id)} · ${escapeHtml(record.trade)} · ${escapeHtml(record.zone)}</p>
      </div>
      <div class="ficha-cabecera__estado"><span class="pastilla pastilla--etapa-${record.stage}">${escapeHtml(stageLabels[record.stage])}</span></div>
    </section>

    <div class="ficha-grilla">
      <div class="ficha-columna">
        <section class="tarjeta tarjeta--franja" aria-labelledby="verificacion-titulo">
          <h2 id="verificacion-titulo" class="tarjeta__franja">Hitos de verificación · LEG-08 · ${escapeHtml(verificationLabels[record.verificationLevel])}</h2>
          <ul class="hitos">${milestones}</ul>
          <p class="nota">El certificado se exhibe en vivo: no se guarda el archivo ni el resultado.</p>
        </section>
        <section class="tarjeta tarjeta--franja" aria-labelledby="registro-titulo">
          <h2 id="registro-titulo" class="tarjeta__franja">Registro y habilitación</h2>
          <dl class="datos">
            ${dato("Contrato y términos", record.contractAcceptance.accepted ? `Aceptados · ${escapeHtml(record.contractAcceptance.version ?? "")}` : "Pendientes")}
            ${dato("Cuenta de cobro", record.payoutAccount === "linked_name_confirmed" ? "Vinculada · titular confirmado" : "No vinculada")}
            ${dato("Recibe pedidos", record.enabled ? "Sí" : "No")}
            ${record.preregistroId ? dato("Origen", `<a class="link" href="#/preregistros/${encodeURIComponent(record.preregistroId)}">Pre-registro de la landing ${icon("flecha")}</a>`) : ""}
          </dl>
          <p class="nota">No se muestra número de cuenta, DNI, certificado ni credencial fiscal.</p>
        </section>
      </div>

      <aside class="ficha-columna">
        <section class="tarjeta tarjeta--paso" aria-labelledby="paso-titulo">
          <p class="eyebrow">Paso que falta</p>
          <h2 id="paso-titulo" class="subtitulo">${escapeHtml(stageLabels[record.stage])}</h2>
          <p>${escapeHtml(nextStageNote(record))}</p>
          ${record.nextFollowUp ? `<p class="seguimiento">${icon("reloj")}Seguimiento: <strong>${escapeHtml(formatDateTime(record.nextFollowUp))}</strong></p>` : ""}
          <button class="boton boton--azul" type="button" disabled>Registrar transición</button>
          <p class="nota">Bloqueado · TECH-06 · TECH-08 · LEG-08</p>
        </section>
        <section class="tarjeta" aria-labelledby="linea-titulo">
          <p class="eyebrow">Auditoría</p>
          <h2 id="linea-titulo" class="subtitulo">Línea de tiempo</h2>
          ${timeline}
        </section>
      </aside>
    </div>
  `;
}
