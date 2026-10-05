import grupoUrl from "../img/handys-grupo.webp";
import { demoPreregistrosEspecialistas, demoPreregistrosUsuarios, demoSpecialists } from "../data/demo-data.ts";
import { contactQueue, contactStatus, RUBROS, rubroLabels, type PreregistroStage } from "../domain/preregistros.ts";
import { postRegistrationStages, stageLabels, type SpecialistStage } from "../domain/specialists.ts";
import { escapeHtml, formatDate, formatDateTime } from "../components/escape.ts";
import { brandTitle } from "../components/frame.ts";
import { icon } from "../components/icons.ts";
import { renderStatePanel } from "../components/states.ts";
import { avatar, contactPill, rubroIcon } from "./preregistro-parts.ts";

const preStages: PreregistroStage[] = ["identificado", "contactado", "comprometido"];

function statTile(value: number, label: string, variant: string, href: string): string {
  return `
    <a class="contador contador--${variant}" href="${href}">
      <strong class="contador__numero">${value}</strong>
      <span class="contador__label">${escapeHtml(label)}</span>
    </a>
  `;
}

function renderQueue(): string {
  const queue = contactQueue(demoPreregistrosEspecialistas).slice(0, 5);
  if (queue.length === 0) {
    return renderStatePanel("empty", "No hay nadie esperando contacto", "Cuando entren pre-registros nuevos de especialistas, aparecen acá.");
  }
  return `<ol class="cola">${queue
    .map((record) => {
      const due = record.proximoSeguimiento
        ? `<span class="cola__cuando cola__cuando--seguimiento">${icon("reloj")}Seguimiento ${escapeHtml(formatDateTime(record.proximoSeguimiento))}</span>`
        : `<span class="cola__cuando">${icon("calendario")}Se anotó el ${escapeHtml(formatDate(record.creadoEn))}</span>`;
      return `
        <li>
          <a class="cola__item" href="#/preregistros/${encodeURIComponent(record.id)}">
            ${avatar(record.nombre)}
            <span class="cola__principal">
              <strong>${escapeHtml(record.nombre)}</strong>
              <span class="cola__rubros">${record.rubros.map((rubro) => `<span title="${escapeHtml(rubroLabels[rubro].nombre)}">${rubroIcon(rubro)}</span>`).join("")}<span>${escapeHtml(record.zona)}</span></span>
              ${due}
            </span>
            ${contactPill(record)}
            <span class="cola__flecha">${icon("derecha")}</span>
          </a>
        </li>
      `;
    })
    .join("")}</ol>`;
}

function renderRubros(): string {
  return `<div class="mosaicos">${RUBROS.map((rubro) => {
    const count = demoPreregistrosEspecialistas.filter((record) => record.rubros.includes(rubro)).length;
    return `
      <button class="mosaico" type="button" data-action="filter-rubro" data-rubro="${rubro}">
        ${rubroIcon(rubro)}
        <span class="mosaico__nombre">${escapeHtml(rubroLabels[rubro].nombre)}</span>
        <strong class="mosaico__numero">${count}</strong>
      </button>
    `;
  }).join("")}</div>`;
}

function renderFunnel(): string {
  const preCount = (stage: PreregistroStage): number =>
    demoPreregistrosEspecialistas.filter((record) => record.etapa === stage && !record.especialistaId).length;
  const postCount = (stage: SpecialistStage): number => demoSpecialists.filter((record) => record.stage === stage).length;
  const step = (label: string, count: number, group: string, href: string): string => `
    <li><a class="embudo__paso embudo__paso--${group}" href="${href}"><strong>${count}</strong><span>${escapeHtml(label)}</span></a></li>`;

  return `
    <p class="embudo__grupo">Pre-registro</p>
    <ol class="embudo embudo--pre">
      ${preStages.map((stage) => step(stageLabels[stage], preCount(stage), "pre", "#/preregistros")).join("")}
    </ol>
    <p class="embudo__grupo">Post-registro</p>
    <ol class="embudo embudo--post">
      ${postRegistrationStages.map((stage) => step(stageLabels[stage], postCount(stage), "post", "#/especialistas")).join("")}
    </ol>
    <p class="nota">Pre-registro se trabaja en Pre-registros; desde Verificado, en Especialistas. “Activo” se deriva según MET-01.</p>
  `;
}

export function renderHomePage(): string {
  const especialistas = demoPreregistrosEspecialistas.length;
  const usuarios = demoPreregistrosUsuarios.length;
  const toContact = demoPreregistrosEspecialistas.filter((record) => {
    const status = contactStatus(record);
    return status === "sin_contactar" || status === "con_intentos";
  }).length;
  const committed = demoPreregistrosEspecialistas.filter((record) => record.etapa === "comprometido").length;

  return `
    <section class="hero">
      <div class="hero__texto">
        <p class="eyebrow">Operaciones · Eclipse</p>
        <h1 class="titulo titulo--hero">${brandTitle("Lo que entró por la ==landing==.")}</h1>
        <p class="encabezado__bajada">Pre-registros de especialistas y usuarios, y a quién hay que escribirle hoy.</p>
        <div class="contadores">
          ${statTile(toContact, "para contactar", "amarillo", "#/preregistros")}
          ${statTile(especialistas, "especialistas anotados", "noche", "#/preregistros")}
          ${statTile(usuarios, "usuarios anotados", "noche", "#/preregistros/usuarios")}
          ${statTile(committed, "comprometidos", "noche", "#/preregistros")}
        </div>
      </div>
      <img class="hero__handys" src="${grupoUrl}" alt="" width="520" height="300" />
    </section>

    <div class="inicio-grilla">
      <section class="tarjeta" aria-labelledby="cola-titulo">
        <div class="tarjeta__cabecera">
          <div><p class="eyebrow">Cola de trabajo</p><h2 id="cola-titulo" class="subtitulo">Para contactar</h2></div>
          <a class="link" href="#/preregistros">Ver todos ${icon("flecha")}</a>
        </div>
        ${renderQueue()}
      </section>

      <div class="inicio-columna">
        <section class="tarjeta" aria-labelledby="rubros-titulo">
          <div class="tarjeta__cabecera">
            <div><p class="eyebrow">Especialistas anotados</p><h2 id="rubros-titulo" class="subtitulo">Por rubro</h2></div>
          </div>
          ${renderRubros()}
          <p class="nota">Un especialista puede marcar más de un rubro. Tocá uno para filtrar.</p>
        </section>

        <section class="hoja" aria-labelledby="embudo-titulo">
          <span class="hoja__manija" aria-hidden="true"></span>
          <p class="eyebrow eyebrow--claro">Embudo OPS-01</p>
          <h2 id="embudo-titulo" class="subtitulo subtitulo--claro">Especialistas por etapa</h2>
          ${renderFunnel()}
        </section>
      </div>
    </div>
  `;
}
