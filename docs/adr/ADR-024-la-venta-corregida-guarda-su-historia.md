# ADR-024: La venta corregida guarda su historia y la plata de las diferencias va en movimientos

**Estado:** Aceptado
**Fecha:** 2026-10-20
**Especificación:** `specs/019-corregir-y-cambiar/`

---

## Contexto

Carlos pidió corregir cualquier venta (cantidades, precios, renglones, medio y cliente) y registrar
cambios de producto dentro de los 15 días, cobrando o devolviendo la diferencia (decisiones 124 y
135). La constitución pide que nada se borre y que todo número se explique (principio V). La lista
del día, la deuda de cuenta corriente, los informes y la Actividad ya leen la venta tal como está.

## Decisión

1. **La venta queda con sus valores vigentes y cada corrección guarda una foto** de cómo estaba y
   de cómo quedó. Un renglón quitado se marca como quitado por esa corrección; no se borra.
2. **Un cambio es un registro propio unido a la venta original**, con lo que volvió (al precio
   pagado, con si estaba fallado) y lo que se llevó. No cambia el total de la venta original.
3. **La plata de cada diferencia es un movimiento de dinero** del día en que pasó, con su medio y su
   motivo. En cuenta corriente, el movimiento lleva al cliente y la deuda lo suma; al corregir una
   venta a cuenta corriente, el total nuevo ya cambia la deuda.
4. **El stock se mueve por la diferencia**, con su referencia; lo devuelto fallado no vuelve y queda
   como anomalía «devuelto fallado».
5. **Todo en una transacción del servidor**, que valida el permiso, el plazo, lo que queda por
   devolver y la versión de la venta (si otro la cambió mientras tanto, 409).

## Consecuencias

- Lo que hoy lee ventas sigue igual; los totales del día y la deuda suman, además, los movimientos.
- El cierre de caja (004) va a sumar ventas del día y movimientos del día.
- Una venta se puede reconstruir en cualquier momento desde sus correcciones y la Actividad.

## Alternativas descartadas

- **Anular y volver a vender:** pierde el vínculo con la venta original y cuenta el día mal.
- **Reemplazar la venta por una nueva:** rompe las referencias del stock, las anomalías y los
  cambios, y la duplica en los totales.
- **Guardar solo eventos y reconstruir:** cada lectura tendría que rearmar la venta.
