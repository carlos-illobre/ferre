# Feature Specification: Compras y stock

**Feature Branch**: `005-compras-y-stock`

**Created**: 2026-10-10

**Status**: Baseline

**Input**: Especificación completa de la capacidad

## Clarifications

### Session 2026-10-08

- Q: ¿Cómo se les paga a los proveedores? → A: Por adelantado cuando hay descuento; si no, a 30 o 60 días (RF-56).
- Q: ¿Se necesita buscar un producto por foto en la primera versión? → A: No. Alcanza con escanear el código de barras y fotografiar facturas (RF-51). Encontrar un producto por su foto es de la segunda versión (RF-09b).
- Q: ¿Qué se hace cuando un cliente pide algo que no hay? → A: No se toma seña: se le dice qué día va a estar y se lo espera (RF-26). Esos pedidos de clientes son parte de lo que hay que comprar (RF-54).
- Q: ¿De qué tamaño es el catálogo? → A: Entre todos los proveedores puede superar los 100.000 artículos; se empieza con pocos proveedores y se suman de a poco (RF-05). Toda búsqueda de esta capacidad (ingreso, stock, conteo, pedido) tiene que seguir siendo instantánea con ese volumen (RNF-08).

### Session 2026-10-09

- Q: ¿Quién registra la mercadería que llega? → A: Los permisos se dan por rol (Administrador, Vendedor, Comprador, combinables en un mismo usuario); recibir la mercadería y registrarla es del Comprador (RF-72). Quién puede contar stock y quién puede ver costos sigue sin decidir: está preguntado en RF-72, más abajo.
- Q: ¿En qué interfaces tiene que estar esta capacidad? → A: En las dos, celular y computadora, que son interfaces distintas sobre la misma API, con la misma paleta y la misma marca (ADR-014). Todo lo de compras y stock se puede hacer en cualquiera de las dos.

## User Scenarios & Testing *(mandatory)*

Las historias nombran al **Comprador** donde las decisiones de Carlos o la propuesta de
casos de uso lo ponen (recibir mercadería, contar, pedir). Qué rol puede cada operación de
esta capacidad es una pregunta abierta: ver RF-72 en «Functional Requirements».

### User Story 1 - Registrar la mercadería que llega (Priority: P1)

Llega la mercadería. El Comprador elige el proveedor y el comprobante, carga los renglones
buscando cada producto o escaneando su código de barras, pone cuántos llegaron y el costo
que dice el comprobante, y registra el ingreso. El stock sube y, si el costo del comprobante
no es el vigente, pasa a ser el costo vigente de ese producto para ese proveedor, con su
explicación.

**Why this priority**: Es la mitad del stock (lo que entra) y reemplaza el papel semanal de
gastos, que se tira después de mostrarlo. Sin esto no hay costo real ni stock.

**Independent Test**: Con un proveedor que tiene una cinta a costo de lista $1.000, registrar
un ingreso de 10 cintas a $1.200 y 5 pinceles que no estaban en el catálogo a $800, y
comprobar el stock de cada uno, el costo vigente de la cinta con su explicación y que el
pincel existe como producto de ese proveedor.

**Acceptance Scenarios**:

1. **Given** un proveedor con una cinta a costo de lista $1.000, **When** el Comprador abre el ingreso de mercadería, elige el proveedor, pone el número de factura y agrega la cinta buscándola, **Then** aparece su renglón con el costo de la lista ya cargado ($1.000,00) y solo tiene que poner la cantidad.
2. **Given** el renglón de la cinta con costo de lista $1.000, **When** pone cantidad 10 y costo 1200, **Then** el renglón muestra la diferencia contra la lista («+20 %») y el subtotal.
3. **Given** un ingreso en curso, **When** escribe una descripción que no está en el catálogo, la agrega como producto nuevo y le pone cantidad 5 y costo 800, **Then** queda un renglón de producto nuevo con la descripción editable, y el total del ingreso es $16.000.
4. **Given** el ingreso con los dos renglones y la factura 0001-00000777, **When** registra el ingreso, **Then** se le informa el total registrado, cuántos costos se actualizaron (2) y cuántos productos nuevos se crearon (1); el stock de la cinta sube en 10; su costo vigente para ese proveedor pasa a $1.200 con la explicación «según factura 0001-00000777 de <proveedor> del <fecha>»; y el pincel existe como producto de ese proveedor con stock 5.
5. **Given** un renglón de un producto que se vende por unidad y otro de uno que se vende por metro, **When** tipea 10.9 en el primero y 2.55 en el segundo, **Then** la cantidad queda en 10 y en 2,6: entera por unidad y con un decimal a granel (RF-12).
6. **Given** un proveedor que no factura, **When** elige el comprobante «Sin comprobante», **Then** no se le pide número, el ingreso se registra igual y en las compras recientes figura como «sin comprobante».
7. **Given** mercadería que llega con remito, **When** elige el comprobante «Remito» y pone su número, **Then** el ingreso se registra y en las compras recientes figura como remito con su número.
8. **Given** un ingreso sin proveedor elegido, sin renglones, o con un renglón sin costo, sin cantidad o sin descripción, **When** intenta registrarlo, **Then** no se registra y se le dice en el lugar qué dato tiene que completar.
9. **Given** el ingreso abierto en el celular, **When** escanea con la cámara el código de barras de un producto del catálogo, **Then** se agrega su renglón; si el código no está en el catálogo, se le avisa y se le ofrece buscarlo por nombre.
10. **Given** el ingreso abierto en la computadora y un celular vinculado a ella (RF-08), **When** escanea un código de barras con el celular, **Then** el renglón del producto aparece en el ingreso de la computadora.
11. **Given** un ingreso con renglones cargados, **When** el Comprador le agrega la foto del comprobante, **Then** la foto queda guardada con la compra y se puede ver después desde las compras recientes; la foto es opcional.
12. **Given** un ingreso que se mandó a registrar y cuya respuesta no llegó, **When** se vuelve a mandar el mismo ingreso, **Then** queda registrado una sola vez: no se duplica la compra ni se suma el stock dos veces.
13. **Given** el dispositivo sin conexión y un ingreso con renglones cargados, **When** intenta registrarlo, **Then** lo cargado no se pierde. [NEEDS CLARIFICATION: sin internet, ¿el ingreso de mercadería tiene que quedar guardado en el dispositivo y mandarse solo cuando vuelve la conexión, como una venta, o alcanza con avisar «necesita internet» y conservar lo cargado para registrarlo después?]
14. **Given** un proveedor y un número de comprobante que ya tienen una compra registrada, **When** se carga otro ingreso con el mismo proveedor y el mismo número, **Then** [NEEDS CLARIFICATION: ¿el sistema tiene que avisar, impedirlo o dejarlo pasar cuando se carga dos veces la misma factura (mismo proveedor y mismo número) por error?]

---

### User Story 2 - Ver las compras recientes y los gastos de la semana, y anular una compra (Priority: P2)

El Comprador ve lo gastado en la semana y la lista de compras recientes. Abre una compra
para ver qué trajo y, si se cargó mal, la anula: el stock vuelve atrás y la compra queda
marcada como anulada, sin borrarse.

**Why this priority**: El «gasto de la semana» es el informe que se hacía a mano en un
papel; anular es la forma de corregir una carga equivocada.

**Independent Test**: Después de registrar una compra, abrirla en las compras recientes, ver
sus renglones, anularla y comprobar que el stock volvió al valor anterior y que la compra
sigue en la lista, marcada como anulada.

**Acceptance Scenarios**:

1. **Given** una compra recién registrada por $16.000, **When** mira los gastos de la semana, **Then** ve el total gastado y el detalle por proveedor, en el celular y en la computadora (RF-65).
2. **Given** la compra en las compras recientes, **When** la abre, **Then** ve sus renglones: 10 × cinta y 5 × pincel, cada uno con su costo unitario y su subtotal, y el proveedor, la fecha, el comprobante y el total de la compra.
3. **Given** la compra de 10 cintas, **When** la anula, **Then** la compra queda marcada «anulada», el stock de la cinta baja en 10 con un movimiento que dice que es la anulación de esa compra, y la compra deja de sumar a los gastos de la semana. [NEEDS CLARIFICATION: al anular una compra, ¿el motivo es obligatorio, como al corregir el stock, u opcional?]
4. **Given** una compra que al registrarse cambió el costo vigente de la cinta de $1.000 a $1.200, **When** se la anula, **Then** [NEEDS CLARIFICATION: al anular una compra que había cambiado el costo de un producto, ¿el costo vuelve al anterior ($1.000) o queda el de la factura anulada ($1.200)?]
5. **Given** una compra ya anulada, **When** se intenta anularla otra vez, **Then** se rechaza y se le dice que ya está anulada; el stock no cambia.

---

### User Story 3 - Ver el stock y la plata invertida, y corregirlo a mano (Priority: P1)

El Administrador o el Comprador abre el stock y ve cuánta plata hay invertida en mercadería.
Busca un producto, ve cuántos hay y cuánto valen, toca el número para ver los movimientos
que lo explican y, si en la estantería hay otra cantidad, lo corrige diciendo cuántas hay y
por qué. El Vendedor ve el stock de cada producto al buscarlo para vender.

**Why this priority**: Saber qué hay y cuánta plata hay invertida es el primer objetivo del
sistema.

**Independent Test**: Con un candado a costo $2.500, una compra de 20 y una venta de 3,
comprobar que el stock es 17 y vale $42.500, ver sus movimientos, corregirlo a 15 con un
motivo y ver el ajuste explicado.

**Acceptance Scenarios**:

1. **Given** productos con movimientos de stock, **When** abre el stock, **Then** ve el valor del inventario (stock × costo vigente, sin IVA) en total y desglosado por proveedor.
2. **Given** un candado a costo $2.500 con una compra de 20 y una venta de 3, **When** lo busca, **Then** ve stock 17 y valor $42.500.
3. **Given** el candado con stock 17, **When** toca el número del stock, **Then** se listan los movimientos que lo explican (Compra +20, Venta −3), cada uno con su fecha y su nota, y se ve que 17 es la suma de esos movimientos.
4. **Given** el candado con valor $42.500, **When** toca el valor, **Then** ve de dónde sale: 17 × $2.500, con el origen de ese costo (RF-13).
5. **Given** el candado con stock 17, **When** elige corregirlo, pone 15, escribe el motivo «conté la estantería» y guarda, **Then** el stock pasa a 15, el valor a $37.500 y aparece un movimiento de ajuste con la nota «había 17, hay 15: conté la estantería» y el usuario que lo hizo.
6. **Given** el candado con stock 17, **When** intenta corregirlo a 15 sin escribir el motivo, **Then** no se guarda y se le pide el motivo en el lugar.
7. **Given** el candado con stock 17, **When** lo corrige a 17, **Then** no se crea ningún movimiento.
8. **Given** una corrección de stock, **When** pone una cantidad negativa o algo que no es un número, **Then** no se guarda y se le pide un número mayor o igual a cero.
9. **Given** el stock corregido a 15, **When** el Vendedor busca el candado para venderlo, **Then** ve «stock 15» junto al producto.
10. **Given** un producto con stock 2, **When** el Vendedor carga 3 en una venta, **Then** se le avisa que el stock queda negativo y la venta no se bloquea.
11. **Given** el dispositivo sin conexión, **When** corrige el stock de un producto, **Then** la corrección queda guardada en el dispositivo y se manda sola al volver la conexión, sin perderse aunque se recargue la aplicación (RNF-20).
12. **Given** el stock a la vista, **When** pide exportarlo, **Then** obtiene una planilla de Excel con cada producto, su proveedor, su stock, su costo y su valor, y los totales.
13. **Given** productos con stock, **When** mira el valor del inventario, **Then** lo ve también desglosado por familia. [NEEDS CLARIFICATION: el valor del inventario se pidió «por familia, por proveedor y general», pero el catálogo no define familias de productos: ¿qué es una familia (rubro), de dónde sale (la trae la lista del proveedor o se carga a mano) y quién la asigna?]

---

### User Story 4 - Cargar el stock que ya hay, contando de a un sector (Priority: P2)

El stock arranca en cero. El Comprador elige un sector (una estantería, una pared), busca o
escanea cada producto y pone cuántos hay. Si lo interrumpe un cliente, el conteo queda
abierto y lo sigue después. Al cerrar el sector, cada diferencia contra lo que decía el
sistema queda como un ajuste explicado.

**Why this priority**: Nunca se hizo un recuento y el local no se puede cerrar para contar:
se cuenta de a un sector por día. Va después del ingreso y del stock porque ajusta sobre
ellos.

**Independent Test**: Con una lija con stock 10 y un pincel con stock 5, crear un sector,
contar 8 lijas y 5 pinceles, cerrarlo y comprobar el stock de cada uno, el ajuste de la lija
con su nota y que los dos productos quedaron asignados al sector.

**Acceptance Scenarios**:

1. **Given** la lista de sectores, **When** escribe un nombre de sector que no existe y lo agrega, **Then** el sector se crea y se abre su conteo.
2. **Given** un sector que nunca se contó, **When** abre la lista de sectores, **Then** el sector figura con cuántos productos tiene y como «nunca contado»; los sectores ya contados muestran la fecha de su último conteo, y los que tienen un conteo sin cerrar lo dicen.
3. **Given** el conteo abierto y una lija con stock 10, **When** busca la lija, la elige, pone 8 y pasa al siguiente, **Then** la lija aparece entre los contados con diferencia −2 y el buscador queda listo para el próximo producto.
4. **Given** un pincel con stock 5, **When** lo busca y pone 5, **Then** el pincel aparece entre los contados sin diferencia.
5. **Given** dos productos contados, uno con diferencia, **When** cierra el sector y confirma, **Then** se le informa «2 productos contados, 1 con diferencia ajustada»; el stock de la lija queda en 8 y el del pincel en 5; el ajuste de la lija lleva la nota «conteo de <sector> del <fecha>: había 10, hay 8»; y los dos productos quedan asignados a ese sector.
6. **Given** el sector recién cerrado, **When** vuelve a la lista de sectores, **Then** el sector figura con la fecha de ese conteo como último conteo.
7. **Given** un conteo con productos contados y sin cerrar, **When** sale, y más tarde (incluso otro día o desde otro dispositivo) elige el mismo sector, **Then** se retoma el mismo conteo con lo ya contado; no se abre un segundo conteo del mismo sector.
8. **Given** un sector con productos asignados que no se contaron en este conteo, **When** va a cerrarlo, **Then** se le dice cuántos y cuáles productos no contó y elige entre ponerlos en cero (cada uno queda con un ajuste «conteo de <sector> del <fecha>: no se encontró ninguno (había N)») o dejarlos como están.
9. **Given** un conteo abierto en el celular, **When** escanea con la cámara el código de un producto del catálogo, **Then** queda elegido para poner cuántos hay; si el código no está en el catálogo, se le avisa y se le ofrece buscarlo por nombre.
10. **Given** un producto ya contado en este conteo, **When** lo vuelve a contar con otra cantidad, **Then** vale la última cantidad y se le muestra cuánto había puesto antes.
11. **Given** un producto asignado a otro sector, **When** lo cuenta en este, **Then** pasa a ser de este sector.
12. **Given** un producto que se vende por metro, **When** pone 12,5 como cantidad contada, **Then** se acepta con un decimal; en un producto que se vende por unidad solo se aceptan enteros (RF-12).
13. **Given** un conteo abierto y el dispositivo sin conexión, **When** cuenta productos, **Then** lo contado se ve igual en la lista, queda guardado en el dispositivo y se manda solo al volver la conexión. [NEEDS CLARIFICATION: el conteo «funciona sin internet»: además de contar cada producto, ¿también tienen que poder hacerse sin conexión crear un sector, empezar el conteo de un sector y cerrarlo (lo que calcula los ajustes), o esos tres pasos pueden exigir conexión?]
14. **Given** un conteo que quedó abierto varios días, con una lija contada en 8 el lunes y 2 lijas vendidas el martes, **When** se cierra el miércoles, **Then** [NEEDS CLARIFICATION: cuando un conteo queda abierto y entre que se contó un producto y se cierra el sector hubo ventas o compras de ese producto, ¿la diferencia se calcula contra el stock del momento en que se contó (y las ventas posteriores se descuentan aparte) o contra el stock del momento del cierre?]

---

### User Story 5 - Cargar la factura de compra con una foto (Priority: P3)

El Comprador le saca una foto a la factura del proveedor. El sistema lee el proveedor, el
tipo y el número de comprobante, la fecha y los renglones (producto, cantidad, costo) y deja
el ingreso de mercadería precargado. El Comprador revisa, corrige lo que no se reconoció y
registra el ingreso como siempre.

**Why this priority**: Tipear una factura de 20 renglones es el trabajo manual más largo de
la capacidad; no se tipea nada que se pueda sacar de una foto (RNF-03). Va después del
ingreso a mano, que es el camino que queda cuando la foto no se lee.

**Independent Test**: Con la foto de una factura de muestra de un proveedor conocido,
cargarla y comprobar que el ingreso queda precargado con el proveedor, el número, la fecha y
los renglones; corregir uno, registrar y comprobar el stock.

**Acceptance Scenarios**:

1. **Given** el ingreso de mercadería en el celular, **When** el Comprador le saca una foto a la factura con la cámara, **Then** el ingreso se precarga con el proveedor, el tipo y el número de comprobante, la fecha y un renglón por cada producto de la factura, con su cantidad y su costo.
2. **Given** una factura precargada desde la foto, **When** un renglón corresponde a un producto del catálogo (por el código que usa ese proveedor o por su descripción), **Then** el renglón queda unido a ese producto y muestra la diferencia contra el costo de la lista.
3. **Given** una factura precargada, **When** un renglón no se pudo unir a ningún producto o un dato no se leyó con seguridad, **Then** queda marcado para que el Comprador lo corrija a mano ahí mismo: lo une a un producto del catálogo buscándolo o lo deja como producto nuevo.
4. **Given** una factura precargada, **When** el Comprador todavía no registró el ingreso, **Then** nada se guardó: ni stock, ni costos, ni productos nuevos; puede corregir cualquier dato o descartar todo.
5. **Given** una factura precargada y revisada, **When** registra el ingreso, **Then** pasa lo mismo que en un ingreso cargado a mano (historia 1) y la foto queda guardada con la compra, visible desde las compras recientes.
6. **Given** una foto que no se puede leer (borrosa, cortada, o que no es una factura), **When** la carga, **Then** se le avisa con claridad que no se pudo leer y puede sacar otra o cargar el ingreso a mano; lo que ya tenía cargado no se pierde.
7. **Given** la lectura de la foto en curso, **When** tarda, **Then** se muestra su avance y el Comprador puede seguir cargando a mano o cancelarla.
8. **Given** el ingreso de mercadería en la computadora, **When** quiere cargar la factura por foto, **Then** [NEEDS CLARIFICATION: la computadora no tiene cámara: ¿la foto de la factura se carga eligiendo un archivo de imagen, se saca con el celular vinculado a la computadora (como el escáner), o las dos?]
9. **Given** una factura de más de una hoja, o una factura que el proveedor mandó en PDF, **When** quiere cargarla, **Then** [NEEDS CLARIFICATION: ¿hay que poder cargar facturas de varias hojas (varias fotos para una misma compra) y facturas que llegan en PDF, o alcanza con una sola foto por compra?]

---

### User Story 6 - Decidir qué comprar: stock bajo y sugerencia de pedido (Priority: P3)

El Comprador abre «qué pedir» y ve, sin recorrer las estanterías ni consultar varias
planillas, qué productos están por debajo de su stock mínimo y qué pidieron los clientes
que no había. Para cada uno el sistema sugiere cuánto pedir y a qué proveedor, eligiendo el
más barato entre los que lo venden. La lista viene agrupada por proveedor, con el costo
estimado, lista para armar el pedido (historia 7).

**Why this priority**: Reponer antes de quedarse sin mercadería y comprarle al más barato es
el trabajo diario de comprar, que se hacía de memoria y mirando varios Excel. Necesita que
el stock y las ventas ya estén cargados.

**Independent Test**: Con un producto con stock mínimo 10 y stock 4 que venden dos
proveedores a distinto costo, y otro producto con stock por encima de su mínimo, abrir «qué
pedir» y comprobar que figura solo el primero, bajo el proveedor más barato, con una
cantidad sugerida y su costo estimado.

**Acceptance Scenarios**:

1. **Given** un producto con stock mínimo 10 y stock 4, **When** el Comprador abre «qué pedir», **Then** el producto figura en la lista con su stock, su mínimo y una cantidad sugerida.
2. **Given** un producto con stock mínimo 10 y stock 12, **When** abre «qué pedir», **Then** el producto no figura.
3. **Given** un producto con ventas en los últimos 90 días y sin stock mínimo cargado, **When** el Comprador abre su stock mínimo, **Then** el sistema le sugiere un mínimo calculado con esas ventas, y puede aceptarlo o poner otro a mano; el mínimo queda guardado por producto.
4. **Given** una cantidad sugerida o un mínimo sugerido, **When** toca el número, **Then** ve de dónde sale, con las ventas que se usaron para calcularlo (RF-13).
5. **Given** un producto por reponer que venden dos proveedores, **When** mira la lista, **Then** el producto figura bajo el proveedor de menor costo comparable (RF-06, RF-11), se ve quién más lo vende y a cuánto, y puede pasarlo a otro proveedor.
6. **Given** varios productos por reponer, **When** mira la lista, **Then** están agrupados por proveedor, cada uno con su cantidad sugerida y su costo estimado (cantidad × costo vigente), y cada proveedor muestra el total estimado de su grupo.
7. **Given** un pedido de un cliente por un producto que no había (RF-26), **When** el Comprador abre «qué pedir», **Then** ese producto figura en la lista con la cantidad pedida, para quién es y qué día se le prometió.
8. **Given** la lista de «qué pedir», **When** cambia una cantidad sugerida o quita un producto, **Then** el cambio vale para el pedido que está armando y no modifica el stock mínimo del producto.
9. **Given** un proveedor de la lista con sus productos, **When** elige armar el pedido, **Then** se crea un pedido a ese proveedor con esos productos y cantidades (historia 7).
10. **Given** ningún producto por debajo de su mínimo y ningún pedido de cliente sin conseguir, **When** abre «qué pedir», **Then** se le dice que no hay nada para pedir.
11. **Given** productos que están por debajo de su mínimo, **When** el Comprador entra a la aplicación, **Then** recibe el aviso de stock bajo. [NEEDS CLARIFICATION: ¿cómo tiene que llegar el aviso de stock bajo: alcanza con una marca visible en la aplicación con la cantidad de productos por reponer, o además tiene que mandarse (por ejemplo en las novedades del día que reciben los Administradores)?]
12. **Given** un producto que nunca se contó ni se compró desde que empezó el sistema (stock cero porque no se cargó, no porque no haya), **When** se arma la lista de «qué pedir», **Then** [NEEDS CLARIFICATION: el stock arranca en cero y se carga de a poco; ¿los productos que todavía no se contaron ni se compraron tienen que figurar como stock bajo, o quedan afuera del aviso hasta que tengan su primer conteo o su primera compra?]

---

### User Story 7 - Armar el pedido a un proveedor, mandarlo y recibirlo (Priority: P3)

El Comprador arma el pedido a un proveedor, desde la sugerencia o agregando productos a
mano, lo edita y se lo manda por WhatsApp o por correo. Cuando llega la mercadería, el
ingreso se precarga desde el pedido y el pedido queda como recibido, entero o parcial.

**Why this priority**: Cierra el circuito sugerencia → pedido → ingreso, y deja registrado
qué se pidió, que es lo que permite controlar lo que llega contra lo pedido.

**Independent Test**: Armar un pedido de dos productos a un proveedor, mandarlo, abrir el
ingreso de mercadería desde ese pedido, registrar que llegó uno solo y comprobar que el
pedido queda como recibido parcial y el stock subió solo en lo recibido.

**Acceptance Scenarios**:

1. **Given** la sugerencia de «qué pedir» de un proveedor, **When** el Comprador arma el pedido, **Then** el pedido nace con los productos y las cantidades sugeridas, y el costo estimado de cada renglón y del total.
2. **Given** un pedido sin enviar, **When** agrega un producto buscándolo o escaneándolo, cambia una cantidad o quita un renglón, **Then** el pedido se actualiza y el total estimado también; las cantidades respetan RF-12.
3. **Given** ninguna sugerencia, **When** el Comprador quiere pedirle algo a un proveedor, **Then** puede armar el pedido desde cero eligiendo el proveedor y agregando productos.
4. **Given** un pedido armado, **When** lo manda por WhatsApp o por correo, como texto o como PDF, **Then** el pedido queda en estado «enviado», con la fecha y el usuario que lo mandó.
5. **Given** un pedido enviado, **When** llega la mercadería y el Comprador abre el ingreso desde ese pedido, **Then** el ingreso se precarga con el proveedor y con los renglones del pedido (producto, cantidad pedida y costo vigente), y él corrige lo que haya llegado distinto.
6. **Given** un ingreso precargado desde un pedido, **When** registra que llegó todo lo pedido, **Then** el pedido pasa a «recibido».
7. **Given** un ingreso precargado desde un pedido, **When** registra que llegó solo una parte de lo pedido, **Then** el pedido pasa a «recibido parcial», muestra qué renglones y cantidades siguen sin llegar, y el próximo ingreso desde ese pedido se precarga solo con eso.
8. **Given** pedidos en distintos estados, **When** el Comprador abre los pedidos, **Then** ve cada uno con su proveedor, su fecha, su total estimado y su estado (enviado, recibido parcial, recibido), y puede abrirlo para ver sus renglones.
9. **Given** un proveedor sin número de WhatsApp ni correo cargados en su ficha (RF-18), **When** quiere mandarle el pedido, **Then** puede igualmente obtener el texto o el PDF para mandarlo por su cuenta, y marcar el pedido como enviado.
10. **Given** un pedido armado, **When** el Comprador lo va a mandar, **Then** [NEEDS CLARIFICATION: «el Administrador puede aprobar pedidos desde el celular»: ¿un pedido necesita la aprobación del Administrador antes de mandarse al proveedor? Si sí, ¿todos, o solo los que superan un monto, y cuál?]
11. **Given** un pedido listo para mandar, **When** se genera su texto o su PDF, **Then** lleva el nombre del negocio, la fecha y, por renglón, el código que usa ese proveedor, la descripción y la cantidad. [NEEDS CLARIFICATION: ¿el pedido que recibe el proveedor tiene que mostrar también el costo de cada renglón y el total estimado, o solo código, descripción y cantidad?]
12. **Given** un pedido enviado que el proveedor no va a entregar, o uno recibido parcial cuyo resto no va a llegar, **When** el Comprador quiere cerrarlo, **Then** [NEEDS CLARIFICATION: ¿se puede cancelar un pedido ya enviado, y dar por cerrado uno que quedó recibido parcial y cuyo resto no va a llegar? Si sí, ¿con qué estado queda?]

---

### User Story 8 - Saber lo que se les debe a los proveedores y cuándo vence (Priority: P3)

El Administrador ve cuánto se le debe a cada proveedor y qué vence primero. Cada compra
registra cómo se paga: por adelantado cuando el proveedor da descuento, o a 30 o 60 días. Al
pagar, la compra se marca como pagada y deja de figurar en la deuda.

**Why this priority**: Saber qué vence evita atrasarse con un proveedor y es parte de saber
cuánta plata hay comprometida. Depende de que las compras estén cargadas.

**Independent Test**: Registrar una compra a 30 días y otra pagada por adelantado, comprobar
que solo la primera figura en la deuda con su vencimiento, marcarla pagada y comprobar que
la deuda con ese proveedor queda en cero.

**Acceptance Scenarios**:

1. **Given** un ingreso de mercadería, **When** el Comprador lo registra, **Then** elige cómo se paga la compra: por adelantado, a 30 días o a 60 días.
2. **Given** una compra a 30 días, **When** el Administrador abre lo que se les debe a los proveedores, **Then** la compra figura con su proveedor, su comprobante, su importe y su fecha de vencimiento.
3. **Given** una compra pagada por adelantado, **When** abre lo que se les debe, **Then** esa compra no figura como deuda.
4. **Given** varias compras sin pagar, **When** abre lo que se les debe, **Then** ve el total adeudado, el total por proveedor y las compras ordenadas por vencimiento, con las vencidas primero y distinguidas de las que todavía no vencieron.
5. **Given** una compra sin pagar, **When** la marca como pagada, **Then** deja de figurar en la deuda y queda anotado cuándo se pagó y quién lo registró.
6. **Given** una compra sin pagar, **When** se la anula (historia 2), **Then** deja de figurar en la deuda.
7. **Given** el total adeudado a un proveedor, **When** toca el número, **Then** ve las compras que lo componen (RF-13).
8. **Given** una compra a plazo, **When** se registra, **Then** su vencimiento queda calculado. [NEEDS CLARIFICATION: ¿quién decide si una compra es a 30 o a 60 días: es una condición fija de cada proveedor o se elige en cada compra? ¿Y desde qué fecha se cuenta el plazo: la del comprobante o la del día en que llegó la mercadería?]
9. **Given** una compra pagada por adelantado con descuento, **When** se registra, **Then** [NEEDS CLARIFICATION: el descuento por pagar por adelantado, ¿de cuánto es y dónde se carga (un porcentaje fijo por proveedor o uno distinto en cada compra)? ¿Baja el costo de los productos de esa compra, y por lo tanto su precio de venta, o solo el importe a pagar?]
10. **Given** una compra sin pagar de $100.000, **When** se le paga al proveedor una parte, **Then** [NEEDS CLARIFICATION: ¿hay pagos parciales a proveedores (pagar una parte de una factura y seguir debiendo el resto), o una compra está siempre entera pagada o entera sin pagar? ¿Hay que anotar con qué se pagó (efectivo, transferencia, cheque)?]
11. **Given** una compra que vence en pocos días, **When** se acerca su vencimiento, **Then** [NEEDS CLARIFICATION: ¿el sistema tiene que avisar antes de que venza una deuda con un proveedor? Si sí, ¿con cuántos días de anticipación y a quién?]

---

### User Story 9 - Etiquetas con código de barras para lo que no lo trae (Priority: P3)

Muchos productos traen código de barras de fábrica; la tornillería, los cables por metro y
otros no. El Comprador le genera a cada uno un código interno e imprime su etiqueta, con la
descripción, el código y el precio. Desde ahí el producto se escanea como cualquier otro.

**Why this priority**: Escanear es más rápido que buscar por nombre, en la venta y en el
conteo, y el único lector es la cámara del celular (RNF-41). No frena nada de lo anterior.

**Independent Test**: Tomar un producto sin código de barras, generarle el código interno,
imprimir su etiqueta, escanearla en la venta y comprobar que se agrega ese producto.

**Acceptance Scenarios**:

1. **Given** un producto sin código de barras, **When** el Comprador le genera un código interno, **Then** el producto queda con un código propio que no coincide con el de ningún otro producto ni puede confundirse con un código de fábrica, y se lo encuentra buscando por ese código (RF-07).
2. **Given** un producto que ya tiene código de barras de fábrica, **When** se generan códigos internos en lote, **Then** ese producto conserva su código y no recibe otro.
3. **Given** un producto con código interno, **When** imprime su etiqueta, **Then** la etiqueta lleva la descripción, el código de barras legible por la cámara del celular y el precio de venta vigente (RF-10, RF-19).
4. **Given** una etiqueta impresa, **When** el Vendedor la escanea en la venta, **Then** se agrega ese producto a la venta.
5. **Given** una etiqueta impresa, **When** el Comprador la escanea en el ingreso de mercadería o en un conteo, **Then** queda elegido ese producto.
6. **Given** varios productos, **When** elige imprimir en lote por proveedor, **Then** se imprimen las etiquetas de todos los productos de ese proveedor que la llevan.
7. **Given** productos cuyo precio de venta cambió después de la última vez que se imprimió su etiqueta, **When** elige imprimir solo los que cambiaron de precio, **Then** se imprimen esas etiquetas y ninguna otra.
8. **Given** una selección de etiquetas para imprimir, **When** la confirma, **Then** ve antes cuántas etiquetas son y puede quitar productos de la selección.
9. **Given** varios productos, **When** elige imprimir en lote por familia, **Then** se imprimen las etiquetas de los productos de esa familia. [NEEDS CLARIFICATION: la misma pregunta de la historia 3, escenario 13: el catálogo no define familias de productos]
10. **Given** etiquetas para imprimir, **When** se genera la impresión, **Then** sale lista para una impresora de etiquetas o para una hoja A4 con plantilla. [NEEDS CLARIFICATION: ¿con qué se van a imprimir las etiquetas: una impresora de etiquetas (¿cuál, de qué medida?), hojas A4 de etiquetas autoadhesivas (¿de cuántas por hoja?), o las dos?]
11. **Given** un producto que trae código de barras de fábrica, **When** se arma un lote de etiquetas, **Then** [NEEDS CLARIFICATION: ¿las etiquetas se imprimen solo para los productos sin código de fábrica, o también para los que lo traen, para tener el precio a la vista en la estantería?]

---

### User Story 10 - Plan de conteo: qué contar primero (Priority: P3)

El sistema clasifica los productos en A, B y C y propone un calendario de conteo: los A
cada mes, los B cada tres meses, los C cada seis. El Comprador ve qué toca contar en el día
y lo cuenta con el conteo por sector (historia 4).

**Why this priority**: El conteo se hace de a poco; conviene empezar por lo que más pesa.
Necesita ventas y stock cargados para clasificar.

**Independent Test**: Con productos de ventas y costos conocidos, generar la clasificación,
comprobar qué productos quedaron en A y que juntos cubren entre el 70 y el 80 % del valor, y
ver qué toca contar en el día según la fecha del último conteo de cada uno.

**Acceptance Scenarios**:

1. **Given** productos con ventas y costos cargados, **When** se genera la clasificación, **Then** cada producto queda en A, B o C, y los A cubren entre el 70 y el 80 % del valor total.
2. **Given** un producto clasificado, **When** el Comprador toca su letra, **Then** ve de dónde sale: el valor del producto, su lugar en el orden y el porcentaje acumulado (RF-13).
3. **Given** la clasificación, **When** se arma el calendario, **Then** a los A les toca conteo cada mes, a los B cada tres meses y a los C cada seis, contados desde su último conteo.
4. **Given** un producto A contado por última vez hace más de un mes, **When** el Comprador abre qué toca contar en el día, **Then** el producto figura; uno A contado hace una semana no figura.
5. **Given** un producto que nunca se contó, **When** abre qué toca contar, **Then** figura antes que los ya contados de su misma letra.
6. **Given** lo que toca contar en el día, **When** el Comprador o el Administrador abre el tablero (RF-60), **Then** lo ve ahí, con el acceso para empezar a contar.
7. **Given** un producto que tocaba contar, **When** se lo cuenta en un conteo que se cierra, **Then** deja de figurar hasta su próxima fecha.
8. **Given** nada que toque contar en el día, **When** abre el plan, **Then** se le dice que está al día y cuándo es lo próximo.
9. **Given** productos con ventas y costos, **When** se los ordena para clasificarlos, **Then** [NEEDS CLARIFICATION: ¿con qué se ordena para decidir qué es A, B o C? El requerimiento dice «según lo que más se vende» y el pedido original «contar primero lo que más vale», con dos fórmulas posibles: costo × unidades vendidas, o costo × stock. ¿Cuál vale, y con las ventas de qué período (por ejemplo los últimos 90 días)?]
10. **Given** la clasificación, **When** se separan los B de los C, **Then** [NEEDS CLARIFICATION: los A cubren el 70-80 % del valor; ¿dónde está el corte entre B y C (por ejemplo, B hasta el 95 % y C el resto)?]
11. **Given** un plan por producto y un conteo que se hace por sector, **When** el Comprador ve qué toca contar, **Then** [NEEDS CLARIFICATION: el conteo se hace por sector (una estantería entera) y el plan clasifica productos sueltos: ¿«qué toca contar» tiene que listar productos (y se cuentan solo esos, estén donde estén) o sectores (los que tienen más productos A atrasados)?]

---

### Edge Cases

- **Proveedor que no existe o está dado de baja:** la compra se rechaza y se le dice que ese proveedor no existe.
- **El costo del comprobante coincide con el vigente:** no se agrega un costo nuevo ni cuenta como costo actualizado.
- **Producto del catálogo que ese proveedor no tenía en su lista:** la compra se registra y el costo del comprobante pasa a ser el costo vigente de ese producto para ese proveedor; el producto pasa a tener un proveedor más (RF-05, RF-06).
- **Anular una compra cuya mercadería ya se vendió:** se anula igual y el stock puede quedar negativo; el stock negativo se muestra tal cual y se explica con sus movimientos.
- **Anular una compra que no existe:** se rechaza con el mismo aviso que una ya anulada.
- **Producto sin ningún movimiento:** tiene stock 0 y no suma al valor del inventario.
- **Producto con stock y sin costo vigente:** figura con su stock y sin valor, y no suma al valor del inventario; se distingue a la vista de uno que vale $0.
- **Producto que venden varios proveedores:** [NEEDS CLARIFICATION: cuando un mismo producto lo venden varios proveedores, ¿con qué costo se valoriza su stock (el de la última compra, el del proveedor más barato, el del proveedor habitual) y en el total de qué proveedor se suma?]
- **Contar o cerrar un conteo ya cerrado:** se rechaza y se le dice que ese conteo ya se cerró.
- **Sector con un nombre repetido o vacío:** no se crea y se le dice por qué.
- **Cantidad contada negativa o que no es un número:** no se guarda y se le pide un número mayor o igual a cero.
- **Producto contado por error:** mientras el conteo está abierto se puede quitar de lo contado.
- **Cerrar un conteo sin ningún producto contado:** se le avisa antes; si el sector tiene productos asignados, valen las mismas dos opciones para los no contados.
- **Un cambio guardado sin conexión que el servidor rechaza al reconectar** (por ejemplo, contar en un conteo que otro cerró): se le avisa al usuario qué cambio no entró y por qué; no se descarta en silencio.
- **Foto de una factura de un proveedor que no está cargado:** el ingreso se precarga sin proveedor y el Comprador lo elige; la creación de proveedores no es de esta capacidad.
- **Pedido con un producto que el proveedor elegido no vende:** se puede pedir igual; al recibirlo vale el caso «producto del catálogo que ese proveedor no tenía en su lista».
- **Mercadería que llega y no estaba en el pedido:** se agrega al ingreso como cualquier renglón; no cambia lo que el pedido tiene sin recibir.
- **Producto que cambia de precio con la etiqueta ya impresa:** la etiqueta vieja sigue escaneando bien (el código no cambia) y el precio que vale es el del sistema; el producto entra en «los que cambiaron de precio» para reimprimir.

## Requirements *(mandatory)*

### Functional Requirements

- **RF-50**: El sistema registra cada compra a proveedor con su costo real y suma stock por cada renglón. El comprobante es factura, remito o «sin comprobante» (hay proveedores que no facturan); lleva número, salvo «sin comprobante», y fecha. Los renglones se cargan buscando el producto o escaneando su código, con el costo de la lista de ese proveedor ya puesto y la diferencia contra la lista a la vista. Si el costo del comprobante difiere del vigente, pasa a ser el costo vigente de ese producto para ese proveedor, con la explicación «según <comprobante y número> de <proveedor> del <fecha>». Un producto que no estaba en ninguna lista nace en la compra, como producto de ese proveedor. La foto del comprobante se puede guardar con la compra. Las cantidades siguen RF-12 y los costos van sin IVA. Registrar dos veces el mismo ingreso no lo duplica. Las compras recientes se abren para ver sus renglones y se pueden anular: la compra queda marcada «anulada», no se borra, y el stock vuelve con un ajuste por renglón. Los gastos de la semana se muestran en total y por proveedor (RF-65). Cada registro y cada anulación quedan con el usuario que los hizo. El ingreso se puede precargar desde un pedido (RF-55) o desde la foto de la factura (RF-51).
- **RF-51**: El sistema carga la factura de compra desde una foto, sin tipear los renglones: lee el proveedor, el tipo y el número de comprobante, la fecha y cada renglón (producto, cantidad, costo), une cada renglón con el producto del catálogo por el código del proveedor o por la descripción, y deja el ingreso precargado para revisar. Lo que no se reconoce queda marcado para corregir a mano. Nada se guarda hasta que el Comprador registra el ingreso. Si la foto no se lee, se avisa y queda la carga a mano. La foto se guarda con la compra.
- **RF-52**: El stock arranca en cero: es la suma de los movimientos de cada producto. Lo que ya hay se carga de a poco, por sector, desde el celular o la computadora: se crea el sector, se busca o escanea cada producto y se pone cuántos hay. La lista de sectores muestra cuántos productos tiene cada uno, la fecha de su último conteo o que nunca se contó, y si tiene un conteo sin cerrar. Un conteo interrumpido queda abierto (uno por sector) y se retoma con lo ya contado. Un producto contado en un sector pasa a ser de ese sector. Al cerrar, cada diferencia contra el stock del sistema es un ajuste con su nota («conteo de <sector> del <fecha>: había N, hay M»), y los productos del sector que no se contaron se ponen en cero o se dejan como están, a elección de quien cierra. Contar funciona sin internet y pensado para el celular con una mano. Queda anotado quién abrió y cerró cada conteo y quién contó cada producto.
- **RF-53**: El sistema muestra el stock actual de cada producto y cuánta plata hay invertida (stock × costo vigente, sin IVA): en total, por proveedor y por familia. El stock de cada producto muestra los movimientos que lo explican (compras, ventas, ajustes y conteos), y el stock es siempre la suma de todos ellos. Se puede corregir a mano diciendo cuántas hay, con el motivo, que es obligatorio y queda en la nota del ajuste («había N, hay M: motivo») junto con el usuario. El stock se ve al buscar un producto y al venderlo; vender más de lo que hay avisa y no bloquea. El stock y su valorización se exportan a Excel.
- **RF-54**: El sistema avisa qué productos tienen stock bajo y sugiere qué pedir. Cada producto tiene un stock mínimo, que el sistema sugiere según las ventas de los últimos 90 días y que se puede cambiar a mano. La lista «qué pedir» reúne los productos por debajo de su mínimo y los pedidos de clientes sin stock (RF-26), agrupados por proveedor, eligiendo para cada producto el proveedor más barato entre los que lo venden (RF-06), con la cantidad sugerida y el costo estimado. Cada número sugerido explica de dónde sale. [NEEDS CLARIFICATION: ¿cómo se calculan el stock mínimo y la cantidad a pedir a partir de las ventas de los últimos 90 días? Por ejemplo: mínimo = lo que se vende en cuántos días; cantidad a pedir = lo necesario para cubrir cuántos días. ¿Cambia según el proveedor (lo que tarda en entregar, si vende por caja cerrada)?]
- **RF-55**: El sistema arma el pedido a un proveedor: se genera desde la sugerencia (RF-54) o desde cero, se edita, y se manda por WhatsApp o por correo, como texto o como PDF. El pedido tiene estado: enviado, recibido parcial, recibido. El ingreso de mercadería (RF-50) se precarga desde el pedido, y al registrarlo el pedido pasa a recibido o a recibido parcial según lo que llegó. El Administrador puede aprobar pedidos desde el celular.
- **RF-56**: El sistema muestra lo que se les debe a los proveedores y cuándo vence. Cada compra registra cómo se paga: por adelantado cuando hay descuento, y si no a 30 o 60 días. La deuda se ve en total, por proveedor y por compra, ordenada por vencimiento, con lo vencido distinguido. Una compra se marca como pagada y deja de figurar; una compra anulada tampoco figura.
- **RF-57**: El sistema genera un código interno para los productos que no traen código de barras de fábrica e imprime etiquetas con la descripción, el código de barras y el precio de venta, en impresora de etiquetas o en hoja A4 con plantilla. Se imprime de a una o en lote: por familia, por proveedor o solo los que cambiaron de precio desde su última impresión. Una etiqueta impresa se escanea con la cámara del celular en la venta, en el ingreso y en el conteo, y elige ese producto.
- **RF-58**: El sistema arma un plan de conteo que dice qué contar primero: clasifica los productos en A, B y C por su valor, de modo que los A cubran entre el 70 y el 80 % del total, y propone un calendario (A cada mes, B cada tres meses, C cada seis). Qué toca contar en el día se ve en el tablero (RF-60) y lleva al conteo (RF-52).
- **RF-72** (de la capacidad de usuarios y acceso, aplicado acá): cada operación de esta capacidad exige el rol que corresponde. Registrar la mercadería que llega es del Comprador. [NEEDS CLARIFICATION: ¿qué rol (Administrador, Vendedor, Comprador) puede hacer cada una de estas cosas?: anular una compra; ver el stock; ver los costos y la plata invertida; corregir el stock a mano; contar stock y cerrar un conteo; ver «qué pedir» y armar y mandar un pedido; ver lo que se les debe a los proveedores y marcar una compra como pagada; generar códigos e imprimir etiquetas; ver el plan de conteo.]

### Key Entities *(include if feature involves data)*

- **Proveedor**: a quién se le compra. Esta capacidad lo elige entre los activos y usa su contacto (RF-18) para mandarle pedidos.
- **Compra**: un ingreso de mercadería: proveedor, fecha, tipo y número de comprobante, foto del comprobante si la hay, total, estado (confirmada o anulada), cómo se paga, cuándo vence y si está pagada.
- **Renglón de compra**: un producto de la compra, con cantidad y costo unitario sin IVA.
- **Movimiento de stock**: cada entrada o salida de un producto, con signo, tipo (compra, venta, ajuste), a qué documento corresponde y una nota que lo explica. El stock es la suma; los movimientos solo se agregan, nunca se modifican ni se borran.
- **Sector**: un lugar del local (una estantería, una pared) donde viven productos. Cada producto está en un sector a la vez.
- **Conteo**: el recuento de un sector, abierto o cerrado, con quién lo abrió y lo cerró y el resumen del cierre (contados, ajustados, sin contar, puestos en cero).
- **Renglón de conteo**: cuántas unidades de un producto se contaron, cuándo y quién.
- **Stock mínimo**: por producto, la cantidad por debajo de la cual hay que reponer; sugerido por el sistema o puesto a mano.
- **Pedido a proveedor**: lo que se le pide a un proveedor: fecha, estado (enviado, recibido parcial, recibido), quién lo armó y lo mandó, y sus renglones (producto, cantidad pedida, cantidad recibida, costo estimado). Las compras que lo reciben quedan unidas a él.
- **Código interno**: el código de barras que el sistema le da a un producto que no trae uno de fábrica.
- **Clasificación de conteo**: por producto, su letra (A, B o C), el valor con que se calculó y la fecha en que le toca el próximo conteo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Después de registrar una compra, el stock de cada producto sube exactamente la cantidad cargada y el costo vigente es el del comprobante.
- **SC-002**: El stock de cualquier producto es igual a la suma de todos sus movimientos, y esos movimientos se pueden ver, por muchos que sean.
- **SC-003**: Después de cerrar un conteo, el stock de cada producto contado es igual a la cantidad contada, y cada diferencia tiene un ajuste que dice cuánto había y cuánto hay.
- **SC-004**: Anular una compra deja el stock de sus productos como estaba antes de registrarla.
- **SC-005**: El gasto de la semana sale de las compras cargadas, sin anotar nada aparte.
- **SC-006**: Cargar a mano una factura de 20 renglones lleva menos de 5 minutos.
- **SC-007**: Contar un sector de 100 productos lleva menos de 30 minutos, con el celular y una sola mano.
- **SC-008**: El valor del inventario coincide con la suma de stock × costo vigente de cada producto, y cierra contra los conteos cerrados.
- **SC-009**: Una factura fotografiada con el celular precarga el proveedor, el número, la fecha y al menos el 90 % de los renglones bien; el resto se corrige a mano en el mismo lugar.
- **SC-010**: La lista de «qué pedir» coincide con lo que el Comprador habría pedido en 8 de cada 10 casos.
- **SC-011**: Un pedido completo se arma y se manda en menos de 3 minutos.
- **SC-012**: Una etiqueta impresa se escanea con la cámara del celular en la venta y agrega el producto correcto.
- **SC-013**: En la clasificación de conteo, los productos A cubren entre el 70 y el 80 % del valor total.
- **SC-014**: Ninguna compra, corrección de stock ni producto contado se pierde por un corte de internet o por recargar la aplicación.

## Assumptions

- **Costos sin IVA:** el costo unitario de la compra y el valor del inventario van sin IVA, y el costo de una compra es comparable con el de las listas (RF-11).
- **Compras recientes:** son las últimas 50 compras, de la más nueva a la más vieja, incluidas las anuladas.
- **Semana de gastos:** la definición del período es de RF-65 (capacidad de información del negocio); esta capacidad solo aporta las compras.
- **Stock negativo:** está permitido y se muestra tal cual; indica que hay una compra o un conteo sin cargar.
- **Ficha del proveedor:** el número de WhatsApp y el correo a los que se manda un pedido son de RF-18.
- **Pedidos de clientes sin stock:** su carga es de RF-26 (capacidad de ventas); esta capacidad los lee para «qué pedir».
- **Tablero:** el lugar donde se muestra qué toca contar es el de RF-60.
- **Comprobante sin número:** en una factura o un remito el número se pide, pero no es obligatorio para registrar: lo obligatorio es lo que el cuaderno ya tiene (constitución, principio II), que acá es proveedor, producto, cantidad y costo.
- **Alta, modificación y baja de proveedores, y sectores:** crear proveedores es de la capacidad de catálogo. Renombrar, reordenar o dar de baja un sector no está pedido por ningún requerimiento.
