# Feature Specification: Información del negocio

**Feature Branch**: `006-informacion-del-negocio`

**Created**: 2026-10-10

**Status**: Baseline

**Input**: Línea de base: lo construido antes de adoptar Spec Kit (docs/REQUERIMIENTOS.md, sección 3.5)

## User Scenarios & Testing *(mandatory)*

De esta capacidad está construido solo el gasto semanal en compras (RF-65). El tablero, el
cierre de caja, las novedades del día y los gastos fijos (RF-60 a RF-64) no están
construidos y no figuran acá. Del caso de uso CU-08 («Ver cómo va el negocio») existe la
parte que se describe en la historia 2; del CU-12 («Cerrar la caja») no existe nada.

### User Story 1 - Ver cuánto se gastó en compras esta semana, sin papel (Priority: P1)

El Comprador registra cada ingreso de mercadería y, en la misma pantalla, ve cuánto se
lleva gastado en compras en los últimos siete días. Ya no hace falta juntar los papeles de
la semana para sumarlos.

**Why this priority**: es lo único de la capacidad que reemplaza hoy una tarea de papel, y
es el dato del que van a salir el tablero y el resultado mensual.

**Independent Test**: con una compra registrada a un proveedor, se abre el ingreso de
mercadería y «Gastos de la semana» muestra el importe de esa compra.

**Acceptance Scenarios**:

1. **Given** un Comprador en el celular que acaba de registrar un ingreso de $16.000 a un proveedor, **When** mira «Gastos de la semana» en Depósito · Ingreso, **Then** ve el total de $16.000 sin recargar la pantalla.
   - Prueba: tests/e2e/celular/05-compras.spec.ts, clientes/gestion-del-local-web/src/pantallas/Deposito.test.tsx
2. **Given** un Comprador en la computadora que acaba de registrar un ingreso a un proveedor, **When** mira «Gastos de la semana» en Compras, **Then** el proveedor figura en el detalle, que ya viene desplegado.
   - Prueba: tests/e2e/escritorio/05-compras.spec.ts, clientes/gestion-del-local-web/src/escritorio/pantallas/Compras.test.tsx
3. **Given** una compra de la semana que se anuló, **When** se consulta el gasto de la semana, **Then** esa compra no se suma.
   - Prueba: ninguna
4. **Given** una compra con fecha de hace más de seis días, **When** se consulta el gasto de la semana, **Then** esa compra no se suma: cuentan hoy y los seis días anteriores.
   - Prueba: ninguna
5. **Given** que no hay compras confirmadas en los últimos siete días, **When** se abre Compras en la computadora, **Then** «Gastos de la semana» no aparece.
   - Prueba: ninguna

---

### User Story 2 - Ver cómo va el negocio desde el celular (Priority: P2)

El Administrador abre Negocio en el celular y ve, sin tocar nada, lo vendido hoy y lo
gastado en compras en la semana, proveedor por proveedor.

**Why this priority**: es la parte construida de CU-08. Sirve para mirar el negocio a
distancia, pero todavía no trae ganancia, lo más vendido ni novedades.

**Independent Test**: con ventas de hoy y compras de la semana cargadas, se abre Negocio y
se leen los dos números con su detalle.

**Acceptance Scenarios**:

1. **Given** compras confirmadas en los últimos siete días, **When** el Administrador abre Negocio en el celular, **Then** ve «Gastos de la semana» con el total y, por cada proveedor, cuánto se le compró y en cuántas compras.
   - Prueba: clientes/gestion-del-local-web/src/pantallas/Negocio.test.tsx
2. **Given** ventas confirmadas hoy, **When** el Administrador abre Negocio en el celular, **Then** ve el total vendido hoy, cuántas ventas fueron y el detalle de cada una.
   - Prueba: clientes/gestion-del-local-web/src/pantallas/Negocio.test.tsx, tests/e2e/celular/04-vender.spec.ts
3. **Given** que no hay compras confirmadas en los últimos siete días, **When** se abre Negocio en el celular, **Then** «Gastos de la semana» no aparece.
   - Prueba: ninguna

---

### Edge Cases

- **La semana es móvil, no de lunes a domingo:** se suman hoy y los seis días anteriores,
  según la fecha de la compra (la que se cargó), no según cuándo se registró.
- **Sin conexión:** el gasto de la semana se pide al servidor y no se guarda en el
  dispositivo. Sin conexión no aparece en ninguna de las pantallas.
- **Depósito · Ingreso (celular) sin compras recientes:** el bloque completo de compras
  recientes, con el título «Gastos de la semana», no se muestra.
- **Cualquier usuario con sesión ve estos números:** hoy no se distingue por rol (el
  detalle de qué rol puede qué es RF-72, fuera de esta etapa).

## Requirements *(mandatory)*

### Functional Requirements

- **RF-65**: El sistema muestra el gasto en compras de los últimos siete días (hoy y los
  seis anteriores), sin papel: el total y, por proveedor, el importe y la cantidad de
  compras, ordenado de mayor a menor importe. Solo cuentan las compras confirmadas; las
  anuladas no. Se ve donde se registran las compras, en el celular y en la computadora, y
  además en Negocio en el celular.

### Key Entities *(include if feature involves data)*

Esta capacidad no tiene entidades propias: lee las de otras. El detalle está en
[data-model.md](data-model.md).

- **Compra**: cada ingreso de mercadería a un proveedor, con su fecha, su total y su estado
  (confirmada o anulada). Es de la capacidad de compras y stock.
- **Proveedor**: a quién se le compró; da el nombre con que se agrupa el gasto.
- **Venta**: las ventas de hoy que resume Negocio. Es de la capacidad de ventas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Para saber cuánto se gastó en compras en la semana no hace falta ningún papel
  ni ninguna suma a mano: el número está a la vista en la pantalla donde se cargan las
  compras.
- **SC-002**: Una compra recién registrada se refleja en el gasto de la semana sin recargar
  la pantalla.
- **SC-003**: El gasto de la semana coincide con la suma de los totales de las compras
  confirmadas de esos siete días.

## Assumptions

- Registrar, ver y anular compras (RF-50) pertenece a la capacidad de compras y stock; acá
  solo se describe la suma semanal que sale de ellas.
- Las ventas de hoy que muestra Negocio (total, detalle y anulación) son RF-23, de la
  capacidad de ventas. El escenario 2 de la historia 2 solo deja constancia de que Negocio
  las muestra.
- La «plata invertida en stock» que nombra CU-08 está construida como RF-53 (capacidad de
  compras y stock) y se ve en Depósito / Stock, no en Negocio.
- Las historias nombran los roles Administrador y Comprador como los casos de uso. El
  sistema construido tiene los roles dueño, admin y mostrador, y las rutas de esta capacidad
  solo exigen tener sesión.
- En la computadora no hay pantalla de Negocio con estos números: el gasto de la semana se
  ve en Compras y las ventas de hoy, en Vender.

## Clarifications

Ninguna de las decisiones del dueño del 2026-10-08 y del 2026-10-09
(docs/REQUERIMIENTOS.md, sección 7) trata sobre lo construido en esta capacidad. Dos la
rozan y quedan anotadas:

### Session 2026-10-09

- Q: ¿Cómo se dan los permisos para ver la información del negocio? → A: Por rol:
  Administrador, Vendedor y Comprador, combinables. «Ver cómo va el negocio» es del
  Administrador (decisión 8, sección 2). Qué rol puede ver las ventas del día sigue abierto
  (sección 9, punto 1; RF-72).
- Q: ¿Negocio tiene que ser igual en las dos interfaces? → A: Celular y computadora son
  interfaces distintas: la del celular queda como está y la de la computadora usa el layout
  de tablas (decisión 9, ADR-014).
