# Requerimientos de interfaz: catálogo y precios

Qué tiene que poder hacer cada rol en cada recorrido de [spec.md](spec.md), qué necesita ver
y con qué reglas. No describe un diseño: cualquier diseño que cumpla esto vale. Las reglas
generales están en la constitución (principios II, III, IV y IX) y el detalle visual en el
sistema visual del proyecto.

## Reglas que valen para todos los recorridos

- **En el celular y en la computadora.** Cada recorrido se hace completo en los dos, con la
  misma marca y las mismas palabras. Lo que cambia es cómo se opera. Si son dos interfaces
  o una que se adapta lo decide el diseño (constitución, principio III).
- **Roles.** En esta versión todos los usuarios son Administrador y pueden hacer todo; el
  rol que nombra cada recorrido dice quién hace ese trabajo en el local.
- **Computadora:** todo se hace con teclado; el mouse nunca es la única forma. El foco se ve
  siempre, sigue el orden del recorrido y vuelve a la búsqueda al terminar una acción. Lo
  que se abre encima se cierra con Escape. Aprovecha el ancho: se comparan muchos productos
  a la vez.
- **Celular:** se opera con una mano, con el pulgar. Lo que más se usa queda al alcance del
  pulgar y es fácil de acertar. Nada se desplaza hacia el costado. La cámara es la trasera.
- **Orden del mostrador:** buscar, precio, cantidad, cobro. La búsqueda va primero en todo
  recorrido que empieza por un producto.
- **Sin ventanas de confirmación**, salvo para lo que no se puede recuperar. En esta
  capacidad ninguna acción abre una: «Aplicar» es la confirmación de la lista, y unir y
  separar se deshacen una con la otra.
- **Errores en el lugar**, al lado de lo que falló, en castellano, diciendo qué hacer. Se van
  solos cuando se corrige la causa.
- **Lo que tarda muestra su avance** con números (cuánto va de cuánto), no un indicador sin
  fin.
- **Todo número calculado se puede tocar** (o alcanzar con teclado) y muestra su explicación
  paso a paso (RF-13). La explicación tiene la misma forma en todos lados, y se nota a
  simple vista qué números la tienen (ver los requerimientos de interfaz generales).
- **Cada recorrido se explica solo:** el estado vacío dice qué hacer para empezar.
- **Palabras del mostrador** (son regla): «lista» y no «importación»; «costo» y no «precio de
  compra»; «margen»; «precio» para el de venta; «sin precio» para el producto sin margen
  elegido; «sin costo» para el que ningún proveedor cotizó; «es el mismo» y «son distintos»
  para los duplicados; «unir» y «separar»; «suelto» o por kilo, metro, litro; «aplicar» y
  «descartar» para una lista; «estantería» para el mueble donde va la mercadería. Se nombra el rol, nunca a la persona.
- **Dinero:** siempre con signo $, punto de miles y, donde hay centavos, coma. Los
  porcentajes, con el signo %.

## Buscar un producto (historia 1 · RF-07, RF-05)

**Rol:** Vendedor (y cualquiera que tenga que encontrar un producto).

**Tiene que poder:** escribir sin tocar nada antes; ver los resultados mientras escribe;
recorrerlos y elegir uno; llegar al final de todos los resultados; limpiar la búsqueda con
una sola acción; en el celular, abrir el escáner desde la misma búsqueda.

**Necesita ver, en este orden, por cada resultado:** foto chica (o su ícono), descripción,
marca, proveedor del que sale el costo, precio de venta (o «sin precio»), precio por bulto si
existe. Si hay más de un proveedor, que se note.

**Computadora:** flechas para recorrer, una tecla para elegir, Escape para limpiar; los
atajos de margen funcionan sobre el resultado elegido sin sacar el foco de la búsqueda.

**Celular:** la caja de búsqueda queda fija a la vista mientras se recorren los resultados;
tocar un resultado abre su ficha. Al lado de la caja, el botón de escanear y el de los filtros tienen el
mismo tamaño y el mismo redondeo (Carlos, 2026-10-17).

**La pantalla Productos, como la v2** (Carlos, 2026-10-20, decisión 145; maquetas de referencia
`maquetas/compu-productos-v2-referencia.png`, `maquetas/celular-productos-v2-referencia.png` y
`maquetas/celular-ficha-v2-referencia.png`), con el lenguaje «Mostrador»: fondos blancos y grises,
el verde solo para lo elegido.

- **Arriba**, junto a las pestañas: cuántos productos hay y, si los hay, cuántos están «sin precio»
  (pastilla ámbar con el triángulo); en la computadora, además, «Escanear con el celular» (con el
  celular vinculado) y «Cargar lista» (que lleva a Listas, a quien puede cargarlas). En el
  celular, los «sin precio» van como pastilla arriba de la lista.
- **Cada producto de la lista**, una tarjeta blanca: la foto, el nombre en negrita y mayúsculas, la
  marca y el stock con su unidad (verde si hay, rojo «Sin stock»), y a la derecha el precio con el
  margen debajo, en verde; sin precio, «Sin precio» en ámbar y debajo qué falta. En la
  computadora, el carrito es un botón cuadrado de ícono al final de la fila; en el celular, el
  stock va arriba del nombre («6 un. en stock»), debajo la marca y el código del proveedor, y
  «Agregar» debajo del precio.
- **Computadora: la lista a la izquierda y la ficha del elegido siempre abierta a la derecha.**
  Tocar un producto o moverse con ↑ ↓ cambia la ficha, sin abrir ni cerrar nada. El elegido se
  marca en verde suave con una raya verde a la izquierda. Debajo de la lista, las teclas: «+»
  agrega, Mayús + 1–5 el margen, Alt F los filtros. La ficha (ver specs/016) tiene arriba la foto,
  el stock, el nombre, la marca y el código, el precio grande y los márgenes como segmentos (300,
  200, 100, 50, 25, Otro); después el código de barras; «Proveedores» con todos a la vista (el en
  uso con su inicial en verde, la estrella en el más barato, «Usar» en los demás) al lado de «Así
  se calcula» (abierto; F1 lo pliega); el archivo de origen; y al pie las teclas, «Listo» (vuelve a
  la búsqueda) y «Agregar a la venta» en naranja. Enter lleva el foco a la ficha y Esc lo devuelve
  a la búsqueda. En una ventana de menos de 900 px la ficha vuelve a abrirse encima.
- **Celular: la ficha ocupa la pantalla**, con «‹ Productos» arriba para volver y el menú de abajo a
  la vista: la foto grande con el stock encima y «Cambiar foto»; el nombre y la marca con el
  código; el precio de venta grande con «margen N %» y «Así se calcula», que despliega los márgenes
  y la cuenta; el código de barras; el proveedor en uso con su costo y «+N más», que despliega los
  demás; y fijos abajo «Listo» y «Agregar a la venta» en naranja. En la búsqueda, el botón de
  filtros va antes que el de escanear, que es el oscuro.

**Estados:**

| Estado | Qué tiene que pasar |
|---|---|
| Vacío (catálogo sin productos) | Dice que todavía no hay productos y que hay que cargar una lista de precios, con el camino para hacerlo |
| Sin escribir nada | Invita a escribir nombre, código o código de barras |
| Sin resultados | Dice que no hay nada con ese texto, lo muestra, y sugiere probar con menos palabras |
| Cargando el catálogo por primera vez | Avance visible; se puede buscar en cuanto hay datos |
| Cargando más resultados | Se ve que hay más y que están llegando |
| Sin conexión | No se nota: se busca igual. Un indicador discreto dice que se está sin conexión |
| Error al bajar el catálogo | Dice qué pasó y deja reintentar; lo ya bajado se sigue usando |

## Elegir el margen y ver el precio (historia 2 · RF-10, RF-13, RF-19)

**Rol:** Administrador; es también lo que hace quien vende, en el mostrador.

**Tiene que poder:** elegir una de las cinco opciones (300 / 200 / 100 / 50 / 25 %) con un
solo toque o una sola acción de teclado; tipear otro porcentaje; quitar el margen; ver al
instante el precio que resulta; pedir la explicación del costo y la del precio.

**Necesita ver, en este orden:** el producto, su costo, las cinco opciones con la elegida
marcada, el precio de venta. Costo, opciones y precio se ven juntos, sin cambiar de lugar
entre un producto y otro. Si el margen es a mano, se ve el porcentaje y que es a mano, y
ninguna de las cinco queda marcada.

**Explicación del costo:** proveedor y fecha de la lista, precio de lista, IVA quitado si lo
incluía, cada descuento en orden con su porcentaje y el resultado parcial, costo final.

**Explicación del precio:** costo, «+ N % de margen = …», «+ IVA N % = …», «Redondeado para
arriba a … (múltiplo de $1.000,00)».

**Computadora:** un atajo por cada una de las cinco opciones, que funciona con el foco en la
búsqueda y sobre el resultado elegido; el porcentaje a mano se tipea y se confirma con una
tecla, y Escape lo cancela. En la ficha del producto (2026-10-15): ← y → recorren las cinco
opciones sin elegir ninguna y Enter elige la que tiene el foco; ↑ y ↓ recorren, uno por uno,
los proveedores de «Quién lo vende» y el botón «Listo», donde Enter usa ese proveedor o cierra
la ficha; ↑ desde el primer proveedor vuelve a las opciones de margen. Las flechas valen
desde cualquier lugar de la ficha, salvo ← y → en una caja de texto, que mueven el cursor.

**Celular:** las cinco opciones entran en un renglón y se aciertan con el pulgar; el
porcentaje a mano abre el teclado numérico.

**Estados:**

| Estado | Qué tiene que pasar |
|---|---|
| Sin margen | «sin precio», con las opciones a la vista |
| Sin costo | «sin costo»; las opciones no se pueden elegir y se entiende por qué |
| Éxito | El precio cambia en menos de 100 ms; no hay mensaje que cerrar |
| Sin conexión | Se elige igual; se ve que el cambio quedó guardado en el dispositivo y sin enviar |
| Error de validación | En el lugar: qué valores se aceptan (un porcentaje entero de 1 a 10.000) |
| El servidor rechazó un cambio guardado | Quien lo hizo se entera, con el producto y el motivo |

## Cargar la lista de un proveedor (historias 3, 11 y 12 · RF-01, RF-02, RF-03)

**Rol:** Administrador.

**Tiene que poder, en este orden:** entregar el archivo (elegirlo o, en la computadora,
arrastrarlo); corregir el proveedor si el sistema no lo reconoció o lo reconoció mal; indicar
la fecha si la planilla no la dice; indicar qué columna es qué si el formato es nuevo;
revisar el resumen y la vista previa; aplicar o descartar; ver el resultado.

**Necesita ver antes de entregar un archivo:** las listas que esperan revisión, primero y
bien visibles; los proveedores con la fecha de su última lista aplicada y un aviso en los que
tienen la lista vieja; las últimas cargas con su situación.

**El orden de la pantalla Listas** (pedido de Carlos del 2026-10-13), en el celular y en la
computadora: primero «Cargar una lista», que es para lo que se entra; después las últimas tres
cargas; y al final los proveedores, con «Agregar proveedor».

**La pantalla Listas en el celular** (Carlos, 2026-10-17, sobre una referencia suya; maqueta
aprobada `maquetas/celular-listas-renovada.png`):

- **Una lista que espera revisión:** «Lista pendiente de revisar», el proveedor y «Lista del
  dd/mm/aaaa» a la izquierda, «Revisar y aplicar» a la derecha, y abajo, en pastillas, cuántos
  productos, cuántos cambian de precio (con su variación promedio) y cuántos nuevos.
- **«Cargar una lista»** («Excel del proveedor (.xlsx)»), con «Subir lista» a la derecha: un
  botón secundario, de 36 px de alto (decisión 104).
- **Cada carga y cada proveedor**, en filas separadas por 1 px:
  - un ícono (el de Excel en las cargas, uno de negocio en los proveedores);
  - el nombre del proveedor en negrita y, a la derecha, su estado como pastilla de color:
    «Aplicada» (verde, ✓) o «Pendiente» (amarilla, reloj) en las cargas; «Vigente» o «Al día»
    (verde), «Vieja» (naranja suave) o «Sin lista» (gris) en los proveedores;
  - una línea con qué lista es: «Lista del 11/10/2026 · subida 12/10» en las cargas, «Lista
    del 28/09/2026 · hace 19 días» en los proveedores, o «Nunca se cargó una lista»;
  - los datos, cada uno con su ícono y el número en negrita: el archivo y «+4 nuevos · 876
    cambiados» (o «7.096 leídos» si no se aplicó) en las cargas; los productos, el lector y
    los descuentos («10 %», «5 % contado»; el que es 0 no figura) en los proveedores.
- **Un buscador «Buscar proveedor»**, pegado a la lista de proveedores, que deja los que tienen
  lo escrito en el nombre, sin importar mayúsculas ni tildes.

**La pantalla Listas como la v2** (decisión 148, 2026-10-24; la variante 1 del director de
arte, «La bandeja y la revisión» en la computadora y «Listas» en el celular). Manda sobre lo
anterior en la disposición y las piezas; lo que la pantalla puede hacer es lo mismo.

- **Computadora: bandeja a la izquierda y revisión a la derecha, en la misma pantalla.** Al lado
  de las pestañas, «Agregar proveedor» y «Subir lista Alt S». La columna izquierda, de arriba
  abajo: la zona punteada «Cargar una lista · Soltá el Excel acá, o Alt S»; «Para revisar» con
  su cantidad y una fila por lista pendiente (ícono, proveedor, «dd/mm · subida hoy hh:mm» y su
  tecla 1, 2…), la elegida con borde verde oscuro; «Últimas cargas» (las tres últimas ya
  aplicadas o descartadas, con su pastilla); y la tarjeta «Proveedores» con la cantidad,
  «Buscar /» y una fila por proveedor (punto verde o ámbar, nombre, pastilla «Vieja · 41 días»,
  «Al día» o «Sin lista», y debajo sus descuentos, si los precios traen IVA y su lector), los de
  lista vieja primero.
- **La revisión, en una tarjeta a la derecha:** el ícono de la planilla, «Proveedor · lista del
  dd/mm/aaaa» y debajo el archivo y cuándo se subió; seis números en una fila (Leídos, Cambian
  con el promedio, sobre verde suave, Nuevos, Sin cambio, Ya no están, Salteadas en ámbar); los
  avisos de la planilla en una franja ámbar; los filtros como pastillas con su número; la tabla
  (foto, producto con marca y código, costo antes, costo nuevo subrayado de puntos, cambio en
  una pastilla —ámbar si sube más de 15 %, verde si baja— y precio en estantería); la fila con
  foco va en verde suave con una raya a la izquierda y debajo, en pasos, de dónde sale su costo.
  Al pie: «Descartar Alt D», «Nada cambia hasta aplicar», las teclas ↑ ↓ Espacio y el botón
  naranja «Aplicar · cambian N precios Ctrl Enter». Aplicando, el pie muestra el avance.
- **Sin listas para revisar,** la derecha dice qué hacer: cargar una lista. Después de aplicar,
  la derecha muestra el resultado, con «Ver los productos».
- **Teclado:** Alt S elige el archivo, 1 a 9 abren la lista pendiente de ese número, ↑ ↓
  recorren la tabla, Espacio pliega la explicación de la fila, Alt D descarta, Ctrl Enter
  aplica, «/» busca un proveedor.
- **Celular:** la lista pendiente como tarjeta blanca principal (ícono ámbar, «Para revisar»
  en ámbar, el proveedor, «Lista del dd/mm/aaaa · subida hh:mm»), tres cifras (cambian con el
  promedio sobre verde suave, nuevos, no están), la franja de proporción y «Revisar y aplicar →»
  naranja a todo el ancho; si hay más, «Y N más: proveedor». Después «Cargar una lista» con
  «Subir lista», «Últimas cargas» y «Proveedores» con su cantidad y la lupa, en grupos blancos
  con filas separadas por una línea. La revisión sigue en una hoja.
- **Lo que la v2 muestra y el sistema todavía no sabe** (E02 de la 021): cómo llegó la lista
  (correo, portal), el precio de estantería antes y después (la columna queda con «—»), la
  cantidad de subas de más de 15 %, filtrar por subas, nuevos o ya no están (las pastillas
  quedan apagadas), «Ver el correo», «Usar 6 %», los adjuntos sin proveedor, «Ver todas» las
  cargas y la foto de cada fila de la planilla.

**Necesita ver al revisar:** proveedor y fecha de la lista; los avisos; el resumen en números
(leídos, nuevos, cambian de precio con su variación promedio, sin cambio, ya no aparecen,
filas salteadas); las filas salteadas con su motivo; la vista previa con los que cambian
primero, y por producto código, descripción, marca, costo anterior, costo nuevo y variación,
con la explicación de cada costo. «Aplicar» dice cuántos precios va a cambiar.

**Al indicar columnas (formato nuevo):** las columnas de la planilla con filas de ejemplo, y
para cada dato que el sistema necesita (código, descripción, precio, marca, bulto, IVA,
código de barras) cuál es. Lo que el sistema ya adivinó viene elegido.

**Computadora:** todo el recorrido con teclado, incluido elegir el archivo; la vista previa
se recorre con flechas.

**Celular:** el archivo se elige de los del teléfono; el resumen entra sin desplazarse hacia
el costado y la vista previa se recorre hacia abajo.

**Estados:**

| Estado | Qué tiene que pasar |
|---|---|
| Vacío (ninguna lista, ningún proveedor) | Dice cuál es el primer paso |
| Leyendo la planilla | Avance visible |
| No reconoció el proveedor | Lo dice y pide elegirlo ahí mismo; el archivo no hay que volver a entregarlo |
| La planilla no dice su fecha | Pregunta la fecha ahí mismo |
| No se pudo leer | Dice por qué y qué hacer; no queda ninguna lista a medias |
| Archivo demasiado grande | Lo dice, con el límite |
| Aplicando | Avance con productos procesados sobre el total, y la etapa final de búsqueda de duplicados; no se puede aplicar ni descartar de nuevo |
| Éxito | Cuántos precios se actualizaron y cuántos productos son nuevos; el proveedor muestra su lista nueva |
| Falló al aplicar | La lista vuelve a quedar para revisar, con el motivo |
| Ya la aplicó o la está aplicando otro | Lo dice, sin duplicar nada |
| Descartada | Deja de ofrecerse; queda en las últimas cargas como descartada |
| Sin conexión | Dice que cargar una lista necesita internet; lo demás sigue funcionando |

## Configurar un proveedor (historia 4 · RF-11)

**Rol:** Administrador.

**Tiene que poder:** dar de alta un proveedor y cambiar su configuración: nombre, si sus
precios incluyen IVA, descuento general, descuento por contado; desactivarlo.

**Necesita ver:** los descuentos como porcentajes (25 %, no 0,25); un ejemplo de cómo queda
el costo con esa configuración sobre un precio de lista; que el cambio vale para las listas
que se carguen después.

**Quien no es Administrador** no ve estas acciones.

**Estados:** error en el campo que está mal (nombre repetido, descuento fuera de 0 a 100 %);
éxito sin mensaje que cerrar; sin conexión, dice que necesita internet.

## Bajar el archivo original (historia 5 · RF-01b)

**Rol:** Vendedor o Comprador.

**Tiene que poder:** desde un producto, ver de qué lista salió su costo (proveedor y fecha) y
bajar ese archivo con una acción.

**Estados:** bajando; archivo no disponible (lo dice); sin conexión (dice que necesita
internet).

## Quién lo vende y a cuánto (historia 6 · RF-06)

**Rol:** Vendedor o Comprador.

**Necesita ver, en un producto con más de un proveedor:** todos sus proveedores, del más
barato al más caro, cada uno con su código, su costo y la fecha de su lista; cuál es el más
barato; cuál está en uso; un aviso en el que tiene la lista vieja.

**Tiene que poder:** elegir de cuál sale el costo con una acción, y ver el precio cambiar al
instante.

**Computadora:** se compara sin abrir nada aparte. **Celular:** en la ficha del producto.

**Estados:** un solo proveedor (no hay nada que elegir y no se ofrece); sin conexión (el
cambio queda guardado en el dispositivo y se ve); error en el lugar.

## Unir y separar duplicados (historia 7 · RF-06)

**Rol:** Administrador. Quien no lo es no ve el recorrido.

**Tiene que poder:** ver las sugerencias sin resolver; pedir que se busquen duplicados en
todo el catálogo; decidir «es el mismo» o «son distintos» en cada una; elegir cuál de los dos
productos se conserva; unir a mano dos productos que busca; ver las uniones y separar una.

**Necesita ver en cada sugerencia:** los dos productos lado a lado para compararlos
(descripción, marca, código de barras, proveedor, costo, fecha de lista, foto) y el motivo de
la sugerencia. Cuántas quedan por resolver.

**Computadora:** se resuelven sugerencias una tras otra sin soltar el teclado. **Celular:**
los dos productos se comparan sin desplazarse hacia el costado.

**Confirmación:** ni unir ni separar piden confirmar: cada una deshace a la otra, y eso se
dice al hacerlas.

**Estados:**

| Estado | Qué tiene que pasar |
|---|---|
| Vacío | Dice que no hay sugerencias y ofrece buscar en todo el catálogo |
| Buscando | Avance visible |
| Búsqueda sin novedades | Dice que no encontró duplicados nuevos |
| Éxito al unir | La sugerencia sale de la vista y se dice que quedaron unidos y que se pueden separar |
| Éxito al separar | La unión sale de las uniones y se dice que quedaron separados |
| No se pudo (ya resuelta, producto ya unido) | Lo dice en el lugar |
| Sin conexión | Dice que necesita internet |

**La pantalla Duplicados en el celular** (Carlos, 2026-10-17, sobre una referencia suya;
maquetas aprobadas `maquetas/celular-duplicados-renovada*.png`):

- **Arriba, una nota** (sin tarjeta, con ícono y una raya verde a la izquierda, para que no se
  confunda con un botón): «Unificá productos duplicados. El mismo artículo puede estar en varias
  listas. Al unirlos queda uno solo, con todos sus proveedores y el precio del más barato.»
- **Tres botones** de 44 px, con su ícono y la acción alineados a la izquierda, y debajo de cada
  uno, fuera del botón, qué hace: «Buscar» (duplicados en todo el catálogo; el principal, verde
  oscuro), «Unir» (dos productos, elegidos a mano) y «Separar» (deshacer una unión: abre la
  lista de todos los productos unidos, con un buscador por nombre).
- **Sin sugerencias,** un aviso amarillo con un reloj: «No hay sugerencias pendientes. Tocá
  «Buscar» para revisar el catálogo.»
- **Cada sugerencia:** su motivo en una pastilla («Mismo código de barras», «Misma
  descripción»); los dos productos lado a lado, cada uno con la marca, el proveedor, el costo en
  negrita, la fecha de la lista (cada dato con su ícono) y «Conservar este»; abajo, «Es el
  mismo» y «Son distintos».
- **«Productos unidos»** con la cantidad en una pastilla y la bajada «Cada uno junta varios
  productos. Se pueden separar si hace falta.» Cada unión, en filas separadas por 1 px: la foto
  del producto, el nombre en negrita con «Separar» a su derecha (verde suave, 36 px), y debajo,
  a todo el ancho, la marca, «Unió «…»», los proveedores y «Unido el dd/mm/aaaa», cada uno con
  su ícono. Se ven las tres últimas; «Ver todo (N)» abre las demás.
- **Al separar**, sin preguntar: un aviso «Separados: **«nombre»** vuelve a ser un producto
  aparte, con sus precios, ventas y stock», con el nombre del producto en negrita y amarillo, para que resalte, y «Deshacer» en blanco,
  que los vuelve a unir.


**La pantalla Duplicados como la v2** (decisión 148, 2026-10-24; la variante 1 del director de
arte, «La bandeja» en la computadora y «Renovada» en el celular). Manda sobre lo anterior en la
disposición y las piezas; lo que la pantalla puede hacer es lo mismo.

- **Computadora:** al lado de las pestañas, «Buscar en todo el catálogo Alt B», «Unir a mano
  Alt U» y «Unidos y separar Alt S» (los dos últimos abren su panel). Arriba, cuatro números:
  «Por revisar N sugerencias» en ámbar, con barras de cuántas llegaron cada uno de los últimos
  siete días; «Mismo código»; «Descripción parecida»; y «Unidos hasta hoy N productos» en verde
  suave. A la izquierda, filtros «Todas · Código · Texto» con su número y la cola de
  sugerencias como una bandeja (foto, nombre, motivo con su ícono y los dos proveedores,
  cuándo llegó); la elegida con borde verde oscuro. A la derecha, «¿Es el mismo artículo?» con
  el motivo, J K y «1 de N»; los dos productos en una tabla lado a lado (Producto con «Conservar
  este ← / →», Marca, Cód. barras, Proveedor, Costo con «El más barato» y la diferencia en %,
  Lista con la fecha y hace cuántos días): la columna que se conserva va en verde suave; lo que
  difiere del otro, resaltado en ámbar, y lo que coincide, con un tilde verde. Debajo, «así
  queda»: un solo producto con los dos proveedores y de quién sale el costo. Al pie, «Es el
  mismo E» (naranja), «Son distintos D», «Saltar J» y «ámbar = lo que cambia».
- **Celular:** la nota con raya verde («El mismo artículo puede estar en varias listas. Al
  unirlos queda uno solo, con todos sus proveedores y el precio del más barato.»); los tres
  botones con su bajada («Todo el catálogo», «Dos, a mano», «Una unión»); «Por revisar N» con
  «1 de N ›» para pasar a la siguiente; una sola sugerencia por vez, con los dos productos lado
  a lado (foto, nombre, marca, proveedor y fecha con su ícono, costo y «barato»), un «=» entre
  los dos, lo distinto en ámbar y abajo de cada uno «Se conserva» / «Conservar»; «Productos
  unidos» con la cantidad en verde y «Ver todo», y las últimas en filas con «Separar». «Es el
  mismo» (naranja) y «Son distintos» van en una barra fija abajo, sobre el menú, bajo el pulgar.
- **Lo que la v2 muestra y el sistema todavía no sabe** (E02 de la 021): la foto de cada
  producto de la sugerencia (queda el lugar con un ícono), el stock y las ventas en «así queda».

## Escanear con la cámara (historia 8 · RF-08)

**Rol:** Vendedor.

**En el celular tiene que poder:** abrir el escáner desde la búsqueda del catálogo, la del
inventario, la venta, el ingreso de mercadería y el conteo; apuntar y que el código se lea solo; tipear el código si la cámara
no lee; cerrar el escáner con una acción. Necesita ver dónde apuntar y el último código
leído, con una señal clara de que se leyó.

**En la computadora tiene que poder:** pedir vincular un celular desde la venta; ver el QR
y saber que vence a los pocos minutos; ver si hay un celular vinculado; pedir otro QR.
Lo que el celular escanea aparece donde se está trabajando, sin tocar nada.

**Emparejamiento (decisión 58):** el celular y la computadora se emparejan una vez (al dejar
entrar a la computadora con el celular, o leyendo el código de Vender) y sirve para todo: lo
que el celular escanea le llega a la computadora, y las fotos que la computadora pide le
aparecen al celular como un aviso con el botón «Sacar la foto». La computadora dice que tiene
un celular emparejado y deja soltarlo.

**El celular como lector (decisión 59):** en la computadora, con un celular emparejado, el
botón «Escanear con el celular» de Vender se lo pide: al celular le aparece un aviso con
«Abrir el lector». El lector es un modo aparte de Vender: la cámara queda abierta, cada código
va solo a la computadora y el celular dice que ya llegó. También se entra desde el celular,
en Vender («Usar este celular como lector de la computadora») y apenas se empareja.

**Volver:** con la cámara abierta, el botón de volver del celular cierra la cámara y deja la
pantalla como estaba; no sale de la aplicación (pedido de Carlos del 2026-10-12).

**Código desconocido:** se avisa que no está en el catálogo y se ofrece buscar el producto
para asociarlo; al elegirlo, el código queda guardado en ese producto y se dice.

**En la ficha de cada producto** (pedido de Carlos del 2026-10-11, decisión 51): se ve su
código de barras, o que todavía no tiene, y un botón con nombre para cargárselo. En el
celular el botón abre la cámara; en la computadora deja tipearlo y, si hay un celular
vinculado, toma lo que el celular escanee. Al guardar, la ficha muestra el código y dice
que ya se puede buscar escaneándolo. Si otro producto tiene el mismo código, lo nombra y
manda a Duplicados. La regla y las palabras son las mismas en las dos interfaces.

**Buscar escaneando:** la búsqueda del catálogo y la del inventario, en el celular, tienen
el escáner al lado. Un código conocido lleva directo al producto; uno que nadie tiene lo
dice y explica cómo cargárselo.

**Estados:**

| Estado | Qué tiene que pasar |
|---|---|
| Sin permiso de cámara, o sin cámara | Dice cómo dar el permiso y deja tipear el código |
| Leyendo | Se ve la cámara y dónde apuntar |
| Leído | Señal inmediata; el mismo código seguido no se repite solo |
| QR vencido o ya usado | Dice que hay que pedir otro |
| Vinculado | Las dos interfaces lo dicen; el celular lleva a vender |
| Sin sesión en el celular al leer el QR | Pide entrar y después vincula |
| Vínculo vencido | Lo dice y ofrece vincular de nuevo |
| Sin conexión | El celular escanea y busca en su catálogo; vincular con la computadora dice que necesita internet |

## Foto del producto (historia 9 · RF-09)

**Rol:** Vendedor o Comprador.

**Tiene que poder:** ver la foto chica en todo lugar donde aparece el producto; tocarla para
ampliarla, con la descripción; desde la ampliada, en el celular, sacar una foto o sacar otra
que reemplaza a la anterior; cerrar la ampliada con una acción (Escape en la computadora).

**Estados:** sin foto (ícono, nunca imagen rota; la ampliada dice que todavía no tiene foto y
ofrece sacarla); subiendo (avance); éxito (se ve la foto nueva); archivo que no es una imagen
o demasiado pesado (lo dice); sin conexión (dice que subir la foto necesita internet); en la
computadora no se ofrece la cámara. Pedida al celular, en la computadora: la foto ampliada se
achica y en el mismo cuadro se ven, sin desplazar, el código QR, los pasos y «Cancelar».

## Productos sueltos (historia 10 · RF-12)

**Rol:** Vendedor.

**Tiene que poder:** indicar cómo se vende un producto (unidad, kilo, metro, litro) con una
acción, donde se carga la cantidad; cargar cantidades con un decimal en lo suelto, con coma o
con punto. Necesita ver la unidad al lado de la cantidad y del precio («$3.000 el kilo»).

**Celular:** teclado numérico con decimal para lo suelto y sin decimal para lo que va por
unidad.

## Listas que llegan solas (historia 13 · RF-04)

**Rol:** Administrador, para revisar y para autorizar la casilla y los portales.

**Tiene que poder:** ver las listas que llegaron solas junto con las que esperan revisión,
con de dónde vino cada una (correo o portal) y cuándo; abrir el correo original; asignar
proveedor a los adjuntos que no se reconocieron; revisar y aplicar igual que una lista subida
a mano. Además: autorizar y quitar el acceso a la casilla, cargar el
usuario de un portal, ver las ejecuciones programadas con su resultado y su error.

**Estados:** nada nuevo (lo dice, con cuándo se revisó por última vez); adjuntos sin
proveedor (cuántos, y el camino para asignarlos); descarga fallida (qué proveedor, cuándo y
el error en castellano); acceso a la casilla vencido (lo dice y ofrece autorizar de nuevo).

## Historial de precios (historia 14 · RF-14)

**Rol:** Comprador o Administrador.

**Tiene que poder:** desde un producto, ver la evolución de su costo por proveedor y de su
precio de venta. Necesita ver cada cambio con su fecha de lista, el valor y la variación
respecto del anterior, del más nuevo al más viejo, y poder pedir la explicación de cada uno.

**Estados:** un solo punto (lo dice: todavía no cambió); sin conexión (dice que necesita
internet, si el historial no está en el dispositivo).

## Qué remarcar (historia 15 · RF-15)

**Rol:** Vendedor.

**Tiene que poder:** llegar al aviso desde el resultado de aplicar una lista y también
después; ver por separado los que cambiaron de precio (precio anterior y nuevo), los nuevos
sin margen y las subas grandes; elegir el margen de los nuevos ahí mismo; imprimir etiquetas de los
que cambiaron.

**Celular:** es el recorrido que se hace caminando las estanterías: una mano, un producto por vez,
foto y precio nuevo bien visibles.

**Estados:** nada para remarcar (lo dice).

## Descuentos puntuales (historia 16 · RF-17)

**Necesita verse**, en todo producto con un descuento puntual vigente: que el precio está
rebajado por una oferta del proveedor y hasta cuándo, en el producto y en la explicación del
costo. Quién los carga y cómo depende de lo que se responda en RF-17.

## Ficha del proveedor (historia 17 · RF-18)

**Rol:** Comprador.

**Tiene que poder:** buscar un proveedor por nombre; abrir su ficha; desde la ficha, bajar cualquiera de sus listas; buscar entre lo que
vende.

**Necesita ver, en este orden:** contacto; fecha de la última lista y si está vieja; cómo se
calcula su costo; listas cargadas; productos.

**Estados:** sin listas (dice cómo cargar la primera); sin productos; sin conexión.

## Margen con datos (historia 18 · RF-16)

**Rol:** Administrador.

**Necesita ver, por producto:** margen elegido, margen sugerido, la diferencia y la
explicación del sugerido. **Tiene que poder:** aceptar el sugerido con una acción.

**Estados:** datos insuficientes (dice qué hay que cargar: gastos fijos, ventas).

## Buscar por foto (historia 19 · RF-09b)

**Rol:** Vendedor, en el celular.

**Tiene que poder:** desde la búsqueda, sacar una foto y ver los productos que más se
parecen; si ninguno sirve, seguir buscando por palabras sin perder el lugar.

**Estados:** buscando (avance); sin parecidos (lo dice y ofrece las palabras); sin conexión
(lo que corresponda según cómo se resuelva RF-09b).
