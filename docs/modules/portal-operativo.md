---
id: "PORTAL-MODULE-OPERATIVO"
type: "module"
status: "provisional"
owner: "Tech"
updated: "2026-10-05"
related: ["OPS-01", "MET-01", "PROD-01", "TECH-03", "TECH-06", "TECH-08", "TECH-15", "TECH-28", "LEG-08", "LEG-09", "LEG-36", "PORTAL-MODULE-PREREGISTROS"]
---

# Portal operativo Handy

## Propósito y alcance

Portal interno de Eclipse para operar Handy, enfocado en lo que se usa hoy: trabajar los pre-registros de la landing y seguir a los especialistas por el embudo OPS-01. El alcance funcional sigue a PROD-01 y OPS-01. Esta implementación es una vista de referencia: hasta que exista una API segura, solo permite recorrer datos inventados.

Fuera de alcance: campañas, CRM de ventas, mensajería masiva, automatizaciones, soporte de tickets completo, analítica avanzada, handbook editable y exportación de datos personales.

## Pantallas

| Módulo | Entradas visibles | Estado de implementación |
|---|---|---|
| Inicio | Contadores de pre-registros, cola "Para contactar", especialistas anotados por rubro y embudo OPS-01 (pre y post-registro) | Solo en modo de muestra; no incluye metas |
| Pre-registros | Especialistas y usuarios del formulario de la landing; ver [Pre-registros](preregistros.md) | Filtros locales sobre fixtures; abrir WhatsApp y registrar contacto, bloqueados |
| Especialistas | Desde Verificado hasta Activo: filtros por rubro, etapa, verificación, habilitado y actividad; ficha y línea de tiempo | Filtros locales sobre fixtures; transición bloqueada |

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

Identificado, Contactado y Comprometido se trabajan en Pre-registros; desde Verificado, en Especialistas. La interfaz muestra intentos de contacto y conversaciones efectivas como eventos distintos. No habilita saltos de etapa. La transición real necesita validación transaccional, actor, fecha, motivo breve y seguimiento en servidor.

## Ficha del especialista

La estructura muestra identificador, rubro, zona, etapa, hitos neutrales, aceptación de contrato/términos, estado de cuenta de cobro sin número, actor/fecha/motivo y siguiente seguimiento. No hay notas libres ni datos sensibles en el modelo de muestra. Los eventos visibles son sintéticos.

El bloque “paso que falta” explica requisitos sin permitir completar una verificación. “Verificado” y “Habilitado” permanecen bloqueados hasta que LEG-08/TECH-06/TECH-08 y el contrato de API permitan validar sus condiciones.

## Directorios y paginación

Los tipos `SpecialistSearch`, `EspecialistaPreSearch` y `UsuarioPreSearch` son estructuras internas para la vista de muestra. No son contratos backend. `DemoPortalDataSource` filtra el conjunto ficticio y devuelve solo una página al render. Producción necesita búsqueda, filtros, orden permitido y paginación en servidor, con límites e índices según TECH-03.

## Pendientes fuera de pantalla

- Cuentas de usuarios de la app: sin pantalla hasta que TECH-03 defina la lectura y LEG-36 la baja.
- Pedido sin oferta (TECH-15) y conciliación (TECH-28): sin pantalla hasta que existan sus contratos.
- Acciones mínimas de PROD-01 (aprobar alta, ofrecer pedido, ver deudas y reportes): pendientes de TECH-06.

## Seguridad y errores

La ruta normal deniega por defecto. Ninguna autorización depende solo de ocultar un botón: las APIs futuras deben verificar sesión y permiso en servidor. La interfaz de muestra presenta carga, error, vacío y falta de permisos; el error de consulta no altera datos.

## APIs y datos

**APIs consumidas: ninguna.** El repositorio no contiene contratos aprobados, URL base, cliente HTTP ni endpoints administrativos. La lectura de pre-registros tiene una propuesta documentada en [Pre-registros](preregistros.md), sin implementar. No hay datos persistidos ni migraciones.

## Dependencias y decisiones pendientes

| ID | Pendiente | Efecto en este módulo |
|---|---|---|
| TECH-03 | Modelo de datos/contratos de lectura | Bloquea integración real de especialistas y usuarios |
| TECH-06 | Alcance de consola, permisos y acciones operativas | Bloquea operación y mutaciones |
| TECH-08 | Autenticación y autorización server-side | Mantiene acceso real denegado |
| TECH-15 | Contrato de intervención y pedido sin oferta | Bloquea esa cola y sus acciones |
| TECH-28 | Contrato de conciliación y pagos | Bloquea resumen y consulta financiera |
| LEG-08 | Checklist de alta provisional | Bloquea fijar hitos operativos como regla final |
| LEG-36 | Flujo de baja de cuenta | Bloquea cualquier acción de baja |

## Verificación

Los tests unitarios cubren filtros combinados, límites de paginación, la lógica de pre-registros (estado de contacto, cola, WhatsApp) y la denegación de acciones en sesión anónima, en la demo o sin decisión server-side. El build verifica TypeScript y empaqueta la vista; ninguna prueba reemplaza la autorización de backend pendiente.
