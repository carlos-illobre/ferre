# Catálogo → Listas de precios: seis maquetas para Carlos

Las capturas están lado a lado en `comparacion-compu.png` y `comparacion-celu.png`. Cada maqueta
se abre sola desde su `index.html`: usa `../../../_comun/` y los íconos que faltaban, en
`_propio/iconos-extra.js` (Lucide 0.460). Todas muestran la misma lista, así se compara igual
con igual: **Bulonera Centro, lista del 17/10/2026, llegó por correo a las 08:12**. Tiene 7.096
leídos: 876 cambian de costo (+8,4 % en promedio), 4 son nuevos y 6.216 quedan sin cambio. Además,
12 productos ya no están y hay 6 filas salteadas. De los 876 que cambian de costo, 641 cambian
también el precio de estantería y 235 no, porque el redondeo a $1.000 los deja igual. Las cuentas
cierran con los costos: la mecha, por ejemplo, tiene lista $3.480 − 25 % − 5 % = $2.479,50; con
margen 100 % e IVA da $6.000,39, que se redondea a $7.000.

## Computadora

| | Idea en una frase | Ideas del catálogo |
|---|---|---|
| **1 · La bandeja y la revisión** (evolución) | Lo que pide la especificación, en una sola pantalla. A la izquierda: cargar, lo que espera revisión, las últimas cargas y los proveedores con la lista vieja. A la derecha, la revisión de la lista elegida: seis números, el aviso de contado, filtros, la tabla con costo antes, costo nuevo y precio de estantería antes y después, la explicación del costo debajo de la fila con foco, y «Aplicar · cambian 641 precios». | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 |
| **2 · Qué pasa en el mostrador** (reinvención) | Una bandeja como la de Linear (para revisar, de quién es, lista vieja, al día) y, en lugar de una tabla de costos, las consecuencias: «641 precios cambian», con las barras por rubro, y tres tarjetas: los nuevos con su margen para elegir antes de aplicar, las subas grandes y los que ya no están. Se aplica con «Aplicar y remarcar», que ya prepara las etiquetas. | 1, 3, 11, 12, 13, 14, 15, 16, 17, 18 |
| **3 · La planilla tal cual llegó** (audaz) | Rompe el marco: no hay lateral y se ve el Excel del proveedor, con sus letras, sus filas y su basura arriba. Sobre cada columna, lo que el sistema entendió; donde duda, pregunta ahí mismo («¿Qué es? Parece el código de barras»). Pegadas a cada fila van tres columnas de Ferrebress: costo, cambio y precio de estantería. Las filas salteadas se ven rayadas, con el motivo, y las ofertas, separadas. | 2, 5, 8, 19, 20, 21, 22, 23, 24 |

## Celular

| | Idea en una frase | Ideas del catálogo |
|---|---|---|
| **1 · Listas** (evolución) | La pantalla aprobada el 17/10 llevada al nivel de las referencias. La lista pendiente va como tarjeta principal, con tres cifras, la franja de proporción y «Revisar y aplicar». Debajo, «Y 1 más», «Cargar una lista», las últimas cargas y los proveedores. | 1, 3, 25, 26 |
| **2 · El impacto** (reinvención) | Al revisar, primero el número que importa: «641 precios cambian», con las barras por rubro. Después, los nuevos sin precio con los cinco márgenes grandes para elegir antes de aplicar, las subas grandes y los que ya no están. Se aplica deslizando. | 11, 12, 13, 15, 27 |
| **3 · Remarcar caminando** (audaz) | Rompe el marco: no hay menú de abajo. Es el recorrido por la estantería, una tarjeta por producto en el orden de los pasillos, con la ubicación, una foto grande, lo que decía y el precio nuevo en 64 px. Se toca «Remarcado» y entra el siguiente. Arriba se ve el avance por pasillo. | 28, 29, 30, 31, 32, 33 |

**Qué rompe la audaz.**
- **Computadora:** saca el lateral y las pestañas (vuelve con Esc). Cambia las tarjetas por una grilla de planilla, densa y gris, y pasa la explicación a una barra fija abajo.
- **Celular:** saca el menú de abajo y las pestañas. Es un modo de una sola tarea a pantalla completa, como la cámara, y la pantalla muestra un producto por vez en lugar de una lista.

## Cuál me gusta más

**Computadora: la 2 de entrada, con la «Fila por fila» de la 1 y «La planilla» de la 3 como
vistas.** La pregunta real de Carlos al abrir una lista no es «qué costos cambiaron», sino «qué
me cambia en el local». «641 precios para remarcar, 4 sin precio, 23 subas para mirar» se
contesta de un vistazo, y elegir el margen de los nuevos antes de aplicar ahorra el viaje
posterior al aviso de remarcar (RF-15). El conmutador «Qué pasa · Fila por fila · La planilla»
ya está dibujado en la 2. La 1 queda como la vista detallada y la 3, como la vista que da
confianza cuando el formato es nuevo (RF-03).

**Celular: la 1 para entrar, la 2 para revisar y la 3 para después de aplicar.** No compiten:
son tres momentos del mismo trabajo. La 3 es la que más cambia el día a día: hoy remarcar es un
papel con 641 renglones; así es una pila de tarjetas ordenada por pasillo.

## Cómo se mueve (una línea por interacción)

- **Soltar el archivo (compu 1):** la zona punteada se tiñe de pino suave y el ícono sube 4 px
  mientras se arrastra. Al soltar, la tarjeta se convierte en la fila «Leyendo… 2.310 de 7.096»,
  con su barra llenándose de izquierda a derecha.
- **Llega una lista sola (bandeja):** la fila entra desde 8 px arriba con fundido, la insignia de
  la pestaña salta con rebote y, en el celular, vibra 10 ms.
- **Recorrer la tabla (compu 1 y 3):** el foco se desliza de fila a fila en 120 ms. La explicación
  se abre debajo, desplegándose en 200 ms, y sus pasos aparecen uno detrás de otro, 30 ms entre sí.
- **Elegir qué es una columna (compu 3):** el menú cae 8 px con fundido. Al elegir, la pastilla
  ámbar pasa a pino y la columna entera parpadea una vez en verde suave; las columnas de Ferrebress
  se rellenan de arriba hacia abajo, como una cascada.
- **Elegir el margen de un nuevo (compu 2, celu 2):** el segmento se desliza al elegido y «Sin
  precio» rueda hasta «$5.000». La tarjeta baja su contador («3 nuevos») con los dígitos rodando
  hacia abajo.
- **Aplicar:** en la compu, el botón se llena de izquierda a derecha con el avance real
  («3.210 de 7.096») y después «Buscando duplicados». En el celular, el pulgar se desliza hasta el
  final. Al terminar, el tilde se dibuja, hay una vibración doble y aparece «641 precios
  actualizados · 4 nuevos» con el botón «Empezar a remarcar».
- **Remarcar (celu 3):** «Remarcado» manda la tarjeta hacia arriba a la derecha con un giro de
  4°. La de atrás sube a su lugar con rebote corto, la barra del pasillo avanza y vibra 10 ms.
  Deslizar a la izquierda la manda al final de la pila. Cuando se completa un pasillo, su barra
  se pone verde y el tilde se dibuja.
- **Descartar:** la tarjeta de la lista se desvanece y baja 8 px. Hay una tostada con «Deshacer»
  durante 4 s y la lista queda en «Últimas cargas» como «Descartada».

## Autocrítica (lo que corregí antes de mostrar)

**Computadora 1**
- La revisión no entraba al lado del lateral completo: la tabla mostraba dos filas y media y el
  pie se partía en cuatro renglones.
- La corregí así: plegué el lateral (como pide el lenguaje para las pantallas que piden ancho),
  saqué la franja de proporción, acorté los textos y llevé la explicación a una sola línea.
- Lo que queda flojo: la columna izquierda trunca nombres («Distribuidora O…»).

**Computadora 2**
- Las tres tarjetas se salían por abajo y el botón de aplicar quedaba cortado.
- Saqué un rubro de las barras, moví «235 cambian de costo y no de precio» al resumen grande y
  pasé «Ver» al título de cada tarjeta.
- Lo que queda flojo: en la tarjeta de los nuevos solo entran dos de los cuatro.

**Computadora 3**
- El nombre del archivo se partía en la barra de arriba y sobraba un hueco abajo de la planilla.
- El título ahora es el proveedor y la fecha, y las lecturas quedaron en dos pastillas. Sumé la
  sección de ofertas del Excel, que muestra que se distinguen solas (historia 16).

**Celulares**
- Se partían «ya no están», «Y 1 más» y el detalle de las cargas.
- En la 2, la lista de debajo quedaba tapada por la barra de deslizar. Quité un rubro.
- En la 3 sobraba aire entre el nombre y el precio: puse costo y stock en pastillas.

**Lo más flojo que queda**
- La planilla de la compu 3 es la única pantalla gris y densa del sistema: es a propósito, pero
  rompe la calma.
- La foto de la mecha es la misma en todas.
- Las barras por rubro suponen que los productos tienen rubro, y hoy el rubro lo trae la planilla
  del proveedor, no el catálogo.

## Preguntas de la especificación que las maquetas dan por resueltas (para que Carlos las confirme)

- **Umbral de «suba grande»:** las maquetas usan 15 % (RF-15).
- **«Ya no están»:** se dibujó como «dejan de tener costo de este proveedor», marcando los que
  tienen stock y los que siguen con otro proveedor (RF-01).
- **Aviso de lista que llegó sola:** se dibujó dentro de la aplicación (insignia en la pestaña y
  bandeja) (RF-04).

## Catálogo de ideas

Cada idea se puede tomar o descartar sola. Los toques ahorrados se cuentan sobre la tarea más
frecuente: revisar y aplicar una lista que llegó sola y después saber qué remarcar. Hoy son
unos 8 toques: entrar a Listas, abrir la pendiente, mirar el resumen, recorrer la vista previa,
aplicar, abrir el aviso, filtrar y empezar a remarcar, más ir a cada producto nuevo a ponerle
margen (3 toques por cada uno).

| # | Idea | Problema que resuelve | Variantes | Patrón de | Ahorra | ¿Fuera de la spec? |
|---|---|---|---|---|---|---|
| 1 | Lista y revisión en la misma pantalla (bandeja a la izquierda, revisión a la derecha) | Ir y volver entre la pantalla Listas y la de revisión | C1, C2 | Mail de Apple, Linear | 1 por lista | No |
| 2 | Seis números de resumen en una fila (leídos, cambian con %, nuevos, sin cambio, ya no están, salteadas) | Entender la lista de un vistazo | C1, C3 (pastillas) | Stripe (resumen de un pago) | — | No |
| 3 | «Para revisar» arriba, con cómo llegó (correo, portal) y cuándo | Saber qué espera sin buscarlo | C1, C2, celu 1 | Linear (bandeja) | 1 | No |
| 4 | Aviso de contado que no coincide, con «Usar 6 %» ahí mismo | Corregir la configuración sin ir a la ficha del proveedor | C1 | Stripe (aviso con acción) | 3 | **Sí** (la acción; el aviso está) |
| 5 | Precio de estantería antes → después en cada fila, no solo el costo | Lo que importa en el mostrador es el precio, no el costo | C1, C3 | Shopify (comparar precio) | — | **Sí** |
| 6 | Explicación del costo abierta debajo de la fila con foco, en pasos (lista › − 25 % › − 5 % › margen › IVA › $7.000) | RF-13 sin abrir nada | C1, C3 (en el pie) | Stripe (desglose de tarifa) | 1 por fila | No |
| 7 | Filtros con su número: Cambian, Subas de más de 15 %, Nuevos, Ya no están, Salteadas | Ir directo a lo que preocupa | C1 | Referencia de Carlos (chips) | 1 | No |
| 8 | «Costo bajó, el precio queda igual» y «Sin precio» dichos en la fila | Saber cuáles no hay que tocar en la estantería | C1, C3 | — | — | No |
| 9 | «Aplicar · cambian 641 precios» con Ctrl Enter; Descartar con Alt D | Saber qué hace el botón antes de tocarlo | C1, C3 | Stripe Checkout | — | No (la spec pide decir cuántos) |
| 10 | Proveedores con la lista vieja en la columna, con los días | Pedir la lista antes de que el precio quede viejo | C1, C2, celu 1 | — | 1 | No |
| 11 | «Qué pasa si aplicás»: el número de precios de estantería que cambian, en grande | Decidir con la consecuencia y no con 876 costos | C2, celu 2 | Apple Fotos (recuerdos: resumen primero) | — | **Sí** |
| 12 | Barras de variación por rubro (cuánto sube cada familia) | Ver de un vistazo dónde está la suba | C2, celu 2 | Stripe Sigma, Shopify Analytics | — | **Sí** |
| 13 | Elegir el margen de los nuevos antes de aplicar, en la misma revisión | Los nuevos entran ya con precio; no hay que volver | C2, celu 2 | Linear (completar al triar) | 3 por producto nuevo | **Sí** (la spec lo pone después, en el aviso) |
| 14 | Tarjeta de subas grandes con las tres peores | Revisar lo raro antes de que llegue a la estantería | C2 | Stripe Radar | 2 | No |
| 15 | «Ya no están» con lo que les pasa: tiene stock / sigue con otro proveedor | Saber si dar de baja es un problema | C2, celu 2 | — | 2 | **Sí** (depende de la pregunta de RF-01) |
| 16 | Bandeja con grupos: Para revisar · ¿De quién es? · Lista vieja · Al día | Toda la operación de listas en una columna | C2 | Linear (Inbox), Superhuman | 1–2 | No |
| 17 | Estado de los canales al pie: «correo revisado hace 6 min · 3 portales» | Confiar en que las listas llegan solas | C2 | Dropbox (estado de sincronización) | — | No (RF-04, registro de ejecuciones) |
| 18 | «Aplicar y remarcar» con «Imprimir las etiquetas» tildado | Del aplicar se pasa directo a remarcar, sin buscar el aviso | C2 | Shopify (comprar etiqueta al cumplir) | 2 | **Sí** (une RF-01 y RF-15) |
| 19 | Ver la planilla del proveedor tal cual llegó, con lo que entendió el sistema pegado a cada fila | Confiar en que leyó bien; ver por qué salteó una fila | C3 | Diff de GitHub, Airtable | — | **Sí** |
| 20 | Indicar columnas tocando el encabezado, con una sugerencia («parece el código de barras: 13 cifras, 779…») | RF-03 sin una pantalla aparte | C3 | Google Sheets (smart fill), Airtable (importar CSV) | 3–5 por formato nuevo | No (cómo, sí) |
| 21 | Fecha y encabezado detectados marcados sobre la planilla (pastilla verde sobre «17/10/2026») | Saber de dónde sacó la fecha | C3 | Apple Live Text | 1 | **Sí** |
| 22 | Filas salteadas rayadas con su motivo en la misma fila | Ver las salteadas sin otra lista | C3 | Excel (errores en celda) | 1 | No |
| 23 | Sección de ofertas reconocida y marcada «van aparte, con su fecha de fin» | Las ofertas no se confunden con el precio de lista | C3 | — | — | No (historia 16) |
| 24 | Vista «La planilla» a pantalla completa, sin lateral, con Esc | Ancho para la planilla real | C3 | Figma (modo presentación) | — | **Sí** (marco) |
| 25 | Tarjeta pendiente con tres cifras y la franja de proporción, con «Revisar y aplicar» naranja | Lo único que hay que hacer, arriba y bajo el pulgar | celu 1 | Referencia de Carlos, Apple Wallet | — | No |
| 26 | «Y 1 más: Ferretera del Sur, de su portal» en una línea | Varias pendientes sin llenar la pantalla | celu 1 | Notificaciones agrupadas de iOS | — | No |
| 27 | Deslizá para aplicar | No aplicar por un toque sin querer (no hay ventana de confirmación) | celu 2 | iPhone (deslizar para apagar) | 0 | **Sí** |
| 28 | Modo «Remarcar» a pantalla completa, un producto por tarjeta | Remarcar caminando con una mano (ux.md lo pide) | celu 3 | Tinder, Apple Fotos (de a una) | ~2 por producto | No (cómo, sí) |
| 29 | Orden por pasillo y estantería, con «la que sigue» | No ir y volver por el local | celu 3 | Google Maps (ruta) | — | **Sí** |
| 30 | Avance por pasillo (A listo, B 11/188, C 141…) | Saber cuánto falta y dónde | celu 3 | Apple Fitness (anillos), Duolingo | — | **Sí** |
| 31 | Lo que decía tachado y el precio nuevo en 64 px | Leerlo de lejos, con la etiqueta en la mano | celu 3 | Apple Wallet (pase) | — | No |
| 32 | Deslizar a la izquierda = dejar para después | Un producto que no está a mano no frena el recorrido | celu 3 | Mail de iPhone | 1 | **Sí** |
| 33 | Escanear la etiqueta para confirmar e imprimir la de uno desde la tarjeta | Confirmar que se remarcó el producto correcto | celu 3 | Shopify POS (escaneo de inventario) | 1 | **Sí** (RF-57 para imprimir) |

**Total de toques de la tarea frecuente:**
- **Hoy:** unos 8, más 3 por cada producto nuevo (con 4 nuevos, unos 20).
- **Compu 1:** ~4 (elegir la pendiente, mirar, Ctrl Enter, abrir el aviso).
- **Compu 2:** **~6** (J, un clic por cada uno de los 4 márgenes y A; al aplicar ya quedan listas las etiquetas).
- **Celu 2 → 3:** **~2** más un toque por producto remarcado (abrir, deslizar).
