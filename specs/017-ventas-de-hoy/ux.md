# UX: Ventas de hoy renovada

Maquetas aprobadas por Carlos el 2026-10-17: variante C en el celular
(`maquetas/celular-hoy-c.html`, `maquetas/celular-hoy-c-entera.png`) y su versión de la
computadora (`maquetas/compu-hoy.html`), con la tecla «F» para cambiar la fecha. Las variantes A y
B quedan como referencia descartada.

## Cómo va el día (historias 1 y 2)

- Arriba, el día que se mira: «Hoy, sábado 17/10» con «Hasta las 11:52» (la hora en que se
  miró), o «Jueves 15/10» para otro día; al lado, «Cambiar fecha».
- Una tarjeta oscura con todo el resumen: «Total de ventas», el total grande, la comparación
  («+17 %» en una pastilla verde, o el porcentaje que baja en una pastilla del color de lo que
  falta, y «vs. ayer a esta hora ($250.000)»; para otro día, «vs. el miércoles 14/10»), el gráfico
  de barras por hora a lo ancho (las horas debajo; la hora actual, vacía hasta que haya ventas;
  tocar una barra dice su importe), y los cuatro medios en renglones: ícono en su color, nombre,
  cuántas ventas e importe.
- Debajo, una tira con tres números: ventas, productos y ticket promedio.

## Las ventas (historia 3)

- Título «Ventas» y la lista, de la más reciente a la más vieja. Cada venta: el ícono de su
  medio en su color, el producto («1 × Taladro inalámbrico 18 V») o «3 productos», debajo la hora,
  el medio y el cliente, el importe y una flecha. Tocarla la abre debajo: cada producto con su
  cantidad y su total (en la computadora también el precio por unidad); tocarla otra vez la cierra.
- La anulada, tachada, con «anulada» en una pastilla. Se abren de a varias.
- Computadora: la tabla Hora · Productos · Cómo pagó (una pastilla con el ícono y el color del
  medio, el cliente debajo) · Total; ↑ ↓ eligen una venta, Enter abre o cierra su detalle, «F»
  abre «Cambiar fecha». El resumen oscuro, a la izquierda.

## Otro día (historia 4)

- «Cambiar fecha» abre el calendario del sistema, hasta hoy. Con otro día elegido, aparece
  «Volver a hoy». Sin ventas ese día: «No hubo ventas ese día». Sin conexión, otro día dice que
  hace falta internet.

## En el celular, con Anular adentro (decisión 120, historia 5)

Maqueta aprobada por Carlos el 2026-10-19: `specs/003-ventas/maquetas/celular-ventas-de-hoy-v2.png`
(la v2 del director de arte, con el buscador que agregó). Sigue el lenguaje «Mostrador», como
Vender (decisión 119):

- Las pestañas de arriba son «Vender» y «Ventas del día» (decisión 141); la de «Anular» ya no está.
- El día («Hoy, martes 20/10 · 17:40») y «Otro día» (decisión 141): abre un panel desde abajo con
  hoy y los seis días anteriores, cada uno con lo vendido y cuántas ventas («Sin ventas» si no
  hubo) y el que se está mirando con un tilde; al final, «Elegir en el calendario», que muestra en
  el mismo panel un calendario propio con los colores de «Mostrador»: el mes con ‹ ›, los días en
  una grilla de lunes a domingo, hoy marcado, el elegido en verde oscuro y los días que vienen
  apagados. Tocar el mes muestra los doce meses del año, con ‹ › para pasar de año; elegir uno
  vuelve a sus días. Tocar un día lo muestra y cierra el panel; mirando otro día, «Volver a hoy».
- El resumen va en una tarjeta clara (ya no oscura): «Total de ventas», el
  total grande, la comparación, el gráfico por hora y los cuatro medios en dos columnas (ícono en
  su color, importe y cuántas); debajo, ventas, productos y ticket promedio.
- «Ventas» con «Buscar» a su derecha, a mano del pulgar. Al tocarlo se abre un panel desde abajo
  (decisión 141), como «Otro día»: el campo con la lupa y «×» para borrar, cuántas coinciden y
  cuánto suman, y las ventas que coinciden; tocar una abre su hoja. Lo que coincide se resalta; si coincide un producto de una
  venta de varios, el renglón lo muestra («3 × Mecha… y 1 más»). Sin resultados: una lupa tachada,
  «Ninguna venta con «…»», un ejemplo y las dos salidas.
- Tocar una venta abre su hoja: la hora, el medio y el cliente, los productos con cantidad,
  precio y total y, como la v2, «Corregir · Cambio · Anular» (specs/019). «Corregir» edita la venta
  en la misma hoja (− +, el precio, el tacho, agregar un producto, el medio y el cliente; lo de
  antes tachado, la diferencia y con qué se cobra; «Guardar · +$4.000»). «Cambio» abre su hoja: se
  marca lo que vuelve (cuánto, y si está fallado), se suma lo que se lleva y el botón dice «Cobrar
  $4.000», «Devolver $4.000» o «Registrar el cambio»; sin nada que se lleve es una devolución.
  «Cambio», arriba de la lista, registra uno buscando la venta por el producto que vuelve. «Anular» «Anular» pasa a confirmar: el motivo en una lista
  desplegable, el comentario y «Cancelar» / «Anular · −$20.000». Una anulada dice cuándo y por
  qué se anuló.

**Cómo se mueve en el celular** (las animaciones de la v2, pedido de Carlos del 2026-10-20): al
abrir, el total rueda sus dígitos desde abajo, escalonados, y las barras crecen de abajo hacia
arriba una después de otra; la raya punteada de lo de ayer a esa hora aparece después, en
fundido. Tocar una barra (o arrastrar el dedo sobre ellas) saca el globo con «10 h · $71.000»
hacia arriba y baja las demás a menos de la mitad; al pasar de una hora a otra vibra apenas; al
soltar, el globo se va en un momento. Cuando cambia un número del día (el total, los medios,
ventas, productos, ticket) rueda hacia arriba si sube y hacia abajo si baja. Al anular, la venta
se tacha con una raya que se dibuja de izquierda a derecha y queda a la vista, anulada. Solo se
mueve transform y opacity, y nada se mueve para quien pidió menos movimiento en su sistema.

## En la computadora, «El día y la venta» (decisión 135)

La pestaña se llama «Ventas del día» (decisión 141).

Reemplaza a los cuatro cajones (decisión 122): Carlos eligió la v2 del director de arte, variante «El
día y la venta» (maqueta «ventas-de-hoy · compu · variante-1-el-dia»), sin
sumarle nada de las otras. Las pestañas siguen siendo «Vender» y «Ventas de hoy» (decisión 120):

- Arriba a la derecha, «Cambiar fecha» (F) y, cuando esté el cambio de producto (019), «Registrar
  un cambio» (Alt+C).
- Una tarjeta con el día en tres partes: el total, la comparación y ventas, productos y ticket
  promedio; lo vendido por hora, con una raya punteada en cada barra que marca lo de ayer a esa
  hora y la hora actual resaltada con su importe en un globo (señalar otra barra muestra el
  suyo); y los cuatro medios de pago, cada uno con su ícono, cuántas ventas y cuánto.
- Debajo, a la izquierda, los filtros «Todas», «Cta. cte.» y «Anuladas» con cuántas hay (y
  «Cambios», con el cambio de producto) y el buscador por producto, importe o cliente (/ o Ctrl+K);
  lo que coincide se resalta. Esc borra y, vacío, sale. Debajo, la tabla del día: hora, el ícono del
  medio, qué se llevó («1 × Martillo…» o «3 productos» con los primeros nombres), quién o cómo
  (el cliente, o el medio) y el total. La anulada, tachada con «anulada»; la corregida, con
  «corregida».
- A la derecha, la venta elegida: el medio, el cliente o lo que se llevó, la hora; «debe» si es a
  cuenta corriente sin pagar; sus productos con foto, cantidad, precio y subtotal; el total; y
  «Corregir» (E) y «Anular» (Supr; también A, como antes), con la tecla en el botón (y «Cambio»
  (C) con el cambio de producto). Debajo, si tuvo correcciones. La anulada no tiene botones: dice
  que se anuló y que el stock volvió.
- «Corregir» edita la venta en el mismo panel (019, historia 1): cada renglón con − + y su precio,
  que se toca para escribir otro, y el tacho para quitarlo; «Agregar un producto»; el medio de pago
  y, en cuenta corriente, el cliente. Lo que cambió queda con el valor anterior tachado; el total
  nuevo con el anterior tachado y la diferencia en una pastilla («+$3.000»); debajo, cómo se
  resuelve: con qué medio se cobra (Efectivo elegido), que se devuelve en efectivo o que cambia
  la deuda. «Descartar» (Esc) y «Guardar corrección · +$3.000» (Ctrl+Enter).
- ↑ ↓ eligen la venta, sin dejar el buscador. E, Supr, F y / andan apenas se abre la pantalla,
  aunque el foco haya quedado en la pestaña recién tocada (en el menú y las pestañas solo las
  flechas, Enter, Esc y Tab son de ellos). Las teclas no se explican en una línea en la pantalla
  (decisión 126): están en sus botones.
- Anular sigue igual: confirma con el motivo en una lista y el comentario (Ctrl+Enter confirma, el
  botón dice cuánto se descuenta).

## Colores de los medios de pago (decisión 108)

Efectivo verde, Mercado Pago celeste, Tarjeta violeta, Cuenta corriente ámbar, con su versión
suave de fondo. Los íconos son los del cobro de Vender (el billete, el isotipo de Mercado Pago, la
tarjeta y la libreta de la cuenta corriente), no los de la maqueta, para que sean los mismos en
toda la aplicación. Igual que ayer, la comparación dice «0 %» sin flecha y sin color. Están en la paleta compartida y se usan en el ícono de cada medio donde aparezca:
«Hoy», «Anular», el cobro de Vender y «Cómo va el negocio».

## Chequeo contra los principios de interfaz

- Las palabras del negocio: «ticket promedio», «Cuenta corriente», «vs. ayer a esta hora». Cumple.
- Lo mismo en el celular y en la computadora, con textos compartidos (decisión 47). Cumple.
- Todo con el teclado en la computadora. Cumple: ↑ ↓, E, Supr, F, / y Ctrl+Enter.
- Funciona sin conexión: hoy, con lo último que se bajó; otro día lo dice. Cumple.
- Colores: solo en elementos puntuales con significado, iguales en toda la aplicación (decisión 108). Cumple.
