# Handy · Portal interno

Portal interno de Eclipse para operar Handy. Se enfoca en trabajar los **pre-registros de la landing**: quién se anotó, a quién hay que escribirle por WhatsApp y en qué etapa OPS-01 está cada especialista.

Hay dos modos, según el build:

- **Con `VITE_API_BASE_URL`**: login del equipo (email, contraseña y código TOTP si la cuenta lo tiene) y datos reales de `Handy-landing-page-be` por API. No hay credenciales, claves ni datos guardados en el navegador. La muestra no existe en este modo.
- **Sin la variable**: solo la **vista de muestra** (`?demo=1`) con registros sintéticos, sin red y con todas las acciones bloqueadas.

La integración está probada contra un backend simulado; la prueba de punta a punta contra el backend real y el despliegue siguen pendientes.

## Desarrollo local

Requiere Node.js 20.19+ o 22.12+.

```sh
npm install
npm run dev
```

Sin backend configurado, la portada ofrece abrir la vista de muestra con datos ficticios claramente rotulados.

Para trabajar contra el backend local, copiá `.env.example` a `.env.local` y poné `VITE_API_BASE_URL=http://127.0.0.1:3000`. El backend tiene que correr con `AUTH_ENABLED=true` y `ADMIN_ALLOWED_ORIGINS=http://127.0.0.1:5174` (Vite usa ese origen fijo; no hay proxy a propósito, ver [ADR-0002](docs/adr/ADR-0002-sesion-del-equipo-y-publicacion.md)).

## Build para Hostinger (dominio en la raíz)

```sh
VITE_API_BASE_URL=https://api.handyc.com BASE_PATH=/ npm run build
```

Subí el contenido de `dist/` al dominio `interno.handyc.com`: solo trae `index.html` y `assets/` (sin `.env`, sin mapas de código) y una CSP que permite pedidos únicamente a ese API. `VITE_API_BASE_URL` es pública. Detalle y requisitos del backend en [Entornos y publicación](docs/architecture/deployment.md). Ni el dominio ni el hosting están comprados o desplegados.

## Vista de revisión

[Abrir la demo en GitHub Pages](https://toti-gauna.github.io/handy-internal-portal/?demo=1#/inicio). El repositorio y el sitio son públicos. Solo contiene datos ficticios y no debe usarse para operar ni conectarse a datos reales: ese build se rechaza si lleva `VITE_API_BASE_URL` (TECH-31). El hosting del portal operativo sigue pendiente.

## Comprobaciones

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

## Documentación

- [Índice técnico](docs/README.md)
- [Arquitectura frontend](docs/architecture/frontend.md)
- [Seguridad](docs/architecture/security.md)
- [Flujo del portal operativo](docs/modules/portal-operativo.md)
- [Pre-registros de la landing](docs/modules/preregistros.md)
- [Contrato de Handy-landing-page-be](docs/api/landing-be.md)
- [ADR de stack provisional](docs/adr/ADR-0001-stack-web-provisional.md)
- [ADR de sesión del equipo y publicación](docs/adr/ADR-0002-sesion-del-equipo-y-publicacion.md)
