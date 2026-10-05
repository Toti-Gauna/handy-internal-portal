import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Desarrollo local contra el backend: VITE_API_BASE_URL=/api y API_PROXY_TARGET=http://localhost:3000.
  // El navegador ve un solo origen, así la cookie de sesión funciona sin CORS ni SameSite=None.
  const proxyTarget = env.API_PROXY_TARGET;

  return {
    base: process.env.GITHUB_PAGES === "true" ? "/handy-internal-portal/" : "/",
    appType: "spa",
    server: {
      host: "127.0.0.1",
      proxy: proxyTarget
        ? { "/api": { target: proxyTarget, changeOrigin: true, rewrite: (path: string) => path.replace(/^\/api/, "") } }
        : undefined,
    },
  };
});
