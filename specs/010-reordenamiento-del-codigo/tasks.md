# Tasks: Reordenamiento del código

Funcionalidad nueva (lleva varias semanas): el plan de la auditoría de arquitectura, por
etapas. Cada tarea termina con todo funcionando y desplegado en pruebas.

## Tareas

- [x] T001 Etapa 1: todo el código bajo `microservices/` (web, api, listas) y el proxy en `deployment/`
- [x] T002 Etapa 2a: carpeta `plataforma/` con las piezas que ya no dependían del negocio (teclas, flechas, atajos, botón de volver, lector con la cámara, espera al tipear) y control automático de la regla (depende de T001)
- [x] T010 Etapa 2b: desatar del negocio y pasar a `plataforma/` el guardado local, la cola de envíos, las preferencias y la navegación; y sacar de la tecnología de teclado los nombres propios de la aplicación (depende de T002)
- [x] T011 Etapa 2c: el cliente del servidor, el achicado de fotos y la conexión en tiempo real pasan a `plataforma/`; en la aplicación queda solo lo propio de Ferrebress (depende de T010)
- [ ] T012 Etapa 2d: un solo juego de piezas de interfaz en `plataforma/` (botón, hoja, aviso, tabla) y los estilos del visor de la cámara junto al lector; se hace con la etapa 3, al unificar las pantallas (depende de T003)
- [ ] T003 Etapa 3a: negocio de vender una sola vez, con las dos interfaces encima (depende de T002)
- [ ] T004 Etapa 3b: negocio de depósito (ingreso, inventario, estanterías, pedidos) una sola vez (depende de T003)
- [ ] T005 Etapa 3c: negocio de catálogo, listas y duplicados una sola vez (depende de T003)
- [ ] T006 Etapa 3d: negocio de usuarios, sesiones, vínculo y lo de Más una sola vez (depende de T003)
- [ ] T007 Etapa 4: el cálculo de precios en el servidor, precios precalculados y fin de `libraries/` (depende de T003)
- [ ] T008 Etapa 5: servidor en tres capas, con consultas con tipos (depende de T001)
- [x] T009 La publicación del front arma juntas producción y pruebas: tiene que aceptar las carpetas viejas de producción hasta que se promueva (arreglo de la etapa 1)
