import type { Permiso } from "../contracts/landing-api.ts";

/**
 * loading: todavía se consulta la sesión · anonymous: sin sesión (login) · denied: sesión válida sin el permiso
 * mínimo del portal · authenticated: sesión viva con permisos conocidos.
 */
export type SessionState = "loading" | "anonymous" | "denied" | "authenticated";

export type Permisos = readonly Permiso[];

/**
 * Defensa de interfaz, NO control de acceso: el backend exige sesión, CSRF, origen y permiso en cada endpoint.
 * Estas funciones solo evitan mostrar acciones que el servidor va a rechazar. Denegar por defecto.
 */
export function canOpenInternalRoute(session: SessionState): boolean {
  return session === "authenticated";
}

export function hasPermission(permisos: Permisos, needed: Permiso): boolean {
  return permisos.includes(needed);
}

/** Resumen, listas y fichas (`preregistros:read`). */
export function canReadPreregistros(permisos: Permisos): boolean {
  return hasPermission(permisos, "preregistros:read");
}

/** Registrar contactos y abrir WhatsApp: el backend exige `preregistros:contact` y también `read` (devuelve la ficha). */
export function canContactPreregistros(permisos: Permisos): boolean {
  return hasPermission(permisos, "preregistros:contact") && canReadPreregistros(permisos);
}

/** Búsqueda exacta de un usuario por su email, para atender pedidos de baja o acceso (`preregistros:support`). */
export function canSearchUsersByEmail(permisos: Permisos): boolean {
  return hasPermission(permisos, "preregistros:support") && canReadPreregistros(permisos);
}

/** Ninguna acción administrativa corre en la muestra, sin sesión viva o sin el permiso de contacto. */
export function canRegisterContact(session: SessionState, permisos: Permisos, previewMode: boolean): boolean {
  return !previewMode && canOpenInternalRoute(session) && canContactPreregistros(permisos);
}

export function shouldShowSyntheticPreview(previewMode: boolean): boolean {
  return previewMode;
}
