# Negocio → Quién hizo qué: seis maquetas para Carlos

Las capturas, una al lado de la otra, están en `comparacion-compu.png` y `comparacion-celu.png`.
Cada maqueta se abre sola desde su `index.html` y usa `../../../_comun/` y `../../_propio/`, donde
están las piezas propias (avatares, antes → después, paginador y 17 íconos Lucide que faltaban).
Todas muestran el mismo lunes 19 de octubre a las 10:42: 38 acciones, 27 de Marcos y 11 de
Carlos; Lucía fue desactivada esa mañana. Hay una venta anulada, cuatro márgenes cambiados, dos
ajustes de stock, una lista aplicada y una compra.

## Computadora

| | La idea en una frase | Ideas del catálogo |
|---|---|---|
| **1 · El registro** (evolución) | Lo que pide RF-71, bien hecho: los filtros arriba (quién, el día en segmentos, el tipo), la tabla de a 10 con hora, quién, qué y el detalle en palabras («50 % → 100 %»), y a la derecha «Qué pasó hoy» en barras, que también filtran, y el detalle completo de la acción elegida. | 1, 2, 3, 4, 5, 6, 7, 8, 9 |
| **2 · El día de cada uno** (reinvención) | Responde directo «qué hizo tal usuario tal día»: la semana arriba con la cantidad por día, una columna por persona con su día en orden, lo repetido junto en un paquete («20 ventas cobradas · $318.000») y el día resumido en una línea. | 2, 3, 6, 10, 11, 12, 13, 14, 15 |
| **3 · Preguntale** (audaz) | Rompe el marco: no hay lateral y la pantalla es una pregunta escrita («¿quién tocó los tarugos esta semana?»). La respuesta viene en una frase, con la historia del precio en un gráfico y los hitos, y al costado «Para mirar», lo raro que el sistema encontró solo. | 2, 3, 16, 17, 18, 19, 20, 21 |

## Celular

| | La idea en una frase | Ideas del catálogo |
|---|---|---|
| **1 · El registro** (evolución) | Tres números arriba (hoy, anuladas, a revisar), que también filtran; tres chips de filtro (día, quién, tipo); tarjetas de un mismo molde; y abajo, al alcance del pulgar, el paginador «1 de 4». | 2, 3, 5, 7, 8, 22 |
| **2 · El día de cada uno** (reinvención) | Se elige a la persona tocando su cara, como las historias de Instagram, y el día en una tira. Su jornada se ve como una línea de tiempo con puntos de color y paquetes. | 10, 11, 12, 13, 23, 24 |
| **3 · ¿Quién tocó esto?** (audaz) | Rompe el marco: se apunta la cámara a un producto del estante y sube una hoja con su precio, su costo y su stock de hoy, y quién lo cambió, vendió o ajustó. | 16, 18, 25, 26 |

**Qué rompen las audaces.** La de computadora saca el lateral y lo cambia por una barra arriba.
También cambia los filtros por una pregunta en palabras y agrega avisos automáticos. La del celular
tapa el marco con la cámara y busca por producto, un filtro que hoy no existe. Las dos se apartan
del «de a 10» de la especificación: muestran una respuesta, no una página.

## Cuál me gusta más

**Computadora: la 1 como base, con dos cosas de la 2.** La 1 cumple RF-71 al pie de la letra y no
pierde nada. Le sumaría los paquetes de lo repetido (sin ellos, 23 de 38 renglones son ventas
cobradas y tapan lo que importa) y la línea «Hoy, en una línea». La 2 es la que mejor contesta
la pregunta de verdad (SC-007), pero rompe la paginación de a 10. De la 3, «Para mirar» es la
idea que más valor le da al dueño, y entra como una tarjeta más en la columna derecha de la 1.

**Celular: la 2.** En el celular nadie lee una tabla. Tocar la cara de Marcos y el día es
exactamente «qué hizo tal usuario tal día», en dos toques y sin abrir un filtro. La 3 es el
sueño: «¿quién le cambió el precio a esto?» con el producto en la mano. La dejaría como entrada
desde la ficha del producto («Historia») antes que como pantalla propia.

## Cómo se mueve (una línea por interacción)

- **Cambiar un filtro:** la lista hace un fundido corto (120 ms) y las filas nuevas entran desde
  4 px abajo, escalonadas 20 ms. El total («38 acciones») hace rodar sus dígitos y el paginador
  vuelve a «1» con un deslizamiento.
- **Tocar una barra de «Qué pasó hoy» (compu 1):** la barra se llena de pino y el chip «Qué»
  toma ese tipo con un rebote corto. Las filas que no son de ese tipo se desvanecen.
- **Elegir una fila (compu 1):** la raya pino de la izquierda baja hasta la fila nueva (200 ms) y
  el panel del detalle cambia con un fundido cruzado, sin moverse de lugar.
- **Pasar de página:** las filas salen hacia la izquierda y entran desde la derecha, 8 px, con
  fundido (200 ms). En la primera y en la última página, el botón que no va está apagado y no
  vibra.
- **Abrir un paquete (compu 2 y celu 2):** el paquete se estira hacia abajo y sus ventas entran de
  a una, cada 20 ms. La flecha gira 180°.
- **Cambiar de día en la semana (compu 2, celu 2):** el día elegido se llena de pino deslizándose
  desde el anterior. Las columnas se funden. En el celular, también se cambia de día deslizando
  la línea de tiempo a los costados.
- **Tocar una persona (celu 2):** el anillo pino se dibuja alrededor de la cara (200 ms), la frase
  del día se reescribe con un fundido y vibra 10 ms.
- **Preguntar (compu 3):** al apretar Enter, las pastillas de «Entendí» aparecen de a una (40 ms
  entre cada una). La línea del gráfico se dibuja de izquierda a derecha (400 ms) y el punto
  naranja de hoy late una vez.
- **Leer un producto (celu 3):** el marco se cierra sobre el producto y sale la tostada
  «Leído». Vibra 10-40-10 ms y la hoja sube desde abajo (320 ms) con el precio ya puesto.
- **Sin conexión o error:** la lista anterior queda en su lugar, atenuada al 50 %, y arriba
  aparece un aviso ámbar con «Reintentar». Nunca se ve la pantalla vacía (lo pide el ux.md).

## Autocrítica (lo que corregí antes de mostrar)

- **Compu 1:** el panel derecho se salía de la pantalla y el detalle no entraba en ninguna fila.
  Achiqué la columna «Quién» al nombre de pila (son tres personas, RNF-52) y llevé las barras de
  «Qué pasó hoy» a una columna propia. Los totales no cerraban (24 + 5 + … daba 39): ahora suman 38.
- **Compu 2:** las columnas se salían por la derecha y los montos de los paquetes se partían en
  dos renglones. El domingo cerrado mostraba «Cerrado» encimado.
- **Compu 3:** las etiquetas del gráfico no caían debajo de su día y la tarjeta tenía un hueco
  abajo. Ahora termina con «Hoy está así» (costo, margen, precio y stock) y «Abrir la ficha».
- **Celu 1:** «Precio y stock» se partía en dos líneas, así que pasó a «A revisar». Saqué datos
  de las líneas de detalle para que no se corten.
- **Celu 3:** la tostada «Leído» se partía y quedaba debajo de la hoja.
- **Lo más flojo que queda:**
  - En compu 1 el detalle de cada fila sigue cortado con «…». Se lee entero en el panel
    derecho, pero en la tabla se pierde.
  - La tira de la semana de compu 2 tiene barritas demasiado chicas para decir algo.
  - El estante de la cámara de celu 3 está armado con las fotos recortadas y desenfocadas, no es
    una foto real.
  - La foto de los tarugos es de grupo, con tornillos, como ya pasaba en Vender.

## Catálogo de ideas

Cada idea se toma o se descarta sola. «Toques» cuenta lo que se ahorra en la tarea más frecuente
según la especificación: «qué hizo Marcos ayer». Hoy son abrir el filtro de usuario, elegir,
abrir el de fecha, elegir el día y mirar la página: unos 5 toques o clics.

| # | Idea | Problema que resuelve | Variantes | Patrón de | Ahorra | ¿Fuera de la spec? |
|---|---|---|---|---|---|---|
| 1 | Fecha como segmentos «Hoy · Ayer · Esta semana · Desde… hasta» | Elegir el día sin abrir un calendario | C1 | Stripe (rango de fechas) | 1–2 | No |
| 2 | Detalle en palabras con antes → después tachado («~~50 %~~ → 100 %») | Leer el cambio sin abrir nada | todas | GitHub (diff), Linear (historial) | 1 | No (lo pide el ux.md) |
| 3 | Color solo en lo que se revisa: anulación en rojo, precio y stock en ámbar, lo demás gris | Encontrar lo importante entre 38 renglones | todas | Linear (prioridades) | — | No |
| 4 | Columna «Qué pasó hoy»: cantidad por tipo en barras, que filtra al tocarla | Resumen y filtro de tipo en el mismo lugar | C1 | Stripe (gráfico que filtra) | 1 | No |
| 5 | Panel fijo con el detalle completo de la acción elegida (dispositivo, venta, motivo) | El detalle largo sin perder la lista | C1 | Mail, Linear (vista dividida) | 1 por acción | No (ux.md: «se abre desde la acción») |
| 6 | Atajos a otra pantalla desde el detalle: «Ver la venta», «Lo de Marcos hoy», «Abrir la ficha» | Seguir el hilo sin buscarlo de nuevo | C1, C3 | Stripe (enlaces entre objetos) | 2–3 | **Sí** |
| 7 | Paginador con «1 de 4» y botones de ancho completo (el que no va, apagado) | RF-71: de a 10 y que se note el borde | C1, celu 1 | iOS | — | No |
| 8 | Números de resumen arriba (hoy, anuladas, a revisar) que también filtran | Ver de un vistazo si hubo algo raro | celu 1 | Referencia 1 de Carlos | 1 | **Sí** |
| 9 | Teclado: ↑ ↓ recorren, Enter abre, → página siguiente | Mostrador sin mouse | C1 | Gmail, Linear | — | No |
| 10 | Semana arriba con la cantidad de acciones por día y un punto rojo si hubo anulación | Elegir el día sabiendo dónde mirar | C2, celu 2 | Calendario de iPhone (puntos) | 1–2 | **Sí** |
| 11 | Una columna o una cara por persona: su día, en orden | «Qué hizo tal usuario» sin filtro | C2, celu 2 | Calendario de Google (columnas por persona) | 3 | **Sí** (cambia la paginación) |
| 12 | Paquetes de lo repetido («20 ventas cobradas · $318.000»), que se abren | Las ventas tapan lo que importa | C2, celu 2 | Notificaciones agrupadas de iPhone, Slack | desplazar 2 páginas | **Sí** (rompe «de a 10») |
| 13 | El día en una frase («Marcos vendió $363.500 y anuló una») | Contestar sin leer la lista | C2, celu 2 | Resumen de Pantalla de iPhone | todo | **Sí** |
| 14 | Las personas sin acciones en el día, con «Desactivada» y su última acción | El filtro ofrece a los desactivados y al sistema (ux.md) | C2 | Slack (estado) | 1 | No |
| 15 | Barra de reparto por tipo en la cabecera de cada persona | Ver de qué se ocupó cada uno | C2 | GitHub (barra de lenguajes) | — | **Sí** |
| 16 | Buscar por producto o venta: «quién tocó esto» | El dueño ve un precio raro y quiere saber quién fue | C3, celu 3 | Historial de versiones de Google Docs | 4–5 | **Sí** (filtro nuevo) |
| 17 | Pregunta en palabras que se traduce a filtros visibles («Entendí: Todos · Lun 12 a hoy · Tarugos») | Filtrar sin conocer los filtros, y ver qué se entendió | C3 | Linear, Raycast | 3 | **Sí** |
| 18 | Historia del precio de un producto: gráfico escalonado con quién movió cada escalón | El porqué de un precio en una mirada | C3, celu 3 | Stripe (historial), Keepa | — | **Sí** |
| 19 | «Para mirar»: avisos solos (anulada al rato de cobrar, precio bajo el costo, stock bajado a mano) | El dueño no tiene tiempo de recorrer el registro | C3 | Stripe Radar, alertas de un banco | todo | **Sí** |
| 20 | «Hoy está así» (costo, margen, precio y stock) al pie de la respuesta | Ver cómo quedó después de los cambios | C3, celu 3 | Shopify (ficha) | 1 | **Sí** |
| 21 | Preguntas sugeridas («¿Qué hizo Marcos ayer?», «¿Quién entró fuera de horario?») | Saber qué se puede preguntar | C3 | Asistentes de voz | 3 | **Sí** |
| 22 | Avatar con inicial y color fijo por persona en todas las pantallas | Reconocer a la persona sin leer | todas | Slack, Linear | — | No |
| 23 | Elegir a la persona tocando su cara grande, con la cantidad en la insignia | Un toque con el pulgar | celu 2 | Historias de Instagram | 2 | **Sí** |
| 24 | Línea de tiempo vertical con puntos de color (rojo, ámbar, gris) | Ver el ritmo del día y dónde estuvo lo raro | celu 2 | Apple Fitness, seguimiento de envíos | — | **Sí** |
| 25 | Abrir el registro desde la cámara apuntando al producto | Con el producto en la mano, sin tipear su nombre | celu 3 | Google Lens, Shopify POS | 4 | **Sí** |
| 26 | Hoja que sube sobre la cámara, con el botón de escanear otro al lado | Revisar varios productos seguidos | celu 3 | Apple Maps, Mercado Pago | 1 por producto | **Sí** |

Cuántos toques lleva «qué hizo Marcos ayer»:

| Variante | Toques | Cómo |
|---|---|---|
| Hoy | ~5 | |
| Compu 1 y celu 1 | 3 | Quién → Marcos → Ayer |
| Compu 2 y celu 2 | **2** | Marcos → el día |
| Compu 3 | 1 | Escribir «qué hizo Marcos ayer» + Enter |
