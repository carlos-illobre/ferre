# Vender → Ventas de hoy: seis maquetas para Carlos

Capturas lado a lado: `comparacion-compu.png` y `comparacion-celu.png`. Cada maqueta se abre sola
desde su `index.html` (usa `../../../_comun/`, `../../ventas.css` y `../../iconos-extra.js`).

Todas muestran el mismo día, para comparar igual con igual: lunes 19/10, hasta las 17:40,
**$412.000** en 23 ventas (+13 % contra $366.000 de ayer a esta hora), 41 productos, ticket
promedio $17.913. Por medio: Efectivo $148.000 (11), Mercado Pago $171.000 (7), Tarjeta $38.000
(2), Cuenta corriente $55.000 (3). Hay una anulada (16:30, martillo con tarjeta, cobrada dos
veces), un cambio (17:05: volvió una pinza universal de $14.000, se llevó una de punta de $18.000,
se cobraron $4.000 en efectivo) y una corregida (12:30, mechas: eran 4, son 3). La venta que se
corrige en las variantes 2 es la de Constructora Martínez (16:48, cuenta corriente, $38.000): los
clavos pasan de 1 kg a 1,5 kg y los tarugos de $8.000 a $7.000 a mano, queda $41.000 (+$3.000).
Entre las 13 y las 16 el local está cerrado: las barras quedan vacías.

La pestaña junta lo que hoy son «Hoy» y «Anular» (decisión 72), como pide el marco común
(«Vender · Ventas de hoy»): ver, corregir, anular y registrar cambios.

## Computadora

| | Idea en una frase | Ideas del catálogo |
|---|---|---|
| **1 · El día y la venta** (evolución) | Arriba, el día en una sola tarjeta blanca (total con la comparación, barras por hora con la marca de ayer, los cuatro medios en renglones); abajo, la tabla de ventas y, a la derecha, la venta elegida con sus productos y tres botones: Corregir, Cambio, Anular. | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 |
| **2 · Se corrige como en el cuaderno** (reinvención) | La venta es el objeto y los verbos son pestañas («Ver · Corregir · Cambio · Anular»); al corregir, se escribe encima y lo anterior queda tachado, con un panel «Lo que cambia» (total, deuda del cliente, stock, total del día) y la historia de la venta debajo. | 1, 3, 7, 13, 14, 15, 16, 17, 18, 19 |
| **3 · Los cuatro cajones** (audaz) | Rompe el marco: sin lateral, una barra con Ctrl K; el día es una franja con barras apiladas por medio y debajo cuatro columnas, una por medio de pago, como los cajones de la caja; arrastrar una venta a otro cajón corrige el medio, y al arrastrar aparecen abajo «Corregir · Cambio · Anular» como lugares donde soltarla. | 2, 5, 7, 20, 21, 22, 23, 24 |

## Celular

| | Idea en una frase | Ideas del catálogo |
|---|---|---|
| **1 · El día** (evolución) | Lo aprobado (variante C) llevado al lenguaje común: sin la tarjeta oscura; total de 48, comparación, barras con la marca de ayer y los cuatro medios en una sola tarjeta blanca, la tira de tres números y la lista corta; todo lo de SC-002 se ve sin bajar. | 1, 2, 3, 4, 6, 25 |
| **2 · La venta en una hoja** (reinvención) | El resumen se pliega a una línea y la lista manda; deslizar una venta muestra Cambio y Anular, y tocarla sube una hoja con los mismos tres verbos; al corregir, los − + y el precio se editan ahí, lo viejo queda tachado y el botón dice cómo queda («Guardar · queda $41.000 +$3.000»). | 13, 14, 15, 26, 27, 28, 29 |
| **3 · El cambio se escanea** (audaz) | Rompe el marco: el cambio abre la cámara; se escanea lo que vuelve (el sistema encuentra la venta de hoy y su precio), se escanea lo que se lleva, y abajo queda la diferencia con el medio y «Deslizá para cobrar $4.000». | 5, 30, 31, 32, 33, 34 |

**Qué rompe la audaz.** Computadora: saca el lateral (barra arriba con Ctrl K), cambia la lista
por cuatro columnas y convierte las acciones en lugares donde soltar. Celular: tapa el marco con
la cámara y el cobro se hace deslizando, como el celular 2 de Vender.

## Cuál me gusta más

**Computadora: la 1 de base, con el modo corregir de la 2.** La 1 es la que se lee de un vistazo
(lo que se mira varias veces por día) y cumple todo lo aprobado; el lugar flojo de hoy es corregir,
y ahí la 2 es claramente mejor: escribir encima con lo viejo tachado es literalmente el cuaderno, y
«Lo que cambia» responde antes de guardar la pregunta que da miedo («¿qué toca esto?»). Al tocar
«Corregir» en el panel de la 1, el panel se agranda a la boleta de la 2. Los cajones de la 3 son
la idea más linda para cerrar la caja (comparar cajón por cajón con lo contado) y la guardaría para
el cierre de caja (capacidad 004), no para el día a día.

**Celular: la 1 para mirar, la hoja de la 2 para tocar, y el escaneo de la 3 para el cambio.** Son
complementarias: la 1 es «Ventas de hoy» al abrir; tocar una venta sube la hoja de la 2; y
«Registrar un cambio» abre la cámara de la 3, que saca el paso más difícil del cambio (encontrar la
venta original y su precio) sin escribir nada.

## Cómo se mueve (una línea por interacción)

- **Abrir la pestaña:** el total rueda sus dígitos desde $0 en 400 ms; las barras crecen de abajo
  hacia arriba escalonadas 20 ms una de otra; la marca de ayer aparece después, en fundido.
- **Señalar una barra:** el globo sale de la barra hacia arriba (120 ms) con «17 h · $103.000»; las
  demás barras bajan a 40 % de opacidad. En el celular, vibra 10 ms al pasar de una hora a otra.
- **Elegir una venta (compu 1 y 2):** el renglón se tiñe de pino suave y la raya pino crece de arriba
  abajo; el panel de la derecha cambia con un fundido corto y los renglones entran escalonados.
- **Corregir:** al tocar un número, el campo se enmarca en pino; al cambiarlo, el valor viejo se
  tacha con una raya roja que se dibuja de izquierda a derecha (200 ms) y sube 4 px; el subtotal y
  «Lo que cambia» ruedan; la pastilla «+$3.000» entra con rebote.
- **Guardar la corrección:** el tilde se dibuja, vibración doble, el panel vuelve a «Ver» y la venta
  en la lista recibe la pastilla ámbar «corregida» que late una vez.
- **Deslizar una venta (celu 2):** el renglón sigue al dedo; aparecen Cambio (pino) y Anular (rojo);
  pasado el 60 %, Anular se estira a todo el ancho y vibra: soltar abre la hoja de confirmar
  (decisión 110), nunca anula sin preguntar.
- **Hoja (celu 2):** sube desde abajo en 320 ms con el fondo a 30 %; se baja con el agarre.
- **Arrastrar a otro cajón (compu 3):** la tarjeta se levanta (sombra 3, gira 2,5°), su lugar queda
  punteado, el cajón de destino se tiñe del color de su medio; al soltar, la tarjeta cae en su hora
  y los dos totales ruedan, uno baja y otro sube.
- **Anular:** la venta se tacha de izquierda a derecha, baja a gris, y el total del día rueda hacia
  abajo; la venta no desaparece (se sigue viendo, anulada).
- **Escanear el cambio (celu 3):** el láser late; al leer, el marco se cierra sobre el código,
  vibra, la tarjeta del producto sale desde abajo y el renglón entra en la hoja con borde verde 1 s;
  la diferencia rueda. Al cobrar, el pulgar se desliza hasta el final y el tilde se dibuja.

## Autocrítica (lo que corregí antes de mostrar)

- Compu 1: la tarjeta del día era muy alta y los medios en cuadritos partían «Mercado Pago»;
  pasaron a renglones (como en lo aprobado). Los chips de filtro se partían; quedaron cuatro. El
  botón Anular se salía del panel: saqué las teclas de los botones (siguen en la línea de ayuda).
  El medio «Tarjeta» heredaba el borde de la clase `.tarjeta` del molde: lo corregí en `ventas.css`
  (aviso para el lenguaje común: la clase del medio choca con la de la tarjeta).
- Compu 2: la columna Producto era angosta y partía los nombres en cuatro líneas; achiqué las
  columnas y saqué el texto de ayuda de arriba. Agregué la historia de la venta, que llena el hueco
  y además explica qué pasó.
- Compu 3: la barra de arriba usaba la clase `.barra` (es la barra de avance del lenguaje común) y
  quedaba de 6 px; la renombré. La tarjeta arrastrada tapaba el «Soltá»; la moví.
- Celu 2: la hoja tapaba el renglón deslizado y el botón quedaba bajo el indicador de inicio;
  achiqué la hoja y llevé «queda $41.000» al botón.
- Lo más flojo que queda: en el celu 2 el renglón deslizado solo muestra el importe (lo demás se
  fue con el dedo, como en iPhone, pero en la captura se entiende menos); en el celu 3 las dos
  pinzas son la misma foto (espejada): con fotos propias del catálogo se distinguen. Las horas sin
  ventas al mediodía son un supuesto (local cerrado de 13 a 16).

## Preguntas que estas maquetas dejan a la vista (no son mías de decidir)

- Hasta cuándo se corrige o anula (pregunta abierta 5): todas dicen «hasta el cierre de hoy»
  como ejemplo.
- Qué se corrige además de cantidad y precio (pregunta abierta 6): la compu 2 muestra «Agregar lo
  que se llevó y no se cargó» y la compu 3 cambiar el medio arrastrando, marcados como fuera de la
  especificación.
- El cambio (RF-24): la celu 3 supone que se busca la venta original y lo devuelto se toma a lo que
  se pagó; qué pasa si lo nuevo vale menos sigue abierto.
- Decisión 72 dice que «Hoy» no deja tocar nada y que anular es otra pestaña; el marco común ya las
  juntó en «Ventas de hoy». Hay que confirmarlo con Carlos.

## Catálogo de ideas

Cada una se puede tomar o descartar sola. «Toques» = lo que ahorra en la tarea de corregir más
frecuente (cambiar la cantidad de un producto de una venta de hoy). Hoy: ir a Anular, buscar la
venta, anularla con su hoja, volver a Vender y cargarla de nuevo (~12 toques en el celular);
corregir todavía no existe.

| # | Idea | Problema que resuelve | Variantes | Patrón de | Ahorra | ¿Fuera de la spec? |
|---|---|---|---|---|---|---|
| 1 | Ver, corregir, anular y cambiar en la misma pestaña, desde la venta | Hoy hay que ir a otra pestaña y buscar la venta otra vez | todas | Shopify (acciones del pedido) | 2–3 | **Sí** (decisión 72 las separa) |
| 2 | El día en una sola tarjeta blanca, sin la tarjeta oscura aprobada | El lenguaje común reserva lo oscuro para la cámara | C1, C3, celu 1 | Stripe (panel de inicio) | — | No (cambia la maqueta C) |
| 3 | Marca punteada de lo de ayer en cada barra por hora | Ver en qué hora se ganó o se perdió contra ayer, no solo el total | C1, C2, celu 1 | Apple Salud (comparación con el promedio) | — | **Sí** |
| 4 | Horas cerradas como raya chata y horas por venir punteadas | Que el hueco del mediodía no parezca un error y que se vea cuánto falta | C1, C2, celu 1 | Apple Pantalla (uso por hora) | — | No (aclara E04) |
| 5 | Cada medio con su ícono y su color en todo (decisión 108) | Leer cómo se pagó sin leer | todas | Square | — | No |
| 6 | Medios en renglones con «11 ventas» e importe alineado | Cuadrar la caja medio por medio | C1, celu 1 | Shopify POS (resumen del turno) | — | No |
| 7 | Pastillas «anulada» y «corregida: eran 4» en el renglón | Saber qué se tocó sin abrir cada venta | C1, C2, C3 | Linear (estado en la fila) | 1 | No |
| 8 | Filtros «Cuenta corriente · Cambios · Anuladas» con su número | Encontrar lo raro del día de un toque | C1 | Gmail (pestañas con contador) | 1–2 | **Sí** |
| 9 | Panel fijo de la venta elegida, con ↑ ↓ y Enter | Ver sus productos sin abrir y cerrar | C1 | Linear, Mail de Mac | 1 por venta | No |
| 10 | Teclas E corregir, C cambio, Supr anular, F otro día, / buscar | Todo con el teclado (RNF) | C1, C2 | Superhuman | 1–2 | No |
| 11 | «Registrar un cambio» como la acción principal naranja de la pestaña | El cambio no tiene hoy un lugar para empezar | C1, C3 | Shopify (Devolver/cambiar) | — | No (RF-24) |
| 12 | Buscar una venta por producto o cliente | «Vino a cambiar la pinza»: encontrar la venta sin saber la hora | C1, C3 | Mercado Pago (actividad) | 2–4 | **Sí** |
| 13 | Verbos como pestañas de la venta: Ver · Corregir · Cambio · Anular | Un solo lugar para todo lo que se le hace a una venta | C2, celu 2 | Fotos de iPhone (Editar) | 1 | No |
| 14 | Escribir encima con lo viejo tachado | Corregir como en el cuaderno y ver qué había (RNF-30) | C2, celu 2 | Track changes de Word | ~10 frente a anular y recargar | No |
| 15 | «Lo que cambia» antes de guardar: total, deuda, stock, total del día | Saber qué toca la corrección sin miedo | C2, celu 2 | Stripe (vista previa de un reembolso) | — | **Sí** |
| 16 | Historia de la venta (cobró, sumó a la cuenta, corrigió) | Quién hizo qué, dentro de la venta | C2 | GitHub (línea de tiempo del pedido) | 2 (no ir a Quién hizo qué) | **Sí** (RF-71 en otra pantalla) |
| 17 | Agregar a una venta lo que se llevó y no se cargó | Cliente que vuelve con algo que no se cobró | C2 | Shopify (editar pedido) | — | **Sí** (pregunta abierta 6) |
| 18 | Lateral plegado y el día en una columna angosta | Ancho para la venta que se corrige | C2 | Linear | — | **Sí** (marco) |
| 19 | El total del día en barras de medios apiladas en una sola línea | Ver la mezcla de medios en un renglón | C2, celu 2 | Stripe (barra de saldo) | — | **Sí** |
| 20 | Cuatro columnas, una por medio de pago | Cuadrar la caja cajón por cajón | C3 | Trello, Linear (tablero) | — | **Sí** |
| 21 | Arrastrar una venta a otro medio para corregirlo | «Era Mercado Pago, no tarjeta» en un gesto | C3 | Trello | 3–4 | **Sí** (pregunta abierta 6) |
| 22 | Al arrastrar aparecen «Corregir · Cambio · Anular» como lugares donde soltar | Descubrir las acciones sin menús | C3 | Fotos de Mac (arrastrar a la papelera) | 1 | **Sí** |
| 23 | Barras por hora apiladas por medio | Ver a qué hora entra cada medio (el efectivo de la mañana) | C3 | Shopify Analytics | — | **Sí** |
| 24 | Barra arriba con «Ir a… o buscar una venta Ctrl K», sin lateral | Ancho y navegación sin mouse | C3 | Linear, GitHub | 1–2 | **Sí** (marco) |
| 25 | «Otro día» al lado de la fecha, siempre a la vista | SC-004 (dos toques) | C1, celu 1 | Apple Calendario | — | No |
| 26 | El resumen se pliega a una línea al bajar | Ver más ventas por pantalla (SC-003) | celu 2 | Wallet de iPhone | — | No |
| 27 | Deslizar una venta: Cambio y Anular | Las acciones sin abrir la venta | celu 2 | Mail de iPhone | 1 | No |
| 28 | La venta en una hoja que sube, con − + y precio editables | Corregir con una mano | celu 2 | Apple Maps (hojas) | — | No |
| 29 | El botón dice cómo queda («Guardar · queda $41.000 +$3.000») | Confirmar sin leer un resumen aparte | celu 2 | Apple Pay | — | No |
| 30 | El cambio empieza escaneando lo que vuelve | No buscar a mano qué se devuelve | celu 3 | Shopify POS (devoluciones), Mercado Libre | 3–4 | **Sí** (cámara para el cambio) |
| 31 | El sistema encuentra la venta original del producto escaneado y toma su precio | Lo devuelto vale lo que se pagó, no lo de hoy | celu 3 | Amazon (devolver desde el pedido) | 3 | **Sí** (pregunta del cambio) |
| 32 | Pasos «Vuelve · Se lleva» arriba de la cámara | Saber en qué parte del cambio se está | celu 3 | Cámara de iPhone (modos) | — | No |
| 33 | Vuelve y se lleva en dos renglones, con la diferencia grande | Entender el cambio de un vistazo | celu 3 | Tickets de cambio | — | No |
| 34 | Deslizá para cobrar la diferencia, con el medio al lado | Cobro a prueba de toque accidental (mismo gesto que Vender celu 2) | celu 3 | iPhone (deslizar) | 0 | **Sí** |

Toques para corregir la cantidad de una venta de hoy (celular): hoy ~12 (anular y recargar);
celu 2 **4** (tocar la venta, Corregir, +, Guardar); compu 2: flechas hasta la venta, E, escribir,
Ctrl Enter. Para un cambio en el celular: celu 3 **~3** (Registrar un cambio, apuntar dos veces,
deslizar), sin escribir nada.
