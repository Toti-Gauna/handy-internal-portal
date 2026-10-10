---
id: "PORTAL-ARCH-DATA"
type: "architecture"
status: "provisional"
owner: "Tech"
updated: "2026-10-10"
related: ["TECH-03", "LEG-08", "LEG-09", "LEG-36", "PORTAL-MODULE-PREREGISTROS"]
---

# Datos

## Persistencia

Esta app no tiene persistencia ni guarda nada en el navegador. Los datos reales vienen de `Handy-landing-page-be` (cifrados allá, descifrados solo para mostrarlos en pantalla) y existen solo en memoria mientras se muestran. `src/data/demo-data.ts` contiene fixtures marcados con IDs ficticios que solo se usan en un build sin `VITE_API_BASE_URL`; no son un modelo de base ni una fuente operativa.

## Datos representados en la muestra

- Pre-registro de especialista (con la forma del contrato real): nombre inventado, WhatsApp ficticio del bloque 223 000-xxxx en formato E.164 (con un caso `whatsappNormalizado = false`), email `@example.com` opcional (uno sin email), rubros, zona, fechas de alta y vencimiento, etapa OPS-01, estado de contacto derivado, versión y eventos de contacto ficticios.
- Pre-registro de usuario: solo `id`, `creadoEn` y `venceEn`, como el backend. El email existe únicamente en la fuente de muestra para simular la búsqueda exacta de soporte y nunca se entrega.
- Especialista (desde Verificado): ID ficticio, nombre inventado, rubro, barrio, etapa, nivel de verificación, habilitación, actividad derivada, hitos neutrales, aceptación de términos, estado de cuenta de cobro sin número, eventos ficticios y vínculo al pre-registro.

No hay DNI, archivo ni resultado del certificado, número de CUIT, clave fiscal, número de cuenta, chat, dirección, ubicación ni medio de pago en los fixtures. Los IDs llevan `-DEMO-` y un test verifica que los emails y WhatsApp sean ficticios.

## Extensión futura

El contrato de pre-registros está en [Contrato de Handy-landing-page-be](../api/landing-be.md) y [Pre-registros](../modules/preregistros.md). TECH-03 sigue pendiente para especialistas con alta completa (propiedad por servicio, DTOs, filtros, paginación y auditoría). LEG-09 define minimización y retención; LEG-08 continúa provisional para la verificación; la baja de cuenta corresponde al flujo LEG-36. No crear tablas, migraciones ni guardar datos en el browser desde este repositorio.
