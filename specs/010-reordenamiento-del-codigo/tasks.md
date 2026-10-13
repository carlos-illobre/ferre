# Tasks: Reordenamiento del código

Funcionalidad nueva (lleva varias semanas): el plan de la auditoría de arquitectura, por
etapas. Cada tarea termina con todo funcionando y desplegado en pruebas.

## Tareas

- [x] T001 Etapa 1: todo el código bajo `microservices/` (web, api, listas) y el proxy en `deployment/`
- [ ] T002 Etapa 2: tecnología reutilizable del front en `plataforma/`, sin dependencias del negocio, con control automático (depende de T001)
- [ ] T003 Etapa 3a: negocio de vender una sola vez, con las dos interfaces encima (depende de T002)
- [ ] T004 Etapa 3b: negocio de depósito (ingreso, inventario, estanterías, pedidos) una sola vez (depende de T003)
- [ ] T005 Etapa 3c: negocio de catálogo, listas y duplicados una sola vez (depende de T003)
- [ ] T006 Etapa 3d: negocio de usuarios, sesiones, vínculo y lo de Más una sola vez (depende de T003)
- [ ] T007 Etapa 4: el cálculo de precios en el servidor, precios precalculados y fin de `libraries/` (depende de T003)
- [ ] T008 Etapa 5: servidor en tres capas, con consultas con tipos (depende de T001)
