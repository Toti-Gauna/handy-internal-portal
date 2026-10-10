// Acciones de sesión de la interfaz: ingreso (con paso MFA opcional), cierre y recuperación del CSRF.
// La contraseña y el código TOTP pasan por acá solo como argumentos: no se guardan en ningún lado.

import { PortalSourceError } from "../data/portal-source.ts";
import { ficha, loginUi, resetLoginUi, sessionClient } from "./state.ts";
import { renderApp, renderLogin } from "./render.ts";

/** Redibuja cuando una sesión viva se pierde (vencimiento, cierre) o cambian sus permisos. */
export function watchSession(): void {
  sessionClient?.subscribe((snapshot, previous) => {
    // Pasar de "sin sesión" a una sesión lo dibuja el propio ingreso.
    if (previous === "anonymous") return;
    if (snapshot.state === "anonymous") {
      resetLoginUi(ficha.loggingOut ? "Cerraste la sesión." : "Tu sesión venció. Volvé a ingresar.");
      ficha.loggingOut = false;
      ficha.flash = undefined;
      ficha.draft = undefined;
    }
    void renderApp();
  });
}

function loginMessage(error: unknown, step: "credentials" | "mfa"): string {
  if (!(error instanceof PortalSourceError)) return "No se pudo ingresar. Probá de nuevo.";
  if (error.kind === "unauthorized") {
    return step === "mfa" ? "El código no es válido, ya se usó o el paso venció." : "Email o contraseña incorrectos.";
  }
  if (error.kind === "invalid_request") {
    return step === "mfa" ? "El código tiene 6 dígitos." : "Revisá el email y la contraseña (la contraseña tiene entre 12 y 128 caracteres).";
  }
  if (error.kind === "rate_limited") return "Demasiados intentos seguidos. Esperá unos minutos antes de volver a probar.";
  if (error.kind === "forbidden" && error.reason === "csrf_invalido") {
    return step === "mfa" ? "La verificación del formulario venció. Ingresá de nuevo." : "La verificación del formulario venció. Reintentá.";
  }
  return error.message;
}

function lockForm(form: HTMLFormElement): void {
  loginUi.busy = true;
  form.setAttribute("aria-busy", "true");
  form.querySelector("fieldset")?.setAttribute("disabled", "");
}

export async function submitLogin(form: HTMLFormElement): Promise<void> {
  if (!sessionClient || loginUi.busy) return;
  const data = new FormData(form);
  const email = String(data.get("email") ?? "").trim();
  const password = String(data.get("password") ?? "");
  loginUi.email = email;
  loginUi.error = undefined;
  loginUi.notice = undefined;
  lockForm(form);
  try {
    const outcome = await sessionClient.login(email, password);
    loginUi.busy = false;
    if (outcome.kind === "mfa") {
      loginUi.step = "mfa";
      renderLogin();
      return;
    }
    resetLoginUi();
    await renderApp();
  } catch (error) {
    loginUi.busy = false;
    loginUi.error = loginMessage(error, "credentials");
    renderLogin();
  }
}

export async function submitMfa(form: HTMLFormElement): Promise<void> {
  if (!sessionClient || loginUi.busy) return;
  const code = String(new FormData(form).get("code") ?? "").trim();
  loginUi.error = undefined;
  lockForm(form);
  try {
    await sessionClient.verifyMfa(code);
    resetLoginUi();
    await renderApp();
  } catch (error) {
    loginUi.busy = false;
    // Con el CSRF previo vencido el código ya no sirve: se vuelve al primer paso.
    if (error instanceof PortalSourceError && error.kind === "forbidden") loginUi.step = "credentials";
    loginUi.error = loginMessage(error, loginUi.step);
    renderLogin();
  }
}

export function cancelLogin(): void {
  sessionClient?.cancelLogin();
  loginUi.step = "credentials";
  loginUi.error = undefined;
  loginUi.busy = false;
  renderLogin();
}

export async function logout(): Promise<void> {
  if (!sessionClient) return;
  ficha.loggingOut = true;
  await sessionClient.logout();
}

/** Tras un 403 `csrf_invalido`: descarta el CSRF en memoria, pide el vigente y vuelve a dibujar. */
export async function resyncSession(): Promise<void> {
  try {
    await sessionClient?.resync();
  } catch {
    // Si ya no hay sesión, el cambio de estado dibuja el login; si es un corte, renderApp muestra el error.
  }
  await renderApp();
}
