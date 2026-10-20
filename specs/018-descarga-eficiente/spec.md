# Feature Specification: Descarga eficiente

**Feature Branch**: `018-descarga-eficiente`

**Created**: 2026-10-20

**Status**: Aprobada (Carlos, 2026-10-20), también la historia 5

**Maquetas**: Aprobadas (Carlos, 2026-10-20): `maquetas/celular-descarga.html` y `maquetas/compu-descarga.html`, la fila «Datos para trabajar sin conexión» en Configuración (historia 5).

**Input**: Carlos, el 2026-10-20, después del aviso de Supabase del 18/10 (la organización pasó
el tope del plan gratuito: 6,45 de 5 GB de datos que salen de la base y 1,51 de 1 GB de
registros; desde el 18/11 puede restringir la base): «hacé que sea eficiente, no tiene por qué
descargar todo de la base, que descargue solo lo que necesita, siempre paginado». Y después:
«solamente necesito saber los márgenes cuando hago la búsqueda […] ahí hay una consulta
puntual y recién ahí se traen los márgenes de los productos de esa consulta»; «todos aquellos
datos que no cambien frecuentemente tienen que cachearse en el server»; «cuando no hay
internet se pierde la capacidad de búsqueda, lo que se conserva es la capacidad de registrar
ventas».

**Lo que pasa hoy** (medido en el código y en el panel de Supabase el 2026-10-20):

- Cada dispositivo baja el catálogo entero, unos once mil productos cada uno con sus
  proveedores, costos y la cuenta del precio (alrededor de 10 MB), y lo vuelve a pedir cada vez
  que se abre una pantalla con productos y pasó un minuto, aunque no haya cambiado nada. El
  servidor arma cada una de esas respuestas leyendo la base entera.
- El stock de todos los productos y todos los clientes se piden en cada pantalla.
- Los datos que salen de la base siguen al uso: casi nada del 6 al 9/10, 2,6 GB el 11/10, unos
  900 MB el 13/10, 750 MB el 17/10, 600 MB el 19/10.
- Los registros son parejos, unos 105 MB por día también sin uso: el chequeo de salud consulta la
  base cada 10 segundos y casi siempre abre una conexión nueva, en los dos ambientes.

## Clarifications

### Session 2026-10-20

- Q: ¿Se descarga todo o solo lo necesario? → A: Solo lo necesario y siempre de a páginas.
- Q: ¿Los márgenes, costos y proveedores de todos los productos? → A: No: se traen recién al buscar, y solo los de los productos que encontró esa búsqueda.
- Q: ¿El servidor consulta la base en cada pedido? → A: No: lo que se lee seguido y cambia poco y de forma controlada (los productos con sus precios, las listas) vive en una copia del servidor, que se pone al día cuando la base cambia. Lo que varía (las ventas, el stock) se lee de la base.
- Q: ¿Qué pasa sin internet? → A: Se pierde la búsqueda; se conserva registrar ventas (decisión 129). Cambia el principio IV de la constitución y RNF-10.
- Q: ¿Se sacan «Trabajar sin conexión» y «Cómo buscar productos» de Configuración? → A: No: Configuración queda como está; se agrega un botón que, solo al tocarlo, baja una vez todo lo necesario para trabajar sin conexión.
- Q: ¿Dónde va el botón, qué baja y cuándo se usa? → A: En el celular y en la computadora, solo con «Trabajar sin conexión» habilitado; lo que necesita el empleado (quien vende y quien compra) para el día a día, no lo del administrador (Procesos, «Cómo va el negocio»); se usa solo sin conexión. «Cómo buscar productos» queda como está por ahora.
- Q: ¿Cómo se sabe qué es nuevo al volver a tocarlo? → A: Con la marca que da el servidor en cada descarga (no la fecha y hora del dispositivo): trae solo lo que cambió desde entonces.
- Q: ¿«Trabajar sin conexión» en la computadora? → A: Sí, también (Carlos).
- Q: ¿Hacen falta los registros de la base? → A: No: el sistema no genera registros que nadie usa.
- Q: ¿El chequeo de salud tiene que mirar la base? → A: No: dice si el servidor anda, sin consultar la base.
- Q: ¿Y que Supabase no pause la base? → A: Un chequeo que consulta la base para evitarlo (Carlos: «cada 7 días»; va una vez por día, con el porqué en los supuestos).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Buscar trae solo lo encontrado, de a páginas (Priority: P1)

En cualquier pantalla con productos (Catálogo, Vender, Ingreso, Pedidos, Contar, Inventario,
Depósito, Duplicados), en el celular y en la computadora, el dispositivo le pregunta al
servidor y recibe solo los productos de esa consulta, de a páginas, cada uno con lo que la
pantalla muestra: precio, margen, costos, proveedores y stock. Nada se baja por adelantado.

**Why this priority**: Es casi todo el consumo de hoy.

**Independent Test**: Buscar «tornillo», ver los primeros 50 con su precio y su stock, bajar
hasta el final y ver que llegan los siguientes; medir que no llegó ningún otro producto.

**Acceptance Scenarios**:

1. **E01** **Given** una pantalla con productos recién abierta, **When** se mira, **Then** llegan los primeros 50 en orden alfabético, con su precio, su margen, su stock y sus proveedores; no llega ningún otro producto.
2. **E02** **Given** los primeros 50 a la vista, **When** se llega al final de la lista, **Then** llegan los 50 siguientes, con «Cargando más…» mientras tanto; al final, ninguno más.
3. **E03** **Given** una búsqueda por nombre, marca o código de proveedor con 300 resultados, **When** se escribe, **Then** se consulta una vez cuando se deja de escribir y llegan los primeros 50, en el mismo orden que hoy (primero las descripciones más cortas).
4. **E04** **Given** un código de barras escaneado o tipeado, **When** se lo busca, **Then** llega solo el producto de ese código, o «no existe» si no hay ninguno.
5. **E05** **Given** los filtros del Catálogo (con stock, sin stock, marca), **When** se elige uno, **Then** el servidor filtra y devuelve la primera página; la lista de marcas para elegir también viene del servidor.
6. **E06** **Given** una pantalla que necesita productos puntuales (los de un pedido, los de la venta del celular vinculado, los que tienen stock en Inventario), **When** se abre, **Then** pide esos productos por su identificador, de a páginas, y no el resto.
7. **E07** **Given** cualquier usuario, **When** llegan productos, **Then** llegan con los mismos datos que hoy, y lo que cada pantalla oculta según los permisos sigue oculto.
8. **E08** **Given** se cambió un margen, un código o una foto desde este dispositivo, **When** se vuelve a mirar el producto, **Then** se ve con el cambio.

---

### User Story 2 - Sin internet se registran ventas; no se busca (Priority: P1)

**Why this priority**: Lo que no se puede perder es la venta (decisión 129).

**Independent Test**: Con productos ya agregados a la venta, cortar internet, cobrar y ver la
venta en la cola; volver la conexión y verla en el servidor. Sin internet, buscar dice que
hace falta conexión.

**Acceptance Scenarios**:

1. **E09** **Given** una venta en curso con productos ya agregados, **When** se corta internet y se cobra, **Then** la venta queda registrada en el dispositivo, cuenta en «por enviar» y se manda sola al volver la conexión, una sola vez y en orden (RNF-20).
2. **E10** **Given** sin internet, **When** se busca o se escanea un producto, **Then** dice «Sin conexión: para buscar productos hace falta internet» y la venta en curso sigue como estaba.
3. **E11** **Given** sin internet, **When** se agrega un renglón a mano (descripción y precio), **Then** se puede, como hoy, y se cobra.
4. **E12** **Given** un cambio de margen o de código hecho sin internet, **When** vuelve la conexión, **Then** se manda solo, como hoy.
5. **E13** **Given** cualquier dispositivo, celular o computadora, **When** se usa, **Then** sin la descarga a mano (historia 5) no guarda el catálogo, el stock ni los clientes; lo que falta mandar se guarda según «Trabajar sin conexión» (RF-84).

---

### User Story 3 - El servidor tiene a mano lo que cambia poco (Priority: P1)

Los productos con sus precios y proveedores se leen todo el tiempo y cambian
solo por una acción puntual (aplicar una lista, cambiar un margen, unir duplicados). El
servidor los tiene en una copia propia y responde desde ahí. Cuando la base cambia, por el
camino que sea, la copia se pone al día leyendo de la base solo lo que cambió. Lo que varía
todo el día (ventas, stock, movimientos) se lee siempre de la base.

**Why this priority**: Aunque el dispositivo pida 50 productos, sin la copia el servidor tendría
que leerlos de la base en cada búsqueda.

**Independent Test**: Buscar productos muchas veces y ver que la base no recibió ninguna
consulta de productos; aplicar una lista y ver los precios nuevos en la próxima búsqueda.

**Acceptance Scenarios**:

1. **E14** **Given** el servidor andando con su copia al día, **When** se busca, se escanea, se filtra o se pide un producto, **Then** la respuesta sale de la copia; de la base solo se lee el stock de los productos de esa página.
2. **E15** **Given** se aplica una lista de precios, **When** termina, **Then** la copia lee de la base solo los productos que cambiaron, y la próxima búsqueda de cualquier dispositivo trae los precios nuevos.
3. **E16** **Given** se cambia el margen, el código, la foto, la unidad o el proveedor de un producto, se unen o se separan duplicados o se cambia el nombre de un proveedor, **When** la base lo guarda, **Then** en menos de 5 segundos la copia lo tiene.
4. **E17** **Given** un cambio que la base rechaza o que falla a la mitad, **When** termina con error, **Then** la copia queda como estaba: nunca tiene algo que la base no tiene.
5. **E18** **Given** el servidor arranca (por ejemplo, al subir una versión), **When** arma su copia, **Then** parte de la que guardó en su disco y lee de la base solo lo que cambió desde entonces; la primera vez, o si la guardada no sirve, la lee entera, de a páginas.
6. **E19** **Given** la conexión con la base se corta y vuelve, **When** vuelve, **Then** la copia lee lo que cambió mientras tanto.

---

### User Story 4 - Comprobar que el servidor anda no toca la base (Priority: P1)

Los registros de la base no se usan. Nada de lo que corre solo, a ritmo fijo, consulta la base
ni abre conexiones nuevas.

**Why this priority**: Los registros pasan el tope todos los días, haya uso o no.

**Independent Test**: Con el servidor quieto una hora, ver que no hizo ninguna consulta a la base.

**Acceptance Scenarios**:

1. **E20** **Given** el servidor andando y sin uso, **When** pasa una hora, **Then** no hizo ninguna consulta a la base ni abrió ninguna conexión nueva.
2. **E21** **Given** el servidor andando, **When** se mira su salud, **Then** dice que anda y qué versión es, sin consultar la base; el despliegue sigue volviendo a la versión anterior si la nueva no arranca (RNF-13).
3. **E22** **Given** la base no responde, **When** alguien usa la aplicación, **Then** el pedido falla con el aviso de siempre; la salud del servidor no lo dice.
4. **E31** **Given** el servidor andando y nadie usando la aplicación, **When** pasan días, **Then** consulta la base una vez por día, para que Supabase no la pause a los 7 días sin uso; arrancar también cuenta como una consulta.

---

### User Story 5 - Descargar a mano los datos para trabajar sin conexión (Priority: P2)

Configuración queda como está, y suma dos cosas (Carlos, 2026-10-20): «Trabajar sin conexión»
también en la computadora, y una fila «Datos para trabajar sin conexión» con un botón que, solo
cuando se lo toca, baja lo que el empleado (quien vende y quien compra) necesita para el día a
día sin internet. Nada se baja solo. Lo de quien administra (Procesos, «Cómo va el negocio») no
va. Lo bajado se usa solo sin conexión; con internet se sigue buscando en el servidor.

**Why this priority**: Sin esto, sin internet no se puede buscar ni escanear.

**Independent Test**: Tocar «Descargar», cortar internet, buscar y escanear un producto y venderlo
a cuenta corriente; volver la conexión, cambiar un margen en otro dispositivo, tocar «Actualizar»
y ver que llega solo ese producto.

**Acceptance Scenarios**:

1. **E23** **Given** «Trabajar sin conexión» habilitado, en el celular o en la computadora, **When** se abre Configuración, **Then** debajo está «Datos para trabajar sin conexión» con «Descargar» y «Todavía no se bajaron…»; con la llave apagada, la fila no está.
2. **E24** **Given** «Descargar», **When** se toca con conexión, **Then** baja, de a páginas, los productos con su precio, costos y proveedores, el stock y los clientes; mientras tanto se ve cuánto lleva («Bajando… 4.500 de 11.240 productos») y se puede seguir usando la aplicación; al terminar dice cuándo se bajaron y cuántos productos, y el botón pasa a «Actualizar».
3. **E25** **Given** datos ya bajados, **When** se toca «Actualizar», **Then** baja solo lo que cambió desde la descarga anterior (productos nuevos, cambiados o dados de baja, el stock que se movió) y los clientes. Qué cambió lo dice la marca que dio el servidor en la descarga anterior, no el reloj del dispositivo.
4. **E26** **Given** datos bajados y sin conexión, **When** se busca o se escanea un producto, en cualquier pantalla del día a día, **Then** se encuentra con lo bajado, con su precio, su stock y los clientes para cobrar a cuenta corriente.
5. **E27** **Given** datos bajados y con conexión, **When** se busca, **Then** se busca en el servidor, como si no hubiera nada bajado.
6. **E28** **Given** sin conexión, **When** se toca «Descargar» o «Actualizar», **Then** dice «Sin conexión: para bajar los datos hace falta internet.» y lo bajado antes sigue.
7. **E29** **Given** la llave «Trabajar sin conexión» apagada, **When** se apaga, **Then** se borra lo bajado, como hoy se borra lo guardado (RF-84).
8. **E30** **Given** la computadora, **When** se abre Configuración por primera vez, **Then** «Trabajar sin conexión» aparece habilitada (como trabaja hoy, que guarda siempre lo que falta enviar); en el celular, deshabilitada, como hoy.

Maquetas: `maquetas/celular-descarga.html` y `maquetas/compu-descarga.html`, aprobadas por Carlos el 2026-10-20.

### Edge Cases

- Una búsqueda que llega tarde (se escribió otra cosa mientras tanto): se descarta; se ve la
  última.
- Un producto que se unió a otro o se dio de baja mientras estaba en una lista a la vista: al
  agregarlo a la venta, el servidor lo dice como hoy.
- Dos dispositivos: un margen cambiado en uno se ve en el otro en su próxima búsqueda.
- Un dispositivo de una versión vieja que todavía pide el catálogo entero: el servidor se lo da
  desde la copia, de a páginas, hasta que se actualiza.
- La lista de marcas para el filtro sale de la copia; el filtro de stock lee de la base solo qué
  productos tienen stock.

## Requirements *(mandatory)*

### Functional Requirements

- **RF-122**: Ningún dispositivo baja el catálogo. Cada pantalla con productos consulta al
  servidor y recibe solo los productos de esa consulta (búsqueda por nombre, marca o código,
  código exacto, filtros, o productos puntuales por identificador), de a 50, y los siguientes al
  llegar al final de la lista. Cada producto llega con lo que se muestra de él (precio, margen,
  stock, costos y proveedores, como hoy).
- **RF-123**: Sin internet no se busca ni se escanea (salvo con lo descargado a mano, historia 5):
  se dice que hace falta conexión. Se sigue registrando la venta en curso y todo cambio queda en
  el dispositivo hasta que el servidor lo confirma, según «Trabajar sin conexión» (RF-84), que
  sigue como está (decisión 129).
- **RF-124**: El servidor tiene en una copia propia los productos con sus precios y proveedores, y
  responde desde ahí. La copia se pone al día sola cuando la base cambia, leyendo
  solo lo que cambió, y al arrancar parte de la que guardó en su disco. Las ventas, el stock y lo
  demás que varía se leen de la base.
- **RF-125**: Ver si el servidor anda no consulta la base. Nada de lo que corre solo, a ritmo
  fijo, consulta la base ni abre conexiones nuevas, salvo una consulta por día para que Supabase no
  pause la base por falta de uso (Carlos, 2026-10-20).

### Non-Functional Requirements

- **RNF-62**: Con el uso de hoy, los dos ambientes juntos usan menos de la mitad de lo que permite
  el plan gratuito de la base por mes: menos de 2,5 GB de datos que salen de la base y menos de
  0,5 GB de registros. Lo mide Carlos en el panel de uso de Supabase un mes después de subirlo.

### Key Entities

- **Copia del servidor**: los productos con sus precios y proveedores, tal como
  están en la base, con la marca de hasta qué cambio tiene. No es un dato nuevo del negocio.

## Success Criteria *(mandatory)*

- **SC-001**: Abrir una pantalla con productos trae como mucho 50 productos (hoy, once mil).
- **SC-002**: Una búsqueda no lee productos de la base; solo el stock de los que devuelve.
- **SC-003**: El consumo mensual queda bajo RNF-62.
- **SC-004**: Buscar y escanear responden en menos de un segundo con buena conexión.

## Assumptions

- Cada ambiente tiene un solo proceso del servidor que atiende a la aplicación: la copia es una.
  Si algún día hay dos, cada uno se pone al día solo por el mismo camino.
- El ambiente de pruebas se reinicia con cada subida, muchas veces por día: por eso la copia se
  guarda en el disco y al arrancar se lee solo lo que cambió.
- Los clientes no van en la copia: cada uno lleva su deuda, que cambia con cada venta a cuenta
  corriente. Son pocos; se piden al abrir Vender y Clientes, no en cada pantalla.
- Las otras lecturas (ventas del día, listas, auditoría, pedidos) ya vienen por día, por
  identificador o de a páginas, y no cambian.
- Supabase pausa la base del plan gratuito a los 7 días sin uso. Carlos pidió un chequeo que lo
  evite (2026-10-20): una consulta por día, y no cada 7 días, porque una cada 7 días justos puede
  llegar tarde y el reloj del servidor vuelve a empezar con cada subida.
- Supabase no deja apagar sus registros en el plan gratuito; se bajan dejando de generarlos. Si
  después de subirlo siguen parejos y altos, Carlos mira en el panel qué registro se repite y se
  anota aparte.
