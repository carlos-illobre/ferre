# Tasks: Corregir y cambiar una venta

Funcionalidad nueva: corregir cualquier venta y registrar cambios de producto desde «Ventas de
hoy», en el celular y en la computadora (decisiones 124 y 135). Carlos aprobó la especificación y
las maquetas (la v2) el 2026-10-20. Plan, ADR-024.

Cada tarea se nombra con su carpeta (019-T003) y va en el commit. Las dependencias, al final.

## Tareas

- [x] T001 Especificación, para que Carlos la apruebe; plan, modelo de datos, contrato y ADR-024

### Base (bloquea lo demás)

- [x] T002 Migración: tablas `correccion_venta`, `cambio`, `cambio_renglon` y `movimiento_dinero`; en `item_venta`, `quitado_por` y `devuelto` («nunca supera `cantidad`»); tipos nuevos de `movimiento_stock` (`correccion`, `cambio`) y de `anomalia` (`devuelto_fallado`); índice de renglones por producto y fecha de la venta (data-model.md) (depende de T001)
- [x] T003 Los totales del día por medio y la deuda de cuenta corriente suman los movimientos de dinero; la lista del día no cuenta los renglones quitados (RF-131; E21) (depende de T002)
- [ ] T004 En el negocio de ventas de la aplicación, la cuenta de una corrección y de un cambio (total nuevo, diferencia, cómo se resuelve), la misma que hace el servidor (RF-127, RF-130; E02, E14) (depende de T002)

### Historia 1 · Corregir (P1)

- [x] T005 [US1] Servidor: `POST /ventas/:id/corregir` con el permiso según el día de la venta, la versión, la foto de antes y después, el stock por la diferencia, el movimiento de dinero o la deuda, y el evento en Actividad; 403, 409 (anulada, versión vieja, sin renglones) y la cuenta rehecha en el servidor (RF-126 a RF-128; E01 a E10, E22, E24, E25, E27 a E29, E31) (depende de T003)
- [ ] T006 [US1] Computadora: «Ventas de hoy» como la v2 (el día arriba, la lista con filtros y la venta elegida a la derecha con «Corregir» E, «Cambio» C y «Anular»); el modo corregir en el panel, con lo anterior tachado, la diferencia y «Guardar corrección» (Ctrl+Enter) / «Descartar» (Esc) (RF-132; E01 a E10) (depende de T004, T005)
- [ ] T007 [US1] Celular: en la hoja de la venta de la v2, «Corregir» con los − + y el precio editables, lo viejo tachado y el botón que dice cómo queda (RF-132; E01 a E10) (depende de T004, T005)

### Historia 2 · Cambio (P1)

- [ ] T008 [US2] Servidor: `GET /ventas/para-cambio` (15 días, por producto, de a 20) y `POST /ventas/:id/cambio` con el permiso de anular del día, lo que queda por devolver, el precio pagado, lo fallado como anomalía, el stock, el movimiento de dinero o la deuda y el evento (RF-129, RF-130; E11 a E18, E23, E24, E26, E30, E31) (depende de T003)
- [ ] T009 [US2] Computadora: «Registrar un cambio» (Alt+C) y «Cambio» (C): buscar la venta por producto, marcar lo que vuelve y si está fallado, agregar lo que se lleva como en Vender, ver la diferencia y cobrarla o devolverla (RF-132; E11 a E18) (depende de T004, T006, T008)
- [ ] T010 [US2] Celular: «Cambio» desde la hoja de la venta y «Registrar un cambio», con el mismo recorrido (RF-132; E11 a E18) (depende de T004, T007, T008)

### Historia 3 · Ver lo corregido y lo cambiado (P2)

- [ ] T011 [US3] En las dos interfaces: la marca «corregida: eran 4», el renglón «Cambio» del día con su diferencia y «después se cambió» en la venta original; los totales del día con los movimientos (RF-131; E19 a E21) (depende de T006, T007, T009, T010)

### Cierre

- [ ] T012 Una prueba por escenario (019-E01 a E31), anotada en `proyecto/estado.yml`; e2e de corregir y de cambio en celular y computadora (depende de T011)
- [ ] T013 Comparar con las maquetas de la v2 mediante capturas de computadora y de celular y mostrarle a Carlos las diferencias (depende de T012)
- [ ] T014 Revisión independiente: `revision.md`, con lo que encontró y qué se hizo con cada punto (depende de T013)
- [ ] T015 Actualizar `proyecto/estado.yml`, incorporar lo nuevo a la `spec.md` de 003 (RF-24 deja de decir «no hay devoluciones de dinero») y de 017, y marcar T132 en `proyecto/tasks.md` (depende de T014)

## Orden

T002 → T003, T004 → (T005 → T006, T007) y (T008 → T009, T010) → T011 → cierre. Las historias 1 y 2
se pueden hacer en paralelo después de T003 y T004; la 1 sola ya sirve (MVP: corregir).
