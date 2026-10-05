---
id: "PORTAL-MODULE-PREREGISTROS"
type: "module"
status: "provisional"
owner: "Tech"
updated: "2026-10-05"
related: ["OPS-01", "TECH-03", "TECH-06", "TECH-08", "LEG-09", "LEG-36", "PORTAL-API-LANDING-BE"]
---

# Pre-registros de la landing

## Propósito

Trabajar los pre-registros que entran por el formulario de la landing (`Handy-landing-page-fe`, ruta `/registro/`) para acelerar el contacto con especialistas: ver quién se anotó, a quién hay que escribirle, escribirle por WhatsApp con un mensaje listo y dejar registrado el resultado del contacto según OPS-01.

Estado: **vista de referencia con datos ficticios, con el adaptador HTTP listo.** El backend de la landing (`Handy-landing-page-be`) todavía no tiene código, y el portal no tiene autenticación. La lectura real y el registro de contactos dependen del [contrato propuesto](../api/landing-be.md).

## Origen de los datos

El formulario valida con `src/schema/preregistro.ts` de la landing (copia sincronizada con el backend). El portal copia esos campos en `src/domain/preregistros.ts`:

| Tipo | Campos del formulario |
|---|---|
| Especialista | `nombre`, `whatsapp` (obligatorio), `email`, `rubros[]` (6 valores), `zona` (texto libre), `cuit` (`si` · `no` · `en_tramite`), `acepta` |
| Usuario | `nombre`, `email`, `barrio`, `whatsapp?`, `necesidad?`, `acepta` |

Campos que agrega el servidor: `id` y `creadoEn`. Para especialistas, además: `etapa` (`identificado` · `contactado` · `comprometido`), `eventos[]`, `proximoSeguimiento?` y `especialistaId?`. Para usuarios, el portal recibe `dejoWhatsapp` en lugar del email y el WhatsApp. El honeypot `sitio_web` nunca se persiste ni se muestra.

Si cambia el esquema de la landing, se actualiza este tipo en el mismo cambio.

## Pantallas

| Pantalla | Qué muestra | Acciones |
|---|---|---|
| Inicio | Contadores (para contactar, especialistas, usuarios, comprometidos), cola **Para contactar**, mosaico por rubro y embudo OPS-01 | Ir a la ficha; tocar un rubro filtra la lista |
| Pre-registros · Especialistas | Pestañas por estado de contacto con conteos, filtro por rubro (mosaicos), CUIT, búsqueda (nombre, zona, email, WhatsApp con o sin formato), orden por fecha y paginación | Abrir ficha |
| Ficha de especialista | Datos del formulario, etapa (Identificado → Contactado → Comprometido → Verificado), mensaje de WhatsApp sugerido, paso que falta, línea de tiempo de contactos | Abrir WhatsApp, copiar mensaje y registrar contacto (WhatsApp y registro bloqueados en la muestra) |
| Pre-registros · Usuarios | Nombre, barrio, necesidad, fecha y si dejó WhatsApp (sin el número). Búsqueda por nombre, barrio, email o necesidad | Abrir ficha, solo lectura |

## Reglas de contacto (OPS-01)

- El pre-registro de la landing equivale a **Identificado**: alta en la lista de captación.
- Un mensaje sin respuesta es un **intento**: queda como evento y la etapa no cambia. La UI lo muestra como "Con intentos · N", pero sigue siendo Identificado.
- **Contactado** requiere una conversación efectiva.
- **Comprometido** requiere aviso de privacidad aceptado (lo da la landing) y una fecha de alta aceptada.
- Desde **Verificado**, el especialista pasa a la sección Especialistas (`especialistaId` ↔ `preregistroId`). Las transiciones posteriores siguen bloqueadas por LEG-08, TECH-06 y TECH-08.
- La cola **Para contactar** ordena primero por seguimiento más próximo y después por antigüedad del pre-registro.

## WhatsApp

`whatsappDigits` normaliza lo que escribió la persona al formato de `wa.me`. Sin prefijo, asume un celular de Argentina (`549…`, sin el 0 inicial). Con `+54` y sin 9, agrega el 9. Respeta cualquier otro código de país con `+`. No intenta quitar un "15" local, y la ficha muestra el número tal como se escribió para poder revisarlo.

El mensaje sugerido (`contactMessage`) usa voseo y cambia según el estado: primer contacto, nuevo intento, contactado o recordatorio de alta. No promete plazos.

En la muestra, el botón **Abrir WhatsApp** queda desactivado porque los números son ficticios. **Copiar mensaje** funciona.

## Datos personales y finalidad

La política de privacidad de la landing dice:

- Especialistas: los datos se usan para avisar el lanzamiento y para contarles cómo seguir con el alta. Por eso la ficha de especialista muestra WhatsApp y email: son el canal de contacto para esa finalidad.
- Usuarios: los datos se usan solo para avisar el lanzamiento. Por eso la lista y la ficha de usuario **no muestran** email ni WhatsApp, y no tienen acciones de contacto. La búsqueda por email existe para atender pedidos de baja; el borrado sigue LEG-36.

Esta decisión de campos visibles necesita confirmación con LEG-09 antes de conectar datos reales. No se muestran notas libres. La exportación (CSV) no está incluida.

## Conexión con el backend

El contrato completo (endpoints públicos de la landing y `/admin/*` del portal, errores, CORS, sesión y transiciones) está en [Contrato de Handy-landing-page-be](../api/landing-be.md).

En el frontend:

- `src/contracts/landing-api.ts`: esquemas zod de las respuestas. Los enums son copia del esquema de la landing.
- `src/data/http-source.ts`: `HttpPortalDataSource`. Arma los filtros en la query, manda la cookie de sesión, valida cada respuesta y normaliza los errores en `PortalSourceError`, sin detalles internos.
- `src/app/state.ts` elige la fuente: muestra con `?demo=1`, HTTP si hay `VITE_API_BASE_URL` y bloqueo explícito si no. Las rutas internas siguen denegadas mientras no exista sesión autorizada (TECH-08), aunque haya URL configurada.
- Las páginas leen solo de `PortalDataSource`, nunca de los fixtures. Conectar el backend no requiere tocar pantallas.

## Pendientes

| ID | Pendiente |
|---|---|
| TECH-03 | Aprobar el modelo, los DTOs y los índices de la propuesta |
| TECH-06 | Definir quién puede ver los pre-registros y registrar contactos |
| TECH-08 | Autenticación del portal y autorización por endpoint |
| LEG-09 | Confirmar los campos visibles y la retención de pre-registros |
| LEG-36 | Flujo de baja de pre-registros pedida por email |

## Verificación

`src/data/http-source.test.ts` cubre el adaptador HTTP: query de filtros, cookie de sesión, validación de respuestas, errores normalizados, 404 en la ficha, validación antes de registrar un contacto y que la muestra nunca entregue el email de usuarios.

`src/domain/preregistros.test.ts` cubre: estado de contacto derivado (un intento no mueve la etapa), filtros combinados, búsqueda por WhatsApp sin formato, orden, conteos por estado, cola de contacto, búsqueda de usuario por email, normalización de WhatsApp, mensajes sugeridos y que los fixtures sean ficticios y estén vinculados con Especialistas.
