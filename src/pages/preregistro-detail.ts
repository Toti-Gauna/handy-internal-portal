import {
  contactMessage,
  contactStatus,
  cuitLabels,
  whatsappUrl,
  type Preregistro,
  type PreregistroEspecialista,
  type PreregistroStage,
  type PreregistroUsuario,
} from "../domain/preregistros.ts";
import { stageLabels, type OperationalEvent } from "../domain/specialists.ts";
import { escapeHtml, formatDate, formatDateTime } from "../components/escape.ts";
import { icon } from "../components/icons.ts";
import { renderStatePanel } from "../components/states.ts";
import { avatar, contactPill, cuitPill, rubroChips } from "./preregistro-parts.ts";

const eventLabels: Record<OperationalEvent["kind"], string> = {
  contact_attempt: "Intento de contacto",
  effective_contact: "Conversación efectiva",
  transition: "Cambio de etapa",
  follow_up: "Seguimiento",
};

const stages: PreregistroStage[] = ["identificado", "contactado", "comprometido"];

function backLink(href: string): string {
  return `<a class="volver" href="${href}">${icon("atras")} Volver a pre-registros</a>`;
}

function stepper(current: PreregistroStage): string {
  const index = stages.indexOf(current);
  return `
    <ol class="pasos" aria-label="Etapa OPS-01">
      ${stages
        .map((stage, i) => {
          const state = i < index ? "hecho" : i === index ? "actual" : "pendiente";
          return `<li class="pasos__item pasos__item--${state}" ${i === index ? 'aria-current="step"' : ""}>
            <span class="pasos__marca">${i < index ? icon("check") : i + 1}</span>${escapeHtml(stageLabels[stage])}
          </li>`;
        })
        .join("")}
      <li class="pasos__item pasos__item--siguiente"><span class="pasos__marca">${icon("flecha")}</span>Verificado</li>
    </ol>
  `;
}

function nextStep(record: PreregistroEspecialista): string {
  const status = contactStatus(record);
  if (status === "sin_contactar") return "Escribirle y lograr una conversación efectiva. Un mensaje sin respuesta cuenta como intento y no mueve la etapa.";
  if (status === "con_intentos") return "Sigue en Identificado: hace falta una conversación efectiva. Probá en otro horario o con el mensaje de seguimiento.";
  if (status === "contactado") return "Comprometido requiere que acepte el aviso de privacidad y una fecha de alta.";
  if (record.especialistaId) return "Ya tiene ficha de especialista: el alta sigue desde Especialistas.";
  return "Coordinar el alta. Verificado se confirma con los hitos de LEG-08, fuera de esta pantalla.";
}

function timeline(events: OperationalEvent[]): string {
  if (events.length === 0) return `<p class="texto-suave">Todavía no hay contactos registrados.</p>`;
  return `<ol class="linea">${[...events]
    .reverse()
    .map(
      (event) => `
      <li class="linea__item linea__item--${event.kind}">
        <span class="linea__punto" aria-hidden="true"></span>
        <div>
          <p class="linea__titulo"><strong>${escapeHtml(eventLabels[event.kind])}</strong><time datetime="${escapeHtml(event.at)}">${escapeHtml(formatDateTime(event.at))}</time></p>
          <p>${escapeHtml(event.summary)}</p>
          ${event.reason ? `<p class="texto-suave">Motivo · ${escapeHtml(event.reason)}</p>` : ""}
          ${event.nextFollowUp ? `<p class="texto-suave">Próximo seguimiento · ${escapeHtml(formatDateTime(event.nextFollowUp))}</p>` : ""}
          <p class="texto-suave">${escapeHtml(event.actor)}</p>
        </div>
      </li>`,
    )
    .join("")}</ol>`;
}

function contactForm(id: string, actionsEnabled: boolean): string {
  const choice = (value: string, title: string, detail: string, iconName: "reloj" | "chat" | "checkCirculo"): string => `
    <label class="opcion">
      <input type="radio" name="tipo-contacto" value="${value}" required />
      <span class="opcion__caja">${icon(iconName)}<span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(detail)}</small></span></span>
    </label>`;
  return `
    <section class="tarjeta" aria-labelledby="registrar-titulo">
      <div class="tarjeta__cabecera">
        <div><p class="eyebrow">Después de escribirle</p><h2 id="registrar-titulo" class="subtitulo">Registrar contacto</h2></div>
        ${actionsEnabled ? "" : `<span class="pastilla pastilla--bloqueada">${icon("candado")}Bloqueado</span>`}
      </div>
      <form class="registro-contacto" id="registro-contacto" data-preregistro="${escapeHtml(id)}" aria-describedby="registro-contacto-nota">
        <fieldset ${actionsEnabled ? "" : "disabled"}>
          <legend class="sr-only">Qué pasó</legend>
          <div class="opciones">
            ${choice("intento", "Sin respuesta", "Queda como intento", "reloj")}
            ${choice("conversacion", "Hablamos", "Pasa a Contactado", "chat")}
            ${choice("compromiso", "Se comprometió", "Aceptó fecha de alta", "checkCirculo")}
          </div>
          <div class="registro-contacto__campos">
            <label class="campo campo--texto"><span class="campo__label">Motivo breve</span><input type="text" name="motivo" required maxlength="140" placeholder="Ej.: pidió que le escribamos a la tarde" /></label>
            <label class="campo campo--texto"><span class="campo__label">Próximo seguimiento</span><input type="datetime-local" name="proximo-seguimiento" /></label>
          </div>
          <button class="boton boton--azul" type="submit">Guardar contacto</button>
          <p class="nota" data-contacto-estado role="status" aria-live="polite"></p>
        </fieldset>
      </form>
      <p class="nota" id="registro-contacto-nota">Guardar necesita el endpoint de eventos con actor, fecha, motivo y auditoría en servidor (propuesta en docs). Pendiente: TECH-06 · TECH-08.</p>
    </section>
  `;
}

function whatsappCard(record: PreregistroEspecialista, previewMode: boolean): string {
  const message = contactMessage(record);
  const url = whatsappUrl(record.whatsapp, message);
  const canOpen = !previewMode && url !== null;
  const openButton = canOpen
    ? `<a class="boton boton--whatsapp" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${icon("whatsapp")}Abrir WhatsApp</a>`
    : `<button class="boton boton--whatsapp" type="button" disabled aria-describedby="whatsapp-nota">${icon("whatsapp")}Abrir WhatsApp</button>`;
  const note = url === null
    ? "El número no tiene un formato válido; revisalo antes de escribir."
    : previewMode
      ? "En la muestra los números son ficticios: el botón queda desactivado. Podés copiar el mensaje."
      : "Se abre WhatsApp con el mensaje listo; revisalo antes de enviar.";

  return `
    <section class="hoja" aria-labelledby="whatsapp-titulo">
      <span class="hoja__manija" aria-hidden="true"></span>
      <p class="eyebrow eyebrow--claro">Mensaje sugerido</p>
      <h2 id="whatsapp-titulo" class="subtitulo subtitulo--claro">Escribile por WhatsApp</h2>
      <div class="burbuja" id="mensaje-whatsapp">${escapeHtml(message)}</div>
      <div class="hoja__acciones">
        ${openButton}
        <button class="boton boton--amarillo" type="button" data-action="copy-message" data-target="mensaje-whatsapp">${icon("copiar")}<span>Copiar mensaje</span></button>
      </div>
      <p class="nota nota--clara" id="whatsapp-nota">${escapeHtml(note)}</p>
    </section>
  `;
}

function dato(label: string, value: string): string {
  return `<div class="datos__item"><dt>${escapeHtml(label)}</dt><dd>${value}</dd></div>`;
}

function renderEspecialista(record: PreregistroEspecialista, previewMode: boolean, actionsEnabled: boolean): string {
  return `
    ${backLink("#/preregistros")}
    <section class="ficha-cabecera">
      ${avatar(record.nombre, "avatar--grande")}
      <div class="ficha-cabecera__texto">
        <p class="eyebrow">Pre-registro · Especialista</p>
        <h1 class="titulo titulo--ficha">${escapeHtml(record.nombre)}</h1>
        <p class="texto-suave">${escapeHtml(record.id)} · Se anotó el ${escapeHtml(formatDateTime(record.creadoEn))}</p>
      </div>
      <div class="ficha-cabecera__estado">${contactPill(record)}</div>
      ${stepper(record.etapa)}
    </section>

    <div class="ficha-grilla">
      <div class="ficha-columna">
        <section class="tarjeta tarjeta--franja" aria-labelledby="datos-titulo">
          <h2 id="datos-titulo" class="tarjeta__franja">Lo que dejó en la landing</h2>
          <dl class="datos">
            ${dato("WhatsApp", `<span class="dato-contacto">${icon("whatsapp")}${escapeHtml(record.whatsapp)}</span>`)}
            ${dato("Email", `<span class="dato-contacto">${icon("email")}${escapeHtml(record.email)}</span>`)}
            ${dato("Rubros", rubroChips(record.rubros))}
            ${dato("Zona donde trabaja", escapeHtml(record.zona))}
            ${dato("CUIT", `${cuitPill(record.cuit)} <span class="sr-only">${escapeHtml(cuitLabels[record.cuit])}</span>`)}
            ${dato("Privacidad", `<span class="dato-contacto">${icon("escudo")}Aceptó el aviso al anotarse</span>`)}
          </dl>
          <p class="nota">Solo se muestran los campos del formulario. El WhatsApp y el email se usan para coordinar el alta, como dice la política de privacidad de la landing.</p>
        </section>
        ${contactForm(record.id, actionsEnabled)}
      </div>

      <aside class="ficha-columna">
        ${whatsappCard(record, previewMode)}
        <section class="tarjeta tarjeta--paso" aria-labelledby="paso-titulo">
          <p class="eyebrow">Paso que falta</p>
          <h2 id="paso-titulo" class="subtitulo">${escapeHtml(stageLabels[record.etapa])}</h2>
          <p>${escapeHtml(nextStep(record))}</p>
          ${record.proximoSeguimiento ? `<p class="seguimiento">${icon("reloj")}Seguimiento: <strong>${escapeHtml(formatDateTime(record.proximoSeguimiento))}</strong></p>` : ""}
          ${record.especialistaId ? `<a class="boton boton--contorno boton--chico" href="#/especialistas/${encodeURIComponent(record.especialistaId)}">Ver ficha de especialista ${icon("flecha")}</a>` : ""}
        </section>
        <section class="tarjeta" aria-labelledby="linea-titulo">
          <p class="eyebrow">Auditoría</p>
          <h2 id="linea-titulo" class="subtitulo">Contactos</h2>
          ${timeline(record.eventos)}
        </section>
      </aside>
    </div>
  `;
}

function renderUsuario(record: PreregistroUsuario): string {
  return `
    ${backLink("#/preregistros/usuarios")}
    <section class="ficha-cabecera">
      ${avatar(record.nombre, "avatar--grande avatar--claro")}
      <div class="ficha-cabecera__texto">
        <p class="eyebrow">Pre-registro · Usuario</p>
        <h1 class="titulo titulo--ficha">${escapeHtml(record.nombre)}</h1>
        <p class="texto-suave">${escapeHtml(record.id)} · Se anotó el ${escapeHtml(formatDate(record.creadoEn))}</p>
      </div>
    </section>
    <div class="ficha-grilla">
      <section class="tarjeta tarjeta--franja" aria-labelledby="datos-titulo">
        <h2 id="datos-titulo" class="tarjeta__franja">Lo que dejó en la landing</h2>
        <dl class="datos">
          ${dato("Barrio", escapeHtml(record.barrio))}
          ${dato("Qué necesitaría arreglar", record.necesidad ? `“${escapeHtml(record.necesidad)}”` : '<span class="texto-suave">No lo completó</span>')}
          ${dato("Aviso de lanzamiento", record.dejoWhatsapp ? "Por email · también dejó WhatsApp" : "Por email")}
          ${dato("Privacidad", `<span class="dato-contacto">${icon("escudo")}Aceptó el aviso al anotarse</span>`)}
        </dl>
      </section>
      <section class="tarjeta tarjeta--paso" aria-labelledby="uso-titulo">
        <p class="eyebrow">Uso permitido</p>
        <h2 id="uso-titulo" class="subtitulo">Solo aviso de lanzamiento</h2>
        <p>Según la política de privacidad de la landing, los datos de usuarios se usan para avisar cuando Handy salga en tiendas. Por eso el email y el WhatsApp quedan ocultos y no hay acciones de contacto.</p>
        <p class="texto-suave">Si pide la baja por email, se busca por ese email en la lista. El borrado sigue el flujo de LEG-36.</p>
      </section>
    </div>
  `;
}

export function renderPreregistroDetail(record: Preregistro | undefined, previewMode: boolean, actionsEnabled: boolean): string {
  if (!record) {
    return `${backLink("#/preregistros")}${renderStatePanel("empty", "No encontramos ese pre-registro", "Puede que el enlace esté mal. Volvé a la lista.")}`;
  }
  return record.tipo === "especialista" ? renderEspecialista(record, previewMode, actionsEnabled) : renderUsuario(record);
}
