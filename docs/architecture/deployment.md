---
id: "PORTAL-ARCH-DEPLOYMENT"
type: "architecture"
status: "blocked"
owner: "Tech"
updated: "2026-10-05"
related: ["TECH-06", "TECH-09", "TECH-21", "TECH-31", "TECH-32"]
---

# Entornos y publicación

## Estado

No hay hosting, entorno remoto, dominio, workflow CI ni publicación configurados en el repositorio. El build disponible es local y genera `dist/`. No desplegar este artefacto como portal operativo: no tiene autenticación ni API.

## Desarrollo

- Node.js 20.19+ o 22.12+.
- `npm install`, `npm run dev`.
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## Decisiones pendientes

TECH-06 debe cerrar el alcance de consola y las operaciones con Tech/Operations. El hosting de este portal sigue sin ID/decisión asignada; TECH-09 y TECH-21 cubren costos y CI. TECH-31 prohíbe GitHub Pages y Vercel Hobby para uso comercial; TECH-32 corresponde a la landing, no elige el hosting del portal.

No agregar proveedor, servicio pago, variable secreta ni publicación hasta que la decisión del portal lo defina.
