# UX: Información del negocio

Lo construido es el gasto de la semana (RF-65) y, en el celular, la pantalla Negocio que
lo junta con las ventas de hoy. No hay tablero, cierre de caja ni novedades.

## Celular

| Dónde | Archivo | Qué muestra |
|---|---|---|
| Negocio (pestaña), tarjeta «Ventas de hoy» | `clientes/gestion-del-local-web/src/pantallas/Negocio.tsx` (`resumen-hoy`) | Fecha de hoy, cantidad de ventas confirmadas, total vendido y total por medio de pago (efectivo, Mercado Pago, tarjeta, cuenta corriente). Los datos son de RF-23 |
| Negocio, «Detalle de hoy» | `Negocio.tsx` con `clientes/gestion-del-local-web/src/pantallas/VentasDeHoy.tsx` | Cada venta de hoy con sus productos, uno por renglón, y «Anular» (RF-23). Sin conexión: «las ventas de hoy se ven cuando vuelva internet» |
| Negocio, «Gastos de la semana» | `Negocio.tsx` (`gastos-semana`) | Total de la semana y una fila por proveedor: nombre, importe y «N compras desde el DD/MM/AAAA». No aparece si no hubo compras en el período |
| Depósito · Ingreso, título «Gastos de la semana» | `clientes/gestion-del-local-web/src/pantallas/Deposito.tsx` (`gastos-semana`) | Solo el total de la semana, arriba de las compras recientes; se actualiza al registrar o anular una compra. No aparece si no hay compras recientes |

En Negocio están además usuarios, celulares con huella, sesiones y «Quién hizo qué», que
son de la capacidad de usuarios y registro.

## Computadora

| Dónde | Archivo | Qué muestra |
|---|---|---|
| Compras, desplegable «Gastos de la semana» | `clientes/gestion-del-local-web/src/escritorio/pantallas/Compras.tsx` (`GastosDeLaSemana`, `gastos-semana`) | Título «Gastos de la semana (desde el DD/MM/AAAA): total»; viene desplegado, con una tabla Proveedor / Compras / Total. Se actualiza al registrar o anular una compra. No aparece si no hubo compras en el período |

En la computadora no hay pantalla de Negocio: Administración
(`escritorio/pantallas/Administracion.tsx`) no muestra ventas ni gastos. Las ventas de hoy
se ven en Vender (RF-23).
