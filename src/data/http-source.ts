// Adaptador HTTP para Handy-landing-page-be (/admin/*). Implementa la PROPUESTA de docs/api/landing-be.md:
// no se usa hasta que exista sesión autorizada (TECH-08) y el contrato esté aprobado (TECH-03/TECH-06).

import type { z } from "zod";
import {
  RUBROS,
  listaEspecialistasSchema,
  listaUsuariosSchema,
  preregistroEspecialistaSchema,
  preregistroSchema,
  registrarContactoSchema,
  resumenSchema,
  type PreregistroEspecialistaApi,
} from "../contracts/landing-api.ts";
import type { PageResult, SpecialistSearch } from "../domain/directories.ts";
import {
  eventFromContact,
  type ContactCounts,
  type ContactInput,
  type EspecialistaPreSearch,
  type EspecialistasPage,
  type Preregistro,
  type PreregistroEspecialista,
  type PreregistroResumen,
  type PreregistroUsuario,
  type UsuarioPreSearch,
} from "../domain/preregistros.ts";
import type { SpecialistRecord, SpecialistStage } from "../domain/specialists.ts";
import { PortalSourceError, type PortalDataSource } from "./portal-source.ts";

export const MAX_PAGE_SIZE = 50;

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

function pageParams(params: URLSearchParams, page: number, pageSize: number): void {
  params.set("page", String(Math.max(1, Math.floor(page))));
  params.set("pageSize", String(Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(pageSize)))));
}

export function especialistasQuery(filters: EspecialistaPreSearch): string {
  const params = new URLSearchParams({ tipo: "especialista" });
  if (filters.search.trim()) params.set("q", filters.search.trim());
  if (filters.rubro !== "any") params.set("rubro", filters.rubro);
  if (filters.cuit !== "any") params.set("cuit", filters.cuit);
  if (filters.contacto !== "any") params.set("contacto", filters.contacto);
  params.set("orden", filters.orden);
  pageParams(params, filters.page, filters.pageSize);
  return params.toString();
}

export function usuariosQuery(filters: UsuarioPreSearch): string {
  const params = new URLSearchParams({ tipo: "usuario" });
  if (filters.search.trim()) params.set("q", filters.search.trim());
  params.set("orden", filters.orden);
  pageParams(params, filters.page, filters.pageSize);
  return params.toString();
}

function toEspecialista(api: PreregistroEspecialistaApi): PreregistroEspecialista {
  const { eventos, ...rest } = api;
  return {
    ...rest,
    eventos: eventos.map((evento) => eventFromContact(evento.tipo, evento.fecha, evento.actor, evento.motivo, evento.proximoSeguimiento)),
  };
}

function toCounts(api: z.infer<typeof listaEspecialistasSchema>["porEstado"]): ContactCounts {
  const { todos, ...rest } = api;
  return { any: todos, ...rest };
}

const specialistsPending = (): PortalSourceError =>
  new PortalSourceError("pending", "Especialistas viene de api-especialista: contrato pendiente de TECH-03.");

export class HttpPortalDataSource implements PortalDataSource {
  readonly #baseUrl: string;
  readonly #fetch: Fetcher;
  readonly #timeoutMs: number;

  constructor(baseUrl: string, fetcher: Fetcher = (input, init) => fetch(input, init), timeoutMs = 15000) {
    this.#baseUrl = baseUrl.replace(/\/+$/, "");
    this.#fetch = fetcher;
    this.#timeoutMs = timeoutMs;
  }

  async #request<S extends z.ZodType>(path: string, schema: S, body?: unknown): Promise<z.infer<S>> {
    let response: Response;
    try {
      response = await this.#fetch(`${this.#baseUrl}${path}`, {
        method: body === undefined ? "GET" : "POST",
        // La sesión viaja en una cookie HttpOnly emitida por el backend (TECH-08). Nada en storage.
        credentials: "include",
        headers: body === undefined ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(this.#timeoutMs),
      });
    } catch {
      throw new PortalSourceError("network", "No se pudo conectar con el servidor. Revisá la conexión y reintentá.");
    }

    if (response.status === 401) throw new PortalSourceError("unauthorized", "La sesión no es válida o venció.");
    if (response.status === 403) throw new PortalSourceError("forbidden", "No tenés permiso para esta acción.");
    if (response.status === 404) throw new PortalSourceError("not_found", "No encontramos ese registro.");
    if (response.status === 400 || response.status === 409 || response.status === 422) {
      throw new PortalSourceError("invalid_request", "El servidor rechazó los datos enviados.");
    }
    if (!response.ok) throw new PortalSourceError("server", "El servidor no pudo responder. Probá de nuevo en un rato.");

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throw new PortalSourceError("invalid_response", "La respuesta del servidor no tiene el formato esperado.");
    }
    const parsed = schema.safeParse(json);
    if (!parsed.success) throw new PortalSourceError("invalid_response", "La respuesta del servidor no tiene el formato esperado.");
    return parsed.data;
  }

  async getResumen(): Promise<PreregistroResumen> {
    const data = await this.#request("/admin/preregistros/resumen", resumenSchema);
    const porRubro = Object.fromEntries(RUBROS.map((rubro) => [rubro, data.porRubro[rubro] ?? 0])) as PreregistroResumen["porRubro"];
    return { ...data, porRubro, porEstado: toCounts(data.porEstado), cola: data.cola.map(toEspecialista) };
  }

  async searchPreregistrosEspecialistas(filters: EspecialistaPreSearch): Promise<EspecialistasPage> {
    const data = await this.#request(`/admin/preregistros?${especialistasQuery(filters)}`, listaEspecialistasSchema);
    return { ...data, rows: data.rows.map(toEspecialista), porEstado: toCounts(data.porEstado) };
  }

  async searchPreregistrosUsuarios(filters: UsuarioPreSearch): Promise<PageResult<PreregistroUsuario>> {
    return this.#request(`/admin/preregistros?${usuariosQuery(filters)}`, listaUsuariosSchema);
  }

  async getPreregistro(id: string): Promise<Preregistro | undefined> {
    try {
      const data = await this.#request(`/admin/preregistros/${encodeURIComponent(id)}`, preregistroSchema);
      return data.tipo === "especialista" ? toEspecialista(data) : data;
    } catch (error) {
      if (error instanceof PortalSourceError && error.kind === "not_found") return undefined;
      throw error;
    }
  }

  async registrarContacto(id: string, input: ContactInput): Promise<PreregistroEspecialista> {
    const body = registrarContactoSchema.safeParse(input);
    if (!body.success) throw new PortalSourceError("invalid_request", "Revisá el tipo de contacto y el motivo (hasta 140 caracteres).");
    const data = await this.#request(`/admin/preregistros/${encodeURIComponent(id)}/eventos`, preregistroEspecialistaSchema, body.data);
    return toEspecialista(data);
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
