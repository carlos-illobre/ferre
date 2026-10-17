# Tasks: Secciones de «Cómo va el negocio», cada una con su permiso

Funcionalidad nueva: toca 006 (información del negocio) y 007 (usuarios y acceso). Pedido de
Carlos del 2026-10-15.

## Tareas

- [x] T001 Especificación: secciones Ventas, Compras e Inventario, con un permiso de lectura cada una (paso 1, aprobada por Carlos el 2026-10-15)
- [x] T002 Maquetas de la pantalla en computadora y celular, para que Carlos elija (paso 2; aprobada `maquetas/elegida.html` el 2026-10-15)
- [x] T003 Plan con la sección «Seguridad», escenarios E01 a E19 y estas tareas (pasos 3 a 5)
- [x] T004 El servidor: permisos `negocio.ventas`, `negocio.gastos` y `negocio.invertido` en lugar de `negocio.numeros`, la migración que se los da a los roles que lo tenían y cada ruta con su permiso, con sus pruebas (E06, E07, E08, E09, E10, E18) (depende de T003)
- [x] T005 Lo compartido del cliente: los permisos, las tres secciones con su permiso y sus textos (depende de T004)
- [x] T006 La computadora: las secciones como pestañas de «Cómo va el negocio», sin «Volver a Más», con «Actualizar» con ícono (E01 a E05, E11 a E17) (depende de T005)
- [x] T007 El celular: las mismas secciones con sus pestañas, sin «Actualizar» como en la maqueta (E01 a E05, E11 a E13, E16, E17) (depende de T005)
- [x] T008 La API de mentira de las capturas y las pruebas de punta a punta, en el celular y en la computadora, con los permisos nuevos (E19) (depende de T006, T007)
- [x] T009 Comparar con la maqueta aprobada con capturas de computadora y de celular, y mostrarle a Carlos las diferencias (depende de T006, T007)
- [x] T010 La revisión independiente: `revision.md`, con lo que encontró y qué se hizo con cada punto (depende de T008, T009)
- [x] T011 [carlos] Decidir lo que dejó abierto la revisión (decisión 96): Depósito → Inventario muestra el valor con «Ver el dinero invertido»; sin número arriba en la sección Inventario; costos e importes de compras como estaban
- [x] T012 [interfaz] Depósito → Inventario con el valor en pesos para quien tiene «Ver el dinero invertido», en el celular y en la computadora (E09, E10; maqueta `inventario-a-*`, aprobada por Carlos el 2026-10-16)
