# Contrato de auditoría, versión 1

Cómo un servicio le manda a Auditoría lo que hizo cada persona (specs/027, decisión 167). Lo
cumple cualquier servicio, en cualquier lenguaje: Auditoría no necesita conocerlo. En Node, el
kit `microservices/auditoria-kit` lo hace por el servicio.

## Mandar es opcional

Un servicio sin la dirección de Auditoría en su `.env` (`AUDITORIA_URL` vacía) no anota ni manda
nada, y funciona igual. Encendido, tampoco depende de Auditoría: si no responde, los eventos
esperan en el servicio y se reintentan.

## El evento

Un objeto JSON:

| Campo | Obligatorio | Tipo | Qué es |
|---|---|---|---|
| `id` | sí | uuid | Lo pone el servicio. Auditoría no guarda dos veces el mismo |
| `servicio` | sí | texto, 1 a 40 | Quién lo manda: `comercial`, `procesos`… |
| `tipo` | sí | texto `cosa.accion`, 3 a 80 | Qué pasó: `venta.registrada` |
| `fecha` | sí | ISO 8601 con zona | Cuándo, con la hora de la base del servicio |
| `quien` | no | `{ id, nombre }`, textos de 1 a 120 | Quién, con su nombre en ese momento. Sin quién: «el sistema» |
| `dispositivo` | no | texto, hasta 120 | Desde dónde |
| `titulo` | sí | texto, 1 a 120 | Lo que se lee en la lista: «Venta cobrada» |
| `detalle` | no | texto, hasta 300 | La línea de abajo: «$12.000 · efectivo · 3 productos» |
| `grupo` | sí | texto, 1 a 60 | Para el filtro «qué»: «Ventas», «Procesos» |
| `importancia` | sí | `normal`, `revisar` o `anulacion` | Cómo se marca: ámbar lo que se revisa, rojo la anulación |
| `referencias` | no | lista de `{ cosa, id }`, hasta 20 | A qué cosas se refiere, para buscar todo lo de una |
| `contenido` | no | objeto, hasta 16 KB | Los datos completos, libres |

## La entrega

```
POST /v1/eventos
X-Token-Servicio: <el token entre servicios>
Content-Type: application/json

{ "eventos": [ <evento>, … ] }     (de 1 a 100)
```

- Por la red interna, a la dirección de Auditoría; la puerta no la publica.
- `200 { "guardados": N }`: quedaron todos. Un `id` que ya estaba cuenta como guardado.
- `400 { "error": "…" }`: el lote no cumple el contrato; dice qué evento y qué campo. No se guarda
  ninguno de ese lote: se corrige y se vuelve a mandar.
- `401`: sin el token, o con otro.
- Cualquier otra respuesta, o ninguna: se reintenta más tarde con el mismo lote. Como el `id` no
  se duplica, reintentar nunca guarda dos veces.

## Para no perder ninguno

El servicio anota el evento en su propia base, en la misma transacción que la acción, y lo
entrega después. Si la transacción se deshace, el evento no queda. Lo entregado se puede borrar
de su base una semana después: queda en Auditoría.

## Versiones

A la versión 1 solo se le agregan campos opcionales. Un cambio que rompa es la versión 2, en
`/v2/eventos`, y convive con la 1.
