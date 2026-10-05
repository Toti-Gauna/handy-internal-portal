---
id: "PORTAL-ARCH-BACKEND"
type: "architecture"
status: "blocked"
owner: "Tech"
updated: "2026-10-05"
related: ["TECH-03", "TECH-06", "TECH-08", "TECH-15", "TECH-28"]
---

# Backend e integraciones

## Estado

El repositorio no contiene un servicio backend ni contratos de API. No se consume ningún endpoint y no se inventa una ruta administrativa. `PendingPortalDataSource` expresa este bloqueo sin realizar una solicitud HTTP.

La documentación vigente de Handy asigna los servicios backend a Render + Neon con `api-usuario` y `api-especialista`. El portal no agrega un servicio ni conecta el browser directamente a la base.

## Contratos pendientes

- TECH-03: modelo, DTOs y contratos de consulta de especialistas/usuarios.
- TECH-06: alcance de consola y operaciones permitidas.
- TECH-08: autenticación y autorización por endpoint.
- TECH-15: pedidos sin oferta e intervención manual.
- TECH-28: estados y lecturas de conciliación.

Cuando se definan, el adaptador frontend debe enviar filtros y paginación a servidor, limitar campos retornados, enviar credenciales con el patrón seguro aprobado y normalizar errores sin información personal ni trazas internas.
