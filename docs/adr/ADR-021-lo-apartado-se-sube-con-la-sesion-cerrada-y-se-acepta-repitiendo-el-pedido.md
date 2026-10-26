# ADR-021: Lo apartado se sube con la sesión cerrada y se acepta repitiendo el pedido

**Estado:** Aceptado
**Fecha:** 2026-10-17
**Precisa:** la decisión 97 (`docs/decisiones-de-negocio.md`) y `specs/014-cambios-apartados/`

---

## Contexto

La cola de cambios del dispositivo (ventas, ajustes de stock, márgenes, renglones de conteo,
«no llevó») guarda cada cambio como un pedido completo al servidor: método, ruta y cuerpo, a
nombre de quien lo hizo. Cuando se desactiva a una persona, su sesión deja de valer y lo que
tenía sin mandar se queda en el dispositivo (decisión 97). Carlos decidió que eso suba al
servidor apartado, sin aplicarse, y que quien tiene «Administrar usuarios» lo acepte o lo
descarte desde Anomalías; lo aceptado queda a nombre de quien lo hizo.

Hay dos problemas técnicos:

1. **Con qué permiso sube.** La sesión ya no sirve: el servidor contesta 401 a todo.
2. **Cómo se aplica al aceptar.** Cada tipo de cambio ya tiene su ruta con sus reglas
   (validaciones, stock, anomalías, eventos). Escribir una segunda forma de aplicar cada uno
   duplicaría las reglas y se desfasaría con el tiempo.

## Decisión

1. **La subida se autentica con el token de la sesión cerrada.** El dispositivo conserva el
   token que el servidor acaba de rechazar y lo usa para `POST /apartados` (de a 200 cambios). El
   servidor lo acepta solo si el token es de una sesión que existe, cerrada o vencida hace menos
   de 30 días, y cuyo usuario está desactivado. Si el usuario sigue activo (le cerraron la sesión a distancia), contesta 409 y
   el dispositivo se queda con lo suyo hasta que la persona vuelva a entrar. Ese token no sirve
   para ninguna otra ruta.
2. **Solo se aparta lo que la cola sabe mandar.** Cada cambio subido tiene que ser de un tipo
   conocido y apuntar a la ruta de ese tipo (por ejemplo, una venta solo a `POST /ventas`). Lo
   demás se rechaza. Así lo apartado nunca puede apuntar a una ruta de administración.
3. **Aceptar repite el pedido original por dentro, como quien lo hizo.** El servidor arma el
   mismo pedido (método, ruta y cuerpo) y se lo pasa a su propia aplicación con la identidad de
   quien lo hizo, sin pasar por la red. Corren las mismas reglas que si hubiera llegado a
   tiempo: si hoy no se puede aplicar (un producto unido con otro, un permiso que la persona ya
   no tiene), queda apartado con el motivo. La identidad interna se pasa en el entorno del
   pedido, que solo puede armar el servidor; desde afuera no se puede pedir.
4. **Una sola vez.** El cambio se bloquea mientras se decide: si dos personas aceptan a la vez,
   la segunda ve que ya se decidió. Un cambio que llega dos veces (se cortó la conexión antes
   de la respuesta) se guarda una sola vez, por la sesión y el número de orden de la cola.

## Consecuencias

- Las ventas aceptadas quedan con la fecha en que se cobraron, porque la venta la trae. Los
  ajustes de stock, los cambios de margen y los renglones de conteo los fecha el servidor al
  aplicarlos, así que quedan con la fecha en que se aceptan; la pantalla de revisión y el
  registro de quién hizo qué guardan cuándo se hicieron.
- Un cambio nuevo en la cola (otro tipo) tiene que agregarse a la lista de tipos que se pueden
  apartar; si no, el servidor lo rechaza y queda en el dispositivo.
- El token de una sesión cerrada queda guardado en el dispositivo hasta que la subida termina.
  Solo sirve para subir lo apartado de una persona desactivada, hasta 30 días después de cerrada
  la sesión, y lo subido no se aplica hasta que alguien lo revisa.
- El pedido repetido se confirma en su propia transacción, antes de marcar la decisión. Si marcar
  la decisión fallara justo después, el cambio quedaría aplicado y todavía pendiente; aceptarlo de
  nuevo no duplica una venta (tiene su id), pero sí podría repetir un «no llevó».
- Antes de repetir, se mira que ningún producto del cambio se haya unido con otro o dado de baja:
  la ruta original no lo controla, y una venta vieja no debe quedar en un producto que ya no se usa.

## Enmienda (specs/029): lo apartado vive en Acceso

Lo apartado se sube, se revisa y se decide en Acceso. Aceptar repite el pedido original **directo
al servicio que lo atiende** (hoy, Comercial: `DESTINO_APARTADOS`) por la red interna, con el token
entre servicios, la identidad de quien lo hizo en las cabeceras y `X-Apartado: 1`. La revisión de
productos unidos o dados de baja la hace Comercial, que es donde están los productos: ante un pedido
apartado, contesta 409 con el mismo motivo de antes.
