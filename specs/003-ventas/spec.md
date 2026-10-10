# Feature Specification: Ventas

**Feature Branch**: `003-ventas`

**Created**: 2026-10-10

**Status**: Baseline

**Input**: Especificación completa de la capacidad

## User Scenarios & Testing *(mandatory)*

La capacidad cubre todo lo que pasa con una venta: registrarla en el mostrador, cobrarla,
verla, corregirla, anularla, cambiarla, y lo que la rodea (lo que el cliente pidió y no
llevó, los pedidos, los presupuestos, el comprobante). Vale para las dos interfaces,
computadora y celular (ADR-014), salvo donde un escenario nombra una sola.

Los importes siguen RF-19 (capacidad 002): el precio de venta calculado y cada renglón van
para arriba al múltiplo de $1.000; un precio puesto a mano se respeta tal cual y avisa si
no es múltiplo de $1.000. En los ejemplos, el precio sale de costo + margen +
IVA (RF-10): una mecha con costo $1.000 y margen 100 % da 1000 × 2 × 1,21 = 2420, que para
arriba es $3.000.

### User Story 1 - Vender en el mostrador (Priority: P1)

El Vendedor registra una venta en el orden del mostrador (CU-01): busca el producto, ve el
costo, el margen y el precio, le dice el precio al cliente, pone la cantidad, elige cómo
paga y cobra. La venta queda guardada con sus renglones, descuenta el stock y queda a nombre
del usuario que la registró.

**Why this priority**: es lo que reemplaza al cuaderno; sin esto no hay sistema.

**Independent Test**: con un producto que ya tiene margen, se lo busca, se lo agrega, se
elige efectivo y se cobra; la venta queda confirmada y el stock baja.

**Acceptance Scenarios**:

1. **Given** un Vendedor con sesión, **When** abre la venta, **Then** la búsqueda está lista para escribir sin tocar nada más, y la venta vacía dice qué hacer (escribir el nombre del producto o escanear el código de barras).
2. **Given** una mecha con costo $1.000 y margen 100 % guardado, **When** el Vendedor escribe su nombre en la búsqueda, **Then** la sugerencia muestra el precio $3.000, sin pedir el proveedor.
3. **Given** la sugerencia de la mecha elegida, **When** la agrega (Enter en la computadora, un toque en el celular), **Then** la mecha queda en la venta con cantidad 1, la búsqueda queda vacía y lista para el producto siguiente, y el total es $3.000.
4. **Given** un producto con código de barras, **When** el Vendedor lo escanea (RF-08), **Then** el producto se agrega directo a la venta, igual que si lo hubiera buscado.
5. **Given** la mecha en la venta, **When** mira su renglón, **Then** ve el costo, el margen elegido y el precio de venta, antes de poner la cantidad: el cliente decide con el precio en la mano.
6. **Given** la mecha en la venta, **When** pone cantidad 3, **Then** el total pasa a $9.000; el total está siempre a la vista.
7. **Given** un renglón que se vende por unidad, **When** el Vendedor sube la cantidad, escribe un decimal o borra la cantidad y sale del campo, **Then** sube de a 1, la cantidad queda entera y el campo vacío vuelve a 1: nunca queda un cero ni un decimal (RF-12).
8. **Given** un renglón en la venta, **When** le cambia la unidad a «kg» y escribe 1,5, **Then** la cantidad admite un decimal y la unidad queda guardada en el producto para la próxima vez (RF-12).
9. **Given** una mecha que ya está en la venta, **When** el Vendedor la agrega otra vez, **Then** no se abre otro renglón: se suma 1 a la cantidad del que ya está.
10. **Given** una venta con un renglón de más, **When** el Vendedor lo quita, **Then** el renglón sale de la venta y el total se recalcula.
11. **Given** una venta de $11.000 con efectivo elegido, **When** cobra, **Then** ve «Venta registrada» con el importe y cómo pagó, y la venta queda vacía y lista para la siguiente.
12. **Given** una venta cobrada de 3 mechas, **When** se consulta lo guardado, **Then** existe una venta confirmada, con el usuario que la registró y la fecha y hora del dispositivo; el stock de la mecha bajó 3; y el renglón guardó su cantidad, su precio por unidad, su costo, su margen y la explicación del precio de ese momento (RNF-31).
13. **Given** un Vendedor en la computadora, **When** arma y cobra una venta de 3 productos, **Then** lo hace de punta a punta solo con el teclado: Enter agrega el producto, y con la venta armada el Enter final la cierra y deja todo listo para la siguiente.
14. **Given** una venta armada sin cliente elegido y con un medio de pago que no es cuenta corriente, **When** cobra, **Then** se registra: el cliente es opcional y nada es obligatorio que el cuaderno no tenga (fecha, producto, cantidad, precio).
15. **Given** un producto con stock 2, **When** el Vendedor pone cantidad 5, **Then** la venta no se impide: el renglón avisa que el stock queda negativo y se puede cobrar igual (el stock arranca en cero y se carga de a poco, RF-52).
16. **Given** una venta que llega al servidor sin renglones, con una cantidad que no es mayor que cero, con un precio negativo o con un renglón sin descripción, **When** se intenta registrar, **Then** el servidor la rechaza y dice qué está mal; el aviso aparece en el lugar y la venta queda armada para corregirla.
17. **Given** una venta ya guardada, **When** el dispositivo la reenvía con el mismo identificador (reintento o vuelta de la conexión), **Then** el servidor responde con la venta guardada y no la duplica.

---

### User Story 2 - Elegir el margen o poner el precio a mano en la venta (Priority: P1)

El Vendedor resuelve el precio sin salir de la venta (RF-20b): si el producto no tiene
margen lo elige en el renglón y queda guardado en el producto; si quiere cobrar otra cosa,
tipea un importe que vale solo para esa venta.

**Why this priority**: el cliente decide con el precio en la mano; frenar la venta para ir a
otro lado es más lento que la calculadora.

**Independent Test**: se agrega a la venta un producto sin margen, se elige «300 %» en su
renglón y se cobra; el producto queda con margen 300 y el renglón vendido también.

**Acceptance Scenarios**:

1. **Given** un tornillo con costo $10 y sin margen, **When** el Vendedor lo agrega a la venta, **Then** el renglón no tiene precio y pide elegir el margen o poner el precio, con los márgenes ya a la vista.
2. **Given** una venta con un renglón sin precio, **When** intenta cobrar, **Then** aparece el aviso «Hay productos sin precio» y no se registra nada; el aviso desaparece solo al resolver el precio.
3. **Given** el tornillo sin margen en la venta, **When** elige «300 %» en su renglón, **Then** el precio pasa a $1.000 (10 × 4 × 1,21 = 48,4, para arriba), el margen 300 queda guardado en el producto y el renglón vendido guarda margen 300.
4. **Given** un renglón con margen, **When** el Vendedor le cambia el margen, **Then** puede elegir con un toque entre 300, 200, 100, 50 y 25 % (RF-10), el vigente está marcado, y el precio y el total se recalculan en menos de 100 ms (RNF-07).
5. **Given** una mecha de $3.000 en la venta, **When** tipea un importe a mano en su renglón, **Then** ese importe vale solo para esta venta: el margen guardado en el producto no cambia y el renglón vendido queda sin margen aplicado.
6. **Given** un renglón de la venta, **When** el Vendedor pide la explicación del costo, del precio o del subtotal, **Then** ve de dónde sale, paso por paso, con los números de origen, hasta el importe del renglón (por ejemplo «× 3 unidades = $9.000,00») (RF-13).

---

### User Story 3 - Cada renglón de la venta es múltiplo de $1.000, salvo el precio a mano (Priority: P1)

No hay billetes chicos para dar vuelto: además del precio, cada renglón de la venta se
redondea para arriba a $1.000 (RF-19, capacidad 002). Acá se describe su efecto en la venta:
lo que se vende suelto se redondea; el precio puesto a mano se respeta tal cual y, si no es
múltiplo de $1.000, la venta lo avisa.

**Why this priority**: lo decidió el dueño el 2026-10-09 y lo ajustó el 2026-10-10; dar
vuelto con billetes chicos que no hay frena el mostrador, y por eso lo que no es múltiplo
de $1.000 tiene que verse antes de cobrar.

**Independent Test**: se venden 1,5 kg de un producto de $1.000 el kilo y el renglón se
cobra $2.000.

**Acceptance Scenarios**:

1. **Given** una venta con 3 mechas ($9.000) y un tornillo a $1.000 el kilo, **When** el Vendedor pone 1,5 kg de tornillo, **Then** ese renglón vale $2.000 (1,5 × 1000 = 1500, para arriba) y el total es $11.000 (RF-19).
2. **Given** un precio tipeado a mano que no es múltiplo de $1.000 ($1.500 o $2.500), **When** se suma a la venta, **Then** el renglón se cobra tal cual ($1.500 o $2.500), sin redondear, y muestra un aviso que dice que no es múltiplo de $1.000; el aviso no impide cobrar (RF-19).
3. **Given** una venta que llega al servidor con un renglón de 0,5 × $3.000, uno a mano de $1.500 y uno de 0,3 × $10.000, **When** se registra, **Then** el total guardado es $6.500 ($2.000 + $1.500 + $3.000): el servidor redondea los renglones calculados y respeta el del precio a mano, igual que el dispositivo, y la cantidad y el precio por unidad se guardan tal cual (RF-19).
4. **Given** un renglón cuyo importe ya es múltiplo de $1.000 (3 × $3.000; 0,3 m × $10.000), **When** se calcula, **Then** no sube: ni por redondear de más ni por un error de aritmética con decimales (RF-19).
5. **Given** un renglón de 0,5 kg a $3.000, **When** se pide la explicación del subtotal, **Then** dice «× 0,5 kg = $1.500,00» y «Redondeado para arriba a $2.000,00 (múltiplo de $1.000,00) para no dar vuelto» (RF-19).
6. **Given** un renglón con un precio a mano de $1.500 que muestra su aviso, **When** el Vendedor cambia el precio a $2.000 o la cantidad a 2, **Then** el importe pasa a ser múltiplo de $1.000 y el aviso desaparece solo (RNF-09).
7. **Given** un renglón de 2 unidades con un precio a mano de $1.750, **When** se calcula, **Then** vale $3.500 (precio × cantidad, sin redondear) y muestra el aviso.
8. **Given** una venta con un renglón que muestra el aviso, **When** el Vendedor cobra, **Then** la venta se registra por su total sin redondear y en las ventas del día figura con ese total.

---

### User Story 4 - Cobrar con cada medio de pago (Priority: P1)

El Vendedor elige cómo paga el cliente con un toque o una tecla: efectivo, Mercado Pago,
tarjeta o cuenta corriente (RF-21). La cuenta corriente es para los clientes importantes y
exige decir quién se lo lleva; reemplaza al cuaderno de deudas (RF-40, capacidad 004).

**Why this priority**: el cuaderno no anota el medio de pago; sin ese dato no se puede
cerrar la caja ni saber quién debe.

**Independent Test**: se cobra una venta con cada uno de los cuatro medios y cada una queda
guardada con el suyo; la de cuenta corriente, con su cliente.

**Acceptance Scenarios**:

1. **Given** una venta armada, **When** el Vendedor elige efectivo, Mercado Pago o tarjeta y cobra, **Then** la venta queda registrada con ese medio de pago y el mensaje de éxito lo nombra.
2. **Given** una venta armada en la computadora, **When** elige el medio de pago, **Then** puede hacerlo con una tecla para cada uno de los cuatro, sin tocar el mouse.
3. **Given** una venta con cuenta corriente elegida y sin cliente, **When** intenta cobrar, **Then** aparece el aviso «Cuenta corriente: elegí el cliente» y no se registra; el servidor también la rechaza si llega sin cliente.
4. **Given** una venta con cuenta corriente elegida, **When** el Vendedor elige el cliente, **Then** lo busca por nombre y ve de cada uno cuánto debe o que está al día.
5. **Given** una venta con cuenta corriente y un cliente elegido, **When** cobra, **Then** la venta se registra a nombre de ese cliente y sin pagar, y en las ventas del día figura su nombre al lado del medio de pago.
6. **Given** una venta que llega al servidor con un medio de pago que no es efectivo, Mercado Pago, tarjeta ni cuenta corriente, **When** se intenta registrar, **Then** el servidor la rechaza y dice cuáles son los medios de pago.
7. **Given** una venta armada sin medio de pago elegido, **When** el Vendedor cobra, **Then** la venta no se frena: elegir el medio de pago es un toque y saltearlo no impide registrar. [NEEDS CLARIFICATION: si el Vendedor cobra sin elegir cómo paga el cliente, ¿la venta se registra igual (y con qué medio: efectivo por omisión, o «sin especificar») o se le exige elegir uno antes de cobrar? El relevamiento y el pedido original dicen que no debe frenar; el contrato del servidor exige uno de los cuatro medios.]

---

### User Story 5 - Vender sin conexión (Priority: P1)

Si se corta internet o se cae el servidor, el Vendedor sigue vendiendo igual: la venta, el
cambio de margen y lo anotado como consulta quedan en el dispositivo y se mandan solos al
reconectar (alternativa de CU-01; el mecanismo es de RNF-10 y RNF-20).

**Why this priority**: el internet del local es intermitente y el mostrador no se puede
frenar.

**Independent Test**: con la venta abierta se corta la red, se cobra una venta y se vuelve a
conectar; la venta aparece en el servidor una sola vez.

**Acceptance Scenarios**:

1. **Given** la venta abierta con el catálogo ya guardado en el dispositivo y la red cortada, **When** el Vendedor busca un producto, lo agrega, pone cantidad 2, elige efectivo y cobra, **Then** todo responde igual que con conexión, el mensaje dice que la venta quedó guardada en el dispositivo y se envía sola, el indicador de conexión dice «1 por enviar» y en el servidor todavía no hay venta.
2. **Given** la red cortada y una venta por enviar, **When** agrega el producto de nuevo, le elige margen «50 %» y lo anota como «No llevó», **Then** el precio se recalcula en el momento y el indicador dice «3 por enviar».
3. **Given** tres cambios por enviar, **When** vuelve la red, **Then** se envían solos, el indicador pasa a «Sincronizado» y en el servidor hay un solo renglón vendido, el stock bajó 2, el producto quedó con margen 50 y hay una consulta: todo llegó en orden y una sola vez.
4. **Given** una venta por enviar, **When** se recarga la página o se cierra y se vuelve a abrir la app sin conexión, **Then** la venta sigue en el dispositivo y se envía al reconectar (RNF-20).
5. **Given** la red cortada, **When** quien puede verlas abre las ventas del día, **Then** ve las que el dispositivo tiene guardadas, incluidas las que están por enviar, marcadas como tales (RNF-20: las ventas quedan 7 días en el dispositivo).
6. **Given** la red cortada, **When** se anula o se corrige una venta, **Then** el cambio queda en el dispositivo y se envía solo al reconectar, como cualquier otro cambio del mostrador (constitución, principio IV).
7. **Given** un cambio enviado al reconectar que el servidor no acepta, **When** llega el rechazo, **Then** el Vendedor recibe el aviso con qué pasó y qué hacer, y el cambio no se pierde en silencio.

---

### User Story 6 - Vender algo que no está en ninguna lista y darlo de alta ahí mismo (Priority: P2)

El Vendedor vende un producto que la búsqueda no encuentra (stock viejo, compra ocasional)
como ítem libre: escribe qué es y le pone el precio. En el mismo paso puede guardarlo como
producto nuevo, para encontrarlo la próxima vez. Los ítems libres quedan listados para que
el Administrador los revise después (RF-22, CU-01).

**Why this priority**: la venta no se puede frenar porque un producto no esté en el
catálogo.

**Independent Test**: se escribe en la búsqueda algo que no existe, se lo agrega como ítem
libre, se tipea el precio y se cobra; después se lo encuentra en la lista de ítems libres.

**Acceptance Scenarios**:

1. **Given** una búsqueda sin resultados («bolsa de arena»), **When** el Vendedor la confirma (Enter en la computadora, un toque en el celular), **Then** se agrega un renglón de ítem libre con ese texto como descripción y sin precio, con el precio listo para tipear.
2. **Given** un ítem libre en la venta, **When** le tipea el precio 1500, **Then** el total es $1.500 y el renglón avisa que no es múltiplo de $1.000: el precio del ítem libre es un precio puesto a mano (RF-19).
3. **Given** una venta con un ítem libre, **When** se registra, **Then** queda guardado con su descripción y su precio, sin producto asociado, sumado al total, y no mueve el stock de ningún producto.
4. **Given** un ítem libre sin descripción, **When** la venta llega al servidor, **Then** el servidor la rechaza y dice que el renglón no tiene descripción.
5. **Given** una venta normal y una venta de un ítem libre, **When** se cuentan los pasos, **Then** vender lo que no está en ninguna lista no agrega más de 2 pasos.
6. **Given** un ítem libre en la venta, **When** el Vendedor elige guardarlo como producto nuevo, **Then** queda dado de alta en el catálogo en ese mismo paso, con la descripción tipeada y, si los carga, la familia y el costo, que son opcionales; la venta sigue sin frenarse. [NEEDS CLARIFICATION: cuando un ítem libre se guarda como producto nuevo, ¿qué precio tiene la próxima vez que se lo busca: el importe tipeado en esa venta, o queda sin precio hasta que se le cargue un costo y un margen?]
7. **Given** un ítem libre guardado como producto nuevo, **When** el Vendedor lo busca en la venta siguiente, **Then** lo encuentra en la búsqueda como cualquier otro producto.
8. **Given** ítems libres vendidos, **When** el Administrador abre la lista de ítems libres, **Then** ve cada uno con su descripción, su precio, la fecha y quién lo vendió, para decidir cuáles pasan al catálogo. [NEEDS CLARIFICATION: ¿qué puede hacer el Administrador con un ítem libre de esa lista, además de verlo: convertirlo en producto nuevo, asociarlo a un producto que ya existe, marcarlo como revisado?]

---

### User Story 7 - Ver las ventas del día y las de días anteriores (Priority: P2)

El Administrador abre las ventas del día y ve cada una con sus productos, uno por renglón,
como en el cuaderno, con el total del día y el total por medio de pago. Eligiendo una fecha ve
las de un día anterior (RF-23, CU-02).

**Why this priority**: el total del día tiene que coincidir con la caja; es el control que
el cuaderno da con una suma.

**Independent Test**: después de cobrar dos ventas con medios de pago distintos, se abren
las ventas del día y se comprueba cada venta, el total y el total por medio de pago.

**Acceptance Scenarios**:

1. **Given** una venta en efectivo de 3 mechas y 1,5 kg de tornillos cobrada en el día, **When** el Administrador abre las ventas del día, **Then** la venta aparece con su hora, «Efectivo» y su total, y cada producto va en su renglón con su cantidad, su precio por unidad y su subtotal.
2. **Given** ventas del día con distintos medios de pago, **When** las mira, **Then** ve el total del día, la cantidad de ventas y el total por cada medio de pago; las más nuevas van primero.
3. **Given** ventas confirmadas y anuladas en el día, **When** se piden las ventas del día, **Then** el total del día y el total por medio de pago cuentan solo las confirmadas, y las anuladas se siguen viendo, marcadas «anulada».
4. **Given** una venta cobrada a las 23:30 hora de Buenos Aires, **When** se piden las ventas de ese día, **Then** figura en ese día: el día es el del local, no el del servidor.
5. **Given** un día sin ventas, **When** abre las ventas del día, **Then** un texto dice que todavía no hay ventas.
6. **Given** ventas registradas en días anteriores, **When** el Administrador elige una fecha, **Then** ve las ventas de ese día con sus renglones, su total y su total por medio de pago.
7. **Given** una venta a cuenta corriente, **When** se la mira en las ventas del día, **Then** figura el nombre del cliente.


---

### User Story 8 - Anular una venta (Priority: P2)

El Administrador anula la venta que estuvo mal: queda marcada, no se borra, y el stock
vuelve a donde estaba (RF-23, CU-02).

**Why this priority**: el cuaderno permite tachar; el sistema también, con rastro.

**Independent Test**: después de cobrar una venta de dos productos, se la anula y el stock
de cada uno vuelve al valor anterior.

**Acceptance Scenarios**:

1. **Given** una venta confirmada en las ventas del día, **When** el Administrador la anula, **Then** la venta queda marcada «anulada» (no se borra), el stock de sus productos vuelve a donde estaba y deja de contar en los totales del día.
2. **Given** una venta anulada, **When** se la mira, **Then** dice «anulada» y no ofrece anularla ni corregirla.
3. **Given** una venta que no existe o que ya está anulada, **When** se pide anularla, **Then** el servidor responde «La venta no existe o ya está anulada» y no mueve stock.
4. **Given** una venta anulada, **When** el Administrador consulta quién hizo qué (RF-71), **Then** la anulación figura con el usuario que la hizo, la fecha y, si se cargó, el motivo.
5. **Given** una venta a cuenta corriente anulada, **When** se mira lo que debe el cliente, **Then** esa venta ya no cuenta en su deuda (RF-40).
6. **Given** una venta con un ítem libre, **When** se la anula, **Then** el ítem libre no mueve stock de ningún producto.

[NEEDS CLARIFICATION: al anular una venta, ¿se pide confirmación y se pide el motivo (obligatorio u opcional)? La constitución solo admite una ventana de confirmación para lo que no se puede recuperar, y una anulación no se puede deshacer.]

---

### User Story 9 - Corregir una venta ya registrada (Priority: P2)

Quien puede corregirla cambia la cantidad o el precio de una venta reciente que se cargó
mal, sin anularla y cargarla de nuevo. Queda el rastro de quién cambió qué y nada se pisa (RF-23,
RNF-30, CU-02).

**Why this priority**: equivocarse en una cantidad es lo más común en el mostrador, y
anular y volver a cargar es más lento que tachar en el cuaderno.

**Independent Test**: se cobra una venta de 3 mechas, se corrige la cantidad a 2 y se
comprueba el total de la venta, el total del día y el stock.

**Acceptance Scenarios**:

1. **Given** una venta confirmada de 3 mechas a $3.000, **When** se corrige la cantidad a 2, **Then** el total de la venta pasa a $6.000, el total del día baja $3.000 y el stock de la mecha sube 1.
2. **Given** una venta confirmada, **When** se corrige el precio de un renglón, **Then** el renglón y el total se recalculan con la regla de RF-19 (el precio corregido es un precio puesto a mano: se respeta y avisa si no es múltiplo de $1.000) y el stock no cambia.
3. **Given** una venta corregida, **When** el Administrador consulta quién hizo qué (RF-71), **Then** figura la corrección con el usuario, la fecha, y el valor anterior y el nuevo.
4. **Given** una venta corregida, **When** se consulta lo guardado, **Then** los valores anteriores siguen existiendo: la corrección agrega registros y no pisa los históricos (RNF-30).
5. **Given** una venta anulada, **When** se intenta corregirla, **Then** no se puede.
6. **Given** una venta a cuenta corriente sin pagar, **When** se corrige, **Then** lo que debe el cliente refleja el total nuevo (RF-40).

[NEEDS CLARIFICATION: ¿hasta cuándo se puede corregir o anular una venta: solo las del día, las de los últimos N días, o cualquiera? El pedido dice «una venta reciente» sin decir cuánto.]

[NEEDS CLARIFICATION: al corregir una venta, ¿solo se cambian la cantidad y el precio de sus renglones, o también se puede agregar o quitar un renglón, cambiar el medio de pago o cambiar el cliente?]

---

### User Story 10 - Anotar lo que pidieron y no llevaron, y consultarlo (Priority: P2)

Cuando el cliente pregunta el precio y no compra, el Vendedor lo anota con un toque: qué
pidió, a cuánto se le ofreció y, si quiere, el motivo (no había, precio). Lo anotado se
puede consultar después para decidir qué comprar y qué remarcar (RF-25, CU-03).

**Why this priority**: pasa muy seguido y es demanda que se pierde; anotarlo cuesta un
toque.

**Independent Test**: se agrega un producto a la venta y se toca «No llevó»; queda una
consulta guardada con el producto y el precio ofrecido, y aparece en la vista de consultas.

**Acceptance Scenarios**:

1. **Given** una venta con una mecha de $3.000, **When** el Vendedor toca «No llevó», **Then** la venta se vacía, aparece «Anotado como consulta» y queda guardada una consulta con ese producto, el precio ofrecido ($3.000) y la fecha.
2. **Given** una venta con varios renglones, **When** toca «No llevó», **Then** queda una consulta por cada renglón.
3. **Given** un Vendedor en la computadora con la venta armada, **When** el cliente no acepta, **Then** descarta la venta con una tecla, sin tocar el mouse, y no queda nada a medio cargar.
4. **Given** una venta que el cliente no lleva, **When** el Vendedor la anota como consulta, **Then** puede cargar el motivo sin que sea obligatorio: anotar sin motivo sigue costando un solo toque. [NEEDS CLARIFICATION: ¿los motivos son una lista cerrada (¿cuáles, además de «no había» y «precio»?) que se elige con un toque, o un texto libre?]
5. **Given** algo que el cliente pidió y no está en el catálogo, **When** el Vendedor lo agrega como ítem libre sin precio y toca «No llevó», **Then** queda anotado con su descripción y sin precio ofrecido.
6. **Given** un pedido de anotar una consulta sin ningún renglón, **When** llega al servidor, **Then** responde «No hay nada que registrar».
7. **Given** consultas anotadas, **When** se abre la vista de consultas, **Then** se ve cada una con la fecha, el producto o la descripción, el precio ofrecido y el motivo, las más nuevas primero. [NEEDS CLARIFICATION: ¿quién consulta lo anotado (Administrador, Comprador, los dos) y cómo lo necesita ver: una lista por fecha, o agrupado por producto con cuántas veces se pidió y por qué motivo?]

[NEEDS CLARIFICATION: cuando el cliente no lleva, ¿descartar la venta anota siempre la consulta, o tiene que haber dos acciones distintas: descartar sin anotar nada y «No llevó», que anota? El pedido original dice que guardar la consulta es opcional.]

---

### User Story 11 - Cambiar un producto por otro (Priority: P2)

Un cliente vuelve con algo que compró y se lleva otra cosa. El Vendedor registra el cambio:
lo devuelto vuelve al stock, lo nuevo sale y se cobra la diferencia (RF-24, CU-02). No hay
devoluciones de plata (RF-24b).

**Why this priority**: es la única forma de deshacer una venta frente al cliente en esta
etapa, y sin registrarla el stock queda mal.

**Independent Test**: se registra el cambio de una mecha de $3.000 por una de $5.000; el
stock de la primera sube 1, el de la segunda baja 1 y se cobran $2.000.

**Acceptance Scenarios**:

1. **Given** un cliente que devuelve una mecha vendida a $3.000 y se lleva otra de $5.000, **When** el Vendedor registra el cambio, **Then** el stock de la mecha devuelta sube 1, el de la nueva baja 1 y se cobra la diferencia, $2.000, con el medio de pago que elija (RF-21).
2. **Given** un cambio registrado, **When** se miran las ventas del día, **Then** el cambio figura con lo devuelto, lo que salió y la diferencia cobrada, y la diferencia cuenta en el total del día y en el de su medio de pago.
3. **Given** un cambio registrado, **When** el Administrador consulta quién hizo qué, **Then** figura con el usuario que lo hizo; la venta original no se borra ni se pisa (RNF-30).
4. **Given** un cambio en el que lo nuevo vale lo mismo que lo devuelto, **When** se registra, **Then** el stock se mueve igual y no se cobra nada.
5. **Given** un cambio en el que lo nuevo vale menos que lo devuelto, **When** el Vendedor lo registra, **Then** [NEEDS CLARIFICATION: si el producto nuevo vale menos que el devuelto, ¿qué pasa con la diferencia a favor del cliente, ya que en esta etapa no se devuelve plata: se pierde, queda como saldo a favor, o el cambio solo se admite por algo de igual o mayor valor?]

[NEEDS CLARIFICATION: para registrar un cambio, ¿hay que encontrar la venta original (y entonces lo devuelto se toma al precio que se pagó) o alcanza con decir qué producto vuelve (y se toma al precio del día)? ¿Hay un plazo para aceptar cambios?]

---

### User Story 12 - Tomar un pedido de algo que no hay en stock (Priority: P2)

El cliente quiere algo que no hay. El Vendedor le dice qué día va a estar y anota el pedido:
qué hay que conseguir, para quién (nombre y teléfono) y qué día se le prometió. No se toma
seña. El pedido aparece en la lista de lo que hay que comprar (RF-26, CU-03; la lista de
compra es de la capacidad 005).

**Why this priority**: el dueño quiere mejorar el procedimiento actual, que depende de la
memoria: se le dice al cliente un día y se lo espera.

**Independent Test**: se anota un pedido con producto, nombre, teléfono y día prometido, y
aparece en la lista de pedidos de clientes ordenado por ese día.

**Acceptance Scenarios**:

1. **Given** un cliente que pide un producto que no hay en stock, **When** el Vendedor anota el pedido con el producto, la cantidad, el nombre y el teléfono del cliente y el día prometido, **Then** el pedido queda guardado, con el usuario que lo tomó, y no se cobra ni se pide seña.
2. **Given** una venta armada que el cliente no puede llevar porque no hay, **When** el Vendedor la pasa a pedido, **Then** no tiene que volver a cargar los productos: solo agrega para quién y qué día.
3. **Given** pedidos de clientes anotados, **When** se abre la lista de pedidos, **Then** se ve de cada uno qué hay que conseguir, para quién y qué día se le prometió, con los de fecha más próxima primero.
4. **Given** un pedido anotado, **When** el Comprador decide qué comprar (CU-11), **Then** lo que hay que conseguir para ese pedido figura entre las cosas para comprar.
5. **Given** un pedido de algo que no está en el catálogo, **When** se lo anota, **Then** alcanza con la descripción tipeada, como un ítem libre.
6. **Given** un pedido cuyo día prometido ya pasó sin entregarse, **When** se mira la lista, **Then** el pedido se distingue como vencido.
7. **Given** la mercadería de un pedido ya en el local, **When** llega, **Then** [NEEDS CLARIFICATION: cuando llega la mercadería de un pedido, ¿qué tiene que hacer el sistema para mejorar el procedimiento: avisarle al Vendedor para que llame al cliente, armarle un mensaje de WhatsApp para mandar, o mandarlo solo?]

[NEEDS CLARIFICATION: ¿cómo se cierra un pedido: se marca entregado a mano, se cierra solo cuando se le vende ese producto al cliente, y se puede cancelar si el cliente no vuelve?]

---

### User Story 13 - Hacer un presupuesto y convertirlo en venta (Priority: P2)

Los clientes grandes piden precio antes de comprar. El Vendedor arma el presupuesto igual
que una venta, sin tocar el stock, se lo manda al cliente por WhatsApp o en PDF y, si el
cliente acepta, lo convierte en venta con un toque (RF-27, CU-10).

**Why this priority**: es cómo compran los clientes importantes, que son los que más
facturan.

**Independent Test**: se arma un presupuesto de dos productos, se comprueba que el stock no
cambió, se lo convierte en venta y se comprueba que la venta existe y el stock bajó.

**Acceptance Scenarios**:

1. **Given** un Vendedor que arma un presupuesto, **When** busca productos, elige márgenes, pone precios a mano y cantidades, **Then** todo funciona igual que en una venta (RF-20, RF-20b), con los mismos precios y el mismo redondeo (RF-19).
2. **Given** un presupuesto guardado de 10 mechas, **When** se mira el stock de la mecha, **Then** no cambió: un presupuesto no toca el stock ni cuenta en las ventas del día.
3. **Given** un presupuesto guardado, **When** el Vendedor lo manda, **Then** puede mandarlo por WhatsApp o generar un PDF, con el detalle de productos, cantidades, precios, total y hasta qué fecha vale.
4. **Given** un presupuesto que el cliente aceptó, **When** el Vendedor lo convierte en venta con un toque, **Then** queda una venta con los mismos renglones, lista para elegir el medio de pago y cobrar; al cobrarla descuenta el stock como cualquier venta.
5. **Given** un presupuesto convertido en venta, **When** se lo mira, **Then** figura como convertido, con la venta que salió de él, y no se puede convertir otra vez.
6. **Given** un presupuesto de 10 productos, **When** un Vendedor lo arma y lo envía, **Then** tarda menos de 3 minutos.
7. **Given** un presupuesto con su vencimiento cumplido, **When** se lo mira o se lo quiere convertir, **Then** figura como vencido. [NEEDS CLARIFICATION: ¿cuántos días vale un presupuesto por omisión, quién configura ese plazo, y qué pasa cuando venció: no se puede convertir, o se puede convertir con los precios del día?]
8. **Given** un presupuesto cuyos productos cambiaron de costo desde que se armó, **When** se lo convierte en venta dentro de su vigencia, **Then** [NEEDS CLARIFICATION: al convertir un presupuesto en venta, ¿se respetan los precios del presupuesto o se recalculan con los precios del día?]

[NEEDS CLARIFICATION: ¿un presupuesto tiene que llevar el cliente (y solo los clientes importantes de la capacidad 004) o se puede armar sin cliente, como una venta?]

---

### User Story 14 - Mandar el comprobante de la venta por WhatsApp (Priority: P2)

Al cliente que pide un comprobante, el Vendedor le manda el detalle de la venta por WhatsApp
o le genera un PDF, sin impresora. Es un comprobante no fiscal, con los datos del negocio
(RF-28).

**Why this priority**: hay clientes que lo piden y el local no tiene impresora.

**Independent Test**: se cobra una venta y, en un paso más, se genera el comprobante con
los datos del negocio y el detalle de la venta.

**Acceptance Scenarios**:

1. **Given** una venta recién cobrada, **When** el Vendedor elige mandar el comprobante, **Then** puede mandarlo por WhatsApp o generar un PDF, y eso no agrega más de un paso a la venta.
2. **Given** una venta cobrada, **When** el Vendedor no manda comprobante, **Then** la venta se cierra igual: el comprobante es opcional y nunca frena.
3. **Given** un comprobante, **When** se lo lee, **Then** trae los datos del negocio, la fecha, cada producto con su cantidad y su precio, el total y el medio de pago; no trae el costo ni el margen.
4. **Given** los datos del negocio configurados por el Administrador, **When** se genera un comprobante, **Then** usa esos datos. [NEEDS CLARIFICATION: ¿qué datos del negocio lleva el comprobante (nombre, dirección, teléfono, CUIT, logo) y tiene que decir que no es una factura?]
5. **Given** una venta de un día anterior, **When** el cliente pide el comprobante, **Then** se puede generar desde la venta ya registrada.

[NEEDS CLARIFICATION: para mandar el comprobante por WhatsApp, ¿el Vendedor tipea el teléfono del cliente en cada venta, lo elige de sus contactos de WhatsApp, o solo se usa el teléfono guardado de los clientes importantes?]

---

### User Story 15 - Cargar las últimas dos semanas del cuaderno (Priority: P2)

El Administrador carga como ventas históricas las últimas dos semanas del cuaderno,
transcriptas a una planilla simple, cada una con su fecha. El sistema compara el precio del
cuaderno con el que él calcula y lista las diferencias grandes, para ajustar los márgenes
antes de usarlo en el mostrador (RF-29).

**Why this priority**: valida precios, márgenes y la búsqueda con casos reales antes de la
prueba en el mostrador.

**Independent Test**: se carga una planilla de cinco renglones con fechas pasadas y se
comprueba que las ventas figuran en esos días y que el informe lista el renglón cuyo precio
difiere.

**Acceptance Scenarios**:

1. **Given** una planilla con los renglones del cuaderno (fecha, producto, cantidad, precio), **When** el Administrador la carga, **Then** antes de guardar ve qué se va a cargar y qué renglones no se pudieron leer, y nada se guarda hasta que confirma.
2. **Given** la carga confirmada, **When** se eligen esas fechas en las ventas de días anteriores, **Then** las ventas figuran en su fecha, con sus renglones, distinguidas como cargadas del cuaderno.
3. **Given** un renglón del cuaderno cuyo producto se reconoce en el catálogo, **When** se carga, **Then** el informe compara el precio del cuaderno con el precio que calcula el sistema para ese producto.
4. **Given** renglones con una diferencia grande entre los dos precios, **When** el Administrador abre el informe, **Then** los ve listados con los dos precios y la diferencia, para revisar el margen de cada uno. [NEEDS CLARIFICATION: ¿qué diferencia entre el precio del cuaderno y el calculado cuenta como «grande» para aparecer en el informe: un porcentaje, un importe, o se listan todas ordenadas de mayor a menor?]
5. **Given** un renglón del cuaderno cuyo producto no se reconoce en el catálogo, **When** se carga, **Then** queda como ítem libre con el texto del cuaderno y figura en el informe como no reconocido.
6. **Given** la misma planilla cargada dos veces, **When** se confirma la segunda, **Then** las ventas no se duplican.

[NEEDS CLARIFICATION: las ventas cargadas del cuaderno, ¿descuentan stock (el stock arranca en cero y quedaría negativo) y cuentan en los totales y en la información del negocio, o son solo para comparar precios?]

[NEEDS CLARIFICATION: el cuaderno no anota el medio de pago y sus precios no son múltiplos de $1.000: ¿las ventas históricas se guardan con el precio del cuaderno tal cual, y con qué medio de pago?]

---

### User Story 16 - Devolver un producto con reintegro o saldo a favor (Priority: P3)

Un cliente devuelve lo que compró y elige entre que le devuelvan la plata o que le quede un
saldo a favor (RF-24b). Es de una etapa posterior: llega con la venta online (RF-31); hasta
entonces solo hay cambios por otro producto (RF-24).

**Why this priority**: el dueño decidió el 2026-10-08 que en esta versión no hay
devoluciones.

**Independent Test**: se registra la devolución de un producto vendido, se elige saldo a
favor y se comprueba el stock y el saldo del cliente.

**Acceptance Scenarios**:

1. **Given** una venta registrada y un cliente que devuelve uno de sus productos, **When** se registra la devolución, **Then** el producto vuelve al stock y la venta original no se borra ni se pisa (RNF-30).
2. **Given** una devolución, **When** el cliente elige reintegro, **Then** se registra la plata devuelta, con su medio de pago, y cuenta en la caja del día.
3. **Given** una devolución, **When** el cliente elige saldo a favor, **Then** queda un saldo a su nombre que se descuenta en una compra posterior.
4. **Given** una devolución pedida fuera de plazo, **When** se la quiere registrar, **Then** no se admite. [NEEDS CLARIFICATION: ¿cuál es el plazo para aceptar una devolución? La decisión del 2026-10-08 lo dejó para cuando se haga la venta online.]

---

### User Story 17 - Emitir la factura electrónica de ARCA (Priority: P3)

El Vendedor emite la factura electrónica de ARCA de una venta desde el sistema, en lugar de
llenar el talonario en papel. La ferretería factura como responsable inscripto (RF-30). Es
de una etapa posterior.

**Why this priority**: el dueño lo dejó fuera de esta etapa; el talonario en papel sigue
sirviendo.

**Independent Test**: de una venta registrada se emite la factura y queda guardado su
número y su autorización junto a la venta.

**Acceptance Scenarios**:

1. **Given** una venta registrada, **When** el Vendedor pide la factura, **Then** el sistema la emite ante ARCA y guarda junto a la venta el tipo, el número y la autorización que ARCA devuelve.
2. **Given** una venta facturada, **When** se la mira, **Then** figura como facturada y la factura se puede mandar o descargar.
3. **Given** el dispositivo sin conexión o ARCA sin responder, **When** se cobra una venta, **Then** la venta se registra igual: la factura nunca frena el mostrador (constitución, principio IV).
4. **Given** una venta facturada, **When** se la quiere anular o corregir, **Then** el sistema no deja la factura sin su contrapartida fiscal.

[NEEDS CLARIFICATION: para la factura electrónica, ¿se factura cada venta o solo cuando el cliente la pide? ¿Qué tipos de comprobante se emiten (A, B, nota de crédito) y con qué CUIT y punto de venta?]

---

### User Story 18 - Vender por internet (Priority: P3)

El Cliente (un actor sin usuario en el sistema) compra por internet los productos de la
ferretería y puede devolverlos (RF-24b). El pedido entra como una venta más, con su stock y
su rastro. Es de una etapa posterior y un negocio aparte (proyecto Tienda online); la
arquitectura deja la puerta abierta (ADR-003).

**Why this priority**: el dueño lo dejó fuera de esta etapa.

**Independent Test**: se registra una compra online de un producto y se comprueba que
figura entre las ventas, distinguida como online, y que el stock bajó.

**Acceptance Scenarios**:

1. **Given** un producto de la ferretería publicado para la venta online, **When** el Cliente lo compra, **Then** queda registrada una venta con sus renglones, que descuenta el stock y se distingue de las del mostrador.
2. **Given** una venta online, **When** el Vendedor mira las ventas del día, **Then** la ve y sabe que tiene que prepararla.
3. **Given** una venta online entregada, **When** el Cliente devuelve el producto dentro del plazo, **Then** elige reintegro o saldo a favor (RF-24b).
4. **Given** la venta online sin servicio, **When** el Vendedor vende en el mostrador, **Then** el mostrador funciona igual: una cosa no depende de la otra.

[NEEDS CLARIFICATION: para la venta online, ¿qué productos se publican (todos, o los que elija el Administrador), a qué precio (el del mostrador, con su redondeo a $1.000, u otro) y cómo paga y recibe el Cliente (medios de pago, retiro en el local, envío)?]

---

### User Story 19 - Ofrecer el sistema a otras ferreterías (Priority: P3)

El Administrador de otra ferretería usa el mismo sistema con una licencia de uso. Cada
ferretería tiene su propia instalación, con su base de datos y su motor independientes: los
datos de dos negocios nunca comparten base (RF-32). Es de una etapa posterior (proyecto
Consultoría).

**Why this priority**: el dueño lo dejó fuera de esta etapa; primero el sistema tiene que
mostrar resultados en la ferretería propia.

**Independent Test**: se levantan dos instalaciones, se carga una venta en una y se
comprueba que en la otra no existe ningún dato de la primera.

**Acceptance Scenarios**:

1. **Given** dos ferreterías con licencia, **When** cada una usa el sistema, **Then** cada una tiene su instalación y su base de datos propias, y ningún usuario, producto, precio ni venta de una es visible desde la otra.
2. **Given** una ferretería nueva, **When** se le instala el sistema, **Then** arranca vacía: carga sus propios usuarios, sus proveedores, sus listas y sus márgenes, y nada de la ferretería original viene incluido.
3. **Given** una ferretería con licencia, **When** se actualiza el sistema, **Then** su instalación se actualiza sin tocar sus datos ni los de otra.

[NEEDS CLARIFICATION: ¿qué controla la licencia de uso en la instalación de otra ferretería: tiene vencimiento, qué pasa cuando vence (¿se bloquea el sistema, se puede seguir vendiendo?), y quién la renueva?]

---

### Edge Cases

- **Precio a mano que no es múltiplo de $1.000:** se respeta tal cual ($1.500 tipeado se cobra $1.500) y el renglón muestra un aviso que lo dice; el aviso no impide cobrar (decisión 16 del 2026-10-10).
- **Mismo producto agregado dos veces:** no se abre otro renglón; se suma 1 a la cantidad del que ya está.
- **Vender más de lo que hay:** no se impide. El renglón avisa que el stock queda negativo.
- **El servidor no acepta la venta** (un dato inválido): el aviso aparece en el lugar, en castellano, dice qué hacer, y la venta queda armada para corregirla.
- **Ítem libre sin descripción:** el servidor rechaza la venta.
- **Venta anulada a cuenta corriente:** deja de contar en lo que debe el cliente (la deuda suma solo ventas confirmadas; RF-40).
- **Catálogo todavía no guardado en el dispositivo y sin conexión:** no se puede buscar; la venta lo dice y pide conectarse una vez para bajarlo.
- **Venta reenviada:** una venta que el dispositivo manda dos veces (reintento, vuelta de la conexión) se guarda una sola vez.
- **Venta cerca de la medianoche:** cuenta en el día del local (hora de Buenos Aires), aunque el servidor esté en otra zona horaria.
- **Producto escaneado cuyo código no está en el catálogo:** lo resuelve RF-08 (capacidad 002); la venta no se frena.

## Requirements *(mandatory)*

### Functional Requirements

- **RF-20**: El sistema DEBE permitir registrar una venta en el orden del mostrador: buscar (escribiendo o escaneando), ver costo, margen y precio, poner la cantidad (1 por omisión) y cobrar. El total está siempre a la vista. La venta guarda sus renglones, descuenta el stock de cada producto, lleva la fecha y hora del dispositivo y queda con el usuario que la registró. Cada renglón guarda el costo, el margen, el precio y la explicación de ese momento (RNF-31). Nada es obligatorio que el cuaderno no tenga: fecha, producto, cantidad y precio; el cliente es opcional. La venta nunca se impide por stock insuficiente. En la computadora se hace entera con el teclado; una venta de 3 productos lleva menos de 20 segundos (RNF-02). Un identificador generado en el dispositivo evita que una venta reenviada se duplique.
- **RF-20b**: En la venta, el margen de un producto DEBE poder elegirse o cambiarse ahí mismo, con un toque entre 300, 200, 100, 50 y 25 % (RF-10), y queda guardado en el producto. El precio de un renglón DEBE poder ponerse a mano, como un importe, y vale solo para esa venta: no cambia el margen guardado, no se redondea y, si el importe del renglón no es múltiplo de $1.000, la venta lo avisa sin impedir cobrar (RF-19). Una venta con un renglón sin precio no se puede cobrar.
- **RF-21**: Los medios de pago son cuatro: efectivo, Mercado Pago, tarjeta y cuenta corriente. Se eligen con un toque o una tecla. La cuenta corriente exige elegir el cliente, por nombre, y la venta queda a su nombre y sin pagar (RF-40). El sistema registra con qué se pagó; no cobra ni se conecta con Mercado Pago ni con la tarjeta. [NEEDS CLARIFICATION: si el Vendedor cobra sin elegir cómo paga el cliente, ¿la venta se registra igual (y con qué medio: efectivo por omisión, o «sin especificar») o se le exige elegir uno antes de cobrar?]
- **RF-22**: El sistema DEBE permitir vender un producto que no está en ninguna lista como ítem libre, con descripción y precio tipeados, sin agregar más de 2 pasos a una venta normal; el ítem libre no mueve stock. En el mismo paso DEBE poder guardarse como producto nuevo, con familia y costo opcionales. Los ítems libres vendidos quedan listados para que el Administrador los revise después. [NEEDS CLARIFICATION: precio del producto nuevo en la venta siguiente, y qué puede hacer el Administrador con la lista de ítems libres; ver historia 6, escenarios 6 y 8.]
- **RF-23**: El sistema DEBE mostrar las ventas del día, con el total del día, la cantidad de ventas y el total por medio de pago, y las de un día anterior eligiendo la fecha; cada venta muestra sus productos, uno por renglón. El día es el del local (hora de Buenos Aires). Una venta se DEBE poder anular: queda marcada, no se borra, su stock vuelve y deja de contar en los totales. Una venta reciente se DEBE poder corregir en cantidad o precio: ajusta el stock y el total del día, no pisa lo anterior (RNF-30) y queda en quién hizo qué (RF-71) con el usuario y qué cambió. [NEEDS CLARIFICATION: si anular pide confirmación y motivo; hasta cuándo una venta es «reciente»; y qué más se puede corregir además de cantidad y precio; ver historias 7, 8 y 9.]
- **RF-24**: El sistema DEBE permitir registrar el cambio de un producto por otro: lo devuelto vuelve al stock, lo nuevo sale y se cobra la diferencia. No hay devolución de plata. [NEEDS CLARIFICATION: qué pasa si lo nuevo vale menos; si hay que encontrar la venta original, a qué precio se toma lo devuelto y si hay plazo; ver historia 11.]
- **RF-24b**: El sistema DEBE permitir registrar una devolución con reintegro de plata o saldo a favor, a elección del cliente. Es de una etapa posterior: llega con la venta online (RF-31). [NEEDS CLARIFICATION: ¿cuál es el plazo para aceptar una devolución?]
- **RF-25**: El sistema DEBE permitir anotar con un toque lo que un cliente pidió y no se vendió: producto o descripción, precio ofrecido y, de forma opcional, el motivo (no había, precio). Lo anotado DEBE poder consultarse después. [NEEDS CLARIFICATION: si los motivos son una lista cerrada o texto libre; quién consulta lo anotado y cómo; y si descartar una venta anota siempre la consulta; ver historia 10.]
- **RF-26**: El sistema DEBE llevar los pedidos de clientes de lo que no hay en stock: qué hay que conseguir, para quién (nombre y teléfono) y qué día se le prometió. No se toma seña. Los pedidos aparecen en la lista de lo que hay que comprar (RF-54, RF-55). El sistema DEBE mejorar el procedimiento de decirle al cliente un día y esperarlo, por ejemplo avisándole cuando llega la mercadería. [NEEDS CLARIFICATION: cómo se avisa cuando llega la mercadería y cómo se cierra o se cancela un pedido; ver historia 12.]
- **RF-27**: El sistema DEBE permitir armar un presupuesto igual que una venta, sin tocar el stock; mandarlo por WhatsApp o en PDF; y convertirlo en venta con un toque. El presupuesto tiene un vencimiento configurable. Un presupuesto de 10 productos se arma y se envía en menos de 3 minutos. [NEEDS CLARIFICATION: plazo de vencimiento por omisión y qué pasa al vencer; si al convertirlo valen los precios del presupuesto o los del día; y si lleva cliente obligatorio; ver historia 13.]
- **RF-28**: Al cerrar una venta, el sistema DEBE ofrecer mandar el comprobante, con el detalle de la venta y los datos del negocio, por WhatsApp o como PDF, sin agregar más de un paso. Es un comprobante no fiscal. Los datos del negocio son configurables. [NEEDS CLARIFICATION: qué datos del negocio lleva y cómo se elige a qué teléfono se manda; ver historia 14.]
- **RF-29**: El sistema DEBE permitir cargar como ventas históricas, cada una con su fecha, las últimas dos semanas del cuaderno transcriptas a una planilla, y DEBE listar las diferencias grandes entre el precio del cuaderno y el precio que calcula el sistema, para revisarlas con el dueño y ajustar los márgenes. [NEEDS CLARIFICATION: qué diferencia es «grande»; si esas ventas mueven stock y cuentan en los totales; y con qué precio y medio de pago se guardan; ver historia 15.]
- **RF-30**: El sistema DEBE emitir la factura electrónica de ARCA de una venta, en lugar del talonario en papel; la ferretería factura como responsable inscripto. La factura nunca frena el mostrador. Es de una etapa posterior. [NEEDS CLARIFICATION: si se factura cada venta o a pedido, qué tipos de comprobante y con qué CUIT y punto de venta; ver historia 17.]
- **RF-31**: El sistema DEBE permitir la venta online de los productos de la ferretería, con devoluciones (RF-24b); la venta online entra como una venta más y no condiciona el mostrador. Es de una etapa posterior y un negocio aparte (proyecto Tienda online); ADR-003 deja la puerta abierta. [NEEDS CLARIFICATION: qué productos se publican, a qué precio y cómo paga y recibe el Cliente; ver historia 18.]
- **RF-32**: El sistema DEBE poder ofrecerse a otras ferreterías con licencia de uso. Cada ferretería tiene su propia instalación, con su base de datos y su motor independientes: los datos de dos negocios nunca comparten base. Es de una etapa posterior (proyecto Consultoría). [NEEDS CLARIFICATION: qué controla la licencia y qué pasa cuando vence; ver historia 19.]

### Key Entities *(include if feature involves data)*

- **Venta**: un ticket; agrupa los renglones que lleva un mismo cliente. Tiene fecha, medio de pago, total, estado (confirmada o anulada), el usuario que la registró y, si es a cuenta corriente, el cliente.
- **Renglón de venta**: un renglón del cuaderno. Guarda descripción, cantidad, precio por unidad, y el costo, el margen y la explicación del precio de ese momento. Sin producto asociado es un ítem libre.
- **Consulta**: lo que preguntaron y no llevaron: producto o descripción, precio ofrecido, fecha y, si se carga, el motivo.
- **Cambio**: lo que el cliente devolvió, lo que se llevó y la diferencia cobrada.
- **Devolución**: lo que el cliente devolvió y cómo se le compensó: reintegro o saldo a favor.
- **Pedido de cliente**: lo que hay que conseguir, para quién (nombre y teléfono) y el día prometido.
- **Presupuesto**: renglones como los de una venta, sin efecto en el stock, con vencimiento y, si se convirtió, la venta que salió de él.
- **Comprobante**: el detalle no fiscal de una venta con los datos del negocio, para mandar o descargar.
- **Factura electrónica**: el comprobante fiscal de una venta, con el tipo, el número y la autorización de ARCA.
- **Cliente**: solo los importantes; se necesita para vender a cuenta corriente (pertenece a la capacidad 004).
- **Movimiento de stock**: cada venta descuenta y cada anulación devuelve (pertenece a la capacidad 005).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una venta de 3 productos se registra en menos de 20 segundos, solo con teclado, y no es más lenta que el cuaderno cronometrada con el Vendedor (RNF-02).
- **SC-002**: El total de toda venta registrada en el mostrador es múltiplo de $1.000, salvo las que llevan un precio puesto a mano que no lo es; esas se cobraron después de mostrar el aviso (RF-19).
- **SC-003**: Vender algo que no está en ninguna lista no agrega más de 2 pasos respecto de una venta normal.
- **SC-004**: Una venta registrada sin conexión llega al servidor al reconectar, una sola vez, sin que el Vendedor haga nada.
- **SC-005**: Después de anular una venta, el stock de cada producto vuelve al valor que tenía antes de venderla.
- **SC-006**: El total del día coincide con el conteo de caja, y el total de un día pasado coincide con lo anotado en el cuaderno, mientras los dos se llevan en paralelo.
- **SC-007**: Un presupuesto de 10 productos se arma y se envía en menos de 3 minutos.
- **SC-008**: Mandar el comprobante no agrega más de un paso a la venta.
- **SC-009**: Anotar lo que un cliente pidió y no llevó cuesta un solo toque.
- **SC-010**: Un Vendedor nuevo registra su primera venta el primer día, sin manual (RNF-01).

## Clarifications

### Session 2026-10-08

- Q: ¿Hay devoluciones? → A: En esta versión no. Sí hay cambios por otro producto (RF-24). Las devoluciones llegan con la venta online: reintegro o saldo a favor, según elija el cliente; el plazo se define entonces (RF-24b).
- Q: ¿Se toma seña por un pedido de algo que no hay en stock? → A: No. Se le dice al cliente qué día va a estar y se lo espera. Es el procedimiento actual y se quiere mejorar (RF-26).
- Q: ¿Cómo se redondea? → A: Siempre para arriba a múltiplos de $1.000, para no lidiar con vueltos (RF-19).

### Session 2026-10-09

- Q: ¿Alcanza con redondear el precio? → A: No. No hay billetes chicos: toda venta tiene que ser múltiplo de $1.000. Además del precio, se redondea para arriba cada renglón de la venta: lo que se vende suelto y el precio puesto a mano (RF-19).
- Q: ¿Un precio puesto a mano que no es múltiplo de $1.000 se respeta tal cual? → A: Ese día quedó sin decidir; se respondió el 2026-10-10.
- Q: ¿Cómo se dan los permisos? → A: Por rol: Administrador, Vendedor y Comprador, combinables. Vender es del Vendedor. Quién puede elegir márgenes, ver costos, ver las ventas del día y anular ventas quedó sin decidir (RF-72).
- Q: ¿Una interfaz o dos? → A: Dos, computadora y celular, con la misma paleta y la misma marca; toda funcionalidad con pantalla va en las dos (RNF-04, RNF-05, ADR-014).
- Q: ¿Cómo se ofrece el sistema a otras ferreterías? → A: Cada una con su instalación y su base de datos propias (RF-32).
- Q: ¿Qué queda para una etapa posterior? → A: La factura electrónica de ARCA (RF-30), las devoluciones con reintegro o saldo a favor (RF-24b), la venta online (RF-31), que es un negocio aparte del proyecto Tienda online, y licenciar el sistema a otras ferreterías (RF-32).

### Session 2026-10-10

- Q: ¿Un precio puesto a mano que no es múltiplo de $1.000 se respeta tal cual? → A: Sí. Se respeta tal cual y aparece un aviso que dice que no es múltiplo de $1.000 (decisión 16; RF-19, RF-20b). Se interpretó así: el renglón con precio a mano no se redondea (vale precio × cantidad), el aviso se muestra cuando el importe del renglón no es múltiplo de $1.000, no impide cobrar, y vale también para el precio del ítem libre y para un precio corregido.
- Q: ¿Quién ve las ventas del día, anula una venta, ve los costos y elige márgenes? → A: En esta primera versión todos los usuarios son Administrador y el Administrador puede hacer todo; qué podrá cada rol se define más adelante (decisión 18; RF-72).

## Assumptions

- Buscar productos, calcular el precio (costo + margen + IVA), las unidades y el redondeo a $1.000 son de la capacidad 002 (RF-07, RF-10, RF-12, RF-19); acá solo se describe su efecto en la venta.
- Leer el código de barras con la cámara del celular, también para la venta de la computadora, es de RF-08; acá solo se dice que lo escaneado se agrega a la venta. El único lector de códigos es la cámara del celular (RNF-41).
- Guardar en el dispositivo y enviar al reconectar es de RNF-10 y RNF-20; acá solo se describe cómo se comporta la venta.
- Marcar pagada una venta a cuenta corriente, los saldos y los pagos parciales pertenecen a la capacidad 004 (RF-40, RF-41).
- La lista de lo que hay que comprar y el pedido al proveedor pertenecen a la capacidad 005 (RF-54, RF-55); los pedidos de clientes (RF-26) la alimentan.
- Los permisos por rol son de RF-72 (capacidad 007): en esta primera versión todos los usuarios son Administrador y pueden hacer todo. Las historias nombran al Vendedor o al Administrador para decir quién hace ese trabajo en el local, no para restringirlo.
- El sistema registra el medio de pago; no procesa el cobro con Mercado Pago ni con tarjeta.
- En la carga del cuaderno (RF-29), transcribir a la planilla se hace fuera del sistema; se supone que la carga y el informe los maneja el Administrador, porque el informe se revisa con el dueño.
- Los textos entre comillas angulares («No llevó», «Venta registrada», «anulada», «Hay productos sin precio») son las palabras del mostrador y valen en las dos interfaces.
