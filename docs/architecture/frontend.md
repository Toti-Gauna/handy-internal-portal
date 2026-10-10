---
id: "PORTAL-ARCH-FRONTEND"
type: "architecture"
status: "provisional"
owner: "Tech"
updated: "2026-10-10"
related: ["TECH-06", "TECH-12", "TECH-29", "TECH-32", "PORTAL-ADR-0002"]
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

- `src/pages`: ingreso (login, MFA, acceso denegado), inicio, pre-registros (lista y ficha) y especialistas.
- `src/app`: estado, render, eventos y acciones de sesión (`session.ts`).
- `src/components`: frame (header y barra inferior en el celular), íconos, estados con personajes y escape/formato de texto.
- `src/domain`: etapas OPS-01, pre-registros (tipos del contrato, acciones por etapa, enlace de WhatsApp), registro de contactos (`evento.ts`: validación e idempotencia), y los filtros y la paginación que solo usa la muestra.
- `src/data`: fixtures ficticios, la sesión del equipo (`admin-session.ts`) y las fuentes de datos (muestra, HTTP y pendiente).
- `src/contracts`: esquemas zod del contrato real con `Handy-landing-page-be` (sesión, pre-registros, errores).
- `src/config.ts`: configuración por build (`VITE_API_BASE_URL`).
- `src/security`: guardas y permisos de interfaz con denegación por defecto (el servidor decide igual).
- `src/brand`, `src/styles.css` y `src/styles/` (`base`, `layout`, `components`, `pages`): tokens y estilos.

## Lenguaje visual

Sigue la landing y la app: títulos en Archivo 900 ensanchado con marcador amarillo (`==texto==` en `pageHeading`), botones táctiles con base que se hunde, mosaicos grises para rubros, tarjetas blancas con franja gris, hojas azules con manija, avatares con iniciales, contadores como la cuenta regresiva y los Handys en los estados vacíos, de carga y de error. En el celular, la navegación es una barra azul inferior como la de la app.

`PortalDataSource` es la interfaz que usan todas las páginas; ninguna importa fixtures. Tiene tres implementaciones:

- `DemoPortalDataSource` aplica búsqueda, filtros y paginación solo sobre fixtures (`?demo=1`, **solo en un build sin `VITE_API_BASE_URL`**).
- `HttpPortalDataSource` implementa el [contrato del backend](../api/landing-be.md) contra `VITE_API_BASE_URL` (`src/config.ts`), usando la sesión de `AdminSessionClient`, y valida las respuestas con los esquemas de `src/contracts/`.
- `PendingPortalDataSource` devuelve un bloqueo explícito cuando no hay URL configurada.

Las fallas se normalizan en `PortalSourceError` (con `reason` del 403, `conflict` del 409 y `campos` del 400) y se muestran con `renderSourceError`.

## Estados de interfaz

Estados de sesión: cargando (al abrir o recargar), sin sesión (login, con paso de código si la cuenta tiene TOTP), sesión sin permiso de lectura ("acceso denegado") y autenticada. Los directorios soportan carga, error recuperable con reintento (red, `429`, `503`), permiso faltante, vacío y datos disponibles; el `403` distingue permiso, CSRF y origen. Una sesión que se pierde mientras se usa vuelve al login. En la muestra, las acciones no se habilitan aunque se pueda recorrer la navegación.

Con el backend, búsqueda (exacta), filtros, orden y paginación (hasta 50 por página) los hace el servidor; la lógica local de `src/domain` solo alimenta la muestra y no se debe reutilizar como paginación operativa.

## Datos

- Sin tokens, CSRF ni datos administrativos en `localStorage`, `sessionStorage`, cookies propias, IndexedDB ni URL (lo vigila `src/security/no-storage.test.ts`). El `csrfToken` y el borrador del formulario viven solo en memoria.
- Sin escrituras en el navegador. La única interacción con APIs del navegador es copiar el mensaje sugerido al portapapeles.
- Sin telemetría, IA ni llamadas a servicios de terceros. La única llamada de red posible es al backend configurado en `VITE_API_BASE_URL`.
- Todos los registros de muestra llevan identificadores `*-DEMO-*`, nombres inventados, emails `@example.com` y WhatsApp del bloque ficticio 223 000-xxxx.
