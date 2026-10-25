# Tareas: Una sola puerta para la web, y el servicio del mostrador se llama Comercial

- [x] T001 Especificación (paso 1), con las respuestas de Carlos del 2026-10-25 (decisiones 164 a 166); aprobada el 2026-10-25
- [x] T002 Plan con «Seguridad» y ADR-031 (paso 3) (depende de T001)
- [x] T003 Renombre: `microservices/api` pasa a `microservices/comercial`, y el paquete, el servicio, la imagen, la CI, los scripts y la documentación (E14) (depende de T002)
- [x] T004 Comercial: `GET /sesiones/quien`, exige el token entre servicios salvo en `/health`, sin CORS ni reenvío a Procesos (E01, E03, E07) (depende de T003)
- [x] T005 Procesos: anota sus eventos en su base, en la misma transacción, con la regla del borrador; lee `X-Permisos` con los nombres de su `.env` (E10–E13) (depende de T002)
- [x] T006 La puerta: imagen con Caddy, reparto por ruta, `forward_auth`, cabeceras, CORS, salud; compose y CI (E01–E09, E15) (depende de T004, T005)
- [ ] T007 Integración `tests/integration/puerta.sh` y e2e en Docker (depende de T006)
- [ ] T008 Documentación (DEPLOYMENT, ORACLE, quickstart, README de Procesos) y `proyecto/estado.yml` (depende de T007)
- [ ] T009 Revisión independiente (paso 7) (depende de T008)
