---
id: "PORTAL-ARCH-BACKEND"
type: "architecture"
status: "blocked"
owner: "Tech"
updated: "2026-10-05"
related: ["TECH-03", "TECH-06", "TECH-08", "TECH-15", "TECH-28", "PORTAL-API-LANDING-BE"]
---

# Backend e integraciones

## Estado

Este repositorio no contiene un servicio backend. Los pre-registros vienen de `Handy-landing-page-be`, todavía vacío, con el contrato propuesto en [Contrato de Handy-landing-page-be](../api/landing-be.md). `HttpPortalDataSource` lo implementa del lado del portal y se activa solo con `VITE_API_BASE_URL` y una sesión autorizada. Sin URL, `PendingPortalDataSource` expresa el bloqueo sin realizar solicitudes HTTP.

La documentación vigente de Handy asigna los servicios backend a Render + Neon con `api-usuario` y `api-especialista`. El portal no agrega un servicio ni conecta el browser directamente a la base.

## Contratos pendientes

- TECH-03: aprobar el contrato de pre-registros y definir el de especialistas (`api-especialista`). Hasta entonces, `HttpPortalDataSource` no consulta especialistas.
- TECH-06: alcance de consola y operaciones permitidas.
- TECH-08: autenticación y autorización por endpoint.
- TECH-15: pedidos sin oferta e intervención manual.
- TECH-28: estados y lecturas de conciliación.

El adaptador ya envía filtros y paginación al servidor (`pageSize` máximo 50), manda la sesión con `credentials: "include"` (cookie HttpOnly propuesta, sin tokens en el navegador), valida cada respuesta con zod y normaliza los errores sin información personal ni trazas internas. Si TECH-08 elige otro mecanismo de sesión, solo cambia `src/data/http-source.ts`.
