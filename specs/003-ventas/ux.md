# UX: Ventas

Requerimientos de interfaz de la capacidad: qué tiene que poder hacer cada rol en cada
recorrido, qué necesita ver, en qué orden y con qué reglas. No fija un diseño: la forma
concreta la decide quien diseñe, dentro de estas reglas, de la constitución (principios II,
III, IV, V y IX) y del sistema visual. Las historias son las de la especificación de la
capacidad, con el mismo número.

## Reglas que valen para todos los recorridos

- **La vara es el cuaderno y la calculadora.** Un recorrido más lento que anotar en el
  cuaderno está mal, aunque sea más completo. Una venta de 3 productos lleva menos de 20
  segundos (RNF-02) y se aprende sin manual (RNF-01).
- **El orden es el del mostrador:** buscar → costo, margen y precio → cantidad → cobro. El
  precio va antes que la cantidad porque el cliente decide con el precio en la mano.
- **Nada obligatorio que el cuaderno no tenga:** producto, cantidad y precio. La fecha la
  pone el sistema. El cliente, el motivo y el comprobante son opcionales y nunca frenan.
- **Roles.** En esta versión todos los usuarios son Administrador y pueden hacer todo; el
  rol que nombra cada historia dice quién hace ese trabajo en el local.
- **En el celular y en la computadora.** Todo recorrido se hace completo en los dos; si son
  dos interfaces o una que se adapta lo decide el diseño (constitución, principio III).
  - *Computadora:* todo se opera con el teclado; el mouse nunca es la única forma. El foco
    está siempre donde sigue el trabajo, y después de cada acción vuelve solo a la búsqueda.
    Las teclas disponibles están a la vista, sin abrir una ayuda.
  - *Celular:* todo se alcanza con una mano, con el pulgar; lo que más se usa (agregar,
    cantidad, cobrar) queda en la zona de abajo. La cámara es el lector de códigos de
    barras. Nada se desplaza hacia el costado.
- **Sin ventanas de confirmación,** salvo para lo que no se puede recuperar.
- **Los avisos van en el lugar,** al lado de lo que hay que corregir, en castellano, dicen
  qué hacer y desaparecen solos cuando se corrige la causa.
- **Todo número calculado se puede tocar** (o alcanzar con el teclado) y explica de dónde
  sale, con los números de origen (RF-13).
- **Los importes** se leen de lejos y van sin centavos; en las explicaciones, con centavos.
- **Respuesta:** buscar y cambiar un margen responden en menos de 100 ms (RNF-07); lo que
  tarda muestra su avance (RNF-09).
- **Palabras del mostrador:** «cuenta corriente», nunca «fiado» (se abrevia solo donde no
  entra); «costo», «margen», «precio», «renglón», «No llevó», «ítem libre», «anulada».
  Los medios de pago se nombran «Efectivo», «Mercado Pago», «Tarjeta» y «Cuenta corriente».

## Estados que todo recorrido resuelve

| Estado | Qué exige la regla |
|---|---|
| Vacío | Dice qué hacer para empezar. Nunca un espacio en blanco |
| Cargando | Lo que tarda muestra su avance; lo que ya está en el dispositivo se usa sin esperar al servidor |
| Error | En el lugar, en castellano, con qué hacer; lo cargado no se pierde |
| Sin conexión | Buscar y vender funcionan igual. Un indicador siempre a la vista dice que no hay conexión y cuántos cambios están por enviar; al reconectar se envían solos y el indicador lo confirma |
| Éxito | Se ve sin leer letra chica y deja listo el paso siguiente sin ninguna acción de más |

## Historia 1: vender en el mostrador (Vendedor)

**Tiene que poder:** buscar un producto escribiendo o escaneando; agregarlo; ver su costo,
su margen y su precio; cambiar la cantidad y la unidad; quitar un renglón; ver el total;
elegir cómo paga el cliente; cobrar.

**Información a la vista, en este orden:**

1. La búsqueda, lista para escribir apenas se abre la venta.
2. Las sugerencias: descripción, marca y proveedor, stock y precio (o que no tiene precio).
3. Cada renglón: producto, costo, margen, precio por unidad, cantidad y unidad, subtotal.
   Si el stock queda negativo, el renglón lo avisa.
4. El total, siempre visible, también con muchos renglones.
5. Los medios de pago y la acción de cobrar.

**Computadora:** Enter agrega la sugerencia elegida, que se cambia con las flechas; la
búsqueda queda vacía y con el foco. La cantidad, el margen y el precio se cambian en el
renglón sin soltar el teclado. Con la venta armada, el Enter final la cierra.

**Celular:** un toque agrega la sugerencia; la cantidad sube y baja con un toque; un acceso
a la cámara al lado de la búsqueda lee el código de barras y agrega el producto. Cobrar y
el total quedan al alcance del pulgar.

**Estados:**

- *Vacío:* la venta nueva dice que se escriba el nombre del producto o se escanee el código.
- *Cargando:* mientras el catálogo baja por primera vez, la búsqueda lo dice y muestra el
  avance.
- *Error:* si el servidor no acepta la venta, el aviso dice qué está mal y la venta queda
  armada.
- *Éxito:* «Venta registrada», con el importe y cómo pagó; la venta queda vacía y la
  búsqueda lista para la siguiente.

## Historia 2: margen o precio a mano en la venta (Vendedor)

**Tiene que poder:** elegir el margen de un producto que no lo tiene; cambiar el de uno que
lo tiene; poner un precio a mano para esta venta; pedir la explicación del costo, del
precio y del subtotal.

**Información a la vista:** el costo; los cinco márgenes (300, 200, 100, 50 y 25 %) con el
vigente marcado; el precio que resulta; dónde poner el precio a mano, con un texto que diga
que vale solo para esta venta.

**Reglas:**

- Un renglón sin precio se distingue del resto y pide elegir el margen o poner el precio;
  los márgenes ya están a la vista, sin un paso más para abrirlos.
- Elegir un margen es un toque o una tecla, y el precio y el total cambian en el momento.
- El margen elegido queda guardado en el producto; el precio a mano, no. La interfaz deja
  clara la diferencia.
- Intentar cobrar con un renglón sin precio muestra «Hay productos sin precio», al lado de
  la acción de cobrar, y marca cuál es.

## Historia 3: cada renglón es múltiplo de $1.000, salvo el precio a mano (Vendedor)

**Tiene que poder:** entender por qué un renglón se cobra más que precio × cantidad; y, si
puso un precio a mano que no es múltiplo de $1.000, enterarse antes de cobrar.

**Reglas:**

- El subtotal que se muestra es el que se cobra. Cuando hubo redondeo, la explicación del
  subtotal lo dice con las palabras de la regla: «Redondeado para arriba a $2.000,00
  (múltiplo de $1.000,00) para no dar vuelto». Vale para lo calculado y para lo que se vende
  suelto.
- Un renglón con precio a mano no se redondea: se cobra precio × cantidad.
- Si el importe de ese renglón no es múltiplo de $1.000, el renglón muestra un aviso que lo
  dice, con el importe. El aviso es una alerta, no un error: se ve sin tocar nada, no pide
  cerrarlo, no impide cobrar y desaparece solo cuando el importe pasa a ser múltiplo de
  $1.000. Se distingue a la vista de un aviso que sí frena («Hay productos sin precio»).
- El total de la venta deja ver que no es múltiplo de $1.000 mientras haya un renglón con
  el aviso.

## Historia 4: cobrar con cada medio de pago (Vendedor)

**Tiene que poder:** elegir uno de los cuatro medios de pago con un toque o una tecla; si
es cuenta corriente, elegir el cliente por nombre; cobrar.

**Información a la vista:** los cuatro medios, con el elegido marcado; para cuenta
corriente, cada cliente con cuánto debe o que está al día.

**Computadora:** una tecla por medio de pago y otra para cobrar, todas a la vista; el
cliente se busca escribiendo.

**Celular:** los cuatro medios caben sin desplazar; al elegir cuenta corriente se pide el
cliente en el mismo gesto.

**Estados:**

- *Error:* cuenta corriente sin cliente muestra «Cuenta corriente: elegí el cliente» y no
  cobra.
- *Vacío:* si no hay clientes cargados, la elección de cliente lo dice y dice cómo cargar
  uno (capacidad 004).
- *Éxito:* el mensaje nombra el medio de pago; en cuenta corriente, también el cliente.

Qué se muestra cuando se cobra sin elegir un medio de pago depende de la pregunta abierta
de RF-21.

## Historia 5: vender sin conexión (Vendedor)

**Tiene que poder:** hacer todo lo de las historias 1 a 4 y anotar un «No llevó», sin
conexión y sin hacer nada distinto. Quien puede ver las ventas del día las ve también sin
conexión.

**Información a la vista:** el indicador de conexión, siempre: sin conexión, cuántos
cambios están por enviar («1 por enviar») y, al reconectar, «Sincronizado».

**Reglas:**

- Sin conexión no aparece ningún aviso que frene ni pida confirmar.
- El éxito de una venta sin conexión dice que quedó guardada en el dispositivo y que se
  envía sola.
- Una venta que está por enviar se distingue en las ventas del día.
- Si el servidor no acepta un cambio al reconectar, el Vendedor recibe el aviso con qué
  pasó y qué hacer; nada se descarta en silencio.
- Sin catálogo guardado y sin conexión, la venta lo dice y pide conectarse una vez.

## Historia 6: ítem libre y alta ahí mismo (Vendedor, Administrador)

**Tiene que poder (Vendedor):** cuando la búsqueda no encuentra nada, agregar lo escrito
como ítem libre; tipearle el precio; opcionalmente guardarlo como producto nuevo, con
familia y costo opcionales.

**Tiene que poder (Administrador):** ver la lista de ítems libres vendidos, con
descripción, precio, fecha y quién lo vendió.

**Reglas:**

- La búsqueda sin resultados ofrece ahí mismo agregar lo escrito como ítem libre, con las
  palabras «ítem libre».
- No más de 2 pasos de más que una venta normal: confirmar y tipear el precio. Después de
  confirmar, el foco queda en el precio.
- Guardarlo como producto nuevo es opcional y no interrumpe la venta: se puede cobrar sin
  resolverlo.
- *Computadora:* Enter sobre una búsqueda sin resultados agrega el ítem libre.
- *Vacío (lista del Administrador):* dice que no hay ítems libres para revisar.

## Historia 7: ventas del día y de días anteriores (Administrador)

**Tiene que poder:** abrir las ventas del día sin perder la venta que está armando; ver
cada venta con sus productos; ver los totales; elegir otra fecha.

**Información a la vista, en este orden:**

1. El total del día, la cantidad de ventas y el total por medio de pago.
2. Cada venta, las más nuevas primero: hora, medio de pago, cliente si es cuenta
   corriente, total.
3. De cada venta, cada producto en su renglón, como en el cuaderno: cantidad, producto,
   precio por unidad y subtotal.

**Reglas:**

- Las anuladas se ven, marcadas «anulada», y se distinguen a simple vista de las
  confirmadas.
- Una venta de varios productos se puede resumir en una línea, pero arranca desplegada
  (RNF-09).
- La fecha que se está mirando está siempre a la vista, y volver al día en curso es un
  solo paso.
- *Vacío:* un texto dice que todavía no hay ventas ese día.
- *Sin conexión:* se muestran las ventas guardadas en el dispositivo y se dice que pueden
  no estar todas.
- *Computadora:* se llega y se recorre con el teclado.

## Historia 8: anular una venta (Administrador)

**Tiene que poder:** anular una venta confirmada desde las ventas del día.

**Reglas:**

- Solo las ventas confirmadas ofrecen anular.
- Después de anular, la venta sigue en la lista, marcada «anulada», y los totales cambian
  en el momento.
- Si el servidor responde que la venta no existe o ya está anulada, el aviso lo dice con
  esas palabras.
- Si se pide confirmación o motivo depende de la pregunta abierta de RF-23. Si se piden,
  van en el lugar y se resuelven con el teclado en la computadora y con una mano en el
  celular.

## Historia 9: corregir una venta (Administrador)

**Tiene que poder:** cambiar la cantidad o el precio de un renglón de una venta reciente,
desde las ventas del día o de un día anterior.

**Información a la vista:** el valor anterior y el nuevo mientras corrige; el total nuevo
de la venta antes de guardar.

**Reglas:**

- Se corrige en el renglón, con los mismos controles de cantidad y precio que la venta.
- El total corregido sigue el redondeo de RF-19 y su explicación lo dice.
- Una venta corregida se distingue en la lista y deja ver qué cambió y quién lo cambió.
- Una venta anulada no ofrece corregir.

## Historia 10: lo que pidieron y no llevaron (Vendedor; consulta posterior)

**Tiene que poder (Vendedor):** con la venta armada, anotarla como «No llevó» con un toque
o una tecla; opcionalmente cargar el motivo.

**Tiene que poder (quien consulta):** ver lo anotado: fecha, producto o descripción, precio
ofrecido y motivo.

**Reglas:**

- «No llevó» está al lado de cobrar, es secundaria frente a cobrar y no pide confirmación.
- *Éxito:* «Anotado como consulta»; la venta queda vacía y la búsqueda lista.
- El motivo nunca es un paso obligatorio: anotar sin motivo cuesta un solo toque.
- *Computadora:* una tecla descarta la venta.
- *Vacío (vista de consultas):* dice que todavía no hay nada anotado.

Cómo se elige el motivo, cómo se agrupa la vista y si descartar anota siempre dependen de
las preguntas abiertas de RF-25.

## Historia 11: cambiar un producto por otro (Vendedor)

**Tiene que poder:** decir qué vuelve y qué sale; ver la diferencia a cobrar; elegir el
medio de pago; registrar el cambio.

**Información a la vista, en este orden:** lo devuelto con su importe; lo nuevo, que se
arma como una venta; la diferencia, siempre visible; el medio de pago.

**Reglas:**

- Lo nuevo se busca y se carga con los mismos gestos que una venta.
- La diferencia explica de dónde sale: importe de lo nuevo menos importe de lo devuelto.
- En las ventas del día el cambio se distingue de una venta común.

## Historia 12: pedido de algo que no hay en stock (Vendedor, Comprador)

**Tiene que poder (Vendedor):** anotar un pedido con producto, cantidad, nombre, teléfono y
día prometido; pasar a pedido la venta que tiene armada sin volver a cargarla; ver los
pedidos.

**Tiene que poder (Comprador):** ver lo que hay que conseguir para los pedidos, junto con
lo demás que hay que comprar.

**Información a la vista en la lista:** qué hay que conseguir, para quién, su teléfono y
qué día se le prometió; primero lo de fecha más próxima; lo vencido, distinguido.

**Reglas:**

- Nunca se pide seña ni importe cobrado.
- El día prometido se elige sin tipear una fecha completa.
- *Celular:* desde el pedido se puede llamar o escribirle al cliente con un toque.
- *Vacío:* dice que no hay pedidos de clientes y cómo se anota uno.

## Historia 13: presupuesto (Vendedor)

**Tiene que poder:** armar un presupuesto con los mismos gestos que una venta; guardarlo;
mandarlo por WhatsApp o generar el PDF; encontrarlo después; convertirlo en venta con un
toque.

**Información a la vista:** que lo que se está armando es un presupuesto y no una venta,
sin lugar a confusión; el total; hasta cuándo vale. En la lista de presupuestos: fecha,
cliente si lo tiene, total, vencimiento y si está vigente, vencido o convertido.

**Reglas:**

- Mismo orden y mismas teclas que la venta: quien sabe vender sabe presupuestar.
- Un presupuesto de 10 productos se arma y se envía en menos de 3 minutos.
- Convertir es un solo toque o una tecla y deja la venta lista para elegir el medio de
  pago y cobrar.
- Lo que se manda al cliente no muestra costo ni margen.
- *Vacío:* dice que no hay presupuestos y cómo armar uno.

## Historia 14: comprobante por WhatsApp (Vendedor, Administrador)

**Tiene que poder (Vendedor):** al cerrar una venta, mandar el comprobante por WhatsApp o
generar el PDF; hacerlo también desde una venta ya registrada.

**Tiene que poder (Administrador):** cargar los datos del negocio que lleva el comprobante.

**Reglas:**

- La opción aparece en el éxito de la venta y no agrega más de un paso; no usarla no
  cuesta nada: la venta siguiente arranca igual.
- El comprobante trae datos del negocio, fecha, productos con cantidad y precio, total y
  medio de pago; nunca costo ni margen.
- *Sin conexión:* la venta se registra igual; si el comprobante no se puede mandar, lo
  dice y se puede mandar después desde la venta.

## Historia 15: cargar el cuaderno (Administrador)

**Tiene que poder:** subir la planilla; revisar qué se va a cargar antes de confirmar;
descartar; ver el informe de diferencias de precio.

**Información a la vista:** antes de confirmar, cuántos renglones se leyeron, cuáles no y
por qué; en el informe, producto, precio del cuaderno, precio calculado y diferencia, con
los no reconocidos aparte.

**Reglas:**

- Nada se guarda hasta confirmar, y lo que tarda muestra su avance.
- Desde cada renglón del informe se llega al margen del producto para ajustarlo.
- *Error:* un renglón que no se puede leer dice cuál es y qué le pasa; no frena los demás.

## Historias 16 a 19: etapa posterior

Sus requerimientos de interfaz se escriben cuando se definan sus reglas (preguntas abiertas
de RF-24b, RF-30, RF-31 y RF-32). Lo que ya es regla:

- **Devolución (RF-24b, Vendedor):** el cliente elige entre reintegro y saldo a favor; las
  dos opciones se ofrecen juntas, con el importe.
- **Factura electrónica (RF-30, Vendedor):** pedirla nunca frena el cobro; una venta
  facturada se distingue en las ventas del día.
- **Venta online (RF-31):** en las ventas del día, una venta online se distingue de las
  del mostrador.
- **Otras ferreterías (RF-32):** la interfaz es la misma; nada en ella muestra datos de
  otro negocio.
