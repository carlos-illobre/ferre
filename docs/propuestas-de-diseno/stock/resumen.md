# Depósito → Stock: seis maquetas para Carlos

Capturas lado a lado: `comparacion-compu.png` y `comparacion-celu.png`. Cada maqueta se abre
sola desde su `index.html` (usa `../../../_comun/` y `../../iconos-extra.js`, con los íconos que
faltaban: impresora, código de barras, Excel, tendencia, etc.). Todas tienen los mismos datos:
23.842 productos, 28 bajo el mínimo, 12 sin stock, 6 negativos, 214 sin código de barras, y los
mismos productos (martillo 9 un. con mínimo 10, tarugos 3 de 10, mecha 14 de 20, puntas −1, látex
en 0 que espera Rosa). Los movimientos de cada producto suman su stock.

El dinero invertido aparece solo en la compu 1 y con candado: la decisión 96 lo muestra a quien
tiene «Ver el dinero invertido». Los costos estimados de «qué pedir» sí van, porque RF-54 los pide.

## Computadora

| | Idea en una frase | Ideas del catálogo |
|---|---|---|
| **1 · Lista y cuenta del producto** (evolución) | Arriba los números (con stock, bajo el mínimo, sin stock, negativo, dinero invertido); a la izquierda la búsqueda, los filtros y los renglones; a la derecha, fijo, el producto elegido: su stock grande, los movimientos con el saldo que queda después de cada uno, y la corrección («¿Cuántas hay?», motivo en un toque) ahí mismo. | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 |
| **2 · La bandeja** (reinvención) | La pantalla no muestra 23.842 productos, muestra los 46 que piden algo, agrupados por lo que hay que hacer: negativos (corregir), lo que espera un cliente (pedir), bajo el mínimo (ya repartido por el proveedor más barato) y etiquetas viejas (imprimir). A la derecha el pedido se arma solo y se manda por WhatsApp. El resto del stock se busca con Ctrl K. | 3, 7, 11, 12, 13, 14, 15, 16, 17 |
| **3 · El producto como cuenta bancaria** (audaz) | Sin lateral: cada producto es una cuenta, con el saldo enorme, el gráfico de 90 días con la línea del mínimo y el tramo sin stock, el pronóstico de cuándo se acaba, y el extracto con su saldo; corregir es «conciliar» (sistema, contaste, diferencia). | 2, 18, 19, 20, 21, 22, 23 |

## Celular

| | Idea en una frase | Ideas del catálogo |
|---|---|---|
| **1 · La lista** (evolución) | La lista de la referencia de Carlos, con los tres números arriba, el filtro «Para revisar» de entrada, un renglón se desliza para Corregir o imprimir su Etiqueta, y abajo, al pulgar, «28 para pedir · Qué pedir». | 3, 5, 6, 24, 25 |
| **2 · Apuntá y corregí** (reinvención) | Se apunta a la etiqueta de la estantería y sube la hoja con el producto, «Sistema 9» y un contador enorme para guantes; un toque al motivo y «Guardar y seguir escaneando» deja la cámara lista para el próximo, con el avance de la estantería arriba. | 4, 20, 26, 27, 28, 29, 30 |
| **3 · El mazo de reponer** (audaz) | Rompe el marco: sin menú de abajo, los 28 por reponer son cartas; a la derecha va al pedido con la cantidad sugerida, a la izquierda «ahora no», con el botón del medio «hay otra cantidad»; arriba se ve el pedido del proveedor creciendo. | 13, 19, 31, 32, 33, 34 |

**Qué rompe la audaz.** Computadora: saca el lateral (barra arriba con migas y Ctrl K), cambia la
lista por un producto a pantalla completa y usa un gráfico como pieza central. Celular: saca el
menú de abajo y las pestañas; cambia la lista por una carta por vez y los botones por gestos.

## Cuál me gusta más

**Computadora: la 1, con la bandeja de la 2 como filtro de entrada.** La 1 cumple todo RF-53 sin
abrir nada: el stock, por qué es ese número y corregirlo están en el mismo panel, con teclado
(/ busca, ↑↓ recorre, C corrige, Enter guarda). Le falta lo que la 2 resuelve mejor que nadie: qué
hacer hoy. Haría que «Para revisar» de la 1 se vea agrupado como la bandeja de la 2 (negativo,
lo espera un cliente, bajo el mínimo, etiquetas). El gráfico y el pronóstico de la 3 entran bien
como una pestaña del panel del producto.

**Celular: la 2.** En el depósito el celular se usa parado frente a la estantería, con la otra
mano ocupada: apuntar, ver el número y tocar ± es más natural que buscar en una lista, y corregir
pasa de ~6 toques a 2 (apuntar, motivo, guardar). La lista de la 1 queda como la forma de llegar
cuando no hay etiqueta a mano. El mazo de la 3 es para «qué pedir», no para el stock: lo
llevaría a esa pantalla.

## Cómo se mueve (una línea por interacción)

- **Elegir un producto (compu 1):** el renglón toma el borde pino y el panel cambia con un fundido
  de 120 ms; el número grande rueda del stock anterior al nuevo.
- **Corregir:** al tocar ± los dígitos ruedan (arriba si sube, abajo si baja) y «había 9, hay 8»
  se escribe en vivo; al guardar, el renglón nuevo del ajuste entra arriba de los movimientos con
  rebote corto y borde verde 1 s; el número del stock rueda al nuevo. Celular: vibra 10 ms.
- **Deslizar un renglón (celu 1):** el renglón sigue al dedo; a los 80 px aparece «Etiqueta», a
  los 160 px «Corregir» en pino; si se suelta más allá, abre la corrección sin otro toque.
- **Escanear la etiqueta (celu 2):** el marco se cierra sobre el código, vibra, y la hoja sube
  desde abajo (320 ms) con el producto; al guardar, la hoja baja, el contador de la estantería
  («13 de 31») suma uno y la cámara ya está mirando.
- **Bandeja (compu 2):** al resolver un ítem (C, P o X) se pliega hacia arriba en 200 ms, la
  barra de avance crece y el siguiente queda elegido; si fue al pedido, su renglón entra a la
  tarjeta del pedido de la derecha y el total rueda.
- **Mazo (celu 3):** la carta sigue al dedo y gira hasta 8°; aparece el sello verde «AL PEDIDO
  +12» o gris «AHORA NO» según el lado; al soltar vuela fuera, la de atrás sube y el total del
  pedido rueda. Deshacer (arriba) la trae de vuelta.
- **Gráfico (compu 3):** al abrir, la línea se dibuja de izquierda a derecha en 400 ms y el
  pronóstico punteado aparece después; pasar por un escalón resalta su renglón del extracto.

## Autocrítica (lo que corregí antes de mostrar)

- Compu 1: la corrección se caía por abajo del panel y la tarjeta del dinero partía su texto en
  dos; recorté los movimientos a tres con «Ver 3 más» y acorté las etiquetas de los números.
- Compu 2: los grupos se aplastaban unos sobre otros (la lista los encogía) y quedaba un
  `</div>` de más que tiraba la columna del pedido fuera de la pantalla; ahora cada grupo tiene su
  alto y se ve la bandeja entera.
- Compu 3: el gráfico quedaba con un hueco arriba y el consejo partido en tres renglones; ajusté
  la proporción y acorté el consejo y el botón («Pedir 24»).
- Celu 2: quedaba un hueco grande antes del botón y el motivo «Otro» bajaba a otra línea; puse
  la tira de los últimos cuatro movimientos y el «Otro» como micrófono.
- Celu 3: la carta tapaba los botones y estaba demasiado girada; bajé el giro a 3°.
- Lo más flojo que queda: la etiqueta dentro de la cámara (celu 2) tiene letra de menos de 14 px
  porque es una foto de papel, no interfaz; el sector «A-03 · 12 de 31 vistos» mezcla corregir
  con contar (puede ser mejor dejarlo para Contar). Las fotos son de bancos libres, con luces
  distintas.

## Catálogo de ideas

«Toques» = lo que ahorra en la tarea más frecuente de esta pantalla: **ver el stock de un
producto y corregirlo** (hoy, en el celular, unos 6: buscar, escribir, tocar el producto, tocar
el stock, poner la cantidad, escribir el motivo, guardar).

| # | Idea | Problema que resuelve | Variantes | Patrón de | Ahorra | ¿Fuera de la spec? |
|---|---|---|---|---|---|---|
| 1 | Cinco números arriba: con stock, bajo el mínimo, sin stock, negativo, dinero invertido (con candado) | Saber cómo está el depósito sin recorrer nada | C1 | Referencia de Carlos | — | No |
| 2 | Panel fijo del producto elegido con stock grande y «es la suma de sus 6 movimientos» | RF-53: el número y su explicación juntos, sin abrir otra pantalla | C1, C3 | Linear (panel de detalle) | 1 | No |
| 3 | Filtro «Para revisar» elegido de entrada (negativo + sin stock + bajo el mínimo + lo espera un cliente) | Abrir y ver lo que importa, no 23.842 renglones | C1, C2, celu 1 | Gmail (Prioritarios) | 1 | **Sí** |
| 4 | Movimientos con la columna del saldo que queda después de cada uno | Ver que el stock cierra sin hacer cuentas | C1, C3, celu 2 | Extracto bancario | — | No |
| 5 | Corregir en el mismo lugar: «¿Cuántas hay?» con ±, «había N, hay M» en vivo, motivo en un toque | Corregir sin formulario ni tipeo | C1, C3, celu 1, celu 2 | Stripe (edición en línea) | 2–3 | No |
| 6 | Pastilla «La espera Rosa, jue 22» en el producto sin stock que pidió un cliente | Saber que ese cero es urgente | C1, C2, celu 1 | Shopify (pedidos pendientes) | — | No (RF-26, RF-54) |
| 7 | Chip «Sin código (214)» y «Generar código» en el renglón | Etiquetas (RF-57) desde el stock, sin ir a otra pantalla | C1, C2 | — | 2 | No |
| 8 | Mínimo a la vista en el detalle («mín. 10») y su porqué al tocar («31 vendidas en 90 días») | El mínimo se entiende y se confía | C1, C3 | Stripe (desglose) | 1 | No |
| 9 | «Qué pedir · 28» como acción principal de la cabecera | El aviso de stock bajo es un botón, no un cartel | C1, celu 1 | Shopify (alertas de inventario) | 1 | No |
| 10 | «Con el celular» para escanear desde la compu (el celular en espejo hace de lector) | No hay lector en la compu | C1 | Apple Continuity Camera | 1–2 | No (decisión 59) |
| 11 | La pantalla es una bandeja de lo que pide atención, agrupada por qué hacer | Saber qué hacer hoy en el depósito | C2 | Linear (Inbox), Superhuman | 3+ | **Sí** |
| 12 | Cada negativo dice por qué («se anuló la compra con 3 ya vendidas») | Corregir con criterio, no a ciegas | C2 | Sentry (causa probable) | 1 | **Sí** |
| 13 | El pedido se arma solo mientras se revisa, por proveedor más barato, con total estimado | RF-54 y RF-55 en un solo paso | C2, celu 3 | Carrito de compras | 3+ | No |
| 14 | «Mandar por WhatsApp» y «Copiar el texto» al pie del pedido | Mandar sin salir del stock | C2 | — | 2 | No |
| 15 | Barra de avance «46 para revisar · 12 resueltos hoy» | Sensación de terminar, como con el cuaderno | C2, celu 3 | Duolingo, Linear | — | **Sí** |
| 16 | Teclas J/K para moverse, C corregir, P pedir | Recorrer la bandeja sin mouse | C2 | Gmail, Linear | 1 por ítem | No |
| 17 | Grupo «Etiquetas viejas: cambiaron de precio» con «Imprimir 37» | Precio de la estantería al día (RF-57) | C2 | — | 3 | No |
| 18 | Sin lateral: barra con migas «Depósito › Stock › producto» y Ctrl K | Ancho para el producto, navegar sin mouse | C3 | Linear, GitHub | — | **Sí** (marco) |
| 19 | Pronóstico «a este ritmo alcanza hasta el 6/11» con la sugerencia y el proveedor | Pedir antes de quedarse sin stock | C3, celu 3 | Apps de finanzas (proyección) | — | **Sí** |
| 20 | Gráfico de 90 días con la línea del mínimo, el tramo sin stock en rojo y los puntos de compra/ajuste | Ver de un vistazo cómo se mueve y cuándo faltó | C3 | Stocks de Apple, Stripe | — | **Sí** |
| 21 | Lista lateral «las que se mueven hoy» | Saltar entre productos con movimiento sin buscar | C3 | Apple Wallet (tarjetas) | 1 | **Sí** |
| 22 | Corregir como conciliar: tres cajas Sistema · Contaste · Diferencia | La diferencia es lo que importa | C3 | Conciliación bancaria | — | No |
| 23 | Saldo enorme (72 px) del producto | El número que importa, primero | C3 | Banca en línea | — | No |
| 24 | Deslizar un renglón: Etiqueta y Corregir | Corregir sin abrir el producto | celu 1 | Mail de iPhone | 2 | No |
| 25 | «28 para pedir · a 4 proveedores» fijo arriba del menú | El aviso de stock bajo al pulgar | celu 1 | Referencia de Carlos | 1 | No |
| 26 | Escanear la etiqueta de la estantería abre la corrección | Corregir parado frente a la estantería | celu 2 | Shopify (escáner de inventario) | 3 | No |
| 27 | Contador de 64 px con − y + grandes | Con guantes y una mano | celu 2 | Calculadora | — | No |
| 28 | «Guardar y seguir escaneando»: la cámara queda lista | Corregir varios seguidos sin volver | celu 2 | Escáneres de depósito | 2 por producto | No |
| 29 | Tira de los últimos cuatro movimientos en la hoja | Entender el número antes de corregirlo | celu 2 | Apple Wallet (transacciones) | 1 | No |
| 30 | Motivo por voz (micrófono en lugar de «Otro») | No tipear con guantes | celu 2 | WhatsApp (nota de voz) | 1 | **Sí** |
| 31 | Reponer como mazo de cartas: derecha al pedido, izquierda ahora no | Revisar 28 productos rápido con una mano | celu 3 | Tinder, Apple Fotos (limpiar) | ~2 por producto | **Sí** |
| 32 | Sello «AL PEDIDO +12» mientras se desliza | Saber qué va a pasar antes de soltar | celu 3 | Tinder | — | **Sí** |
| 33 | «Hay otra cantidad» en la misma carta | Corregir el stock cuando la sugerencia parte de un número falso | celu 3 | — | 2 | No |
| 34 | Deshacer la última carta arriba a la derecha | Animarse a ir rápido | celu 3 | Gmail (Deshacer) | — | No |

Toques de la tarea frecuente (corregir un producto): hoy ~6 en el celular; celu 1 ~4 (deslizar,
±, motivo, guardar); celu 2 **~3** (apuntar, motivo, guardar). Computadora: compu 1 «/», escribir,
Enter, C, número, Enter; compu 2 C, número, Enter si ya está en la bandeja.
