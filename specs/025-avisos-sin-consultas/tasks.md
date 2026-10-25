# Tareas: Avisos sin consultas

- [x] T001 Especificación (paso 1), con las respuestas de Carlos del 2026-10-25 (decisión 160); aprobada el 2026-10-25
- [x] T002 Plan con la sección «Seguridad» y ADR-030 (paso 3); escenarios de error, borde y seguridad en la spec (paso 4); estas tareas (paso 5)
- [ ] T003 Módulo, servidor: los canales, con temas, presencia por lado, estado al abrir, tandas, cierre de un tema y de un grupo, latido, límites y rechazo por tema (E06, E07, E27, E30 a E33) (depende de T002)
- [ ] T004 [P] Módulo, servidor: lo que viaja a cuestas en cada respuesta (E09, E28) (depende de T002)
- [ ] T005 [P] Módulo, navegador: el canal único, que abre el flujo con los temas que hay, se cierra sin temas o con la aplicación oculta y suelta los temas rechazados (E03, E05, E07, E25, E34) (depende de T002)
- [ ] T006 Módulo, navegador: la central (esperas temporarias y permanentes, a cuestas, solo cuando cambia) y el indicador (E08 a E16, E27 a E29) (depende de T005)
- [ ] T007 Módulo, navegador: el enlace sobre el canal; armada la directa, suelta el tema del servidor (E21 a E26) (depende de T006)
- [ ] T008 Servidor de Ferrebress: `/canal`, la autorización de cada tema, los avisos de la entrada, del vínculo y de la sesión, y `X-Avisos`; sale `/puestos/:id/enlace` (E01, E02, E06, E10, E11, E30 a E33) (depende de T003, T004)
- [ ] T009 Aplicación: la central de Ferrebress, los dos códigos QR, la versión, la sesión, los indicadores y lo pendiente, sin temporizadores que consulten la red (E01 a E20) (depende de T006, T007, T008)
- [ ] T010 Pruebas de punta a punta y estado: los QR, el indicador de la entrada, la directa sin canal y el respaldo, y los pedidos contados (E01 a E05, E12, E21 a E24, SC-001) (depende de T009)
- [ ] T011 Revisión independiente (paso 7) (depende de T010)
