import assert from "node:assert/strict";
import test from "node:test";
import { demoPreregistrosEspecialistas, demoPreregistrosUsuarios, demoSpecialists } from "../data/demo-data.ts";
import {
  contactMessage,
  contactQueue,
  contactStatus,
  countByContactStatus,
  filterEspecialistas,
  filterUsuarios,
  whatsappDigits,
  whatsappUrl,
  type EspecialistaPreSearch,
} from "./preregistros.ts";

const blank: EspecialistaPreSearch = { search: "", rubro: "any", cuit: "any", contacto: "any", orden: "recientes", page: 1, pageSize: 8 };

function byId(id: string) {
  const record = demoPreregistrosEspecialistas.find((item) => item.id === id);
  assert.ok(record);
  return record;
}

test("un intento sin respuesta no mueve la etapa: sigue en Identificado con intentos", () => {
  const record = byId("PRE-DEMO-E04");
  assert.equal(record.etapa, "identificado");
  assert.equal(contactStatus(record), "con_intentos");
  assert.equal(contactStatus(byId("PRE-DEMO-E02")), "sin_contactar");
  assert.equal(contactStatus(byId("PRE-DEMO-E05")), "contactado");
});

test("los filtros de especialistas se combinan y buscan por WhatsApp sin formato", () => {
  const rows = filterEspecialistas(demoPreregistrosEspecialistas, { ...blank, rubro: "electricidad", cuit: "si", contacto: "sin_contactar" });
  assert.deepEqual(rows.map((row) => row.id), ["PRE-DEMO-E12"]);

  assert.deepEqual(filterEspecialistas(demoPreregistrosEspecialistas, { ...blank, search: "2230000103" }).map((row) => row.id), ["PRE-DEMO-E03"]);
  assert.equal(filterEspecialistas(demoPreregistrosEspecialistas, { ...blank, search: "plomeria" }).length, 4);
});

test("el orden por fecha respeta recientes y antiguos", () => {
  const recientes = filterEspecialistas(demoPreregistrosEspecialistas, blank);
  const antiguos = filterEspecialistas(demoPreregistrosEspecialistas, { ...blank, orden: "antiguos" });
  assert.equal(recientes[0]?.id, "PRE-DEMO-E09");
  assert.equal(antiguos[0]?.id, "PRE-DEMO-E01");
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
});

test("la búsqueda de usuarios encuentra por email para atender una baja", () => {
  assert.deepEqual(filterUsuarios(demoPreregistrosUsuarios, { search: "usuario07@example.com", orden: "recientes", page: 1, pageSize: 8 }).map((row) => row.id), ["PRE-DEMO-U07"]);
});

test("el WhatsApp de la landing se normaliza al formato de wa.me", () => {
  assert.equal(whatsappDigits("223 123-4567"), "5492231234567");
  assert.equal(whatsappDigits("(0223) 123-4567"), "5492231234567");
  assert.equal(whatsappDigits("+54 9 223 123 4567"), "5492231234567");
  assert.equal(whatsappDigits("+54 223 123-4567"), "5492231234567");
  assert.equal(whatsappDigits("+598 99 123 456"), "59899123456");
  assert.equal(whatsappDigits("1234"), null);
  assert.equal(whatsappUrl("abc", "hola"), null);

  const url = whatsappUrl("223 123-4567", "Hola Ana, ¿cómo andás?");
  assert.equal(url, "https://wa.me/5492231234567?text=Hola%20Ana%2C%20%C2%BFc%C3%B3mo%20and%C3%A1s%3F");
});

test("el mensaje sugerido usa el primer nombre, los rubros y cambia según el estado", () => {
  const first = contactMessage(byId("PRE-DEMO-E04"));
  assert.match(first, /^Hola Gabriela, te escribimos de nuevo/);
  assert.match(first, /aire acondicionado y electricidad/);
  assert.match(contactMessage(byId("PRE-DEMO-E02")), /cómo sigue el alta/);
});

test("los fixtures son ficticios y los vínculos con Especialistas existen", () => {
  for (const record of [...demoPreregistrosEspecialistas, ...demoPreregistrosUsuarios]) {
    assert.match(record.id, /^PRE-DEMO-/);
    assert.match(record.email, /@example\.com$/);
  }
  for (const record of demoPreregistrosEspecialistas) assert.match(record.whatsapp.replace(/\D/g, ""), /2230000\d{3}$/);
  for (const record of demoPreregistrosEspecialistas.filter((item) => item.especialistaId)) {
    assert.ok(demoSpecialists.some((specialist) => specialist.id === record.especialistaId && specialist.preregistroId === record.id));
  }
});
