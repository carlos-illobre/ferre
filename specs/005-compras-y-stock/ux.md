# Requerimientos de interfaz: compras y stock

Qué tiene que poder hacer cada rol en cada recorrido de [spec.md](spec.md) y con qué
reglas. No describe un diseño: no fija disposición, componentes ni estilos. El aspecto sale
del sistema visual del proyecto; las reglas generales, de la constitución (principios II,
III, IV y IX) y de ADR-014.

## Reglas que valen para todos los recorridos

**Las dos interfaces.** Todo recorrido de esta capacidad existe en el celular y en la
computadora, con las mismas reglas de negocio y los mismos textos. Ninguna de las dos es una
versión recortada de la otra.

**Computadora.**

- Todo se hace con el teclado, de punta a punta; el mouse nunca es la única forma.
- Al entrar a un recorrido, el foco queda donde se empieza a trabajar (elegir el proveedor,
  el buscador).
- En un buscador: las flechas recorren los resultados, Enter elige, Escape lo limpia. Después
  de elegir un producto, el foco pasa solo al dato que sigue (la cantidad) y, al terminar el
  renglón, vuelve al buscador.
- La computadora no tiene cámara ni lector: los códigos de barras llegan desde el celular
  vinculado (RF-08) y entran donde está el foco, igual que si se hubiera buscado el producto.
- Los listados largos (stock, compras, deuda) se recorren con el teclado y se pueden
  ordenar.

**Celular.**

- Todo se hace con una mano y con el pulgar: lo que se toca seguido queda al alcance, los
  números se cargan con teclado numérico (con coma decimal cuando el producto es a granel).
- La cámara es el lector de códigos y la que fotografía facturas. Escanear es siempre una
  alternativa a buscar, nunca la única forma.
- Nada obliga a desplazarse hacia el costado.

**Orden.** El de quien hace el trabajo parado frente a la mercadería: primero a quién o
dónde (proveedor, sector), después qué (producto), después cuánto (cantidad, costo), al
final confirmar.

**Estados que toda vista tiene que resolver.**

| Estado | Qué exige |
|---|---|
| Vacío | Dice qué es ese lugar y cuál es el primer paso («Elegí el proveedor y buscá el primer producto»). Nunca una lista en blanco |
| Cargando | Lo que tarda muestra su avance; lo que ya está en el dispositivo (catálogo, lo cargado) se puede seguir usando mientras tanto |
| Error | En el lugar del dato que lo causa, en castellano, diciendo qué hacer. Desaparece solo cuando se corrige la causa |
| Sin conexión | Se avisa sin frenar. Lo que la regla permite hacer sin conexión se hace igual y queda marcado como «se manda al volver internet»; lo que exige conexión lo dice antes de que el usuario lo intente, y no se pierde nada de lo cargado |
| Éxito | Un aviso corto que dice qué pasó, con los números que importan, y deja la vista lista para lo siguiente. No pide ningún toque para seguir |

**Confirmaciones.** Solo para lo que no se puede deshacer: anular una compra y cerrar un
conteo. Registrar un ingreso, contar un producto o corregir el stock no
piden confirmación.

**Números.** Todo número calculado (stock, valor, diferencia contra la lista, cantidad
sugerida, total adeudado, letra de la clasificación) se puede tocar o enfocar y muestra de
dónde sale, con sus números de origen. Importes en pesos con separador de miles; cantidades
enteras para lo que se vende por unidad y con un decimal para lo que se vende a granel.

**Palabras del mostrador (son regla).**

| Se dice | No se dice |
|---|---|
| estantería, sector | góndola, ubicación, depósito lógico |
| costo | precio de compra, precio neto |
| lista | importación |
| ingreso de mercadería, compra | recepción, orden de entrada |
| comprobante: «Factura», «Remito», «Sin comprobante» | documento, tipo de documento |
| ¿cuántas hay? | cantidad real, stock físico |
| había N, hay M | stock teórico, diferencia de inventario |
| nunca contado | sin inventariar |
| plata invertida, valor del inventario | valorización, capital inmovilizado |
| qué pedir | reposición, reabastecimiento |
| lo que se les debe a los proveedores | cuentas a pagar, pasivo |
| anular, anulada | eliminar, borrar, cancelar (para una compra) |

Se nombra el rol (Administrador, Vendedor, Comprador), nunca a la persona.

## Historia 1: registrar la mercadería que llega (Comprador)

**Tiene que poder:** elegir el proveedor; elegir el comprobante, su número y su fecha;
agregar renglones buscando o escaneando; agregar un producto que no está en el catálogo
escribiendo su descripción; poner cantidad y costo de cada renglón; quitar un renglón;
agregar la foto del comprobante; registrar el ingreso; descartarlo entero.

**Información a la vista, en este orden:**

1. Proveedor (solo los activos; se encuentra escribiendo parte del nombre).
2. Comprobante: «Factura», «Remito» o «Sin comprobante»; número (no se pide con «Sin
   comprobante»); fecha, que arranca en la del día.
3. El buscador de productos, siempre disponible.
4. Los renglones cargados, el último agregado a la vista: descripción, cantidad, costo
   unitario sin IVA, costo según la lista y diferencia en porcentaje, subtotal. Un producto
   nuevo se distingue de uno del catálogo.
5. El total del ingreso y la acción de registrar, siempre visibles mientras hay renglones.

**Reglas de interfaz:**

- Al agregar un producto del catálogo, el costo ya viene con el de la lista de ese
  proveedor: en el caso común solo se tipea la cantidad.
- Un renglón al que le queda un dato sin completar (costo, cantidad, descripción) se marca en
  el renglón mismo, no solo al intentar registrar.
- La diferencia contra la lista distingue a la vista si el costo subió o bajó.
- Cambiar de proveedor con renglones cargados no los borra sin avisar.
- Computadora: una factura de 20 renglones se carga sin soltar el teclado: buscar, Enter,
  cantidad, costo si cambió, Enter, y otra vez el buscador.
- Celular: escanear agrega el renglón y deja listo para escanear el siguiente.
- Si el código escaneado no está en el catálogo: se dice cuál código es y se ofrece buscarlo
  por nombre.

**Estados:**

- Vacío: explica que acá se carga lo que llegó y que el primer paso es elegir el proveedor.
- Registrando: la acción muestra avance y no se puede disparar dos veces.
- Éxito: el total registrado, cuántos costos se actualizaron y cuántos productos nuevos se
  crearon; la vista queda limpia para el próximo ingreso.
- Error de datos: en el lugar, qué completar (proveedor, renglones, costo o descripción de
  un renglón).
- Sin conexión: lo cargado se conserva, también si se recarga la aplicación. Si el ingreso
  se puede registrar sin conexión está preguntado en la especificación (historia 1,
  escenario 13); la interfaz tiene que decir con claridad cuál de las dos cosas pasó: «quedó
  guardado y se manda solo» o «no se registró; necesita internet».

## Historia 2: compras recientes, gastos de la semana y anular (Comprador)

**Tiene que poder:** ver el gasto de la semana; ver las compras recientes; abrir una para
ver sus renglones y la foto del comprobante si la tiene; anularla.

**Información a la vista:**

- Gastos de la semana: el total y el detalle por proveedor, de mayor a menor, en las dos
  interfaces.
- Cada compra reciente: fecha, proveedor, comprobante y número (o «sin comprobante»),
  cantidad de renglones, total, y si está anulada.
- Compra abierta: cada renglón con cantidad, descripción, costo unitario y subtotal.

**Reglas de interfaz:**

- Una compra anulada sigue en la lista, distinguida a la vista y con la palabra «anulada»;
  no se puede volver a anular.
- Anular pide confirmación, porque no se deshace, diciendo qué compra es (proveedor e
  importe) y qué va a pasar con el stock. El motivo se pide ahí mismo, dentro de la
  aplicación; si es obligatorio está preguntado en la especificación.
- Después de anular, el gasto de la semana y el stock se ven actualizados sin recargar.
- Computadora: la lista se recorre con flechas, Enter abre y cierra una compra, y anular
  tiene su atajo sobre la compra enfocada.

**Estados:** vacío («No hay compras registradas» y cómo registrar la primera);
cargando; sin conexión (se muestra lo último que se bajó, diciendo de cuándo es, y anular
avisa que necesita conexión); error al anular, en la compra misma.

## Historia 3: stock y plata invertida, y corregir (Administrador, Comprador; el Vendedor lo ve al vender)

**Tiene que poder:** ver el valor del inventario; ver su desglose; buscar un producto; ver
su stock y su valor; ver los movimientos que explican el stock; corregir el stock diciendo
cuántas hay y por qué; exportar a Excel.

**Información a la vista, en este orden:**

1. El valor del inventario, en total, aclarando que es al costo vigente y sin IVA.
2. El desglose por proveedor (y por familia), de mayor a menor.
3. El buscador.
4. Por producto: descripción, proveedor, stock, costo, valor y fecha del último movimiento.
5. Al abrir el stock de un producto: sus movimientos del más nuevo al más viejo (tipo,
   cantidad con signo, fecha, nota) y la cuenta que muestra que el stock es su suma.

**Reglas de interfaz:**

- El stock y el valor son números que se tocan: uno abre los movimientos, el otro la cuenta
  stock × costo con el origen del costo.
- Corregir pide dos datos y en este orden: «¿cuántas hay?» (arranca con el stock que
  figura) y el motivo. El motivo es obligatorio: sin motivo no se guarda y se dice en el
  lugar. Se ofrecen motivos frecuentes para no tipear («conté la estantería», «rotura»),
  además del texto libre.
- Corregir no pide confirmación: el ajuste queda a la vista en los movimientos con «había N,
  hay M: motivo».
- El stock negativo se muestra con su signo, distinguido a la vista.
- Un producto con stock y sin costo muestra el valor vacío, no «$0».
- En la venta, el stock se lee junto a cada resultado de la búsqueda y en cada renglón; si la
  cantidad cargada supera el stock se avisa en el renglón que queda negativo, sin frenar.
- Computadora: desde el buscador se llega al producto, a sus movimientos y a corregir sin el
  mouse.

**Estados:** vacío (no hay movimientos: explica que el stock arranca en cero y se carga con
un ingreso o un conteo, con acceso a los dos); cargando; sin conexión (se ve lo último
bajado y una corrección queda «guardada, se manda al volver internet», visible como tal
hasta que el servidor la confirma); corrección rechazada por el servidor al reconectar: se
avisa cuál y por qué; éxito: el stock y el valor nuevos a la vista.

## Historia 4: contar de a un sector (Administrador)

**Tiene que poder:** ver los sectores; crear uno; empezar o retomar el conteo de un sector;
buscar o escanear un producto; poner cuántas hay; corregir o quitar lo contado; ver lo que
queda sin contar; cerrar el sector eligiendo qué pasa con lo no contado; pasar a otro
sector.

**Información a la vista:**

- Lista de sectores: nombre, cuántos productos tiene, y su estado: «nunca contado», la
  fecha del último conteo, o «conteo en curso». Los que tienen conteo en curso y los nunca
  contados se distinguen a la vista.
- Dentro de un conteo, en este orden: el nombre del sector siempre visible; el buscador con
  escanear; al elegir un producto, su descripción y «¿cuántas hay?»; los ya contados, el
  último arriba, con lo contado y la diferencia contra el sistema («=» cuando coincide);
  los productos del sector sin contar; la acción de cerrar.

**Reglas de interfaz:**

- El ritmo es buscar o escanear → cantidad → siguiente, sin ningún otro toque entre un
  producto y el próximo. Después de «siguiente» queda listo para el próximo producto.
- Celular: se hace entero con una mano; el número se carga con teclado numérico, con decimal
  si el producto es a granel; «siguiente» queda al alcance del pulgar.
- Computadora: Enter en la cantidad equivale a «siguiente» y devuelve el foco al buscador.
- Si el producto ya estaba contado, se muestra cuánto se había puesto antes de pisar.
- Al tocar un producto de «sin contar» queda elegido para contarlo.
- Cerrar pide confirmación (no se deshace) y muestra antes: cuántos se contaron, cuántos
  tienen diferencia y cuántos del sector no se contaron. Si hay no contados, las dos
  opciones se leen completas: «Cerrar y poner en cero los no contados» y «Cerrar y dejar los
  no contados como están».
- Salir de un conteo sin cerrarlo no pregunta nada: queda en curso. La acción de salir se
  llama «Volver»; no lleva una aclaración del tipo «queda abierto» (pedido de Carlos del
  2026-09-14).

**Estados:**

- Vacío sin sectores: explica qué es un sector («una estantería, una pared») y pide el nombre
  del primero.
- Vacío dentro de un sector nuevo: «Buscá o escaneá el primer producto».
- Sin conexión: contar sigue igual; cada producto contado sin confirmar por el servidor se
  ve en la lista marcado como guardado en el dispositivo. Qué otras acciones siguen
  disponibles depende de la pregunta abierta en la especificación (historia 4, escenario
  13); las que exijan conexión lo dicen antes de intentarlas.
- Éxito al cerrar: «N productos contados, M con diferencia ajustada» (y cuántos se pusieron
  en cero), con el acceso a contar otro sector.
- Error: nombre de sector repetido o vacío, cantidad que no es un número mayor o igual a
  cero, conteo que ya cerró otro usuario; cada uno en su lugar.

## Historia 5: cargar la factura con una foto (Comprador)

**Tiene que poder:** desde el ingreso de mercadería, sacar o elegir la foto de la factura;
ver el avance de la lectura; revisar lo precargado; corregir lo marcado; ver la foto al lado
de lo leído para comparar; descartar la lectura; registrar.

**Información a la vista:** la misma del ingreso (historia 1), precargada, más: la foto,
ampliable; cada dato o renglón dudoso o sin unir, marcado; cuántos renglones se leyeron y
cuántos requieren revisión.

**Reglas de interfaz:**

- Fotografiar es la primera acción ofrecida del ingreso, sin sacar el camino de cargar a
  mano.
- Celular: abre la cámara directo; se sostiene el papel con una mano y se dispara con la
  otra.
- Computadora: cómo llega la foto está preguntado en la especificación (historia 5,
  escenario 8).
- Lo marcado para revisar se recorre de a uno (en la computadora, con el teclado), y cada
  renglón sin unir ofrece buscar el producto o dejarlo como producto nuevo.
- Nada se guarda hasta registrar; se dice de forma visible mientras se revisa.
- Lo que el Comprador ya había cargado a mano antes de la foto no se pisa sin avisar.

**Estados:** leyendo (avance visible, se puede cancelar o seguir a mano); no se pudo leer
(aviso claro, con «sacar otra» y «cargar a mano»); sin conexión (leer la foto necesita
internet: se dice antes de sacar la foto y queda la carga a mano); éxito de la lectura
(«N renglones leídos, M para revisar»).

## Historia 6: decidir qué comprar (Comprador)

**Tiene que poder:** ver qué hay que pedir; ver por qué figura cada producto; cambiar una
cantidad; quitar un producto de la lista; pasar un producto a otro proveedor; ver y cambiar
el stock mínimo de un producto; armar el pedido de un proveedor.

**Información a la vista, en este orden:**

1. Cuántos productos hay por reponer (es también el aviso de stock bajo).
2. Los proveedores con algo para pedirles, cada uno con su total estimado.
3. Dentro de cada proveedor, por producto: descripción, stock, stock mínimo, cantidad
   sugerida, costo unitario y costo estimado del renglón. Si es un pedido de un cliente:
   para quién y qué día se le prometió.
4. Por producto, quién más lo vende y a cuánto.
5. La acción de armar el pedido de ese proveedor.

**Reglas de interfaz:**

- La cantidad sugerida y el mínimo sugerido explican de dónde salen al tocarlos, con las
  ventas usadas.
- Lo pedido por un cliente se distingue de lo que está bajo el mínimo.
- Cambiar una cantidad se hace en el renglón, sin abrir nada.
- Computadora: la lista se recorre y se edita con teclado.
- Celular: se revisa con una mano; armar el pedido queda al alcance.

**Estados:** vacío («No hay nada para pedir»); cargando; sin conexión (se ve la última lista
bajada, diciendo de cuándo es); éxito al armar el pedido (lleva al pedido, historia 7).

## Historia 7: pedido a un proveedor (Comprador; Administrador si aprueba)

**Tiene que poder:** armar un pedido desde la sugerencia o desde cero; agregar, quitar y
cambiar renglones; ver el total estimado; mandarlo por WhatsApp o por correo, como texto o
como PDF; ver los pedidos y su estado; abrir un pedido; empezar el ingreso de mercadería
desde un pedido; ver qué queda sin llegar.

**Información a la vista:**

- Pedido: proveedor, fecha, estado, renglones (código del proveedor, descripción, cantidad,
  costo estimado), total estimado. En un recibido parcial: por renglón, pedido, recibido y lo
  que resta.
- Lista de pedidos: proveedor, fecha, total estimado y estado con sus palabras exactas:
  «enviado», «recibido parcial», «recibido».

**Reglas de interfaz:**

- Antes de mandar se ve el pedido tal como lo va a recibir el proveedor.
- Si el proveedor no tiene WhatsApp ni correo cargados, se dice y se ofrece llevarse el
  texto o el PDF.
- Desde un pedido enviado o recibido parcial, «llegó la mercadería» lleva al ingreso
  precargado (historia 1) con una sola acción.
- Celular: armar y mandar un pedido sugerido se resuelve en pocos toques y con una mano.
- Computadora: se arma y se manda sin el mouse.

**Estados:** vacío (sin pedidos: explica que se arman desde «qué pedir» o desde cero);
sin conexión (un pedido en armado no se pierde; mandar avisa si necesita conexión); error al
mandar (el pedido no cambia de estado); éxito («Pedido enviado a <proveedor>»).

## Historia 8: lo que se les debe a los proveedores (Administrador)

**Tiene que poder:** en el ingreso, elegir cómo se paga la compra; ver el total adeudado;
verlo por proveedor; ver cada compra sin pagar con su vencimiento; marcar una compra como
pagada.

**Información a la vista, en este orden:**

1. El total adeudado y, aparte, cuánto de eso ya venció.
2. Por proveedor: lo que se le debe y su vencimiento más próximo.
3. Las compras sin pagar, las vencidas primero y después por fecha de vencimiento:
   proveedor, comprobante, importe, fecha de vencimiento y cuántos días quedan o hace
   cuántos venció.

**Reglas de interfaz:**

- En el ingreso, la forma de pago ofrece exactamente «Por adelantado», «A 30 días» y «A 60
  días», y no agrega pasos al caso común.
- Lo vencido se distingue a la vista y con palabras («venció hace 5 días»), no solo con
  color.
- El total de un proveedor se toca y muestra las compras que lo componen.
- Marcar como pagada es una acción sobre la compra y se ve el resultado en los totales sin
  recargar.

**Estados:** vacío («No se les debe nada a los proveedores»); cargando; sin conexión (se ve
lo último bajado, diciendo de cuándo es); éxito («Compra marcada como pagada»).

## Historia 9: etiquetas (Comprador)

**Tiene que poder:** ver qué productos no tienen código de barras; generarles un código
interno, de a uno o en lote; elegir qué etiquetas imprimir (un producto, un proveedor, una
familia, los que cambiaron de precio); ver cuántas son antes de imprimir; quitar productos
de la selección; imprimir.

**Información a la vista:** por producto, si tiene código de fábrica, código interno o
ninguno, y si su etiqueta está al día con el precio; en la selección, la cantidad de
etiquetas; una vista previa de la etiqueta con descripción, código de barras y precio.

**Reglas de interfaz:**

- La etiqueta se lee de lejos y se escanea con la cámara del celular: la descripción entera
  o abreviada sin cortar palabras, el precio de venta ya redondeado, y para lo que se vende
  a granel la unidad («por metro», «por kilo»).
- Imprimir se hace desde la computadora y desde el celular.
- Desde la ficha de un producto se llega a generar su código e imprimir su etiqueta.

**Estados:** vacío (todos los productos tienen código: lo dice); generando o preparando la
impresión, con avance cuando el lote es grande; sin conexión (generar un código necesita
conexión, y lo dice); éxito («N etiquetas listas para imprimir»).

## Historia 10: plan de conteo (Comprador)

**Tiene que poder:** ver qué toca contar en el día; ver la letra de cada producto y por qué;
ver cuándo le toca a cada uno; empezar a contar desde ahí.

**Información a la vista:** lo que toca contar, lo más atrasado primero, con su letra y la
fecha de su último conteo (o «nunca contado»); cuánto es en total; el acceso al conteo. En el
tablero, un resumen: cuánto toca contar y el acceso.

**Reglas de interfaz:**

- La letra se toca y explica de dónde sale.
- Desde lo que toca contar se pasa al conteo (historia 4) con una sola acción.
- Celular: se consulta y se arranca a contar con una mano.

**Estados:** vacío sin datos para clasificar (explica que el plan necesita ventas y stock
cargados); al día («No toca contar nada» y cuándo es lo próximo); cargando; sin conexión (se
ve el último plan bajado).
