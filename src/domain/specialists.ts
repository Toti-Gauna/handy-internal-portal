export const specialistStages = [
  "identificado",
  "contactado",
  "comprometido",
  "verificado",
  "registrado",
  "habilitado",
  "activo",
] as const;

export type SpecialistStage = (typeof specialistStages)[number];
export type VerificationLevel = "sin_iniciar" | "en_curso" | "nivel_1" | "nivel_2";
export type ActivityState = "active" | "inactive" | "unknown";
export type MilestoneState = "complete" | "pending" | "not_applicable";

export interface VerificationMilestone {
  label: string;
  state: MilestoneState;
}

export interface OperationalEvent {
  at: string;
  kind: "contact_attempt" | "effective_contact" | "transition" | "follow_up";
  actor: string;
  summary: string;
  reason?: string;
  nextFollowUp?: string;
}

export interface SpecialistRecord {
  id: string;
  label: string;
  trade: string;
  zone: string;
  stage: SpecialistStage;
  verificationLevel: VerificationLevel;
  enabled: boolean;
  activity: ActivityState;
  nextFollowUp?: string;
  noticeAccepted: boolean;
  onboardingDateAccepted: boolean;
  verificationMilestones: VerificationMilestone[];
  contractAcceptance: { accepted: boolean; version?: string; date?: string };
  payoutAccount: "not_linked" | "linked_name_confirmed";
  timeline: OperationalEvent[];
  /** Pre-registro de la landing que originó la ficha, si lo hubo. */
  preregistroId?: string;
}

export const stageLabels: Record<SpecialistStage, string> = {
  identificado: "Identificado",
  contactado: "Contactado",
  comprometido: "Comprometido",
  verificado: "Verificado",
  registrado: "Registrado",
  habilitado: "Habilitado",
  activo: "Activo",
};

export const preRegistrationStages = new Set<SpecialistStage>([
  "identificado",
  "contactado",
  "comprometido",
]);

export const postRegistrationStages = specialistStages.filter((stage) => !preRegistrationStages.has(stage));

export function stageGroup(stage: SpecialistStage): "pre_registro" | "post_registro" {
  return preRegistrationStages.has(stage) ? "pre_registro" : "post_registro";
}

export function isSpecialistStage(value: string): value is SpecialistStage {
  return specialistStages.includes(value as SpecialistStage);
}
