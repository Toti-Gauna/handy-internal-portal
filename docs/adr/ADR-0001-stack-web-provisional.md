---
id: "ADR-0001"
type: "architecture-decision"
status: "provisional"
owner: "Tech"
updated: "2026-10-05"
related: ["TECH-06", "TECH-12", "TECH-29"]
---

# ADR-0001 · Stack web provisional

## Contexto

`handy-internal-portal` no tenía aplicación, stack, componentes, autenticación, contratos, CI ni configuración de publicación. TECH-06 sigue abierto para la consola. Las apps existentes son React Native y no son una superficie web. La landing de Handy utiliza Vite y TypeScript.

## Decisión provisional

Crear una SPA independiente con Vite, TypeScript estricto, DOM modular y CSS. Reutilizar los tokens de marca de Handy disponibles en la landing. Mantener el router, la interfaz de datos y los estados de autorización detrás de módulos reemplazables.

## Alternativas consideradas

- React: agregaría un framework y un stack que no está decidido para este portal.
- React Native Web: mezclaría el ciclo de las apps móviles con una superficie web nueva, sin una decisión que lo indique.
- HTML estático sin TypeScript: dejaría filtros, navegación, estados y reglas frontend sin tipos.

## Consecuencias

- La elección es reversible y no cambia las apps ni los servicios backend.
- No implica hosting, publicación o proveedor de identidad.
- El portal sigue siendo una vista de referencia hasta resolver TECH-06/TECH-08 y los contratos dependientes.
- Revisar esta decisión cuando TECH-06 cierre el stack final del portal.
