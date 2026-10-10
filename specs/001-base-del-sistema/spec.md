# Feature Specification: Base del sistema

**Feature Branch**: `001-base-del-sistema`

**Created**: 2026-10-10

**Status**: Baseline

**Input**: Especificación completa de lo no funcional

El sistema existe para aumentar las ventas de la ferretería. El primer paso es saber qué se
vende, qué hay en stock, cuánta plata hay invertida y cuánto se gana, reemplazando el
cuaderno de ventas y las listas de precios en Excel por un sistema que no le sume trabajo a
quien atiende el mostrador. Las prioridades de corto plazo, en orden: facilidad de uso (que
se use sin manual, en la notebook y en el celular), alta disponibilidad (que el mostrador
nunca se frene por el sistema), respaldos (que no se pierda ningún dato) e información
(guardarla toda y poder verla).

Esta especificación reúne lo que vale para todo el sistema y no es de una capacidad en
particular: todos los requerimientos no funcionales, con los escenarios que los comprueban.
Alcanza para que quien nunca vio el sistema lo construya de nuevo. La arquitectura decidida
está en [plan.md](plan.md), el modelo de datos en [data-model.md](data-model.md) y cómo se
levanta y se prueba en [quickstart.md](quickstart.md).

## Clarifications

### Session 2026-09-13

- Q: ¿Se puede instalar un programa en la notebook del local? → A: No. Es vieja y no se le instala nada: el sistema se usa desde el navegador (RNF-40, ADR-001).
- Q: ¿Qué tecnología se usa cuando hay más de una opción razonable? → A: La que mejor resuelve cada problema; ante la duda o el empate, TypeScript (RNF-51, ADR-001).
- Q: ¿Se exige cobertura del 100 % y mutation testing? → A: No. En proyectos anteriores no aportaron valor proporcional y retrasaron el desarrollo (RNF-55, ADR-004).
- Q: ¿Cuánto se gasta en infraestructura? → A: Nada hasta que el sistema muestre resultados sobre las ventas; recién entonces se destina presupuesto a un servicio pago (RNF-42, ADR-002).
- Q: ¿El servidor y la pantalla van juntos? → A: No. El servidor lo tienen que poder consumir varias pantallas (la web y, más adelante, una app Android), y cada pieza se llama por la parte del negocio que resuelve, no por su rol técnico (RNF-50, ADR-010).
- Q: ¿Cómo se pasa un cambio a pruebas y a producción? → A: Un cambio unido a la rama de pruebas actualiza pruebas solo; producción se actualiza cuando el dueño lo pide (RNF-53, ADR-012).
- Q: ¿Puede GitHub entrar a la máquina para desplegar, o la máquina consultar a GitHub cada pocos minutos? → A: Ninguna de las dos. La máquina se despliega sola al recibir un aviso, y el reverse proxy lo administra la máquina, fuera de este repositorio (RNF-44, ADR-013 y sus enmiendas).

### Session 2026-09-14

- Q: ¿Las pruebas de punta a punta corren en cada cambio? → A: No: tardan más de lo que el dueño quiere esperar. En cada cambio corren las unitarias; las de punta a punta se lanzan a mano antes de promover a producción y después de un cambio grande, y solas una vez por semana (RNF-55, ADR-004, enmienda).

### Session 2026-10-08

- Q: ¿Qué tamaño puede tener el catálogo? → A: Entre todos los proveedores puede superar los 100.000 artículos; se empieza con pocos proveedores y se agregan de a poco (decisión 6, RNF-08).

### Session 2026-10-09

- Q: ¿Una interfaz o dos? → A: Dos, con la misma paleta y la misma marca. La de celular, con tarjetas y pestañas; la de computadora, con tablas a toda la pantalla, menú completo y teclado (decisión 9, RNF-04, RNF-05, ADR-014).
- Q: Si el sistema se ofrece a otras ferreterías, ¿comparten instalación? → A: No: cada una con su instalación y su base de datos propias; los datos de dos negocios nunca comparten base (decisión 11, RF-32).

### Session 2026-10-10

- Q: ¿La especificación describe el código que hay? → A: No. El código se puede rehacer en cualquier momento; la especificación tiene que alcanzar para construir de nuevo la aplicación sin haberlo visto. Cuánto del sistema existe y con qué pruebas se anota aparte, fuera de la especificación (constitución, principios I y VI).
- Q: Si el código se rehace, ¿qué se conserva? → A: El servidor y su modelo de datos, que son contrato ([data-model.md](data-model.md)). Las pantallas se rehacen.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Vender sin conexión y que llegue todo al volver (Priority: P1)

El Vendedor sigue buscando y vendiendo cuando se corta internet. Cada venta y cada cambio
del mostrador (margen, «no llevó», ajuste de stock, renglón de conteo) se guarda primero en
el dispositivo y se manda solo, en orden y una sola vez, cuando vuelve la conexión.

**Why this priority**: el local tiene internet con microcortes; si el mostrador se frena o se pierde una venta, el sistema es peor que el cuaderno.

**Independent Test**: con la app abierta, cortar la red, registrar ventas y cambiar un margen, volver la red y comprobar en el servidor que cada venta está una sola vez, el stock descontado y el margen nuevo.

**Acceptance Scenarios**:

1. **Given** la app abierta en la pantalla de venta con el catálogo ya guardado en el dispositivo, **When** se corta la red, **Then** el indicador de conexión dice «Sin conexión» y la búsqueda sigue mostrando productos con su precio.
2. **Given** la app sin conexión, **When** el Vendedor cobra una venta en efectivo, **Then** la pantalla dice «Sin conexión: se envía sola», el indicador dice «1 por enviar» y el servidor no tiene la venta.
3. **Given** la app sin conexión con una venta por enviar, **When** el Vendedor cambia el margen de un producto y toca «No llevó», **Then** el precio se recalcula en el dispositivo y el indicador dice «3 por enviar».
4. **Given** tres cambios por enviar, **When** vuelve la red, **Then** el indicador pasa a «Sincronizado» sin que nadie toque nada y en el servidor quedan una sola venta, el stock descontado, el margen nuevo y una consulta.
5. **Given** la app sin conexión durante una hora, **When** el Vendedor registra 30 ventas y busca productos, **Then** todo responde como con conexión y, al volver la red, las 30 ventas están en el servidor, una sola vez cada una.
6. **Given** la app abierta alguna vez con conexión en ese dispositivo, **When** se cierra el navegador y se vuelve a abrir sin red, **Then** la app abre, la búsqueda encuentra los productos guardados y los cambios por enviar siguen ahí.
7. **Given** un margen recién cambiado, **When** se recarga la página antes de que el servidor confirme, **Then** el margen nuevo sigue elegido y llega al servidor: el cambio se guardó en el dispositivo antes de mandarse.
8. **Given** dos cambios seguidos del mismo producto en espera, **When** se envían, **Then** al servidor nunca le llega un valor viejo después de uno nuevo.
9. **Given** una venta que el servidor ya guardó, **When** el dispositivo la manda otra vez (reintento después de un corte), **Then** el servidor no la duplica ni descuenta el stock dos veces.
10. **Given** un cambio en espera y la sesión vencida o cerrada a distancia, **When** se intenta enviar, **Then** el cambio no se descarta: la app vuelve a la pantalla de entrada y lo envía cuando hay una sesión nueva.
11. **Given** la app sin conexión, **When** se corrige el stock de un producto o se carga un renglón de un conteo, **Then** el cambio queda en el dispositivo y llega al servidor al volver la red.
12. **Given** cambios en espera desde hace más de una hora, **When** se mira el indicador de conexión, **Then** avisa en el color de acción cuántos son y que esperan «desde hace más de una hora».
13. **Given** ventas ya confirmadas por el servidor guardadas en el dispositivo, **When** pasan 7 días desde una venta, **Then** esa venta se quita del dispositivo y las de menos de 7 días se conservan.
14. **Given** la app sin conexión, **When** alguien intenta una operación que no es del mostrador (registrar una compra, cargar una lista de precios, administrar usuarios), **Then** la app avisa en el lugar que esa operación necesita conexión y no guarda nada a medias.

---

### User Story 2 - El servidor se cae o se actualiza y el mostrador sigue (Priority: P1)

Una caída del servidor o de la base, o el despliegue de una versión nueva, no frenan al
Vendedor: la app ya está en el dispositivo y lo que no se pudo mandar espera.

**Why this priority**: la infraestructura es gratuita y sin garantía de servicio; el mostrador no puede depender de ella.

**Independent Test**: con la app abierta, apagar el servidor, registrar una venta, volver a levantarlo y comprobar que la venta llega sola.

**Acceptance Scenarios**:

1. **Given** el servidor apagado y un dispositivo que ya abrió la app alguna vez, **When** el Vendedor abre la app, **Then** abre, busca y cobra: las pantallas no se sirven desde la máquina del servidor.
2. **Given** la app abierta y el servidor fuera de alcance, **When** el Vendedor registra un cambio, **Then** queda guardado en el dispositivo y se reenvía, en orden, cuando el servidor vuelve.
3. **Given** el servidor respondiendo con un error propio (no un rechazo del pedido), **When** el Vendedor cobra una venta, **Then** la venta queda en espera y se reintenta sola al reconectar y, a más tardar, un minuto después.
4. **Given** una versión nueva de las pantallas publicada, **When** el dispositivo abre la app, **Then** toma la versión nueva sola, sin que nadie instale nada, y los cambios por enviar y los datos guardados siguen en el dispositivo.
5. **Given** un Vendedor con una venta a medio armar, **When** se despliega una versión nueva del servidor, **Then** la venta se completa y llega al servidor una sola vez.
6. **Given** una versión nueva del servidor publicada para un ambiente, **When** la máquina la despliega y los servicios no quedan sanos, **Then** vuelve sola a la versión que estaba corriendo.
7. **Given** un aviso de despliegue que no llegó a la máquina, **When** la máquina arranca o alguien lanza el despliegue a mano, **Then** queda en la versión que corresponde a su ambiente.

---

### User Story 3 - Buscar y vender al instante con el catálogo completo (Priority: P1)

Con el catálogo de todos los proveedores y miles de ventas guardados en el dispositivo,
buscar, cambiar un margen y registrar una venta siguen siendo instantáneos.

**Why this priority**: «instantáneo» es lo que hace que el sistema no sea más lento que el cuaderno y la calculadora; con el catálogo real se pierde si nadie lo mide.

**Independent Test**: cargar en el dispositivo el catálogo y las ventas de referencia y medir, en la notebook del local, la búsqueda, el cambio de margen y el guardado de una venta.

**Acceptance Scenarios**:

1. **Given** 50.000 productos y 10.000 ventas guardados en el dispositivo, **When** se busca con varias palabras, **Then** el resultado está en pantalla en menos de 100 ms.
2. **Given** 50.000 productos y 10.000 ventas guardados en el dispositivo, **When** se registra una venta más, **Then** queda guardada en el dispositivo en menos de 50 ms.
3. **Given** un producto en pantalla, **When** se le cambia el margen, **Then** el precio nuevo se ve en menos de 100 ms, con o sin conexión.
4. **Given** más de 100.000 artículos guardados en la notebook del local y sin conexión, **When** se busca por nombre, código o código de barras, **Then** el resultado está en pantalla en menos de 100 ms.
5. **Given** un Vendedor que ya usó el sistema, **When** registra una venta de 3 productos, **Then** tarda menos de 20 segundos.

---

### User Story 4 - Vender el primer día sin manual (Priority: P1)

Un Vendedor que nunca vio el sistema registra ventas el primer día sin que nadie le
explique: cada pantalla dice qué hacer, usa las palabras del mostrador y no pide tipear lo
que se puede sacar de una lista, un código de barras o una foto.

**Why this priority**: es la primera prioridad del proyecto; un sistema que le suma trabajo al mostrador no se usa.

**Independent Test**: en el mostrador, darle la app abierta a una persona que nunca la vio y pedirle que registre una venta de 3 productos, sin manual.

**Acceptance Scenarios**:

1. **Given** un Vendedor que nunca usó el sistema y ningún manual, **When** tiene que registrar la primera venta del día, **Then** la registra.
2. **Given** cualquier pantalla sin datos, **When** se abre, **Then** muestra una frase que dice qué hacer (por ejemplo, «Escribí el nombre del producto o escaneá el código»).
3. **Given** cualquier pantalla de la app, **When** se leen sus textos, **Then** todos están en castellano y usan «cuenta corriente», «lista» y «costo», nunca «fiado», «importación» ni «precio de compra neto».
4. **Given** una operación que no se puede completar, **When** la app lo informa, **Then** el aviso aparece al lado de lo que hay que corregir, en castellano, y dice qué hacer.
5. **Given** un aviso en pantalla («Elegí cómo paga», «Hay productos sin precio»), **When** se corrige la causa, **Then** el aviso desaparece solo, sin que haya que cerrarlo.
6. **Given** una lista de precios en vista previa, **When** se aplica, **Then** se ve una barra de progreso con lo que está haciendo mientras la lista se aplica.
7. **Given** una pantalla con paneles plegables, **When** se abre, **Then** los paneles están abiertos, y cada uno se pliega y se despliega, con animación, al tocar su título.
8. **Given** cualquier pantalla, **When** se la recorre, **Then** todo lo que hace algo al tocarlo tiene forma de botón y ningún texto sin esa forma dispara una acción.
9. **Given** una acción que se puede deshacer o repetir, **When** el usuario la pide, **Then** se ejecuta sin ventana de confirmación; solo lo que no se puede recuperar pregunta antes.
10. **Given** un producto que figura en la lista de un proveedor y tiene código de barras, **When** se lo da de alta, se le pone precio o se lo busca, **Then** nadie tipea su descripción, su costo ni su código: salen de la lista y de la cámara.

---

### User Story 5 - Los datos se recuperan después de un desastre (Priority: P1)

Si la base de datos se pierde o se daña, el Administrador la recupera desde una copia
reciente, y hay prueba de que esa copia sirve antes de necesitarla.

**Why this priority**: el sistema es la única fuente de las ventas, las compras y el stock; el servicio de base gratuito no trae copias propias.

**Independent Test**: restaurar la última copia en una base vacía y comparar la cantidad de ventas y el total facturado con la base viva.

**Acceptance Scenarios**:

1. **Given** la base de producción en uso, **When** se mira dónde se guardan las copias en cualquier momento, **Then** hay una copia completa tomada en la última hora.
2. **Given** las copias de la base, **When** se listan, **Then** están todas las de los últimos 30 días y ninguna más vieja.
3. **Given** una semana cualquiera, **When** termina, **Then** hay una copia de esa semana, cifrada, guardada fuera del proveedor de la máquina y fuera del proveedor de la base.
4. **Given** la copia semanal, **When** alguien sin la clave la abre, **Then** no puede leer ningún dato.
5. **Given** un mes cualquiera, **When** termina, **Then** una copia se restauró sola en una base limpia y se compararon su cantidad de ventas y su total facturado con los de la base viva.
6. **Given** la prueba mensual de restauración, **When** la copia no se puede restaurar o los números no coinciden, **Then** los Administradores reciben un aviso.
7. **Given** la base restaurada desde una copia de una hora atrás, **When** se reenvían las ventas de los últimos 7 días que conserva cada dispositivo, **Then** las ventas que la copia no tenía vuelven a estar en el servidor, una sola vez cada una.
8. **Given** la máquina del servidor destruida, **When** se levanta el sistema en otra máquina con la misma configuración, **Then** no se perdió ningún dato: la máquina no guarda ninguno.

---

### User Story 6 - Enterarse cuando el servidor deja de responder (Priority: P2)

Los Administradores se enteran de que el servidor o la base dejaron de responder sin tener
que entrar a mirar.

**Why this priority**: el mostrador sigue vendiendo con el servidor caído, así que nadie nota la caída; mientras dura, el Administrador no ve nada a distancia y las ventas se acumulan en los dispositivos.

**Independent Test**: apagar el servidor de un ambiente y esperar el aviso.

**Acceptance Scenarios**:

1. **Given** el servidor de producción sin responder, **When** el monitor hace su consulta, **Then** los Administradores reciben un aviso que dice qué dejó de responder.
2. **Given** el servidor respondiendo y la base sin responder, **When** el monitor hace su consulta, **Then** los Administradores reciben un aviso que nombra la base.
3. **Given** la máquina del servidor apagada, **When** el monitor hace su consulta, **Then** el aviso sale igual: el monitor no corre en esa máquina.
4. **Given** un día sin ninguna venta ni consulta de usuarios, **When** termina el día, **Then** el monitor consultó la base al menos una vez, para que el servicio gratuito no la pause por inactividad.
5. **Given** la base de producción, **When** supera los 350 MB, **Then** los Administradores reciben un aviso.

---

### User Story 7 - Cada dispositivo abre su interfaz (Priority: P2)

El celular abre la interfaz de tarjetas y pestañas; la computadora, la de tablas, menú
completo y teclado. Es la misma dirección y la misma app; se elige sola por el ancho de la
pantalla.

**Why this priority**: el Vendedor usa la notebook para vender y el celular para escanear y contar; una sola interfaz no sirve en las dos (ADR-014).

**Independent Test**: abrir la misma dirección en una ventana de 412 px de ancho y en una de 1366 px y ver que cada una carga su interfaz.

**Acceptance Scenarios**:

1. **Given** una pantalla de menos de 900 px de ancho, **When** se abre la app, **Then** carga la interfaz de celular; con 900 px o más carga la de computadora.
2. **Given** la app abierta, **When** la ventana cruza los 900 px (se gira una tablet o se achica la ventana), **Then** la app pasa a la otra interfaz.
3. **Given** la app abierta en cualquiera de las dos interfaces, **When** termina de cargar, **Then** trae solo los estilos de esa interfaz: ningún estilo de una se aplica en la otra.
4. **Given** la interfaz de celular, **When** se recorre cualquier pantalla, **Then** ninguna se desplaza hacia el costado.
5. **Given** la interfaz de celular, **When** se navega, **Then** hay cuatro pestañas abajo, las listas son tarjetas y lo que se abre sobre lo que se está haciendo sube desde abajo.
6. **Given** la interfaz de computadora, **When** se abre cualquier pantalla con una lista, **Then** la lista es una tabla que ocupa todo el ancho de la ventana, con el menú completo arriba.
7. **Given** la interfaz de computadora y ningún mouse, **When** el Vendedor busca un producto, lo agrega, elige el medio de pago y cobra, **Then** completa la venta solo con el teclado.
8. **Given** la interfaz de computadora en la notebook del local, **When** se abre la pantalla de venta, **Then** entra entera sin desplazarse: búsqueda arriba, renglones en el medio, total y cobro abajo.
9. **Given** las dos interfaces, **When** se comparan, **Then** usan la misma paleta, la misma tipografía para los importes, el mismo logo y las mismas palabras.
10. **Given** un cambio en la interfaz de computadora, **When** se comparan capturas de todas las pantallas del celular de antes y de después, **Then** son iguales; y lo mismo al revés.
11. **Given** una funcionalidad con pantalla, **When** se la busca en cada interfaz, **Then** está en las dos.

---

### User Story 8 - Nada se borra y cada número se explica (Priority: P2)

Lo que se registró no se borra: se marca o se compensa con una fila nueva. Cada venta guarda
el costo, el margen y el precio de ese momento, para poder explicarla aunque el costo cambie
después.

**Why this priority**: sin históricos intactos no se puede saber cuánto se gana ni explicar un número cuando alguien pregunta.

**Independent Test**: registrar una venta, anularla y mirar en la base que la venta sigue estando, marcada, y que el stock volvió con un movimiento nuevo.

**Acceptance Scenarios**:

1. **Given** una venta registrada, **When** se la mira en la base, **Then** cada renglón tiene guardados el costo, el margen, el precio y la explicación con los que se vendió.
2. **Given** una venta registrada, **When** el costo o el margen del producto cambian después, **Then** el costo, el margen, el precio y la explicación guardados en la venta no cambian.
3. **Given** una venta confirmada, **When** se anula, **Then** la venta queda marcada «anulada», no se borra, y el stock vuelve con un movimiento nuevo.
4. **Given** un producto con una compra y una venta, **When** se corrige su stock a mano, **Then** se agrega un movimiento con el motivo y el stock mostrado es la suma de todos los movimientos.
5. **Given** un producto con costo, **When** llega una lista con un costo nuevo, **Then** se agrega una fila al histórico de costos y la anterior queda como estaba.
6. **Given** cualquier acción que cambia datos, **When** se completa, **Then** queda un evento nuevo con el usuario que la hizo, y ningún evento anterior se modifica ni se borra.
7. **Given** un producto, un cliente o un usuario que deja de valer, **When** se lo da de baja, **Then** queda marcado como inactivo y sus ventas, compras y eventos siguen consultables.

---

### User Story 9 - Solo entra quien corresponde y nada sensible queda expuesto (Priority: P2)

El servidor no atiende a nadie sin sesión, las sesiones se pueden cerrar a distancia, los
servicios internos no aceptan llamadas sin su credencial y en el repositorio, que es
público, no hay datos de proveedores ni secretos.

**Why this priority**: el sistema guarda costos, márgenes y ventas del negocio y listas de precios de terceros.

**Independent Test**: con el sistema levantado, pedirle datos al servidor sin sesión, con una sesión de otro rol y con una sesión cerrada.

**Acceptance Scenarios**:

1. **Given** un pedido de datos al servidor sin sesión o con una sesión inválida, **When** llega, **Then** el servidor lo rechaza por no autenticado.
2. **Given** una sesión abierta en otro dispositivo, **When** se la cierra a distancia, **Then** queda revocada en el servidor y el próximo pedido de ese dispositivo es rechazado.
3. **Given** un pedido al servicio de listas de proveedores sin la credencial de servicio, **When** llega, **Then** el servicio lo rechaza.
4. **Given** una página de otro sitio abierta en el navegador de un usuario con sesión, **When** esa página le pide datos al servidor, **Then** el navegador bloquea la respuesta: el servidor solo admite el origen de la app.
5. **Given** la app de pruebas o de producción, **When** el navegador habla con las pantallas o con el servidor, **Then** siempre lo hace por HTTPS; ninguna de las dos direcciones entrega datos por HTTP.
6. **Given** una planilla o un PDF de un proveedor, un archivo de configuración con valores reales o cualquier archivo de la carpeta de datos privados, **When** se prepara un cambio para el repositorio, **Then** el control de versiones los ignora.
7. **Given** todo el historial del repositorio y las imágenes publicadas, **When** se los revisa, **Then** no contienen ninguna clave, credencial ni lista de precios real.
8. **Given** una variable de configuración ausente, **When** se levanta un servicio, **Then** el arranque se corta nombrando la variable, en lugar de usar un valor por omisión.
9. **Given** un ambiente desplegado en la máquina, **When** se miran sus procesos, **Then** corren con un usuario propio sin privilegios de administrador.
10. **Given** un ambiente desplegado en la máquina, **When** se prueban sus puertos desde internet, **Then** ninguno responde: el servidor solo escucha en la interfaz local y sale por el proxy compartido de la máquina.

---

### User Story 10 - Dos ambientes que no se confunden (Priority: P2)

Hay dos ambientes: pruebas, que se actualiza solo con cada cambio, y producción, que se
actualiza cuando el dueño lo pide. El de pruebas se distingue a simple vista para que nadie
cargue ventas reales ahí.

**Why this priority**: los dos ambientes se abren desde el mismo sitio y con la misma cuenta; confundirlos es cargar ventas reales donde se pierden.

**Independent Test**: abrir la app de pruebas y la de producción y comparar la barra de arriba.

**Acceptance Scenarios**:

1. **Given** la app de pruebas abierta en la computadora, **When** se mira la barra de arriba, **Then** titila y dice «Ambiente de prueba» («Prueba» cuando la leyenda entera no entra en la barra).
2. **Given** la app de pruebas abierta en el celular, **When** se mira la parte de arriba, **Then** hay una leyenda de ambiente de prueba que titila.
3. **Given** la app de producción abierta, **When** se mira la barra de arriba, **Then** no titila ni muestra ninguna leyenda de ambiente.
4. **Given** una app publicada sin que se sepa de qué ambiente es, **When** se abre, **Then** se muestra con la leyenda de ambiente de prueba; solo la de producción se muestra sin leyenda.
5. **Given** un cambio unido a la rama de pruebas, **When** pasan las pruebas unitarias y las verificaciones de configuración, **Then** el ambiente de pruebas queda actualizado sin que nadie intervenga.
6. **Given** un cambio unido a la rama de pruebas, **When** las pruebas unitarias fallan, **Then** ningún ambiente se actualiza.
7. **Given** el ambiente de pruebas con una versión revisada, **When** el dueño pide pasarla a producción, **Then** producción se actualiza a esa versión; no cambia por ningún otro motivo.
8. **Given** una venta registrada en pruebas, **When** se mira la base de producción, **Then** no está: cada ambiente tiene su base.
9. **Given** las plantillas de configuración de todos los ambientes, **When** se comparan, **Then** declaran las mismas variables, y la definición de servicios no usa ninguna que no esté declarada.

---

### User Story 11 - Arrancar y saber que está sano (Priority: P2)

Después de levantar el sistema o de desplegarlo, alcanza con abrir la app y consultar la
salud de cada servicio para saber que está vivo y que el esquema de la base está al día.

**Why this priority**: es la primera verificación después de cualquier arranque o despliegue, y de ella depende la vuelta atrás automática.

**Independent Test**: levantar el sistema con un comando, abrir la app sin sesión y consultar la salud de cada servicio.

**Acceptance Scenarios**:

1. **Given** el sistema levantado y nadie con sesión, **When** se abre la app en la computadora o en el celular, **Then** se ve la pantalla de entrada.
2. **Given** el sistema levantado, **When** se consulta la salud de cada servicio, **Then** todos responden que están sanos.
3. **Given** el servidor arriba y la base sin responder, **When** se consulta la salud del servidor, **Then** responde que no está disponible y nombra la base.
4. **Given** una base sin esquema, **When** arranca el servidor, **Then** aplica todos los cambios de esquema en orden antes de atender, y todas las tablas del modelo de datos existen.
5. **Given** una base con el esquema de la versión anterior y datos cargados, **When** arranca la versión nueva del servidor, **Then** aplica solo los cambios de esquema nuevos y los datos siguen ahí.
6. **Given** un cambio de esquema que no se puede aplicar, **When** arranca el servidor, **Then** no atiende y la base queda como estaba antes de ese cambio.

---

### User Story 12 - Usarlo sin instalar nada, con el equipo del local (Priority: P3)

La app se usa desde el navegador de la notebook y del celular. En el celular se puede
agregar a la pantalla de inicio como una app, sin pasar por la tienda, y su cámara es el
lector de códigos de todo el local.

**Why this priority**: en la notebook del local no se instala nada, y el celular es el único lector de códigos.

**Independent Test**: abrir la dirección de la app en la notebook del local con Chrome y con Firefox, y en Chrome de un celular Android elegir «Instalar app».

**Acceptance Scenarios**:

1. **Given** la notebook del local con Chrome actualizado, **When** se abre la dirección de la app, **Then** funciona completa sin instalar nada.
2. **Given** la notebook del local con Firefox actualizado, **When** se abre la dirección de la app, **Then** funciona completa sin instalar nada.
3. **Given** la app abierta en Chrome de un celular Android, **When** se abre el menú del navegador, **Then** ofrece instalarla, sin pasar por la tienda.
4. **Given** la app instalada en el celular, **When** se la abre desde la pantalla de inicio, **Then** abre a pantalla completa, sin la barra del navegador, con su ícono, su nombre y los colores de la marca.
5. **Given** un local sin ningún lector de códigos de barras, **When** hay que leer un código para buscar, vender, ingresar mercadería o contar, **Then** se lee con la cámara del celular, también cuando se está trabajando en la notebook (RF-08).

---

### User Story 13 - El mismo servidor para cualquier pantalla (Priority: P3)

Todo lo que las pantallas hacen lo hacen a través de la API del servidor, que está
documentada. Otra pantalla (una app Android, una tienda online) puede hacer lo mismo sin
tocar el servidor.

**Why this priority**: las pantallas se rehacen y se suman otras; el servidor y sus reglas se conservan.

**Independent Test**: con solo el documento de la API y una sesión, registrar una venta y consultarla desde un programa que no es la app.

**Acceptance Scenarios**:

1. **Given** el documento de la API y una sesión válida, **When** un programa que no es la app registra una venta siguiendo solo el documento, **Then** la venta queda registrada igual que desde la app.
2. **Given** la API del servidor, **When** se compara con su documento, **Then** toda operación está documentada y ninguna operación documentada es inexistente.
3. **Given** un precio calculado en el dispositivo sin conexión, **When** se compara con el que calcula el servidor para los mismos datos, **Then** son idénticos, con la misma explicación.
4. **Given** cualquier dato del negocio, **When** se busca cómo leerlo o cambiarlo desde afuera del servidor, **Then** la única forma es la API: nada más accede a la base.
5. **Given** una acción que cambia datos, **When** se completa, **Then** queda publicada como un evento con formato versionado que otro servicio puede leer.
6. **Given** los servicios y las pantallas del sistema, **When** se leen sus nombres, **Then** cada uno dice qué parte del negocio resuelve y ninguno se llama por su rol técnico.

---

### User Story 14 - Cada cambio llega probado y cada decisión, escrita (Priority: P3)

Quien cambia el sistema sabe en minutos si rompió algo, y quien llega encuentra escrito por
qué cada cosa es como es.

**Why this priority**: dos personas desarrollan; sin red de pruebas ni decisiones escritas, cada cambio grande obliga a probar todo a mano.

**Independent Test**: empujar un cambio que rompe una regla de precios y ver que el ambiente de pruebas no se actualiza.

**Acceptance Scenarios**:

1. **Given** un cambio empujado a cualquiera de las dos ramas de ambiente, **When** llega al repositorio, **Then** corren todas las pruebas unitarias antes de publicar nada.
2. **Given** un cambio que altera un comportamiento, **When** se lo revisa, **Then** trae una prueba unitaria de ese comportamiento.
3. **Given** los caminos principales del negocio (cargar una lista, buscar y vender, ingresar mercadería, contar un sector, ver el stock valorizado), **When** se corren las pruebas de punta a punta, **Then** cada camino se prueba una vez en la interfaz de celular y otra en la de computadora.
4. **Given** una semana sin que nadie lance las pruebas de punta a punta, **When** termina, **Then** corrieron solas una vez.
5. **Given** un escenario de aceptación de cualquier especificación, **When** se busca su prueba, **Then** tiene una, o figura como comprobable solo en el mostrador.
6. **Given** una decisión técnica que afecta a más de una funcionalidad, **When** se la busca, **Then** hay un ADR con las opciones consideradas y el porqué.
7. **Given** una decisión que cambia otra anterior, **When** se lee el ADR anterior, **Then** tiene una enmienda que lo dice; su texto original no se reescribió.
8. **Given** la guía para levantar y probar el sistema, **When** alguien la sigue al pie de la letra en una máquina limpia, **Then** el sistema levanta y las pruebas corren sin pasos que la guía no nombre.
9. **Given** una pieza del sistema escrita en un lenguaje que no es TypeScript, **When** se busca por qué, **Then** un ADR lo justifica.
10. **Given** las cuentas de todos los servicios de infraestructura, **When** se suman sus facturas del mes, **Then** el total es $0.

---

### Edge Cases

- **Un cambio en espera que el servidor rechaza por inválido** (no por sesión vencida ni por exceso de pedidos) no se puede reenviar tal cual. Nunca se descarta sin avisar. [NEEDS CLARIFICATION: cuando una venta o un cambio registrado sin conexión es rechazado por el servidor al reconectar, ¿dónde queda y quién lo resuelve? Por ejemplo: queda en una lista «No se pudieron enviar» que ve el Vendedor, o se les avisa a los Administradores.]
- **Dos dispositivos cambian lo mismo sin conexión** (por ejemplo, el margen de un producto). [NEEDS CLARIFICATION: ¿qué valor queda cuando los dos se conectan: el último que llega al servidor, o el último que se cambió según la hora del dispositivo?]
- **Navegador sin almacenamiento en el dispositivo:** queda fuera de lo soportado. El único requisito del dispositivo es un navegador actualizado (Chrome o Firefox) que guarde datos del sitio y permita abrir la app sin red (ADR-001).
- **Sesión revocada mientras el dispositivo está sin conexión:** el dispositivo sigue operando con la sesión guardada; al reconectar el servidor rechaza el pedido, la app vuelve a la pantalla de entrada y lo que estaba en espera sale con la sesión nueva (ADR-011).
- **Google caído:** no se puede entrar en un dispositivo nuevo; los que ya tienen sesión siguen (ADR-011).
- **El servidor se reinicia en medio de un ingreso con huella:** el desafío de ese ingreso deja de valer y la app pide otro (ADR-011).
- **Un aviso de despliegue que se pierde:** la máquina se pone al día en su próximo arranque o con un comando a mano (ADR-013).
- **Una tablet o una ventana angosta en la computadora** ven la interfaz de celular; es lo esperado (ADR-014).
- **El servicio de base gratuito pausa la base tras 7 días sin consultas** (ADR-002): la consulta diaria del monitor lo evita (RNF-12).
- **Unir dos productos duplicados (RF-06)** y **quitar un renglón de un conteo abierto (RF-52)** tocan filas ya escritas; ver la pregunta en RNF-30.
- **Los dos ambientes abiertos en el mismo dispositivo:** ver la pregunta en RNF-53.

## Requirements *(mandatory)*

### Functional Requirements

Todos los requerimientos no funcionales, con su ID original, agrupados por tema. Los que la
constitución ya enuncia como principio se citan en una línea con su referencia. «La
notebook del local» es el equipo de RNF-40.

#### Uso

- **RNF-01**: Curva de aprendizaje cero: un Vendedor que nunca usó el sistema registra una venta el primer día, sin manual. Se comprueba en el mostrador, durante el piloto, contando las veces que tuvo que pedir ayuda. [NEEDS CLARIFICATION: ¿cuántas veces puede pedir ayuda un Vendedor nuevo en su primer día para que el requerimiento se dé por cumplido: ninguna, o hasta cuántas?] Ver constitución, principio II.
- **RNF-02**: Nunca más lento que el cuaderno y la calculadora: una venta de 3 productos se registra en menos de 20 segundos. [NEEDS CLARIFICATION: ¿desde qué momento hasta cuál se cuentan los 20 segundos (por ejemplo, desde que se empieza a escribir el primer producto hasta que aparece la pantalla de venta cobrada), y vale para la notebook, para el celular o para los dos?] Ver constitución, principio II.
- **RNF-03**: Mínimo esfuerzo manual: no se tipea nada que se pueda sacar de una lista, un código de barras o una foto. Los productos, sus códigos y sus costos entran por las listas de los proveedores (RF-01 a RF-04); el código de barras se lee con la cámara (RF-08); la foto del producto se saca con el celular (RF-09); los renglones de una factura de compra salen de su foto (RF-51). La pantalla no pide ningún dato obligatorio que el cuaderno no tenga: fecha, producto, cantidad y precio.
- **RNF-04**: Interfaz de celular. Es la que se carga en pantallas de menos de 900 px de ancho. Ninguna pantalla se desplaza hacia el costado. Se navega con cuatro pestañas abajo; las listas son tarjetas, nunca tablas anchas; lo que se abre sobre lo que se está haciendo sube desde abajo y se cierra tocando afuera; la cámara está a un toque al lado de cada buscador; instalada, abre a pantalla completa (RNF-40). Las reglas visuales son las del sistema visual del proyecto. Ver constitución, principio III, y ADR-014.
  - [NEEDS CLARIFICATION: el diseño de referencia del celular que aprobaste (la maqueta «Ferre iOS») no está guardado en el repositorio. Para rehacer las pantallas del celular, ¿alcanza con las reglas escritas del sistema visual, o hay que guardar la maqueta (o capturas de cada pantalla aprobada) como referencia obligatoria?]
  - [NEEDS CLARIFICATION: el sistema visual pide letra de 18 px como mínimo en el celular, y la interfaz de celular que aprobaste usa textos más chicos. ¿Cuál vale: el mínimo de 18 px, o un mínimo menor (¿cuál?)?]
- **RNF-05**: Interfaz de computadora. Es la que se carga en pantallas de 900 px o más. Usa todo el ancho de la ventana: las listas son tablas a todo el ancho, se edita en la fila y el menú completo está arriba. Todo se opera con teclado; el mouse nunca es la única forma. La pantalla de venta y la barra de arriba entran enteras en la notebook del local sin desplazarse. Letra de 16 px como mínimo. Hay un solo botón principal por pantalla. Usa la misma paleta, la misma tipografía de importes y la misma marca que el celular, y ningún cambio en ella altera el celular. Ver constitución, principios II y III, y ADR-014.
  - [NEEDS CLARIFICATION: el sistema visual pide «alto contraste» en las dos interfaces sin decir cuánto. ¿Se toma el mínimo del estándar de accesibilidad WCAG nivel AA (4,5 a 1 entre el texto y su fondo), u otro?]
- **RNF-06**: Todo en castellano, con las palabras del mostrador: «cuenta corriente» y no «fiado», «lista» y no «importación», «costo» y no «precio de compra neto». Los errores aparecen en el lugar y dicen qué hacer. Ver constitución, principios II y IX.
- **RNF-07**: La búsqueda y el cambio de margen muestran su resultado en menos de 100 ms, medidos en la notebook del local con 50.000 productos y 10.000 ventas guardados en el dispositivo. Con esos mismos datos, guardar una venta en el dispositivo tarda menos de 50 ms. Ver constitución, principio II.
- **RNF-08**: La búsqueda cumple RNF-07 y funciona sin internet con más de 100.000 artículos, en la notebook del local. [NEEDS CLARIFICATION: ¿hasta cuántos artículos hay que garantizar la búsqueda instantánea (100.000, 150.000, 200.000), y tiene que cumplirse también en el celular o solo en la notebook?]
- **RNF-09**: Lo que tarda muestra su avance, con lo que está haciendo; los avisos desaparecen solos al corregir la causa; todo lo que se puede tocar tiene forma de botón; los paneles plegables arrancan abiertos y se abren y cierran con animación. [NEEDS CLARIFICATION: ¿a partir de cuánto tiempo una operación tiene que mostrar su avance? El sistema visual dice «si algo va a tardar más» de 100 ms, que es muy poco para una barra de progreso; ¿vale 1 segundo?]

#### Disponibilidad

- **RNF-10**: Sin internet no se nota: buscar y vender funcionan igual, y lo que quedó por enviar se manda solo al reconectar, en orden y una sola vez. Vale para todo cambio del mostrador: ventas, «no llevó», cambios de margen, ajustes de stock y renglones de conteo. Lo demás (compras, listas de precios, administración) necesita conexión y lo dice. Un indicador siempre visible dice «Sin conexión», cuántos cambios hay por enviar o «Sincronizado». Ver constitución, principio IV.
  - [NEEDS CLARIFICATION: cuando un dispositivo con conexión cambia algo (el Administrador cambia un margen desde su celular, o se aplica una lista de precios), ¿en cuánto tiempo como máximo lo tiene que ver otro dispositivo que también está conectado: al instante, en un minuto, al volver a abrir la app?]
- **RNF-11**: Una caída del servidor o de la base no frena el mostrador: las pantallas se publican en un lugar distinto de la máquina del servidor y abren desde el dispositivo; lo que no se pudo mandar se reintenta solo al reconectar y, a más tardar, un minuto después. Ver constitución, principio IV, y ADR-010.
- **RNF-12**: Los Administradores reciben un aviso si el servidor o la base dejan de responder. Lo manda un monitor que no corre en la máquina del servidor, que además consulta la base al menos una vez por día y avisa cuando la base supera los 350 MB (ADR-002). [NEEDS CLARIFICATION: ¿por dónde les llega el aviso a los Administradores (correo, WhatsApp, notificación en el celular) y en cuánto tiempo como máximo desde que el servidor deja de responder (5 minutos, una hora)? ¿Por ese mismo medio se avisa cuando falla una copia de respaldo o la prueba mensual de restauración?]
- **RNF-13**: Actualizar la versión no corta el mostrador ni pierde datos. Las pantallas toman la versión nueva solas al abrirse y conservan lo guardado en el dispositivo. La máquina despliega una versión identificada, comprueba la salud de los servicios y vuelve sola a la anterior si la nueva no queda sana. El esquema de la base cambia solo con cambios numerados que el servidor aplica en orden al arrancar, antes de atender (ADR-007, ADR-013).

#### Respaldos

- **RNF-20**: No se pierde ninguna venta ni ningún cambio del mostrador (margen, «no llevó», ajuste de stock, conteo): cada uno vive en el dispositivo hasta que el servidor lo confirma, aunque se recargue la página, se cierre el navegador o se corte internet. Las ventas confirmadas quedan además 7 días en el dispositivo. Si hay cambios en espera desde hace más de una hora, el indicador de conexión lo avisa. Ver constitución, principio IV, y ADR-002 (primera capa de respaldo).
  - [NEEDS CLARIFICATION: los 7 días de ventas que guarda cada dispositivo sirven para rellenar un hueco si hay que restaurar una copia vieja de la base. ¿El dispositivo tiene que reenviar solo las ventas que al servidor le quedaron afuera, o lo dispara el Administrador a mano después de restaurar?]
- **RNF-21**: Se toma una copia completa de la base cada hora, fuera de la base y de la máquina, y cada copia se guarda 30 días (ADR-002, segunda capa). La máquina del servidor no guarda ningún dato: perderla no pierde nada.
  - [NEEDS CLARIFICATION: los Excel originales de las listas (RF-01b) y las fotos de los productos (RF-09) son archivos, no filas de la base, y ninguna decisión dice dónde se guardan. Como la máquina no puede guardar datos, ¿dónde tienen que vivir (dentro de la base, o en un almacenamiento de archivos gratuito aparte) y tienen que entrar en las copias de cada hora y de cada semana?]
  - [NEEDS CLARIFICATION: ¿las copias se hacen solo de la base de producción, o también de la de pruebas?]
  - [NEEDS CLARIFICATION: con una copia por hora, si la base se pierde se pueden perder hasta 60 minutos de lo que no son ventas (compras, listas aplicadas, altas de usuarios), porque el dispositivo solo conserva las ventas. ¿Se acepta esa pérdida, o esos datos también tienen que poder recuperarse? Y si se pierde la máquina, ¿en cuánto tiempo como máximo tiene que estar el servidor andando de nuevo?]
- **RNF-22**: Una vez por semana se guarda una copia cifrada fuera del proveedor de la máquina y fuera del proveedor de la base (ADR-002, tercera capa). [NEEDS CLARIFICATION: ¿dónde se guarda la copia semanal (por ejemplo, una cuenta de Google Drive del negocio), cuántas semanas se conserva y quién guarda la clave para descifrarla?]
- **RNF-23**: Una vez por mes, sin que nadie lo lance, una copia se restaura en una base limpia y se comparan su cantidad de ventas y su total facturado con los de la base viva; si no se puede restaurar o no coinciden, los Administradores reciben un aviso (ADR-002, cuarta capa). [NEEDS CLARIFICATION: ¿qué copia se restaura en la prueba mensual (la última de cada hora, o la semanal cifrada), y qué diferencia con la base viva se acepta, dado que la base sigue recibiendo ventas después de la copia?]

#### Información

- **RNF-30**: Nada se borra y los históricos no se pisan: los costos, los movimientos de stock y los eventos solo suman filas; lo que deja de valer se marca. El costo vigente es la fila más reciente y el stock es la suma de sus movimientos. Ver constitución, principio V.
  - [NEEDS CLARIFICATION: hay tres casos que chocan con «nada se borra». (a) Al unir dos productos duplicados, las ventas, las compras, los costos y los movimientos del producto absorbido pasan a apuntar al otro: ¿se acepta, dado que queda registrado y se puede deshacer? (b) Al quitar un renglón de un conteo que sigue abierto, ¿se puede borrar, o tiene que quedar marcado? (c) La decisión técnica de la base (ADR-002) manda sacar de la base los eventos de más de un año y archivarlos aparte: ¿se acepta, o «quién hizo qué» tiene que poder consultarse para siempre desde la app?]
- **RNF-31**: Cada renglón de una venta guarda el costo, el margen y el precio de ese momento, con su explicación; un cambio posterior del costo o del margen no los modifica.

#### Equipo, costo y seguridad

- **RNF-40**: Funciona en la notebook vieja del local, con Chrome o Firefox actualizados, y en un celular Android, sin instalar nada. En el celular se puede agregar a la pantalla de inicio como una app, sin pasar por la tienda: abre a pantalla completa, con su ícono, su nombre y los colores de la marca. [NEEDS CLARIFICATION: ¿cuál es la notebook del local (marca y modelo, memoria, sistema operativo y resolución de pantalla) y qué celular Android se usa? Se necesita para poder comprobar los tiempos y que las pantallas entren, sin estar en el local; si no, se toma una pantalla de 1366×768.]
- **RNF-41**: El único lector de códigos es la cámara del celular: ninguna función exige otro lector, y todo código que haya que leer, también trabajando en la notebook, se lee con ella (RF-08). Ver constitución, Restricciones técnicas (Equipo del local).
- **RNF-42**: La infraestructura cuesta $0 por mes hasta que el dueño decida destinarle presupuesto, cuando el sistema muestre resultados sobre las ventas. Ver constitución, principio VIII, y ADR-002.
- **RNF-43**: HTTPS siempre, en las pantallas y en el servidor. Toda sesión se puede cerrar a distancia y deja de servir en el momento. Ningún dato de proveedores ni secreto entra en el repositorio, que es público, ni en lo que se publica desde él. La configuración sale de un archivo por ambiente, sin valores por omisión. Ver constitución, principio VII, y ADR-009, ADR-011.
- **RNF-44**: En el servidor la app corre con un usuario propio sin privilegios de administrador y no publica puertos a internet: escucha solo en la interfaz local y sale por el proxy compartido de la máquina. Nada externo ejecuta comandos en la máquina. Ver constitución, principio VII, y ADR-013.

#### Arquitectura y forma de trabajo

- **RNF-50**: El servidor está separado de la pantalla. Todo lo que la app hace lo hace por la API del servidor, que está documentada con OpenAPI y es la única puerta a los datos; la misma API la consume la web y la puede consumir una app Android. El sistema es un servicio que se integra con otros (venta online) por esa API y por eventos de dominio con formato versionado. Servicios y pantallas se llaman por la parte del negocio que resuelven (ADR-001, ADR-003, ADR-010).
- **RNF-51**: Cada problema con la tecnología que mejor lo resuelve; ante la duda o el empate, TypeScript. Toda pieza en otro lenguaje tiene un ADR que lo justifica. Ver constitución, Restricciones técnicas (Stack).
- **RNF-52**: Importa la disponibilidad, no la escala. El sistema se dimensiona para tres usuarios y unas 200 ventas por día, y no se le agrega ninguna pieza para soportar más. Ver constitución, principio VIII.
- **RNF-53**: Dos ambientes, cada uno con su base: pruebas, que se actualiza solo con cada cambio que pasa las pruebas unitarias, y producción, que se actualiza solo cuando el dueño lo pide. Los dos corren la misma definición de servicios y se diferencian únicamente por su archivo de configuración. Ver constitución, Restricciones técnicas (Ambientes), y ADR-009, ADR-012.
  - [NEEDS CLARIFICATION: los dos ambientes se publican en el mismo sitio (producción en la raíz y pruebas en una carpeta), y por eso un navegador les da el mismo almacenamiento. Si alguien abre los dos en el mismo dispositivo, ¿la sesión, el catálogo guardado y los cambios por enviar de cada ambiente tienen que estar separados, de modo que nada de pruebas pueda terminar en producción ni al revés?]
- **RNF-54**: El ambiente de pruebas se distingue a simple vista: la barra de arriba titila y dice «Ambiente de prueba» (o «Prueba» si no entra); producción no muestra nada de eso. Una app que no sabe de qué ambiente es se muestra como de prueba.
- **RNF-55**: Las pruebas unitarias corren en cada cambio, antes de publicar nada, y todo cambio de comportamiento trae la suya. Las de punta a punta cubren los caminos principales, una vez por interfaz, y se corren a mano antes de promover a producción y después de un cambio grande, y solas una vez por semana. Sin meta de cobertura ni mutation testing. Ver constitución, principio VI, y ADR-004.
- **RNF-56**: Cada decisión técnica que afecta a más de una funcionalidad queda escrita en un ADR con sus opciones y su porqué; una decisión que cambia otra se agrega como enmienda. La documentación acompaña al sistema: la guía para levantarlo y probarlo se puede seguir tal cual está escrita. Ver constitución, principio X.

### Key Entities

El modelo completo está en [data-model.md](data-model.md). Lo que importa para lo no funcional:

- **Cola de cambios** (en el dispositivo): cada cambio del mostrador, completo y con su orden; un cambio sale de la cola cuando el servidor lo confirma.
- **Copia local** (en el dispositivo): el catálogo con costos y márgenes, el stock, los clientes y las ventas de los últimos 7 días.
- **Evento** (en el servidor): registro de lo que pasó y quién lo hizo, con formato versionado; solo recibe filas.
- **Cambio de esquema**: cada modificación numerada de la base y el registro de cuáles ya se aplicaron.
- **Copia de respaldo**: la base completa en un momento dado, con su fecha; las de cada hora y las semanales cifradas.
- **Ambiente**: pruebas o producción; cada uno con su base, su configuración y su dirección.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con 50.000 productos y 10.000 ventas en el dispositivo, una búsqueda y un cambio de margen se ven en menos de 100 ms en la notebook del local.
- **SC-002**: Con esos mismos datos, guardar una venta en el dispositivo tarda menos de 50 ms.
- **SC-003**: Después de un corte de internet de una hora con 30 ventas registradas, las 30 están en el servidor, una sola vez cada una.
- **SC-004**: Con el servidor caído, el Vendedor abre la app, busca y cobra.
- **SC-005**: La infraestructura cuesta $0 por mes.
- **SC-006**: Un Vendedor nuevo vende el primer día sin manual (RNF-01).
- **SC-007**: Una venta de 3 productos se registra en menos de 20 segundos (RNF-02).
- **SC-008**: En cualquier momento hay una copia de la base de menos de una hora, y la prueba mensual de restauración da los mismos totales que la base viva (RNF-21, RNF-23).
- **SC-009**: Al terminar el piloto de dos semanas, el Vendedor prefiere el sistema al cuaderno, o hay una lista concreta de por qué no.
- **SC-010**: Con más de 100.000 artículos, la búsqueda sin conexión se ve en menos de 100 ms en la notebook del local (RNF-08).

## Assumptions

- Son tres usuarios y unas 200 ventas por día; el local tiene una notebook vieja con internet intermitente y un celular Android.
- El navegador no borra los datos guardados del sitio entre un corte y la reconexión (ADR-001).
- La app se abrió al menos una vez con conexión en cada dispositivo: recién ahí queda guardada para abrir sin red.
- RNF-01 y RNF-02 solo se pueden comprobar en el mostrador, durante un piloto de dos semanas con el Vendedor: la primera con cuaderno y sistema en paralelo, la segunda solo con el sistema. En el piloto se miden el tiempo por venta, las ventas que no se pudieron registrar y por qué, las búsquedas sin resultado y las veces que hubo que pedir ayuda.
- Los tiempos de RNF-07 y RNF-08 se miden en la notebook del local antes del piloto.
- El reverse proxy con HTTPS y el usuario sin privilegios los administra la máquina, fuera del repositorio; el sistema solo cumple el contrato de ADR-013.
- Los servicios gratuitos de los que depende el sistema (la base administrada, la máquina, el sitio donde se publican las pantallas, el registro de imágenes, el canal de avisos de despliegue y el ingreso con Google) mantienen sus condiciones; si cambian, se revisa el ADR que los eligió.
