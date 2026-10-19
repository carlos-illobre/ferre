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

- Las pestañas de arriba son «Vender» y «Ventas de hoy»; la de «Anular» ya no está.
- El día y «Otro día»; el resumen va en una tarjeta clara (ya no oscura): «Total de ventas», el
  total grande, la comparación, el gráfico por hora y los cuatro medios en dos columnas (ícono en
  su color, importe y cuántas); debajo, ventas, productos y ticket promedio.
- «Ventas» con «Buscar» a su derecha, a mano del pulgar. Al tocarlo se esconden el día y el
  resumen y queda arriba un campo con la lupa, «×» para borrar y «Listo» para salir; debajo,
  cuántas coinciden y cuánto suman. Lo que coincide se resalta; si coincide un producto de una
  venta de varios, el renglón lo muestra («3 × Mecha… y 1 más»). Sin resultados: una lupa tachada,
  «Ninguna venta con «…»», un ejemplo y las dos salidas.
- Tocar una venta abre su hoja: la hora, el medio y el cliente, los productos con cantidad,
  precio y total, y «Anular» (rojo) si se puede. «Anular» pasa a confirmar: el motivo en una lista
  desplegable, el comentario y «Cancelar» / «Anular · −$20.000». Una anulada dice cuándo y por
  qué se anuló.

## En la computadora, los cuatro cajones (decisión 122, historia 5)

Maqueta aprobada por Carlos el 2026-10-19: `maquetas/compu-ventas-de-hoy-elegida.png` (la v4 del
director de arte, dentro del menú). Las pestañas de Vender en la computadora son «Vender» y «Ventas de
hoy», como en el celular (decisión 120):

- Arriba a la derecha, «Buscar una venta» (Ctrl+K) y «Otro día» (F).
- El día, el total, la comparación, ventas, productos y ticket promedio; a la derecha, lo vendido por
  hora con cada barra apilada por medio de pago.
- Debajo, cuatro columnas, una por medio de pago (los cajones de la caja), con su total y cuántas
  ventas; cada venta en una tarjeta con el producto o «3 productos» (o el cliente, en cuenta
  corriente), el importe, la hora y lo que lleva. Las anuladas, punteadas y tachadas.
- ← → cambian de cajón, ↑ ↓ de venta, Enter la abre, A la anula. No se arrastra: el medio de una
  venta no se cambia desde acá.
- Abierta, una ventana con sus productos, el total y «Anular» (A), que pide confirmar con el motivo en
  una lista y el comentario (Ctrl+Enter confirma, el botón dice cuánto se descuenta).
- Buscando, el resumen se esconde y queda el campo, cuántas coinciden y cuánto suman; lo que
  coincide se resalta. Esc borra y, vacío, sale.

## Colores de los medios de pago (decisión 108)

Efectivo verde, Mercado Pago celeste, Tarjeta violeta, Cuenta corriente ámbar, con su versión
suave de fondo. Los íconos son los del cobro de Vender (el billete, el isotipo de Mercado Pago, la
tarjeta y la libreta de la cuenta corriente), no los de la maqueta, para que sean los mismos en
toda la aplicación. Igual que ayer, la comparación dice «0 %» sin flecha y sin color. Están en la paleta compartida y se usan en el ícono de cada medio donde aparezca:
«Hoy», «Anular», el cobro de Vender y «Cómo va el negocio».

## Chequeo contra los principios de interfaz

- Las palabras del negocio: «ticket promedio», «Cuenta corriente», «vs. ayer a esta hora». Cumple.
- Lo mismo en el celular y en la computadora, con textos compartidos (decisión 47). Cumple.
- Todo con el teclado en la computadora. Cumple: flechas, Enter y «F».
- Funciona sin conexión: hoy, con lo último que se bajó; otro día lo dice. Cumple.
- Colores: solo en elementos puntuales con significado, iguales en toda la aplicación (decisión 108). Cumple.
