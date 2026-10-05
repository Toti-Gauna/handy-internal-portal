import { demoSpecialists } from "../data/demo-data.ts";
import type { SpecialistSearch } from "../domain/directories.ts";
import { CONTACT_STATUSES, OPCIONES_CUIT, RUBROS, type ContactStatus, type OpcionCuit, type Rubro, type SortOrder } from "../domain/preregistros.ts";
import { postRegistrationStages, type SpecialistStage, type VerificationLevel } from "../domain/specialists.ts";
import { preEspecialistaFilters, preUsuarioFilters, root, specialistFilters } from "./state.ts";

function value(id: string): string {
  return root.querySelector<HTMLSelectElement>(`#${id}`)?.value ?? "any";
}

function oneOf<T extends string>(candidate: string, allowed: readonly T[], fallback: T | "any" = "any"): T | "any" {
  return (allowed as readonly string[]).includes(candidate) ? (candidate as T) : fallback;
}

export function readSpecialistFilters(): void {
  const trades = Array.from(new Set(demoSpecialists.map((record) => record.trade)));
  const verificationLevels: VerificationLevel[] = ["sin_iniciar", "en_curso", "nivel_1", "nivel_2"];

  specialistFilters.trade = oneOf(value("specialist-trade"), trades);
  specialistFilters.stage = oneOf<SpecialistStage>(value("specialist-stage"), postRegistrationStages);
  specialistFilters.verification = oneOf(value("specialist-verification"), verificationLevels);
  specialistFilters.enabled = oneOf<Exclude<SpecialistSearch["enabled"], "any">>(value("specialist-enabled"), ["yes", "no"]);
  specialistFilters.activity = oneOf<Exclude<SpecialistSearch["activity"], "any">>(value("specialist-activity"), ["active", "inactive"]);
}

function readOrder(id: string): SortOrder {
  return value(id) === "antiguos" ? "antiguos" : "recientes";
}

export function readPreregistroFilters(): void {
  if (root.querySelector("#especialista-filtros")) {
    preEspecialistaFilters.cuit = oneOf<OpcionCuit>(value("especialista-cuit"), OPCIONES_CUIT);
    preEspecialistaFilters.orden = readOrder("especialista-orden");
    preEspecialistaFilters.page = 1;
  }
  if (root.querySelector("#usuario-filtros")) {
    preUsuarioFilters.orden = readOrder("usuario-orden");
    preUsuarioFilters.page = 1;
  }
}

/** Alterna el rubro: tocar el seleccionado lo quita. Con `exclusive` siempre lo deja puesto. */
export function toggleRubro(rubro: string, exclusive = false): void {
  const next = oneOf<Rubro>(rubro, RUBROS);
  preEspecialistaFilters.rubro = !exclusive && preEspecialistaFilters.rubro === next ? "any" : next;
  preEspecialistaFilters.page = 1;
}

export function setContactFilter(contacto: string): void {
  preEspecialistaFilters.contacto = oneOf<ContactStatus>(contacto, CONTACT_STATUSES);
  preEspecialistaFilters.page = 1;
}
