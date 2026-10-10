---
id: "PORTAL-DOCS-INDEX"
type: "documentation-index"
status: "provisional"
owner: "Tech"
updated: "2026-10-10"
related: ["TECH-12", "TECH-06"]
---

# Documentación técnica

Portal interno de Handy. Con `VITE_API_BASE_URL` se conecta a `Handy-landing-page-be` (login del equipo y pre-registros reales); sin ella solo ofrece una vista de muestra con datos ficticios. Los contratos no aprobados se señalan con su ID y no se completan con reglas supuestas.

## Arquitectura

- [Límites del sistema](architecture/system.md)
- [Frontend](architecture/frontend.md)
- [Backend e integraciones](architecture/backend.md)
- [Datos](architecture/data.md)
- [Seguridad](architecture/security.md)
- [Entornos y publicación](architecture/deployment.md)

## Contratos

- [Contrato de Handy-landing-page-be](api/landing-be.md): contrato implementado del backend que consume el portal (`/auth/*`, `/admin/*`), errores y límites

## Módulos y flujos

- [Portal operativo](modules/portal-operativo.md)
- [Pre-registros de la landing](modules/preregistros.md)

## Decisiones técnicas

- [ADR-0001 · Stack web provisional](adr/ADR-0001-stack-web-provisional.md)
- [ADR-0002 · Sesión del equipo y publicación estática](adr/ADR-0002-sesion-del-equipo-y-publicacion.md)

## Reglas para cambios

- Actualizar la documentación en el mismo cambio que modifique contratos, datos, permisos, estados o configuración.
- Conservar en cada documento los metadatos `id`, `type`, `status`, `owner`, `updated` y `related`, según TECH-12.
- Documentar por módulo o flujo vertical; no crear una página técnica por componente.
- No inventar reglas de negocio para completar documentación. Referenciar la decisión pendiente.
