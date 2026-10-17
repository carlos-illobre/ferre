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
- La anulada, tachada, con «anulada» en una pastilla.
- Computadora: la tabla Hora · Productos · Cómo pagó (una pastilla con el ícono y el color del
  medio, el cliente debajo) · Total; ↑ ↓ eligen una venta, Enter abre o cierra su detalle, «F»
  abre «Cambiar fecha». El resumen oscuro, a la izquierda.

## Otro día (historia 4)

- «Cambiar fecha» abre el calendario del sistema, hasta hoy. Con otro día elegido, aparece
  «Volver a hoy». Sin ventas ese día: «No hubo ventas ese día». Sin conexión, otro día dice que
  hace falta internet.

## Colores de los medios de pago (decisión 108)

Efectivo verde, Mercado Pago celeste, Tarjeta violeta, Cuenta corriente ámbar, con su versión
suave de fondo. Están en la paleta compartida y se usan en el ícono de cada medio donde aparezca:
«Hoy», «Anular», el cobro de Vender y «Cómo va el negocio».

## Chequeo contra los principios de interfaz

- Las palabras del negocio: «ticket promedio», «Cuenta corriente», «vs. ayer a esta hora». Cumple.
- Lo mismo en el celular y en la computadora, con textos compartidos (decisión 47). Cumple.
- Todo con el teclado en la computadora. Cumple: flechas, Enter y «F».
- Funciona sin conexión: hoy, con lo último que se bajó; otro día lo dice. Cumple.
- Colores: solo en elementos puntuales con significado, iguales en toda la aplicación (decisión 108). Cumple.
