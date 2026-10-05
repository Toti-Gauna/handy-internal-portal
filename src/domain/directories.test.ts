import assert from "node:assert/strict";
import test from "node:test";
import { demoSpecialists, demoUsers } from "../data/demo-data.ts";
import { filterSpecialists, filterUsers, paginate } from "./directories.ts";

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

test("los filtros de especialistas se combinan y la búsqueda ignora mayúsculas", () => {
  const rows = filterSpecialists(demoSpecialists, {
    ...blankSpecialistSearch,
    search: "ESP-DEMO-007",
    trade: "Plomería",
    zone: "Zona demostrativa B",
    stage: "activo",
    verification: "nivel_1",
    enabled: "yes",
    activity: "active",
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.id, "ESP-DEMO-007");
  assert.equal(
    filterSpecialists(demoSpecialists, { ...blankSpecialistSearch, search: "electricidad" }).length,
    2,
  );
});

test("la paginación limita filas y corrige páginas fuera de rango", () => {
  const result = paginate(demoSpecialists, 3, 5);
  assert.equal(result.rows.length, 2);
  assert.equal(result.page, 3);
  assert.equal(result.totalPages, 3);

  const clamped = paginate(demoSpecialists, 20, 5);
  assert.equal(clamped.page, 3);
  assert.equal(clamped.rows.length, 2);
});

test("la búsqueda de usuarios usa solo el identificador ficticio y el nombre de muestra", () => {
  const rows = filterUsers(demoUsers, {
    search: "USR-DEMO-03",
    state: "any",
    page: 1,
    pageSize: 4,
  });

  assert.deepEqual(rows.map((row) => row.id), ["USR-DEMO-03"]);
});
