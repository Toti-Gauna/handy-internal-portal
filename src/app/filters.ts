import { demoSpecialists } from "../data/demo-data.ts";
import type { SpecialistSearch } from "../domain/directories.ts";
import { isSpecialistStage, type VerificationLevel } from "../domain/specialists.ts";
import { root, specialistFilters, userFilters } from "./state.ts";

export function readSpecialistFilters(): void {
  const value = (id: string): string => root.querySelector<HTMLSelectElement>(`#${id}`)?.value ?? "any";
  const stage = value("specialist-stage");
  const verification = value("specialist-verification");
  const trades = new Set(demoSpecialists.map((record) => record.trade));
  const zones = new Set(demoSpecialists.map((record) => record.zone));
  const verificationLevels: VerificationLevel[] = ["sin_iniciar", "en_curso", "nivel_1", "nivel_2"];
  const activities = new Set(["any", "active", "inactive"]);

  specialistFilters.trade = trades.has(value("specialist-trade")) ? value("specialist-trade") : "any";
  specialistFilters.zone = zones.has(value("specialist-zone")) ? value("specialist-zone") : "any";
  specialistFilters.stage = isSpecialistStage(stage) ? stage : "any";
  specialistFilters.verification = verificationLevels.includes(verification as VerificationLevel)
    ? (verification as VerificationLevel)
    : "any";
  specialistFilters.enabled = ["yes", "no"].includes(value("specialist-enabled"))
    ? (value("specialist-enabled") as SpecialistSearch["enabled"])
    : "any";
  specialistFilters.activity = activities.has(value("specialist-activity"))
    ? (value("specialist-activity") as SpecialistSearch["activity"])
    : "any";
}

export function readUserFilters(): void {
  const state = root.querySelector<HTMLSelectElement>("#user-state")?.value ?? "any";
  userFilters.state = state === "Activa · ficticio" || state === "Pendiente · ficticio" ? state : "any";
}
