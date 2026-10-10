// Registro de contactos: validación previa al envío y claves de idempotencia.
// El servidor vuelve a validar todo y es la única autoridad (docs/crm.md del backend); esto solo evita
// pedidos que sabemos que van a rechazarse y explica el motivo en el campo correcto.

import { ALTA_MAX_DIAS, MOTIVO_MAX, type EventoEntrada, type TipoEvento } from "../contracts/landing-api.ts";
import { allowedEventTypes, type PreregistroEspecialista } from "./preregistros.ts";

/** Tolerancia de reloj entre el portal y el servidor para el próximo seguimiento (igual que el backend). */
const TOLERANCIA_MS = 5 * 60_000;
const DIA_MS = 86_400_000;

export type CamposEvento = "tipo" | "motivo" | "proximoSeguimiento" | "fechaAltaAceptada";
export type ErroresEvento = Partial<Record<CamposEvento, string>>;

export interface BorradorEvento {
  tipo: TipoEvento | "";
  motivo: string;
  /** ISO 8601 con zona, o vacío. */
  proximoSeguimiento?: string;
  fechaAltaAceptada?: string;
}

export const camposEventoMensajes: Record<CamposEvento, string> = {
  tipo: "Elegí qué pasó con el contacto.",
  motivo: `Escribí una nota breve (hasta ${MOTIVO_MAX} caracteres), sin teléfonos, emails, enlaces ni cuentas.`,
  proximoSeguimiento: "Elegí una fecha futura, antes de que venza el pre-registro.",
  fechaAltaAceptada: `La fecha de alta acordada tiene que ser desde hoy y hasta ${ALTA_MAX_DIAS} días, antes de que venza el pre-registro.`,
};

function time(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.NaN : parsed;
}

/** Devuelve los errores por campo; vacío = se puede enviar. `now` se inyecta para poder probarlo. */
export function validateEvento(
  draft: BorradorEvento,
  record: Pick<PreregistroEspecialista, "etapa" | "venceEn">,
  now: Date,
): ErroresEvento {
  const errors: ErroresEvento = {};
  const tipo = draft.tipo;
  if (tipo === "" || !allowedEventTypes(record.etapa).includes(tipo)) {
    errors.tipo = "Esa acción no corresponde a la etapa actual.";
    return errors;
  }

  const motivo = draft.motivo.trim();
  if (motivo.length < 1 || motivo.length > MOTIVO_MAX) errors.motivo = camposEventoMensajes.motivo;

  const vence = Date.parse(record.venceEn);
  const seguimiento = time(draft.proximoSeguimiento);
  if (seguimiento !== undefined && (Number.isNaN(seguimiento) || seguimiento < now.getTime() - TOLERANCIA_MS || seguimiento > vence)) {
    errors.proximoSeguimiento = camposEventoMensajes.proximoSeguimiento;
  }

  const alta = time(draft.fechaAltaAceptada);
  if (tipo === "compromiso") {
    const tope = Math.min(now.getTime() + ALTA_MAX_DIAS * DIA_MS, vence);
    if (alta === undefined || Number.isNaN(alta) || alta < now.getTime() || alta > tope) {
      errors.fechaAltaAceptada = camposEventoMensajes.fechaAltaAceptada;
    }
  } else if (alta !== undefined) {
    errors.fechaAltaAceptada = "Solo el compromiso lleva fecha de alta acordada.";
  }

  // La fecha de alta aceptada es un dato distinto del próximo seguimiento: una no reemplaza a la otra.
  if (alta !== undefined && seguimiento !== undefined && alta === seguimiento) {
    errors.proximoSeguimiento = "El seguimiento tiene que ser distinto de la fecha de alta acordada.";
  }
  return errors;
}

/** Cuerpo exacto que viaja al servidor (claves en orden fijo, sin vacíos): también sirve de huella del envío. */
export function buildEventoEntrada(draft: BorradorEvento & { tipo: TipoEvento }, version: number): EventoEntrada {
  const body: EventoEntrada = { tipo: draft.tipo, motivo: draft.motivo.trim(), version };
  if (draft.proximoSeguimiento) body.proximoSeguimiento = draft.proximoSeguimiento;
  if (draft.fechaAltaAceptada) body.fechaAltaAceptada = draft.fechaAltaAceptada;
  return body;
}

// ── Idempotencia ────────────────────────────────────────────────────────

/** UUIDv4. `crypto.randomUUID` existe en contextos seguros (HTTPS y localhost); el respaldo usa getRandomValues. */
export function uuidv4(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Una clave de `Idempotency-Key` por envío. Mientras el envío no termine bien, reintentar el MISMO cuerpo
 * sobre el MISMO pre-registro reusa la clave (si el primer intento sí llegó, el servidor responde 200 sin
 * duplicar). Cambiar el cuerpo —o la ficha— es otro envío y estrena clave. Vive solo en memoria.
 */
export class SubmissionKeys {
  #current: { scope: string; fingerprint: string; key: string } | undefined;
  readonly #newKey: () => string;

  constructor(newKey: () => string = uuidv4) {
    this.#newKey = newKey;
  }

  keyFor(scope: string, body: EventoEntrada): string {
    const fingerprint = JSON.stringify(body);
    if (this.#current && this.#current.scope === scope && this.#current.fingerprint === fingerprint) return this.#current.key;
    this.#current = { scope, fingerprint, key: this.#newKey() };
    return this.#current.key;
  }

  /** Se llama cuando el envío terminó (éxito) o el servidor lo descartó (409): el próximo es otro envío. */
  release(): void {
    this.#current = undefined;
  }
}
