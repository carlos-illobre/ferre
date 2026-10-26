# Tareas: Auditoría

- [x] T001 Especificación (paso 1), con las respuestas de Carlos del 2026-10-25 (decisiones 164, 165 y 167); aprobada el 2026-10-25
- [x] T002 Plan con «Seguridad» (paso 3) (depende de T001)
- [x] T003 Las bases nuevas aparecen solas: `asegurar.sh` repetible, en el arranque y en el control de salud; `CLAVE_BASE_AUDITORIA` (depende de T002)
- [x] T004 El contrato v1 escrito (`docs/auditoria/contrato-v1.md`) (E15) (depende de T002)
- [x] T005 El kit: bandeja, anotar, mandador, apagado, borrar lo viejo; pruebas contra PostgreSQL al 100 % (E05–E11) (depende de T004)
- [x] T006 El servicio de Auditoría: base, entrada v1, reportes y grupos, permiso; su capa de datos al 100 % (E01–E03, E12–E14) (depende de T004)
- [x] T007 Comercial: los eventos con sus palabras por el kit, las uniones de productos en su tabla, sin `/auditoria` ni la tabla de eventos (depende de T005)
- [x] T008 Procesos: sus eventos por el kit (depende de T005)
- [x] T009 La puerta reparte `/auditoria` a Auditoría; compose y CI (depende de T006)
- [x] T010 La web: cada acción con lo que trae; el filtro «qué» con los grupos; sin Auditoría, no disponible (E01, E04, E12) (depende de T006)
- [x] T011 Integración `tests/integration/auditoria.sh` y e2e en Docker (depende de T007–T010)
- [x] T012 Documentación y `proyecto/estado.yml` (depende de T011)
- [x] T013 Revisión independiente (paso 7) (depende de T012)
