# Feature Specification: Base del sistema

**Feature Branch**: `001-base-del-sistema`

**Created**: 2026-10-10

**Status**: Baseline

**Input**: Línea de base: lo construido antes de adoptar Spec Kit (docs/REQUERIMIENTOS.md, sección 4)

El sistema existe para aumentar las ventas de la ferretería. El primer paso es saber qué se
vende, qué hay en stock, cuánta plata hay invertida y cuánto se gana, reemplazando el
cuaderno de ventas y las listas de precios en Excel por un sistema que no le sume trabajo al
empleado. Las prioridades de corto plazo, en orden: facilidad de uso (que se use sin manual,
en la laptop y en el celular), alta disponibilidad (que el mostrador nunca se frene por el
sistema), respaldos (que no se pierda ningún dato) e información (guardarla toda y poder
verla).

Esta carpeta reúne lo que vale para todo el sistema y no es de una capacidad en particular:
los requerimientos no funcionales construidos, con los escenarios que los comprueban. La
arquitectura está en [plan.md](plan.md), el modelo de datos en [data-model.md](data-model.md)
y cómo se levanta y se prueba en [quickstart.md](quickstart.md).

## Clarifications

### Session 2026-09-13

- Q: ¿Qué tecnología se usa cuando hay más de una opción razonable? → A: La que mejor resuelve cada problema; ante la duda o el empate, TypeScript (RNF-51, ADR-001).
- Q: ¿Se exige cobertura del 100 % y mutation testing? → A: No. En proyectos anteriores no aportaron valor proporcional y retrasaron el desarrollo (RNF-55, ADR-004).
- Q: ¿Cuánto se gasta en infraestructura? → A: Nada hasta que el sistema muestre resultados sobre las ventas; recién entonces se destina presupuesto a un servicio pago (RNF-42, ADR-002).
- Q: ¿Puede GitHub entrar a la máquina para desplegar, o la máquina consultar a GitHub cada pocos minutos? → A: Ninguna de las dos. La máquina se despliega sola al recibir un aviso, y el reverse proxy lo administra la máquina, fuera de este repositorio (RNF-44, ADR-013 y sus enmiendas).

### Session 2026-09-14

- Q: ¿Las pruebas de punta a punta corren en cada cambio? → A: No: tardaban más de lo que el dueño quiere esperar. En cada cambio corren las unitarias; las de punta a punta se lanzan a mano antes de promover a producción y después de un cambio grande, y solas una vez por semana (RNF-55, ADR-004, enmienda).

### Session 2026-10-08

- Q: ¿Qué tamaño puede tener el catálogo? → A: Entre todos los proveedores puede superar los 100.000 artículos; se empieza con pocos proveedores y se agregan de a poco (decisión 6). La búsqueda con ese volumen queda como requerimiento nuevo y sin probar (RNF-08), fuera de esta línea de base.

### Session 2026-10-09

- Q: ¿Una interfaz o dos? → A: Dos. La de celular queda como está; la de computadora vuelve al layout de tablas anterior al rediseño, a toda la pantalla, con la paleta y la marca del celular (decisión 9, RNF-04, RNF-05, ADR-014). La de computadora queda «a validar» por el dueño.
- Q: Si el sistema se ofrece a otras ferreterías, ¿comparten instalación? → A: No: cada una con su instalación y su base de datos propias; los datos de dos negocios nunca comparten base (decisión 11, RF-32, fuera de esta etapa).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Vender sin conexión y que llegue todo al volver (Priority: P1)

El Vendedor sigue buscando y vendiendo cuando se corta internet. Cada venta y cada cambio
(margen, «no llevó», ajuste de stock, renglón de conteo) se guarda primero en el dispositivo
y se manda solo, en orden y una sola vez, cuando vuelve la conexión.

**Why this priority**: el local tiene internet con microcortes; si el mostrador se frena o se pierde una venta, el sistema es peor que el cuaderno.

**Independent Test**: con la app abierta, cortar la red, registrar una venta y cambiar un margen, volver la red y comprobar en la base que hay una sola venta, el stock descontado y el margen nuevo.

**Acceptance Scenarios**:

1. **Given** la app abierta en Vender con el catálogo ya guardado en el dispositivo, **When** se corta la red, **Then** el indicador de conexión dice «Sin conexión» y la búsqueda sigue mostrando productos con su precio.
   - Prueba: tests/e2e/escritorio/08-sin-conexion.spec.ts, tests/e2e/celular/08-sin-conexion.spec.ts
2. **Given** la app sin conexión, **When** el Vendedor cobra una venta en efectivo, **Then** la pantalla dice «Sin conexión: se envía sola», el indicador dice «1 por enviar» y en el servidor todavía no hay venta.
   - Prueba: tests/e2e/escritorio/08-sin-conexion.spec.ts, tests/e2e/celular/08-sin-conexion.spec.ts
3. **Given** la app sin conexión con una venta por enviar, **When** el Vendedor cambia el margen de un producto y toca «No llevó», **Then** el precio se recalcula en el dispositivo y el indicador dice «3 por enviar».
   - Prueba: tests/e2e/escritorio/08-sin-conexion.spec.ts, tests/e2e/celular/08-sin-conexion.spec.ts
4. **Given** tres cambios por enviar, **When** vuelve la red, **Then** el indicador pasa a «Sincronizado» y en el servidor quedan una sola venta, el stock descontado, el margen nuevo y una consulta.
   - Prueba: tests/e2e/escritorio/08-sin-conexion.spec.ts, tests/e2e/celular/08-sin-conexion.spec.ts
5. **Given** la app abierta alguna vez con conexión, **When** se recarga la página sin red, **Then** la app abre igual y la búsqueda encuentra los productos guardados.
   - Prueba: tests/e2e/escritorio/08-sin-conexion.spec.ts, tests/e2e/celular/08-sin-conexion.spec.ts
6. **Given** un margen recién cambiado, **When** se recarga la página enseguida, **Then** el margen nuevo sigue elegido: el cambio se guardó en el dispositivo antes de mandarse.
   - Prueba: tests/e2e/escritorio/03-productos.spec.ts, tests/e2e/celular/03-productos.spec.ts
7. **Given** dos cambios seguidos del mismo producto esperando en la cola, **When** se reenvían, **Then** se mandan fundidos en uno: nunca llega un margen viejo después de uno nuevo.
   - Prueba: clientes/gestion-del-local-web/src/cola.test.ts
8. **Given** una venta que el servidor ya guardó, **When** el dispositivo la manda otra vez (reintento después de un corte), **Then** no se duplica.
   - Prueba: microservices/gestion-del-local/src/rutas/ventas.test.ts
9. **Given** un cambio en la cola y la sesión vencida (el servidor responde 401), **When** se intenta enviar, **Then** el cambio no se descarta y se reintenta cuando vuelve la sesión.
   - Prueba: clientes/gestion-del-local-web/src/cola.test.ts
10. **Given** un cambio en la cola que el servidor rechaza por inválido (4xx), **When** se intenta enviar, **Then** se saca de la cola y el error se le muestra a quien lo pidió.
   - Prueba: clientes/gestion-del-local-web/src/cola.test.ts
11. **Given** la app sin conexión, **When** se corrige el stock de un producto o se carga un renglón de un conteo, **Then** el cambio queda en el dispositivo y llega al servidor al volver la red.
   - Prueba: ninguna (el código los encola igual que una venta; solo están probados la venta, el margen y «no llevó»)
12. **Given** ventas confirmadas guardadas en el dispositivo, **When** se abre Vender, **Then** se borran del dispositivo las de más de 7 días y se conservan las demás.
   - Prueba: ninguna

---

### User Story 2 - El servidor se cae o se actualiza y el mostrador sigue (Priority: P1)

Una caída del servidor o de la base, o el despliegue de una versión nueva, no frenan al
Vendedor: la app ya está en el dispositivo y lo que no se pudo mandar espera.

**Why this priority**: la infraestructura es gratuita y sin garantía de servicio; el mostrador no puede depender de ella.

**Independent Test**: con la app abierta, apagar la API, registrar una venta, volver a levantar la API y comprobar que la venta llega sola.

**Acceptance Scenarios**:

1. **Given** la app abierta y la API fuera de alcance, **When** el Vendedor registra un cambio, **Then** queda anotado en el dispositivo y se reenvía, en orden, cuando la API vuelve.
   - Prueba: clientes/gestion-del-local-web/src/cola.test.ts
2. **Given** la app abierta y la API respondiendo con un error del servidor (5xx), **When** el Vendedor cobra una venta, **Then** la venta queda en la cola y se reintenta sola al reconectar y una vez por minuto.
   - Prueba: ninguna
3. **Given** una versión nueva del cliente web publicada, **When** el dispositivo abre la app, **Then** toma la versión nueva sola en la próxima apertura y los cambios por enviar siguen en la cola.
   - Prueba: ninguna
4. **Given** una versión nueva de la API publicada en la rama de un ambiente, **When** la máquina la despliega y los servicios no quedan sanos, **Then** vuelve sola a la versión que estaba corriendo.
   - Prueba: ninguna

---

### User Story 3 - La app abre y el servidor responde (Priority: P1)

Después de levantar el sistema o de desplegarlo, alcanza con abrir la app y consultar la
salud de cada servicio para saber que está vivo y que el esquema de la base está al día.

**Why this priority**: es la primera verificación después de cualquier arranque o despliegue; sin ella no se sabe si lo demás tiene sentido.

**Independent Test**: levantar el stack con un comando, abrir la app sin sesión y consultar `/health`.

**Acceptance Scenarios**:

1. **Given** el stack levantado y nadie con sesión, **When** se abre la app en la computadora, **Then** se ve el título «ferre» y la API responde bien en `/health`.
   - Prueba: tests/e2e/escritorio/00-arranque.spec.ts
2. **Given** el stack levantado y nadie con sesión, **When** se abre la app en el celular, **Then** se ve la pantalla de entrada y la API responde bien en `/health`.
   - Prueba: tests/e2e/celular/00-arranque.spec.ts
3. **Given** el stack levantado, **When** se consulta `/health` de cada servicio, **Then** los dos responden 200.
   - Prueba: tests/integration/health.sh, microservices/listas-de-proveedores/tests/test_health.py
4. **Given** una base sin esquema, **When** arranca la API, **Then** aplica todas las migraciones en orden antes de atender, y las tablas del modelo existen.
   - Prueba: tests/integration/migraciones.sh, microservices/gestion-del-local/src/migraciones.test.ts
5. **Given** la API arriba y la base sin responder, **When** se consulta `/health`, **Then** responde 503 con `db: sin-respuesta`.
   - Prueba: ninguna
6. **Given** las plantillas de configuración de cada ambiente, **When** se comparan, **Then** todas declaran las mismas variables y el compose no usa ninguna que no esté declarada.
   - Prueba: tests/integration/paridad_env.sh
7. **Given** una variable de configuración ausente, **When** se levanta un servicio, **Then** el arranque se corta nombrando la variable que falta, en lugar de usar un valor por omisión.
   - Prueba: ninguna

---

### User Story 4 - Cada dispositivo abre su interfaz (Priority: P2)

El celular abre la interfaz de tarjetas y pestañas; la computadora, la de tablas, menú
completo y teclado. Es la misma dirección y la misma app; se elige sola por el ancho de la
pantalla.

**Why this priority**: el Vendedor usa la notebook para vender y el celular para escanear y contar; una sola interfaz no servía en las dos (ADR-014).

**Independent Test**: abrir la misma dirección en una ventana de 412 px y en una de 1366 px y ver que cada una carga su interfaz.

**Acceptance Scenarios**:

1. **Given** una pantalla de menos de 900 px de ancho, **When** se abre la app, **Then** carga la interfaz de celular; con 900 px o más carga la de computadora.
   - Prueba: clientes/gestion-del-local-web/src/vista.test.ts
2. **Given** la app abierta en cualquiera de las dos interfaces, **When** termina de cargar, **Then** trae una sola hoja de estilos, la propia: las clases de una interfaz no pisan las de la otra.
   - Prueba: tests/e2e/escritorio/00-arranque.spec.ts, tests/e2e/celular/00-arranque.spec.ts
3. **Given** la app abierta en el celular, **When** se recorre cualquier pantalla, **Then** ninguna se desplaza hacia el costado.
   - Prueba: ninguna
4. **Given** la app abierta, **When** la ventana cruza los 900 px (se gira una tablet o se achica la ventana), **Then** la página se recarga con la otra interfaz.
   - Prueba: ninguna

---

### User Story 5 - Buscar y vender con el catálogo cargado (Priority: P2)

Con decenas de miles de productos y miles de ventas guardados en el dispositivo, buscar y
registrar una venta siguen siendo instantáneos.

**Why this priority**: «instantáneo» es lo que hace que el sistema no sea más lento que el cuaderno; con el catálogo real se pierde si nadie lo mide.

**Independent Test**: `tests/utest.sh` mide la búsqueda con 50.000 productos; `CARGA=1 tests/e2e.sh --solo carga` mide el navegador con 50.000 productos y 10.000 ventas.

**Acceptance Scenarios**:

1. **Given** un catálogo de 50.000 productos en memoria, **When** se busca con varias palabras, **Then** la búsqueda termina en menos de 100 ms.
   - Prueba: libraries/calculo-de-precios/src/busqueda.test.ts
2. **Given** 50.000 productos y 10.000 ventas guardados en el navegador, **When** se guarda una venta más y se busca en memoria, **Then** guardar tarda menos de 50 ms y buscar menos de 100 ms.
   - Prueba: tests/e2e/escritorio/09-carga.spec.ts, tests/e2e/celular/09-carga.spec.ts
3. **Given** un producto en pantalla, **When** se le cambia el margen, **Then** el precio nuevo se ve en menos de 100 ms.
   - Prueba: ninguna (el precio se calcula en el dispositivo sin esperar al servidor, pero el tiempo no se mide)

---

### User Story 6 - Saber en qué ambiente se está trabajando (Priority: P2)

Hay dos ambientes: pruebas, que se actualiza solo con cada cambio, y producción, que se
actualiza cuando el dueño lo pide. El de pruebas se distingue a simple vista para que nadie
cargue ventas reales ahí.

**Why this priority**: los dos ambientes se abren desde el mismo sitio y con la misma cuenta; confundirlos es cargar ventas reales donde se pierden.

**Independent Test**: abrir la app de pruebas y la de producción y comparar la barra de arriba.

**Acceptance Scenarios**:

1. **Given** un cliente web construido con la versión «pruebas», en local o sin versión, **When** se pregunta si es un ambiente de prueba, **Then** la respuesta es sí; solo la versión «produccion» responde que no.
   - Prueba: clientes/gestion-del-local-web/src/ambiente.test.ts
2. **Given** la app de pruebas abierta, **When** se mira la barra de arriba, **Then** titila y dice «Ambiente de prueba» («Prueba» cuando la barra no entra entera en la computadora; una pastilla que titila en el celular).
   - Prueba: ninguna
3. **Given** la app de producción abierta, **When** se mira la barra de arriba, **Then** no titila ni muestra ninguna leyenda de ambiente.
   - Prueba: ninguna
4. **Given** un cambio empujado a `master`, **When** pasan las unitarias y las verificaciones rápidas, **Then** se publican las imágenes y el cliente web de pruebas, y la máquina despliega sola el ambiente de pruebas.
   - Prueba: ninguna
5. **Given** el ambiente de pruebas con una versión revisada, **When** el dueño pide pasarla a producción (`git push origin master:produccion`), **Then** producción se actualiza a esa versión y no cambia por ningún otro motivo.
   - Prueba: ninguna

---

### User Story 7 - Nada se pierde y cada número se explica (Priority: P2)

Lo que se registró no se borra: se marca o se compensa con una fila nueva. Cada venta guarda
el costo, el margen y el precio de ese momento, para poder explicarla aunque el costo cambie
después.

**Why this priority**: sin históricos intactos no se puede saber cuánto se gana ni explicar un número cuando alguien pregunta.

**Independent Test**: registrar una venta, anularla y mirar en la base que la venta sigue estando, marcada, y que el stock volvió con un movimiento nuevo.

**Acceptance Scenarios**:

1. **Given** una venta registrada, **When** se la mira en la base, **Then** cada renglón tiene guardados el costo, el margen, el precio y la explicación con los que se vendió.
   - Prueba: microservices/gestion-del-local/src/rutas/ventas.test.ts, tests/e2e/escritorio/04-vender.spec.ts, tests/e2e/celular/04-vender.spec.ts
2. **Given** una venta confirmada, **When** se anula, **Then** la venta queda marcada «anulada», no se borra, y el stock vuelve con un movimiento nuevo.
   - Prueba: tests/e2e/escritorio/04-vender.spec.ts, tests/e2e/celular/04-vender.spec.ts
3. **Given** un producto con una compra y una venta, **When** se corrige su stock a mano, **Then** se agrega un movimiento con el motivo y el stock mostrado es la suma de todos los movimientos.
   - Prueba: tests/e2e/escritorio/06-stock.spec.ts, tests/e2e/celular/06-stock.spec.ts

---

### User Story 8 - Solo entra quien corresponde y nada sensible queda expuesto (Priority: P2)

La API no atiende a nadie sin sesión, las sesiones se pueden cerrar a distancia, los
servicios internos no aceptan llamadas sin su token y en el repositorio, que es público, no
hay datos de proveedores ni secretos.

**Why this priority**: el sistema guarda costos, márgenes y ventas del negocio y listas de precios de terceros.

**Independent Test**: `tests/itest.sh` con el stack levantado comprueba 401 sin sesión, 403 por rol y que una sesión cerrada deja de servir.

**Acceptance Scenarios**:

1. **Given** un pedido a la API sin sesión o con un token inválido, **When** llega, **Then** la API responde 401.
   - Prueba: tests/integration/autenticacion.sh
2. **Given** una sesión abierta en otro dispositivo, **When** se la cierra a distancia, **Then** queda revocada en el servidor y deja de servir.
   - Prueba: tests/e2e/escritorio/12-cerrar-sesion.spec.ts, tests/e2e/celular/12-cerrar-sesion.spec.ts
3. **Given** un pedido al servicio de listas de proveedores sin el token de servicio, **When** llega, **Then** el servicio lo rechaza.
   - Prueba: microservices/listas-de-proveedores/tests/test_api.py
4. **Given** una planilla, un PDF, un `.env` real o cualquier archivo de `privado/` en la carpeta de trabajo, **When** se prepara un commit, **Then** git los ignora.
   - Prueba: ninguna
5. **Given** un ambiente desplegado en la máquina, **When** se miran sus contenedores, **Then** corren con un usuario sin privilegios y la API solo se publica en la interfaz local, detrás del proxy de la máquina.
   - Prueba: ninguna
6. **Given** la app de pruebas o de producción, **When** el navegador habla con el cliente web o con la API, **Then** siempre lo hace por HTTPS.
   - Prueba: ninguna

---

### User Story 9 - Lo que tarda avisa y los avisos se van solos (Priority: P3)

Lo que tarda muestra su avance; un aviso desaparece apenas se corrige lo que lo causó; los
paneles plegables arrancan abiertos.

**Why this priority**: son los detalles que hacen que la pantalla se entienda sola, sin manual.

**Independent Test**: aplicar una lista y ver la barra de progreso; intentar cobrar sin medio de pago y elegir uno.

**Acceptance Scenarios**:

1. **Given** una lista de precios en vista previa, **When** se toca «Aplicar», **Then** se ve una barra de progreso mientras la lista se aplica en segundo plano.
   - Prueba: ninguna (los E2E de listas esperan el resultado final y no comprueban la barra)
2. **Given** un aviso de cobro en pantalla («Elegí cómo paga», «Hay productos sin precio»), **When** se corrige la causa, **Then** el aviso desaparece solo.
   - Prueba: clientes/gestion-del-local-web/src/pantallas/Vender.test.tsx, clientes/gestion-del-local-web/src/escritorio/pantallas/Vender.test.tsx, tests/e2e/escritorio/04-vender.spec.ts
3. **Given** un panel plegable en la computadora, **When** se abre la pantalla, **Then** el panel arranca abierto y se pliega al tocar su título.
   - Prueba: clientes/gestion-del-local-web/src/escritorio/componentes/componentes.test.tsx

---

### User Story 10 - Usarlo sin instalar nada (Priority: P3)

La app se usa desde el navegador de la notebook y del celular. En el celular se puede
agregar a la pantalla de inicio como una app, sin pasar por la tienda.

**Why this priority**: en la notebook del local no se instala nada, y el celular es el único lector de códigos.

**Independent Test**: abrir la app en Chrome de un celular Android y elegir «Instalar app» en el menú del navegador.

**Acceptance Scenarios**:

1. **Given** la app abierta en Chrome de un celular Android, **When** se abre el menú del navegador, **Then** ofrece instalarla, y una vez instalada abre a pantalla completa con su ícono y su nombre.
   - Prueba: ninguna
2. **Given** la notebook del local con Chrome o Firefox, **When** se abre la dirección de la app, **Then** funciona sin instalar nada.
   - Prueba: ninguna (los E2E corren solo en Chromium; la notebook real está sin probar)

---

### Edge Cases

- **Un cambio encolado que el servidor rechaza (4xx que no sea 401 ni 429) se descarta de la cola.** Si la pantalla que lo pidió sigue abierta, muestra el error; si el rechazo llega en un reenvío posterior (después de recargar, por ejemplo), solo queda en la consola del navegador. Es la única forma en que un cambio guardado en el dispositivo deja de estar sin haber llegado al servidor.
- **Navegador sin IndexedDB:** el cambio se manda directo, sin cola; sin conexión se pierde.
- **Solo se encola lo del mostrador:** ventas, «no llevó», cambios de producto (margen), ajustes de stock y renglones de conteo. Compras, listas de precios y administración necesitan conexión.
- **Reinicio de la API en medio de un ingreso con huella:** el desafío vive en la memoria del proceso; hay que pedir otro. Lo mismo vale para el límite de intentos por IP, que se reinicia con el proceso (ADR-011).
- **Google caído:** no se puede entrar en un dispositivo nuevo; los que ya tienen sesión siguen (ADR-011).
- **Sesión revocada mientras el dispositivo está sin conexión:** el dispositivo sigue operando con la sesión guardada; al reconectar la API responde 401, la app vuelve a la pantalla de entrada y lo encolado espera a la sesión nueva (ADR-011).
- **Un aviso de despliegue que se pierde:** la máquina se pone al día en su próximo arranque o con un comando a mano (ADR-013).
- **Unir dos productos duplicados** cambia a qué producto apuntan filas ya escritas de `precio_proveedor`, `movimiento_stock` e `item_venta` y borra renglones repetidos de un conteo. Queda registrado en el evento `producto.unido` y se puede deshacer; es la excepción a «los históricos solo suman filas» (RNF-30).
- **Una tablet o una ventana angosta en la computadora** ven la interfaz de celular; es lo esperado (ADR-014).
- **La base gratuita se pausa tras 7 días sin consultas** (ADR-002). El monitor que lo evita es parte de lo pendiente (#19).

## Requirements *(mandatory)*

### Functional Requirements

Requerimientos no funcionales construidos, con su ID original. Los que la constitución ya
enuncia como principio se citan en una línea. Los pendientes y los que solo se pueden
comprobar en el mostrador no están acá (ver Assumptions).

#### Uso

- **RNF-03** (hecho en parte): Mínimo esfuerzo manual: no se tipea nada que se pueda sacar de una lista, un código de barras o una foto. Construido: las listas se cargan desde el Excel del proveedor, el código de barras se lee con la cámara y la foto del producto se saca con el celular. Falta cargar la factura de compra con una foto (#55) y recibir las listas solas desde el correo (#25).
- **RNF-04**: La interfaz de celular es la que se carga en pantallas de menos de 900 px y se conserva tal como está. Sigue el diseño de `mockups/Ferre iOS.html` [NEEDS CLARIFICATION: el documento lo da por hecho y no encontré evidencia que lo respalde: ese archivo no está en el repositorio, `mockups/` está en `.gitignore` y solo tiene capturas del diseño anterior], se parece a una app nativa y ninguna pantalla se desplaza hacia el costado [NEEDS CLARIFICATION: el documento lo da por hecho y no encontré evidencia que lo respalde: ninguna prueba lo comprueba; figura como verificación manual en docs/casos-de-prueba-e2e.md]. Las reglas visuales están en [docs/sistema-visual.md](../../docs/sistema-visual.md). Ver constitución, principio III.
- **RNF-05** (construido; a validar por el dueño): La interfaz de computadora usa todo el ancho de la pantalla y se maneja con teclado, sin cambiar nada del celular: tablas, menú completo y atajos, con la misma paleta y la misma marca (ADR-014). Ver constitución, principios II y III.
- **RNF-06**: Todo en castellano, con las palabras del mostrador; los errores dicen qué hacer. Ver constitución, principio IX.
- **RNF-07**: La búsqueda responde en menos de 100 ms; el cambio de margen también [NEEDS CLARIFICATION: el documento lo da por hecho y no encontré evidencia que lo respalde: el precio se recalcula en el dispositivo, pero ninguna prueba mide ese tiempo]. Ver constitución, principio II.
- **RNF-09**: Lo que tarda muestra su avance (barra de progreso al aplicar una lista); los avisos desaparecen solos al corregir la causa; lo que se puede tocar parece un botón; los paneles plegables arrancan abiertos y se abren y cierran con animación.

#### Disponibilidad

- **RNF-10**: Sin internet no se nota: buscar y vender funcionan igual y lo pendiente se manda solo al reconectar. Ver constitución, principio IV.
- **RNF-11**: Una caída del servidor no frena el mostrador: el cliente web se sirve desde otro lugar que la API y abre desde el dispositivo. Ver constitución, principio IV.
- **RNF-13**: Actualizar la versión no corta el mostrador ni pierde datos: el cliente toma la versión nueva solo en la próxima apertura; la máquina despliega por versión, comprueba la salud de los servicios y vuelve a la anterior si la nueva no queda sana (ADR-013).

#### Respaldos

- **RNF-20**: No se pierde ninguna venta ni ningún cambio (margen, ajuste de stock, conteo): cada uno vive en el dispositivo hasta que el servidor lo confirma, aunque se recargue la página o se corte internet. Las ventas confirmadas quedan además 7 días en el dispositivo. Ver constitución, principio IV. Es la primera de las cuatro capas de respaldo de ADR-002; las otras tres están pendientes (#19).

#### Información

- **RNF-30** (hecho en parte): Nada se borra y los históricos no se pisan: precios, stock y eventos solo suman filas; lo que deja de valer se marca. Ver constitución, principio V. Dos excepciones en el código: unir productos duplicados cambia el producto al que apuntan filas existentes de los históricos (reversible y registrado), y los renglones de un conteo abierto se borran al quitarlos.
- **RNF-31**: Cada venta guarda el costo, el margen y el precio de ese momento, con su explicación.

#### Equipo, costo y seguridad

- **RNF-40**: Funciona en la notebook del local (Chrome o Firefox) y en un celular Android, sin instalar nada. En el celular se puede agregar a la pantalla de inicio como una app, sin pasar por la tienda. Falta probarlo en la notebook real.
- **RNF-41**: El único lector de códigos es la cámara del celular. Ver constitución, Restricciones técnicas (Equipo del local).
- **RNF-42**: Costo de infraestructura cero hasta que el sistema muestre resultados. Ver constitución, principio VIII.
- **RNF-43**: HTTPS siempre; sesiones revocables; ningún dato de proveedores ni secreto en el repositorio, que es público. Ver constitución, principio VII.
- **RNF-44**: En el servidor la app corre con un usuario propio sin privilegios de administrador y no publica puertos a internet: sale por el proxy compartido de la máquina. Ver constitución, principio VII.

#### Arquitectura y forma de trabajo

- **RNF-50**: El servidor está separado de la pantalla: la misma API la consume la web y la podrá consumir una app Android. El sistema es un microservicio que se integrará con otros (venta online). Los servicios se llaman por lo que resuelven del negocio (ADR-003, ADR-010).
- **RNF-51**: Cada problema con la tecnología que mejor lo resuelve; ante la duda, TypeScript. Ver constitución, Restricciones técnicas (Stack).
- **RNF-52**: Importa la disponibilidad, no la escala. Ver constitución, principio VIII.
- **RNF-53**: Dos ambientes: pruebas, que se actualiza solo con cada cambio, y producción, que se actualiza cuando el dueño lo pide. Ver constitución, Restricciones técnicas (Ambientes).
- **RNF-54**: El ambiente de pruebas se distingue a simple vista: la barra titila y dice «Ambiente de prueba»; producción no muestra nada de eso.
- **RNF-55**: Las unitarias corren en cada cambio y todo cambio de comportamiento trae la suya; las de punta a punta cubren los caminos principales y se corren a mano. Sin mutation testing ni meta de cobertura. Ver constitución, principio VI.
- **RNF-56** (hecho en parte): Cada decisión técnica queda escrita con su porqué. Ver constitución, principio X. La otra mitad, «la documentación se mantiene al día con el código», no se cumplía al escribir esta línea de base: las diferencias encontradas están en [plan.md](plan.md) y [data-model.md](data-model.md).

### Key Entities

El modelo completo está en [data-model.md](data-model.md). Lo que importa para lo no funcional:

- **Cola de cambios** (en el dispositivo): cada cambio del mostrador como un pedido completo, con su orden; se vacía cuando el servidor confirma.
- **Evento** (en el servidor): registro de lo que pasó y quién lo hizo; solo recibe filas.
- **Migración**: qué cambios de esquema ya se aplicaron.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con 50.000 productos, una búsqueda termina en menos de 100 ms.
- **SC-002**: Con 10.000 ventas guardadas en el dispositivo, guardar una más tarda menos de 50 ms.
- **SC-003**: Después de un corte de internet, todas las ventas y los cambios hechos sin conexión están en el servidor, una sola vez cada uno.
- **SC-004**: Con el servidor caído, el Vendedor puede abrir la app, buscar y cobrar.
- **SC-005**: La infraestructura cuesta $0 por mes.
- **SC-006** (a validar en el piloto, #21): un Vendedor nuevo vende el primer día sin manual (RNF-01).
- **SC-007** (a validar en el piloto, #21): una venta de 3 productos se registra en menos de 20 segundos (RNF-02).

## Assumptions

- Son tres usuarios y unas 200 ventas por día; el local tiene una notebook vieja con internet intermitente y un celular Android.
- El navegador no borra los datos guardados del sitio entre un corte y la reconexión.
- La app se abrió al menos una vez con conexión en cada dispositivo: recién ahí queda guardada para abrir sin red.
- Quedan fuera de esta línea de base, en el backlog: avisar a los Administradores si la API o la base dejan de responder (RNF-12, #19); copia de la base cada hora, copia semanal cifrada fuera de Oracle y de Supabase, y prueba mensual de restauración (RNF-21, RNF-22, RNF-23, #19); búsqueda con más de 100.000 artículos en la notebook vieja (RNF-08, nuevo y sin probar).
- RNF-01 y RNF-02 solo se pueden comprobar en el mostrador; figuran «a validar» hasta el piloto (#21).
- El reverse proxy con TLS y el usuario sin privilegios con Docker rootless los administra la máquina, fuera de este repositorio; acá solo está el contrato (`deployment/oracle-single/ORACLE.md`).
