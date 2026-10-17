# Revisión: 014 · Lo apartado de alguien a quien desactivaron

**Revisor:** subagente `revisor` (paso 7), 2026-10-17. No vio la conversación que especificó y
programó: compara solo los documentos (`spec.md`, `plan.md`, `tasks.md`, ADR-021, maquetas `c`)
con el código de los commits `a554dbd`, `f26e470` y `c3f591b` (014-T004 a 014-T008).

**Qué se corrió:** las unitarias de la funcionalidad (`apartados.test.ts`: 12 pasan;
`para-revisar.test.tsx` y `cola.test.ts`: 19 pasan), `node tests/trazabilidad.mjs` (coincide) y
capturas con `tests/capturas/` de `para-revisar` en computadora y `mas/para-revisar` en celular.
**No se corrieron** las e2e en Docker (`19-para-revisar`): lo que dicen de ellas sale de leerlas.

Gravedad: **Frena** = frena el cierre; **Defecto** = se puede anotar como defecto y cerrar.

---

## 1. Escenarios

### Frenan el cierre

**1.1 · E18: la pantalla no dice «ya se decidió»; la tarjeta desaparece sin mensaje.** Frena.
- Dónde: `microservices/web/src/negocio/apartados.ts:21-24` (`decidir`) y
  `microservices/web/src/pantallas/ParaRevisar.tsx:41-46` (`hacer`).
- Spec (E18): si otra persona ya lo decidió, «no se aplica dos veces y la pantalla dice que ya se
  decidió». Lo mismo dice el caso de borde «Dos personas revisan a la vez».
- Código: el servidor contesta bien (409 «Ya se decidió: lo aceptó X»). Pero `decidir` vuelve a pedir
  la lista en el `finally`, con `await`, **antes** de que el error llegue a la tarjeta. La lista
  nueva ya no trae ese cambio, porque está decidido. La tarjeta se desmonta y el `setError` de
  `hacer` cae sobre un componente que ya no está. Quien revisa ve que la tarjeta se va, como si
  la hubiera aceptado él.
- La prueba `014-E08 014-E18` (`para-revisar.test.tsx:70-83`) pasa porque la API de mentira
  sigue devolviendo el cambio en la lista después del 409. El servidor real no hace eso. La prueba
  no comprueba el escenario.
- La mitad del escenario que tiene que ver con la seguridad sí se cumple: no se aplica dos veces
  (ver 2.4).

**1.2 · E08: una venta o un ajuste de un producto unido con otro o dado de baja se acepta igual.** Frena.
- Dónde: `microservices/api/src/ventas/reglas.ts:24-49` (`registrar`) y
  `microservices/api/src/deposito/reglas.ts:29-36` (`ajustar`). Los llama la repetición de
  `microservices/api/src/apartados/reglas.ts:63-73` (`repetir`).
- Spec (E08), con ese mismo ejemplo: «un producto que se unió con otro o se dio de baja → no se
  registra, la pantalla dice por qué y el cambio sigue apartado». El ADR-021 (punto 3) dice lo
  mismo: «si hoy no se puede aplicar (un producto unido con otro…) queda apartado con el motivo».
- Código: aceptar repite el pedido original y queda con lo que conteste esa ruta.
  - `POST /ventas` no mira si el producto está activo ni si se unió con otro: registra la venta
    y le descuenta el stock al producto absorbido.
  - `POST /stock/:id/ajustes` tampoco lo mira.
  - Solo `PATCH /productos/:id` contesta «no existe» con un producto inactivo.
  
  Entonces, en el ejemplo que da la spec, el cambio **se registra**.
- La prueba `014-E08 014-E19` (`apartados.test.ts:123-131`) solo prueba el caso del permiso que
  falta (E19), no un producto unido ni uno dado de baja.
- La API de mentira de las capturas (`tests/capturas/api-de-mentira/rutas-apartados.mjs:13-14`)
  inventa justo el mensaje del producto unido, que el servidor real nunca da. Por eso la
  comparación con la maqueta (T008) lo dio por bueno.
- Hay dos salidas, y elegir entre ellas es decidir una regla: o las rutas rechazan esos
  productos, o la spec y el ADR dejan de dar ese ejemplo y dicen qué pasa de verdad.

### Se pueden anotar como defecto

**1.3 · E14: la unitaria pasa siempre.** Defecto.
- Dónde: `apartados.test.ts:57-62`.
- La base simulada no tiene programada la consulta de `buscarSesion`, así que cualquier token
  da 401. La prueba no mira si el usuario está activo.
- Sí lo comprueba de verdad la e2e (`tests/e2e/*/19-para-revisar.spec.ts:65-66`: después de
  desactivar a Ana, `POST /ventas` con su token da 401). Solo prueba `/ventas`, no «cualquier
  otra cosa», aunque el código (`buscarSesion` filtra `revocada_en IS NULL` y `u.activo`) cubre
  todas las rutas que pasan por `exigirSesion`.

**1.4 · E06: ninguna prueba mira que baje el stock.** Defecto.
- La unitaria comprueba el `insert` de la venta con su id y su fecha, y el evento.
- La e2e usa un renglón sin producto (`19-para-revisar.spec.ts:68`), así que no hay stock que
  bajar.
- El código sí lo hace, porque usa la ruta de siempre.

**1.5 · E01 de punta a punta: el dispositivo no participa.** Defecto.
- La e2e sube a `/apartados` con `page.request`, sin usar la cola del dispositivo. Tampoco
  comprueba que el dispositivo vuelva a la entrada.
- La parte del dispositivo solo la prueba `cola.test.ts` («014-E01 014-E03»), con `fetch`
  simulado.

**1.6 · E16: no se prueba que el dispositivo mande de a 200.** Defecto.
- Del lado del servidor, más de 200 se rechaza y está probado.
- Del lado del dispositivo (`microservices/web/src/cola.ts`, `POR_PEDIDO = 200`) ninguna prueba
  sube más de 200 cambios.

**1.7 · E10: «no ocupa lugar» no lo pude comprobar.**
- Con la lista vacía, la pestaña sigue a la vista y muestra «No hay nada para revisar.»; la
  cantidad no aparece.
- La spec no dice qué quiere decir «no ocupa lugar», así que no puedo decir si se cumple.

**Lo demás:** E02, E03, E04, E05, E07, E09, E11, E12, E13, E15, E17 y E19 están hechos, cada uno
con una prueba que lo nombra y lo comprueba. Todos los escenarios E01 a E19 tienen al menos una
prueba que los nombra.

---

## 2. Seguridad (sección «Seguridad» del plan y ADR-021)

**2.1 · El token de una sesión cerrada solo sirve para subir lo apartado.** Cumple.
- `exigirSesion` usa `buscarSesion`, que exige sesión no revocada, no vencida y usuario activo.
- `POST /apartados` es la única ruta que usa `sesionDelToken`
  (`microservices/api/src/apartados/datos.ts:9-11`).
- Defecto: `sesionDelToken` no mira si la sesión venció (`expira_en`) ni la marca como usada.
  - El ADR (punto 1) dice que el dispositivo «lo usa una sola vez». El servidor no lo exige:
    un token robado de una persona desactivada sirve para siempre para apartar. El límite es
    de 30 pedidos por minuto, cada uno de hasta 200 cambios, y no hay tope total por sesión.
  - No se aplica nada sin que alguien lo acepte, que es lo que el plan da como límite. Conviene
    que el ADR lo diga.

**2.2 · Lo apartado no puede apuntar a rutas fuera de la lista.** Cumple.
- Dónde: `microservices/api/src/apartados/esquemas.ts:6-12, 25`.
- Cada tipo tiene sus métodos. La ruta se controla con una expresión anclada (`^…$`, sin el
  modificador `m`) que pide un UUID en cada parámetro, así que no entran `..`, ni `?`, ni
  barras de más.
- Un cambio malo rechaza el pedido entero (400). Está probado, con intento de `../` incluido.
- El cliente usa exactamente esos tipos y esas rutas (`venta.ts`, `catalogo.ts`, `inventario.ts`,
  `conteo.ts`).

**2.3 · `sesionInterna` no se puede inyectar desde la red.** Cumple, pero no hay prueba.
- `exigirSesion` (`microservices/api/src/autenticacion.ts:24-25`) la toma de `c.env`.
- El servidor arranca con `serve({ fetch: app.fetch })` (`src/index.ts:29`). `@hono/node-server`
  le pasa como entorno siempre `{ incoming, outgoing }` (`listener.js`, `fetchCallback(req,
  { incoming, outgoing })`), y ninguna cabecera, cuerpo ni dirección llena ese entorno.
- Solo `apartados/reglas.ts` (`repetir`) le pone `sesionInterna`.
- Defecto: ninguna prueba lo fija, por ejemplo un pedido que pase por `getRequestListener` con
  algo parecido en las cabeceras y que dé 401. Si algún día cambia la forma de arrancar el
  servidor, nada avisa.

**2.4 · Aceptar no se puede hacer dos veces.** Cumple en lo principal, con un defecto.
- `paraDecidir` bloquea la fila (`FOR UPDATE`) dentro de `enTransaccion`, y se rechaza lo que ya
  tiene decisión. Dos aceptaciones a la vez quedan en fila: la segunda ve la decisión y recibe
  409. La unitaria comprueba el `for update of "a"` y el 409 de lo ya decidido.
- Defecto: la repetición (`repetir`, `apartados/reglas.ts:38`) corre **fuera** de esa
  transacción, con su propia conexión, y se confirma antes de marcar el cambio como aceptado
  (`:43-44`). Si marcar la decisión o anotar el evento falla después de la repetición, el
  cambio queda aplicado y sigue pendiente, y otra aceptación lo repite.
  - Ventas: no se duplica (la ruta devuelve la que ya estaba, por su id).
  - Ajustes, renglones de conteo y cambios de producto: no se duplican, porque escriben un valor
    final y no una suma.
  - «No llevó» (`POST /consultas`): no lo comprobé. Podría quedar dos veces.
- Además, cada aceptación ocupa dos conexiones del pool a la vez. No lo probé con carga.

**2.5 · Al aceptar corren los permisos de quien lo hizo.** Cumple.
- `usuarioConPermisos` lee los roles de hoy: primero activo y, si no, desactivado
  (`apartados/reglas.ts:36`, `acceso/sesiones.ts`).
- La ruta repetida pasa por su `exigirPermiso` con esos permisos.
- Está probado en «014-E08 014-E19» (Ana sin permisos → 409 «No tenés permiso para esto…», no
  se registra, se guarda el motivo).

**2.6 · Ver, aceptar y descartar, solo con «Administrar usuarios».** Cumple.
- Las tres rutas tienen `exigirSesion` y `exigirPermiso("admin.usuarios")`.
- Está probado (E13).

**2.7 · Tamaño y límite de intentos.** Cumple.
- Hasta 200 cambios por pedido, 100 000 caracteres por cuerpo y 30 pedidos por minuto por
  dirección.
- Defecto previo, que no es de esta funcionalidad: `limitarIntentos` cuenta por
  `x-forwarded-for`, que el que llama puede cambiar si el proxy no la pisa. No lo pude
  comprobar en el despliegue.

**2.8 · Registro de quién decidió.** Cumple.
- Se anotan `apartado.aceptado` y `apartado.descartado` a nombre de quien decidió, con el id del
  cambio, de quién era, el tipo y la ruta.

---

## 3. Reglas inventadas (el código hace algo que ninguna regla escrita pide)

**3.1 · Si la fecha del dispositivo no se entiende, el cambio queda con la hora en que llegó.** Defecto.
- Dónde: `microservices/api/src/apartados/datos.ts:16`.
- No hay ninguna regla escrita que lo diga.
- El esquema acepta cualquier texto en `creado_en` (`esquemas.ts:20`).

**3.2 · Un cambio de más de 100 000 caracteres rechaza todo el pedido.** Defecto.
- Dónde: `esquemas.ts:14, 26`.
- El plan habla del «límite de cuerpo del servidor», no de un tope por cambio.

**3.3 · Con un 400, el dispositivo deja de intentar y olvida el token.** Defecto.
- Dónde: `microservices/web/src/cola.ts:73-75`.
- El plan (línea 35) habla de 409 y 401, no de 400.
- Con un 400, el resto de los lotes no se manda y el token se borra. A una persona desactivada,
  esos cambios le quedan en el dispositivo para siempre, porque no puede volver a entrar. Eso
  va contra SC-01.

**3.4 · Cuando cierran una sesión y después desactivan a la persona, lo que quedó no sube.** Defecto.
- Si a una persona activa le cierran la sesión a distancia (409) y la desactivan antes de que
  vuelva a entrar, el token ya se olvidó y no se vuelve a intentar.
- Pasa lo mismo si se cierran dos sesiones seguidas antes de que suba lo de la primera: hay un
  solo lugar, `ferre.para-apartar` (`cola.ts:82`).
- Ninguna regla dice qué pasa en estos casos. Hoy esos cambios quedan en el dispositivo sin
  salida.

**3.5 · Los cambios viejos sin autor no se apartan.** Defecto.
- Dónde: `plataforma/sin-conexion/cola.ts:144`.
- `deAutor` solo trae los que tienen `autor`. Los guardados antes de que existiera ese dato
  siguen saliendo con cualquier sesión.
- La regla es razonable, pero no está escrita en 014.

**3.6 · «desactivada el …» siempre en femenino, con la fecha en que se cerró esa sesión.** Defecto.
- Dónde: `ParaRevisar.tsx:27` y `apartados/datos.ts:31` (`s.revocada_en as desactivado_en`).
- Para un hombre dice «desactivada».
- Si la sesión se cerró antes por otra razón, por ejemplo a distancia, la fecha no es la de la
  desactivación. El plan dice «cuándo se cerró su sesión», pero la pantalla lo presenta como
  «desactivada».

---

## 4. Documentación que quedó atrás

**4.1 · `proyecto/estado.yml`: RF-102 a RF-105 siguen «en construcción».** Defecto.
- Todos tienen `pruebas: []`, aunque el código está en `master` con sus pruebas.

**4.2 · `specs/007-usuarios-y-acceso/spec.md:342` quedó desactualizado.** Defecto.
- Sigue diciendo que cómo se aparta y se revisa es «una funcionalidad aparte, todavía sin
  especificar».
- Además, la tabla de permisos de 007 (línea 374) no dice que «Administrar usuarios» ahora abre
  Anomalías → Para revisar.

**4.3 · No hay contrato de las rutas `/apartados`.** Defecto.
- 014 no tiene `contracts/api.md`, y `specs/007-usuarios-y-acceso/contracts/api.md` no las
  lista en su tabla de permisos.
- Para reconstruir la forma de la respuesta (`CambioApartado`, con `producto`, `error` y
  `desactivado_en`) hay que leer el código.
- `tests/capturas/README.md` pide que la API de mentira siga el `contracts/api.md`.

**4.4 · El plan dice que la descripción se arma en el servidor.** Defecto.
- Dónde: `plan.md:23-24`.
- El servidor manda el cuerpo crudo y el nombre del producto, y quien lo cuenta «con las
  palabras del negocio» es el cliente (`microservices/web/src/negocio/apartados.ts`, `describir`).

**4.5 · Lo que Carlos aclaró no está como decisión numerada.** Defecto.
- Se aclaró que lo revisa quien tiene «Administrar usuarios», que se revisa en Anomalías, y que
  hay dos pestañas, primero «Para revisar» y con la cantidad a la derecha.
- Está solo en las «Clarifications» de la spec. `docs/decisiones-de-negocio.md` llega hasta la
  97, que dice «un Administrador», y no tiene una entrada para esto, como pide CLAUDE.md.

**4.6 · RF-59 (005) dice que Anomalías es «una pantalla propia» y no cambió.** Defecto.
- Hoy esas anomalías están en la pestaña «Anotadas» y la opción de Más se ve también con
  «Administrar usuarios».

**4.7 · Hay números y reglas del dispositivo que solo están en el código.** Defecto.
- Son el tope de 100 000 caracteres por cambio, los 30 intentos por minuto, que con 5xx o 429 se
  vuelve a intentar, y que con 400 el token se olvida.

**4.8 · Las capturas no tienen la dirección nueva en su tabla.** Defecto menor.
- `tests/capturas/README.md` no incluye `para-revisar` / `mas/para-revisar` en «Direcciones de
  la aplicación».

**4.9 · `specs/` no nombra archivos de código.** Cumple: lo comprobé leyendo y con
`node tests/trazabilidad.mjs`.

---

## 5. Pantallas (maquetas `para-revisar-c-*`, aprobadas)

Comparé las maquetas con las capturas que saqué con la API de mentira (en
`tests/capturas/salida/rev-compu-compu.png` y `rev-celu-celu.png`, que no se suben al
repositorio). La tarea T008 dice «iguales», pero no lo son del todo:

**5.1 · El ajuste de stock dice otra cosa.** Defecto.
- Maqueta: «De 2,5 a 6 L · «conté la estantería»» y abajo «El 17/10 a las 08:52 · llegó…».
- Código: «Hay 6 · «conté la estantería»» (sin el valor anterior ni la unidad) y «Hecho el 17/10
  a las …» (`negocio/apartados.ts:72`).
- Pasa en las dos interfaces.

**5.2 · En la computadora, las pestañas no están donde dice la maqueta.** Defecto.
- En la maqueta empiezan alineadas con el texto, más o menos en x=337. En la captura, en x=220,
  a la izquierda de la columna del contenido.
- Puede ser el lugar común de las pestañas de Más (Usuarios, Cómo va el negocio). No lo comparé
  con esas pantallas.

**5.3 · El mensaje de error de la maqueta no lo puede dar el servidor real.** Defecto.
- La maqueta (y la API de mentira) muestran «… se unió con … Si querés, descartala y cargá la
  venta de nuevo». El servidor real no produce ese mensaje (ver 1.2).

**5.4 · En el celular, las pestañas miden 34 px de alto.** Defecto menor.
- La herramienta de capturas avisa que son objetivos táctiles de menos de 44 px.
- La maqueta tiene la misma altura y es el estilo de los segmentos de siempre, así que no es una
  diferencia con la maqueta.

**5.5 · Las dos interfaces son coherentes.**
- Comparten la misma pantalla `ParaRevisar` y la definición de las pestañas, sus permisos y su
  orden.
- La cantidad va a la derecha en las dos, y con un solo permiso no se ven las pestañas en
  ninguna de las dos.
- Un detalle: el texto de la bajada está fijo en la pantalla y no en `textos.ts`, con el mismo
  texto largo en el celular. Es como en la Anomalías de antes, pero no sigue la decisión 47
  (largo en la computadora, resumido en el celular).

---

## Resumen

| # | Punto | Gravedad |
|---|---|---|
| 1.1 | E18: el «ya se decidió» no se ve; la prueba usa una lista que el servidor no devuelve | Frena |
| 1.2 | E08: una venta o un ajuste de un producto unido o dado de baja se acepta igual; la prueba prueba otra cosa | Frena |
| 2.4 | La repetición se confirma fuera de la transacción que decide | Defecto |
| 2.1 | El token de una sesión cerrada no vence ni se usa una sola vez | Defecto |
| 2.3 | Ninguna prueba fija que `sesionInterna` no entra desde la red | Defecto |
| 3.3, 3.4 | Casos en que lo de una persona desactivada queda en el dispositivo sin salida | Defecto |
| 4.1–4.6 | `estado.yml`, 007, contrato, plan, decisiones y RF-59 desactualizados | Defecto |
| 5.1–5.3 | El texto del ajuste, la posición de las pestañas y el mensaje inventado de la maqueta | Defecto |
| 1.3–1.6 | Pruebas de E14, E06, E01 y E16 más débiles de lo que nombran | Defecto |

## Qué se hizo con cada punto (2026-10-17)

**Frenaban el cierre**
- **E18, «ya se decidió» no se veía.** Arreglado: si aceptar o descartar falla, la lista no se
  vuelve a pedir y la tarjeta queda con el motivo. La prueba ahora imita al servidor real (el
  cambio ya no está en la lista después del 409) y comprueba que el motivo sigue a la vista.
- **E08, un producto unido o dado de baja se aceptaba igual.** Arreglado sin cambiar las rutas de
  siempre (una venta sin conexión de un producto unido mientras tanto sigue registrándose, como
  hasta ahora): antes de repetir el pedido, aceptar mira si algún producto del cambio (de la ruta
  o de los renglones) se unió con otro o se dio de baja, y en ese caso no lo aplica y dice con cuál
  se unió. Prueba nueva «014-E08»; la del permiso quedó como «014-E19». Coincide con lo que ya
  decían la spec y el ADR.

**Seguridad**
- **El token de una sesión cerrada servía para siempre.** Ahora sirve hasta 30 días después de
  cerrada (o vencida) la sesión. Escrito en la spec (casos de borde), el ADR y el contrato; con
  prueba.
- **La repetición se confirma fuera de la transacción de la decisión.** Queda así; escrito en las
  consecuencias del ADR, con el riesgo («no llevó» repetido si marcar la decisión fallara justo
  después).
- **Ninguna prueba fija que `sesionInterna` no venga de la red.** Queda anotado; depende de cómo
  arranca el servidor (`@hono/node-server`), no de esta funcionalidad.

**Reglas que no estaban escritas** (fecha que no se entiende, tope de tamaño, qué pasa con un 400
o con una persona activa, la fecha que se muestra): escritas en los casos de borde de la spec.
«Desactivada el…» pasó a «sesión cerrada el…», que es lo que se muestra y no depende del género.

**Documentación**
- `proyecto/estado.yml`: RF-102 a RF-105 hechos, con sus pruebas.
- 007 apunta a 014 en vez de «todavía sin especificar»; RF-59 (005) dice que las anomalías están
  en la pestaña «Anotadas».
- Contrato nuevo: `contracts/api.md`.
- El plan dice que la descripción la arma el cliente.
- Lo que aclaró Carlos quedó como decisión 101.

**Pantallas**
- «Hecho el…» pasó a «El…», como en la maqueta.
- El ajuste de stock dice «Hay 6» y no «De 2,5 a 6 L»: el cambio guardado en el dispositivo solo
  trae lo que se contó, no cuánto había. Se le dice a Carlos.
- Las pestañas de la computadora están en el lugar común de las pestañas de Más (las de Usuarios y
  Cómo va el negocio, en x=220): es el sistema de submenú que pidió Carlos.

**Pruebas**
- E06 de punta a punta ahora comprueba que el stock baja (de 10 a 8).
- Quedan como están: la unitaria de E14 (la e2e lo comprueba), la e2e de E01 sin la cola real (la
  unitaria de la cola cubre la subida) y el envío de a 200 desde el dispositivo, sin prueba propia.
