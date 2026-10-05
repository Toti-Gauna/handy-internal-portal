import { filterSpecialists, paginate, type PageResult, type SpecialistSearch } from "../domain/directories.ts";
import {
  buildResumen,
  searchEspecialistas,
  searchUsuarios,
  type ContactInput,
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

/**
 * Interfaz interna del frontend. Las páginas leen solo de acá, nunca de los fixtures.
 * El contrato HTTP propuesto está en docs/api/landing-be.md.
 */
export interface PortalDataSource {
  getResumen(): Promise<PreregistroResumen>;
  searchPreregistrosEspecialistas(filters: EspecialistaPreSearch): Promise<EspecialistasPage>;
  searchPreregistrosUsuarios(filters: UsuarioPreSearch): Promise<PageResult<PreregistroUsuario>>;
  getPreregistro(id: string): Promise<Preregistro | undefined>;
  registrarContacto(id: string, input: ContactInput): Promise<PreregistroEspecialista>;
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
  | "invalid_response"
  | "network"
  | "server";

/** Error normalizado: el mensaje es apto para mostrar, sin datos personales ni trazas internas. */
export class PortalSourceError extends Error {
  readonly kind: SourceErrorKind;

  constructor(kind: SourceErrorKind, message: string) {
    super(message);
    this.name = "PortalSourceError";
    this.kind = kind;
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

  async registrarContacto(_id: string, _input: ContactInput): Promise<PreregistroEspecialista> {
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
  new PortalSourceError("pending", "Lectura operativa pendiente de TECH-03, TECH-06 y TECH-08.");

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

  async registrarContacto(_id: string, _input: ContactInput): Promise<PreregistroEspecialista> {
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
