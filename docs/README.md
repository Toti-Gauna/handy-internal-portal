---
id: "PORTAL-DOCS-INDEX"
type: "documentation-index"
status: "provisional"
owner: "Tech"
updated: "2026-10-05"
related: ["TECH-12", "TECH-06"]
---

# Documentación técnica

Este repositorio es una vista de referencia del portal interno de Handy. Los contratos no aprobados se señalan con su ID y no se completan con reglas supuestas.

## Arquitectura

- [Límites del sistema](architecture/system.md)
- [Frontend](architecture/frontend.md)
- [Backend e integraciones](architecture/backend.md)
- [Datos](architecture/data.md)
- [Seguridad](architecture/security.md)
- [Entornos y publicación](architecture/deployment.md)

## Módulos y flujos

- [Portal operativo](modules/portal-operativo.md)
- [Pre-registros de la landing](modules/preregistros.md): incluye la propuesta de contrato de lectura y registro de contactos

## Decisiones técnicas

- [ADR-0001 · Stack web provisional](adr/ADR-0001-stack-web-provisional.md)

## Reglas para cambios

- Actualizar la documentación en el mismo cambio que modifique contratos, datos, permisos, estados o configuración.
- Conservar en cada documento los metadatos `id`, `type`, `status`, `owner`, `updated` y `related`, según TECH-12.
- Documentar por módulo o flujo vertical; no crear una página técnica por componente.
- No inventar reglas de negocio para completar documentación. Referenciar la decisión pendiente.
