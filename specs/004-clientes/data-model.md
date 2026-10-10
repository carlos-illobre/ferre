# Modelo de datos: Clientes

## `cliente`

Solo los clientes importantes; el cliente de barrio no se carga.

| Columna | Tipo | Detalle |
|---|---|---|
| `id` | uuid, clave primaria | |
| `nombre` | text, obligatorio | |
| `telefono` | text | Opcional |
| `cuenta_corriente` | boolean, obligatorio, por omisión `false` | Si se le permite comprar a cuenta corriente. La API lo guarda en `true` si al crear el cliente no se indica |
| `activo` | boolean, obligatorio, por omisión `true` | Nada se borra: se desactiva |
| `creado_en`, `modificado_en` | timestamptz | `modificado_en` se actualiza con trigger |

## `venta` (lo que toca a clientes)

La tabla completa pertenece a la capacidad de ventas. De acá importan:

| Columna | Tipo | Detalle |
|---|---|---|
| `cliente_id` | uuid, referencia a `cliente(id)` | Opcional, salvo en cuenta corriente |
| `medio_pago` | text | Uno de `efectivo`, `mercado_pago`, `tarjeta`, `cuenta_corriente` |
| `pagada_en` | timestamptz | Solo cuenta corriente: cuándo pagó el cliente (el «tachar el renglón»). Vacía mientras se debe |
| `estado` | text | `confirmada` o `anulada`; una anulada no cuenta como deuda |

- Restricción: si `medio_pago` es `cuenta_corriente`, `cliente_id` no puede faltar.
- Índice `venta_cuenta_corriente_pendiente` sobre `cliente_id`, solo para las ventas a cuenta corriente sin pagar.

## Relación

Un cliente tiene cero o muchas ventas; una venta tiene cero o un cliente.

## Lo que se calcula y no se guarda

- **Deuda de un cliente:** suma de `venta.total` de sus ventas con `medio_pago = 'cuenta_corriente'`, `estado = 'confirmada'` y `pagada_en` vacía.

## Eventos (`evento`)

| Tipo | Cuándo | Contenido |
|---|---|---|
| `cliente.creado` | Al crear un cliente | `id`, `nombre` |
| `venta.pagada` | Al marcar pagada una venta a cuenta corriente | `id` de la venta |

Los dos llevan el usuario que hizo la acción.
