---
id: "PORTAL-ARCH-DATA"
type: "architecture"
status: "provisional"
owner: "Tech"
updated: "2026-10-05"
related: ["TECH-03", "LEG-08", "LEG-09", "LEG-36", "PORTAL-MODULE-PREREGISTROS"]
---

# Datos

## Persistencia

Esta app no tiene persistencia. `src/data/demo-data.ts` contiene fixtures marcados con IDs ficticios para recorrer estados de interfaz; no son un modelo de base ni una fuente operativa.

## Datos representados en la muestra

- Pre-registro de especialista: los campos del formulario de la landing (nombre inventado, WhatsApp ficticio del bloque 223 000-xxxx, email `@example.com`, rubros, zona, si tiene CUIT —sin número—), fecha, etapa OPS-01 y eventos de contacto ficticios.
- Pre-registro de usuario: nombre inventado, email `@example.com`, barrio, necesidad opcional, WhatsApp opcional ficticio y fecha.
- Especialista (desde Verificado): ID ficticio, nombre inventado, rubro, barrio, etapa, nivel de verificación, habilitación, actividad derivada, hitos neutrales, aceptación de términos, estado de cuenta de cobro sin número, eventos ficticios y vínculo al pre-registro.

No hay DNI, archivo ni resultado del certificado, número de CUIT, clave fiscal, número de cuenta, chat, dirección, ubicación ni medio de pago en los fixtures. Los IDs llevan `-DEMO-` y un test verifica que los emails y WhatsApp sean ficticios.

## Extensión futura

TECH-03 y TECH-08 deben definir propiedad por servicio, DTOs permitidos, filtros, paginación, auditoría y autorización antes de integrar datos reales. La propuesta de lectura de pre-registros está en [Pre-registros](../modules/preregistros.md). LEG-09 define minimización y retención; LEG-08 continúa provisional para la verificación; la baja de cuenta corresponde al flujo LEG-36. No crear tablas, migraciones ni guardar datos en el browser desde este repositorio.
