# Tasks: Catálogo para vender

Funcionalidad nueva: el stock de cada producto, «Agregar» a la venta, filtros por disponibilidad
y marca, pestañas más altas y el buscador que dice qué busca (pedido de Carlos del 2026-10-17).

## Tareas

- [x] T001 Especificación, con las preguntas a Carlos, y maquetas del Catálogo en el celular y en la computadora para que elija (pedido de Carlos del 2026-10-17)
- [x] T002 La venta en curso en el negocio compartido, fuera de Vender, y su espejo enganchado desde cada aplicación (ADR-022; E25, E26) (depende de T001)
- [ ] T003 El texto del stock y los filtros por disponibilidad y marca, compartidos por las dos interfaces (E01–E03, E05, E16–E18, E28, E29) (depende de T001)
- [ ] T004 Celular: el Catálogo según la maqueta B (tarjetas, stock, «Agregar», aviso, número en Vender, filtros en hoja, pestañas de 44 px y buscador corto) (E01–E24) (depende de T002 y T003)
- [ ] T005 Computadora: Productos según la maqueta (Stock con etiqueta, «Agregar» y la tecla «+», panel de filtros con Esc, número en Vender, buscador largo) (E06–E20, E22, E27, E30) (depende de T002 y T003)
- [ ] T006 Una prueba por escenario (E01 a E30), anotada en `proyecto/estado.yml` (depende de T004 y T005)
- [ ] T007 Comparar con las maquetas aprobadas mediante capturas de celular y computadora y mostrarle a Carlos las diferencias (depende de T004 y T005)
- [ ] T008 Revisión independiente (`revision.md`) y qué se hizo con cada punto (depende de T006)
- [ ] T009 Actualizar `proyecto/estado.yml` y llevar lo nuevo a las `spec.md` de Catálogo (002) y Ventas (003) (depende de T008)
