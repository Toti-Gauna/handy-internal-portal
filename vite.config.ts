import { defineConfig, loadEnv, type Plugin } from "vite";

/** Base de la app: `BASE_PATH` (con barras, ej. "/" para interno.handyc.com) manda; si no, GitHub Pages usa su subruta y el resto "/". */
function resolveBase(env: Record<string, string | undefined>): string {
  const explicit = env.BASE_PATH?.trim();
  const base = explicit ? explicit : env.GITHUB_PAGES === "true" ? "/handy-internal-portal/" : "/";
  if (!/^\/([A-Za-z0-9._~-]+\/)*$/.test(base)) {
    throw new Error('BASE_PATH inválida: tiene que empezar y terminar con "/" (ej.: "/" o "/portal/").');
  }
  return base;
}

/**
 * Política de contenido del build: scripts y estilos solo propios, y los pedidos de red únicamente al API configurado.
 * Va en un <meta> porque el hosting estático no define cabeceras; `frame-ancestors` no se puede expresar así.
 */
function contentSecurityPolicy(apiBaseUrl: string): string {
  // Sin API configurado (build de muestra) el bundle no hace ningún pedido de red.
  let connect = "'none'";
  if (/^https?:\/\//i.test(apiBaseUrl)) connect = new URL(apiBaseUrl).origin;
  else if (apiBaseUrl.startsWith("/")) connect = "'self'";
  return [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src ${connect}`,
    "base-uri 'none'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

function cspPlugin(apiBaseUrl: string): Plugin {
  return {
    name: "handy-csp",
    apply: "build",
    transformIndexHtml() {
      return [
        {
          tag: "meta",
          attrs: { "http-equiv": "Content-Security-Policy", content: contentSecurityPolicy(apiBaseUrl) },
          injectTo: "head-prepend",
        },
      ];
    },
  };
}

export default defineConfig(({ mode }) => {
  // Solo se leen VITE_API_BASE_URL y BASE_PATH; ninguna otra variable del entorno llega al bundle.
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  const apiBaseUrl = (env.VITE_API_BASE_URL ?? "").trim();

  // TECH-31: el sitio de revisión en GitHub Pages es público y nunca se conecta a datos reales.
  if (env.GITHUB_PAGES === "true" && apiBaseUrl) {
    throw new Error("GITHUB_PAGES=true no puede construirse con VITE_API_BASE_URL: la demo pública no se conecta a un backend (TECH-31).");
  }

  return {
    base: resolveBase(env),
    appType: "spa",
    plugins: [cspPlugin(apiBaseUrl)],
    build: {
      // El dist no incluye código fuente ni mapas.
      sourcemap: false,
    },
    server: {
      // Origen fijo: el backend lo tiene que listar en ADMIN_ALLOWED_ORIGINS (http://127.0.0.1:5174).
      host: "127.0.0.1",
      port: 5174,
      strictPort: true,
    },
  };
});
