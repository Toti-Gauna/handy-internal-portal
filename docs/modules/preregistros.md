---
id: "PORTAL-MODULE-PREREGISTROS"
type: "module"
status: "provisional"
owner: "Tech"
updated: "2026-10-10"
related: ["OPS-01", "TECH-03", "TECH-06", "TECH-08", "LEG-09", "LEG-36", "PORTAL-API-LANDING-BE", "PORTAL-ADR-0002"]
---

# Pre-registros de la landing

## Propósito

Trabajar los pre-registros que entran por el formulario de la landing (`Handy-landing-page-fe`, ruta `/registro/`) para acelerar el contacto con especialistas: ver quién se anotó, a quién hay que escribirle, abrir WhatsApp con un clic del operador y dejar registrado el resultado del contacto según OPS-01.

Estado: **conectado al contrato real del backend (Fase 2) con login del equipo, probado solo contra un backend simulado.** No hay prueba de punta a punta contra `Handy-landing-page-be` ni despliegue. Sin `VITE_API_BASE_URL` el portal solo ofrece la muestra con datos ficticios (`?demo=1`); con la variable, la muestra no existe.

## Origen de los datos

El formulario valida en la landing y el backend vuelve a validar. El portal **no recibe todo lo que el formulario captura**: solo lo que `GET /admin/preregistros*` expone (contrato en [landing-be.md](../api/landing-be.md)):

| Tipo | Lo que ve el operador |
|---|---|
| Especialista | `nombre`, `whatsapp` (+ `whatsappNormalizado`), `email` (opcional), `rubros[]` (6 valores), `zona` (texto libre), `creadoEn`, `venceEn`, `etapa`, `contacto` e `intentos` (derivados), `proximoSeguimiento`, `fechaAltaAceptada`, `version` y, en la ficha, `eventos[]` |
| Usuario | `id`, `creadoEn`, `venceEn`. **Nada más**: no hay nombre, barrio, necesidad, email ni WhatsApp |

Ya no existe `cuit`. El honeypot `sitio_web` nunca se persiste. Los datos personales están cifrados en el backend; el portal los recibe descifrados solo en la ficha y la lista de especialistas, y no los guarda en ningún lado.

## Pantallas

| Pantalla | Qué muestra | Acciones |
|---|---|---|
| Inicio | Contadores (para contactar, especialistas, usuarios, comprometidos), cola **Para contactar** (la ordena el servidor), mosaico por rubro y embudo OPS-01 | Ir a la ficha; tocar un rubro filtra la lista |
| Pre-registros · Especialistas | Pestañas por estado de contacto con conteos, filtro por rubro (mosaicos), **zona exacta**, búsqueda **exacta** (ID o WhatsApp completo), orden por fecha o por seguimiento más próximo y paginación del servidor (8 por página) | Abrir ficha |
| Ficha de especialista | Datos del formulario (email opcional, aviso "Revisar el número"), etapa, mensaje sugerido, paso que falta, fecha de alta acordada, seguimiento, vencimiento y línea de tiempo de contactos con el operador | Abrir WhatsApp (enlace), copiar mensaje, registrar contacto |
| Pre-registros · Usuarios | Id y fecha de alta. Búsqueda **exacta** por ID, o por email completo con `preregistros:support` | Abrir ficha (solo lectura) |

La UI dice en cada búsqueda que es exacta y por qué no encuentra por nombre ni por parte de un número.

## Reglas de contacto (OPS-01)

- El pre-registro de la landing equivale a **Identificado**.
- **Intento** (sin respuesta): queda como evento, la etapa no cambia. La UI lo muestra como "Con intentos · N" (`contacto = con_intentos`), que es un estado **derivado**, no una etapa.
- **Conversación efectiva**: Identificado → **Contactado**.
- **Compromiso**: Contactado → **Comprometido**, y exige la **fecha de alta acordada** (`fechaAltaAceptada`: desde ahora hasta 90 días y antes del vencimiento). Es un dato distinto del **próximo seguimiento**; el portal no deja enviarlos iguales ni usa uno por el otro.
- El formulario ofrece solo lo que la etapa permite: Identificado → intento o conversación; Contactado → compromiso; Comprometido → nada (no admite más eventos).
- Cada envío lleva la `version` de la ficha que vio el operador y una `Idempotency-Key` (ver abajo). Si la ficha cambió (`409 version`), el portal la recarga, avisa y conserva lo escrito en el formulario (solo en memoria).
- La nota ("motivo") es neutra, de 1 a 140 caracteres: el servidor rechaza teléfonos, emails, enlaces, documentos y cuentas.
- El servidor fija el actor (la cuenta de la sesión) y la fecha.
- Desde **Verificado**, el especialista pasa a la sección Especialistas. Esas transiciones siguen bloqueadas por LEG-08, TECH-06 y su propio contrato (`api-especialista`).

### Límite: no hay "seguimiento" para un Contactado

El backend no tiene un evento de seguimiento: quien ya está **Contactado** solo admite `compromiso`. El operador no puede registrar un nuevo intento ni mover el próximo seguimiento de un contactado sin comprometerlo. El portal **no lo simula**: lo explica en la ficha ("Hoy no hay un evento de seguimiento para quien ya está Contactado") y queda como pendiente de decisión con el equipo (ver `docs/crm.md` del backend).

## Permisos en la interfaz

| Permiso | Con permiso | Sin permiso |
|---|---|---|
| `preregistros:read` | Todo el módulo | Pantalla "Tu cuenta no tiene acceso", con salida |
| `preregistros:contact` | Formulario de contacto y botón de WhatsApp | Formulario deshabilitado ("Sin permiso") y sin botón de WhatsApp |
| `preregistros:support` | Buscar usuarios por email exacto | Solo por ID; un email no se envía y se explica |

Esto es una ayuda de interfaz: el backend exige el permiso en cada endpoint y la muestra nunca habilita acciones (`canRegisterContact`).

## WhatsApp

Solo un **enlace que toca el operador**: `https://wa.me/<número normalizado>`, `target="_blank"` y `rel="noopener noreferrer"`, **sin texto prellenado** (ni el nombre ni los rubros viajan en la URL). Solo se arma si el backend normalizó el número (`whatsappNormalizado = true`, formato E.164); si no, la ficha avisa "Revisar el número" y el botón queda deshabilitado hasta confirmarlo con la persona. El mensaje sugerido (`contactMessage`, con voseo y sin plazos) se **copia y pega a mano**. La app nunca abre, envía ni agenda un mensaje por su cuenta; registrar el contacto lo hace el operador como evento.

## Datos personales y finalidad

La política de privacidad de la landing dice:

- Especialistas: los datos se usan para avisar el lanzamiento y para contarles cómo seguir con el alta. Por eso la ficha muestra WhatsApp y email.
- Usuarios: los datos se usan solo para avisar el lanzamiento. El backend ya no los expone; la búsqueda por email existe para atender pedidos de baja o acceso y exige `preregistros:support`. El borrado sigue LEG-36.

Los registros vencen a los 12 meses (retención 04-A); la ficha muestra "Se elimina el …". La decisión de campos visibles sigue necesitando la confirmación de LEG-09 antes de operar con datos reales. No hay exportación.

## Conexión con el backend

- `src/contracts/landing-api.ts`: esquemas zod de las respuestas (ficha, fila, lista, resumen, sesión, error) y del cuerpo del evento.
- `src/data/admin-session.ts`: `AdminSessionClient`. Login en dos pasos, `bootstrap` al recargar, refresh serializado con un reintento, CSRF en memoria, logout, errores normalizados (`PortalSourceError`).
- `src/data/http-source.ts`: `HttpPortalDataSource`. Arma los filtros del servidor, valida cada respuesta y mapea al dominio.
- `src/domain/evento.ts`: validación previa del evento y claves de idempotencia por envío (`SubmissionKeys`).
- `src/app/state.ts` elige la fuente: muestra con `?demo=1` **solo sin `VITE_API_BASE_URL`**, HTTP si hay URL, bloqueo explícito si no. `src/app/session.ts` maneja ingreso, MFA, cierre y recuperación del CSRF.
- Las páginas leen solo de `PortalDataSource`.

Los errores (`401` → login, `403` con tres causas distintas, `409` con motivo, `429`, `503`, red) están descritos en [landing-be.md](../api/landing-be.md#errores).

## Pendientes

| ID | Pendiente |
|---|---|
| — | Prueba de punta a punta contra `Handy-landing-page-be` real (CORS, cookies, CSRF) |
| — | Decidir con el equipo cómo seguir a un Contactado (falta un evento en el backend) |
| TECH-06 | Definir quién puede ver los pre-registros y registrar contactos en producción |
| LEG-09 | Confirmar los campos visibles y la retención de pre-registros |
| LEG-36 | Flujo de baja de pre-registros pedida por email |

## Verificación

- `src/data/admin-session.test.ts`: login con y sin TOTP, `bootstrap` al recargar (incluido el acceso vencido con refresh vivo), refresh **serializado** (tres 401 simultáneos → un refresh), reintento único, 401 persistente, red caída durante el refresh, CSRF solo en POST y renovado tras el refresh con la misma `Idempotency-Key`, 403 de tres causas, 409 con motivo, 429/503/500, forma inesperada, logout y que nada se guarde en storage.
- `src/data/http-source.test.ts`: filtros al servidor, listas y fichas con la forma real (email `null`, usuarios solo con id y fechas), resumen, registro del evento (cabeceras, cuerpo, `201`/`200`), validación antes de enviar y `409`.
- `src/domain/evento.test.ts`: reglas del evento, fecha de alta distinta del seguimiento y reuso de la clave de idempotencia.
- `src/domain/preregistros.test.ts` y `src/security/*.test.ts`: búsqueda exacta, acciones por etapa, enlace de WhatsApp, permisos y ausencia de almacenamiento local.
- Falta una prueba de interfaz automatizada (DOM) y la prueba de punta a punta contra el backend real: ver Pendientes.
