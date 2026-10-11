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
- **Plata:** siempre con signo $, punto de miles y, donde hay centavos, coma. Los
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
tocar un resultado abre su ficha.

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
tecla, y Escape lo cancela.

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

## Escanear con la cámara (historia 8 · RF-08)

**Rol:** Vendedor.

**En el celular tiene que poder:** abrir el escáner desde la búsqueda, la venta, el ingreso
de mercadería y el conteo; apuntar y que el código se lea solo; tipear el código si la cámara
no lee; cerrar el escáner con una acción. Necesita ver dónde apuntar y el último código
leído, con una señal clara de que se leyó.

**En la computadora tiene que poder:** pedir vincular un celular desde la venta; ver el QR
y saber que vence a los pocos minutos; ver si hay un celular vinculado; pedir otro QR.
Lo que el celular escanea aparece donde se está trabajando, sin tocar nada.

**Código desconocido:** se avisa que no está en el catálogo y se ofrece buscar el producto
para asociarlo; al elegirlo, el código queda guardado en ese producto y se dice.

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
computadora no se ofrece la cámara.

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
