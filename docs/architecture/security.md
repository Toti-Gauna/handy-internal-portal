---
id: "PORTAL-ARCH-SECURITY"
type: "architecture"
status: "provisional"
owner: "Tech"
updated: "2026-10-05"
related: ["TECH-08", "LEG-08", "LEG-09", "LEG-36"]
---

# Seguridad frontend

## Acceso

La aplicación normal inicia como sesión anónima y deniega las rutas internas. No hay formulario de login ni autenticación improvisada. La vista de muestra se abre de forma explícita, contiene fixtures sintéticos solamente y no otorga permisos de operación.

La función frontend `canOpenInternalRoute` es defensa de interfaz, no control de acceso. Antes de operar, una API debe autenticar y autorizar cada lectura y escritura en servidor, aplicar mínimo privilegio y auditar la identidad, hora, propósito y entidad. El mecanismo, las claims y los roles siguen pendientes en TECH-08 y TECH-06.

## Contacto de pre-registros

La ficha de pre-registro de **especialista** muestra el WhatsApp y el email que la persona dejó en la landing, porque la política de privacidad declara su uso para coordinar el alta. Los pre-registros de **usuarios** no muestran email ni WhatsApp: su finalidad declarada es solo avisar el lanzamiento. La decisión requiere confirmación de LEG-09 antes de usar datos reales. En la muestra, los números son ficticios y el botón para abrir WhatsApp queda desactivado.

## Datos que no se muestran

- DNI, imagen de DNI y certificados de antecedentes o su resultado.
- Claves fiscales y números de cuentas de cobro.
- Chats generales, direcciones guardadas, ubicación histórica y medios de pago.
- Email y WhatsApp de pre-registros de usuarios.
- Notas libres sobre salud, familia, antecedentes u otros datos sensibles.

La ficha de especialista muestra hitos neutrales de verificación, estado de aceptación de términos y un estado de cuenta de cobro a nombre confirmado, sin el número. El certificado de antecedentes se exhibe en vivo y no se carga ni se guarda (LEG-08).

La ficha de pre-registro de usuario es de solo lectura. No hay edición ni borrado manual: la baja pedida por email debe seguir LEG-36.

## Manejo de información

- No enviar PII a APIs de IA, logs, telemetría ni servicios externos.
- No conectar el navegador directamente a Neon.
- No almacenar datos administrativos ni tokens en storage del navegador.
- Escapar texto interpolado en el DOM y mantener errores sin detalles internos.
- Abrir `wa.me` en una pestaña nueva con `rel="noopener noreferrer"`; el portal no envía mensajes por su cuenta.
- Copiar el mensaje sugerido usa el portapapeles del navegador y no guarda nada.
- Los fixtures son ficticios, identificables por ID y etiquetados en toda la interfaz.

## Pendientes antes de usar registros reales

Resolver TECH-03 (modelo y DTOs, incluida la propuesta de pre-registros), TECH-06 (alcance y permisos del portal), TECH-08 (autenticación/autorización) y LEG-36 (baja). Confirmar los campos exactos permitidos con LEG-09 y cerrar LEG-08 para los hitos de alta.
