---
id: "PORTAL-ARCH-BACKEND"
type: "architecture"
status: "provisional"
owner: "Tech"
updated: "2026-10-10"
related: ["TECH-03", "TECH-06", "TECH-08", "TECH-15", "TECH-28", "PORTAL-API-LANDING-BE", "PORTAL-ADR-0002"]
---

# Backend e integraciones

## Estado

Este repositorio no contiene un servicio backend. Los pre-registros y la sesión del equipo vienen de `Handy-landing-page-be`, que implementó en la Fase 2 el login (`/auth/*`) y el CRM (`/admin/preregistros*`). El contrato que usa el portal está en [Contrato de Handy-landing-page-be](../api/landing-be.md). Nada está desplegado: la producción prevista es API en Render (`api.handyc.com`) y base Neon dedicada, y el portal en Hostinger (`interno.handyc.com`).

Las pruebas del portal usan un backend simulado: **la integración no se probó todavía de punta a punta contra el backend real.**

La documentación vigente de Handy asigna los servicios backend a Render + Neon con `api-usuario` y `api-especialista`. El portal no agrega un servicio ni conecta el navegador directamente a la base.

## Cómo se conecta el portal

- `AdminSessionClient` (`src/data/admin-session.ts`) maneja la sesión: login en dos pasos con TOTP opcional, recarga con `GET /auth/admin/me` + `GET /auth/admin/csrf`, refresh serializado con un reintento, logout y errores normalizados.
- `HttpPortalDataSource` (`src/data/http-source.ts`) arma las consultas (filtros, orden y paginación en el servidor, `pageSize` máximo 50), valida cada respuesta con zod y registra eventos con `Idempotency-Key`.
- `VITE_API_BASE_URL` es la única variable (pública). El navegador manda las cookies `HttpOnly` con `credentials: "include"` y el `X-CSRF-Token` en los POST; nada se guarda localmente.
- Si cambia el mecanismo de sesión o una respuesta, se actualizan esos dos archivos, `src/contracts/landing-api.ts` y el contrato.

## Contratos pendientes

- TECH-03: el contrato de especialistas con alta completa (`api-especialista`). Hasta entonces `HttpPortalDataSource` no consulta ese servicio y la sección Especialistas muestra "Todavía no disponible".
- TECH-06: alcance de consola y operaciones permitidas más allá de los pre-registros.
- TECH-15: pedidos sin oferta e intervención manual.
- TECH-28: estados y lecturas de conciliación.
- Un evento de seguimiento para quien ya está Contactado (ver [Pre-registros](../modules/preregistros.md#límite-no-hay-seguimiento-para-un-contactado)).
