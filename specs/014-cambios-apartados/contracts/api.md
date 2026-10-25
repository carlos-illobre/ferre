# API: Lo apartado de alguien a quien desactivaron

Servicio `comercial`. La decisión técnica, en ADR-021.

| Método | Ruta | Qué exige | Para qué sirve |
|---|---|---|---|
| POST | `/apartados` | El token de una sesión cerrada (o vencida) hace menos de 30 días de un usuario desactivado. Con límite de intentos por dirección | El dispositivo sube lo que quedó sin mandar; queda apartado (RF-102) |
| GET | `/apartados` | Sesión y «Administrar usuarios» | Lo que espera una decisión, de lo más viejo a lo más nuevo (RF-103) |
| POST | `/apartados/:id/aceptar` | Sesión y «Administrar usuarios» | Repite el pedido original como quien lo hizo (RF-104) |
| POST | `/apartados/:id/descartar` | Sesión y «Administrar usuarios» | Lo descarta sin registrarlo (RF-104) |

## `POST /apartados`

Hasta 200 cambios por pedido, cada uno de un tipo conocido y a la ruta de su tipo:

| Tipo | Método | Ruta |
|---|---|---|
| `venta` | POST | `/ventas` |
| `consulta` («no llevó») | POST | `/consultas` |
| `stock.ajuste` | POST | `/stock/:producto/ajustes` |
| `producto.cambio` | PATCH | `/productos/:producto` |
| `conteo.renglon` | PUT o DELETE | `/conteos/:conteo/renglones/:producto` |

```json
{ "cambios": [{ "orden": 1760000000000000, "creado_en": "2026-10-17T08:47:00.000Z", "tipo": "venta", "metodo": "POST", "ruta": "/ventas", "cuerpo": { "id": "…", "medio_pago": "efectivo", "items": [] } }] }
```

Respuestas: 200 `{ "apartados": 1 }`; 400 si algún cambio no se puede apartar (no se guarda
ninguno); 401 si el token no es de una sesión que sirva; 409 si el usuario sigue activo. El mismo
cambio (misma sesión y mismo `orden`) se guarda una sola vez.

## `GET /apartados`

```json
{ "apartados": [{ "id": "…", "tipo": "venta", "metodo": "POST", "ruta": "/ventas", "cuerpo": {}, "hecho_en": "2026-10-17T08:47:00Z", "llegado_en": "2026-10-17T10:05:00Z", "error": null, "usuario_id": "…", "usuario": "Ana López", "desactivado_en": "2026-10-17T09:12:00Z", "dispositivo": "celular del mostrador", "producto": null }] }
```

`desactivado_en` es cuándo se cerró la sesión de la que llegó; `producto`, el nombre del producto
de la ruta, si apunta a uno; `error`, por qué no se pudo aceptar la última vez.

## `POST /apartados/:id/aceptar` y `/descartar`

200 si se decidió. 404 si no existe. 409 si ya se decidió («Ya se decidió: lo aceptó Marta») o si
no se pudo aceptar («No se pudo aceptar: …», por un producto unido con otro o dado de baja, o por
lo que conteste la ruta original); en ese caso queda apartado con el motivo.
