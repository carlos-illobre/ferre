# Contrato de la API: Ventas

Servicio `gestion-del-local`. Código: `microservices/gestion-del-local/src/rutas/ventas.ts`
y `microservices/gestion-del-local/src/rutas/consultas.ts`, montadas en `/ventas` y
`/consultas` (`src/app.ts`).

**Rol que exigen:** todas las rutas pasan por `exigirSesion` y ninguna por `exigirRol`.
Alcanza con una sesión válida de cualquier rol (dueño, admin o mostrador); sin sesión
responden 401 «Hay que iniciar sesión».

| Método | Ruta | Rol que exige | Para qué sirve |
|---|---|---|---|
| POST | `/ventas` | Cualquier usuario con sesión | Registrar una venta con sus renglones |
| GET | `/ventas` | Cualquier usuario con sesión | Las ventas de un día (hoy por omisión) con sus renglones y los totales |
| POST | `/ventas/:id/anular` | Cualquier usuario con sesión | Anular una venta y devolver el stock |
| POST | `/ventas/:id/pagar` | Cualquier usuario con sesión | Marcar pagada una venta a cuenta corriente (RF-40, capacidad de Clientes) |
| POST | `/consultas` | Cualquier usuario con sesión | Anotar lo que pidieron y no llevaron |
| GET | `/consultas` | Cualquier usuario con sesión | Las últimas 200 consultas anotadas |

## POST /ventas

Cuerpo:

```json
{
  "id": "uuid (opcional; lo genera el dispositivo)",
  "fecha": "ISO 8601 (opcional; por omisión, ahora)",
  "medio_pago": "efectivo | mercado_pago | tarjeta | cuenta_corriente",
  "cliente_id": "uuid, obligatorio si es cuenta_corriente",
  "dispositivo_id": "texto (opcional)",
  "items": [{
    "producto_id": "uuid o null (null = ítem libre)",
    "descripcion": "texto, obligatorio",
    "cantidad": "número > 0",
    "precio_unitario": "número ≥ 0",
    "costo_neto": "número o null",
    "margen_aplicado": "entero o null",
    "explicacion": "objeto libre (pasos del precio y del costo)",
    "precio_proveedor_id": "uuid o null"
  }]
}
```

- El total lo calcula el servidor: suma de `precio_unitario × cantidad` de cada renglón,
  cada uno redondeado para arriba a $1.000 (RF-19) con la misma función que usa la pantalla
  (`subtotalDeRenglon`, librería `calculo-de-precios`).
- En una sola transacción guarda la venta, sus renglones, un movimiento de stock negativo
  por cada renglón con producto y el evento `venta.registrada` con el usuario.
- **201** `{ id, total, estado: "confirmada" }`.
- **200** `{ id, total, estado, repetida: true }` si ya existe una venta con ese id: no se
  duplica.
- **400** `{ error }` si el id no es un UUID, el medio de pago no es uno de los cuatro, es
  cuenta corriente sin cliente, no hay renglones, o un renglón no tiene descripción, tiene
  cantidad que no es mayor que cero o precio negativo.

## GET /ventas

- Parámetro opcional `dia` (`AAAA-MM-DD`). Sin él, hoy. El día es el del local
  (America/Argentina/Buenos_Aires), no el del servidor. Ninguna pantalla manda `dia` todavía.
- **200** `{ dia, ventas, totales, total }`. Cada venta: `id`, `fecha`, `medio_pago`,
  `total`, `estado`, `pagada_en`, `cliente` (nombre o null) e `items` en orden
  (`descripcion`, `cantidad`, `precio_unitario`, `margen_aplicado`, `explicacion`). Las más
  nuevas primero. `totales` es el total por medio de pago y `total` la suma; los dos cuentan
  solo las ventas confirmadas.

## POST /ventas/:id/anular

- Cuerpo opcional `{ "motivo": "texto" }`.
- Marca la venta como `anulada` (no la borra), inserta un movimiento de stock `ajuste` en
  positivo por cada renglón con producto y registra el evento `venta.anulada` con el usuario
  y el motivo.
- **204** sin cuerpo.
- **409** «La venta no existe o ya está anulada».

## POST /ventas/:id/pagar

- Pone `pagada_en` a una venta a cuenta corriente, confirmada y todavía sin pagar; registra
  el evento `venta.pagada`.
- **204** sin cuerpo. **409** «La venta no es a cuenta corriente, está anulada o ya se pagó».
- Ninguna pantalla la usa todavía (#57).

## POST /consultas

Cuerpo:

```json
{
  "items": [{ "producto_id": "uuid o null", "descripcion": "texto", "precio_ofrecido": "número o null" }],
  "motivo": "texto (opcional)",
  "dispositivo_id": "texto (opcional)"
}
```

- Guarda una consulta por renglón; los renglones sin descripción se saltean. La fecha la
  pone el servidor. No registra evento.
- **204** sin cuerpo. **400** «No hay nada que registrar» si no hay renglones.
- Las pantallas de hoy no mandan `motivo`.

## GET /consultas

- **200** lista de hasta 200 consultas, las más nuevas primero: `id`, `fecha`,
  `descripcion`, `precio_ofrecido`, `motivo`.
- Ninguna pantalla la usa todavía.

## Rutas de otras capacidades que usa la venta

| Método | Ruta | Para qué la usa la venta |
|---|---|---|
| GET | `/productos` | El catálogo sobre el que se busca (se guarda en el dispositivo) |
| PATCH | `/productos/:id` | Guardar el margen o la unidad elegidos en el renglón |
| GET | `/stock` | El stock que se muestra al lado de cada producto |
| GET | `/clientes` | Los clientes para la cuenta corriente, con lo que debe cada uno |

## Pruebas

- `microservices/gestion-del-local/src/rutas/ventas.test.ts` cubre `POST /ventas`
  (validaciones, registro, redondeo por renglón, reenvío).
- `GET /ventas`, `POST /ventas/:id/anular` y `POST /consultas` no tienen prueba unitaria; los
  recorre `tests/e2e/*/04-vender.spec.ts`.
- `POST /ventas/:id/pagar` y `GET /consultas` no tienen ninguna prueba.
