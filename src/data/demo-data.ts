// Fixtures ficticios. Nombres inventados, emails en example.com, WhatsApp de especialistas en el bloque 223 000-xxxx
// (no asignado a personas reales) e IDs *-DEMO-*. Nunca reemplazar por datos reales.

import type { SpecialistRecord } from "../domain/specialists.ts";
import type { PreregistroEspecialista, PreregistroEvento, PreregistroUsuario, Rubro } from "../domain/preregistros.ts";

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

let eventSeq = 0;

function event(tipo: PreregistroEvento["tipo"], fecha: string, extra: Partial<PreregistroEvento> = {}): PreregistroEvento {
  eventSeq += 1;
  return { id: `EVT-DEMO-${String(eventSeq).padStart(3, "0")}`, fecha, tipo, actor, ...extra };
}

function attempt(at: string, proximoSeguimiento?: string): PreregistroEvento {
  return event("intento", at, { motivo: "Intento por WhatsApp; no hubo respuesta.", proximoSeguimiento });
}

function conversation(at: string, motivo: string): PreregistroEvento {
  return event("conversacion", at, { motivo });
}

function committed(at: string, fechaAltaAceptada = "2026-10-20T10:00:00-03:00"): PreregistroEvento {
  return event("compromiso", at, { motivo: "Aceptó una fecha de alta de muestra.", fechaAltaAceptada });
}

/** El registro vence a los 12 meses de anotarse (retención 04-A). */
function expiry(creadoEn: string): string {
  const date = new Date(creadoEn);
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date.toISOString();
}

interface PreValues {
  rubros: Rubro[];
  zona: string;
  creadoEn: string;
  etapa?: PreregistroEspecialista["etapa"];
  eventos?: PreregistroEvento[];
  proximoSeguimiento?: string;
  fechaAltaAceptada?: string;
  whatsapp?: string;
  /** false = el número no se pudo normalizar con certeza: la ficha pide revisarlo. */
  whatsappNormalizado?: boolean;
  /** El email es opcional en el formulario de la landing. */
  sinEmail?: boolean;
}

/** Los campos derivados (contacto, intentos, versión) los calcula el servidor real; acá se simulan. */
function pre(n: number, nombre: string, values: PreValues): PreregistroEspecialista {
  const id = String(n).padStart(2, "0");
  const etapa = values.etapa ?? "identificado";
  const eventos = values.eventos ?? [];
  const intentos = eventos.filter((item) => item.tipo === "intento").length;
  const alta = eventos.find((item) => item.tipo === "compromiso")?.fechaAltaAceptada;
  return {
    id: `PRE-DEMO-E${id}`,
    tipo: "especialista",
    nombre,
    whatsapp: values.whatsapp ?? `+549223000${String(100 + n).padStart(4, "0")}`,
    whatsappNormalizado: values.whatsappNormalizado ?? true,
    email: values.sinEmail ? undefined : `especialista${id}@example.com`,
    rubros: values.rubros,
    zona: values.zona,
    creadoEn: values.creadoEn,
    venceEn: expiry(values.creadoEn),
    etapa,
    contacto: etapa === "identificado" ? (intentos > 0 ? "con_intentos" : "sin_contactar") : etapa,
    intentos,
    proximoSeguimiento: values.proximoSeguimiento,
    fechaAltaAceptada: values.fechaAltaAceptada ?? alta,
    version: 1 + eventos.length,
    eventos,
  };
}

export const demoPreregistrosEspecialistas: PreregistroEspecialista[] = [
  pre(1, "Martín G.", {
    rubros: ["plomeria", "gas"],
    zona: "La Perla y Centro",
    creadoEn: "2026-09-20T09:12:00-03:00",
    etapa: "comprometido",
    eventos: [conversation("2026-09-22T11:30:00-03:00", "Le interesa sumarse."), committed("2026-09-22T11:35:00-03:00")],
  }),
  pre(2, "Rocío B.", {
    rubros: ["electricidad"],
    zona: "Los Troncos",
    creadoEn: "2026-10-05T08:40:00-03:00",
  }),
  pre(3, "Esteban L.", {
    rubros: ["cerrajeria"],
    zona: "Toda la ciudad",
    creadoEn: "2026-10-04T21:05:00-03:00",
  }),
  pre(4, "Gabriela C.", {
    rubros: ["aire_acondicionado", "electricidad"],
    zona: "Zona norte",
    creadoEn: "2026-10-01T14:22:00-03:00",
    proximoSeguimiento: "2026-10-06T11:00:00-03:00",
    eventos: [attempt("2026-10-02T10:15:00-03:00"), attempt("2026-10-04T17:40:00-03:00", "2026-10-06T11:00:00-03:00")],
  }),
  pre(5, "Julián M.", {
    rubros: ["albanileria"],
    zona: "Puerto",
    creadoEn: "2026-09-28T19:50:00-03:00",
    etapa: "contactado",
    proximoSeguimiento: "2026-10-07T18:00:00-03:00",
    eventos: [conversation("2026-09-30T12:00:00-03:00", "Pidió volver a hablar la semana próxima.")],
  }),
  pre(6, "Natalia K.", {
    whatsapp: "223 000-0106",
    whatsappNormalizado: false,
    rubros: ["plomeria"],
    zona: "Constitución",
    creadoEn: "2026-10-03T10:02:00-03:00",
  }),
  pre(7, "Federico O.", {
    rubros: ["gas"],
    zona: "San Juan y alrededores",
    creadoEn: "2026-09-30T16:30:00-03:00",
    proximoSeguimiento: "2026-10-05T19:00:00-03:00",
    eventos: [attempt("2026-10-02T09:30:00-03:00", "2026-10-05T19:00:00-03:00")],
  }),
  pre(8, "Mariana E.", {
    rubros: ["electricidad", "aire_acondicionado"],
    zona: "Chauvín",
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
    rubros: ["cerrajeria", "albanileria"],
    zona: "Punta Mogotes",
    sinEmail: true,
    creadoEn: "2026-10-05T12:18:00-03:00",
  }),
  pre(10, "Paula Z.", {
    rubros: ["plomeria", "albanileria"],
    zona: "Batán",
    creadoEn: "2026-09-29T08:05:00-03:00",
    etapa: "contactado",
    eventos: [conversation("2026-10-01T13:10:00-03:00", "Está evaluando; volver a escribir la semana próxima.")],
  }),
  pre(11, "Tomás W.", {
    rubros: ["aire_acondicionado"],
    zona: "Centro",
    creadoEn: "2026-10-02T20:45:00-03:00",
    eventos: [attempt("2026-10-03T11:00:00-03:00")],
  }),
  pre(12, "Agustina Y.", {
    rubros: ["electricidad"],
    zona: "La Perla",
    creadoEn: "2026-10-04T09:30:00-03:00",
  }),
  pre(13, "Sebastián Q.", {
    rubros: ["gas", "plomeria"],
    zona: "Los Troncos y Playa Grande",
    creadoEn: "2026-09-27T15:00:00-03:00",
    etapa: "comprometido",
    eventos: [conversation("2026-09-28T10:40:00-03:00", "Quiere sumarse en cuanto salga la app."), committed("2026-09-28T10:45:00-03:00")],
  }),
  pre(14, "Lorena I.", {
    rubros: ["albanileria"],
    zona: "Constitución",
    creadoEn: "2026-10-03T18:12:00-03:00",
  }),
];

/** El email queda solo en la fuente de muestra para simular la búsqueda exacta de soporte (bajas y accesos). */
export type DemoUsuario = PreregistroUsuario & { email: string };

function usuario(n: number, creadoEn: string): DemoUsuario {
  const id = String(n).padStart(2, "0");
  return { id: `PRE-DEMO-U${id}`, tipo: "usuario", email: `usuario${id}@example.com`, creadoEn, venceEn: expiry(creadoEn) };
}

export const demoPreregistrosUsuarios: DemoUsuario[] = [
  usuario(1, "2026-10-05T10:05:00-03:00"),
  usuario(2, "2026-10-05T07:48:00-03:00"),
  usuario(3, "2026-10-04T22:30:00-03:00"),
  usuario(4, "2026-10-04T13:12:00-03:00"),
  usuario(5, "2026-10-03T19:40:00-03:00"),
  usuario(6, "2026-10-03T09:02:00-03:00"),
  usuario(7, "2026-10-02T17:25:00-03:00"),
  usuario(8, "2026-10-01T12:00:00-03:00"),
  usuario(9, "2026-09-30T21:15:00-03:00"),
  usuario(10, "2026-09-29T08:44:00-03:00"),
  usuario(11, "2026-09-27T16:10:00-03:00"),
];
