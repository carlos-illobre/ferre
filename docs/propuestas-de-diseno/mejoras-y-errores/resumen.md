# Más → Mejoras y errores: seis maquetas para Carlos

Capturas lado a lado: `comparacion-compu.png` y `comparacion-celu.png`. Cada maqueta se abre
sola desde su `index.html` (usa `../../../_comun/`, `../../mye.css` con las piezas propias de esta
pantalla y `../../iconos-extra.js` con 22 íconos Lucide que faltaban). Las «capturas» que llevan
los tickets son recortes de las maquetas de Vender (`imagenes/`, armadas con
`herramientas/capturas_de_ejemplo.py`), así el ejemplo es la aplicación misma.

Todas cuentan la misma historia: Rosa avisó desde el celular que los tarugos S8 salen sin precio
(con una captura y la foto de la caja), Martín propuso el QR grande de Mercado Pago, hay 7
abiertos y 23 resueltos. En todas: «Tengo una idea» primero y elegida al abrir, marcada en verde
suave; el cursor ya está en la caja de texto; el texto es lo único obligatorio; hasta 5 fotos.

## Computadora

| | Idea en una frase | Ideas del catálogo |
|---|---|---|
| **1 · El buzón** (evolución) | Escribir a la izquierda (idea o error, el texto, las capturas pegadas con Ctrl V, «Sacar con el celular», qué datos van solos) y seguir a la derecha (resumen con barras, abiertos/resueltos, filtro idea/error, lista con miniaturas y los que esperan hace mucho). | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 |
| **2 · La bandeja** (reinvención) | Como un correo: la lista a la izquierda y el ticket elegido a la derecha con la captura grande (y lo que marcó Rosa), la charla, «A mí también» y abajo la nota y «Marcar resuelto» con una tecla; escribir uno nuevo es N o F1 desde cualquier lado. | 2, 3, 6, 11, 12, 13, 14, 15, 16, 17 |
| **3 · F1 sobre la pantalla** (audaz) | La pantalla de Mejoras deja de ser el lugar donde se escribe: F1 congela la pantalla en la que estás, la pone como captura para marcar o tapar, y al costado se escribe y se manda sin salir de Vender; antes de mandar avisa si alguien ya lo contó. | 1, 3, 5, 12, 13, 18, 19, 20, 21, 22 |

## Celular

| | Idea en una frase | Ideas del catálogo |
|---|---|---|
| **1 · El buzón** (evolución) | Arriba la tarjeta para escribir (idea/error, texto, cámara y galería grandes, miniaturas con ×), abajo los tickets con abiertos/resueltos y Enviar fijo bajo el pulgar. Mostrada **sin conexión**: lo tuyo queda «por enviar» y se avisa que los enviados se ven al volver. | 1, 3, 4, 7, 9, 23 |
| **2 · La charla** (reinvención) | Mejoras y errores es un chat de toda la ferretería: cada ticket es un mensaje con sus fotos, las resoluciones aparecen como avisos verdes con «Reabrir», y se escribe abajo como en WhatsApp: tipo, cámara, texto, flecha. | 1, 11, 14, 24, 25, 26 |
| **3 · Sacudí y marcá** (audaz) | Rompe el marco: sacudir el celular en cualquier pantalla la congela, se marca con el dedo lo que está mal, se dicta en vez de tipear (sirve con guantes) y se manda; sin menú de abajo, fondo pino. | 1, 12, 18, 19, 20, 27, 28 |

**Qué rompen las audaces.** Computadora 3: no hay lateral ni cabecera; la pantalla es una capa que
se abre sobre cualquier otra (F1), con la captura de esa pantalla como lienzo. Celular 3: no hay
menú de abajo; se entra sacudiendo, el fondo es pino oscuro (la tarea es «mirá esto», como la
cámara) y la entrada principal es la voz.

## Cuál me gusta más

**Computadora: la 3 para escribir y la 2 para seguir.** Quien encuentra un error está en otra
pantalla con el cliente adelante; la 3 le saca todos los pasos (ir a Más, abrir la pantalla,
sacar la captura, pegarla, decir dónde estaba) y la captura llega ya marcada, que es lo que
después necesita quien lo arregla. Lo que queda de la pantalla «Mejoras y errores» es para
seguirlos, y ahí la bandeja de la 2 se lee mejor que una lista: la captura grande, la charla y
resolver con una tecla y una nota.

**Celular: la 1 de base, con «sacudí y marcá» de la 3 como atajo.** La 1 es lo que pide la
especificación, terminada, y es la más clara sin conexión. Sacudir para avisar (con la captura
puesta y el dedo para marcar) es la versión celular de F1; juntas cumplen «menos de un minuto»
con holgura. La charla de la 2 es linda pero mezcla abiertos y resueltos en un solo hilo y la
especificación pide verlos separados con su cantidad.

## Cómo se mueve (una línea por interacción)

- **Elegir idea o error:** el verde suave se desliza de una opción a la otra (200 ms); el texto
  del botón Enviar cambia con un fundido («Enviar idea» → «Enviar error»).
- **Sumar una foto o pegar una captura:** la miniatura crece desde el botón (de 80 % a 100 % con
  rebote corto); el contador «2 de 5» rueda. Al llegar a 5, los botones de sumar se apagan y una
  sacudida corta avisa si se insiste (celular: vibra 10 ms).
- **Quitar una foto:** la miniatura se encoge y las otras se corren a llenar el lugar (200 ms).
- **Enviar:** el ticket vuela de la tarjeta a la lista y entra arriba con su borde verde 1 s;
  la caja se vacía y el cursor vuelve a ella. Celular: vibración doble 10-40-10 ms.
- **Sin conexión:** el ticket entra igual, pero en ámbar con la nube; cuando sale, la nube sube y
  la tarjeta se funde a blanco.
- **Resolver (compu 2):** el ticket se tilda (300 ms), se desliza fuera de la lista y el número
  de «Abiertos» baja rodando; «Deshacer» queda 4 s en una tostada.
- **F1 / sacudir (audaces):** la pantalla se congela con un destello blanco de 120 ms, se
  achica al lienzo (320 ms, `--curva`) y la hoja entra desde el costado o desde abajo; Esc o ×
  hace el recorrido al revés y deja la pantalla como estaba.
- **Marcar con el dedo o el mouse:** el trazo sigue al dedo sin demora, y al soltar se suaviza.
- **Dictar:** las palabras aparecen mientras se habla; lo ya entendido en tinta, lo provisorio en
  gris.
- **Ver una foto en grande:** se abre desde la miniatura hacia el centro (320 ms) con el fondo
  oscurecido al 30 %; ← → o deslizar para pasar.

## Autocrítica (lo que corregí antes de mostrar)

- Compu 1: «Encontré un error» se partía en dos renglones y los tres números de resumen se salían
  por la derecha; achiqué márgenes y rótulos. Saqué el «por enviar» de la lista porque el lateral
  decía «En línea · todo enviado»: la contradicción se notaba; en su lugar, «Esperan +7 días».
- Compu 2: la captura grande mostraba la cabecera de Vender y no lo importante; ahora se centra
  en lo marcado. La nota se partía en dos renglones.
- Compu 3: el trazo y la nota no caían sobre los tarugos; el hueco de la hoja ahora lo llena
  «¿Es el mismo que avisó Rosa?».
- Celu 1: las opciones se partían («Tengo una / idea»): en el celular dicen «Una idea» y «Un
  error» (textos resumidos, decisión 47). La mostré sin conexión para que el estado tenga sentido.
- Celu 2: los filtros se partían en dos renglones y la primera burbuja quedaba cortada de golpe;
  ahora se funde arriba como en un chat.
- Lo más flojo que queda: las capturas son recortes de maquetas, chiquitas en las miniaturas de
  la compu 1 se leen poco (se entiende que son pantallas, no qué dicen). La charla (celu 2) no
  separa abiertos y resueltos como pide la especificación salvo por los filtros. Faltó una foto
  «real» (la etiqueta de la caja de tarugos sacada con el celular): uso la foto de producto.

## Catálogo de ideas

Tarea más frecuente: avisar de un error con una captura. Hoy (según la especificación), en el
celular: ir a Más, tocar Mejoras y errores, elegir error, escribir, tocar sumar foto, ir a la
galería, elegir la captura (que antes hubo que sacar con dos botones), Enviar: unos 9 toques más
la captura aparte.

| # | Idea | Problema que resuelve | Variantes | Patrón de | Ahorra | ¿Fuera de la spec? |
|---|---|---|---|---|---|---|
| 1 | Idea / error como dos botones grandes con ícono (bombita, bicho), el elegido en verde suave | Elegir el tipo de un vistazo, sin que parezca alarma | Todas | Apple Feedback, Linear | 0 | No |
| 2 | Resumen arriba: abiertos con barras de creados/resueltos por semana, resueltos del mes | Saber si los avisos se atienden o se apilan | C1 | Linear Insights | 0 | Sí (las barras y el número del mes) |
| 3 | Pegar una captura con Ctrl V directo en la pantalla, y en el celular cámara y galería como botones grandes al lado de las miniaturas | Sumar fotos sin buscar el botón de adjuntar | C1, C3, Ce1 | Slack, GitHub | 2–3 | No |
| 4 | «Va con»: se muestra qué se manda solo (quién, dispositivo, versión) | Que no se pregunte lo que se puede deducir, y que se vea que se manda | C1, C3, Ce3 | Apple Feedback Assistant | 0 | No (lo hace visible) |
| 5 | Botón Enviar que dice qué se envía («Enviar idea» / «Enviar error») con Ctrl Enter | Confirmar el tipo sin releer | C1, C3, Ce1, Ce3 | Linear | 0 | No |
| 6 | Filtros Ideas / Errores con su cantidad, además de abiertos / resueltos | Quien arregla busca los errores primero | C1, C2 | Linear, GitHub Issues | 1 | Sí |
| 7 | Molde de ticket: tipo en azulejo, texto en dos renglones, quién · cuándo · dispositivo, miniaturas apiladas, estado, flecha | Leer la lista de un vistazo, igual en las dos | C1, Ce1 | Referencias de Carlos | 0 | No |
| 8 | «Esperan +7 días» en el resumen y una pastilla ámbar con los días en el ticket viejo | Que nada quede olvidado | C1 | Zendesk SLA | 0 | Sí |
| 9 | «Por enviar» en ámbar con la nube, y el aviso «los enviados se ven cuando vuelva la conexión» | Que se sepa que no se perdió y que sale solo | Ce1 | WhatsApp (reloj del mensaje) | 0 | No |
| 10 | «Sacar con el celular» junto a «Elegir archivos» (el QR y el aviso del espejo) | Sacar una foto real desde la compu | C1 | Decisiones 41–42 | 3 | No |
| 11 | Bandeja de dos paneles: lista y detalle al lado, J/K para pasar, E para resolver, Espacio para ver la foto | Revisar muchos tickets sin abrir y cerrar | C2 | Linear, Mail | 2 por ticket | Sí (la forma) |
| 12 | La captura marcada: círculo a mano, flecha, nota | Que quien arregla vea dónde mirar | C2, C3, Ce3 | Captura de iOS, Jam, Marker.io | — | Sí |
| 13 | El contexto automático: en qué pantalla estaba («Estaba en Vender», venta de 5 productos) | No hay que contar dónde estaba | C2, C3 | Sentry, Jam | 0 (y menos texto) | Sí |
| 14 | «A mí también» en vez de repetir el ticket | Evitar duplicados y medir cuántos lo sufren | C2, Ce2 | GitHub reacciones, Canny | Un ticket entero | Sí |
| 15 | La charla del ticket (comentarios) | Preguntar sin ir a buscar a la persona | C2 | Linear, GitHub | — | Sí |
| 16 | Nota y «Marcar resuelto» siempre abajo del detalle, con una tecla | Resolver con nota en un gesto | C2 | Linear | 1 | No |
| 17 | Filtro «Míos» | Ver qué pasó con lo que avisé | C2, Ce2 | GitHub | 1 | Sí |
| 18 | F1 en la compu / sacudir en el celular, en cualquier pantalla, abre el aviso con la captura de esa pantalla ya puesta | Avisar sin dejar lo que se estaba haciendo ni sacar la captura aparte | C3, Ce3 | Shake to report (Instabug, Google Maps) | 5–6 | Sí |
| 19 | Tapar parte de la captura (la ganancia, el cliente) antes de mandarla | Las capturas pueden mostrar datos del negocio y todos las ven | C3, Ce3 | Capturas de iOS, Jam | — | Sí |
| 20 | La pantalla congelada detrás, con la hoja al costado; Esc vuelve exactamente al mismo lugar | Que avisar no corte la venta | C3, Ce3 | Spotlight, Apple Feedback | 2 | Sí |
| 21 | «¿Es el mismo que avisó Rosa?» antes de mandar, con «Sumarme» | Duplicados | C3 | Stack Overflow, Canny | Un ticket | Sí |
| 22 | «Lo ven: todos los de la ferretería» escrito en la hoja | Que se escriba sabiendo quién lo lee | C3, C1 | Slack (canal público) | 0 | No (lo explicita) |
| 23 | Volver a Más con «‹ Más» arriba (Más es una lista de tarjetas, no pestañas) | Saber dónde está y cómo salir | Ce1 | iOS | 0 | No |
| 24 | Los tickets como mensajes de un chat de toda la ferretería | Se usa sin aprender nada: es WhatsApp | Ce2 | WhatsApp, Slack | 2 | Sí (la forma) |
| 25 | La resolución como aviso verde dentro de la charla, con «Reabrir» ahí mismo | Enterarse de que lo arreglaron | Ce2 | GitHub (eventos en la línea de tiempo) | 1 | No |
| 26 | Escribir abajo como en un chat: tipo, cámara, texto y flecha en una línea | Avisar en 2 toques | Ce2 | WhatsApp | 4 | Sí (la forma) |
| 27 | Dictar el texto con un botón grande | Con guantes o con una caja en la mano no se tipea | Ce3 | Notas de voz, Vender celu 3 | El tipeo | Sí |
| 28 | Fondo pino oscuro solo en el modo «avisar» | Que se note que es un modo aparte, como la cámara | Ce3 | Captura de iOS | 0 | Sí |
