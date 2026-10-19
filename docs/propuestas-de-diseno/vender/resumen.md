# Vender → Vender: seis maquetas para Carlos

Capturas lado a lado: `comparacion-compu.png` y `comparacion-celu.png`. Cada maqueta se abre
sola desde su `index.html` (usa `../../../_comun/`). Todas tienen la misma venta, para comparar
igual con igual: 3 mechas, 1 cinta métrica (llegó del celular), 0,7 kg de clavos, tarugos sin
precio y una bolsa de arena como ítem libre a $1.500. Total $45.500.

## Computadora

| | Idea en una frase | Ideas del catálogo |
|---|---|---|
| **1 · Mostrador** (evolución) | Lo que pide la especificación, ordenado: a la izquierda la búsqueda y los renglones (costo, margen y precio a la vista, antes de la cantidad), a la derecha un panel fijo de cobro con el total grande, los cuatro medios con su tecla y Cobrar. | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 |
| **2 · Se escribe como en el cuaderno** (reinvención) | Una sola línea de mostrador que entiende «3 mecha 8», «0,7 kg clavos» o «$1500 arena»; los renglones son una planilla con el margen en 5 teclas; al lado, «De dónde sale» del renglón elegido, siempre abierto; el cobro, una franja abajo. | 1, 3, 5, 6, 8, 13, 14, 15, 16, 17, 18 |
| **3 · El estante y la boleta** (audaz) | Rompe el marco: sin lateral, una barra pino arriba con «Ir a… Ctrl K»; a la izquierda, los 8 productos que más salen a esta hora en fotos grandes (un clic o su número los suma) y el celular escaneando en vivo; a la derecha, una boleta de papel que se lee de lejos y el cobro con medios grandes. | 1, 3, 5, 7, 8, 19, 20, 21, 22, 23, 24 |

## Celular

| | Idea en una frase | Ideas del catálogo |
|---|---|---|
| **1 · Mostrador** (evolución) | La lista aprobada de renglones llevada al nivel de las referencias, con el tarugo sin precio pidiendo el margen ahí mismo, y abajo, al alcance del pulgar, el aviso, los cuatro medios y Cobrar con el total. | 2, 3, 4, 5, 9, 10, 25 |
| **2 · Cámara primero** (reinvención) | Vender abre con la cámara: se apunta y cada código suma solo, la venta sube como una hoja desde abajo, un renglón se quita deslizándolo y se cobra deslizando el botón. | 3, 5, 26, 27, 28, 29, 30, 31 |
| **3 · Dictale** (audaz) | Rompe el marco: sin menú de abajo, un micrófono enorme (sirve con guantes); se dice «tres mechas de ocho y setecientos de clavos», el sistema arma los renglones y pregunta solo lo que no entendió («¿Qué tarugos del 8?»). | 3, 5, 32, 33, 34, 35, 36 |

**Qué rompe la audaz.** Computadora: saca el lateral (el marco pasa a una barra arriba con Ctrl K),
cambia la lista por una grilla de fotos y la tarjeta por una boleta de papel. Celular: saca el menú
de abajo y la búsqueda como entrada principal; la voz pasa a ser la forma de cargar.

## Cuál me gusta más

**Computadora: la 2, con el panel de cobro de la 1.** La vara de la especificación es «más rápido
que el cuaderno» y «todo con el teclado»: escribir «3 mecha 8» es literalmente cómo se anota en el
cuaderno, saca la cantidad del recorrido (un paso menos por producto) y el «De dónde sale» siempre
abierto cumple RF-13 sin un clic. Le sumaría el panel de cobro de la 1, que se lee mejor que la franja.

**Celular: la 1 de base, con la cámara de la 2 como entrada.** La 1 ya es lo aprobado y se ve
terminada; la 2 cambia el gesto más frecuente (buscar) por apuntar, que en un celular es lo natural.
Abrir Vender en el modo cámara de la 2 y que al cerrar quede la lista de la 1 es lo mejor de las dos.

## Cómo se mueve (una línea por interacción)

- **Agregar un producto:** el renglón entra desde 8 px abajo con rebote corto, su borde queda
  verde 1 s; la insignia de Vender salta; el total rueda sus dígitos. Celular: vibra 10 ms.
- **Llega del espejo:** el renglón entra igual, con la pastilla «Llegó del celular» que se apaga
  a los 3 s; en el otro dispositivo, una tostada pino.
- **Elegir el margen:** el segmento elegido se desliza al nuevo lugar (200 ms) y el precio y el
  subtotal ruedan; el fondo ámbar del renglón sin precio se funde a blanco.
- **Escanear (celular 2):** el láser late; al leer, el marco se cierra sobre el código, sale la
  tarjeta «+ $17.000» desde abajo y vibra; la hoja de la venta empuja el renglón nuevo arriba.
- **Quitar (celular 2):** el renglón sigue al dedo, aparece el rojo debajo, y al soltar se
  colapsa en 200 ms; una tostada ofrece «Deshacer» 4 s.
- **Cobrar:** el botón se llena de izquierda a derecha (o el pulgar se desliza hasta el final),
  tilde que se dibuja, vibración doble, la venta se vacía hacia arriba y el foco vuelve a buscar.
- **Dictar (celular 3):** las palabras aparecen mientras se habla; las entendidas se marcan;
  cada renglón entra cuando su frase termina. Lo dudoso entra en ámbar con sus opciones.
- **Sugerencias (compu 2):** aparecen bajo la línea en 120 ms sin mover nada; la elegida se
  marca en pino suave y la cuenta «= $18.000» se actualiza al cambiar la cantidad.

## Autocrítica (lo que corregí antes de mostrar)

- Compu 1: la búsqueda se partía en dos renglones y el panel de cobro se salía por la derecha;
  los botones de medio de pago no entraban. Textos más cortos, columnas que no empujan.
- Compu 2: las sugerencias tapaban la venta entera y el texto de ayuda se pisaba con el panel; ahora
  van en el flujo, con 3 resultados, y la ayuda del cuaderno vive en el panel derecho.
- Compu 3: quedaba un hueco abajo a la izquierda; ahora están las acciones secundarias (ítem
  libre, No llevó, pedido, presupuesto) y la ganancia.
- Celu 1: «100 %» y «$ a mano» se partían; ahora entran en una línea.
- Celu 2: la tarjeta del producto leído se pisaba con la hoja; subí el visor.
- Celu 3: los atajos de voz se encimaban con la lista; saqué el bloque de «ya estaban».
- Lo más flojo que queda: las fotos son de bancos libres y no todas tienen la misma luz (las
  puntas y los tarugos son fotos de grupo); con fotos propias de Carlos el nivel sube solo.

## Catálogo de ideas

Cada una se puede tomar o descartar sola. «Toques» = lo que ahorra en la tarea más frecuente
(una venta de 3 productos en efectivo: hoy, en el celular, unos 11 toques: por producto tocar la
búsqueda, escribir, tocar la sugerencia; más Cobrar y Nueva venta).

| # | Idea | Problema que resuelve | Variantes | Patrón de | Ahorra | ¿Fuera de la spec? |
|---|---|---|---|---|---|---|
| 1 | Panel de cobro fijo a la derecha (total 48 px, medios, cliente, Cobrar) | El total y el cobro se pierden cuando hay muchos renglones | C1, C3 | Shopify POS, Square | 0 (orden) | No |
| 2 | Costo, márgenes y precio en una segunda línea del renglón, antes de la cantidad | El cliente decide con el precio en la mano | C1, celu 1 | Linear (detalle en línea) | 1 por renglón sin margen | No |
| 3 | Renglón sin precio en ámbar con los 5 márgenes y «$» ya a la vista | Hoy se descubre al cobrar | todas | Stripe (campo incompleto marcado) | 1–2 | No |
| 4 | Aviso al lado de Cobrar que dice cuál falta y cómo (1 a 5) | Cobrar y que no pase nada | C1, celu 1 | Stripe Checkout | 1 | No |
| 5 | Medio de pago con su color (decisión 108) y su tecla F5–F8 a la vista | Elegir sin leer | todas | Square | 0 | No |
| 6 | «Ganás en esta venta $21.200» en el panel | El dueño quiere saber cuánto gana, hoy no lo ve | C1, C3 | Shopify (margen en el pedido) | — | **Sí** |
| 7 | Pastilla «Llegó del celular» en el renglón que vino del espejo | No se entiende por qué apareció un renglón | C1, C3 | Apple Continuity | — | No (aclara E09) |
| 8 | Pastilla de stock en cada renglón y sugerencia (verde, ámbar, gris) | «¿Tenés?» sin ir a Depósito | todas | Referencia de Carlos | — | No |
| 9 | Ítem libre con «Guardar como producto» en el mismo renglón | Alta en el paso (RF-22) sin otra pantalla | C1 | Notion (crear desde la búsqueda) | 1–2 | No |
| 10 | «No llevó», «A pedido» y «Presupuesto» como salidas al pie del cobro | Lo que no es cobrar está a un toque, pero no compite | C1, C3, celu 1 | Gmail (acciones del hilo) | 1 | No |
| 11 | Subtotal con su cuenta debajo («3 × $7.000», «0,7 × $8.000 ↑») | El redondeo a $1.000 se ve sin abrir nada | C1 | Calculadora | — | No |
| 12 | Panel de cobro con «Cliente (opcional)» y F9 | Cuenta corriente sin buscar dónde | C1 | Square | 1 | No |
| 13 | Una línea que entiende «3 mecha 8», «0,7 kg clavos», «$1500 arena» | Cargar como en el cuaderno; cantidad y precio en el mismo gesto | C2 | Raycast, Linear (comandos) | 1 por producto con cantidad ≠ 1; 2 en el ítem libre | **Sí** |
| 14 | La cuenta en vivo en la sugerencia («= $18.000») | Decir el total del renglón antes de agregarlo | C2 | Spotlight (calculadora) | — | **Sí** |
| 15 | Renglones como planilla densa, el margen en 5 teclas 1–5 | Ver 8 renglones sin desplazar; cambiar margen sin mouse | C2 | Excel, Linear | 1 por margen | No |
| 16 | «De dónde sale» siempre abierto para el renglón elegido (F1) | RF-13 sin un clic; aprende el porqué del precio | C2 | Stripe (desglose de tarifa) | 1 | No |
| 17 | Lateral plegado a íconos en Vender | Más ancho para la venta | C2 | Linear, VS Code | — | **Sí** (marco) |
| 18 | Franja de cobro abajo, de lado a lado, con todo en una línea | Total, medio y cobrar siempre a la vista | C2 | Superhuman | 0 | No |
| 19 | Grilla de «lo que más sale a esta hora», con fotos y número 1–8 | Lo de todos los días (lámparas, mechas) sin escribir | C3 | Square POS (favoritos) | 2 por producto frecuente | **Sí** |
| 20 | Tarjeta «El celular está escaneando» en vivo en la compu | Saber que el celular está listo de lector (decisión 59) | C3 | Apple Continuity Camera | 1 | No |
| 21 | Boleta de papel con borde dentado, que el cliente lee de lejos | El cliente ve lo que lleva y cuánto, sin costos | C3 | Tickets de almacén | — | **Sí** |
| 22 | Barra superior con «Ir a… Ctrl K» en lugar del lateral | Navegar sin mouse y ganar ancho | C3 | Linear, GitHub | 1–2 al cambiar de parte | **Sí** (marco) |
| 23 | Total del día en la barra («Hoy $412.000 · 23 ventas») | Saber cómo va el día sin cambiar de pestaña | C3 | Shopify POS | 1 | **Sí** |
| 24 | El botón de cobrar nombra el medio («Cobrar $45.500 en efectivo») | Evita cobrar con el medio equivocado | C3 | Apple Pay | 0 | No |
| 25 | Aviso sin precio pegado arriba de los medios, en la barra fija | Se ve en el lugar donde se va a tocar | celu 1 | Material (snackbar contextual) | 1 | No |
| 26 | Vender abre en la cámara; cada código suma solo, sin tocar | Escanear es lo natural en el celular | celu 2 | Shopify POS, Mercado Pago | 2 por producto | **Sí** |
| 27 | Tarjeta «+ $17.000 · sumada a la venta» al leer | Confirmación sin bajar la vista | celu 2 | Apple Wallet | — | No |
| 28 | La venta como hoja que sube desde abajo sobre la cámara | Ver la venta sin cerrar la cámara | celu 2 | Apple Maps | 1 | **Sí** |
| 29 | Deslizar un renglón para quitarlo, con «Deshacer» | Quitar sin abrir un menú | celu 2 | Mail de iPhone | 1 | No |
| 30 | Deslizá para cobrar | Cobro a prueba de toque accidental, con guantes | celu 2 | iPhone (deslizar para apagar) | 0 | **Sí** |
| 31 | Modo Escanear · Buscar · Voz en el mismo control | Cambiar de forma de cargar sin salir | celu 2 | Cámara de iPhone (modos) | 1 | No |
| 32 | Dictar la venta entera de una vez | Con guantes o con las manos ocupadas | celu 3 | Siri, Google Assistant | ~8 en 3 productos | **Sí** |
| 33 | Transcripción con las palabras entendidas marcadas | Confiar en lo que el sistema escuchó | celu 3 | Google Recorder | — | **Sí** |
| 34 | Preguntar solo lo dudoso con opciones («¿Qué tarugos del 8?») | Ambigüedad resuelta en un toque | celu 3 | Linear (sugerencias) | 1–2 | **Sí** |
| 35 | Frases de voz sugeridas («cobrá en efectivo», «margen cien») | Descubrir qué se puede decir | celu 3 | Alexa | — | **Sí** |
| 36 | Micrófono de 104 px con escanear y teclado a los costados | Un pulgar, con guantes | celu 3 | WhatsApp (nota de voz) | — | **Sí** |

Total de toques de la tarea frecuente (3 productos, efectivo): hoy ~11 en el celular; celu 1 ~10;
celu 2 **~2** (apuntar tres veces y deslizar); celu 3 **~2** (apretar el micrófono y deslizar).
Computadora: hoy 3 × (escribir + Enter) + F2; compu 2 lo mismo pero sin tocar la cantidad nunca;
compu 3, un número por producto frecuente + F2.
