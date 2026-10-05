export type SessionState = "loading" | "anonymous" | "denied" | "authenticated";
export type ServerActionDecision = "unknown" | "denied" | "allowed";

export function canOpenInternalRoute(session: SessionState): boolean {
  return session === "authenticated";
}

export function canRunAdministrativeAction(
  session: SessionState,
  actionDecision: ServerActionDecision,
  previewMode: boolean,
): boolean {
  return !previewMode && session === "authenticated" && actionDecision === "allowed";
}

export function shouldShowSyntheticPreview(previewMode: boolean): boolean {
  return previewMode;
}
