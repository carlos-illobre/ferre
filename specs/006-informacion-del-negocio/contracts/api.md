# API: Información del negocio

Servicio `gestion-del-local`.

## Ruta propia de esta capacidad

| Método | Ruta | Qué exige | Para qué sirve |
|---|---|---|---|
| GET | `/compras/semana` | Sesión; sin sesión responde 401. El rol que corresponde lo fija RF-72: Comprador o Administrador | Gasto en compras de la semana (RF-65) |

Respuesta de `GET /compras/semana` (200):

```json
{
  "desde": "2026-09-08",
  "por_proveedor": [{ "proveedor": "Proveedor uno", "total": "40000.00", "compras": "2" }],
  "total": 40000
}
```

- `desde`: primer día del período (el día en curso menos seis días), `AAAA-MM-DD`.
- `por_proveedor`: una fila por proveedor con compras confirmadas en el período, de mayor a
  menor `total`. `total` y `compras` llegan como texto.
- `total`: suma de los totales por proveedor, como número.
- No recibe parámetros: el período es fijo.
- El período que abarca «la semana» es una aclaración abierta de RF-65; este contrato
  describe una ventana de siete días que termina en el día en curso.

## Rutas de otras capacidades que usa esta

| Método | Ruta | Capacidad dueña | Qué aporta |
|---|---|---|---|
| GET | `/ventas` | Ventas (RF-23) | Total, totales por medio de pago y detalle de las ventas confirmadas del día |
