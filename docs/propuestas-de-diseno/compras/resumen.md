# Depósito → Compras: seis maquetas para Carlos

Las capturas, una al lado de la otra, están en `comparacion-compu.png` y `comparacion-celu.png`.
Cada maqueta se abre sola desde su `index.html` y toma lo común de `../../../_comun/`. Lo propio
de esta pantalla está en `propio/`: la foto de la factura, que es una factura armada en HTML
(`herramientas/factura.html`) y fotografiada, y el código QR.

Todas usan los mismos datos, para que se comparen igual con igual:

- **La factura que llega.** Bulonera Centro, Factura A 0004-00012345 del 18/10, con 5 renglones
  que suman $253.220 sin IVA:
  - los tornillos y las mechas, iguales a la lista;
  - los tarugos, 5 % más caros que la lista;
  - los clavos, 5 % más baratos que la lista;
  - las arandelas, que no están en el catálogo.

  La factura corresponde al pedido del 14/10.
- **La semana.** Se gastaron $615.350 en 4 compras, y hubo una anulada de $58.000 que no suma.
- **Lo que se les debe.** $1.095.500 en total, de los cuales $186.500 están vencidos: los debe
  Ferretera del Sur, y vencieron hace 5 días.
- **Los pedidos.** Hay 2 por llegar: Distribuidora Oeste lo mandó y Acindar Distribución lo
  entregó a medias.

## Computadora

| | Idea en una frase | Ideas del catálogo |
|---|---|---|
| **1 · El escritorio de compras** (evolución) | Arriba, cuatro números con significado: lo gastado en la semana con barras por día, los pedidos por llegar, lo que se les debe y lo vencido en rojo. Debajo, las compras recientes con la miniatura de su comprobante, y a la derecha el QR siempre listo para fotografiar la factura, lo que está por llegar y lo que vence primero. | 1, 2, 3, 4, 5, 6, 7, 8 |
| **2 · La bandeja de facturas** (reinvención) | Fotografiar no es un paso dentro del ingreso: el que recibe saca la foto en el depósito y la foto cae en una bandeja «Por registrar», como un correo. El Comprador la abre y ve la foto a la izquierda, con cada renglón leído marcado encima, y a la derecha lo leído, el pedido con el que coincide y el único renglón que hay que revisar. Paga a 30 días y registra con F2. | 3, 9, 10, 11, 12, 13, 14, 15, 16, 17 |
| **3 · El camino de la mercadería** (audaz) | Rompe el marco: no hay lateral, hay una barra pino arriba con Ctrl K, como en la audaz de Vender. Compras deja de ser una lista y pasa a ser un tablero de cinco columnas (Para pedir → Por llegar → Llegó → A pagar → Pagado). Cada compra es una tarjeta que avanza de columna, y lo que se debe es la cuarta columna, con su barra de vencimientos. | 3, 9, 12, 18, 19, 20, 21, 22, 23 |

## Celular

| | Idea en una frase | Ideas del catálogo |
|---|---|---|
| **1 · Resumen** (evolución) | La misma pantalla que la compu 1, en el orden del pulgar. Arriba, lo gastado en la semana y lo que se debe, con lo vencido en rojo. En el medio, los pedidos por llegar, cada uno con su «Llegó». Abajo, las compras recientes. Fija al alcance del pulgar queda «Sacale foto a la factura», con el escáner al lado. | 1, 2, 5, 6, 24 |
| **2 · La cámara lee** (reinvención) | Registrar una compra empieza con la cámara. Arriba se elige si es Factura, Remito o Sin papel, como los modos de la cámara del iPhone. Al disparar, los renglones se pintan de verde sobre el papel y sube una hoja con lo leído: muestra primero lo que cambió de costo y lo que hay que revisar, y debajo la forma de pago y «Registrar compra». | 3, 10, 11, 12, 13, 25, 26, 27 |
| **3 · El proveedor es un chat** (audaz) | Rompe el marco: no hay menú de abajo ni pestañas. Cada proveedor es una conversación, como en WhatsApp, y arriba está la fila de proveedores con sus insignias (rojo si hay algo vencido). En el hilo de Bulonera Centro se ven el pedido que salió, la foto de la factura que sacó Marcelo y la respuesta del sistema: «La leí: coincide con tu pedido», con Registrar. La deuda con ese proveedor está en el encabezado. | 9, 10, 28, 29, 30, 31 |

**Qué rompen las audaces.**

- **Computadora:** saca el lateral, y la lista de compras más los paneles se reemplazan por un
  tablero de proceso que junta RF-50, RF-55 y RF-56 en una sola vista.
- **Celular:** saca el menú de abajo y las pestañas. Ordena todo por proveedor en vez de por
  tipo de cosa (compra, pedido o deuda).

## Cuál me gusta más

**Computadora: la 2, la bandeja.** El trabajo más largo de la capacidad es tipear facturas, y
la bandeja lo convierte en revisar. Además separa a quien recibe (saca la foto con la caja en
la mano) de quien registra (revisa sentado, cuando puede). Encaja con dos decisiones:

- la del número de factura, que no se tipea y se lee de la foto (decisión 32);
- la de una pantalla por proceso, porque la pantalla es solo para recibir (decisión 67).

Le sumaría la fila de números de la 1 encima de la bandeja cuando no hay ninguna factura
abierta.

**Celular: la 2, la cámara.** En el depósito el celular se usa para recibir mercadería, y en
la 2 eso es apuntar, disparar y revisar lo marcado. Lo de la 1 (los números de la semana, lo
que está por llegar y lo que se debe) queda como la pantalla de Compras cuando se cierra la
cámara.

La 3 de cada dispositivo vale como idea para el futuro. Sobre todo el chat: los pedidos ya
salen por WhatsApp (decisión 52), así que ordenar por proveedor es como lo piensa quien compra.

## Lo que hay que mirar con la especificación

- **Decisión 67.** Dice que las compras recientes pasan a «Cómo va el negocio» y que el
  ingreso queda solo para recibir. El encargo pidió compras recientes, pedidos y deuda en esta
  pantalla, y así lo dibujé. La variante 2 de la computadora es la que mejor respeta la
  decisión: lo reciente se reduce a «Registradas hoy» y lo que se debe a un recuadro chico.
- **Pestañas de Depósito.** La guía común dice «Stock · Compras · Contar», y la decisión 68 dice
  «Inventario, Ingreso, Estanterías, Pedidos». Usé las de la guía. La compu 2 suma «Pedidos»
  como pestaña aparte.
- **Coincidencia con el pedido.** Que la foto encuentre sola el pedido que coincide (idea 10)
  no está en RF-51. RF-55 solo dice que el ingreso se precarga desde el pedido.
- **Cuándo vence.** Calculé los vencimientos desde la fecha del comprobante (18/10 + 30 días =
  17/11). Desde qué fecha se cuenta el plazo sigue preguntado (historia 8, escenario 8).
- **Varias hojas o un PDF.** El botón «Otra hoja» de la compu 2 y «Soltá una foto o un PDF» de
  la compu 3 suponen que sí se pueden cargar, y eso está preguntado (historia 5, escenario 9).

## Cómo se mueve (una línea por interacción)

- **La foto llega a la computadora (QR):** el código late suave mientras espera. Cuando el
  celular saca la foto, la miniatura entra volando a la bandeja (320 ms, `--curva`) y la
  insignia de Compras salta.
- **Leyendo:** sobre el papel, una línea pino baja como un escáner (1 s). Cada renglón leído se
  pinta de verde en orden, con 60 ms entre uno y otro, y su fila de la tabla entra desde 8 px
  abajo. El dudoso se pinta de ámbar al final y el celular vibra 10 ms.
- **Pasar el mouse o el foco por una fila (compu 2):** se resalta en pino su renglón en la foto,
  y la foto se desplaza sola hasta mostrarlo.
- **Resolver el renglón dudoso:** el ámbar se funde a blanco (200 ms) y el contador «1 para
  revisar» rueda a 0.
- **Elegir cómo se paga:** el segmento se desliza (200 ms) y la fecha de vencimiento rueda sus
  dígitos.
- **Registrar:** el botón se llena de izquierda a derecha y se dibuja el tilde. La tarjeta se
  va a «Registradas hoy» (compu 2) o a la columna «A pagar» (compu 3), y lo gastado en la semana
  rueda hacia arriba. Celular: vibración doble y la cámara queda lista para la próxima factura.
- **«Llegó» en un pedido:** el renglón del pedido se abre hacia la derecha y se convierte en la
  compra precargada (transición compartida, 320 ms).
- **Marcar pagada:** la tarjeta se colapsa (200 ms) y lo que se debe y lo vencido ruedan hacia
  abajo. Durante 4 s aparece una tostada pino con «Deshacer».
- **Chat (celular 3):** la respuesta del sistema entra como una burbuja nueva, con los tres
  datos apareciendo de a uno. Registrar la convierte en un renglón chico «Compra registrada ·
  $253.220».

## Autocrítica (lo que corregí antes de mostrar)

- **Compu 1:**
  - las tarjetas de arriba partían el texto en tres renglones y la columna derecha se cortaba
    abajo: acorté los textos, achiqué el QR y bajé el alto de las filas;
  - el detalle de cada compra repetía el número de comprobante, que igual se lee en la foto: lo
    saqué y dejé cuándo, el tipo de comprobante y cuántos renglones.
- **Compu 2:**
  - la barra de pago se salía por la derecha: hice los segmentos más cortos y el total más
    simple;
  - debajo de la foto quedaba un hueco: sumé el control «los renglones suman lo mismo que el
    subtotal de la factura», que da confianza sin abrir nada.
- **Compu 3:**
  - las tarjetas desbordaban su columna y las pastillas repetían el nombre de la columna: saqué
    las pastillas;
  - las columnas tenían el pie vacío: sumé ayudas para soltar ahí y la barra de vencimientos.
- **Celu 2:** el botón Registrar quedaba cortado por el borde: subí la hoja y achiqué el papel.
- **Celu 3:** el hilo empezaba cortado: dejé un solo mensaje del pedido.
- **Lo más flojo que queda:**
  - la factura es un papel armado, no una foto real: con una foto de una factura de verdad, con
    luz despareja, la compu 2 y el celu 2 se ven más creíbles;
  - la compu 1 sigue siendo la más «panel de control» de las tres: densa y correcta, pero sin
    una idea que la haga memorable.

## Catálogo de ideas

Cada idea se puede tomar o descartar por separado. La columna «Ahorra» cuenta toques o teclas
sobre la tarea más frecuente: registrar una factura de 5 renglones.

- **Hoy, a mano:** elegir el proveedor, el comprobante y la fecha, y después por cada renglón
  buscar, Enter, cantidad y costo. Son unas 25 acciones.
- **Con la foto, según la especificación:** sacar la foto, revisar y registrar, pero no dice
  cómo se revisa.

| # | Idea | Problema que resuelve | Variantes | Patrón de | Ahorra | ¿Fuera de la spec? |
|---|---|---|---|---|---|---|
| 1 | Cuatro números arriba: lo gastado en la semana (con barras por día), los pedidos por llegar, lo que se les debe y lo vencido teñido de rojo | Saber cómo está todo sin abrir tres pantallas | C1, celu 1 | Stripe (inicio), Shopify | 2–3 navegaciones | No (RF-50, RF-56) |
| 2 | Miniatura del comprobante en cada compra reciente; «Sin comprobante» con su ícono de cuaderno | Reconocer la compra de un vistazo y leer el número en la foto | C1, celu 1 | Apple Fotos, Expensify | 1 | No |
| 3 | El QR siempre visible en la pantalla de compras, con el tiempo que le queda | Llevar la foto a la computadora sin buscar un botón | C1, C2 (botón), C3 (botón) | Continuity Camera, WhatsApp Web | 1 | No (RF-50) |
| 4 | Una compra anulada, gris y con el importe tachado, con «no suma» | Ver la anulada sin confundirla con un gasto | C1 | Bancos (movimiento revertido) | — | No |
| 5 | «Llegó» en cada pedido por llegar, que arma la compra con lo pedido | Recibir un pedido en un toque | C1, C3, celu 1 | Shopify (recibir inventario) | 3–5 | No (RF-55) |
| 6 | «Vence primero»: lo que hay que pagar, ordenado, con «venció hace 5 días» | No atrasarse con un proveedor | C1, C2, C3 | Wallet (próximo pago) | 1 | No (RF-56) |
| 7 | Atajo Alt N para registrar una compra y Alt P para armar un pedido | Hacerlo todo con el teclado | C1, C3 | Linear | 1 | No |
| 8 | Filtros de las compras: esta semana, sin pagar, anuladas | Encontrar rápido lo que hay que pagar | C1 | Gmail (pestañas) | 1 | No |
| 9 | **Bandeja «Por registrar»**: las fotos que se sacan en el depósito esperan ahí, cada una con su estado (leída, cuántas para revisar, no se pudo leer) | Recibir y registrar son dos momentos y dos personas | C2, C3 (columna «Llegó»), celu 3 | Linear (bandeja), Expensify | Recibir: 1 toque | **Sí** |
| 10 | **La foto encuentra sola el pedido que coincide** y dice qué llegó de más o de menos | Controlar lo que llegó contra lo pedido sin cotejar a mano | C2, C3, celu 2, celu 3 | Conciliación de Xero | Elegir el pedido: 1–2 | **Sí** (RF-51 + RF-55) |
| 11 | La foto al lado, con cada renglón leído marcado encima (verde si se unió, ámbar si es dudoso) | Confiar en lo leído comparando con el papel | C2, celu 2 | Google Lens, Dext | — | No (ux, historia 5) |
| 12 | Solo se mira lo que importa: «1 de 5 para revisar»; lo igual a la lista queda como «y 2 más iguales» | No revisar 20 renglones uno por uno | C2, C3, celu 2 | Gmail (lo importante primero) | 15–20 en una factura larga | No |
| 13 | El renglón dudoso con dos salidas a la vista: «Es un producto que tengo» o «Crear como nuevo» | Resolverlo ahí, sin menús | C2, celu 2 | Notion (crear desde la búsqueda) | 1 | No (RF-51) |
| 14 | Control «los renglones suman igual que el subtotal de la factura» | Saber que no se perdió ni se leyó mal un renglón | C2 | Planillas (control de suma) | — | **Sí** |
| 15 | Diferencia contra la lista con flecha y palabra: «↑ +5 %» en ámbar, «↓ −5 %» en verde, «= lista» en gris | Ver qué subió sin depender solo del color | C2, celu 2 | Stripe (variación) | — | No |
| 16 | Cantidad recibida con «pedí 20» debajo | Ver si llegó todo en el mismo renglón | C2 | Shopify (recepción) | — | No (RF-55) |
| 17 | La forma de pago como segmentos (Adelantado, A 30 días, A 60 días) junto al total, ya elegida como la última vez con ese proveedor | Decirlo sin un paso más | C2, celu 2 | Mercado Pago (cuotas) | 1 | En parte (lo de recordar la última está preguntado) |
| 18 | **Tablero de cinco columnas**: Para pedir → Por llegar → Llegó → A pagar → Pagado | Ver toda la compra, desde que falta algo hasta que se paga, en una vista | C3 | Linear, Trello | Navegar entre pedidos, compras y deuda: 2–4 | **Sí** (marco) |
| 19 | Barra pino arriba con «Ir a… Ctrl K», sin lateral | Más ancho y navegación con el teclado | C3 | Linear, GitHub | 1–2 | **Sí** (marco) |
| 20 | Un pedido entregado a medias con su barra «4 de 6» y lo que falta escrito | Saber qué reclamar | C3, celu 1 | Seguimiento de envíos | 1 | No (RF-55) |
| 21 | Barra apilada de vencimientos: vencido, próximos 7 días, después | Ver cuánto dinero hay que tener esta semana | C3 | Wallet, presupuestos | — | **Sí** |
| 22 | Columna «Pagado» punteada y tenue | Lo terminado no compite con lo pendiente | C3 | Trello (archivo) | — | No |
| 23 | Soltar una foto o un PDF en la columna «Llegó» | Facturas que llegan por correo | C3 | Dropbox | 2 | Preguntado (historia 5, escenario 9) |
| 24 | Botón grande «Sacale foto a la factura» en la barra fija, con el escáner al lado | Lo de todos los días al alcance del pulgar | celu 1 | Mercado Pago (cobrar con QR) | 1 | No |
| 25 | **El tipo de comprobante como modo de cámara** (Factura, Remito, Sin papel) | Elegir el comprobante con el mismo gesto de sacar la foto | celu 2 | Cámara del iPhone (modos) | 1 | No |
| 26 | Esquinas verdes que encuadran el papel y la pastilla «Leída · 5 renglones» | Saber que la foto sirvió antes de seguir | celu 2 | Notas de iPhone (escanear documentos) | Repetir una foto mala | No |
| 27 | Hoja de revisión que sube sobre la foto congelada | Revisar sin perder de vista el papel | celu 2 | Apple Maps (hoja) | 1 | No |
| 28 | **Cada proveedor es una conversación**, con el pedido, la factura, la compra y el pago en el mismo hilo | Todo lo de un proveedor junto, como ya se habla con él por WhatsApp | celu 3 | WhatsApp, Intercom | Ir y venir entre pedidos, compras y deuda: 3–4 | **Sí** |
| 29 | Fila de proveedores arriba con insignias (rojo si hay algo vencido, naranja si hay algo para registrar) | Ver a quién atender primero | celu 3 | Historias de Instagram | 1 | **Sí** |
| 30 | La respuesta del sistema como un mensaje: «La leí: coincide con tu pedido», con tres datos y Registrar | Un solo toque para registrar lo que está bien | celu 3 | Asistentes de chat | ~20 en una factura larga | **Sí** |
| 31 | Atajos debajo del hilo: «Marcar pagado», «Pedir lo de siempre» | Lo frecuente con ese proveedor sin buscarlo | celu 3 | Respuestas rápidas de WhatsApp Business | 2–3 | **Sí** («lo de siempre» es nuevo) |

**Lo que lleva registrar la factura de 5 renglones en cada variante:**

| Variante | Qué hay que hacer | Total |
|---|---|---|
| Hoy, a mano | Elegir el proveedor, el comprobante y la fecha, y por cada renglón buscar, Enter, cantidad y costo | ~25 acciones |
| Compu 2 | Abrir la foto de la bandeja, resolver el renglón dudoso y apretar F2 | **3** |
| Celu 2 | Disparar, tocar el dudoso, elegir el producto y Registrar | **4** |
| Celu 3 | Tocar Registrar en el mensaje y resolver el dudoso en la hoja que se abre | **2–3** |
