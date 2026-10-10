import assert from "node:assert/strict";
import test from "node:test";
import { demoPreregistrosEspecialistas, demoPreregistrosUsuarios, demoSpecialists } from "../data/demo-data.ts";
import {
  allowedEventTypes,
  buildResumen,
  contactMessage,
  contactQueue,
  countByContactStatus,
  filterEspecialistas,
  filterUsuarios,
  isUuid,
  whatsappUrl,
  type EspecialistaPreSearch,
} from "./preregistros.ts";

const blank: EspecialistaPreSearch = { search: "", rubro: "any", zona: "", contacto: "any", orden: "recientes", page: 1, pageSize: 8 };

function byId(id: string) {
  const record = demoPreregistrosEspecialistas.find((item) => item.id === id);
  assert.ok(record);
  return record;
}

test("el estado de contacto lo deriva el servidor: un intento sin respuesta sigue en Identificado con intentos", () => {
  const record = byId("PRE-DEMO-E04");
  assert.equal(record.etapa, "identificado");
  assert.equal(record.contacto, "con_intentos");
  assert.equal(record.intentos, 2);
  assert.equal(byId("PRE-DEMO-E02").contacto, "sin_contactar");
  assert.equal(byId("PRE-DEMO-E05").contacto, "contactado");
});

test("los filtros de especialistas se combinan; la zona es exacta (sin tildes ni mayúsculas) y no parcial", () => {
  const rows = filterEspecialistas(demoPreregistrosEspecialistas, { ...blank, rubro: "electricidad", contacto: "sin_contactar" });
  assert.deepEqual(rows.map((row) => row.id), ["PRE-DEMO-E02", "PRE-DEMO-E12"]);

  assert.deepEqual(filterEspecialistas(demoPreregistrosEspecialistas, { ...blank, zona: "  zona NORTE " }).map((row) => row.id), ["PRE-DEMO-E04"]);
  assert.equal(filterEspecialistas(demoPreregistrosEspecialistas, { ...blank, zona: "norte" }).length, 0);
  assert.equal(filterEspecialistas(demoPreregistrosEspecialistas, { ...blank, zona: "constitucion" }).length, 2, "sin tilde");
});

test("q es EXACTA: por ID o WhatsApp completo; no encuentra por nombre ni por parte del número", () => {
  const e03 = byId("PRE-DEMO-E03");
  assert.deepEqual(filterEspecialistas(demoPreregistrosEspecialistas, { ...blank, search: e03.id }).map((row) => row.id), [e03.id]);
  assert.deepEqual(filterEspecialistas(demoPreregistrosEspecialistas, { ...blank, search: "223 000 0103" }).map((row) => row.id), [e03.id]);
  assert.deepEqual(filterEspecialistas(demoPreregistrosEspecialistas, { ...blank, search: "+54 9 223 000 0103" }).map((row) => row.id), [e03.id]);
  assert.equal(filterEspecialistas(demoPreregistrosEspecialistas, { ...blank, search: "Esteban" }).length, 0);
  assert.equal(filterEspecialistas(demoPreregistrosEspecialistas, { ...blank, search: "0103" }).length, 0);
});

test("el orden respeta recientes, antiguos y seguimiento más próximo (sin seguimiento al final)", () => {
  const recientes = filterEspecialistas(demoPreregistrosEspecialistas, blank);
  const antiguos = filterEspecialistas(demoPreregistrosEspecialistas, { ...blank, orden: "antiguos" });
  const seguimiento = filterEspecialistas(demoPreregistrosEspecialistas, { ...blank, orden: "seguimiento" });
  assert.equal(recientes[0]?.id, "PRE-DEMO-E09");
  assert.equal(antiguos[0]?.id, "PRE-DEMO-E01");
  assert.equal(seguimiento[0]?.id, "PRE-DEMO-E07");
  assert.equal(seguimiento.at(-1)?.proximoSeguimiento, undefined);
});

test("los conteos por estado suman el total con el resto de los filtros aplicados", () => {
  const counts = countByContactStatus(demoPreregistrosEspecialistas, { ...blank, contacto: "comprometido" });
  assert.equal(counts.any, demoPreregistrosEspecialistas.length);
  assert.equal(counts.sin_contactar + counts.con_intentos + counts.contactado + counts.comprometido, counts.any);
});

test("la cola pone primero los seguimientos más próximos y excluye contactados", () => {
  const queue = contactQueue(demoPreregistrosEspecialistas);
  assert.equal(queue[0]?.id, "PRE-DEMO-E07");
  assert.equal(queue[1]?.id, "PRE-DEMO-E04");
  assert.ok(queue.every((record) => record.etapa === "identificado"));
  assert.ok(buildResumen(demoPreregistrosEspecialistas, 0).cola.length <= 5);
});

test("la búsqueda de usuarios es exacta: por ID o por email completo, nunca parcial", () => {
  const exact = filterUsuarios(demoPreregistrosUsuarios, { search: "usuario07@example.com", orden: "recientes", page: 1, pageSize: 8 });
  assert.deepEqual(exact.map((row) => row.id), ["PRE-DEMO-U07"]);
  assert.equal(filterUsuarios(demoPreregistrosUsuarios, { search: "usuario07", orden: "recientes", page: 1, pageSize: 8 }).length, 0);
});

test("las acciones válidas siguen las reglas del backend: un contactado solo puede comprometerse y un comprometido no admite más", () => {
  assert.deepEqual(allowedEventTypes("identificado"), ["intento", "conversacion"]);
  assert.deepEqual(allowedEventTypes("contactado"), ["compromiso"]);
  assert.deepEqual(allowedEventTypes("comprometido"), []);
});

test("WhatsApp: solo un enlace wa.me con el número normalizado y SIN texto prellenado", () => {
  const normalizado = { whatsapp: "+5492231234567", whatsappNormalizado: true };
  assert.equal(whatsappUrl(normalizado), "https://wa.me/5492231234567");
  assert.equal(whatsappUrl({ ...normalizado, whatsapp: "+59899123456" }), "https://wa.me/59899123456");
  assert.equal(whatsappUrl(normalizado)?.includes("text="), false);
  // whatsappNormalizado=false: el operador revisa el número, no se arma el enlace.
  assert.equal(whatsappUrl({ whatsapp: "223 123-4567", whatsappNormalizado: false }), null);
  assert.equal(whatsappUrl({ whatsapp: "+5492231234567", whatsappNormalizado: false }), null);
  assert.equal(whatsappUrl({ whatsapp: "no-es-un-numero", whatsappNormalizado: true }), null);
  assert.equal(byIdNumber("PRE-DEMO-E06"), null, "el fixture de número dudoso no genera enlace");
  assert.match(byIdNumber("PRE-DEMO-E01") ?? "", /^https:\/\/wa\.me\/549223000\d{4}$/);
});

function byIdNumber(id: string): string | null {
  return whatsappUrl(byId(id));
}

test("el mensaje sugerido usa el primer nombre, los rubros y cambia según el estado de contacto", () => {
  const first = contactMessage(byId("PRE-DEMO-E04"));
  assert.match(first, /^Hola Gabriela, te escribimos de nuevo/);
  assert.match(first, /aire acondicionado y electricidad/);
  assert.match(contactMessage(byId("PRE-DEMO-E02")), /cómo sigue el alta/);
  assert.match(contactMessage(byId("PRE-DEMO-E05")), /gracias por la charla/);
});

test("isUuid reconoce solo UUID", () => {
  assert.equal(isUuid("0b6f0a52-6a40-4d6b-8f43-3a2d6c1e9a11"), true);
  assert.equal(isUuid("usuario@example.test"), false);
  assert.equal(isUuid("PRE-DEMO-U01"), false);
});

test("los fixtures son ficticios, sin datos que el contrato no tiene y vinculados con Especialistas", () => {
  for (const record of demoPreregistrosUsuarios) {
    assert.match(record.id, /^PRE-DEMO-/);
    assert.match(record.email, /@example\.com$/);
    assert.deepEqual(Object.keys(record).sort(), ["creadoEn", "email", "id", "tipo", "venceEn"]);
  }
  for (const record of demoPreregistrosEspecialistas) {
    assert.match(record.id, /^PRE-DEMO-/);
    assert.ok(record.email === undefined || /@example\.com$/.test(record.email));
    assert.match(record.whatsapp.replace(/\D/g, ""), /2230000\d{3}$/);
    assert.equal("cuit" in record, false);
    assert.equal(record.version, 1 + record.eventos.length);
  }
  assert.ok(demoPreregistrosEspecialistas.some((record) => record.email === undefined), "hay un especialista sin email");
  assert.ok(demoPreregistrosEspecialistas.some((record) => !record.whatsappNormalizado), "hay un número que hay que revisar");
  for (const specialist of demoSpecialists.filter((item) => item.preregistroId)) {
    assert.ok(demoPreregistrosEspecialistas.some((record) => record.id === specialist.preregistroId));
  }
});
