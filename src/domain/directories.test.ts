import assert from "node:assert/strict";
import test from "node:test";
import { demoSpecialists } from "../data/demo-data.ts";
import { filterSpecialists, paginate } from "./directories.ts";
import { preRegistrationStages } from "./specialists.ts";

const blankSpecialistSearch = {
  search: "",
  trade: "any",
  zone: "any",
  stage: "any",
  verification: "any",
  enabled: "any",
  activity: "any",
  page: 1,
  pageSize: 5,
} as const;

test("los filtros de especialistas se combinan y la búsqueda ignora mayúsculas y tildes", () => {
  const rows = filterSpecialists(demoSpecialists, {
    ...blankSpecialistSearch,
    search: "esp-demo-007",
    trade: "Plomería",
    stage: "activo",
    verification: "nivel_1",
    enabled: "yes",
    activity: "active",
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.id, "ESP-DEMO-007");
  assert.equal(filterSpecialists(demoSpecialists, { ...blankSpecialistSearch, search: "ELECTRICIDAD" }).length, 2);
  assert.equal(filterSpecialists(demoSpecialists, { ...blankSpecialistSearch, search: "batan" }).length, 1);
});

test("el directorio de especialistas solo contiene etapas post-registro", () => {
  assert.ok(demoSpecialists.every((record) => !preRegistrationStages.has(record.stage)));
});

test("la paginación limita filas y corrige páginas fuera de rango", () => {
  const result = paginate(demoSpecialists, 2, 4);
  assert.equal(result.rows.length, 4);
  assert.equal(result.totalPages, 3);

  const clamped = paginate(demoSpecialists, 20, 4);
  assert.equal(clamped.page, 3);
  assert.equal(clamped.rows.length, 2);
});
