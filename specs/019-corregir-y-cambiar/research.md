# Research: Corregir y cambiar una venta

## Cómo se guarda una corrección sin perder lo anterior

- **Decision:** la venta y sus renglones quedan con los valores nuevos (así todo lo que ya lee
  ventas sigue funcionando) y cada corrección guarda una foto de cómo estaba y de cómo quedó. Un
  renglón quitado no se borra: queda marcado como quitado por esa corrección y deja de contar.
- **Rationale:** la lista del día, la deuda, los informes y Actividad leen la venta vigente sin
  cambios; lo anterior se ve desde la foto.
- **Alternatives considered:** una venta nueva que reemplaza a la vieja (rompe las referencias del
  stock, de las anomalías y de los cambios, y duplica la venta en los totales); guardar solo los
  eventos y recalcular (cada lectura tendría que reconstruir la venta).

## Dónde va la plata de las diferencias

- **Decision:** un movimiento de dinero por cada diferencia cobrada o devuelta, con su medio, su
  importe con signo, el día en que pasó y a qué corrección o cambio responde. En cuenta corriente,
  el movimiento tiene medio «cuenta corriente» y el cliente, y la deuda lo suma.
- **Rationale:** la caja del día tiene que dar con lo que pasó ese día (RF-131), aunque la venta
  sea de otro; el cierre de caja (004) los va a sumar igual.
- **Alternatives considered:** cambiar el total de la venta original y nada más (la plata cobrada
  hoy por una venta de la semana pasada no aparecería en la caja de hoy).

## Cómo se corrige el total de la venta y la deuda

- **Decision:** al corregir, la venta toma el total nuevo. Si es a cuenta corriente, la deuda (que
  suma las ventas a cuenta corriente sin pagar) cambia sola; no hace falta movimiento. Si no, la
  diferencia va a un movimiento de dinero del día de la corrección. Un cambio no toca el total de la
  venta original: lo que volvió y lo que se llevó quedan en el cambio, y su diferencia en un
  movimiento (en cuenta corriente, con el cliente, y la deuda lo suma).
- **Rationale:** cada cosa en un solo lugar, sin contar dos veces.

## Buscar la venta original de un cambio

- **Decision:** buscar por producto (nombre o código) entre las ventas confirmadas de los últimos
  15 días que lo tienen, de la más nueva a la más vieja, de a 20, con el índice por producto.
- **Rationale:** es lo que dijo Carlos y lo que pide 018 (traer solo lo necesario).

## Dos personas a la vez

- **Decision:** la corrección manda la marca de versión de la venta que se editó; si la venta
  cambió en el medio, el servidor responde 409 y la pantalla recarga la venta.
- **Rationale:** el caso es raro y no merece bloqueos.
