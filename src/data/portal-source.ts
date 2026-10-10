import { filterSpecialists, paginate, type PageResult, type SpecialistSearch } from "../domain/directories.ts";
import type { EventoEntrada } from "../contracts/landing-api.ts";
import {
  buildResumen,
  searchEspecialistas,
  searchUsuarios,
  type EspecialistaPreSearch,
  type EspecialistasPage,
  type Preregistro,
  type PreregistroEspecialista,
  type PreregistroResumen,
  type PreregistroUsuario,
  type UsuarioPreSearch,
} from "../domain/preregistros.ts";
import { specialistStages, type SpecialistRecord, type SpecialistStage } from "../domain/specialists.ts";
import { demoPreregistrosEspecialistas, demoPreregistrosUsuarios, demoSpecialists, type DemoUsuario } from "./demo-data.ts";

/** Resultado de registrar un evento: `repetido` = el servidor ya lo tenía (misma clave y cuerpo), no se duplicó. */
export interface EventoRegistrado {
  ficha: PreregistroEspecialista;
  repetido: boolean;
}

/**
 * Interfaz interna del frontend. Las páginas leen solo de acá, nunca de los fixtures.
 * El contrato HTTP está en docs/api/landing-be.md.
 */
export interface PortalDataSource {
  getResumen(): Promise<PreregistroResumen>;
  searchPreregistrosEspecialistas(filters: EspecialistaPreSearch): Promise<EspecialistasPage>;
  searchPreregistrosUsuarios(filters: UsuarioPreSearch): Promise<PageResult<PreregistroUsuario>>;
  getPreregistro(id: string): Promise<Preregistro | undefined>;
  /** `idempotencyKey` (UUIDv4) la elige quien envía y se reusa en los reintentos del mismo envío. */
  registrarEvento(id: string, input: EventoEntrada, idempotencyKey: string): Promise<EventoRegistrado>;
  searchSpecialists(filters: SpecialistSearch): Promise<PageResult<SpecialistRecord>>;
  getSpecialist(id: string): Promise<SpecialistRecord | undefined>;
  getSpecialistStageCounts(): Promise<Record<SpecialistStage, number>>;
}

export type SourceErrorKind =
  | "pending"
  | "blocked"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "invalid_request"
  | "conflict"
  | "rate_limited"
  | "unavailable"
  | "invalid_response"
  | "network"
  | "server";

/** Por qué el servidor respondió 403: falta el permiso, el CSRF de la sesión no coincide o el origen no está autorizado. */
export type ForbiddenReason = "sin_permiso" | "csrf_invalido" | "origen_no_permitido";
/** Por qué el servidor respondió 409 al registrar un evento. */
export type ConflictReason = "version" | "transicion" | "idempotencia";

export interface SourceErrorDetail {
  reason?: ForbiddenReason;
  conflict?: ConflictReason;
  /** Nombres de los campos que el servidor rechazó (400). Nunca valores. */
  campos?: string[];
}

/** Error normalizado: el mensaje es apto para mostrar, sin datos personales ni trazas internas. */
export class PortalSourceError extends Error {
  readonly kind: SourceErrorKind;
  readonly reason: ForbiddenReason | undefined;
  readonly conflict: ConflictReason | undefined;
  readonly campos: string[];

  constructor(kind: SourceErrorKind, message: string, detail: SourceErrorDetail = {}) {
    super(message);
    this.name = "PortalSourceError";
    this.kind = kind;
    this.reason = detail.reason;
    this.conflict = detail.conflict;
    this.campos = detail.campos ?? [];
  }
}

function toUsuarioView({ email: _email, ...view }: DemoUsuario): PreregistroUsuario {
  return view;
}

function countStages(records: SpecialistRecord[]): Record<SpecialistStage, number> {
  return Object.fromEntries(specialistStages.map((stage) => [stage, records.filter((record) => record.stage === stage).length])) as Record<
    SpecialistStage,
    number
  >;
}

/** Local-only source. Its rows are synthetic and must never back operational use. */
export class DemoPortalDataSource implements PortalDataSource {
  async getResumen(): Promise<PreregistroResumen> {
    return buildResumen(demoPreregistrosEspecialistas, demoPreregistrosUsuarios.length);
  }

  async searchPreregistrosEspecialistas(filters: EspecialistaPreSearch): Promise<EspecialistasPage> {
    return searchEspecialistas(demoPreregistrosEspecialistas, filters);
  }

  async searchPreregistrosUsuarios(filters: UsuarioPreSearch): Promise<PageResult<PreregistroUsuario>> {
    const page = searchUsuarios(demoPreregistrosUsuarios, filters);
    return { ...page, rows: page.rows.map(toUsuarioView) };
  }

  async getPreregistro(id: string): Promise<Preregistro | undefined> {
    const especialista = demoPreregistrosEspecialistas.find((record) => record.id === id);
    if (especialista) return especialista;
    const usuario = demoPreregistrosUsuarios.find((record) => record.id === id);
    return usuario ? toUsuarioView(usuario) : undefined;
  }

  async registrarEvento(_id: string, _input: EventoEntrada, _idempotencyKey: string): Promise<EventoRegistrado> {
    throw new PortalSourceError("blocked", "La muestra no registra contactos.");
  }

  async searchSpecialists(filters: SpecialistSearch): Promise<PageResult<SpecialistRecord>> {
    return paginate(filterSpecialists(demoSpecialists, filters), filters.page, filters.pageSize);
  }

  async getSpecialist(id: string): Promise<SpecialistRecord | undefined> {
    return demoSpecialists.find((record) => record.id === id);
  }

  async getSpecialistStageCounts(): Promise<Record<SpecialistStage, number>> {
    return countStages(demoSpecialists);
  }
}

const pendingError = (): PortalSourceError =>
  new PortalSourceError("pending", "Sin conexión configurada: falta VITE_API_BASE_URL en el build.");

/** Sin backend configurado: todo devuelve un bloqueo explícito, sin pedidos HTTP. */
export class PendingPortalDataSource implements PortalDataSource {
  async getResumen(): Promise<PreregistroResumen> {
    throw pendingError();
  }

  async searchPreregistrosEspecialistas(_filters: EspecialistaPreSearch): Promise<EspecialistasPage> {
    throw pendingError();
  }

  async searchPreregistrosUsuarios(_filters: UsuarioPreSearch): Promise<PageResult<PreregistroUsuario>> {
    throw pendingError();
  }

  async getPreregistro(_id: string): Promise<Preregistro | undefined> {
    throw pendingError();
  }

  async registrarEvento(_id: string, _input: EventoEntrada, _idempotencyKey: string): Promise<EventoRegistrado> {
    throw pendingError();
  }

  async searchSpecialists(_filters: SpecialistSearch): Promise<PageResult<SpecialistRecord>> {
    throw pendingError();
  }

  async getSpecialist(_id: string): Promise<SpecialistRecord | undefined> {
    throw pendingError();
  }

  async getSpecialistStageCounts(): Promise<Record<SpecialistStage, number>> {
    throw pendingError();
  }
}
