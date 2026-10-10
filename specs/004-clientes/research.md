Viene de `docs/proceso-actual.md` («Procedimiento actual del empleado»), sección «Clientes importantes».

## Clientes importantes

- Compran a **cuenta corriente** (fiado). Cada compra se anota en **un cuaderno de deudas**; cuando el cliente
  paga, se tacha el renglón.
- A veces tienen **precio distinto**, según la cantidad que compran y la velocidad con
  que pagan. Lo decide el empleado o el dueño en el momento.

### Consecuencia para el diseño

- "Cuenta corriente" tiene que ser un medio de pago desde el MVP, con el nombre del
  cliente. Sin eso, las ventas a los clientes grandes seguirían en un cuaderno aparte.
- La cuenta corriente completa (saldo, pagos parciales, resumen) es el issue #43; el
  tachado del renglón se traduce a "marcar como pagada".
- El precio especial se cubre con el precio manual por línea del issue #13; no hace
  falta una lista de precios por cliente en el MVP.
