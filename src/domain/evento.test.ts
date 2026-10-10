import assert from "node:assert/strict";
import test from "node:test";
import { SubmissionKeys, buildEventoEntrada, uuidv4, validateEvento } from "./evento.ts";

const NOW = new Date("2026-10-10T15:00:00.000Z");
const dias = (n: number): string => new Date(NOW.getTime() + n * 86_400_000).toISOString();
const identificado = { etapa: "identificado", venceEn: dias(300) } as const;
const contactado = { etapa: "contactado", venceEn: dias(300) } as const;

test("un intento o una conversación en Identificado con nota es válido; sin nota o pasada de 140 no", () => {
  assert.deepEqual(validateEvento({ tipo: "intento", motivo: "Sin respuesta" }, identificado, NOW), {});
  assert.deepEqual(validateEvento({ tipo: "conversacion", motivo: "Hablamos" }, identificado, NOW), {});
  assert.ok(validateEvento({ tipo: "intento", motivo: "   " }, identificado, NOW).motivo);
  assert.ok(validateEvento({ tipo: "intento", motivo: "x".repeat(141) }, identificado, NOW).motivo);
  assert.deepEqual(validateEvento({ tipo: "intento", motivo: "x".repeat(140) }, identificado, NOW), {});
});

test("el tipo tiene que corresponder a la etapa", () => {
  assert.ok(validateEvento({ tipo: "", motivo: "ok" }, identificado, NOW).tipo);
  assert.ok(validateEvento({ tipo: "compromiso", motivo: "ok", fechaAltaAceptada: dias(5) }, identificado, NOW).tipo);
  assert.ok(validateEvento({ tipo: "conversacion", motivo: "ok" }, contactado, NOW).tipo);
  assert.ok(validateEvento({ tipo: "intento", motivo: "ok" }, { etapa: "comprometido", venceEn: dias(300) }, NOW).tipo);
});

test("el compromiso exige fecha de alta acordada: desde ahora, hasta 90 días y antes del vencimiento", () => {
  const base = { tipo: "compromiso", motivo: "Acordamos" } as const;
  assert.ok(validateEvento(base, contactado, NOW).fechaAltaAceptada, "falta");
  assert.deepEqual(validateEvento({ ...base, fechaAltaAceptada: dias(10) }, contactado, NOW), {});
  assert.deepEqual(validateEvento({ ...base, fechaAltaAceptada: dias(90) }, contactado, NOW), {});
  assert.ok(validateEvento({ ...base, fechaAltaAceptada: dias(91) }, contactado, NOW).fechaAltaAceptada, "más de 90 días");
  assert.ok(validateEvento({ ...base, fechaAltaAceptada: dias(-1) }, contactado, NOW).fechaAltaAceptada, "en el pasado");
  assert.ok(
    validateEvento({ ...base, fechaAltaAceptada: dias(10) }, { etapa: "contactado", venceEn: dias(5) }, NOW).fechaAltaAceptada,
    "después del vencimiento",
  );
});

test("la fecha de alta solo va en el compromiso y NO puede ser igual al próximo seguimiento", () => {
  assert.ok(validateEvento({ tipo: "intento", motivo: "ok", fechaAltaAceptada: dias(5) }, identificado, NOW).fechaAltaAceptada);
  const mismaFecha = validateEvento({ tipo: "compromiso", motivo: "ok", fechaAltaAceptada: dias(5), proximoSeguimiento: dias(5) }, contactado, NOW);
  assert.ok(mismaFecha.proximoSeguimiento);
  assert.deepEqual(validateEvento({ tipo: "compromiso", motivo: "ok", fechaAltaAceptada: dias(5), proximoSeguimiento: dias(2) }, contactado, NOW), {});
});

test("el próximo seguimiento admite 5 minutos de tolerancia hacia atrás y no pasa del vencimiento", () => {
  const base = { tipo: "intento", motivo: "ok" } as const;
  assert.deepEqual(validateEvento({ ...base, proximoSeguimiento: new Date(NOW.getTime() - 4 * 60_000).toISOString() }, identificado, NOW), {});
  assert.ok(validateEvento({ ...base, proximoSeguimiento: new Date(NOW.getTime() - 6 * 60_000).toISOString() }, identificado, NOW).proximoSeguimiento);
  assert.ok(validateEvento({ ...base, proximoSeguimiento: dias(301) }, identificado, NOW).proximoSeguimiento);
});

test("el cuerpo omite lo vacío, recorta la nota y lleva la versión vista", () => {
  assert.deepEqual(buildEventoEntrada({ tipo: "intento", motivo: "  hola  " }, 3), { tipo: "intento", motivo: "hola", version: 3 });
  assert.deepEqual(
    buildEventoEntrada({ tipo: "compromiso", motivo: "ok", proximoSeguimiento: "", fechaAltaAceptada: dias(5) }, 4),
    { tipo: "compromiso", motivo: "ok", version: 4, fechaAltaAceptada: dias(5) },
  );
});

test("uuidv4 genera UUIDv4 distintos", () => {
  const a = uuidv4();
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.notEqual(a, uuidv4());
});

test("la clave de idempotencia se REUSA al reintentar el mismo envío y cambia con otro cuerpo, otra ficha o tras terminar", () => {
  let n = 0;
  const keys = new SubmissionKeys(() => `clave-${++n}`);
  const cuerpo = buildEventoEntrada({ tipo: "intento", motivo: "Sin respuesta" }, 2);

  const primera = keys.keyFor("ficha-1", cuerpo);
  assert.equal(keys.keyFor("ficha-1", cuerpo), primera, "reintento del mismo envío");
  assert.equal(keys.keyFor("ficha-1", { ...cuerpo }), primera, "mismo contenido");

  const otroCuerpo = keys.keyFor("ficha-1", buildEventoEntrada({ tipo: "intento", motivo: "Otro texto" }, 2));
  assert.notEqual(otroCuerpo, primera, "otro cuerpo = otro envío");
  assert.notEqual(keys.keyFor("ficha-2", cuerpo), otroCuerpo, "otra ficha = otro envío");

  const antes = keys.keyFor("ficha-2", cuerpo);
  keys.release();
  assert.notEqual(keys.keyFor("ficha-2", cuerpo), antes, "después de un éxito, el próximo envío estrena clave");
});
