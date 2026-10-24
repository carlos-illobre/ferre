# Depósito → Ingreso de mercadería: seis maquetas para Carlos

Las capturas, una al lado de la otra, están en `comparacion-compu.png` y `comparacion-celu.png`.
Cada maqueta se abre sola desde su `index.html` y toma lo común de `../../../_comun/`. Lo propio
de esta pantalla está en `propio/`:

- la foto de la factura, armada en HTML (`herramientas/factura.html`) y fotografiada con
  `herramientas/capturas.py factura`;
- el QR;
- los íconos que faltaban (`iconos-extra.js`);
- `ingreso.js` y `ingreso.css`: el menú «Más», los diálogos, las hojas y las tostadas.

## Los datos (los mismos en las seis)

**Lo que llega.** Llega el pedido 0412 a Distribuidora Oeste, del 20/10, con 6 renglones y 42 un.
Hoy (24/10) llegó con la Factura A 0003-00004821:

| Producto | Pedido | Llegó | Costo de lista → factura | Subtotal |
|---|---|---|---|---|
| Pinza universal 8" Bahco | 4 | 4 | $9.800 = | $39.200 |
| Cinta métrica 5 m × 19 mm Stanley | 6 | 6 | $5.400 → **$5.940 (+10 %)** | $35.640 |
| Llave combinada 13 mm Bremen | 10 | **6** | $2.150 = | $12.900 |
| Puntas Phillips PH2 × 10 Bremen | 8 | 8 | $1.900 → **$1.805 (−5 %)** | $14.440 |
| Lámpara LED 9 W Philips | 10 | **0** | $1.250 | — |
| Mecha HSS 6 mm Ezeta | 4 | 4 | $1.100 = | $4.400 |
| Precinto nylon 200 × 4,8 × 100 | — | 5 | **nuevo**, $2.300 | $11.500 |

**Los totales.**

- Total sin IVA: **$118.080**, por 33 un. Cambian 2 costos y nace 1 producto.
- Del pedido llegaron 28 de 42 un., así que queda **recibido parcial**: faltan 4 llaves y 10
  lámparas.
- Se paga a 30 días y vence el 23/11.

## Computadora

| | Idea en una frase | Ideas del catálogo |
|---|---|---|
| **1 · La carga** (evolución) | La spec llevada al nivel de las referencias. Arriba, de dónde viene (proveedor, pedido, comprobante, fecha). Después, el buscador siempre a mano, con las teclas a la vista. Los renglones del pedido vienen precargados: cada uno con «pedí N», lo que llegó con − n +, el costo con su diferencia («↑ +10 %» en ámbar, «↓ −5 %» en verde) y el subtotal. A la derecha están la foto de la factura (el número se lee ahí), el total grande con «2 costos cambian · 1 nuevo», el avance del pedido («28 de 42 un.», «queda recibido parcial: faltan…»), cómo se paga y Registrar F2. | 1, 2, 3, 4, 5, 6, 7, 8, 9 |
| **2 · Cotejar el pedido** (reinvención) | Recibir no es cargar: es tildar el pedido contra la caja. A la izquierda está el papel, grande, con una regla pino que marca por dónde vas, como el dedo sobre la factura. A la derecha, el pedido como lista de cotejo con un anillo de avance. Cada renglón se resuelve con una tecla: Espacio si llegó todo, 0–9 si llegó otra cantidad, N si no llegó, C si cambió el costo. Solo se escribe lo distinto. Lo que vino de más va aparte. El lateral queda plegado para dar ancho. | 2, 5, 10, 11, 12, 13, 14, 15 |
| **3 · Del camión al estante** (audaz) | Rompe el marco: no hay lateral, hay una barra arriba con el camino del ingreso (Llegó → Cotejar y registrar → Guardar en el estante). El ingreso es un comprobante angosto a la izquierda. El resto de la pantalla es el **plano del depósito**, con el recorrido más corto desde la puerta y una parada numerada por producto. Cada parada dice el estante y el stock de antes y de después («D-02 · 5 → 9 un.»). El producto nuevo pregunta dónde va. El ingreso no termina al registrar: termina cuando todo está en su estante. | 2, 16, 17, 18, 19, 20 |

## Celular

| | Idea en una frase | Ideas del catálogo |
|---|---|---|
| **1 · La carga** (evolución) | La misma que la compu 1, en el orden del pulgar. Arriba, el proveedor y el pedido, con la foto de la factura en miniatura. Después, el buscador con el botón grande de escanear al lado y el avance «Del pedido llegaron 28 de 42». Los renglones van con su − n +, y el último agregado queda arriba, marcado. Fijos abajo, el total y Registrar. | 1, 3, 4, 5, 6, 21 |
| **2 · Escanear lo que llegó** (reinvención) | La cámara tapa el marco, como manda la guía para los modos de una sola tarea. Se escanea cada cosa al sacarla de la caja: cada lectura suma 1 y aparece la tarjeta «Cinta métrica 5 m · 6 de 6 · completa». Abajo, una hoja con el anillo «28 de 42 un.» y **solo lo que falta**, con dos salidas: «Vinieron 6» o «No vino». Lo que llegó completo y lo que vino de más quedan en sus pestañas. Al final, Terminar con el total. | 5, 10, 22, 23, 24, 25 |
| **3 · A viva voz** (audaz) | Rompe el marco: no hay menú de abajo ni pestañas. Con las manos ocupadas o con guantes, se mantiene apretado el micrófono y se dice lo que llegó: «Pinzas, mechas y puntas, todo. Cintas seis, a 5.940. Llaves, seis. Lámparas no vinieron». Arriba se ve lo que se escuchó, con las palabras que entendió marcadas. Debajo, «Entendí», que es la lista ya resuelta contra el pedido. Escanear y la foto de la factura quedan a los costados del micrófono. | 5, 10, 26, 27, 28 |

**Qué rompen las audaces.**

- **Compu 3:** saca el lateral y suma un paso nuevo, guardar en el estante, que no está en la
  especificación. Necesita saber en qué estante va cada producto. Hoy un producto es del sector
  donde se lo contó (RF-52), pero no hay un plano.
- **Celu 3:** saca el menú de abajo y las pestañas, y cambia el teclado por la voz como forma
  principal. Escanear y buscar siguen, a los costados.

## Cuál me gusta más

**Computadora: la 2, cotejar.** La tarea más frecuente es recibir un pedido que llegó casi
igual a como se pidió.

- En la 1 hay que revisar seis cantidades y seis costos. En la 2, apretar Espacio cinco veces
  y escribir un 6.
- Con el papel al lado y la regla, se coteja como se hace hoy con la birome, sin leer la foto
  con un servicio pago. Eso respeta la decisión 32, que deja la lectura automática para más
  adelante.
- Le sumaría de la 1 el resumen del total con «2 costos cambian · 1 nuevo».

**Celular: la 2, escanear.** En el depósito el celular está en la mano que no sostiene la caja.
Escanear cada cosa al sacarla es contar sin pensar, y la hoja muestra solo lo que falta.

**Las audaces valen como ideas sueltas.** De la compu 3, «5 → 9 un.» en cada renglón y el aviso
«¿dónde va el nuevo?» se pueden llevar a la 1 o a la 2 sin el plano. La voz de la celu 3 vale
para cuando hay guantes.

## Lo que hay que mirar con la especificación y las decisiones

- **Pestañas de Depósito.**
  - La decisión 68 dice «Inventario, Ingreso, Estanterías, Pedidos».
  - La guía común y las maquetas ya hechas dicen «Stock · Compras · Contar».
  - Usé «Stock · Ingreso · Compras · Contar»: Ingreso segundo, como en la 68, con los nombres
    de la guía. Pedidos tiene su propia maqueta y no lo enlacé.
- **Decisión 67 (una pantalla por proceso).** Ninguna variante muestra compras recientes ni
  deuda: solo recibir. La 3 de la compu suma «guardar en el estante», que es el mismo proceso
  extendido, pero es alcance nuevo.
- **Decisión 122.** La barra de arriba sin lateral de la compu 3 es como la «Ir a… Ctrl K» que
  Carlos dejó para más adelante.
- **Decisión 122, otra vez.** La voz de la celu 3 se parece a escribir «3 mecha 8» en la
  búsqueda, que Carlos descartó por ser fuente de errores. Por eso «Entendí» muestra todo
  resuelto antes de registrar, pero el riesgo es el mismo.
- **RF-51 (leer la foto).** No lo usé en ninguna variante: el número y los datos se leen
  mirando la foto (decisiones 32 y 41).
- **Sin conexión (historia 1, escenario 13).** Sigue preguntado. Ninguna maqueta dibuja ese
  estado.
- **Producto nuevo.** En todas nace en el ingreso (RF-50). En la compu 3 pide además un estante.
- **Un problema en el navegador de versiones.** `v2/`, `v3/` y `v4/index.html` y `_comun/navegar.js`
  no conocen «ingreso» en su lista de pantallas. Hasta que se agregue, la pantalla no aparece en
  el selector y un `data-ir="ingreso"` desde otra maqueta no navega. No lo toqué porque está
  fuera de mi carpeta.

## Cómo se mueve (una línea por interacción)

- **Agregar un renglón** (buscar, Enter o escanear): entra desde 8 px abajo con rebote corto.
  Su borde se pinta de verde 1 s y el total late y rueda sus dígitos. En el celular, vibra 10 ms.
- **Cambiar una cantidad (− +):** el número rueda hacia arriba o hacia abajo (200 ms).
  - Si llega a lo pedido, «faltan 4» se funde a «llegó todo» en verde.
  - Si baja a 0, el renglón se hunde a gris.
- **Cotejar con una tecla (compu 2):** el círculo se llena de verde de afuera hacia adentro
  (200 ms, `--rebote`) y el anillo de arriba avanza. El foco baja solo al renglón que sigue y la
  regla del papel baja un renglón.
- **Mover la regla (Re Pág, Av Pág o un clic en el papel):** se desliza en 200 ms con `--curva`.
  Lo que queda afuera de la regla se aclara un poco.
- **La foto llega desde el celular (QR):** el código late suave mientras espera. La foto entra
  volando a su lugar (320 ms) y aparece la tostada «Llegó la foto de la factura».
- **Escanear (celu 2):** la línea naranja barre la mira. Al leer, la tarjeta de lo leído entra
  desde abajo con «+1», vibra 10 ms y el anillo avanza.
- **«Vinieron 6» o «No vino» (celu 2):** el renglón se va hacia la derecha con fundido (200 ms).
  Aparece una tostada con Deshacer durante 3 s.
- **Hablar (celu 3):**
  - mientras se mantiene apretado, los anillos del micrófono respiran;
  - las palabras aparecen en gris y se tiñen de pino cuando se entienden;
  - cada producto entendido entra en «Entendí» con rebote.
- **Registrar:** el botón muestra «Registrando…» y no se puede tocar dos veces. Después se dibuja
  el tilde, vibra 10-40-10 en el celular y una tostada dice el total, cuántos costos se
  actualizaron y cuántos productos se crearon. La vista queda limpia para el próximo ingreso
  (compu 1 y celu 1).
- **Guardar en el estante (compu 3):** el pin de la parada se pone verde y el pin que sigue pasa a
  naranja con su halo. La tarjeta de la parada se hunde con su tilde.

## Autocrítica (lo que corregí antes de mostrar)

- **Compu 1:**
  - la tarjeta de origen partía «Sin comprobante» y la fecha en dos renglones: los dejé en uno;
  - la diferencia «↑ +10 % · era $5.400» se cortaba: quedó solo la flecha y el porcentaje;
  - la columna derecha se salía por abajo y tapaba Registrar: saqué «Otra hoja», porque ya está
    arriba como «Sacar la foto con el celular», y acorté el texto del pedido.
- **Compu 2:**
  - las teclas del renglón enfocado ocupaban dos renglones y empujaban el pie afuera: acorté los
    textos y bajé el alto de los renglones a 50 px;
  - la fecha competía con el comprobante sobre el papel: pasó a la pastilla del encabezado.
- **Compu 3:**
  - «había 5, quedan 9» se cortaba en las paradas: quedó «5 → 9 un.»;
  - «¿E-05?» estaba lejos de su pin;
  - el rótulo «Se paga» partía los segmentos.
- **Celu 1:** los nombres se cortaban a la mitad. Los resumí, como dice la decisión 47, y achiqué
  los botones de cantidad.
- **Celu 3:** la lista pisaba el micrófono: achiqué la transcripción y los renglones.
- **Lo más flojo que queda:**
  - la factura es papel armado, no una foto real;
  - la cámara de la celu 2 es una caja dibujada con CSS;
  - en la celu 2 sobra aire debajo de lo que falta: ahí podría ir lo que vino de más;
  - la compu 1 es correcta pero previsible.

## Catálogo de ideas

**La tarea más frecuente:** recibir un pedido de 6 renglones que llegó casi igual, con 2
diferencias de cantidad y 2 de costo.

- **Hoy, a mano** (spec): elegir el proveedor, el comprobante y la fecha, y por cada renglón
  buscar, Enter, cantidad y costo si cambió. Son unas 25 acciones.
- **Desde el pedido** (RF-55): abrir el pedido, corregir 2 cantidades y 2 costos, elegir el pago y
  registrar. Son unas 10 acciones.

| # | Idea | Problema que resuelve | Variantes | Patrón de | Ahorra | ¿Fuera de la spec? |
|---|---|---|---|---|---|---|
| 1 | Tarjeta «de dónde viene»: proveedor, pedido, comprobante y fecha en una línea | Ver de un vistazo qué se está recibiendo | C1, celu 1 | Shopify (recibir inventario) | — | No |
| 2 | «Pedí N · faltan M» en cada renglón, en ámbar si falta | Ver si llegó todo sin otra pantalla | C1, C2, C3 | Shopify | — | No (RF-55) |
| 3 | La foto de la factura en miniatura, con «el número, en la foto» | Leer el número sin tipearlo | C1, celu 1, C3 | Expensify | — | No (decisión 32) |
| 4 | Diferencia contra la lista con flecha y palabra: «↑ +10 %» ámbar, «↓ −5 %» verde, «= lista» gris | Ver qué subió sin depender del color | C1, C2, C3, celu 1 | Stripe | — | No |
| 5 | Avance del pedido «28 de 42 un.» con barra o anillo, y «queda recibido parcial: faltan…» antes de registrar | Saber qué queda pendiente antes de confirmar | todas | Seguimiento de envíos | 1 | No (RF-55) |
| 6 | Resumen junto al total: «2 costos cambian · 1 nuevo» | Saber qué va a cambiar en el catálogo al registrar | C1, C3 | Revisión de cambios de GitHub | — | No (escenario 4, dicho antes) |
| 7 | Las teclas del buscador a la vista: ↵ agrega, ↑↓ renglones, Supr quita | Cargar 20 renglones sin el mouse | C1 | Linear | — | No (decisión 121) |
| 8 | Cómo se paga como segmentos, con la fecha de vencimiento que rueda | Elegir el pago sin un paso más | C1, C2, C3 | Mercado Pago (cuotas) | 1 | No (RF-56) |
| 9 | Descartar con Deshacer en vez de confirmar | Descartar sin miedo y sin diálogo | C1 | Gmail | 1 | No |
| 10 | **El pedido como lista de cotejo**: lo que coincide se tilda; solo se escribe lo distinto | No tipear lo que ya se sabe | C2, celu 2, celu 3 | Shopify (recibir), listas de iOS | ~6 en 6 renglones | En parte (RF-55 precarga; tildar es nuevo) |
| 11 | Una tecla por decisión: Espacio llegó todo, 0–9 cantidad, N no llegó, C costo | Cotejar a la velocidad del papel | C2 | Superhuman, Linear | ~10 | No (teclado, decisión 121) |
| 12 | El papel grande al lado, con una **regla** que marca el renglón (Re Pág / Av Pág o clic) | No perder el renglón al comparar con la factura | C2 | El dedo sobre el papel, lectores de PDF | — | **Sí** |
| 13 | Anillo de avance «5/6» arriba de la lista | Saber cuánto falta cotejar | C2, celu 2 | Apple Fitness | — | No |
| 14 | Sección aparte «vino y no estaba en el pedido», con buscar o escanear | Lo de más no se mezcla con lo pedido | C2, celu 2 | Shopify | — | No (casos borde) |
| 15 | Lateral plegado a íconos en el ingreso | Ancho para el papel y la lista | C2 | Lenguaje común (Ctrl B) | — | No |
| 16 | **Barra del camino del ingreso**: Llegó → Cotejar y registrar → Guardar en el estante | Saber en qué paso estoy | C3 | Seguimiento de pedidos de Mercado Libre | — | **Sí** |
| 17 | **Plano del depósito con el recorrido más corto** y paradas numeradas | Guardar rápido, sin buscar dónde iba cada cosa | C3 | Rutas de Google Maps, picking de Amazon | — | **Sí** |
| 18 | Stock antes → después en cada parada: «D-02 · 5 → 9 un.» | Confirmar que lo que se guarda cierra con el sistema | C3 | — | — | **Sí** (se puede llevar a C1 sin el plano) |
| 19 | El producto nuevo pregunta su estante: «¿en E-05?» | El producto nuevo no queda sin lugar | C3 | Onboarding de Notion | — | **Sí** |
| 20 | Imprimir el recorrido (P) | Llevarlo al depósito en papel | C3 | Hoja de picking | — | **Sí** |
| 21 | Lo último agregado arriba, marcado en pino | Verlo sin desplazarse | celu 1 | Listas de iOS | — | No (ux, historia 1) |
| 22 | **La cámara como modo de recibir**: cada lectura suma 1 al renglón del pedido | Contar sin tipear | celu 2 | Shopify POS, lectores de depósito | ~6 | No (escenario 9) |
| 23 | Tarjeta «+1 · 6 de 6 · completa» sobre la cámara | Saber qué leyó sin mirar la lista | celu 2 | Square (escaneo) | — | No |
| 24 | Solo lo que falta, con «Vinieron 6» / «No vino» | Cerrar las diferencias en un toque | celu 2 | Bandeja de Linear | 2 por renglón | No (RF-55) |
| 25 | Terminar abre una hoja con el total, el estado del pedido y el pago | Confirmar todo junto | celu 2 | Apple Pay (hoja) | — | No |
| 26 | **Decir lo que llegó**: mantener apretado el micrófono | Recibir con las manos ocupadas o con guantes | celu 3 | Siri, dictado de notas | ~10 | **Sí** |
| 27 | «Escuché» con las palabras entendidas marcadas, y «Entendí» resuelto contra el pedido | Confiar en lo que entendió antes de registrar | celu 3 | Transcripción de Google Recorder | — | **Sí** |
| 28 | Escanear y la foto de la factura a los costados del micrófono | No depender solo de la voz | celu 3 | Cámara del iPhone (modos) | — | No |

**Lo que lleva recibir ese pedido en cada variante:**

| Variante | Qué hay que hacer | Total |
|---|---|---|
| Hoy, desde el pedido | Corregir 2 cantidades y 2 costos, elegir el pago y registrar | ~10 |
| Compu 1 | Lo mismo, con el pago ya elegido como la última vez | ~8 |
| Compu 2 | Espacio × 3, «6», «N», C y el costo × 2, y F2 | ~9 teclas, sin mouse ni campos |
| Celu 2 | Escanear cada cosa (es contar), «Vinieron 6», «No vino», Terminar y Registrar | 4 toques además de los escaneos |
| Celu 3 | Mantener el micrófono, decir una frase y Registrar | 2 toques |
