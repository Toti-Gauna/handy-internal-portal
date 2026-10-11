---
id: "PORTAL-ARCH-DEPLOYMENT"
type: "architecture"
status: "provisional"
owner: "Tech"
updated: "2026-10-10"
related: ["TECH-06", "TECH-09", "TECH-21", "TECH-31", "TECH-32", "PORTAL-ADR-0002"]
---

# Entornos y publicación

## Estado

Hay un despliegue de revisión en GitHub Pages: <https://toti-gauna.github.io/handy-internal-portal/?demo=1#/inicio>. El repositorio y el sitio son públicos. El workflow `.github/workflows/pages.yml` valida lint, typecheck y tests, construye `dist/` con la base `/handy-internal-portal/` y publica en cada push a `main` o al ejecutarlo manualmente.

Ese hosting sirve únicamente para revisar la muestra con fixtures ficticios: **no se construye con `VITE_API_BASE_URL`** (el build falla si `GITHUB_PAGES=true` y la variable están juntas) y no se deben cargar datos reales ni habilitar operaciones allí (TECH-31).

El portal operativo está previsto como sitio estático en Hostinger, en la raíz de `https://interno.handyc.com`, hablando con `https://api.handyc.com`. **Ninguno de los dos está comprado ni desplegado.**

## Desarrollo

- Node.js 20.19+ o 22.12+. `npm install`, `npm run dev` (Vite en `http://127.0.0.1:5174`, puerto fijo).
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- Contra el backend local: `VITE_API_BASE_URL=http://127.0.0.1:3000` en `.env.local`, y en el backend `AUTH_ENABLED=true` y `ADMIN_ALLOWED_ORIGINS=http://127.0.0.1:5174`. No hay proxy de desarrollo a propósito: el backend exige `Origin` también en los GET y el navegador no lo manda en pedidos del mismo origen ([ADR-0002](../adr/ADR-0002-sesion-del-equipo-y-publicacion.md)).

## Build operativo para Hostinger (dominio en la raíz)

```sh
VITE_API_BASE_URL=https://api.handyc.com BASE_PATH=/ npm run build
```

Sube el contenido de `dist/` a `public_html/` del dominio `interno.handyc.com`. `dist/` contiene solo `index.html` y `assets/` (JS, CSS, fuentes e imágenes): **sin `.env`, sin mapas de código y sin fuentes**. La navegación es por hash (`#/inicio`), así que el hosting no necesita reglas de reescritura ni `404.html`.

| Variable | Cuándo | Efecto |
|---|---|---|
| `VITE_API_BASE_URL` | Build | URL del backend, sin barra final. **Pública**: queda en el bundle y define el único origen permitido por la CSP (`connect-src`). Vacía: build de muestra, sin pedidos de red |
| `BASE_PATH` | Build | Ruta base, con barras al inicio y al final. `/` para un dominio propio. Si falta: `/handy-internal-portal/` con `GITHUB_PAGES=true` y `/` en el resto |
| `GITHUB_PAGES` | Solo el workflow de revisión | Usa la subruta de Pages y prohíbe `VITE_API_BASE_URL` |

Ninguna otra variable llega al bundle. Los secretos (claves, `ADMIN_ACCOUNTS_JSON`, `ADMIN_JWT_SECRET`) viven en el entorno privado del backend, nunca acá.

### Requisitos del lado del backend

Para que el portal funcione, el backend de producción tiene que tener `AUTH_ENABLED=true`, `ADMIN_ALLOWED_ORIGINS=https://interno.handyc.com` (exacto, sin barra final, disjunto de `PUBLIC_ALLOWED_ORIGINS`) y HTTPS (las cookies llevan el prefijo `__Host-` y `Secure`). El portal y la API comparten sitio (`handyc.com`), que es lo que necesita `SameSite=Lax`.

### Seguridad del sitio estático

`index.html` del build incluye una `Content-Security-Policy` por `<meta>`: `default-src 'none'`, scripts, estilos y fuentes solo propios, imágenes propias y `data:`, y `connect-src` únicamente al origen del API configurado. Una meta no puede fijar `frame-ancestors` ni otras cabeceras: pendiente decidir con quien opere el hosting si se suman por `.htaccess` o panel (`frame-ancestors 'none'`, `X-Content-Type-Options`, HSTS).

## Configuración por cliente

| Cliente | Variable | Valor |
|---|---|---|
| Landing | `FORM_ENDPOINT` (variable del repo `Handy-landing-page-fe`) | URL pública de `Handy-landing-page-be` |
| Portal · GitHub Pages | ninguna | La demo pública **no** se conecta a un backend (TECH-31) |
| Portal · Hostinger | `VITE_API_BASE_URL` y `BASE_PATH` en el build | `https://api.handyc.com` y `/` |

El detalle de CORS, sesión y errores está en [Contrato de Handy-landing-page-be](../api/landing-be.md).

## Decisiones pendientes

La compra del dominio y del hosting, y quién ejecuta el build y la subida. TECH-09 y TECH-21 cubren costos y CI; TECH-32 corresponde a la landing y no elige hosting para el portal. No hay un workflow que publique el build operativo: hoy se construye y se sube a mano.
