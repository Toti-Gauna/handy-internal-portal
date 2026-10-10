// Configuración por build. Vite reemplaza import.meta.env en el bundle.

/**
 * URL base de Handy-landing-page-be, sin barra final (ej.: https://api.handyc.com o http://127.0.0.1:3000 en desarrollo).
 * Es PÚBLICA (queda en el bundle) y es la única variable del portal. Con valor: login y datos reales.
 * Vacía = sin backend: solo existe la vista de muestra (?demo=1) y el portal no hace pedidos HTTP.
 * No se configura en el deploy de GitHub Pages: esa demo pública nunca se conecta a datos reales (TECH-31).
 */
export const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/+$/, "");

/** Tiempo máximo de cada pedido al backend. */
export const TIMEOUT_MS = 15000;
