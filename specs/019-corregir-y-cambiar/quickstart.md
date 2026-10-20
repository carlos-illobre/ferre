# Quickstart: Corregir y cambiar una venta

Con el stack de pruebas levantado (`tests/e2e.sh`) o la API de mentira de las capturas.

1. Vender 4 mechas en efectivo. En «Ventas de hoy», elegir la venta, «Corregir» (E), poner 3,
   «Guardar corrección». Ver: total menor, «Devolver $X en efectivo», el stock subió 1, la marca
   «corregida: eran 4» y el registro en Actividad (019-E01…E07).
2. Vender una pinza. «Registrar un cambio» (Alt+C), buscar «pinza», elegir la venta, marcar que
   vuelve (no fallada), agregar otra pinza más cara, cobrar la diferencia en efectivo. Ver: el
   renglón «Cambio» del día con «+$4.000», el stock de las dos pinzas y el total del día
   (019-E11…E17, E20, E21).
3. Repetir el 2 con «fallado»: la pinza no vuelve al stock y aparece en Anomalías como devuelto
   fallado (019-E13).
4. Con un usuario que solo anula las del día: corregir una venta de ayer no aparece (403 si se
   fuerza); un cambio de una venta de ayer sí (019-E24).
