# Instrucciones para el repositorio

- Revisá el índice en [`docs/README.md`](docs/README.md) antes de cambiar arquitectura, datos, permisos o comportamiento.
- El contrato con el backend es el implementado en `Handy-landing-page-be` (`docs/openapi.json`, `docs/auth.md`, `docs/crm.md`) y está resumido en [`docs/api/landing-be.md`](docs/api/landing-be.md). Si difiere de lo "propuesto", manda el backend. No inventes endpoints ni campos; lo que falta se documenta como límite.
- La única variable del portal es `VITE_API_BASE_URL` y es **pública**: sin secretos, credenciales ni claves en el frontend. Con la variable el portal usa el login del equipo y datos reales; la muestra (`?demo=1`, fixtures ficticios) existe solo cuando no hay variable. Nunca mezcles datos de muestra con una API real.
- No guardes nada administrativo en el navegador: ni tokens, ni CSRF, ni datos personales en `localStorage`, `sessionStorage`, cookies propias, IndexedDB o URL. El `csrfToken` vive solo en memoria y la sesión es una cookie `HttpOnly` del backend. `src/security/no-storage.test.ts` lo vigila.
- Los pedidos autenticados pasan por `AdminSessionClient` (`credentials: "include"`, `X-CSRF-Token` en los POST, un solo refresh en vuelo y un reintento). No hagas `fetch` a `/admin` ni a `/auth` por otro camino.
- Cada evento de contacto lleva `Idempotency-Key` (UUIDv4, reusada al reintentar el mismo envío) y la `version` vista; `fechaAltaAceptada` es distinta de `proximoSeguimiento`.
- Los permisos de la interfaz (`src/security/access.ts`) son una ayuda: el servidor decide. Ocultá o deshabilitá lo que el servidor rechazaría (`preregistros:contact`, `preregistros:support`).
- WhatsApp es solo un enlace `wa.me` que toca el operador, con el número normalizado por el backend, `rel="noopener noreferrer"` y sin texto prellenado. La app nunca contacta por su cuenta.
- No agregues campos personales sensibles, datos reales en pruebas o fixtures (solo `example.test`/`example.com` y números `223 000-xxxx`) ni logs con datos personales.
- Actualizá los documentos del módulo junto con los cambios de comportamiento conforme a TECH-12.
