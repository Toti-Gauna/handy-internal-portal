---
id: "PORTAL-ADR-0002"
type: "architecture-decision"
status: "provisional"
owner: "Tech"
updated: "2026-10-10"
related: ["TECH-06", "TECH-08", "TECH-31", "PORTAL-API-LANDING-BE", "PORTAL-ARCH-SECURITY", "PORTAL-ARCH-DEPLOYMENT"]
---

# ADR-0002 · Sesión del equipo y publicación estática

## Contexto

El backend de la landing implementó el login del equipo (Fase 2): email y contraseña contra `ADMIN_ACCOUNTS_JSON`, cookies `HttpOnly` host-only, `X-CSRF-Token` en los POST, refresh rotativo y `Origin` exacto en toda ruta `/auth` y `/admin`. El portal es una SPA estática que se publica en Hostinger, en la raíz de `https://interno.handyc.com`, y habla con `https://api.handyc.com`.

## Decisiones

1. **Sin credenciales ni tokens en el frontend.** El navegador maneja las cookies (`credentials: "include"`). El `csrfToken` vive solo en memoria de `AdminSessionClient`; nada administrativo va a `localStorage`, `sessionStorage`, cookies propias, IndexedDB ni URL. Una prueba estática lo vigila.
2. **Refresh serializado.** Una sola promesa de refresh en vuelo para todos los pedidos que reciben 401, con un único reintento. El backend revoca la familia de tokens si se reusa un refresh viejo.
3. **Idempotencia por envío.** Una clave UUIDv4 por envío de un evento, reusada solo mientras se reintenta el mismo cuerpo sobre la misma ficha.
4. **`VITE_API_BASE_URL` es la única variable y es pública.** Con valor: login y datos reales, y la muestra (`?demo=1`) deja de existir. Vacía: solo la muestra, sin pedidos de red. El build de GitHub Pages rechaza tener la variable (TECH-31).
5. **Origen cruzado también en desarrollo.** El backend exige `Origin` en los GET y el navegador no lo manda en pedidos del mismo origen, así que se eliminó el proxy `/api` de Vite: se desarrolla contra `http://127.0.0.1:3000` desde `http://127.0.0.1:5174` (puerto fijo).
6. **Base de Vite configurable.** `BASE_PATH` (con barras) manda; sin ella, `GITHUB_PAGES=true` usa `/handy-internal-portal/` y el resto `/`. La navegación es por hash, así que el hosting no necesita reglas de reescritura.
7. **CSP en el build.** Un `<meta http-equiv="Content-Security-Policy">` permite scripts, estilos y fuentes propios, imágenes propias y `data:`, y `connect-src` únicamente al origen del API configurado (`'none'` si no hay API). Sin mapas de código (`sourcemap: false`).

## Consecuencias

- Reiniciar o redeployar el backend (sesiones en memoria) obliga a volver a ingresar: el portal lo muestra como sesión vencida.
- Una meta CSP no puede fijar `frame-ancestors` ni otras cabeceras: si el hosting las permite (`.htaccess`/panel), conviene sumarlas (`X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors 'none'`, HSTS). Pendiente de decidir con quien opere Hostinger.
- El hosting final y el dominio siguen sin comprarse ni desplegarse.
