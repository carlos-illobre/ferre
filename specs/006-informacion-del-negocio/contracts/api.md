# API: Información del negocio

Servicio `gestion-del-local`. Código: `microservices/gestion-del-local/src/rutas/compras.ts`
(montado en `/compras` desde `src/app.ts`).

## Ruta propia de esta capacidad

| Método | Ruta | Rol que exige | Para qué sirve |
|---|---|---|---|
| GET | `/compras/semana` | Cualquier usuario con sesión (`exigirSesion`; sin sesión responde 401). No distingue rol | Gasto en compras de los últimos siete días (RF-65) |

Respuesta de `GET /compras/semana` (200):

```json
{
  "desde": "2026-09-08",
  "por_proveedor": [{ "proveedor": "Proveedor uno", "total": "40000.00", "compras": "2" }],
  "total": 40000
}
```

- `desde`: primer día del período (hoy menos seis días), `AAAA-MM-DD`.
- `por_proveedor`: una fila por proveedor con compras confirmadas en el período, de mayor a
  menor `total`. `total` y `compras` llegan como texto.
- `total`: suma de los totales por proveedor, como número.
- No recibe parámetros: el período no se puede cambiar.

## Rutas de otras capacidades que usan las pantallas de esta

| Método | Ruta | Capacidad dueña | Uso acá |
|---|---|---|---|
| GET | `/ventas` | Ventas (RF-23) | Total, totales por medio de pago y detalle de las ventas de hoy en Negocio (celular) |
