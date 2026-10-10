# Feature Specification: Catálogo y precios

**Feature Branch**: `002-catalogo-y-precios`

**Created**: 2026-10-10

**Status**: Baseline

**Input**: Especificación completa de la capacidad

## Clarifications

Decisiones de Carlos que tocan esta capacidad.

### Session 2026-09-13

- Q: ¿Sobre qué costo se calcula el precio? → A: Sobre lo que realmente se paga: se aprovechan todos los descuentos y se paga al contado. El costo es el precio de lista menos el descuento general, menos el descuento por contado, menos las ofertas vigentes, sin IVA; el IVA se guarda aparte (RF-11).
- Q: ¿Cómo se decide el margen? → A: Producto por producto, según su precio: un clavo lleva 300 %, un pincel 100 %, un taladro 25 %. No se automatiza: se hace visible y rápido, con cinco opciones (300 / 200 / 100 / 50 / 25 %). Más adelante se ayuda con un cálculo de costo real (RF-10, RF-16).
- Q: ¿Qué se tiene que poder saber de un número calculado? → A: De dónde viene. Vale para costos, precios, totales, stock y valorización (RF-13).
- Q: ¿El mismo artículo en dos o tres listas es un producto o varios? → A: Uno solo. Comprar es elegir, entre los proveedores que lo tienen, el más barato (RF-06).

### Session 2026-09-14

- Q: ¿Cómo se redondea el precio de venta? → A: Para arriba, a múltiplos de $1.000 (RF-19). Se volvió a confirmar el 2026-10-08.
- Q: En el catálogo, ¿«a mano» es un precio o un margen? → A: Un porcentaje de margen. El precio de venta siempre sale del costo y del margen. En la venta, en cambio, «a mano» es un precio y vale solo para esa venta (RF-10, RF-20b).
- Q: ¿Cómo se cargan las cantidades? → A: Enteras para lo que se vende por unidad; con un decimal para lo que se vende por kilo, metro o litro. La unidad queda guardada en el producto (RF-12).
- Q: ¿Se puede deshacer una unión de productos? → A: Sí: dos productos unidos se pueden volver a separar (RF-06).
- Q: Desde un producto, ¿se puede llegar a la planilla de la que salió su costo? → A: Sí, se baja el Excel original (RF-01b).

### Session 2026-10-08

- Q: ¿Se necesita encontrar un producto sin código de barras sacándole una foto? → A: En la primera versión alcanza con escanear el código de barras y fotografiar facturas; buscar por foto va en la segunda (RF-09b).
- Q: ¿Cómo se redondea el precio de venta? → A: Siempre para arriba a múltiplos de $1.000, para no lidiar con vueltos (RF-19).
- Q: ¿Qué tamaño puede tener el catálogo? → A: Entre todos los proveedores puede superar los 100.000 artículos. Se empieza con pocos proveedores y se agregan de a poco (RF-05, RNF-08).

### Session 2026-10-09

- Q: ¿Alcanza con redondear el precio? → A: No. No hay billetes chicos: toda venta tiene que ser múltiplo de $1.000, así que además del precio se redondea para arriba cada renglón de la venta (RF-19).
- Q: ¿Con qué nombres se dan los permisos? → A: Por rol: Administrador, Vendedor y Comprador, combinables. Los actores (Dueño, Empleado, Cliente, Proveedor) se usan solo donde el rol no alcanza (RF-72).
- Q: ¿Con qué se leen los códigos de barras? → A: Solo con la cámara del celular; no hay otro lector en el local. Para usarlo en la computadora, el celular se vincula leyendo un QR. Lo pidió Carlos el 2026-09-13 (RF-08, RNF-41).

### Session 2026-10-10

- Q: Un precio puesto a mano en una venta que no es múltiplo de $1.000, ¿se redondea? → A: No. Se respeta tal cual y la venta muestra un aviso que dice que no es múltiplo de $1.000. Lo calculado y lo que se vende suelto se sigue redondeando para arriba (decisión 16; RF-19).
- Q: ¿Qué rol carga listas, elige márgenes, une duplicados y ve costos? → A: En esta primera versión todos los usuarios son Administrador y el Administrador puede hacer todo. Qué podrá cada rol se define más adelante (decisión 18; RF-72).

## User Scenarios & Testing *(mandatory)*

Toda historia con interfaz vale para las dos, computadora y celular (ADR-014), y cada
escenario se comprueba en cada una. En esta primera versión todos los usuarios son
Administrador y pueden hacer todo (decisión 18 del 2026-10-10; RF-72): donde una historia
nombra al Vendedor o al Comprador, dice quién hace ese trabajo en el local.

### User Story 1 - Buscar un producto sin saber el proveedor (Priority: P1)

El Vendedor escribe unas palabras, el código del proveedor o el código de barras y encuentra
el producto al instante, sin saber quién lo vende y aunque no tenga internet.

**Why this priority**: es el primer paso del mostrador (buscar, precio, cantidad, cobro); sin
búsqueda no hay venta ni carga de márgenes.

**Independent Test**: con un catálogo cargado en el dispositivo, abrir la búsqueda de
productos, escribir y ver el resultado, con conexión y sin ella.

**Acceptance Scenarios**:

1. **Given** el catálogo ya bajado al dispositivo, **When** el Vendedor abre la búsqueda de productos, **Then** puede escribir de inmediato, sin tocar ni elegir nada antes.
2. **Given** una «MECHA PARA MADERA DE 6 MM» en el catálogo, **When** escribe `madera mecha 6` (las palabras en cualquier orden, sin mayúsculas ni acentos), **Then** la mecha aparece mientras escribe, sin apretar ninguna tecla para buscar.
3. **Given** un producto con código de proveedor `ME6` y código de barras, **When** escribe el código del proveedor o el de barras, **Then** lo encuentra, y la coincidencia exacta de código va primera.
4. **Given** el catálogo, **When** escribe palabras empezadas (`mad mec`), **Then** encuentra los productos cuyas palabras empiezan así; un número suelto no coincide con el interior de un código.
5. **Given** la mecha del escenario 2, **When** escribe `mecha madrea` (un error de tipeo), **Then** la encuentra igual.
6. **Given** un mismo artículo que venden dos proveedores, ya unido, **When** lo busca, **Then** aparece un solo resultado.
7. **Given** un resultado, **When** lo mira, **Then** ve descripción, marca, proveedor del que sale el costo, precio de venta (o «sin precio» si no tiene margen elegido) y el precio por bulto cuando el proveedor lo informa.
8. **Given** el catálogo, **When** busca algo que no existe, **Then** un mensaje dice que no hay nada con ese texto y sugiere probar con menos palabras.
9. **Given** más coincidencias de las que entran a la vista, **When** llega al final de los resultados, **Then** se muestran las siguientes, hasta la última, y mientras tanto se ve que está cargando.
10. **Given** un catálogo de 100.000 productos y el dispositivo sin conexión, **When** busca con cuatro palabras, **Then** el resultado está en menos de 100 ms (RNF-07, RNF-08).
11. **Given** resultados a la vista en la computadora, **When** usa solo el teclado, **Then** recorre los resultados, elige uno y le fija el margen sin tocar el mouse.
12. **Given** un catálogo vacío, **When** abre la búsqueda, **Then** un mensaje dice que todavía no hay productos y que el primer paso es cargar una lista de precios.

---

### User Story 2 - Elegir el margen y ver el precio de venta explicado (Priority: P1)

El Administrador ve el costo del producto, elige el margen con un toque (300 / 200 / 100 / 50 /
25 %) o tipea otro porcentaje, y el sistema calcula el precio de venta redondeado para arriba
a $1.000. Cada número calculado dice de dónde sale.

**Why this priority**: el precio de venta sale siempre del costo y del margen; sin margen
elegido el producto no tiene precio.

**Independent Test**: con un producto de costo conocido y sin margen, elegir un margen y
comparar el precio y su explicación con la cuenta a mano.

**Acceptance Scenarios**:

1. **Given** una mecha con costo $1.500, IVA 21 % y sin margen, **When** el Administrador elige 100 % con un toque o con un solo atajo de teclado, **Then** esa opción queda marcada como la elegida y el precio es $4.000 (1.500 × 2 × 1,21 = 3.630, para arriba al múltiplo de $1.000).
2. **Given** un producto sin margen elegido, **When** se lo ve en cualquier lado, **Then** dice «sin precio» en vez de un precio, con las opciones de margen a la vista.
3. **Given** la mecha de costo $1.500, **When** elige otro margen y tipea 20, **Then** el precio es $3.000 (1.500 × 1,2 × 1,21 = 2.178 → 3.000), se ve que el margen es 20 % puesto a mano y ninguna de las cinco opciones queda marcada: lo tipeado es un porcentaje, no un precio.
4. **Given** un taladro de costo $120.000, **When** elige 25 %, **Then** el precio es $182.000 (181.500 para arriba).
5. **Given** un producto con margen elegido, **When** se lo vuelve a buscar otro día o desde otro dispositivo, **Then** tiene el mismo margen: queda guardado en el producto.
6. **Given** un producto con margen 100 % cuyo costo sube al aplicar una lista nueva, **When** se lo busca, **Then** el precio de venta ya está recalculado con el margen guardado.
7. **Given** un margen recién elegido y el dispositivo sin conexión, **When** se cierra y se vuelve a abrir la aplicación, **Then** el margen sigue elegido, y se manda solo al servidor cuando vuelve la conexión (RNF-20).
8. **Given** un producto, **When** se indica como margen un porcentaje entero entre 1 y 10.000, o ninguno, **Then** se guarda y queda registrado con el usuario que lo hizo; un decimal, cero, un negativo, más de 10.000 o un texto se rechazan con un mensaje en el lugar.
9. **Given** un producto sin costo (ningún proveedor le puso precio), **When** se lo ve, **Then** dice «sin costo» y no se le puede elegir margen.
10. **Given** el costo de un producto que salió de una lista con descuentos, **When** el Administrador pide la explicación del costo, **Then** ve los pasos con sus números de origen y la fecha de la lista: precio de lista, IVA quitado si lo incluía, cada descuento en orden y el costo que queda.
11. **Given** un costo de $1.649,14, margen 100 % e IVA 21 %, **When** pide la explicación del precio, **Then** ve «Costo $1.649,14», «+ 100 % de margen = $3.298,28», «+ IVA 21 % = $3.990,92» y «Redondeado para arriba a $4.000,00 (múltiplo de $1.000,00)»; un producto con IVA 10,5 % usa ese IVA.
12. **Given** un precio que ya es múltiplo de $1.000, **When** se redondea, **Then** queda igual; $1.000,01 pasa a $2.000 y $15,10 a $1.000.
13. **Given** un renglón de venta de 0,5 kg de un producto a $3.000 el kilo, **When** se calcula el renglón, **Then** es $2.000 y la explicación lo dice: «× 0,5 kg = $1.500,00», «Redondeado para arriba a $2.000,00 (múltiplo de $1.000,00) para no dar vuelto».
14. **Given** un renglón de venta con un precio puesto a mano de $1.500 (RF-20b), **When** se calcula el renglón, **Then** se cobra $1.500, sin redondear, y el renglón muestra un aviso que dice que no es múltiplo de $1.000; el aviso no impide cobrar.
15. **Given** un cambio de margen en un catálogo de 100.000 productos, **When** el Administrador lo elige, **Then** el precio nuevo se ve en menos de 100 ms (RNF-07).

---

### User Story 3 - Actualizar precios con la lista de un proveedor (Priority: P1)

El Administrador sube el Excel de un proveedor. El sistema reconoce de quién es, muestra qué
cambia y recién al confirmar actualiza los costos; con el margen de cada producto cambian los
precios de venta. Si algo se ve mal, se descarta y no cambia nada.

**Why this priority**: el catálogo y todos los costos salen de las listas; sin ellas no hay
productos que buscar ni precios que calcular.

**Independent Test**: con un proveedor configurado, subir una planilla de muestra, revisar el
resumen y aplicar; verificar los productos y los costos que quedaron, y que descartar no deja
nada.

**Acceptance Scenarios**:

1. **Given** un proveedor configurado, con descuento por contado de 5 %, **When** el Administrador sube su planilla sin decir de quién es, **Then** el sistema reconoce el proveedor por el nombre del archivo o por el formato de la planilla y muestra su nombre, la fecha de la lista y el resumen de qué cambia.
2. **Given** una planilla de muestra con cuatro productos válidos y una fila sin precio, cargada por primera vez, **When** se la sube, **Then** el resumen dice 4 productos leídos, 4 nuevos y 1 fila salteada con su motivo.
3. **Given** una lista que cambia el costo de productos que ya existen, **When** se la sube, **Then** el resumen dice cuántos son nuevos, cuántos cambian de precio y con qué variación promedio, cuántos quedan sin cambio y cuántos ya no aparecen.
4. **Given** el resumen de una lista subida, **When** el Administrador revisa la vista previa, **Then** ve cada producto con el costo que tenía y el costo nuevo, los que cambian primero, y puede pedir la explicación de cada costo (por ejemplo $712,50 con «− 25 %» de la línea y «− 5 %» de contado).
5. **Given** una lista subida y sin aplicar, **When** se consultan los costos del proveedor, **Then** son los de antes: nada se guarda hasta aplicar.
6. **Given** una lista sin aplicar, **When** el Administrador la aplica, **Then** se crean los productos nuevos, se agregan los costos que cambiaron, se ve el avance mientras dura y al terminar se ve el resultado (cuántos precios se actualizaron y cuántos productos son nuevos); el proveedor muestra la fecha de su última lista aplicada.
7. **Given** una lista aplicada que trae productos que ya no aparecen, **When** termina de aplicarse, **Then** esos productos quedan dados de baja para ese proveedor [NEEDS CLARIFICATION: ¿qué es exactamente «dar de baja» un producto que ya no aparece en la lista nueva de su proveedor? ¿Deja de verse en la búsqueda y de poder venderse, o solo deja de tener costo de ese proveedor? ¿Qué pasa si tiene stock, o si lo vende otro proveedor? ¿Vuelve solo si reaparece en una lista posterior?].
8. **Given** una lista ya aplicada, **When** alguien quiere aplicarla otra vez, **Then** el sistema no lo permite y lo dice.
9. **Given** una lista ya aplicada, **When** se sube y se aplica el mismo archivo otra vez, **Then** el resumen dice 0 nuevos y todos sin cambio, y no se duplica ningún costo ni ningún producto.
10. **Given** una lista sin aplicar, **When** el Administrador la descarta, **Then** queda descartada, no se guarda ningún costo y no vuelve a ofrecerse para aplicar.
11. **Given** un archivo que no es la planilla de ningún proveedor conocido, **When** se lo sube, **Then** un mensaje claro en castellano dice que no se reconoció y pide elegir el proveedor; el archivo no se pierde: queda guardado para revisarlo.
12. **Given** que el sistema no reconoció el proveedor, o lo reconoció mal, **When** el Administrador elige el proveedor correcto, **Then** la planilla se lee como una lista de ese proveedor.
13. **Given** una planilla que no dice su fecha, **When** se la sube, **Then** el sistema pregunta de qué fecha es la lista antes de leerla.
14. **Given** la planilla de un proveedor, **When** se la lee, **Then** cada fila sale con los mismos datos, sea cual sea el proveedor: código, descripción, marca, grupo, precio de lista, descuentos, costo sin IVA con su explicación, IVA, bulto, código de barras y precio sugerido cuando la planilla los trae; las filas sin código o sin precio se saltean con su motivo.
15. **Given** un descuento por contado configurado que no coincide con el que dice la planilla, **When** se lee la lista, **Then** la vista previa trae un aviso de que no coincide.
16. **Given** una lista aplicada, **When** se revisa el registro de acciones, **Then** figuran quién la cargó y quién la aplicó (RF-71).
17. **Given** una lista que trae productos nuevos, **When** termina de aplicarse, **Then** el sistema busca si esos productos son duplicados de los de otros proveedores y deja las sugerencias para revisar (RF-06).
18. **Given** dos personas que aplican la misma lista a la vez, **When** llegan los dos pedidos, **Then** solo el primero la aplica; el otro ve que la lista ya se está aplicando.
19. **Given** cualquiera de las listas reales de los proveedores cargados, **When** el Administrador la sube, la revisa y la aplica, **Then** todo el recorrido le lleva menos de un minuto y no necesita manual.

---

### User Story 4 - Que el costo sea comparable entre proveedores (Priority: P1)

El Administrador configura de cada proveedor cómo informa sus precios (con IVA o sin IVA, su
descuento general y su descuento por pago contado). El sistema lleva el precio de lista de
todos al mismo número: lo que realmente se paga, sin IVA.

**Why this priority**: sin un costo calculado igual para todos no se puede decir quién es más
barato ni calcular un precio de venta confiable.

**Independent Test**: configurar dos proveedores con reglas distintas, cargar una lista de
cada uno y comparar el costo de diez productos contra lo que dice la factura.

**Acceptance Scenarios**:

1. **Given** un proveedor con descuento general de 25 % y contado de 5 %, **When** se lee un producto con precio de lista $2.314, **Then** el costo es $1.648,725 (2.314 − 25 % = 1.735,50; − 5 % = 1.648,725): los descuentos se aplican uno después del otro, cada uno sobre el resultado del anterior, y el IVA se guarda aparte.
2. **Given** un proveedor cuya configuración dice que sus precios incluyen IVA, **When** se lee su lista, **Then** el costo es el precio sin IVA (1.000 / 1,21 = 826,4463).
3. **Given** una planilla que trae descuentos propios por fila o por línea de productos, **When** se la lee, **Then** esos descuentos también entran en el costo y figuran en la explicación, en el orden en que se aplicaron.
4. **Given** un costo calculado, **When** se lo guarda, **Then** quedan guardados todos los números intermedios (precio de lista original, cada descuento, costo, IVA), nunca solo el resultado.
5. **Given** un Administrador que carga un proveedor nuevo, **When** indica un descuento que no es un porcentaje entre 0 y 100 %, o un nombre que ya existe, **Then** se rechaza con un mensaje que dice qué corregir.
6. **Given** un usuario que no es Administrador, **When** intenta crear o modificar un proveedor, **Then** el sistema no lo permite.
7. **Given** un cambio en la configuración de un proveedor, **When** se guarda, **Then** queda registrado con el usuario que lo hizo y vale para las listas que se carguen después; los costos ya guardados no se reescriben.
8. **Given** diez productos elegidos a mano de un proveedor, **When** se compara su costo con lo que se pagó en la factura, **Then** coinciden.

---

### User Story 5 - Bajar el Excel original de la lista de un producto (Priority: P2)

Desde un producto, el Vendedor o el Comprador baja el archivo tal como lo mandó el proveedor,
para revisar de dónde salió el costo.

**Why this priority**: es la forma de comprobar un costo dudoso contra la fuente.

**Independent Test**: con un producto cuyo costo vino de una lista, pedir el archivo y
recibirlo con su nombre original.

**Acceptance Scenarios**:

1. **Given** un producto cuyo costo salió de una lista cargada, **When** se lo mira, **Then** se ve de qué lista salió (proveedor y fecha) y desde ahí se puede bajar el archivo.
2. **Given** esa lista, **When** un usuario con sesión pide el archivo, **Then** recibe el contenido original, sin modificar, con el nombre con que se subió.
3. **Given** una lista cuyo archivo no está guardado, **When** se pide el archivo, **Then** un mensaje dice que ese archivo no está disponible.
4. **Given** alguien sin sesión, **When** pide el archivo de una lista, **Then** no lo recibe.

---

### User Story 6 - Averiguar quién vende un producto y a cuánto (Priority: P2)

El Vendedor o el Comprador busca un producto y ve todos los proveedores que lo tienen, el
costo de cada uno y cuál es el más barato; puede elegir de cuál sale el costo.

**Why this priority**: decide a quién comprar y sobre qué costo se calcula el precio.

**Independent Test**: con un producto que tiene costo de dos proveedores, abrirlo y ver los
dos costos, la marca del más barato y el precio según el elegido.

**Acceptance Scenarios**:

1. **Given** un producto unido, con costo de un proveedor barato ($2.400) y de uno caro ($3.000) y margen 100 %, **When** se lo busca, **Then** aparece un solo producto con los dos proveedores, cada uno con su código, su costo y la fecha de su lista, el más barato señalado, y el precio es $6.000 (sale del más barato: 2.400 × 2 × 1,21 = 5.808).
2. **Given** ese producto, **When** se elige usar el proveedor caro, **Then** el costo pasa a ser el de ese proveedor y el precio $8.000 (3.000 × 2 × 1,21 = 7.260); queda registrado quién lo cambió.
3. **Given** un producto con un proveedor elegido, **When** se lo vuelve a buscar, **Then** se ve cuál es el proveedor en uso y cuál el más barato, aunque no sean el mismo.
4. **Given** un cambio de proveedor en uso y el dispositivo sin conexión, **When** se cierra y se vuelve a abrir la aplicación, **Then** el cambio sigue a la vista y se manda solo al reconectar (RNF-20).
5. **Given** un producto cuyo proveedor más barato tiene la lista más vieja, **When** el sistema elige de quién sale el costo, **Then** [NEEDS CLARIFICATION: ¿a partir de cuántos días sin lista nueva deja de valer el costo de un proveedor para elegirlo como el más barato, y a partir de cuántos días se avisa que la lista de un proveedor está vieja?].
6. **Given** un producto con dos proveedores y una lista nueva que deja más barato al que no estaba en uso, **When** se aplica la lista, **Then** [NEEDS CLARIFICATION: ¿el costo pasa solo al proveedor que quedó más barato, o se mantiene el que estaba en uso hasta que alguien lo cambie? Si alguien había elegido el proveedor a mano, ¿se respeta esa elección?].

---

### User Story 7 - Unir el mismo artículo de varios proveedores y volver a separarlo (Priority: P2)

El Administrador ve las sugerencias de duplicados, decide «es el mismo» o «son distintos»,
une dos productos a mano cuando el sistema no los sugirió y puede separar una unión equivocada.

**Why this priority**: sin unir, el mismo artículo aparece una vez por proveedor y no se
puede comparar quién es más barato.

**Independent Test**: con dos productos de proveedores distintos y el mismo código de barras,
buscar duplicados, unirlos, verificar el producto resultante y separarlos.

**Acceptance Scenarios**:

1. **Given** dos productos de proveedores distintos con el mismo código de barras, **When** el Administrador pide buscar duplicados en todo el catálogo, **Then** aparece la sugerencia con los dos productos lado a lado (descripción, marca, código de barras, proveedor, costo y fecha de lista) y el motivo «mismo código de barras».
2. **Given** dos productos de proveedores distintos sin código de barras en común y con descripción similar, **When** se buscan duplicados, **Then** aparece la sugerencia con el motivo «descripción similar»; como mínimo se sugieren los que tienen la misma descripción sin contar acentos, mayúsculas, símbolos ni espacios.
3. **Given** una sugerencia, **When** el Administrador decide «es el mismo» y cuál de los dos se conserva, **Then** queda un solo producto con los dos proveedores, que conserva las ventas, compras, movimientos de stock y costos de los dos; el otro deja de aparecer en la búsqueda.
4. **Given** dos productos que se unen, **When** el que se conserva no tenía código de barras, marca, sector o margen, **Then** toma los del otro, y queda registrado exactamente qué se movió y quién lo hizo.
5. **Given** dos productos recién unidos, **When** se mira de cuál proveedor sale el costo, **Then** es el más barato de los dos.
6. **Given** una sugerencia sin resolver, **When** el Administrador decide «son distintos», **Then** la sugerencia no vuelve a aparecer, ni al buscar duplicados de nuevo.
7. **Given** dos productos cualesquiera que el sistema no sugirió, **When** el Administrador busca uno para conservar y otro para absorber y los une, **Then** quedan unidos igual que con una sugerencia.
8. **Given** una unión realizada, **When** el Administrador la separa, **Then** vuelven a ser dos productos, cada uno con su proveedor, sus ventas, sus compras, su stock y los datos que tenía antes de unirse.
9. **Given** un usuario que no es Administrador, **When** intenta ver sugerencias, unir, rechazar o separar, **Then** el sistema no lo permite, y la interfaz no le ofrece esas acciones.
10. **Given** un producto que no está unido a otro, **When** se pide separarlo, **Then** el sistema no hace nada y lo dice.

---

### User Story 8 - Leer el código de barras con la cámara del celular (Priority: P2)

El Vendedor escanea con el celular. Si está usando la computadora, vincula el celular
leyendo un QR y lo que escanea aparece en la computadora.

**Why this priority**: la cámara del celular es el único lector de códigos del local.

**Independent Test**: con dos sesiones del mismo usuario (computadora y celular), vincular,
mandar un código conocido y uno desconocido, y ver el resultado en la computadora.

**Acceptance Scenarios**:

1. **Given** un celular con cámara y el catálogo bajado, **When** el Vendedor abre el escáner junto a la búsqueda y apunta a un código de barras de un producto cargado, **Then** ve el producto en menos de 3 segundos desde que tocó escanear, con o sin conexión.
2. **Given** el escáner abierto, **When** la cámara no logra leer el código, **Then** el Vendedor puede tipearlo ahí mismo.
3. **Given** el escáner apuntando al mismo código de forma continua, **When** pasa el tiempo, **Then** el código se toma una sola vez; para sumar otra unidad hay que volver a escanearlo.
4. **Given** una venta abierta en la computadora, **When** el Vendedor pide vincular el celular, **Then** la computadora muestra un QR; al leerlo con el celular, el celular dice que quedó vinculado y la computadora también.
5. **Given** el celular vinculado, **When** escanea el código de un producto conocido, **Then** el producto aparece en la venta de la computadora.
6. **Given** el celular vinculado, **When** escanea un código que no está en el catálogo, **Then** la computadora avisa que no lo conoce; al buscar el producto y elegirlo, se agrega a la venta y el código queda guardado en ese producto.
7. **Given** ese código ya asociado, **When** el celular lo escanea otra vez, **Then** el producto pasa a cantidad 2.
8. **Given** el escáner del celular sin computadora vinculada, **When** escanea un código que no está en el catálogo, **Then** ofrece asociarlo al producto que el Vendedor elija.
9. **Given** un QR que se mostró y no se leyó en 5 minutos, o que ya se usó una vez, **When** un celular lo lee, **Then** no se vincula y dice que hay que pedir otro.
10. **Given** un vínculo de más de 12 horas, **When** el celular manda un código, **Then** no se acepta y hay que vincular de nuevo.
11. **Given** el celular vinculado y la computadora que perdió la conexión un momento, **When** la computadora vuelve, **Then** recibe los códigos que no le habían llegado, en orden y sin repetir.
12. **Given** un celular con sesión de otro usuario o sin sesión, **When** lee el QR, **Then** el sistema le pide entrar y solo vincula a quien tiene sesión; cada código llega solo a la computadora vinculada.
13. **Given** un código de barras de menos de 4 o más de 32 caracteres, **When** se lo quiere asociar a un producto, **Then** no se guarda.

---

### User Story 9 - Sacarle una foto al producto (Priority: P3)

El Vendedor o el Comprador le saca una foto al producto con el celular y queda en su ficha.
La foto chica se amplía al tocarla y desde ahí se saca otra.

**Why this priority**: ayuda a reconocer el producto, pero no frena ninguna operación.

**Independent Test**: abrir la foto de un producto sin foto, sacar una y verla chica y grande
en el celular y en la computadora.

**Acceptance Scenarios**:

1. **Given** un producto sin foto, **When** se lo ve en cualquier lado, **Then** muestra un ícono en su lugar, nunca una imagen rota.
2. **Given** un producto sin foto, **When** se toca ese lugar, **Then** se amplía con la descripción del producto, dice que todavía no tiene foto y ofrece sacarla.
3. **Given** la foto ampliada en el celular, **When** se elige sacar foto, **Then** se abre la cámara trasera y la foto que se saca se sube achicada (unos 800 px de lado) y queda como foto del producto.
4. **Given** una foto recién subida desde el celular, **When** se mira ese producto en la computadora, **Then** la foto ya está, y todo el recorrido de sacarla y subirla llevó menos de 15 segundos.
5. **Given** un producto que ya tiene foto, **When** se la amplía y se saca otra, **Then** la nueva reemplaza a la anterior.
6. **Given** un archivo que no es una imagen (jpeg, png o webp), o demasiado pesado, **When** se lo quiere subir como foto, **Then** se rechaza con un mensaje que dice por qué.
7. **Given** un producto con foto, **When** aparece en la búsqueda, en la venta (sugerencias y renglones) o en el conteo de stock, **Then** se ve su foto chica.
8. **Given** la foto ampliada en la computadora, **When** se aprieta Escape, **Then** se cierra.

---

### User Story 10 - Productos que se venden sueltos (Priority: P3)

El Vendedor marca cómo se vende un producto: por unidad, o suelto por kilo, metro o litro.

**Why this priority**: clavos por kilo y cable por metro son ventas de todos los días, pero
son pocos productos.

**Independent Test**: cambiar la unidad de un producto a kilo y cargar 1,5 como cantidad.

**Acceptance Scenarios**:

1. **Given** un producto, **When** se le pone como unidad «unidad», «kg», «m» o «l», **Then** queda guardada en el producto, con el usuario que la cambió; cualquier otra se rechaza.
2. **Given** un producto que se vende por unidad, **When** se tipea 2,7 como cantidad, **Then** se toma 2: lo que se vende por unidad lleva cantidades enteras.
3. **Given** un producto que se vende por kilo, metro o litro, **When** se tipea 1,5 o 1.5, **Then** se toma un kilo y medio: lo fraccionado admite hasta un decimal, con coma o con punto.
4. **Given** un producto por kilo a $3.000, **When** se venden 0,5 kg, **Then** el renglón se redondea para arriba a $1.000 como cualquier otro (RF-19).

---

### User Story 11 - Sumar un proveedor nuevo sin programar nada (Priority: P2)

El Administrador sube la lista de un proveedor que el sistema nunca vio. El sistema encuentra
solo el encabezado y las columnas; si no puede, el Administrador le dice qué columna es qué, una
sola vez, y la próxima lista de ese proveedor entra sin preguntar.

**Why this priority**: los proveedores pasan de unos pocos a unos cincuenta, y sus formatos
cambian sin aviso; cada proveedor nuevo tiene que ser configuración.

**Independent Test**: subir la planilla de un proveedor sin configurar, indicar las columnas,
aplicar, y subir otra planilla del mismo proveedor con el mismo formato.

**Acceptance Scenarios**:

1. **Given** una planilla de un proveedor nuevo, **When** se la sube, **Then** el sistema detecta la fila de encabezado y reconoce las columnas por sus nombres habituales (código, cod o artículo; descripción o detalle; precio, lista o neto; marca; bulto; IVA).
2. **Given** una planilla cuyas columnas no se pudieron reconocer, **When** se la sube, **Then** en vez de fallar el sistema muestra las columnas y pide elegir qué es cada una, con filas de ejemplo a la vista.
3. **Given** las columnas ya indicadas para un proveedor, **When** llega su próxima lista con el mismo formato, **Then** se lee sin preguntar nada.
4. **Given** un proveedor con sus columnas guardadas, **When** su planilla llega con el orden de columnas cambiado o con una fila más arriba del encabezado, **Then** se lee bien igual o, si no se puede, se vuelve a pedir qué columna es qué y se guarda la respuesta nueva.
5. **Given** un proveedor nuevo, **When** se lo configura, **Then** se registran su formato, si sus precios incluyen IVA, sus descuentos, cada cuánto cambia la lista y por qué canal llega (correo, web o PDF).
6. **Given** una lista leída de esta forma, **When** se la revisa y aplica, **Then** vale todo lo de la historia 3: resumen, vista previa, nada se guarda hasta aplicar.

---

### User Story 12 - Cargar una lista que llega en PDF (Priority: P2)

El Administrador sube el PDF de un proveedor y el sistema saca de ahí la tabla de precios, igual
que de un Excel.

**Why this priority**: algunos proveedores solo mandan PDF, y tipear esos precios es el
trabajo que el sistema viene a quitar.

**Independent Test**: subir el PDF con texto de un proveedor y aplicar la lista.

**Acceptance Scenarios**:

1. **Given** el PDF de un proveedor, con el texto seleccionable, **When** el Administrador lo sube, **Then** el sistema extrae la tabla y la trata como cualquier otra lista: reconoce o pide las columnas (RF-03), muestra el resumen y la vista previa, y no guarda nada hasta aplicar.
2. **Given** un PDF escaneado, que es una imagen sin texto, **When** se lo sube, **Then** [NEEDS CLARIFICATION: cuando un proveedor manda un PDF escaneado (una imagen, sin texto), ¿el sistema tiene que leerlo igual reconociendo los caracteres, o alcanza con que avise que no puede y que hay que pedirle el Excel al proveedor?].
3. **Given** un PDF del que no se pudo sacar ninguna tabla, **When** se lo sube, **Then** un mensaje dice que no se pudo leer y qué hacer, y el archivo queda guardado.

---

### User Story 13 - Recibir las listas solas (Priority: P2)

Las listas llegan al sistema sin que nadie baje ni suba un archivo: desde el correo del
negocio o desde el portal del proveedor. El Administrador solo revisa el resumen y aplica.

**Why this priority**: quita el paso manual de cada semana, pero subir el archivo a mano
sigue estando siempre disponible.

**Independent Test**: mandar un correo con la lista de un proveedor conocido a la casilla del
negocio y ver la lista lista para revisar, sin haber tocado nada.

**Acceptance Scenarios**:

1. **Given** la casilla de correo del negocio autorizada por el Administrador, solo para lectura, **When** llega un correo con la lista de un proveedor conocido adjunta (Excel o PDF), **Then** la lista queda lista para revisar, con su resumen y su vista previa, sin que nadie descargue nada, en menos de [NEEDS CLARIFICATION: ¿cuánto puede tardar en aparecer una lista desde que llega el correo? Una fuente dice menos de 10 minutos y otra que el correo se revisa cada 15 minutos].
2. **Given** dos proveedores cuyas listas manda el mismo vendedor desde la misma casilla, **When** llegan sus correos, **Then** cada lista se asigna a su proveedor: se reconoce por el nombre y el formato del archivo, no por quién lo manda.
3. **Given** un adjunto que no se reconoce como de ningún proveedor, **When** llega, **Then** queda en una bandeja que pregunta de qué proveedor es; se lo asigna una vez y los siguientes de ese proveedor se reconocen solos.
4. **Given** una lista que llegó por correo, **When** se la mira, **Then** se puede ver el correo original del que salió.
5. **Given** un proveedor con portal web y el usuario del negocio en ese portal, **When** llega el momento programado (semanal, o diario si el proveedor cambia seguido), **Then** el sistema baja la lista y la deja lista para revisar.
6. **Given** una lista bajada de un portal que es idéntica a la última, **When** se la compara, **Then** no se crea nada.
7. **Given** un portal que cambió y cuya descarga falla, **When** corre la descarga programada, **Then** el Administrador recibe un aviso con el error en castellano, queda el registro de la ejecución y no se reintenta a ciegas.
8. **Given** una lista que llegó sola, por cualquier canal, **When** nadie la aplicó, **Then** no cambia ningún costo: nunca se aplica una lista sin que una persona la confirme.
9. **Given** una lista que llegó sola, **When** queda lista para revisar, **Then** se avisa a quien tiene que revisarla [NEEDS CLARIFICATION: cuando una lista llega sola, ¿por dónde se le avisa al Administrador (dentro de la aplicación, por WhatsApp, por correo)?].
10. **Given** un proveedor con portal, **When** se quiere automatizar su descarga, **Then** [NEEDS CLARIFICATION: ¿qué proveedores autorizaron el acceso automático a su portal, o entregan una exportación oficial? Sin esa autorización no se automatiza la descarga de ninguno].

---

### User Story 14 - Ver cómo cambió el precio de un producto (Priority: P2)

El Comprador o el Administrador abre un producto y ve cómo evolucionaron su costo, por
proveedor, y su precio de venta.

**Why this priority**: dice cuánto subió algo y desde cuándo, y permite valorizar el stock
con el costo de cada fecha.

**Independent Test**: aplicar tres listas del mismo proveedor con fechas distintas y ver tres
puntos en el historial del producto.

**Acceptance Scenarios**:

1. **Given** tres listas del mismo proveedor, de fechas distintas, aplicadas con costos distintos para un producto, **When** se abre el historial del producto, **Then** se ven los tres costos con su fecha de lista, del más nuevo al más viejo.
2. **Given** un producto con costo de dos proveedores, **When** se abre su historial, **Then** se distingue la evolución de cada proveedor.
3. **Given** el historial de costos de un producto, **When** se lo mira, **Then** también se ve cómo cambió el precio de venta, y cada punto explica de dónde sale (RF-13).
4. **Given** una lista nueva que cambia un costo, **When** se aplica, **Then** el costo anterior sigue en el historial: nunca se pisa un precio, se agrega uno nuevo.
5. **Given** una lista que trae el mismo costo que el vigente, **When** se aplica, **Then** el historial no suma un punto repetido.

---

### User Story 15 - Saber qué hay que remarcar después de una lista (Priority: P2)

Después de aplicar una lista, el Vendedor ve qué productos necesitan atención: los que
cambiaron de precio de venta, los nuevos que todavía no tienen margen y las subas grandes.

**Why this priority**: sin el aviso, la estantería queda con precios viejos y los productos
nuevos quedan sin precio.

**Independent Test**: aplicar una lista que sube algunos costos y trae productos nuevos, y
comparar el aviso con los productos afectados.

**Acceptance Scenarios**:

1. **Given** una lista recién aplicada, **When** el Vendedor abre el aviso de esa lista, **Then** ve exactamente los productos afectados y ninguno más.
2. **Given** una lista que trajo productos nuevos, **When** se mira el aviso, **Then** figuran los productos nuevos sin margen elegido, y desde ahí el Administrador se lo elige.
3. **Given** una lista con costos que subieron más que un umbral, **When** se mira el aviso, **Then** esas subas figuran aparte para revisarlas [NEEDS CLARIFICATION: ¿a partir de qué porcentaje de suba del costo hay que avisar para revisar el producto (por ejemplo 15 %), y quién puede cambiar ese porcentaje?].
4. **Given** una lista que cambió el costo de productos con margen elegido, **When** el precio de venta redondeado de un producto cambió, **Then** figura para remarcar con el precio anterior y el nuevo; si el costo cambió y el precio redondeado quedó igual, no figura [NEEDS CLARIFICATION: ¿«remarcar» es cambiar el precio escrito en la estantería de todo producto cuyo precio de venta cambió? La regla original hablaba además de productos con precio fijado a mano, que en el catálogo ya no existen; ¿hay algún otro caso que tenga que aparecer en el aviso?].
5. **Given** el aviso de una lista, **When** existan las etiquetas de estantería (RF-57), **Then** se pueden imprimir solo las de los productos que cambiaron.

---

### User Story 16 - Trasladar un descuento puntual de un proveedor (Priority: P3)

Un proveedor ofrece un descuento por un tiempo. Mientras dura, el costo del producto baja y
el precio de venta baja con él; cuando termina, vuelve solo al de antes.

**Why this priority**: aprovecha las ofertas para vender más barato, pero el negocio funciona
sin esto.

**Independent Test**: cargar una oferta con fecha de fin sobre un producto y ver el precio
durante la oferta y el día siguiente al fin.

**Acceptance Scenarios**:

1. **Given** un producto con un descuento puntual vigente de su proveedor, **When** se calcula su costo, **Then** el descuento entra en el costo como un paso más, y la explicación lo muestra con hasta cuándo vale (RF-11, RF-13).
2. **Given** ese producto con margen elegido, **When** se lo busca mientras dura el descuento, **Then** el precio de venta es el que sale del costo con descuento.
3. **Given** un descuento puntual que terminó, **When** se busca el producto, **Then** el precio vuelve a ser el que sale del costo sin ese descuento, sin que nadie haga nada.
4. **Given** una planilla que trae una sección de ofertas, **When** se la lee, **Then** las ofertas se distinguen de los precios de lista y se cuentan aparte en el resumen.
5. **Given** un descuento puntual, **When** se lo carga, **Then** [NEEDS CLARIFICATION: ¿cómo se entera el sistema de un descuento puntual: lo trae la lista del proveedor como oferta, lo carga alguien a mano, o las dos cosas? ¿Quién lo carga, hasta cuándo vale cuando el proveedor no dice la fecha de fin, y el precio de venta tiene que bajar siempre o solo si alguien lo aprueba?].

---

### User Story 17 - Buscar un proveedor y ver su ficha (Priority: P3)

El Comprador busca un proveedor y ve sus datos de contacto, las listas que se cargaron y qué
vende.

**Why this priority**: reemplaza la agenda y la memoria a la hora de pedir, pero no frena el
mostrador.

**Independent Test**: buscar un proveedor por su nombre y abrir su ficha.

**Acceptance Scenarios**:

1. **Given** varios proveedores cargados, **When** el Comprador escribe parte del nombre, **Then** encuentra el proveedor, sin acentos ni mayúsculas.
2. **Given** la ficha de un proveedor, **When** se la abre, **Then** se ven sus datos de contacto [NEEDS CLARIFICATION: ¿qué datos de contacto de un proveedor hay que guardar (nombre del vendedor, teléfono, WhatsApp, correo, dirección, CUIT, usuario de su portal) y quién puede verlos y cambiarlos?].
3. **Given** la ficha de un proveedor, **When** se la abre, **Then** se ven las listas cargadas de ese proveedor, con su fecha y si se aplicaron o se descartaron, y de cada una se puede bajar el archivo original (RF-01b).
4. **Given** la ficha de un proveedor, **When** se pide qué vende, **Then** se ven sus productos con su código y su costo vigente, y se puede buscar entre ellos.
5. **Given** la ficha de un proveedor, **When** se la abre, **Then** se ve cómo se calcula su costo: si sus precios incluyen IVA y sus descuentos (RF-11).

---

### User Story 18 - Decidir el margen con datos (Priority: P3)

El Administrador ve, para cada producto, cuánto cuesta realmente venderlo, repartiendo los
gastos fijos del negocio, y el margen que le correspondería, en vez de elegirlo a ojo.

**Why this priority**: mejora la ganancia, pero necesita primero los gastos fijos (RF-64) y
la rotación de cada producto; corresponde a una etapa posterior.

**Independent Test**: con los gastos fijos de un mes y las ventas cargadas, ver el margen
sugerido de una muestra de productos y su explicación.

**Acceptance Scenarios**:

1. **Given** los gastos fijos del negocio y lo que se vendió, **When** se mira un producto, **Then** se ve su costo total (costo de compra más gastos fijos asignados), el precio que sale de ese costo y el margen que corresponde [NEEDS CLARIFICATION: ¿con qué criterio se reparten los gastos fijos (alquiler, sueldo, servicios, impuestos) entre los productos: por unidad vendida, por valor vendido, por rotación o por familia de productos?].
2. **Given** un producto con margen elegido, **When** se lo compara con el sugerido, **Then** se ven los dos y la diferencia, y aceptar el sugerido lleva un solo toque.
3. **Given** un margen sugerido, **When** se pide su explicación, **Then** dice de dónde sale cada número, con los gastos y las ventas de origen (RF-13).
4. **Given** una muestra de 30 productos, **When** el Administrador revisa los precios sugeridos, **Then** los considera razonables.

---

### User Story 19 - Encontrar un producto sacándole una foto (Priority: P3)

El Vendedor tiene en la mano un producto sin código de barras, le saca una foto con el
celular y el sistema le muestra qué producto es.

**Why this priority**: es de una etapa posterior (segunda versión): en la primera alcanza con
escanear el código de barras y buscar por palabras.

**Independent Test**: sacarle una foto a un producto sin código de barras que está en el
catálogo y ver si aparece entre los primeros resultados.

**Acceptance Scenarios**:

1. **Given** un producto del catálogo sin código de barras, **When** el Vendedor le saca una foto desde la búsqueda del celular, **Then** el sistema muestra los productos que más se le parecen, y el buscado está entre los primeros [NEEDS CLARIFICATION: para buscar por foto, ¿contra qué se compara la foto que saca el Vendedor: contra las fotos que el local ya sacó de cada producto (RF-09), contra las del catálogo del proveedor, o reconociendo lo que dice el envase?].
2. **Given** una foto que no se parece a nada del catálogo, **When** se busca, **Then** el sistema lo dice y ofrece buscar por palabras.

---

### Edge Cases

- **Cargar una lista sin conexión:** no se puede; un mensaje dice que cargar una lista necesita internet. Buscar y elegir márgenes sí funcionan sin conexión.
- **No se puede leer la planilla** (archivo dañado, o el lector no responde): la carga se corta con un mensaje que dice qué pasó y no se crea ninguna lista a medias.
- **Archivo demasiado grande** (una lista de más de 30 MB, una foto de más de 10 MB): se rechaza con un mensaje que lo dice.
- **La aplicación de una lista se corta a mitad:** la lista vuelve a quedar sin aplicar, con el motivo a la vista; al aplicarla de nuevo no se duplica nada, porque un costo igual al vigente no se agrega.
- **Lista con fecha anterior a la vigente:** se guarda en el historial con su fecha, y el costo vigente sigue siendo el de la lista más reciente.
- **Producto con el mismo código en dos listas del mismo proveedor:** es el mismo producto; se lo reconoce por el código de ese proveedor.
- **Producto sin costo:** dice «sin costo» y no se le puede elegir margen.
- **Margen que el servidor rechaza al reconectar:** quien lo cargó se entera, con el producto y el motivo; el cambio no desaparece en silencio.
- **Dos usuarios cambian el margen del mismo producto:** vale el último, y los dos cambios quedan en el registro de acciones.
- **Unir un producto consigo mismo, o con uno que ya fue absorbido:** no se permite y lo dice.
- **Vincular el celular sin conexión:** no se puede; el celular igual escanea y busca en su propio catálogo.
- **Código de barras que ya tiene otro producto:** al asociarlo, [NEEDS CLARIFICATION: si un código de barras desconocido se quiere asociar a un producto, pero ese código ya lo tiene otro producto, ¿se rechaza, se pasa al producto nuevo o se sugiere que los dos son el mismo artículo?].

## Requirements *(mandatory)*

### Functional Requirements

- **RF-01**: El sistema DEBE cargar la lista de precios de un proveedor subiendo el archivo Excel: reconoce el proveedor por el archivo y permite corregirlo, muestra qué cambia (productos leídos, nuevos, los que cambian de precio con su variación promedio, sin cambio, los que ya no aparecen y las filas salteadas con su motivo) y recién al confirmar crea los productos nuevos, agrega los costos y da de baja lo que ya no aparece. Nada se guarda hasta confirmar y la lista se puede descartar. El archivo original se guarda siempre, con su fecha, también cuando no se reconoce. Cargar una lista lleva menos de un minuto. [NEEDS CLARIFICATION: ¿qué es exactamente «dar de baja» un producto que ya no aparece en la lista nueva de su proveedor? ¿Deja de verse en la búsqueda y de poder venderse, o solo deja de tener costo de ese proveedor? ¿Qué pasa si tiene stock, o si lo vende otro proveedor? ¿Vuelve solo si reaparece en una lista posterior?]
- **RF-01b**: Desde un producto se DEBE poder bajar el archivo original de la lista de la que salió su costo, sin modificar y con su nombre.
- **RF-02**: El sistema DEBE cargar listas que llegan en PDF con texto, extrayendo su tabla y tratándola como cualquier otra lista (RF-01, RF-03). [NEEDS CLARIFICATION: cuando un proveedor manda un PDF escaneado (una imagen, sin texto), ¿el sistema tiene que leerlo igual reconociendo los caracteres, o alcanza con que avise que no puede y que hay que pedirle el Excel al proveedor?]
- **RF-03**: El sistema DEBE cargar la lista de cualquier proveedor nuevo sin programar un lector a medida: detecta el encabezado y las columnas por sus nombres habituales, guarda por proveedor qué columna es qué y, cuando no puede reconocerlas o el formato cambió, lo pregunta en vez de fallar y guarda la respuesta. De cada proveedor se registran formato, IVA, descuentos, frecuencia de cambio y canal por el que llega la lista.
- **RF-04**: El sistema DEBE recibir las listas solas, desde el correo del negocio (leído con permiso de solo lectura) y desde el portal web del proveedor (con el usuario del negocio, en forma programada). Toda lista que llega sola queda para revisar y nunca se aplica sin que una persona la confirme. El proveedor se reconoce por el archivo, no por el remitente; lo que no se reconoce queda en una bandeja para asignarle proveedor una vez. Las descargas programadas dejan registro de cada ejecución y de sus errores. Subir el archivo a mano está siempre disponible. [NEEDS CLARIFICATION: ¿cuánto puede tardar en aparecer una lista desde que llega el correo? Una fuente dice menos de 10 minutos y otra que el correo se revisa cada 15 minutos.] [NEEDS CLARIFICATION: cuando una lista llega sola, ¿por dónde se le avisa al Administrador (dentro de la aplicación, por WhatsApp, por correo)?] [NEEDS CLARIFICATION: ¿qué proveedores autorizaron el acceso automático a su portal, o entregan una exportación oficial? Sin esa autorización no se automatiza la descarga de ninguno.]
- **RF-05**: Cada artículo DEBE guardar el código de cada proveedor que lo vende, y se lo encuentra y se lo reconoce en la lista siguiente por ese código. Se empieza con pocos proveedores y se suman de a poco; el catálogo DEBE funcionar igual con más de 100.000 artículos (RNF-08).
- **RF-06**: Un mismo artículo vendido por varios proveedores DEBE poder unirse en uno solo: se ve quién lo vende, a qué costo y quién es el más barato, y se elige de cuál sale el costo sobre el que se calcula el precio de venta. El sistema sugiere los duplicados (mismo código de barras o descripción similar), al aplicar una lista y a pedido, y una persona confirma; también se unen a mano, una sugerencia se puede rechazar y dos productos unidos se pueden volver a separar dejando todo como estaba. [NEEDS CLARIFICATION: ¿a partir de cuántos días sin lista nueva deja de valer el costo de un proveedor para elegirlo como el más barato, y a partir de cuántos días se avisa que la lista de un proveedor está vieja?] [NEEDS CLARIFICATION: cuando una lista nueva deja más barato a un proveedor que no era el que estaba en uso, ¿el costo pasa solo al más barato, o se mantiene el que estaba en uso hasta que alguien lo cambie? Si alguien había elegido el proveedor a mano, ¿se respeta esa elección?] [NEEDS CLARIFICATION: al unir dos productos, sus costos, ventas, compras y movimientos de stock históricos pasan a nombre del producto que se conserva, y vuelven a su lugar si se separan. ¿Se acepta eso como excepción a «los históricos no se modifican», o al unir no se debe tocar ningún registro histórico?]
- **RF-07**: Se DEBE poder buscar un producto por nombre, marca, código del proveedor o código de barras, sin saber el proveedor, con varias palabras en cualquier orden, sin acentos ni mayúsculas, tolerando un error de tipeo, con el resultado mientras se escribe. La búsqueda funciona sin conexión, sobre el catálogo guardado en el dispositivo, y responde en menos de 100 ms. Cada resultado muestra descripción, marca, proveedor, precio de venta y precio por bulto si existe.
- **RF-08**: El código de barras se DEBE leer con la cámara del celular, que es el único lector del local, también sin conexión. Para usarlo en la computadora, el celular se vincula leyendo un QR y lo que escanea aparece en la computadora. Un código que no está en el catálogo se asocia al producto que se elija. Si la cámara no lee, el código se puede tipear.
- **RF-09**: Desde el celular se DEBE poder sacarle una foto al producto y guardarla en su ficha. La foto chica se amplía al tocarla y desde ahí se saca otra que la reemplaza. La foto se ve en la búsqueda, en la venta y en el conteo; un producto sin foto muestra un ícono, nunca una imagen rota.
- **RF-09b**: Se DEBE poder encontrar un producto sin código de barras sacándole una foto. Es de una etapa posterior (segunda versión). [NEEDS CLARIFICATION: para buscar por foto, ¿contra qué se compara la foto que saca el Vendedor: contra las fotos que el local ya sacó de cada producto (RF-09), contra las del catálogo del proveedor, o reconociendo lo que dice el envase?]
- **RF-10**: El precio de venta DEBE ser costo + margen + IVA del producto, redondeado según RF-19. El margen se elige con un toque o un atajo de teclado entre 300, 200, 100, 50 y 25 %, o a mano, y queda guardado por producto. En el catálogo, «a mano» es un porcentaje entero de margen, no un precio. Un producto sin margen elegido se muestra «sin precio». Cuando cambia el costo, el precio se recalcula con el margen guardado.
- **RF-11**: El costo DEBE ser comparable entre proveedores: lo que realmente se paga, sin IVA, calculado igual para todos. Costo = precio de lista (sin IVA si lo incluía) − descuento general − descuento por pago contado − ofertas vigentes, aplicados en cascada. Cada proveedor tiene su configuración (precios con o sin IVA, descuento general, descuento por contado), que carga el Administrador. Se guardan todos los números intermedios y el IVA aparte. El costo de diez productos elegidos a mano coincide con la factura. [NEEDS CLARIFICATION: la regla del costo del 2026-09-13 (lista − descuento general − descuento por contado − ofertas vigentes, sin IVA) figura como no cerrada por Carlos. ¿Queda aprobada tal cual? En particular: ¿las ofertas que trae la planilla de un proveedor bajan el costo del producto mientras duran?]
- **RF-12**: Un producto se DEBE poder vender por unidad, con cantidades enteras, o fraccionado por kilo, metro o litro, con hasta un decimal. La unidad queda guardada en el producto.
- **RF-13**: Todo número calculado DEBE explicar de dónde sale, paso a paso, en castellano simple y con los números de origen: el costo, con la fecha de la lista, el precio de lista, el IVA si lo incluía y cada descuento en orden; el precio de venta, con costo, margen, IVA y redondeo. La explicación se ve igual en todos los lugares donde aparece el número, y ningún número se calcula sin su explicación.
- **RF-14**: Se DEBE poder ver el historial de precios de un producto: la evolución del costo, por proveedor y con la fecha de cada lista, y la del precio de venta. Cada lista aplicada que cambia un costo suma un punto; nunca se pisa un precio.
- **RF-15**: Después de aplicar una lista, el sistema DEBE avisar qué productos hay que remarcar: los que cambiaron de precio de venta, los nuevos sin margen elegido y las subas de costo mayores a un umbral configurable; y permitir imprimir las etiquetas solo de los que cambiaron (RF-57). El aviso trae exactamente los productos afectados. [NEEDS CLARIFICATION: ¿a partir de qué porcentaje de suba del costo hay que avisar para revisar el producto (por ejemplo 15 %), y quién puede cambiar ese porcentaje?] [NEEDS CLARIFICATION: ¿«remarcar» es cambiar el precio escrito en la estantería de todo producto cuyo precio de venta cambió? La regla original hablaba además de productos con precio fijado a mano, que en el catálogo ya no existen; ¿hay algún otro caso que tenga que aparecer en el aviso?]
- **RF-16**: El sistema DEBE ayudar a decidir el margen con datos en vez de a ojo, por costeo por absorción: reparte los gastos fijos del negocio entre los productos, calcula el costo total de cada uno, compara el precio vigente con el que sale de ese costo y sugiere el margen, con su explicación (RF-13). Es de una etapa posterior: necesita los gastos fijos (RF-64). [NEEDS CLARIFICATION: ¿con qué criterio se reparten los gastos fijos (alquiler, sueldo, servicios, impuestos) entre los productos: por unidad vendida, por valor vendido, por rotación o por familia de productos?]
- **RF-17**: Los descuentos puntuales de un proveedor se DEBEN trasladar al precio de venta mientras duran: entran en el costo como un paso más y dejan de valer solos al terminar. [NEEDS CLARIFICATION: ¿cómo se entera el sistema de un descuento puntual: lo trae la lista del proveedor como oferta, lo carga alguien a mano, o las dos cosas? ¿Quién lo carga, hasta cuándo vale cuando el proveedor no dice la fecha de fin, y el precio de venta tiene que bajar siempre o solo si alguien lo aprueba?]
- **RF-18**: Se DEBE poder buscar proveedores y ver su ficha: datos de contacto, listas cargadas y qué venden. [NEEDS CLARIFICATION: ¿qué datos de contacto de un proveedor hay que guardar (nombre del vendedor, teléfono, WhatsApp, correo, dirección, CUIT, usuario de su portal) y quién puede verlos y cambiarlos?]
- **RF-19**: Toda venta DEBE ser múltiplo de $1.000, porque no hay billetes chicos para dar vuelto. El precio de venta que calcula el sistema se redondea para arriba a $1.000 y cada renglón de la venta también, incluido lo que se vende suelto; el redondeo figura en la explicación. La única excepción es el precio puesto a mano en una venta (RF-20b), incluido el del ítem libre: se respeta tal cual, su renglón no se redondea (vale precio × cantidad) y, si el importe del renglón no es múltiplo de $1.000, la venta muestra un aviso que lo dice. El aviso no impide cobrar y desaparece solo si el importe pasa a ser múltiplo de $1.000 (decisión 16 del 2026-10-10).

### Key Entities *(include if feature involves data)*

- **Proveedor**: quien vende. Guarda si sus precios incluyen IVA, sus descuentos general y por contado, cómo se lee su planilla (qué columna es qué), por qué canal y cada cuánto llega su lista, y sus datos de contacto.
- **Lista de precios**: cada archivo recibido de un proveedor, con su fecha, por dónde llegó, su situación (sin aplicar, aplicándose, aplicada, descartada), el resumen de cambios, los avisos y quién la cargó y quién la aplicó. El archivo original se conserva.
- **Producto**: lo que se vende. Guarda descripción, marca, código de barras, unidad de venta, margen elegido, foto y el proveedor del que sale su costo. Un producto absorbido por otro deja de estar activo y apunta al que lo reemplaza.
- **Precio de proveedor**: el costo de un producto según un proveedor en una lista: código del proveedor, precio de lista, descuentos aplicados con su explicación, costo, IVA y bulto. Es un histórico: el costo vigente es el más reciente y los anteriores no se tocan.
- **Descuento puntual**: una rebaja de un proveedor sobre uno o más productos, con su vigencia.
- **Sugerencia de duplicado**: par de productos que podrían ser el mismo artículo, con el motivo y lo que se decidió (sin resolver, unidos, distintos).
- **Vínculo entre computadora y celular**: la computadora vinculada a un celular por un rato, y cada código que el celular le manda.

El detalle está en [data-model.md](data-model.md) y el contrato del servidor en
[contracts/api.md](contracts/api.md).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Buscar en un catálogo de 100.000 productos responde en menos de 100 ms, sin conexión, en la notebook del local.
- **SC-002**: De 20 búsquedas reales tomadas del cuaderno de ventas, 19 encuentran el producto entre los tres primeros resultados.
- **SC-003**: Las listas reales de los proveedores cargados se leen completas, sin filas salteadas por error.
- **SC-004**: Cargar una lista (subir, revisar y aplicar) lleva menos de un minuto y no requiere manual.
- **SC-005**: Volver a cargar una lista ya aplicada no agrega ningún costo ni ningún producto.
- **SC-006**: El costo de diez productos elegidos a mano coincide con lo que se pagó en la factura.
- **SC-007**: Todo precio de venta calculado y todo renglón de venta sin precio a mano es múltiplo de $1.000 y nunca queda por debajo del precio calculado; un renglón con precio a mano que no es múltiplo de $1.000 siempre muestra su aviso.
- **SC-008**: Elegir un margen y ver el precio lleva un solo toque o una sola acción de teclado, y el precio se ve en menos de 100 ms.
- **SC-009**: El Vendedor o el Administrador explican cualquier precio que se ve sin abrir un Excel.
- **SC-010**: Unir dos productos y volver a separarlos deja cada venta, costo y movimiento de stock en el producto donde estaba.
- **SC-011**: Escanear el código de un producto cargado lleva menos de 3 segundos desde tocar escanear hasta ver el producto.
- **SC-012**: Sacar y subir una foto desde el celular lleva menos de 15 segundos.
- **SC-013**: Cambiar el orden de las columnas o agregar una fila arriba en la planilla de un proveedor no rompe su carga.
- **SC-014**: La lista de un proveedor con portal se actualiza sola una vez por semana, y la de uno que la manda por correo queda para revisar sin que nadie descargue nada.

## Assumptions

- **Roles.** En esta primera versión todos los usuarios son Administrador y el Administrador puede hacer todo (decisión 18 del 2026-10-10; RF-72). Las historias nombran al Administrador, al Vendedor o al Comprador para decir quién hace ese trabajo en el local, no para restringirlo; los escenarios que hablan de «un usuario que no es Administrador» quedan para cuando se definan los permisos de cada rol.
- **Las dos interfaces.** Todo lo que tiene interfaz se especifica para computadora y celular (ADR-014); lo que exige cada una está en [ux.md](ux.md).
- **Sin conexión.** Buscar, ver precios, elegir márgenes y escanear en el celular funcionan sin conexión (ADR-005); cargar y aplicar listas, unir duplicados, subir fotos y vincular el celular con la computadora necesitan conexión.
- **Las listas reales de los proveedores no son públicas** (RNF-43): la lectura completa de las listas reales se comprueba donde estén disponibles; para las pruebas automáticas se usan muestras anonimizadas.
- **La cámara real no se puede automatizar:** la lectura del código con la cámara se valida en el celular del local; las pruebas automáticas mandan el código por el mismo camino que usa el escáner.
- **Precio a mano en una venta** (RF-20b) y el registro de la venta pertenecen a la capacidad de ventas; acá solo está la regla que se les aplica: no se redondea y avisa (RF-19).
- **El stock en los resultados de búsqueda** pertenece a la capacidad de compras y stock.
- Depende de la capacidad de usuarios y acceso para saber quién hace cada cosa (RF-70 a RF-74) y de los gastos fijos (RF-64) para RF-16.
