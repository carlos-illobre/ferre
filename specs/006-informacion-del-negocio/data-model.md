# Data Model: Información del negocio

Contrato de datos del gasto semanal en compras (RF-65), que es una consulta de solo lectura
sobre entidades de otras capacidades. Las entidades propias de la capacidad (cierre de
caja, novedades del día, gasto) están descritas en «Key Entities» de la especificación.

## Entidades que lee

| Entidad | Capacidad dueña | Qué usa esta capacidad |
|---|---|---|
| `compra` | Compras y stock (RF-50) | `fecha` (date), `total` (numeric 12,2), `estado` (`confirmada` o `anulada`), `proveedor_id` |
| `proveedor` | Catálogo y precios | `nombre`, para agrupar el gasto |
| `venta` e `item_venta` | Ventas (RF-23) | Las ventas confirmadas de un día, con su medio de pago, su total y, por renglón, el precio y el costo de ese momento (RNF-31) |

## Cómo se calcula el gasto de la semana

- Se suman los `total` de las `compra` con `estado = 'confirmada'` y `fecha` entre el día
  en curso menos seis días y el día en curso (`fecha >= current_date - 6`), agrupadas por
  `proveedor.nombre`.
- El total general es la suma de los totales por proveedor.
- No se guarda: se calcula en cada consulta, con el índice `compra_por_fecha` sobre
  `compra (fecha DESC)`.
- `fecha` es la que se cargó en la compra, no `creado_en`.
- El período que abarca «la semana» es una aclaración abierta de RF-65; este modelo
  describe una ventana de siete días que termina en el día en curso.
