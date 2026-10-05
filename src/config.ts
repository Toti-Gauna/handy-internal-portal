// Configuración por build. Vite reemplaza import.meta.env en el bundle.

/**
 * URL base de Handy-landing-page-be, sin barra final (ej.: https://api.ejemplo.com o /api con el proxy de desarrollo).
 * Vacía = sin backend: el portal usa PendingPortalDataSource y no hace pedidos HTTP.
 * No se configura en el deploy de GitHub Pages: esa demo pública nunca se conecta a datos reales (TECH-31).
 */
export const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/+$/, "");

/** Tiempo máximo de cada pedido al backend. */
export const TIMEOUT_MS = 15000;
