---
id: "PORTAL-MODULE-OPERATIVO"
type: "module"
status: "provisional"
owner: "Tech"
updated: "2026-10-10"
related: ["OPS-01", "MET-01", "PROD-01", "TECH-03", "TECH-06", "TECH-08", "TECH-15", "TECH-28", "LEG-08", "LEG-09", "LEG-36", "PORTAL-MODULE-PREREGISTROS", "PORTAL-ADR-0002"]
---

# Portal operativo Handy

## Propósito y alcance

Portal interno de Eclipse para operar Handy, enfocado en lo que se usa hoy: trabajar los pre-registros de la landing y seguir a los especialistas por el embudo OPS-01. El alcance funcional sigue a PROD-01 y OPS-01. Con `VITE_API_BASE_URL` el portal usa el login del equipo y los pre-registros reales del backend de la landing (sin probar todavía de punta a punta); sin esa variable es una vista de referencia que solo recorre datos inventados. Especialistas con alta completa sigue sin contrato.

Fuera de alcance: campañas, CRM de ventas, mensajería masiva, automatizaciones, soporte de tickets completo, analítica avanzada, handbook editable y exportación de datos personales.

## Pantallas

| Módulo | Entradas visibles | Estado de implementación |
|---|---|---|
| Ingreso | Email y contraseña, y código TOTP si la cuenta lo tiene; acceso denegado si falta `preregistros:read` | Conectado al backend (sin variable: pantalla "Sin conexión configurada" con acceso a la muestra) |
| Inicio | Contadores de pre-registros, cola "Para contactar", especialistas anotados por rubro y embudo OPS-01 (la parte pre-registro viene del backend; la post-registro no tiene contrato) | Conectado; no incluye metas |
| Pre-registros | Especialistas y usuarios del formulario de la landing; ver [Pre-registros](preregistros.md) | Conectado: filtros, búsqueda exacta y paginación en el servidor; enlace de WhatsApp y registro de contacto con `preregistros:contact` |
| Especialistas | Desde Verificado hasta Activo: filtros por rubro, etapa, verificación, habilitado y actividad; ficha y línea de tiempo | Solo en la muestra; con el backend muestra "Todavía no disponible" (falta el contrato de `api-especialista`); transición bloqueada |

Se quitaron las secciones Usuarios (cuentas de la app) y Operaciones (pedidos sin oferta, conciliación), que solo mostraban pantallas bloqueadas sin uso. Vuelven cuando TECH-03/LEG-36 y TECH-15/TECH-28 cierren sus contratos.

## Embudo OPS-01

El embudo mantiene las etapas pre-registro separadas de las post-registro:

| Grupo | Etapa | Condición registrada en OPS-01 |
|---|---|---|
| Pre-registro | Identificado | Registro en la lista de captación |
| Pre-registro | Contactado | Conversación efectiva; un mensaje sin respuesta es solo intento |
| Pre-registro | Comprometido | Pre-registro con aviso de privacidad y fecha de alta aceptada |
| Post-registro | Verificado | Alta conforme a LEG-08; los hitos exactos siguen sujetos a su estado provisional |
| Post-registro | Registrado | Cuenta Handy Especialistas, aceptación de contrato/términos y cuenta de cobro a su nombre |
| Post-registro | Habilitado | Verificado y registrado; recién aquí recibe pedidos |
| Post-registro | Activo | Estado derivado definido por MET-01; no es transición manual |

Identificado, Contactado y Comprometido se trabajan en Pre-registros; desde Verificado, en Especialistas. La interfaz muestra intentos de contacto y conversaciones efectivas como eventos distintos. No habilita saltos de etapa: el servidor valida la transición en una transacción, fija actor y fecha y audita. "Con intentos" y "sin contactar" son estados derivados, no etapas. Quien ya está Contactado solo admite el compromiso: el backend no tiene un evento de seguimiento (límite documentado, no simulado).

## Ficha del especialista

La estructura muestra identificador, rubro, zona, etapa, hitos neutrales, aceptación de contrato/términos, estado de cuenta de cobro sin número, actor/fecha/motivo y siguiente seguimiento. No hay notas libres ni datos sensibles en el modelo de muestra. Los eventos visibles son sintéticos.

El bloque “paso que falta” explica requisitos sin permitir completar una verificación. “Verificado” y “Habilitado” permanecen bloqueados hasta que LEG-08/TECH-06/TECH-08 y el contrato de API permitan validar sus condiciones.

## Directorios y paginación

Los tipos `SpecialistSearch`, `EspecialistaPreSearch` y `UsuarioPreSearch` son los filtros internos de la interfaz; los de pre-registros se traducen a los parámetros del servidor (`src/data/http-source.ts`). `DemoPortalDataSource` filtra el conjunto ficticio y devuelve solo una página al render. Con el backend, búsqueda (exacta), filtros, orden y paginación (hasta 50 por página) los hace el servidor.

## Pendientes fuera de pantalla

- Cuentas de usuarios de la app: sin pantalla hasta que TECH-03 defina la lectura y LEG-36 la baja.
- Pedido sin oferta (TECH-15) y conciliación (TECH-28): sin pantalla hasta que existan sus contratos.
- Acciones mínimas de PROD-01 (aprobar alta, ofrecer pedido, ver deudas y reportes): pendientes de TECH-06.

## Seguridad y errores

Sin sesión valida, el portal deniega y muestra el login. Ninguna autorización depende solo de ocultar un botón: el backend verifica sesión, CSRF, origen y permiso en cada endpoint (`401` → login, `403` con tres causas, `409` con motivo, `429`, `503` y red tienen su estado). La interfaz presenta carga, error recuperable, vacío y falta de permisos; el error de consulta no altera datos.

## APIs y datos

**APIs consumidas:** `Handy-landing-page-be` (`/auth/*` y `/admin/preregistros*`), con el contrato de [Contrato de Handy-landing-page-be](../api/landing-be.md), solo con `VITE_API_BASE_URL`. No hay otras APIs, datos persistidos en el navegador ni migraciones.

## Dependencias y decisiones pendientes

| ID | Pendiente | Efecto en este módulo |
|---|---|---|
| TECH-03 | Modelo de datos/contratos de lectura de especialistas con alta completa | Bloquea la sección Especialistas |
| TECH-06 | Alcance de consola, permisos y acciones operativas | Define permisos en producción y acciones más allá de los pre-registros |
| TECH-08 | Autenticación y autorización server-side | Implementada en el backend (Fase 2); falta probarla de punta a punta |
| TECH-15 | Contrato de intervención y pedido sin oferta | Bloquea esa cola y sus acciones |
| TECH-28 | Contrato de conciliación y pagos | Bloquea resumen y consulta financiera |
| LEG-08 | Checklist de alta provisional | Bloquea fijar hitos operativos como regla final |
| LEG-36 | Flujo de baja de cuenta | Bloquea cualquier acción de baja |

## Verificación

Los tests unitarios cubren el cliente de sesión (login con TOTP, recarga, refresh serializado, 401/403/409/429/503, CSRF en memoria, `Idempotency-Key` reutilizada), el adaptador HTTP, las reglas del evento de contacto, la búsqueda exacta, el enlace de WhatsApp, los permisos de interfaz y que el código no use almacenamiento del navegador. El build verifica TypeScript y empaqueta la vista. Ninguna prueba reemplaza la autorización del backend ni la prueba de punta a punta contra él, que sigue pendiente.
