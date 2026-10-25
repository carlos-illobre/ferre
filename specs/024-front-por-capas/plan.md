# Plan: El front, por capas y en piezas chicas

**Spec**: [spec.md](spec.md) (aprobada el 2026-10-24) · **Decisión**: 155 · **ADR**:
[ADR-028](../../docs/adr/ADR-028-el-front-por-capas-y-en-piezas-chicas.md).

## Summary

Reordenar `microservices/web/src` en seis capas (`app/`, `plataforma/`, `datos/`, `ui/`,
`negocio/`, `pantallas/`), sin cambiar nada de lo que hace la aplicación. Primero se ponen las mediciones y
las reglas, que arrancan con la lista de lo que hoy no cumple. Después se ordena por etapas, y
cada etapa vacía su parte de esa lista.

## Technical Context

- React 18 + Vite + TypeScript; TanStack Query; React Router por hash; vitest y Playwright.
- Nuevo en desarrollo:
  - ESLint 9 con `typescript-eslint`, solo con las reglas de los límites, no de estilo;
  - `jscpd` para el código copiado.
- Estilos con CSS Modules, que Vite trae sin agregar nada.
- `dependency-cruiser` ya está: se le agregan las reglas de ADR-028.

## Constitution Check

- No cambia ninguna regla de negocio ni ninguna pantalla: no lleva maquetas.
- Cada etapa se sube con las unitarias y las e2e en verde (constitución, pruebas antes de subir).
- La decisión técnica está en ADR-028.

## Seguridad

- No cambia qué puede hacer cada persona. Los permisos siguen en `negocio/` y en el servidor, que
  los controla en cada pedido.
- No se guarda nada nuevo en el dispositivo. IndexedDB solo se mueve de carpeta: las bases y sus
  nombres no cambian, y lo que cada dispositivo tiene guardado sigue sirviendo.
- Las dependencias nuevas son solo de desarrollo: no llegan al navegador.

## Etapas

Cada una deja todo en verde y se sube sola.

1. **Mediciones y reglas.**
   - ESLint con los límites, `jscpd` y las reglas de capas de ADR-028 en `pnpm capas`.
   - Cada uno arranca con la lista de lo que hoy no cumple.
   - Corren en el CI con `pnpm typecheck` (tipos, `pnpm capas` y `pnpm limites`).
2. **`app/` y la raíz de `src/`.**
   - El arranque va a `app/`.
   - Cada archivo suelto de la raíz va a su capa:
     - `almacen`, `cola`, `guardado`, `descarga` y `preferencias` a `datos/almacenamiento/`;
     - `api` y `consultas` a `datos/conexion/` (después, `espejo` y `puesto`);
     - `sesion` y `ajustes-del-sistema` a `datos/sesion/`, y `credenciales` a `datos/credenciales/`;
     - `producto` (la forma del producto que llega y se guarda) a `datos/almacenamiento/`;
     - `catalogo` y `unidades` a `negocio/catalogo/`;
     - la lista de permisos a `negocio/permisos/`;
     - el arranque y la elección de interfaz a `app/`.
   - Lo que specs/022 o specs/023 estén cambiando se mueve cuando esas terminen.
3. **`ui/` única.**
   - Las piezas de `compu/base/ui.tsx` y `celular/componentes/base.tsx`, juntas.
   - Un solo juego de íconos (T138).
   - La paleta y las variables de tamaño de cada interfaz.
4. **Capacidad por capacidad**, en este orden: ventas, catálogo, depósito, compras, negocio y
   usuarios, anomalías, mejoras y errores, configuración y sistema, entrada y vínculo. En cada una:
   - la regla y los datos a `negocio/<capacidad>/`, detrás de un hook;
   - lo común a las dos interfaces a `pantallas/comun/<capacidad>/`;
   - cada pantalla, partida en piezas de menos de 40 líneas, con su `.module.css`;
   - su parte de la lista de excepciones, vacía.
5. **Teclado aparte** (ADR-029, T012 y T016 a T020): las pantallas ofrecen acciones con nombre
   (`plataforma/comandos/`) y `teclado/` tiene las tablas de qué tecla pide cada una; las teclas
   mismas se rehacen en T147.
6. **Cierre:** la lista de excepciones vacía, la documentación al día y la revisión (paso 7).

## Project Structure

### Documentation (this feature)

`specs/024-front-por-capas/`: spec.md, plan.md, tasks.md.

### Source Code

`microservices/web/src/` (ver ADR-028), `microservices/web/eslint.config.js`,
`microservices/web/.jscpd.json` y `microservices/web/.dependency-cruiser.cjs`.

## Complexity Tracking

Durante las etapas hay una lista de excepciones de los límites; se vacía al terminar.
