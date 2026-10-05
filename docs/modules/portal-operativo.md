---
id: "PORTAL-MODULE-OPERATIVO"
type: "module"
status: "provisional"
owner: "Tech"
updated: "2026-10-05"
related: ["OPS-01", "MET-01", "PROD-01", "TECH-03", "TECH-06", "TECH-08", "TECH-15", "TECH-28", "LEG-08", "LEG-09", "LEG-36"]
---

# Portal operativo Handy

## Propósito y alcance

Preparar la estructura web para operar el registro de especialistas, localizar cuentas de usuario y reunir herramientas manuales. El alcance funcional sigue a PROD-01 y OPS-01. Esta implementación es una vista de referencia: hasta que exista API segura, solo permite recorrer datos inventados.

Fuera de alcance: campañas, CRM de ventas, mensajería masiva, automatizaciones, soporte de tickets completo, analítica avanzada y handbook editable.

## Pantallas

| Módulo | Entradas visibles | Estado de implementación |
|---|---|---|
| Inicio | Conteo de muestra por etapa, separación pre/post-registro, seguimientos ficticios | Disponible solo en modo de muestra; no incluye metas |
| Especialistas | Filtros por rubro, zona, etapa, nivel de verificación, habilitado y actividad; paginación; ficha y línea de tiempo | Filtros locales sobre fixtures; transición y seguimiento bloqueados |
| Usuarios | Búsqueda, filtro de estado ficticio y ficha mínima | Consulta ficticia; edición y baja ausentes |
| Operaciones | Pedidos sin oferta, conciliación y acciones mínimas de consola | Bloqueado por TECH-15, TECH-28, TECH-06 y TECH-08 |

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

La interfaz muestra intentos de contacto y conversaciones efectivas como eventos distintos. No habilita saltos de etapa. La transición real necesita validación transaccional, actor, fecha, motivo breve y seguimiento en servidor.

## Ficha del especialista

La estructura muestra identificador, rubro, zona, etapa, hitos neutrales, aceptación de contrato/términos, estado de cuenta de cobro sin número, actor/fecha/motivo y siguiente seguimiento. No hay notas libres ni datos sensibles en el modelo de muestra. Los eventos visibles son sintéticos.

El bloque “paso que falta” explica requisitos sin permitir completar una verificación. “Verificado” y “Habilitado” permanecen bloqueados hasta que LEG-08/TECH-06/TECH-08 y el contrato de API permitan validar sus condiciones.

## Directorios y paginación

Los tipos `SpecialistSearch` y `UserSearch` son estructuras internas para la vista de muestra. No son contratos backend. `DemoPortalDataSource` filtra el conjunto ficticio y devuelve solo una página al render. Producción necesita búsqueda, filtros, orden permitido y paginación en servidor, con límites e índices según TECH-03.

## Usuarios

La ficha de muestra contiene solo un ID ficticio, fecha ficticia y estado de ejemplo. No expone chat, direcciones, teléfono, ubicación ni medios de pago. No existe edición, suspensión, bloqueo o borrado manual. LEG-36 debe definir el flujo de baja.

## Operaciones

- Pedido sin oferta: no se cargan registros hasta que TECH-15 cierre criterios, campos, permisos y acciones.
- Conciliación: no se consulta un API hasta que TECH-28 y los contratos de pagos definan estados permitidos.
- Acciones mínimas de PROD-01 —aprobar alta, ofrecer pedido a especialista registrado, ver deudas y reportes— están visibles como bloqueadas, sin efectuar llamadas.

## Seguridad y errores

La ruta normal deniega por defecto. Ninguna autorización depende solo de ocultar un botón: las APIs futuras deben verificar sesión y permiso en servidor. La interfaz de muestra presenta carga, error, vacío y falta de permisos; el error de consulta no altera datos.

## APIs y datos

**APIs consumidas: ninguna.** El repositorio no contiene contratos actuales, URL base, cliente HTTP ni endpoints administrativos. No se crean rutas supuestas. No hay datos persistidos ni migraciones.

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

Los tests unitarios cubren filtros combinados, límites de paginación y denegación de acciones en sesión anónima/demo/sin decisión server-side. El build verifica TypeScript y empaqueta la vista; ninguna prueba reemplaza la autorización de backend pendiente.
