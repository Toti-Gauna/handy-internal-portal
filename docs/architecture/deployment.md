---
id: "PORTAL-ARCH-DEPLOYMENT"
type: "architecture"
status: "provisional"
owner: "Tech"
updated: "2026-10-05"
related: ["TECH-06", "TECH-09", "TECH-21", "TECH-31", "TECH-32"]
---

# Entornos y publicación

## Estado

Hay un despliegue de revisión en GitHub Pages: <https://toti-gauna.github.io/handy-internal-portal/?demo=1#/inicio>. El repositorio y el sitio son públicos. El workflow `.github/workflows/pages.yml` valida lint, typecheck y tests, construye `dist/` con la base `/handy-internal-portal/` y publica en cada push a `main` o al ejecutarlo manualmente.

Este hosting sirve únicamente para revisar una demo no operativa con fixtures ficticios. No hay autenticación ni API y no se deben cargar datos reales ni habilitar operaciones aquí. TECH-31 prohíbe GitHub Pages para uso comercial; este despliegue queda limitado a la vista de revisión. La decisión de hosting para el portal operativo sigue pendiente.

## Desarrollo

- Node.js 20.19+ o 22.12+.
- `npm install`, `npm run dev`.
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- `GITHUB_PAGES=true npm run build` genera las rutas de assets para el sitio de Pages.
- Variables en `.env.example`: `VITE_API_BASE_URL` (backend; vacía = sin pedidos HTTP) y `API_PROXY_TARGET` (solo para el proxy `/api` de desarrollo). Copiar a `.env.local`, que no se versiona.

## Configuración por cliente

| Cliente | Variable | Valor |
|---|---|---|
| Landing | `FORM_ENDPOINT` (variable del repo `Handy-landing-page-fe`) | URL pública de `Handy-landing-page-be` |
| Portal · GitHub Pages | ninguna | La demo pública **no** se conecta a un backend (TECH-31) |
| Portal · hosting operativo | `VITE_API_BASE_URL` en el build | URL de `Handy-landing-page-be`, en el mismo sitio que el portal para la cookie de sesión |

El detalle de CORS y de la sesión está en [Contrato de Handy-landing-page-be](../api/landing-be.md).

## Decisiones pendientes

TECH-06 debe cerrar el alcance de consola y las operaciones con Tech/Operations. El hosting operativo sigue sin decisión; TECH-09 y TECH-21 cubren costos y CI. Antes de conectar datos reales o habilitar operaciones, migrar desde la demo pública a un hosting aprobado conforme a TECH-31. TECH-32 corresponde a la landing y no elige hosting para el portal.

No agregar secretos ni información real a la configuración de Pages. El preview no define el hosting final ni autoriza una publicación operativa.
