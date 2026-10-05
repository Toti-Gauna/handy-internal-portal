import type { SpecialistRecord } from "../domain/specialists.ts";
import type { UserRecord } from "../domain/directories.ts";

const pendingMilestones = [
  { label: "Identidad verificada en instancia autorizada", state: "pending" as const },
  { label: "CUIT consultado", state: "pending" as const },
  { label: "Certificado exhibido en vivo; sin archivo ni resultado guardado", state: "pending" as const },
  { label: "Declaración jurada recibida", state: "pending" as const },
  { label: "Credencial de oficio aplicable", state: "not_applicable" as const },
];

function specialist(
  id: string,
  index: number,
  values: Partial<SpecialistRecord>,
): SpecialistRecord {
  return {
    id,
    label: `Especialista de muestra ${String(index).padStart(2, "0")}`,
    trade: "Plomería",
    zone: "Zona demostrativa A",
    stage: "identificado",
    verificationLevel: "sin_iniciar",
    enabled: false,
    activity: "unknown",
    noticeAccepted: false,
    onboardingDateAccepted: false,
    verificationMilestones: pendingMilestones,
    contractAcceptance: { accepted: false },
    payoutAccount: "not_linked",
    timeline: [],
    ...values,
  };
}

export const demoSpecialists: SpecialistRecord[] = [
  specialist("ESP-DEMO-001", 1, {
    stage: "comprometido",
    verificationLevel: "en_curso",
    trade: "Plomería",
    zone: "Zona demostrativa A",
    nextFollowUp: "2026-10-06T16:00:00-03:00",
    noticeAccepted: true,
    onboardingDateAccepted: true,
    timeline: [
      {
        at: "2026-10-04T18:00:00-03:00",
        kind: "contact_attempt",
        actor: "Operador/a de muestra",
        summary: "Intento de contacto; no hubo respuesta.",
        reason: "Primera invitación al alta.",
        nextFollowUp: "2026-10-06T16:00:00-03:00",
      },
      {
        at: "2026-10-05T11:30:00-03:00",
        kind: "effective_contact",
        actor: "Operador/a de muestra",
        summary: "Conversación efectiva; recibió la explicación de Handy.",
        reason: "Aceptó una fecha de alta de muestra.",
      },
      {
        at: "2026-10-05T11:35:00-03:00",
        kind: "transition",
        actor: "Operador/a de muestra",
        summary: "Etapa de muestra: comprometido.",
        reason: "Aviso y fecha de alta ficticios registrados en el ejemplo.",
      },
    ],
  }),
  specialist("ESP-DEMO-002", 2, {
    stage: "contactado",
    trade: "Electricidad",
    zone: "Zona demostrativa B",
    timeline: [
      {
        at: "2026-10-05T10:00:00-03:00",
        kind: "effective_contact",
        actor: "Operador/a de muestra",
        summary: "Conversación efectiva; recibió la explicación de Handy.",
        reason: "Ejemplo ficticio.",
      },
    ],
  }),
  specialist("ESP-DEMO-003", 3, {
    stage: "identificado",
    trade: "Aire acondicionado",
    zone: "Zona demostrativa C",
  }),
  specialist("ESP-DEMO-004", 4, {
    stage: "verificado",
    verificationLevel: "nivel_1",
    trade: "Cerrajería",
    zone: "Zona demostrativa A",
    verificationMilestones: pendingMilestones.map((milestone) => ({
      ...milestone,
      state: milestone.state === "not_applicable" ? "not_applicable" : "complete",
    })),
    timeline: [
      {
        at: "2026-10-03T18:00:00-03:00",
        kind: "transition",
        actor: "Operador/a de muestra",
        summary: "Etapa de muestra: verificado.",
        reason: "Todos los hitos ficticios aparecen completos.",
      },
    ],
  }),
  specialist("ESP-DEMO-005", 5, {
    stage: "registrado",
    verificationLevel: "nivel_1",
    trade: "Gas",
    zone: "Zona demostrativa B",
    verificationMilestones: pendingMilestones.map((milestone) => ({
      ...milestone,
      state: milestone.state === "not_applicable" ? "complete" : "complete",
    })),
    contractAcceptance: { accepted: true, version: "Términos demo 0.1", date: "2026-10-03" },
    payoutAccount: "linked_name_confirmed",
  }),
  specialist("ESP-DEMO-006", 6, {
    stage: "habilitado",
    verificationLevel: "nivel_2",
    trade: "Albañilería",
    zone: "Zona demostrativa C",
    enabled: true,
    verificationMilestones: pendingMilestones.map((milestone) => ({
      ...milestone,
      state: "complete",
    })),
    contractAcceptance: { accepted: true, version: "Términos demo 0.1", date: "2026-10-02" },
    payoutAccount: "linked_name_confirmed",
  }),
  specialist("ESP-DEMO-007", 7, {
    stage: "activo",
    verificationLevel: "nivel_1",
    trade: "Plomería",
    zone: "Zona demostrativa B",
    enabled: true,
    activity: "active",
    verificationMilestones: pendingMilestones.map((milestone) => ({
      ...milestone,
      state: "complete",
    })),
    contractAcceptance: { accepted: true, version: "Términos demo 0.1", date: "2026-10-01" },
    payoutAccount: "linked_name_confirmed",
  }),
  specialist("ESP-DEMO-008", 8, {
    stage: "comprometido",
    verificationLevel: "en_curso",
    trade: "Electricidad",
    zone: "Zona demostrativa C",
    noticeAccepted: true,
    onboardingDateAccepted: true,
  }),
  specialist("ESP-DEMO-009", 9, {
    stage: "contactado",
    trade: "Gas",
    zone: "Zona demostrativa A",
    verificationLevel: "sin_iniciar",
  }),
  specialist("ESP-DEMO-010", 10, {
    stage: "identificado",
    trade: "Cerrajería",
    zone: "Zona demostrativa C",
  }),
  specialist("ESP-DEMO-011", 11, {
    stage: "contactado",
    trade: "Albañilería",
    zone: "Zona demostrativa B",
  }),
  specialist("ESP-DEMO-012", 12, {
    stage: "comprometido",
    verificationLevel: "en_curso",
    trade: "Aire acondicionado",
    zone: "Zona demostrativa A",
    noticeAccepted: true,
    onboardingDateAccepted: true,
  }),
];

export const demoUsers: UserRecord[] = Array.from({ length: 9 }, (_, index) => {
  const number = String(index + 1).padStart(2, "0");
  return {
    id: `USR-DEMO-${number}`,
    label: `Cuenta de muestra ${number}`,
    registeredOn: `2026-10-${String(1 + index).padStart(2, "0")}`,
    sampleState: index % 3 === 0 ? "Pendiente · ficticio" : "Activa · ficticio",
  };
});

export const demoFollowUps = [
  {
    specialistId: "ESP-DEMO-001",
    label: "Especialista de muestra 01",
    dueAt: "2026-10-06T16:00:00-03:00",
    reason: "Confirmar disponibilidad para el alta ficticia.",
  },
  {
    specialistId: "ESP-DEMO-008",
    label: "Especialista de muestra 08",
    dueAt: "2026-10-07T17:00:00-03:00",
    reason: "Revisar fecha de alta ficticia.",
  },
];
