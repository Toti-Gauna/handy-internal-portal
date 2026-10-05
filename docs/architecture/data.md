---
id: "PORTAL-ARCH-DATA"
type: "architecture"
status: "provisional"
owner: "Tech"
updated: "2026-10-05"
related: ["TECH-03", "LEG-08", "LEG-09", "LEG-36"]
---

# Datos

## Persistencia

Esta app no tiene persistencia. `src/data/demo-data.ts` contiene fixtures marcados con IDs ficticios para recorrer estados de interfaz; no son un modelo de base ni una fuente operativa.

## Datos representados en la muestra

- Especialista: ID ficticio, nombre de muestra, rubro, zona de demostración, etapa, nivel de verificación de muestra, habilitación, estado de actividad derivado, hitos neutrales, aceptación de términos, estado de cuenta de cobro sin número y eventos ficticios.
- Usuario: ID ficticio, nombre de muestra, fecha de alta ficticia y estado ficticio.

No hay DNI, archivo/resultado del certificado, CUIT, clave fiscal, número de cuenta, chat, teléfono, dirección, ubicación ni medio de pago en los fixtures.

## Extensión futura

TECH-03 y TECH-08 deben definir propiedad por servicio, DTOs permitidos, filtros, paginación, auditoría y autorización antes de integrar datos reales. LEG-09 define minimización y retención; LEG-08 continúa provisional para la verificación; la baja de cuenta corresponde al flujo LEG-36. No crear tablas, migraciones ni guardar datos en el browser desde este repositorio.
