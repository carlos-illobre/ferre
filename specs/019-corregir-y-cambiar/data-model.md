# Data Model: Corregir y cambiar una venta

## venta (existe)

Sin columnas nuevas. Corregir actualiza `total`, `medio_pago` y `cliente_id`; su marca de
modificación sirve de versión para no pisar otra corrección.

## item_venta (existe)

- `quitado_por` → corrección que lo sacó de la venta (nulo si sigue). Un renglón quitado no cuenta
  en el total, en la lista ni en el stock vigente.
- `devuelto` (cantidad) → lo que ya volvió por cambios; nunca supera `cantidad`.

## correccion_venta (nueva)

| Campo | Qué es |
|---|---|
| id | identificador |
| venta_id | la venta corregida |
| usuario_id, dispositivo_id, fecha | quién, desde dónde, cuándo |
| antes, despues | foto de la venta (medio, cliente, total, renglones) antes y después |
| diferencia | despues.total − antes.total (con signo) |
| resuelta | `cobrada`, `devuelta`, `cuenta_corriente` o `sin_diferencia` |

Validaciones: la venta está confirmada; quedan renglones; el permiso según el día de la venta.

## cambio (nuevo) y cambio_renglon (nuevo)

`cambio`: id, venta_id (la original), usuario_id, dispositivo_id, fecha, diferencia (con signo),
resuelto (`cobrado`, `devuelto`, `cuenta_corriente`, `sin_diferencia`).

`cambio_renglon`: id, cambio_id, lado (`vuelve` o `se_lleva`), item_venta_id (en lo que vuelve),
producto_id, descripcion, cantidad, precio_unitario (en lo que vuelve, el pagado), fallado (en lo
que vuelve).

Validaciones: la venta está confirmada y tiene hasta 15 días; lo que vuelve no supera lo vendido
menos lo ya devuelto; lo que se lleva sigue las reglas de una venta (precio calculado o a mano).

## movimiento_dinero (nuevo)

id, fecha, tipo (`cobro_diferencia` o `devolucion`), medio_pago (los de siempre, y
`cuenta_corriente` con cliente_id), importe (positivo cobrado, negativo devuelto), venta_id,
correccion_id o cambio_id, usuario_id.

Los totales del día suman las ventas vigentes del día más los movimientos del día. La deuda de un
cliente suma, además, sus movimientos en cuenta corriente.

## movimiento_stock (existe)

Tipos nuevos: `correccion` y `cambio` (con su referencia). Lo que vuelve no fallado suma; lo que se
lleva resta, con la regla de RF-59 si no alcanza.

## anomalia (existe)

Tipo nuevo `devuelto_fallado`, con el producto, la cantidad, la venta y quién lo recibió.

## evento (existe, Actividad)

`venta.corregida` (lo de antes y lo de ahora, la diferencia y cómo se resolvió) y `venta.cambio`
(qué volvió, si estaba fallado, qué se llevó, la diferencia y cómo se resolvió).
