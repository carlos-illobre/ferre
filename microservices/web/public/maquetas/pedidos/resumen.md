# Depósito → Pedidos a proveedores: seis maquetas para Carlos

Las capturas, una al lado de la otra, están en `comparacion-compu.png` y `comparacion-celu.png`.
Cada maqueta se abre sola desde su `index.html` y toma lo común de `../../../_comun/`. Lo propio
de esta pantalla está en `propio/pedidos.css`: el mensaje tal como lo recibe el proveedor, la
barra de avance de un pedido y el lateral plegado. Las capturas se rearman con
`herramientas/capturas.py`.

Todas usan los mismos datos, y coinciden con los de Compras y Stock. Hoy es el lunes 19/10 y
compra Marcelo Ríos, el Comprador.

- **Bulonera Centro, borrador.** Lo armó «Qué pedir» con 6 renglones, por $237.270
  estimado:
  - 10 un. de tornillos T2 a $3.800;
  - 15 un. de tarugos S8 a $4.150;
  - 24 un. de mechas HSS 8 mm a $2.480;
  - 10 kg de clavos de 2" a $2.900;
  - 6 un. de puntas PH2 a $3.950;
  - 4 un. de cintas métricas a $6.200.

  Bulonera tarda 4 días, así que llegaría el jueves 22.
- **Distribuidora Oeste, enviado.** Salió el 14/10 con 9 renglones. Suele tardar 2 días, así
  que va 3 días demorado.
- **Acindar Distribución, recibido parcial.** Salió el 12/10 con 6 renglones. El 15/10
  llegaron 4 completos y 10 de los 20 kg de clavos de 3". Faltan 25 kg de alambre N°14 y
  10 kg de clavos, unos $114.000.
- **Para pedir.** Hay 28 productos por reponer. 13 ya están pedidos y 15 todavía no: 6 de
  Bulonera, 5 de Electro Lumen ($88.400) y 4 de Ferretera del Sur ($46.300). Dos de ellos
  son para un cliente: 2 lámparas LED para Roberto Giménez, prometidas para el jueves 22.
- **Cerrados en octubre.** Bulonera, recibido el 18/10. Ferretera del Sur, cerrado
  incompleto (llegaron 7 de 8). Electro Lumen, cancelado. Llegaron completos 9 de 11.

## Computadora

| | Idea en una frase | Ideas del catálogo |
|---|---|---|
| **1 · La mesa de pedidos** (evolución) | En una sola pantalla, de izquierda a derecha: los pedidos agrupados (sin mandar, por llegar, para pedir), el pedido abierto con sus renglones editables y el total que solo ve el Comprador, y el mensaje tal como le llega al proveedor, con «Mandar por WhatsApp» debajo. No hay hoja para revisar: el mensaje se ve mientras se arma. | 1, 2, 3, 4, 5, 6, 7, 8, 9 |
| **2 · Reponer en una pasada** (reinvención) | No se arman pedidos uno por uno: la pantalla es la planilla de «qué pedir», agrupada por proveedor. Se recorre con el teclado, se corrigen las cantidades en la celda y se tilda o destilda cada proveedor. A la derecha, la bandeja de salida junta los pedidos que quedan armados, y con F2 se mandan todos, uno detrás del otro. | 3, 6, 10, 11, 12, 13, 14, 15, 16 |
| **3 · El radar de entregas** (audaz) | Rompe el marco: no hay lateral, hay una barra pino arriba con Ctrl K, como en las audaces de Vender y Compras. Cada proveedor es una fila en una línea de tiempo del mes, y cada pedido es una barra con varias marcas: cuándo salió, cuándo se esperaba, qué llegó y cuánto se demora. Debajo, el pedido elegido muestra lo que falta y qué hacer: llegó el resto, reclamar, pedírselo a otro o cerrarlo incompleto. | 2, 5, 17, 18, 19, 20, 21, 22 |

## Celular

| | Idea en una frase | Ideas del catálogo |
|---|---|---|
| **1 · Lista** (evolución) | La misma idea que la compu 1, en el orden del pulgar. Arriba, lo que hay para pedir y lo que está en camino. Después, el borrador con «Mandar», lo que está por llegar con «Llegó» y el avance de lo parcial, y los proveedores para pedir. Abajo, fijo, «Armar un pedido» con el escáner al lado. | 1, 2, 7, 8, 23 |
| **2 · El mensaje** (reinvención) | El pedido se arma sobre el mensaje mismo. La pantalla es el WhatsApp que va a recibir Bulonera, y cada cantidad es una pastilla: se toca y abajo sube un − n + grande, con lo sugerido y de dónde sale. El total, que el proveedor no ve, va en una tira gris con candado. Abajo, «Mandar por WhatsApp» y copiar. | 3, 5, 9, 12, 24, 25 |
| **3 · Los sobres** (audaz) | Rompe el marco: no hay menú de abajo ni pestañas. Los pedidos que armó «Qué pedir» llegan como un mazo de sobres, uno por proveedor, con las fotos de lo que lleva y la cantidad encima. Se desliza para mandarlo por WhatsApp, a la izquierda para dejarlo para mañana, y se pasa al siguiente. Al pie, lo que está en camino, en anillos. | 4, 12, 18, 26, 27, 28, 29 |

**Qué rompen las audaces.**

- **Computadora:** saca el lateral y las pestañas, y en vez de una lista de pedidos muestra un
  calendario por proveedor.
- **Celular:** saca el menú de abajo y las pestañas, y en vez de una lista muestra un mazo de
  sobres, de a un pedido por vez.

## Cuál me gusta más

**Computadora: la 1, la mesa.** Es la que mejor cumple lo que pide la especificación:

- armar y mandar sin el mouse;
- ver el mensaje sin costos antes de mandar;
- los grupos «por llegar, sin mandar y cerrados»;
- «Llegó» con una sola acción.

Además, armar y mandar quedan en una sola pantalla, sin abrir nada, y eso ayuda a mandar un
pedido en menos de 3 minutos (SC-011). Le sumaría tres cosas:

- de la 2, el embudo de arriba («28 por reponer: 13 ya pedidos, 15 para pedir»), porque
  explica de un vistazo por qué hay que pedir;
- de la 2, mandar varios pedidos con F2;
- de la 3, la fila del pedido elegido cuando es un recibido parcial, con lo que falta y
  las cuatro salidas.

**Celular: la 2, el mensaje.** Lo que el Comprador revisa es lo que va a recibir el proveedor,
así que armarlo directamente sobre el mensaje elimina la hoja de «Revisar y mandar» (decisión
52) sin perderla: se ve todo el tiempo. Además se arma con una mano: tocar la cantidad y usar
el − + grande. La 1 queda como la entrada de Pedidos, y desde «Mandar» se llega a la 2.

La 3 del celular es la que más ganas daría de usar: pedir es pasar sobres. Necesita que la
sugerencia de «qué pedir» (RF-54) ya esté hecha, y la primera tanda la dejó para después
(decisión 52).

## Lo que hay que mirar con la especificación

- **Pestañas de Depósito.** La guía común dice «Stock · Compras · Contar». La decisión 68 dice
  «Inventario, Ingreso, Estanterías, Pedidos», y la 56 que Depósito abre en Pedidos (después
  la 68 lo cambió a Inventario). Usé «Stock · Compras · Pedidos · Contar», igual que la compu 2
  de Compras.
- **Lateral plegado.** Las compu 1 y 2 usan el lateral de 72 px, que la guía permite para las
  pantallas que piden ancho. Si se quiere el lateral entero, la compu 1 tiene que achicar la
  columna del mensaje.
- **Armar desde la sugerencia.** La decisión 52 deja «armar desde Qué pedir» para después
  (espera a RF-54). Las seis variantes lo muestran porque el encargo pide «desde lo que hay que
  reponer». Sin RF-54, la compu 1 y la celu 1 y 2 siguen valiendo con un pedido armado desde
  cero; la compu 2 y la celu 3 necesitan la sugerencia.
- **Mandar varios a la vez** (compu 2) y **dejarlo para mañana** (celu 3) no están en la
  especificación. Tampoco lo están **«Reclamar lo que falta»** y **«Pedírselo a otro»**
  (compu 3). Tampoco lo está lo que tarda cada proveedor, ni la fecha en que llegaría un
  pedido: los dos se calculan con los pedidos y las compras que ya se registran.
- **Correo y PDF.** La historia 7 los pide, y la decisión 52 los deja para una tanda
  posterior. No los dibujé: solo WhatsApp y copiar el texto.
- **Quien solo registra ingresos** ve los pedidos por llegar, sin importes y sin poder
  cambiarlos (escenario 16). Ninguna maqueta dibuja esa vista. En la compu 1 sería la lista sin
  la columna del medio ni la de la derecha.

## Cómo se mueve (una línea por interacción)

- **Cambiar una cantidad:** el número rueda (200 ms) y el estimado del renglón y el total ruedan
  detrás. En el celular 2, la pastilla del mensaje se pinta de pino y el − + sube desde abajo
  (320 ms, `--curva`). Cada toque vibra 10 ms.
- **Agregar un producto escaneando:** el renglón entra desde 8 px abajo con rebote corto, y su
  borde se pinta de verde 1 s. En la compu 1 aparece a la vez en la tabla y en el mensaje.
- **Tildar o destildar un proveedor (compu 2):** su sobre de la bandeja entra o se va
  deslizándose (200 ms), y el botón cambia de «Mandar 2» a «Mandar 3» rodando el número.
- **Mandar por WhatsApp:** el botón se llena de izquierda a derecha y se abre WhatsApp. Al
  volver, el pedido baja del grupo «Sin mandar» al de «Por llegar» (320 ms), su pastilla pasa
  de «borrador» a «enviado» con un fundido, y aparece la tostada «Pedido enviado a Bulonera
  Centro». En el celular, vibración doble.
- **Deslizar el sobre (celu 3):** la perilla arrastra con el dedo, y pasada la mitad el sobre se
  inclina y sale volando hacia la derecha. El sobre de atrás sube a ocupar su lugar (320 ms,
  `--rebote`) y los puntos de arriba avanzan. Hacia la izquierda, el sobre se va de lado con
  «Mañana».
- **Copiar el texto:** el ícono se vuelve un tilde por 1,5 s. El pedido no cambia de estado: el
  aviso «¿Ya lo mandaste? Marcalo enviado» aparece abajo, sin tapar nada.
- **Llegó la mercadería:** el renglón del pedido se abre hacia la derecha y se convierte en el
  ingreso precargado (transición compartida, 320 ms). Al volver, la barra de avance crece hasta
  lo que llegó.
- **Radar (compu 3):** al abrir, las barras crecen de izquierda a derecha en orden de proveedor
  (60 ms entre una y otra). La raya de «Hoy» late suave una vez. Con ↑ ↓ se cambia el pedido
  elegido y el panel de abajo cambia con un fundido corto.
- **Cerrar incompleto:** la parte ámbar de la barra se vuelve gris (200 ms), la pastilla pasa a
  «cerrado incompleto», y por 4 s aparece una tostada pino con «Deshacer». No pide confirmar.

## Autocrítica (lo que corregí antes de mostrar)

- **Compu 1:**
  - la tabla del pedido no entraba con el lateral entero y los nombres quedaban partidos en
    cinco renglones: plegué el lateral a 72 px y pasé el costo unitario a la línea de detalle;
  - el mensaje se cortaba arriba: lo acorté a «Pedido de Ferrebress · lun 19/10» y las
    descripciones a lo que escribiría un comprador;
  - las cifras de arriba partían el texto en tres renglones: dejé un número y una frase corta
    por tarjeta.
- **Compu 2:**
  - la columna derecha se salía por abajo: compacté los sobres y lo que está en camino;
  - el embudo tenía un tercer color naranja para «lo que pidió un cliente», y el naranja es
    solo para la acción: lo saqué y el cliente se marca con una pastilla pino en su renglón.
- **Compu 3:**
  - el hito «llegó una parte» tapaba el texto de la barra: corrí el texto;
  - los fines de semana estaban mal ubicados: el 1/10/2026 es jueves, así que caen en 3-4,
    10-11, 17-18 y 24-25;
  - el título del panel partía «Distribución» en dos renglones: le di más ancho.
- **Celular 1:**
  - lo de «En camino» partía en tres renglones: dejé solo «1 demorado», en ámbar;
  - al borrador le sobraba texto y se cortaba: dejé el estado y el total.
- **Celular 2:** el − + flotaba encima de los renglones y tapaba los clavos. Lo pasé al pie del
  chat, como una hoja, con el nombre del producto y de dónde sale lo sugerido.
- **Celular 3:**
  - los sobres de atrás no se veían: los anclé arriba para que asomen;
  - el «$» del total caía en otro renglón;
  - el texto de «Deslizá» quedaba debajo de la perilla.
- **Lo más flojo que queda:**
  - en la compu 1 el detalle de cada producto se corta en el primero;
  - en la compu 3 lo ámbar rayado ocupa bastante superficie: si a Carlos le parece mucho
    color, puede ir en un contorno ámbar sobre blanco;
  - en la celu 3, el producto que es para un cliente no se distingue en la grilla de fotos:
    le falta una marca, como en la compu 2.

## Catálogo de ideas

Cada una se puede tomar o descartar sola.

1. **Grupos de la lista: sin mandar, por llegar, para pedir, cerrados.** Qué resuelve: de un
   vistazo se ve qué espera algo del Comprador y qué espera al proveedor. Variantes: compu 1,
   celu 1. Patrón: la bandeja de Linear por estado. Toques ahorrados: 1, porque no hay que
   filtrar. Fuera de la especificación: no, es la historia 7 con un grupo más, «para pedir».
2. **Cifras arriba.** Muestran lo que hay para pedir, lo que está en camino (con su importe y
   los demorados) y cuántos pedidos llegaron completos. Qué resuelve: el resumen antes del
   detalle. Variantes: compu 1, celu 1 y compu 3 (como pastillas). Patrón: Shopify Admin.
   Toques ahorrados: 0. Fuera de la especificación: «llegaron completos» sí.
3. **El mensaje se ve mientras se arma**, en vez de en una hoja al final. Qué resuelve:
   revisar lo que recibe el proveedor sin un paso más. Variantes: compu 1 y celu 2. Patrón:
   la vista previa en vivo de Stripe Checkout. Toques ahorrados: 1. Fuera de la
   especificación: cambia la forma de la decisión 52 (B), no el fondo.
4. **El total, con candado: «solo lo ves vos».** Qué resuelve: deja claro que el costo no
   viaja en el mensaje. Variantes: todas. Patrón: los campos privados de Notion. Toques
   ahorrados: 0. Fuera de la especificación: no.
5. **Cuándo llegaría.** Calcula «llegaría el jueves 22» con lo que ese proveedor tarda en
   promedio. Qué resuelve: poder prometerle una fecha al cliente y ver cuándo algo está
   demorado. Variantes: compu 2 y 3, celu 2 y 3. Patrón: la fecha estimada de entrega de
   Amazon. Toques ahorrados: 0. Fuera de la especificación: sí.
6. **Mandar con el teclado:** Alt W para WhatsApp, Alt C para copiar y F2 para mandar todo.
   Qué resuelve: armar y mandar sin el mouse (ux.md). Variantes: compu 1 y 2. Patrón: Linear.
   Toques ahorrados: 2. Fuera de la especificación: no.
7. **Demorado.** Un pedido enviado que pasó lo que suele tardar se marca en ámbar con los
   días. Qué resuelve: saber a quién reclamar sin hacer cuentas. Variantes: todas. Patrón: el
   vencido de Stripe Invoices. Toques ahorrados: 0. Fuera de la especificación: sí.
8. **«Llegó» en el renglón del pedido por llegar.** Abre el ingreso precargado. Variantes:
   compu 1 (al abrirlo), celu 1 y compu 3 («Llegó el resto»). Patrón: Shopify, recibir una
   orden de compra. Toques ahorrados: 1. Fuera de la especificación: no.
9. **La tecla «/» o «Escanear» siempre dentro del pedido** para sumar un renglón. Variantes:
   compu 1, celu 2. Patrón: Shopify POS. Toques ahorrados: 1. Fuera de la especificación: no.
10. **El embudo «28 por reponer: 13 ya pedidos, 15 para pedir».** Qué resuelve: no pedir dos
    veces lo que ya está en camino, y ver el tamaño del trabajo. Variantes: compu 2. Patrón:
    los embudos de Stripe y Shopify. Toques ahorrados: 0. Fuera de la especificación: sí.
    Supone que «qué pedir» descuenta lo que ya está pedido.
11. **La planilla de qué pedir, agrupada por proveedor, editable en la celda.** Variantes:
    compu 2. Patrón: Airtable y Excel. Toques ahorrados: 3 por pedido, porque no hay que abrir
    cada uno. Fuera de la especificación: no, es RF-54 con el teclado.
12. **De dónde sale el número.** Al tocar la cantidad sugerida, explica «24 un. cubren 4
    semanas», con las ventas en barras. Variantes: compu 2 y celu 2. Patrón: los «por qué
    veo esto» de Google. Toques ahorrados: 0. Fuera de la especificación: no (RF-54,
    escenario 4). La fórmula sigue preguntada.
13. **Tildar o destildar un proveedor entero.** Variantes: compu 2. Patrón: Gmail. Toques
    ahorrados: 1. Fuera de la especificación: no.
14. **Bandeja de salida con varios pedidos y «Mandar 2 pedidos» (F2).** Abre WhatsApp con
    cada uno, de a uno. Variantes: compu 2. Patrón: la bandeja de salida del correo. Toques
    ahorrados: 2 por pedido. Fuera de la especificación: sí.
15. **El más barato a la vista:** «Distribuidora Oeste lo tiene a $4.390» en el renglón.
    Variantes: compu 2 y compu 3 («también lo vende…»). Patrón: comparadores de precio.
    Toques ahorrados: 1. Fuera de la especificación: no (RF-54, escenario 5).
16. **El renglón de un cliente**, con pastilla pino, para quién es y qué día se le prometió.
    Variantes: compu 2. Patrón: las etiquetas de Shopify. Toques ahorrados: 0. Fuera de la
    especificación: no (RF-54, escenario 7).
17. **La línea de tiempo por proveedor**: cada pedido es una barra, con la raya de hoy y los
    fines de semana. Qué resuelve: seguir lo que llega y lo que falta sin abrir pedido por
    pedido. Variantes: compu 3. Patrón: el Gantt de Linear Projects y de Asana. Toques
    ahorrados: 2. Fuera de la especificación: sí.
18. **Lo parcial dibujado.** Un hito medio lleno donde llegó una parte, y rayado ámbar lo que
    sigue esperando. En el celular, anillos. Variantes: compu 3 y celu 3. Patrón: el anillo
    de Apple Fitness. Toques ahorrados: 0. Fuera de la especificación: no.
19. **Lo que tarda cada proveedor y cuántos entregaron completo** («tarda 3 días · completo 5
    de 7»). Qué resuelve: elegir proveedor también por cumplimiento, no solo por precio.
    Variantes: compu 3. Patrón: la reputación de Mercado Libre. Toques ahorrados: 0. Fuera de
    la especificación: sí.
20. **«Reclamar lo que falta»**: abre WhatsApp con un mensaje que lista solo los renglones
    sin llegar. Variantes: compu 3. Patrón: el seguimiento de pedidos de Shopify. Toques
    ahorrados: 3. Fuera de la especificación: sí.
21. **«Pedírselo a otro»**: lo que falta pasa a un borrador para el proveedor que sigue en
    precio. Variantes: compu 3. Patrón: el pedido alternativo de los sistemas de compras.
    Toques ahorrados: 4. Fuera de la especificación: sí.
22. **Los borradores y las sugerencias en la línea de tiempo**, en contorno punteado, desde
    hoy hasta cuándo llegarían. Variantes: compu 3. Patrón: lo previsto en Google Calendar.
    Toques ahorrados: 0. Fuera de la especificación: sí.
23. **Escanear desde la lista de pedidos**: arma o completa el pedido del proveedor de ese
    producto. Variantes: celu 1. Patrón: Shopify POS. Toques ahorrados: 2. Fuera de la
    especificación: en parte, porque la especificación escanea dentro del pedido.
24. **Armar sobre el mensaje:** cada cantidad del mensaje es una pastilla que se toca.
    Variantes: celu 2. Patrón: los campos de iMessage y la edición en el lugar de Notion.
    Toques ahorrados: 1, porque no hay un paso de revisar. Fuera de la especificación: no.
25. **Un − + grande en una hoja abajo**, para el pulgar y con guantes, con el nombre y la
    sugerencia. Variantes: celu 2. Patrón: los ajustes de Apple Wallet. Toques ahorrados: 0.
    Fuera de la especificación: no.
26. **El mazo de sobres:** un pedido por proveedor, de a uno, con los puntos de avance arriba.
    Variantes: celu 3. Patrón: las historias de Instagram y la pila de Tinder. Toques
    ahorrados: 2 por pedido. Fuera de la especificación: sí, es otra forma de navegar.
27. **Las fotos de lo que lleva, con la cantidad encima.** Variantes: celu 3. Patrón: el
    carrito de Rappi. Toques ahorrados: 0. Fuera de la especificación: no.
28. **Deslizar para mandar**, como el cobro deslizable que Carlos ya eligió en Vender
    (decisión 148). Evita mandar un pedido por un toque sin querer. Variantes: celu 3. Patrón:
    «deslizá para pagar» de las billeteras. Toques ahorrados: 1. Fuera de la especificación:
    no.
29. **«Mañana»**: el sobre se deja para el día siguiente sin borrarlo. Variantes: celu 3.
    Patrón: posponer un correo en Gmail. Toques ahorrados: 1. Fuera de la especificación: sí.
