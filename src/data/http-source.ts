// Adaptador HTTP para Handy-landing-page-be (/admin/preregistros*). Contrato real en docs/api/landing-be.md.
// Toda la sesión (cookies, CSRF en memoria, refresh serializado) vive en AdminSessionClient: acá solo se
// arman las rutas, se valida la respuesta y se mapea al dominio.

import {
  PAGE_SIZE_MAX,
  RUBROS,
  eventoEntradaSchema,
  fichaEspecialistaSchema,
  fichaSchema,
  idempotencyKeySchema,
  listaEspecialistasSchema,
  listaUsuariosSchema,
  resumenSchema,
  type EventoEntrada,
  type PorEstadoApi,
} from "../contracts/landing-api.ts";
import type { PageResult, SpecialistSearch } from "../domain/directories.ts";
import type {
  ContactCounts,
  EspecialistaPreSearch,
  EspecialistasPage,
  Preregistro,
  PreregistroResumen,
  PreregistroUsuario,
  UsuarioPreSearch,
} from "../domain/preregistros.ts";
import type { SpecialistRecord, SpecialistStage } from "../domain/specialists.ts";
import type { AdminSessionClient } from "./admin-session.ts";
import { PortalSourceError, type EventoRegistrado, type PortalDataSource } from "./portal-source.ts";

export const MAX_PAGE_SIZE = PAGE_SIZE_MAX;

function pageParams(params: URLSearchParams, page: number, pageSize: number): void {
  params.set("page", String(Math.max(1, Math.floor(page))));
  params.set("pageSize", String(Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(pageSize)))));
}

/** Los filtros viajan al servidor; los vacíos ("any", texto en blanco) no se mandan. `q` y `zona` son exactos. */
export function especialistasQuery(filters: EspecialistaPreSearch): string {
  const params = new URLSearchParams({ tipo: "especialista" });
  if (filters.search.trim()) params.set("q", filters.search.trim());
  if (filters.rubro !== "any") params.set("rubro", filters.rubro);
  if (filters.zona.trim()) params.set("zona", filters.zona.trim());
  if (filters.contacto !== "any") params.set("contacto", filters.contacto);
  params.set("orden", filters.orden);
  pageParams(params, filters.page, filters.pageSize);
  return params.toString();
}

/** Los filtros de especialista no existen para usuarios: el servidor los rechazaría con 400. */
export function usuariosQuery(filters: UsuarioPreSearch): string {
  const params = new URLSearchParams({ tipo: "usuario" });
  if (filters.search.trim()) params.set("q", filters.search.trim());
  params.set("orden", filters.orden);
  pageParams(params, filters.page, filters.pageSize);
  return params.toString();
}

function toCounts(api: PorEstadoApi): ContactCounts {
  const { todos, ...rest } = api;
  return { any: todos, ...rest };
}

const specialistsPending = (): PortalSourceError =>
  new PortalSourceError("pending", "Los especialistas con alta completa vienen de otro servicio: el contrato todavía no existe.");

export class HttpPortalDataSource implements PortalDataSource {
  readonly #session: AdminSessionClient;

  constructor(session: AdminSessionClient) {
    this.#session = session;
  }

  async getResumen(): Promise<PreregistroResumen> {
    const { data } = await this.#session.request("/admin/preregistros/resumen", resumenSchema);
    const porRubro = Object.fromEntries(RUBROS.map((rubro) => [rubro, data.porRubro[rubro] ?? 0])) as PreregistroResumen["porRubro"];
    return { ...data, porRubro, porEstado: toCounts(data.porEstado) };
  }

  async searchPreregistrosEspecialistas(filters: EspecialistaPreSearch): Promise<EspecialistasPage> {
    const { data } = await this.#session.request(`/admin/preregistros?${especialistasQuery(filters)}`, listaEspecialistasSchema);
    return { ...data, porEstado: toCounts(data.porEstado) };
  }

  async searchPreregistrosUsuarios(filters: UsuarioPreSearch): Promise<PageResult<PreregistroUsuario>> {
    const { data } = await this.#session.request(`/admin/preregistros?${usuariosQuery(filters)}`, listaUsuariosSchema);
    return data;
  }

  async getPreregistro(id: string): Promise<Preregistro | undefined> {
    try {
      const { data } = await this.#session.request(`/admin/preregistros/${encodeURIComponent(id)}`, fichaSchema);
      return data;
    } catch (error) {
      if (error instanceof PortalSourceError && error.kind === "not_found") return undefined;
      throw error;
    }
  }

  async registrarEvento(id: string, input: EventoEntrada, idempotencyKey: string): Promise<EventoRegistrado> {
    const body = eventoEntradaSchema.safeParse(input);
    const key = idempotencyKeySchema.safeParse(idempotencyKey);
    if (!body.success || !key.success) {
      const campos = body.success ? ["idempotency-key"] : [...new Set(body.error.issues.map((issue) => String(issue.path[0] ?? "")).filter(Boolean))];
      throw new PortalSourceError("invalid_request", "Revisá el tipo de contacto, la nota y las fechas.", { campos });
    }
    const { data, status } = await this.#session.request(`/admin/preregistros/${encodeURIComponent(id)}/eventos`, fichaEspecialistaSchema, {
      method: "POST",
      body: body.data,
      headers: { "Idempotency-Key": key.data },
    });
    // 201 = registrado ahora · 200 = la misma clave y el mismo cuerpo ya estaban: no se duplicó.
    return { ficha: data, repetido: status === 200 };
  }

  async searchSpecialists(_filters: SpecialistSearch): Promise<PageResult<SpecialistRecord>> {
    throw specialistsPending();
  }

  async getSpecialist(_id: string): Promise<SpecialistRecord | undefined> {
    throw specialistsPending();
  }

  async getSpecialistStageCounts(): Promise<Record<SpecialistStage, number>> {
    throw specialistsPending();
  }
}
