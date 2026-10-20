# Contrato: correcciones y cambios

Todas piden sesión. Errores: 400 (datos mal), 403 (sin permiso, con el permiso que falta), 404 (no
existe), 409 (anulada, pasó el plazo, devuelve de más, o la venta cambió mientras tanto).

## POST /ventas/:id/corregir

Entrada: `version` (la marca de modificación que se leyó), `medio_pago`, `cliente_id`, `items` (los
renglones como quedan: los que siguen con su id y los nuevos sin id, con cantidad y precio
unitario como en una venta), y `medio_diferencia` (si la diferencia es a favor del local y no es
cuenta corriente). Salida: la venta como quedó, la diferencia y cómo se resolvió.

## GET /ventas/para-cambio?q=…&desde=…

Las ventas confirmadas de los últimos 15 días que tienen un producto que coincide con `q`, de a 20,
con sus renglones (y cuánto queda por devolver de cada uno).

## POST /ventas/:id/cambio

Entrada: `vuelve` (renglón de la venta, cantidad, fallado), `se_lleva` (renglones como en una
venta) y `medio_diferencia` (si hay que cobrar). Salida: el cambio con la diferencia y cómo se
resolvió.

## GET /ventas?dia=… (existe)

Agrega: en cada venta, si está corregida (y un resumen de qué cambió) y sus cambios; en el día, los
movimientos de dinero, que entran en los totales por medio.
