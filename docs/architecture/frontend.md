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
- Archivo y DM Sans empaquetadas con `@fontsource-variable` (sin pedidos a Google Fonts). Íconos de línea y personajes (`src/img/*.webp`) copiados de la landing.

No se tomó React Native como stack web ni se modificaron las apps móviles. Vite/TypeScript es una elección reversible que coincide con el tooling web existente de Handy y evita sumar una librería de UI mientras TECH-06 siga abierto. Esta elección no cierra la decisión del stack final del portal.

## Módulos

- `src/pages`: inicio, pre-registros (lista y ficha) y especialistas.
- `src/components`: frame (header y barra inferior en el celular), íconos, estados con personajes y escape/formato de texto.
- `src/domain`: etapas OPS-01, pre-registros (esquema de la landing, estado de contacto, cola, WhatsApp), filtros de muestra y paginación local.
- `src/data`: fixtures ficticios y fuentes de datos (muestra, HTTP y pendiente).
- `src/contracts`: esquemas zod del contrato con `Handy-landing-page-be`.
- `src/config.ts`: configuración por build (`VITE_API_BASE_URL`).
- `src/security`: guardas frontend con denegación por defecto.
- `src/brand`, `src/styles.css` y `src/styles/` (`base`, `layout`, `components`, `pages`): tokens y estilos.

## Lenguaje visual

Sigue la landing y la app: títulos en Archivo 900 ensanchado con marcador amarillo (`==texto==` en `pageHeading`), botones táctiles con base que se hunde, mosaicos grises para rubros, tarjetas blancas con franja gris, hojas azules con manija, avatares con iniciales, contadores como la cuenta regresiva y los Handys en los estados vacíos, de carga y de error. En el celular, la navegación es una barra azul inferior como la de la app.

`PortalDataSource` es la interfaz que usan todas las páginas; ninguna importa fixtures. Tiene tres implementaciones:

- `DemoPortalDataSource` aplica búsqueda, filtros y paginación solo sobre fixtures (`?demo=1`).
- `HttpPortalDataSource` implementa el [contrato propuesto](../api/landing-be.md) contra `VITE_API_BASE_URL` (`src/config.ts`) y valida las respuestas con los esquemas de `src/contracts/`.
- `PendingPortalDataSource` devuelve un bloqueo explícito cuando no hay URL configurada.

Las fallas se normalizan en `PortalSourceError` y se muestran con `renderSourceError`.

## Estados de interfaz

Los directorios soportan carga, error con reintento, vacío y datos disponibles. La ruta normal muestra falta de sesión/permisos. En la muestra, las acciones no se habilitan aunque se pueda recorrer la navegación.

La lista de muestra limita las filas renderizadas a la página seleccionada. El filtrado de producción debe implementarse en servidor cuando TECH-03/TECH-06 definan los contratos; la lógica local no se debe reutilizar como paginación operativa.

## Datos

- Sin tokens en `localStorage` o `sessionStorage`.
- Sin escrituras en el navegador. La única interacción con APIs del navegador es copiar el mensaje sugerido al portapapeles.
- Sin telemetría, IA ni llamadas a servicios de terceros. La única llamada de red posible es al backend configurado en `VITE_API_BASE_URL`.
- Todos los registros de muestra llevan identificadores `*-DEMO-*`, nombres inventados, emails `@example.com` y WhatsApp del bloque ficticio 223 000-xxxx.
