// Fixtures ficticios. Nombres inventados, emails en example.com, WhatsApp de especialistas en el bloque 223 000-xxxx
// (no asignado a personas reales) e IDs *-DEMO-*. Nunca reemplazar por datos reales.

import type { SpecialistRecord, OperationalEvent } from "../domain/specialists.ts";
import type { PreregistroEspecialista, PreregistroUsuario } from "../domain/preregistros.ts";

const actor = "Operador/a de muestra";

const completeMilestones = [
  { label: "Identidad verificada en instancia autorizada", state: "complete" as const },
  { label: "CUIT consultado", state: "complete" as const },
  { label: "Certificado exhibido en vivo; sin archivo ni resultado guardado", state: "complete" as const },
  { label: "Declaración jurada recibida", state: "complete" as const },
  { label: "Credencial de oficio aplicable", state: "not_applicable" as const },
];

function specialist(id: string, label: string, values: Partial<SpecialistRecord>): SpecialistRecord {
  return {
    id,
    label,
    trade: "Plomería",
    zone: "Centro",
    stage: "verificado",
    verificationLevel: "nivel_1",
    enabled: false,
    activity: "unknown",
    noticeAccepted: true,
    onboardingDateAccepted: true,
    verificationMilestones: completeMilestones,
    contractAcceptance: { accepted: false },
    payoutAccount: "not_linked",
    timeline: [],
    ...values,
  };
}

const registered = {
  contractAcceptance: { accepted: true, version: "Términos demo 0.1", date: "2026-10-02" },
  payoutAccount: "linked_name_confirmed" as const,
};

/** Especialistas desde Verificado. Las etapas previas se trabajan en Pre-registros. */
export const demoSpecialists: SpecialistRecord[] = [
  specialist("ESP-DEMO-001", "Martín G.", {
    trade: "Plomería",
    zone: "La Perla",
    preregistroId: "PRE-DEMO-E01",
    nextFollowUp: "2026-10-06T16:00:00-03:00",
    timeline: [
      { at: "2026-09-22T11:30:00-03:00", kind: "effective_contact", actor, summary: "Conversación efectiva por WhatsApp.", reason: "Aceptó fecha de alta." },
      { at: "2026-10-03T18:00:00-03:00", kind: "transition", actor, summary: "Etapa de muestra: verificado.", reason: "Hitos ficticios completos." },
    ],
  }),
  specialist("ESP-DEMO-002", "Lucía F.", {
    trade: "Electricidad",
    zone: "Los Troncos",
    verificationLevel: "nivel_2",
    nextFollowUp: "2026-10-07T10:00:00-03:00",
  }),
  specialist("ESP-DEMO-003", "Ramiro P.", { trade: "Cerrajería", zone: "Centro", verificationLevel: "en_curso" }),
  specialist("ESP-DEMO-004", "Analía S.", { stage: "registrado", trade: "Gas", zone: "Puerto", ...registered }),
  specialist("ESP-DEMO-005", "Hernán D.", { stage: "registrado", trade: "Albañilería", zone: "San Juan", ...registered }),
  specialist("ESP-DEMO-006", "Sofía R.", {
    stage: "habilitado",
    trade: "Aire acondicionado",
    zone: "Chauvín",
    enabled: true,
    verificationLevel: "nivel_2",
    ...registered,
  }),
  specialist("ESP-DEMO-007", "Diego A.", {
    stage: "activo",
    trade: "Plomería",
    zone: "Punta Mogotes",
    enabled: true,
    activity: "active",
    ...registered,
  }),
  specialist("ESP-DEMO-008", "Valeria T.", {
    stage: "habilitado",
    trade: "Electricidad",
    zone: "Constitución",
    enabled: true,
    activity: "inactive",
    ...registered,
  }),
  specialist("ESP-DEMO-009", "Pablo N.", {
    stage: "activo",
    trade: "Gas",
    zone: "Centro",
    enabled: true,
    activity: "active",
    verificationLevel: "nivel_2",
    ...registered,
  }),
  specialist("ESP-DEMO-010", "Carolina V.", { trade: "Albañilería", zone: "Batán", verificationLevel: "en_curso" }),
];

function attempt(at: string, nextFollowUp?: string): OperationalEvent {
  return { at, kind: "contact_attempt", actor, summary: "Intento por WhatsApp; no hubo respuesta.", nextFollowUp };
}

function conversation(at: string, reason: string): OperationalEvent {
  return { at, kind: "effective_contact", actor, summary: "Conversación efectiva; recibió la explicación de Handy.", reason };
}

function committed(at: string): OperationalEvent {
  return { at, kind: "transition", actor, summary: "Etapa de muestra: comprometido.", reason: "Aceptó una fecha de alta de muestra." };
}

function pre(
  n: number,
  nombre: string,
  values: Omit<PreregistroEspecialista, "id" | "nombre" | "email" | "tipo" | "etapa" | "eventos"> &
    Partial<Pick<PreregistroEspecialista, "etapa" | "eventos">>,
): PreregistroEspecialista {
  const id = String(n).padStart(2, "0");
  return {
    id: `PRE-DEMO-E${id}`,
    tipo: "especialista",
    nombre,
    email: `especialista${id}@example.com`,
    etapa: "identificado",
    eventos: [],
    ...values,
  };
}

export const demoPreregistrosEspecialistas: PreregistroEspecialista[] = [
  pre(1, "Martín G.", {
    whatsapp: "223 000-0101",
    rubros: ["plomeria", "gas"],
    zona: "La Perla y Centro",
    cuit: "si",
    creadoEn: "2026-09-20T09:12:00-03:00",
    etapa: "comprometido",
    especialistaId: "ESP-DEMO-001",
    eventos: [conversation("2026-09-22T11:30:00-03:00", "Le interesa sumarse."), committed("2026-09-22T11:35:00-03:00")],
  }),
  pre(2, "Rocío B.", {
    whatsapp: "+54 9 223 000 0102",
    rubros: ["electricidad"],
    zona: "Los Troncos",
    cuit: "en_tramite",
    creadoEn: "2026-10-05T08:40:00-03:00",
  }),
  pre(3, "Esteban L.", {
    whatsapp: "(0223) 000-0103",
    rubros: ["cerrajeria"],
    zona: "Toda la ciudad",
    cuit: "si",
    creadoEn: "2026-10-04T21:05:00-03:00",
  }),
  pre(4, "Gabriela C.", {
    whatsapp: "2230000104",
    rubros: ["aire_acondicionado", "electricidad"],
    zona: "Zona norte",
    cuit: "si",
    creadoEn: "2026-10-01T14:22:00-03:00",
    proximoSeguimiento: "2026-10-06T11:00:00-03:00",
    eventos: [attempt("2026-10-02T10:15:00-03:00"), attempt("2026-10-04T17:40:00-03:00", "2026-10-06T11:00:00-03:00")],
  }),
  pre(5, "Julián M.", {
    whatsapp: "223 000 0105",
    rubros: ["albanileria"],
    zona: "Puerto",
    cuit: "no",
    creadoEn: "2026-09-28T19:50:00-03:00",
    etapa: "contactado",
    proximoSeguimiento: "2026-10-07T18:00:00-03:00",
    eventos: [conversation("2026-09-30T12:00:00-03:00", "Pidió volver a hablar cuando tenga el CUIT.")],
  }),
  pre(6, "Natalia K.", {
    whatsapp: "223 000-0106",
    rubros: ["plomeria"],
    zona: "Constitución",
    cuit: "si",
    creadoEn: "2026-10-03T10:02:00-03:00",
  }),
  pre(7, "Federico O.", {
    whatsapp: "+54 223 000-0107",
    rubros: ["gas"],
    zona: "San Juan y alrededores",
    cuit: "si",
    creadoEn: "2026-09-30T16:30:00-03:00",
    proximoSeguimiento: "2026-10-05T19:00:00-03:00",
    eventos: [attempt("2026-10-02T09:30:00-03:00", "2026-10-05T19:00:00-03:00")],
  }),
  pre(8, "Mariana E.", {
    whatsapp: "223 000 0108",
    rubros: ["electricidad", "aire_acondicionado"],
    zona: "Chauvín",
    cuit: "si",
    creadoEn: "2026-09-25T11:11:00-03:00",
    etapa: "comprometido",
    proximoSeguimiento: "2026-10-08T15:00:00-03:00",
    eventos: [
      attempt("2026-09-26T10:00:00-03:00"),
      conversation("2026-09-27T16:20:00-03:00", "Quiere arrancar en la primera semana."),
      committed("2026-09-27T16:25:00-03:00"),
    ],
  }),
  pre(9, "Ignacio H.", {
    whatsapp: "223 000-0109",
    rubros: ["cerrajeria", "albanileria"],
    zona: "Punta Mogotes",
    cuit: "en_tramite",
    creadoEn: "2026-10-05T12:18:00-03:00",
  }),
  pre(10, "Paula Z.", {
    whatsapp: "2230000110",
    rubros: ["plomeria", "albanileria"],
    zona: "Batán",
    cuit: "no",
    creadoEn: "2026-09-29T08:05:00-03:00",
    etapa: "contactado",
    eventos: [conversation("2026-10-01T13:10:00-03:00", "Está evaluando; volver a escribir la semana próxima.")],
  }),
  pre(11, "Tomás W.", {
    whatsapp: "223 000 0111",
    rubros: ["aire_acondicionado"],
    zona: "Centro",
    cuit: "si",
    creadoEn: "2026-10-02T20:45:00-03:00",
    eventos: [attempt("2026-10-03T11:00:00-03:00")],
  }),
  pre(12, "Agustina Y.", {
    whatsapp: "223 000-0112",
    rubros: ["electricidad"],
    zona: "La Perla",
    cuit: "si",
    creadoEn: "2026-10-04T09:30:00-03:00",
  }),
  pre(13, "Sebastián Q.", {
    whatsapp: "+54 9 223 000-0113",
    rubros: ["gas", "plomeria"],
    zona: "Los Troncos y Playa Grande",
    cuit: "si",
    creadoEn: "2026-09-27T15:00:00-03:00",
    etapa: "comprometido",
    eventos: [conversation("2026-09-28T10:40:00-03:00", "Quiere sumarse en cuanto salga la app."), committed("2026-09-28T10:45:00-03:00")],
  }),
  pre(14, "Lorena I.", {
    whatsapp: "223 000 0114",
    rubros: ["albanileria"],
    zona: "Constitución",
    cuit: "en_tramite",
    creadoEn: "2026-10-03T18:12:00-03:00",
  }),
];

/** El email queda solo en la fuente de muestra para simular la búsqueda de bajas en servidor. */
export type DemoUsuario = PreregistroUsuario & { email: string };

function usuario(
  n: number,
  nombre: string,
  values: Omit<PreregistroUsuario, "id" | "nombre" | "tipo" | "dejoWhatsapp"> & { dejoWhatsapp?: boolean },
): DemoUsuario {
  const id = String(n).padStart(2, "0");
  return { id: `PRE-DEMO-U${id}`, tipo: "usuario", nombre, email: `usuario${id}@example.com`, dejoWhatsapp: false, ...values };
}

export const demoPreregistrosUsuarios: DemoUsuario[] = [
  usuario(1, "Claudia R.", { barrio: "La Perla", necesidad: "Arreglar una pérdida en la cocina.", creadoEn: "2026-10-05T10:05:00-03:00" }),
  usuario(2, "Andrés P.", { barrio: "Centro", dejoWhatsapp: true, creadoEn: "2026-10-05T07:48:00-03:00" }),
  usuario(3, "Silvina M.", { barrio: "Los Troncos", necesidad: "Service del aire antes del verano.", creadoEn: "2026-10-04T22:30:00-03:00" }),
  usuario(4, "Marcos T.", { barrio: "Puerto", necesidad: "Cambiar la cerradura de la puerta.", dejoWhatsapp: true, creadoEn: "2026-10-04T13:12:00-03:00" }),
  usuario(5, "Florencia D.", { barrio: "Chauvín", creadoEn: "2026-10-03T19:40:00-03:00" }),
  usuario(6, "Germán A.", { barrio: "Constitución", necesidad: "Revisar el calefón.", creadoEn: "2026-10-03T09:02:00-03:00" }),
  usuario(7, "Verónica L.", { barrio: "San Juan", necesidad: "Humedad en una pared del living.", creadoEn: "2026-10-02T17:25:00-03:00" }),
  usuario(8, "Nicolás B.", { barrio: "Punta Mogotes", dejoWhatsapp: true, creadoEn: "2026-10-01T12:00:00-03:00" }),
  usuario(9, "Carla S.", { barrio: "Zona norte", necesidad: "Se cortó la luz en dos ambientes.", creadoEn: "2026-09-30T21:15:00-03:00" }),
  usuario(10, "Emiliano V.", { barrio: "Batán", creadoEn: "2026-09-29T08:44:00-03:00" }),
  usuario(11, "Daniela G.", { barrio: "Centro", necesidad: "Instalar un aire nuevo.", creadoEn: "2026-09-27T16:10:00-03:00" }),
];
