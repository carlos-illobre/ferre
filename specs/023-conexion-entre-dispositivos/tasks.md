# Tareas: Conexión entre dispositivos

- [x] T001 Especificación (paso 1), con las respuestas de Carlos del 2026-10-24 (decisión 152)
- [x] T002 [interfaz] Maqueta del indicador en el celular y la computadora: el puntito con cada estado y el detalle con «Probar conexión directa» (paso 2): la variante A, aprobada por Carlos el 2026-10-24
- [x] T003 Plan con la sección «Seguridad» y ADR-027 (paso 3); escenarios de error, borde y seguridad en la spec (paso 4); estas tareas (paso 5)
- [ ] T004 Módulo: el paquete `microservices/conexion/` con su configuración (sin dependencias, cobertura del 100 %, capas, compilado a `dist/`), los avisos y la forma de los mensajes (E20, E21, E28) (depende de T003)
- [ ] T005 [P] Módulo, servidor: la central, con la presencia, el paso de las tandas sin guardarlas, sus límites y el cierre de la sala (E10, E25, E26, E27) (depende de T004)
- [ ] T006 [P] Módulo, navegador: el flujo de eventos y el camino por el servidor, con las tandas en orden y la reconexión (E06, E08, E10) (depende de T004)
- [ ] T007 [P] Módulo, navegador: la entrega confiable, con números, épocas, saludo, reenvío, partes y demora (E03, E18, E29, E30) (depende de T004)
- [ ] T008 Módulo, navegador: la conexión directa y la memoria de que no se pudo (E01, E02, E06, E07, E09, E22, E23, E31) (depende de T004)
- [ ] T009 Módulo, navegador: el enlace, que junta todo y da el estado y «Probar conexión directa» (E01 a E13, E22, E23) (depende de T005, T006, T007, T008)
- [ ] T010 Servidor de Ferrebress: `/puestos/:id/enlace`, cerrar la sala al desvincular, al cerrar una sesión y al desactivar, y sacar el espejo, los códigos, el lector y el pedido de foto viejos y el ajuste del celular (E05, E25, E26, E33) (depende de T005)
- [ ] T011 Aplicación: el enlace de Ferrebress, el espejo, los códigos, el lector y los pedidos de foto por el enlace, sin preguntas ni código QR (E15 a E19, E24, E32) (depende de T009, T010)
- [ ] T012 Aplicación: el indicador en el celular y la computadora, como la maqueta, y sacar el renglón del celular de Más → Sistema (E11 a E14, E22, E33) (depende de T002, T011)
- [ ] T013 Pruebas de punta a punta: lector, espejo y foto por la directa y por el servidor, y el paso al servidor (E01, E04, E06, E07, E15 a E17, E24) (depende de T012)
- [ ] T014 Una prueba por cada escenario, que lo nombra, anotada en `proyecto/estado.yml` (depende de T013)
- [ ] T015 Comparar el indicador con la maqueta en capturas del celular y la computadora, y mostrarle a Carlos las diferencias (depende de T012)
- [ ] T016 Revisión independiente (paso 7): `revision.md` (depende de T014, T015)
- [ ] T017 Documentación: incorporar lo nuevo a 002, 005, 007 y 020, enmiendas de ADR-016 y ADR-020, y `proyecto/estado.yml` (depende de T016)
