import { filterSpecialists, paginate, type PageResult, type SpecialistSearch } from "../domain/directories.ts";
import {
  searchEspecialistas,
  searchUsuarios,
  type EspecialistaPreSearch,
  type Preregistro,
  type PreregistroEspecialista,
  type PreregistroUsuario,
  type UsuarioPreSearch,
} from "../domain/preregistros.ts";
import type { SpecialistRecord } from "../domain/specialists.ts";
import { demoPreregistrosEspecialistas, demoPreregistrosUsuarios, demoSpecialists } from "./demo-data.ts";

/** Interfaz interna del frontend. No es un contrato REST: la propuesta está en docs/modules/preregistros.md. */
export interface PortalDataSource {
  searchSpecialists(filters: SpecialistSearch): Promise<PageResult<SpecialistRecord>>;
  searchPreregistrosEspecialistas(filters: EspecialistaPreSearch): Promise<PageResult<PreregistroEspecialista>>;
  searchPreregistrosUsuarios(filters: UsuarioPreSearch): Promise<PageResult<PreregistroUsuario>>;
  getPreregistro(id: string): Promise<Preregistro | undefined>;
}

/** Local-only source. Its rows are synthetic and must never back operational use. */
export class DemoPortalDataSource implements PortalDataSource {
  async searchSpecialists(filters: SpecialistSearch): Promise<PageResult<SpecialistRecord>> {
    return paginate(filterSpecialists(demoSpecialists, filters), filters.page, filters.pageSize);
  }

  async searchPreregistrosEspecialistas(filters: EspecialistaPreSearch): Promise<PageResult<PreregistroEspecialista>> {
    return searchEspecialistas(demoPreregistrosEspecialistas, filters);
  }

  async searchPreregistrosUsuarios(filters: UsuarioPreSearch): Promise<PageResult<PreregistroUsuario>> {
    return searchUsuarios(demoPreregistrosUsuarios, filters);
  }

  async getPreregistro(id: string): Promise<Preregistro | undefined> {
    return [...demoPreregistrosEspecialistas, ...demoPreregistrosUsuarios].find((record) => record.id === id);
  }
}

const pending = "Lectura operativa pendiente de TECH-03, TECH-06 y TECH-08.";

export class PendingPortalDataSource implements PortalDataSource {
  async searchSpecialists(_filters: SpecialistSearch): Promise<PageResult<SpecialistRecord>> {
    throw new Error(pending);
  }

  async searchPreregistrosEspecialistas(_filters: EspecialistaPreSearch): Promise<PageResult<PreregistroEspecialista>> {
    throw new Error(pending);
  }

  async searchPreregistrosUsuarios(_filters: UsuarioPreSearch): Promise<PageResult<PreregistroUsuario>> {
    throw new Error(pending);
  }

  async getPreregistro(_id: string): Promise<Preregistro | undefined> {
    throw new Error(pending);
  }
}
