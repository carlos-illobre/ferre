# Data Model: Información del negocio

Esta capacidad **no tiene entidades propias**: no hay tablas de tablero, cierre de caja,
novedades ni gastos fijos. Lo construido (RF-65) es una consulta de solo lectura sobre
entidades de otras capacidades. Fuentes: `docs/MODELO.md` y
`microservices/gestion-del-local/migrations/0001_modelo_inicial.sql`.

## Entidades que lee

| Entidad | Capacidad dueña | Qué usa esta capacidad |
|---|---|---|
| `compra` | Compras y stock (RF-50, #30) | `fecha` (date), `total` (numeric 12,2), `estado` (`confirmada` o `anulada`), `proveedor_id` |
| `proveedor` | Catálogo y precios | `nombre`, para agrupar el gasto |
| `venta` e `item_venta` | Ventas (RF-23, #16) | Las ventas de hoy que resume Negocio, por medio de `GET /ventas` |

## Cómo se calcula el gasto de la semana

- Se suman los `total` de las `compra` con `estado = 'confirmada'` y `fecha` entre hoy menos
  seis días y hoy (`fecha >= current_date - 6`), agrupadas por `proveedor.nombre`.
- El total general es la suma de los totales por proveedor.
- No se guarda: se calcula en cada consulta. Existe el índice `compra_por_fecha` sobre
  `compra (fecha DESC)`.
- `fecha` es la que se cargó en la compra, no `creado_en`.
