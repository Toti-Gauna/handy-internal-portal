import type { BorradorEvento } from "../domain/evento.ts";
import {
  allowedEventTypes,
  contactMessage,
  contactStatusLabels,
  whatsappUrl,
  type Preregistro,
  type PreregistroEspecialista,
  type PreregistroEvento,
  type PreregistroStage,
  type PreregistroUsuario,
} from "../domain/preregistros.ts";
import type { TipoEvento } from "../contracts/landing-api.ts";
import { stageLabels } from "../domain/specialists.ts";
import { escapeHtml, formatDate, formatDateTime, formatDateYear, toLocalInput } from "../components/escape.ts";
import { icon } from "../components/icons.ts";
import { renderStatePanel } from "../components/states.ts";
import { avatar, contactPill, rubroChips } from "./preregistro-parts.ts";

/** Por qué el formulario puede o no usarse: la muestra es de solo lectura y el resto depende de `preregistros:contact`. */
export type ContactMode = "enabled" | "preview" | "sin_permiso";

export interface DetailContext {
  contactMode: ContactMode;
  /** Aviso de una sola vez (ej.: "Contacto registrado"). */
  flash?: string | undefined;
  /** Lo que el operador había escrito antes de recargar la ficha por un conflicto de versión. */
  draft?: BorradorEvento | undefined;
}

const eventLabels: Record<TipoEvento, { titulo: string; resumen: string }> = {
  intento: { titulo: "Intento de contacto", resumen: "Sin respuesta; sigue en Identificado." },
  conversacion: { titulo: "Conversación efectiva", resumen: "Pasó a Contactado." },
  compromiso: { titulo: "Compromiso de alta", resumen: "Pasó a Comprometido: aceptó una fecha de alta." },
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
  if (record.contacto === "sin_contactar") return "Escribirle y lograr una conversación efectiva. Un mensaje sin respuesta cuenta como intento y no mueve la etapa.";
  if (record.contacto === "con_intentos") return "Sigue en Identificado: hace falta una conversación efectiva. Probá en otro horario o con el mensaje de seguimiento.";
  if (record.contacto === "contactado") {
    return "Comprometido requiere acordar una fecha de alta con la persona y registrarla. Hoy no hay un evento de seguimiento para quien ya está Contactado: el próximo registro posible es el compromiso.";
  }
  return record.fechaAltaAceptada
    ? `Ya acordó una fecha de alta (${formatDateTime(record.fechaAltaAceptada)}). El alta sigue fuera de esta pantalla: Verificado se confirma con los hitos de LEG-08.`
    : "Coordinar el alta. Verificado se confirma con los hitos de LEG-08, fuera de esta pantalla.";
}

function timeline(events: PreregistroEvento[]): string {
  if (events.length === 0) return `<p class="texto-suave">Todavía no hay contactos registrados.</p>`;
  return `<ol class="linea">${[...events]
    .reverse()
    .map((event) => {
      const label = eventLabels[event.tipo];
      return `
      <li class="linea__item linea__item--${event.tipo}">
        <span class="linea__punto" aria-hidden="true"></span>
        <div>
          <p class="linea__titulo"><strong>${escapeHtml(label.titulo)}</strong><time datetime="${escapeHtml(event.fecha)}">${escapeHtml(formatDateTime(event.fecha))}</time></p>
          <p>${escapeHtml(label.resumen)}</p>
          ${event.motivo ? `<p class="texto-suave">Nota · ${escapeHtml(event.motivo)}</p>` : ""}
          ${event.fechaAltaAceptada ? `<p class="texto-suave">Alta acordada · ${escapeHtml(formatDateTime(event.fechaAltaAceptada))}</p>` : ""}
          ${event.proximoSeguimiento ? `<p class="texto-suave">Próximo seguimiento · ${escapeHtml(formatDateTime(event.proximoSeguimiento))}</p>` : ""}
          <p class="texto-suave">${escapeHtml(event.actor ?? "Operador/a que ya no figura en el equipo")}</p>
        </div>
      </li>`;
    })
    .join("")}</ol>`;
}

const eventChoices: Record<TipoEvento, { title: string; detail: string; icon: "reloj" | "chat" | "checkCirculo" }> = {
  intento: { title: "Sin respuesta", detail: "Queda como intento", icon: "reloj" },
  conversacion: { title: "Hablamos", detail: "Pasa a Contactado", icon: "chat" },
  compromiso: { title: "Se comprometió", detail: "Aceptó fecha de alta", icon: "checkCirculo" },
};

function fieldError(field: string): string {
  return `<small class="campo__error" data-error-for="${field}" role="alert"></small>`;
}

function contactForm(record: PreregistroEspecialista, context: DetailContext): string {
  const allowed = allowedEventTypes(record.etapa);
  const enabled = context.contactMode === "enabled";
  const draft = context.draft;
  const pill = enabled
    ? ""
    : `<span class="pastilla pastilla--bloqueada">${icon("candado")}${context.contactMode === "preview" ? "Muestra" : "Sin permiso"}</span>`;

  let body: string;
  if (allowed.length === 0) {
    body = `<p class="texto-suave">Ya está Comprometido: el sistema no admite más contactos sobre esta ficha.</p>`;
  } else {
    const hasAlta = allowed.includes("compromiso");
    body = `
      <form class="registro-contacto" id="registro-contacto" novalidate data-preregistro="${escapeHtml(record.id)}" data-version="${record.version}" data-etapa="${record.etapa}" data-vence="${escapeHtml(record.venceEn)}">
        <fieldset ${enabled ? "" : "disabled"}>
          <legend class="sr-only">Qué pasó</legend>
          <div class="opciones opciones--${allowed.length}">
            ${allowed
              .map((tipo) => {
                const choice = eventChoices[tipo];
                return `<label class="opcion">
              <input type="radio" name="tipo-contacto" value="${tipo}" required ${draft?.tipo === tipo || allowed.length === 1 ? "checked" : ""} />
              <span class="opcion__caja">${icon(choice.icon)}<span><strong>${escapeHtml(choice.title)}</strong><small>${escapeHtml(choice.detail)}</small></span></span>
            </label>`;
              })
              .join("")}
          </div>
          ${fieldError("tipo")}
          <div class="registro-contacto__campos">
            <label class="campo campo--texto"><span class="campo__label">Nota breve</span><input type="text" name="motivo" required maxlength="140" autocomplete="off" placeholder="Ej.: pidió que le escribamos a la tarde" value="${escapeHtml(draft?.motivo ?? "")}" />${fieldError("motivo")}</label>
            ${
              hasAlta
                ? `<label class="campo campo--texto"><span class="campo__label">Fecha de alta acordada</span><input type="datetime-local" name="fecha-alta" required value="${escapeHtml(toLocalInput(draft?.fechaAltaAceptada))}" />${fieldError("fechaAltaAceptada")}</label>`
                : ""
            }
            <label class="campo campo--texto"><span class="campo__label">Próximo seguimiento (opcional)</span><input type="datetime-local" name="proximo-seguimiento" value="${escapeHtml(toLocalInput(draft?.proximoSeguimiento))}" />${fieldError("proximoSeguimiento")}</label>
          </div>
          <button class="boton boton--azul" type="submit">Guardar contacto</button>
          <p class="nota" data-contacto-estado role="status" aria-live="polite"></p>
        </fieldset>
      </form>
      <p class="nota" id="registro-contacto-nota">${escapeHtml(contactNote(context.contactMode, hasAlta))}</p>`;
  }

  return `
    <section class="tarjeta" aria-labelledby="registrar-titulo">
      <div class="tarjeta__cabecera">
        <div><p class="eyebrow">Después de escribirle</p><h2 id="registrar-titulo" class="subtitulo">Registrar contacto</h2></div>
        ${pill}
      </div>
      ${body}
    </section>
  `;
}

function contactNote(mode: ContactMode, hasAlta: boolean): string {
  if (mode === "preview") return "La muestra no registra contactos.";
  if (mode === "sin_permiso") return "Tu cuenta puede ver pre-registros, pero no registrar contactos (falta el permiso preregistros:contact).";
  const alta = hasAlta
    ? " La fecha de alta acordada es un dato aparte del seguimiento y tiene que ser desde hoy hasta 90 días, antes del vencimiento."
    : "";
  return `La nota es neutra: sin teléfonos, emails, enlaces, documentos ni cuentas. Las fechas se toman en tu hora local. El servidor guarda quién y cuándo.${alta}`;
}

function whatsappCard(record: PreregistroEspecialista, context: DetailContext): string {
  if (context.contactMode === "sin_permiso") {
    return `
      <section class="tarjeta" aria-labelledby="whatsapp-titulo">
        <p class="eyebrow">WhatsApp</p>
        <h2 id="whatsapp-titulo" class="subtitulo">Contacto no habilitado</h2>
        <p class="texto-suave">Tu cuenta no tiene el permiso preregistros:contact: no puede abrir WhatsApp ni registrar contactos.</p>
      </section>`;
  }
  const message = contactMessage(record);
  const url = whatsappUrl(record);
  const canOpen = context.contactMode === "enabled" && url !== null;
  // Solo un enlace que toca el operador. Sin texto prellenado: el mensaje se copia y se pega a mano.
  const openButton = canOpen
    ? `<a class="boton boton--whatsapp" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${icon("whatsapp")}Abrir WhatsApp</a>`
    : `<button class="boton boton--whatsapp" type="button" disabled aria-describedby="whatsapp-nota">${icon("whatsapp")}Abrir WhatsApp</button>`;
  const note = !record.whatsappNormalizado
    ? "Revisá el número: no se pudo normalizar con certeza, así que no armamos el enlace. Verificalo con la persona antes de escribirle."
    : context.contactMode === "preview"
      ? "En la muestra los números son ficticios: el botón queda desactivado. Podés copiar el mensaje."
      : "Abre un chat vacío en WhatsApp: el mensaje no viaja en el enlace. Copialo, pegalo y revisalo antes de enviar. Después registrá qué pasó.";

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

function flash(context: DetailContext): string {
  return context.flash ? `<p class="aviso aviso--info" role="status">${escapeHtml(context.flash)}</p>` : "";
}

function renderEspecialista(record: PreregistroEspecialista, context: DetailContext): string {
  const numberWarning = record.whatsappNormalizado
    ? ""
    : `<span class="aviso aviso--alerta aviso--chico" role="note">${icon("info")}Revisar el número</span>`;
  return `
    ${backLink("#/preregistros")}
    ${flash(context)}
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
            ${dato("WhatsApp", `<span class="dato-contacto">${icon("whatsapp")}${escapeHtml(record.whatsapp)}</span> ${numberWarning}`)}
            ${dato("Email", record.email ? `<span class="dato-contacto">${icon("email")}${escapeHtml(record.email)}</span>` : '<span class="texto-suave">No dejó email</span>')}
            ${dato("Rubros", rubroChips(record.rubros))}
            ${dato("Zona donde trabaja", escapeHtml(record.zona))}
            ${dato("Privacidad", `<span class="dato-contacto">${icon("escudo")}Aceptó el aviso al anotarse</span>`)}
            ${dato("Se elimina el", `<span class="texto-suave">${escapeHtml(formatDateYear(record.venceEn))}</span>`)}
          </dl>
          <p class="nota">Solo se muestran los campos del formulario. El WhatsApp y el email se usan para coordinar el alta, como dice la política de privacidad de la landing. Alguien pudo anotar un número ajeno: confirmá con la persona al contactarla.</p>
        </section>
        ${contactForm(record, context)}
      </div>

      <aside class="ficha-columna">
        ${whatsappCard(record, context)}
        <section class="tarjeta tarjeta--paso" aria-labelledby="paso-titulo">
          <p class="eyebrow">Paso que falta · ${escapeHtml(contactStatusLabels[record.contacto])}</p>
          <h2 id="paso-titulo" class="subtitulo">${escapeHtml(stageLabels[record.etapa])}</h2>
          <p>${escapeHtml(nextStep(record))}</p>
          ${record.fechaAltaAceptada ? `<p class="seguimiento">${icon("calendario")}Alta acordada: <strong>${escapeHtml(formatDateTime(record.fechaAltaAceptada))}</strong></p>` : ""}
          ${record.proximoSeguimiento ? `<p class="seguimiento">${icon("reloj")}Seguimiento: <strong>${escapeHtml(formatDateTime(record.proximoSeguimiento))}</strong></p>` : ""}
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
      ${avatar("Usuario", "avatar--grande avatar--claro")}
      <div class="ficha-cabecera__texto">
        <p class="eyebrow">Pre-registro · Usuario</p>
        <h1 class="titulo titulo--ficha">Usuario anotado</h1>
        <p class="texto-suave">${escapeHtml(record.id)} · Se anotó el ${escapeHtml(formatDate(record.creadoEn))}</p>
      </div>
    </section>
    <div class="ficha-grilla">
      <section class="tarjeta tarjeta--franja" aria-labelledby="datos-titulo">
        <h2 id="datos-titulo" class="tarjeta__franja">Lo que se guarda</h2>
        <dl class="datos">
          ${dato("Aviso de lanzamiento", "Por email (no se muestra)")}
          ${dato("Privacidad", `<span class="dato-contacto">${icon("escudo")}Aceptó el aviso al anotarse</span>`)}
          ${dato("Se elimina el", `<span class="texto-suave">${escapeHtml(formatDateYear(record.venceEn))}</span>`)}
        </dl>
      </section>
      <section class="tarjeta tarjeta--paso" aria-labelledby="uso-titulo">
        <p class="eyebrow">Uso permitido</p>
        <h2 id="uso-titulo" class="subtitulo">Solo aviso de lanzamiento</h2>
        <p>Según la política de privacidad de la landing, los datos de usuarios se usan para avisar cuando Handy salga en tiendas. Por eso la ficha no tiene nombre, barrio, necesidad, email ni WhatsApp, y no hay acciones de contacto.</p>
        <p class="texto-suave">Si pide la baja por email, se lo busca con el permiso de soporte por su email exacto. El borrado sigue el flujo de LEG-36.</p>
      </section>
    </div>
  `;
}

export function renderPreregistroDetail(record: Preregistro | undefined, context: DetailContext): string {
  if (!record) {
    return `${backLink("#/preregistros")}${renderStatePanel("empty", "No encontramos ese pre-registro", "Puede que el enlace esté mal o que el registro ya haya vencido. Volvé a la lista.")}`;
  }
  return record.tipo === "especialista" ? renderEspecialista(record, context) : renderUsuario(record);
}
