---
id: "PORTAL-ARCH-SECURITY"
type: "architecture"
status: "provisional"
owner: "Tech"
updated: "2026-10-10"
related: ["TECH-08", "LEG-08", "LEG-09", "LEG-36", "PORTAL-ADR-0002"]
---

# Seguridad frontend

## Acceso

El equipo entra con email y contraseña (y un código TOTP de 6 dígitos si la cuenta lo tiene), validados **únicamente por el backend** contra su entorno privado. El portal no tiene credenciales, ni registro de cuentas, ni recuperación de contraseña. La sesión es una cookie `HttpOnly` que maneja el navegador (`credentials: "include"`); el `X-CSRF-Token` de los POST vive solo en memoria. Un `401` dispara un refresh serializado y un único reintento; si no alcanza, se vuelve al login. Cerrar sesión limpia la memoria aunque el servidor falle. Contrato y reglas: [Contrato de Handy-landing-page-be](../api/landing-be.md#autenticación-del-equipo) y [ADR-0002](../adr/ADR-0002-sesion-del-equipo-y-publicacion.md).

Las funciones de `src/security/access.ts` (`canOpenInternalRoute`, `canContactPreregistros`, `canSearchUsersByEmail`, `canRegisterContact`) son **defensa de interfaz, no control de acceso**: el backend autentica la sesión, valida el origen y el CSRF y exige el permiso en cada endpoint, y audita cada lectura y escritura (si no puede auditar, no entrega datos). La UI oculta o deshabilita lo que el servidor rechazaría (`preregistros:contact` para registrar y abrir WhatsApp, `preregistros:support` para buscar usuarios por email). La muestra nunca habilita acciones. TECH-06 define el alcance de los permisos en producción.

## Contacto de pre-registros

La ficha de pre-registro de **especialista** muestra el WhatsApp y el email (opcional) que la persona dejó en la landing, porque la política de privacidad declara su uso para coordinar el alta. Los pre-registros de **usuarios** no tienen nada de eso: el backend solo expone `id` y fechas (su finalidad declarada es avisar el lanzamiento). La decisión requiere confirmación de LEG-09 antes de usar datos reales. En la muestra, los números son ficticios y el botón para abrir WhatsApp queda desactivado.

WhatsApp es un **enlace que toca el operador**: `https://wa.me/<número normalizado>` con `rel="noopener noreferrer"` y **sin texto prellenado**, para que el nombre y los rubros no viajen en la URL. Sin número normalizado por el backend (`whatsappNormalizado = false`) no se arma el enlace y se avisa "Revisar el número". La aplicación nunca contacta por su cuenta.

## Datos que no se muestran

- DNI, imagen de DNI y certificados de antecedentes o su resultado.
- Claves fiscales y números de cuentas de cobro.
- Chats generales, direcciones guardadas, ubicación histórica y medios de pago.
- Nombre, barrio, necesidad, email y WhatsApp de pre-registros de usuarios (el backend no los expone).
- Notas libres sobre salud, familia, antecedentes u otros datos sensibles.

La ficha de especialista muestra hitos neutrales de verificación, estado de aceptación de términos y un estado de cuenta de cobro a nombre confirmado, sin el número. El certificado de antecedentes se exhibe en vivo y no se carga ni se guarda (LEG-08).

La ficha de pre-registro de usuario es de solo lectura. No hay edición ni borrado manual: la baja pedida por email se ubica con la búsqueda exacta (`preregistros:support`) y debe seguir LEG-36.

## Manejo de información

- No enviar PII a APIs de IA, logs, telemetría ni servicios externos.
- No conectar el navegador directamente a Neon.
- No almacenar datos administrativos ni tokens en storage del navegador. La sesión es una cookie HttpOnly del backend; el portal solo manda `credentials: "include"` y guarda el CSRF en memoria.
- Los mensajes de error son propios: nunca se muestra el cuerpo de una respuesta del servidor ni un valor de campo.
- `VITE_API_BASE_URL` es pública; el portal no tiene secretos. El build lleva una CSP por `<meta>` con `connect-src` solo al API configurado, `referrer` en `no-referrer` y sin mapas de código.
- `X-CSRF-Token` e `Idempotency-Key` viajan solo en cabeceras; nunca en la URL.
- Validar cada respuesta del backend con zod antes de renderizar; una forma inesperada se muestra como error.
- Escapar texto interpolado en el DOM y mantener errores sin detalles internos.
- Abrir `wa.me` en una pestaña nueva con `rel="noopener noreferrer"`; el portal no envía mensajes por su cuenta.
- Copiar el mensaje sugerido usa el portapapeles del navegador y no guarda nada.
- Los fixtures son ficticios, identificables por ID y etiquetados en toda la interfaz.

## Pendientes antes de usar registros reales

Probar la integración de punta a punta contra el backend real; resolver TECH-06 (alcance y permisos del portal), la decisión de MFA obligatorio (`ADMIN_MFA_REQUIRED`, del backend) y LEG-36 (baja). Confirmar los campos exactos permitidos con LEG-09 y cerrar LEG-08 para los hitos de alta.
