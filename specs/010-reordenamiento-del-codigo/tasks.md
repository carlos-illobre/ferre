# Tasks: Reordenamiento del código

Funcionalidad nueva (lleva varias semanas): el plan de la auditoría de arquitectura, por
etapas. Cada tarea termina con todo funcionando y desplegado en pruebas.

## Tareas

- [x] T001 Etapa 1: todo el código bajo `microservices/` (web, api, listas) y el proxy en `deployment/`
- [x] T002 Etapa 2a: carpeta `plataforma/` con las piezas que ya no dependían del negocio (teclas, flechas, atajos, botón de volver, lector con la cámara, espera al tipear) y control automático de la regla (depende de T001)
- [x] T010 Etapa 2b: desatar del negocio y pasar a `plataforma/` el guardado local, la cola de envíos, las preferencias y la navegación; y sacar de la tecnología de teclado los nombres propios de la aplicación (depende de T002)
- [x] T011 Etapa 2c: el cliente del servidor, el achicado de fotos y la conexión en tiempo real pasan a `plataforma/`; en la aplicación queda solo lo propio de Ferrebress (depende de T010)
- [x] T012 Etapa 2d: las pantallas pasan a `pantallas/celular` y `pantallas/compu`; las piezas de interfaz (botón, hoja, aviso, visor de la cámara) siguen siendo una por interfaz (decisión 85) (depende de T003)
- [x] T003 Etapa 3a: la regla de la venta (renglones, precios, cobrar, «no llevó») una sola vez, con las dos interfaces encima y sus pruebas sin pantalla (depende de T002)
- [x] T013 Etapa 3a, segunda parte: «Hoy» y «Anular» una sola vez, con TanStack Query, y los tipos de la venta que llegan del servidor (depende de T003)
- [x] T004 Etapa 3b: negocio de depósito (ingreso, inventario, estanterías, pedidos) una sola vez (depende de T003)
- [x] T005 Etapa 3c: negocio de catálogo, listas y duplicados una sola vez (depende de T003)
- [x] T006 Etapa 3d: negocio de usuarios, sesiones, vínculo y lo de Más una sola vez (depende de T003)
- [x] T007 Etapa 4: el cálculo de precios en el servidor, precios precalculados y fin de `libraries/` (depende de T003)
- [x] T008 Etapa 5: servidor en tres capas, con consultas con tipos (depende de T001)
- [x] T009 La publicación del front arma juntas producción y pruebas: tiene que aceptar las carpetas viejas de producción hasta que se promueva (arreglo de la etapa 1)
- [x] T014 [arreglo] Lo que encontró la revisión: el vínculo y la entrada con Google una sola vez, el subtotal del renglón desde la regla de la venta, el negocio sin depender de las pantallas, controles de capas que faltaban, las columnas que se cambian de un producto y las reglas de las fotos pedidas fuera de la ruta
- [x] T015 [arreglo] Ningún valor que llega en un pedido se pega en el SQL: el límite y el desde del catálogo van como parámetros, y una prueba revisa todo el SQL del servidor
- [x] T016 La forma de los datos llega del servidor (contratos en `api/src/contratos/`), no solo para las ventas: producto, stock, conteos, listas, duplicados, pedidos de foto, proveedores, pedidos, compras, clientes, ventas, tickets y anomalías (depende de T008)
- [x] T017 Zod valida en el servidor lo que llega en cada pedido, tema por tema, en los temas de T016; los tipos de lo que se manda salen de esas validaciones y el front sigue con los contratos, sin el cliente tipado de Hono (decisión 89). Lo que llega como formulario con archivos (listas, fotos, el alta de un ticket) sigue validándose en las reglas, porque un archivo grande es un 413 (depende de T016)
- [x] T020 T016 y T017 en los temas de Más (usuarios, sesiones, roles, quién hizo qué, la huella y el vínculo), cuando termine 007-T008, que los está cambiando (depende de T017)
- [x] T018 La navegación de las dos interfaces pasa a React Router, sin cambiar las direcciones ni el espejo (depende de T012)
- [x] T019 [regla] Al cobrar, el servidor guarda lo que se cobró (precio, costo y margen de cada renglón) y solo recalcula el redondeo y el total; la especificación, el plan y la decisión 84 lo dicen así (decisión 86)

