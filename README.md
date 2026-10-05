# Handy · Portal interno

Portal web modular para operación interna. Este primer corte es una **vista de referencia**: muestra módulos y estados con registros sintéticos, sin autenticación conectada, sin API operativa y sin persistencia.

La autenticación y autorización del portal dependen de decisiones y contratos backend aún pendientes. No uses la vista de referencia para operar cuentas reales. El ingreso a la interfaz de muestra no habilita acceso a datos reales y todas las acciones operativas permanecen bloqueadas.

## Desarrollo local

Requiere Node.js 20.19+ o 22.12+.

```sh
npm install
npm run dev
```

La portada explica el bloqueo de acceso. Desde allí se puede abrir una vista de muestra con datos ficticios claramente rotulados.

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
- [ADR de stack provisional](docs/adr/ADR-0001-stack-web-provisional.md)
