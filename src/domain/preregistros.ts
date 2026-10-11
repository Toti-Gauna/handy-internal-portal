// Pre-registros de la landing, tal como los expone Handy-landing-page-be (docs/crm.md del backend).
// Los tipos de ficha y fila son los del contrato (src/contracts/landing-api.ts); acá viven las reglas
// de interfaz: etiquetas, estado de contacto, acciones permitidas por etapa, WhatsApp y el filtrado
// que solo usa la fuente de muestra (en producción filtra, ordena y pagina el servidor).

import {
  CONTACT_STATUSES_API,
  RUBROS,
  type EventoApi,
  type FichaEspecialistaApi,
  type FilaEspecialistaApi,
  type FilaUsuarioApi,
  type TipoEvento,
} from "../contracts/landing-api.ts";
import type { PageResult } from "./directories.ts";
import { paginate } from "./directories.ts";

export { RUBROS };

export type Rubro = (typeof RUBROS)[number];

export const rubroLabels: Record<Rubro, { nombre: string; icono: string }> = {
  electricidad: { nombre: "Electricidad", icono: "rayo" },
  plomeria: { nombre: "Plomería", icono: "canilla" },
  gas: { nombre: "Gas", icono: "llama" },
  cerrajeria: { nombre: "Cerrajería", icono: "llave" },
  albanileria: { nombre: "Albañilería", icono: "ladrillos" },
  aire_acondicionado: { nombre: "Aire acondicionado", icono: "aire" },
};

/** Etapas OPS-01 que se trabajan desde el pre-registro. Verificado en adelante vive en Especialistas. */
export type PreregistroStage = FilaEspecialistaApi["etapa"];

/** Estado de contacto derivado por el servidor: "con intentos" sigue siendo Identificado según OPS-01. */
export const CONTACT_STATUSES = CONTACT_STATUSES_API;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export const contactStatusLabels: Record<ContactStatus, string> = {
  sin_contactar: "Sin contactar",
  con_intentos: "Con intentos",
  contactado: "Contactado",
  comprometido: "Comprometido",
};

/** Fila de lista y de la cola del Inicio: sin la historia de eventos. */
export type PreregistroEspecialistaFila = FilaEspecialistaApi;
/** Ficha completa de un especialista, con la historia de eventos. */
export type PreregistroEspecialista = FichaEspecialistaApi;
export type PreregistroEvento = EventoApi;
/** Un usuario solo expone id y fechas (finalidad declarada: aviso de lanzamiento). */
export type PreregistroUsuario = FilaUsuarioApi;
export type Preregistro = PreregistroEspecialista | PreregistroUsuario;

export type ContactCounts = Record<ContactStatus | "any", number>;

export interface EspecialistasPage extends PageResult<PreregistroEspecialistaFila> {
  /** Conteo por estado con el resto de los filtros aplicados, para las pestañas. */
  porEstado: ContactCounts;
}

export interface PreregistroResumen {
  especialistas: number;
  usuarios: number;
  porEstado: ContactCounts;
  porRubro: Record<Rubro, number>;
  /** Primeros de la cola de contacto (máximo 5), ya ordenada por el servidor. */
  cola: PreregistroEspecialistaFila[];
}

export type SortOrder = "recientes" | "antiguos" | "seguimiento";

/** `search` es una búsqueda EXACTA (ID o WhatsApp completo); `zona` también es exacta (sin tildes ni mayúsculas). */
export interface EspecialistaPreSearch {
  search: string;
  rubro: Rubro | "any";
  zona: string;
  contacto: ContactStatus | "any";
  orden: SortOrder;
  page: number;
  pageSize: number;
}

/** `search` es exacta: ID, o email completo con el permiso de soporte. */
export interface UsuarioPreSearch {
  search: string;
  orden: Exclude<SortOrder, "seguimiento">;
  page: number;
  pageSize: number;
}

export function needsContact(contacto: ContactStatus): boolean {
  return contacto === "sin_contactar" || contacto === "con_intentos";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value.trim());
}

// ── Acciones válidas según la etapa (reglas del backend: src/domain/eventos.ts) ─────────────

/**
 * Intento y conversación solo en Identificado; compromiso solo en Contactado; un Comprometido no admite más eventos.
 * Por eso el backend no tiene un "seguimiento" para quien ya está Contactado: es un límite conocido (docs/crm.md).
 */
export function allowedEventTypes(etapa: PreregistroStage): TipoEvento[] {
  if (etapa === "identificado") return ["intento", "conversacion"];
  if (etapa === "contactado") return ["compromiso"];
  return [];
}

// ── WhatsApp ────────────────────────────────────────────────────────────

const E164 = /^\+[1-9][0-9]{7,14}$/;

/**
 * Enlace `https://wa.me/<número>` SIN texto prellenado: el mensaje nunca viaja con datos de la persona.
 * Solo se arma si el backend normalizó el número (E.164); si no, el operador lo revisa a mano.
 * La app no abre ni envía nada por su cuenta: es un enlace que toca el operador.
 */
export function whatsappUrl(record: Pick<PreregistroEspecialistaFila, "whatsapp" | "whatsappNormalizado">): string | null {
  const numero = record.whatsapp.trim();
  if (!record.whatsappNormalizado || !E164.test(numero)) return null;
  return `https://wa.me/${numero.slice(1)}`;
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

function firstName(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? nombre;
}

/** Texto para copiar y pegar a mano. No se prellena en el enlace de WhatsApp. */
export function contactMessage(record: Pick<PreregistroEspecialistaFila, "nombre" | "rubros" | "contacto">): string {
  const nombre = firstName(record.nombre);
  const rubros = joinList(record.rubros.map((rubro) => rubroLabels[rubro].nombre.toLocaleLowerCase("es")));
  if (record.contacto === "sin_contactar") {
    return `Hola ${nombre}, ¿cómo andás? Te escribimos de Handy porque te anotaste como especialista en ${rubros}. ¿Tenés unos minutos para que te contemos cómo sigue el alta?`;
  }
  if (record.contacto === "con_intentos") {
    return `Hola ${nombre}, te escribimos de nuevo desde Handy por tu pre-registro como especialista en ${rubros}. ¿Cuándo te queda cómodo que hablemos unos minutos?`;
  }
  if (record.contacto === "contactado") {
    return `Hola ${nombre}, gracias por la charla. Para seguir con tu alta en Handy, ¿qué día te queda bien?`;
  }
  return `Hola ${nombre}, te escribimos de Handy para recordarte la fecha de tu alta. Cualquier cosa, respondé por acá.`;
}

// ── Fuente de muestra: lo que en producción hace el servidor ──────────────────────────────

function digitsOf(value: string): string {
  return value.replace(/\D/g, "");
}

/** Búsqueda EXACTA (como el backend): por ID o por WhatsApp completo. Nunca por nombre ni parcial. */
function matchesExactEspecialista(record: PreregistroEspecialistaFila, query: string): boolean {
  const q = query.trim();
  if (q === "") return true;
  if (record.id.toLowerCase() === q.toLowerCase()) return true;
  const wanted = digitsOf(q);
  const own = digitsOf(record.whatsapp);
  return wanted.length >= 10 && own.length >= 10 && wanted.slice(-10) === own.slice(-10);
}

function sameZone(a: string, b: string): boolean {
  const key = (value: string): string => value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
  return key(a) === key(b);
}

function byDate<T extends { creadoEn: string }>(orden: SortOrder): (a: T, b: T) => number {
  return (a, b) => {
    const diff = Date.parse(a.creadoEn) - Date.parse(b.creadoEn);
    return orden === "antiguos" ? diff : -diff;
  };
}

function bySeguimiento(a: PreregistroEspecialistaFila, b: PreregistroEspecialistaFila): number {
  const aDue = a.proximoSeguimiento ? Date.parse(a.proximoSeguimiento) : Number.POSITIVE_INFINITY;
  const bDue = b.proximoSeguimiento ? Date.parse(b.proximoSeguimiento) : Number.POSITIVE_INFINITY;
  if (aDue !== bDue) return aDue - bDue;
  return Date.parse(a.creadoEn) - Date.parse(b.creadoEn);
}

export function filterEspecialistas(
  records: PreregistroEspecialistaFila[],
  filters: EspecialistaPreSearch,
): PreregistroEspecialistaFila[] {
  const sort = filters.orden === "seguimiento" ? bySeguimiento : byDate(filters.orden);
  return records
    .filter(
      (record) =>
        matchesExactEspecialista(record, filters.search) &&
        (filters.rubro === "any" || record.rubros.includes(filters.rubro)) &&
        (filters.zona.trim() === "" || sameZone(record.zona, filters.zona)) &&
        (filters.contacto === "any" || record.contacto === filters.contacto),
    )
    .sort(sort);
}

/** El email solo participa de la búsqueda exacta (soporte); nunca se devuelve en la vista. */
export function filterUsuarios<T extends PreregistroUsuario & { email?: string }>(records: T[], filters: UsuarioPreSearch): T[] {
  const q = filters.search.trim().toLowerCase();
  return records
    .filter((record) => q === "" || record.id.toLowerCase() === q || (record.email ?? "").toLowerCase() === q)
    .sort(byDate(filters.orden));
}

function countStatuses(records: PreregistroEspecialistaFila[]): ContactCounts {
  const counts: ContactCounts = { any: records.length, sin_contactar: 0, con_intentos: 0, contactado: 0, comprometido: 0 };
  for (const record of records) counts[record.contacto] += 1;
  return counts;
}

/** Conteo por estado sobre el resto de los filtros, para las pestañas de estado. */
export function countByContactStatus(records: PreregistroEspecialistaFila[], filters: EspecialistaPreSearch): ContactCounts {
  return countStatuses(filterEspecialistas(records, { ...filters, contacto: "any" }));
}

export function searchEspecialistas(records: PreregistroEspecialistaFila[], filters: EspecialistaPreSearch): EspecialistasPage {
  return {
    ...paginate(filterEspecialistas(records, filters), filters.page, filters.pageSize),
    porEstado: countByContactStatus(records, filters),
  };
}

export function searchUsuarios<T extends PreregistroUsuario & { email?: string }>(records: T[], filters: UsuarioPreSearch): PageResult<T> {
  return paginate(filterUsuarios(records, filters), filters.page, filters.pageSize);
}

/** Cola de trabajo: primero el seguimiento más próximo y después el pre-registro más antiguo sin contactar o con intentos. */
export function contactQueue(records: PreregistroEspecialistaFila[]): PreregistroEspecialistaFila[] {
  return records.filter((record) => needsContact(record.contacto)).sort(bySeguimiento);
}

export function buildResumen(especialistas: PreregistroEspecialistaFila[], usuarios: number): PreregistroResumen {
  const porRubro = Object.fromEntries(RUBROS.map((rubro) => [rubro, especialistas.filter((record) => record.rubros.includes(rubro)).length])) as Record<Rubro, number>;
  return {
    especialistas: especialistas.length,
    usuarios,
    porEstado: countStatuses(especialistas),
    porRubro,
    cola: contactQueue(especialistas).slice(0, 5),
  };
}
