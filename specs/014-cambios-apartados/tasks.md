# Tasks: Lo que hizo sin conexión alguien a quien desactivaron, apartado para revisar

Funcionalidad nueva: toca 003 (ventas), 005 (compras y stock), 006 (información del negocio:
Anomalías) y 007 (usuarios y acceso). Pedido de Carlos del 2026-10-17 (decisión 97).

## Tareas

- [x] T001 Especificación: lo que quedó sin mandar sube al servidor apartado y se revisa en Anomalías, con «Administrar usuarios» (paso 1, aprobada por Carlos el 2026-10-17) (T126)
- [x] T002 Maquetas de «Para revisar» en computadora y celular (paso 2; aprobada la variante C el 2026-10-17, con «Para revisar» primero y la cantidad a la derecha)
- [x] T003 Plan con la sección «Seguridad», ADR-021, escenarios E14 a E19 y estas tareas (pasos 3 a 5)
- [x] T004 El servidor: la tabla de lo apartado, subir con la sesión cerrada, listar, aceptar repitiendo el pedido como quien lo hizo y descartar, con sus pruebas (E01, E03 a E08, E11, E13 a E19) (depende de T003)
- [x] T005 El cliente, lo compartido: la cola sube lo de quien salió y lo saca del dispositivo; las pestañas de Anomalías con su permiso; la pantalla «Para revisar» (E01, E03, E05, E07 a E10, E12) (depende de T004)
- [x] T006 La computadora y el celular: Anomalías con las pestañas «Para revisar» y «Anotadas», la cantidad a la derecha, y la opción de Más con cualquiera de los dos permisos (E05, E10 a E12) (depende de T005)
- [ ] T007 La API de mentira de las capturas y las pruebas de punta a punta, en el celular y en la computadora (E06) (depende de T006)
- [ ] T008 Comparar con la maqueta aprobada con capturas de computadora y de celular, y mostrarle a Carlos las diferencias (depende de T006)
- [ ] T009 La revisión independiente: `revision.md`, con lo que encontró y qué se hizo con cada punto (depende de T007, T008)
