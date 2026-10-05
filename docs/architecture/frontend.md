---
id: "PORTAL-ARCH-FRONTEND"
type: "architecture"
status: "provisional"
owner: "Tech"
updated: "2026-10-05"
related: ["TECH-06", "TECH-12", "TECH-29", "TECH-32"]
---

# Arquitectura frontend

## Stack provisional

- Vite y TypeScript para build, desarrollo local y typecheck.
- DOM y módulos TypeScript sin framework de componentes.
- Navegación por hash para que la vista de referencia no dependa de reglas de rewrite del servidor.
- CSS propio con tokens de Handy reutilizados desde `Handy-landing-page-fe/src/brand/tokens.ts`.

No se tomó React Native como stack web ni se modificaron las apps móviles. Vite/TypeScript es una elección reversible que coincide con el tooling web existente de Handy y evita sumar una librería de UI mientras TECH-06 siga abierto. Esta elección no cierra la decisión del stack final del portal.

## Módulos

- `src/pages`: inicio, especialistas, usuarios y operaciones.
- `src/components`: frame, mensajes de estado y escape de texto.
- `src/domain`: etapas OPS-01, filtros de muestra y paginación local.
- `src/data`: fixtures ficticios y adaptadores de fuente.
- `src/security`: guardas frontend con denegación por defecto.
- `src/brand`, `src/styles.css` y `src/styles/`: tokens y hojas CSS fragmentadas para la presentación Handy y la base de GitHub Pages.

`PortalDataSource` es una interfaz interna del frontend, no un contrato REST. `DemoPortalDataSource` aplica búsqueda, filtros y paginación únicamente sobre fixtures. `PendingPortalDataSource` devuelve un bloqueo explícito; no inventa rutas ni parámetros de API.

## Estados de interfaz

Los directorios soportan carga, error con reintento, vacío y datos disponibles. La ruta normal muestra falta de sesión/permisos. En la muestra, las acciones no se habilitan aunque se pueda recorrer la navegación.

La lista de muestra limita las filas renderizadas a la página seleccionada. El filtrado de producción debe implementarse en servidor cuando TECH-03/TECH-06 definan los contratos; la lógica local no se debe reutilizar como paginación operativa.

## Datos

- Sin tokens en `localStorage` o `sessionStorage`.
- Sin escrituras en el navegador.
- Sin telemetría, IA ni llamadas a servicios de terceros.
- Todos los registros del directorio de muestra llevan identificadores `*-DEMO-*` y campos sin PII.
