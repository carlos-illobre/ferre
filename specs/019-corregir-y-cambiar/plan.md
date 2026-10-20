# Implementation Plan: Corregir y cambiar una venta

**Branch**: `019-corregir-y-cambiar` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/019-corregir-y-cambiar/spec.md`

## Summary

Una venta confirmada se puede corregir (cantidades, precios, renglones, medio y cliente) y se le
puede registrar un cambio de producto dentro de los 15 días, desde «Ventas de hoy» en el celular y
en la computadora. La venta no se reescribe a ciegas: cada corrección guarda una foto de cómo
estaba y de cómo quedó; cada cambio guarda lo que volvió (con si estaba fallado) y lo que se llevó.
La plata que se cobra o se devuelve por la diferencia queda como un **movimiento de dinero** del
día en que pasó, con su medio; en cuenta corriente, el movimiento cambia la deuda del cliente. El
stock se mueve por la diferencia, con su referencia; lo devuelto fallado no vuelve al stock y queda
como anomalía de su propio tipo. Todo pasa en una sola transacción del servidor, que valida el
permiso, el plazo y que nadie haya tocado la venta mientras tanto. ADR-024.

## Technical Context

**Language/Version**: TypeScript (servidor y aplicación), igual que el resto.

**Primary Dependencies**: las de siempre (Hono, Kysely, React); nada nuevo.

**Storage**: PostgreSQL: tres tablas nuevas (correcciones, cambios con sus renglones, movimientos
de dinero), dos columnas nuevas en el renglón de venta (quitado por una corrección; devuelto) y dos
tipos nuevos (movimiento de stock por corrección y por cambio; anomalía «devuelto fallado»).

**Testing**: unitarias del servidor contra la base de prueba y de las pantallas; e2e en celular y
computadora (corregir, cambio, totales del día).

**Target Platform**: el servidor de siempre; la aplicación en los dos juegos de pantallas.

**Project Type**: aplicación web con servidor.

**Performance Goals**: buscar las ventas de 15 días que tienen un producto en menos de 1 s, con un
índice por producto y fecha (ya existe el índice por producto).

**Constraints**: con conexión (como anular); el mínimo de datos que viajan (018): la búsqueda del
cambio trae solo las ventas que tienen el producto, de a 20.

**Scale/Scope**: decenas de correcciones y cambios por mes.

## Constitution Check

- **I. La especificación manda:** la 019 está aprobada (Carlos, 2026-10-20) con sus maquetas.
- **II. El cuaderno y la calculadora:** corregir es «tachar y escribir encima» y el cambio usa el
  precio pagado; la diferencia se ve antes de guardar.
- **III. Celular y computadora:** las mismas reglas, en el mismo lugar del negocio de la aplicación;
  cada interfaz con su pantalla de la v2.
- **IV. Sin internet:** corregir y cambiar piden conexión y lo dicen, como anular; vender sigue sin
  conexión (RF-123).
- **V. Nada se borra y todo número se explica:** la venta guarda su foto anterior; un renglón
  quitado se marca, no se borra; cada peso cobrado o devuelto es un movimiento con su motivo.
- **VI. Primero la prueba:** un escenario, una prueba (019-E01…E30).
- **VII. Seguro por defecto:** ver «Seguridad».
- **VIII. Costo cero:** nada nuevo que pagar; consultas cortas y por índice.
- **IX. Palabras del mostrador:** «Corregir», «Cambio», «Devolver», «fallado».
- **X. Toda decisión escrita:** decisiones 124 y 135; ADR-024.

Sin violaciones.

## Seguridad

- **Datos que toca:** ventas, sus renglones, clientes con cuenta corriente y su deuda, stock,
  anomalías y la Actividad. Nada de datos personales nuevos.
- **Permisos:** el servidor decide siempre, no la pantalla. Corregir una venta de hoy pide «Anular
  ventas del día» (o el de cualquier día); de otro día, «Anular ventas de cualquier día». Registrar
  un cambio pide «Anular ventas del día» (o el de cualquier día) para ventas de hasta 15 días. Sin
  permiso: 403 y nada se toca; la pantalla no muestra el botón. Una venta anulada: 409.
- **Lo que entra desde afuera:** cada pedido se valida con su esquema (cantidades positivas con la
  regla de la unidad, precios no negativos, medios conocidos, el cliente existe y tiene cuenta
  corriente si hace falta). El servidor recalcula los totales y la diferencia; no confía en los que
  manda la pantalla. No se devuelve más de lo vendido menos lo ya devuelto. La corrección lleva la
  marca de la versión de la venta que se editó: si cambió, 409 (no se pisa a otro).
- **Secretos:** ninguno nuevo.
- **Registro:** cada corrección y cada cambio queda en Actividad con quién, cuándo, el dispositivo,
  lo de antes y lo de ahora, la diferencia y cómo se resolvió.
- **Decisión de arquitectura:** ADR-024 (la venta corregida guarda su historia y la plata de las
  diferencias va en movimientos de dinero).

## Project Structure

### Documentation (this feature)

`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`, `tasks.md`,
`checklists/`.

### Source Code (repository root)

- Servidor: una migración (tablas y tipos nuevos); en ventas, las reglas de corregir y de cambio,
  sus datos y sus rutas; la deuda de clientes y los totales del día con los movimientos de dinero;
  las anomalías con el tipo «devuelto fallado»; los contratos.
- Cliente: en el negocio de ventas, armar una corrección y un cambio y calcular la diferencia (la
  misma cuenta que el servidor); «Ventas de hoy» de la computadora como la v2 con la venta a la
  derecha y sus tres verbos; la hoja de la venta del celular con «Corregir» y «Cambio»; los textos.

## Complexity Tracking

- **Una foto de la venta por corrección.** Es más que actualizar en el lugar, pero es lo que pide
  el principio V y hace posible mostrar lo anterior tachado y reconstruir todo desde Actividad.
