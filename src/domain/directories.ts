import type { ActivityState, SpecialistRecord, SpecialistStage, VerificationLevel } from "./specialists.ts";

export type EnabledFilter = "any" | "yes" | "no";
export type ActivityFilter = "any" | "active" | "inactive";

export interface SpecialistSearch {
  search: string;
  trade: string;
  zone: string;
  stage: SpecialistStage | "any";
  verification: VerificationLevel | "any";
  enabled: EnabledFilter;
  activity: ActivityFilter;
  page: number;
  pageSize: number;
}

export interface PageResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
}

function includes(value: string, query: string): boolean {
  return normalize(value).includes(normalize(query));
}

function matchesActivity(state: ActivityState, filter: ActivityFilter): boolean {
  if (filter === "any") return true;
  return state === filter;
}

export function filterSpecialists(records: SpecialistRecord[], filters: SpecialistSearch): SpecialistRecord[] {
  return records.filter((record) => {
    const matchesSearch =
      filters.search.trim() === "" ||
      [record.id, record.label, record.trade, record.zone].some((value) => includes(value, filters.search));

    return (
      matchesSearch &&
      (filters.trade === "any" || record.trade === filters.trade) &&
      (filters.zone === "any" || record.zone === filters.zone) &&
      (filters.stage === "any" || record.stage === filters.stage) &&
      (filters.verification === "any" || record.verificationLevel === filters.verification) &&
      (filters.enabled === "any" || record.enabled === (filters.enabled === "yes")) &&
      matchesActivity(record.activity, filters.activity)
    );
  });
}

export function paginate<T>(records: T[], requestedPage: number, requestedPageSize: number): PageResult<T> {
  const pageSize = Math.max(1, Math.floor(requestedPageSize));
  const total = records.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, Math.floor(requestedPage)), totalPages);
  const start = (page - 1) * pageSize;

  return {
    rows: records.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages,
  };
}
