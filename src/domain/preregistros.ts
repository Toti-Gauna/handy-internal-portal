// Pre-registros de la landing (Handy-landing-page-fe/src/schema/preregistro.ts).
// Los campos del formulario se copian tal cual; `id`, `creadoEn` y el seguimiento de
// contacto son la propuesta de lectura documentada en docs/modules/preregistros.md.
// Hasta que TECH-03/TECH-06/TECH-08 la aprueben, esto es un tipo interno del frontend.

import type { OperationalEvent } from "./specialists.ts";
import type { PageResult } from "./directories.ts";
import { normalize, paginate } from "./directories.ts";

export const RUBROS = ["electricidad", "plomeria", "gas", "cerrajeria", "albanileria", "aire_acondicionado"] as const;
export const OPCIONES_CUIT = ["si", "no", "en_tramite"] as const;

export type Rubro = (typeof RUBROS)[number];
export type OpcionCuit = (typeof OPCIONES_CUIT)[number];

export const rubroLabels: Record<Rubro, { nombre: string; icono: string }> = {
  electricidad: { nombre: "Electricidad", icono: "rayo" },
  plomeria: { nombre: "Plomería", icono: "canilla" },
  gas: { nombre: "Gas", icono: "llama" },
  cerrajeria: { nombre: "Cerrajería", icono: "llave" },
  albanileria: { nombre: "Albañilería", icono: "ladrillos" },
  aire_acondicionado: { nombre: "Aire acondicionado", icono: "aire" },
};

export const cuitLabels: Record<OpcionCuit, string> = {
  si: "Tiene CUIT",
  no: "Sin CUIT",
  en_tramite: "CUIT en trámite",
};

/** Etapas OPS-01 que se trabajan desde el pre-registro. Verificado en adelante vive en Especialistas. */
export type PreregistroStage = "identificado" | "contactado" | "comprometido";

/** Estado de contacto derivado: "con intentos" sigue siendo Identificado según OPS-01. */
export const CONTACT_STATUSES = ["sin_contactar", "con_intentos", "contactado", "comprometido"] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export const contactStatusLabels: Record<ContactStatus, string> = {
  sin_contactar: "Sin contactar",
  con_intentos: "Con intentos",
  contactado: "Contactado",
  comprometido: "Comprometido",
};

interface PreregistroBase {
  id: string;
  nombre: string;
  email: string;
  /** Fecha en que se anotó (la guarda el backend al recibir el POST). */
  creadoEn: string;
  /** Checkbox obligatorio de la landing: siempre true en un registro válido. */
  acepta: true;
}

export interface PreregistroEspecialista extends PreregistroBase {
  tipo: "especialista";
  whatsapp: string;
  rubros: Rubro[];
  zona: string;
  cuit: OpcionCuit;
  etapa: PreregistroStage;
  eventos: OperationalEvent[];
  proximoSeguimiento?: string;
  /** Ficha en Especialistas cuando el alta avanza a Verificado. */
  especialistaId?: string;
}

export interface PreregistroUsuario extends PreregistroBase {
  tipo: "usuario";
  whatsapp?: string;
  barrio: string;
  necesidad?: string;
}

export type Preregistro = PreregistroEspecialista | PreregistroUsuario;

export type SortOrder = "recientes" | "antiguos";

export interface EspecialistaPreSearch {
  search: string;
  rubro: Rubro | "any";
  cuit: OpcionCuit | "any";
  contacto: ContactStatus | "any";
  orden: SortOrder;
  page: number;
  pageSize: number;
}

export interface UsuarioPreSearch {
  search: string;
  orden: SortOrder;
  page: number;
  pageSize: number;
}

export function contactAttempts(record: PreregistroEspecialista): number {
  return record.eventos.filter((event) => event.kind === "contact_attempt").length;
}

export function contactStatus(record: PreregistroEspecialista): ContactStatus {
  if (record.etapa !== "identificado") return record.etapa;
  return contactAttempts(record) > 0 ? "con_intentos" : "sin_contactar";
}

export function needsContact(record: PreregistroEspecialista): boolean {
  const status = contactStatus(record);
  return status === "sin_contactar" || status === "con_intentos";
}

function matchesText(fields: string[], query: string): boolean {
  const q = normalize(query);
  if (q === "") return true;
  const digits = q.replace(/\D/g, "");
  return fields.some((field) => {
    if (normalize(field).includes(q)) return true;
    // Permite buscar un WhatsApp sin espacios ni guiones.
    return digits.length >= 4 && field.replace(/\D/g, "").includes(digits);
  });
}

function byDate<T extends { creadoEn: string }>(orden: SortOrder): (a: T, b: T) => number {
  return (a, b) => {
    const diff = Date.parse(a.creadoEn) - Date.parse(b.creadoEn);
    return orden === "antiguos" ? diff : -diff;
  };
}

export function filterEspecialistas(
  records: PreregistroEspecialista[],
  filters: EspecialistaPreSearch,
): PreregistroEspecialista[] {
  return records
    .filter((record) => {
      const rubroNames = record.rubros.map((rubro) => rubroLabels[rubro].nombre);
      return (
        matchesText([record.id, record.nombre, record.zona, record.email, record.whatsapp, ...rubroNames], filters.search) &&
        (filters.rubro === "any" || record.rubros.includes(filters.rubro)) &&
        (filters.cuit === "any" || record.cuit === filters.cuit) &&
        (filters.contacto === "any" || contactStatus(record) === filters.contacto)
      );
    })
    .sort(byDate(filters.orden));
}

export function filterUsuarios(records: PreregistroUsuario[], filters: UsuarioPreSearch): PreregistroUsuario[] {
  return records
    .filter((record) => matchesText([record.id, record.nombre, record.barrio, record.email, record.necesidad ?? ""], filters.search))
    .sort(byDate(filters.orden));
}

/** Conteo por estado sobre el resto de los filtros, para las pestañas de estado. */
export function countByContactStatus(
  records: PreregistroEspecialista[],
  filters: EspecialistaPreSearch,
): Record<ContactStatus | "any", number> {
  const base = filterEspecialistas(records, { ...filters, contacto: "any" });
  const counts = { any: base.length, sin_contactar: 0, con_intentos: 0, contactado: 0, comprometido: 0 };
  for (const record of base) counts[contactStatus(record)] += 1;
  return counts;
}

export function searchEspecialistas(records: PreregistroEspecialista[], filters: EspecialistaPreSearch): PageResult<PreregistroEspecialista> {
  return paginate(filterEspecialistas(records, filters), filters.page, filters.pageSize);
}

export function searchUsuarios(records: PreregistroUsuario[], filters: UsuarioPreSearch): PageResult<PreregistroUsuario> {
  return paginate(filterUsuarios(records, filters), filters.page, filters.pageSize);
}

/** Cola de trabajo: primero los seguimientos vencidos o próximos, después los más antiguos sin contacto. */
export function contactQueue(records: PreregistroEspecialista[]): PreregistroEspecialista[] {
  return records.filter(needsContact).sort((a, b) => {
    const aDue = a.proximoSeguimiento ? Date.parse(a.proximoSeguimiento) : Number.POSITIVE_INFINITY;
    const bDue = b.proximoSeguimiento ? Date.parse(b.proximoSeguimiento) : Number.POSITIVE_INFINITY;
    if (aDue !== bDue) return aDue - bDue;
    return Date.parse(a.creadoEn) - Date.parse(b.creadoEn);
  });
}

// ── WhatsApp ────────────────────────────────────────────────────────────

/**
 * Convierte lo que la persona escribió en la landing (8 a 15 dígitos, con o sin +54)
 * al formato internacional que pide wa.me. Sin prefijo se asume celular de Argentina;
 * otro código de país con "+" se respeta tal cual.
 * No quita el "15" local: si lo escribieron así, el número se ve en la ficha para revisarlo.
 */
export function whatsappDigits(raw: string): string | null {
  const trimmed = raw.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  if (trimmed.startsWith("+") && !digits.startsWith("54")) return digits;
  // wa.me necesita el 9 de celular argentino: +54 223… → 549223…
  if (digits.startsWith("54")) return digits.startsWith("549") ? digits : `549${digits.slice(2)}`;
  digits = digits.replace(/^0+/, "");
  const international = `549${digits}`;
  return international.length <= 15 ? international : null;
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

function firstName(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? nombre;
}

export function contactMessage(record: PreregistroEspecialista): string {
  const nombre = firstName(record.nombre);
  const rubros = joinList(record.rubros.map((rubro) => rubroLabels[rubro].nombre.toLocaleLowerCase("es")));
  const status = contactStatus(record);
  if (status === "sin_contactar") {
    return `Hola ${nombre}, ¿cómo andás? Te escribimos de Handy porque te anotaste como especialista en ${rubros}. ¿Tenés unos minutos para que te contemos cómo sigue el alta?`;
  }
  if (status === "con_intentos") {
    return `Hola ${nombre}, te escribimos de nuevo desde Handy por tu pre-registro como especialista en ${rubros}. ¿Cuándo te queda cómodo que hablemos unos minutos?`;
  }
  if (status === "contactado") {
    return `Hola ${nombre}, gracias por la charla. Para seguir con tu alta en Handy, ¿qué día te queda bien?`;
  }
  return `Hola ${nombre}, te escribimos de Handy para recordarte la fecha de tu alta. Cualquier cosa, respondé por acá.`;
}

export function whatsappUrl(raw: string, message: string): string | null {
  const digits = whatsappDigits(raw);
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : null;
}
