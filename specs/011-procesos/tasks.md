# Tasks: Procesos

Funcionalidad nueva: el módulo Procesos, aparte de Ferrebress para poder llevarlo a otro
proyecto (ADR-019). Especificación y maqueta aprobadas por Carlos el 2026-10-14.

## Tareas

- [x] T001 El módulo: dos paquetes en `microservices/procesos/` (servidor y web), en el workspace, con su control de capas y su README
- [x] T002 El servicio: esquema y migraciones, datos, regla, rutas y validación de BPMN, con sus pruebas (depende de T001)
- [x] T003 El contenedor «procesos»: imagen, compose y CI (depende de T002)
- [x] T004 Ferrebress lo conecta: permisos `procesos.ver` y `procesos.dibujar` con el rol Gerente, la ruta de paso con el registro de eventos y «Procesos» en Más (depende de T002)
- [x] T005 El modelo del front, sin pantallas: el recorrido para «Pasos» y la tabla, los errores de forma y los cambios de la lista (depende de T001)
- [x] T006 La computadora: editor con `bpmn-js`, los tres paneles, el paso elegido, la tabla, los procesos, borrador y vigente, historial, importar y exportar (depende de T004, T005)
- [ ] T007 El celular: «Pasos» y «Diagrama», con la hoja de figuras y el menú «⋯» (depende de T006)
- [ ] T008 Sin conexión y dos personas a la vez: mirar lo ya abierto y no perder un borrador ajeno (depende de T006)
- [ ] T009 Pruebas de punta a punta de dibujar, en el celular y en la computadora (depende de T007)
- [ ] T010 Una prueba por escenario (E01 a E45), anotadas en `proyecto/estado.yml` (depende de T009)
- [ ] T011 Comparar con la maqueta aprobada con capturas de computadora y de celular, y mostrarle a Carlos las diferencias (depende de T007)
- [ ] T012 La revisión independiente: `revision.md`, con lo que encontró y qué se hizo con cada punto (depende de T010, T011)
- [ ] T013 Actualizar `proyecto/estado.yml`, escribir el `resumen.md` de la capacidad y marcar T115 del plan (depende de T012)
