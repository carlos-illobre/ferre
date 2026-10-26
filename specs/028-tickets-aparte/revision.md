# Revisión: Tickets en su propio servicio (028)

Revisor independiente (paso 7), 2026-10-26. Leí `spec.md`, `plan.md` y `tasks.md` (no hay `ux.md` ni
maquetas: la funcionalidad no tiene pantallas) y los commits 1cdb632, 4c47291 y c5c784d, comparando
el servicio nuevo con lo que tenía Comercial (`1cdb632^`). No volví a correr las e2e ni las
integraciones: tomo los resultados que me pasaron (utest e itest pasan; e2e 77 + 4, 1 falla ajena).
Corrí `node tests/trazabilidad.mjs`: pasa.

**Resumen:** no encontré nada que frene el cierre. Hay diferencias chicas con las respuestas de
Comercial en casos de error que la web no provoca, dos reglas nuevas sin documentar, una prueba que
pasa sin comprobar lo que dice y documentación que quedó atrás.

## 1. Escenarios

- **E01. Cumplido.** Las validaciones y los mensajes son los mismos de Comercial, texto por texto
  (`microservices/tickets/src/reglas.ts:15-26`, comparado con `comercial/src/tickets/reglas.ts:19-30`
  anterior). Un repetido no se guarda dos veces (`ON CONFLICT DO NOTHING`, `persistencia/tickets.ts:29-32`).
  Lo prueban `rutas.test.ts:36-74` (los siete rechazos con su código y su mensaje, y el reenvío) y
  `tests/integration/tickets.sh:33-37`. Hay diferencias de respuesta en casos de error: puntos 3.1 a 3.4.
- **E02. Cumplido.** Misma forma de respuesta (`contratos/tickets.ts` idéntico), los últimos 200 del
  más nuevo al más viejo, con los nombres guardados en el momento (`persistencia/tickets.ts:19-25`).
  Lo prueban `rutas.test.ts:42-45`, `persistencia/tickets.test.ts:127-139`, `tickets.sh:41` y la e2e 14.
- **E03. Cumplido.** Resolver con nota (recortada a 2.000) y reabrir (borra nota y quién resolvió),
  con los mismos 204 y 409 y los mismos mensajes (`rutas.ts:50-60`, `persistencia/tickets.ts:43-58`).
  Lo prueban `rutas.test.ts:76-91`, `persistencia/tickets.test.ts:141-152` y `tickets.sh:47-49`.
  Diferencias en casos de error: puntos 3.2 y 3.3.
- **E04. Cumplido.** La foto la sirve Tickets, con `Content-Type` y `Cache-Control: private` como
  antes (`rutas.ts:62-66`). Lo prueban `rutas.test.ts:46-48` y `tickets.sh:43-44` (con sesión 200, sin
  sesión 401). Sobre la prueba de rutas a otras carpetas, ver 2.2.
- **E05. Cumplido.** Los tres eventos van por el kit, con título, grupo «Mejoras y errores», quién
  y su nombre, referencia al ticket y detalle (`reglas.ts:29-59`). Lo prueban `rutas.test.ts:51,73,84,90`
  y `tickets.sh:50-51`, que espera a que lleguen a la base de Auditoría con `servicio = tickets`. El
  texto del detalle es nuevo y no está escrito en ningún lado: ver 3.6 y 4.1.
- **E06. Cumplido, con una parte sin prueba propia.** Con Tickets caído la puerta corta la conexión
  (`Caddyfile:104-108`, `abort` para todo lo que no es Procesos ni Auditoría) y `tickets.sh:58-64`
  comprueba el corte (curl 52/56), que lo que llega al navegador no lleva CORS y que Comercial sigue
  atendiendo. Que la web, ante una falla de red, deje el ticket «por enviar» en el dispositivo ya lo
  prueba `pantallas/Tickets.test.tsx:75` (no cambió). Que **la puerta arranque sin Tickets** está
  hecho (Tickets no está en el `depends_on` de la puerta, `docker-compose.yml:48-53`, y Caddy resuelve
  `tickets:8096` al pedir, no al arrancar), pero **no tiene prueba propia**: `auditoria.sh:75-78`
  recrea la puerta sin Auditoría con Tickets levantado. Lo doy por bueno por el mismo mecanismo, no
  porque lo haya visto arrancar. **Se puede anotar como defecto.**
- **E07. Cumplido.** Sin el token, 401 «Tickets solo atiende a la puerta»; sin persona, 401 «Hay que
  iniciar sesión» (`rutas.ts:29-35`); `/health` sin token. Comparación por bytes con `timingSafeEqual`.
  Lo prueban `rutas.test.ts:93-101` y `tickets.sh:54-55` (desde la red interna sin token, y que no
  publica puertos).
- **E08. Cumplido.** En `microservices/comercial/src` no quedan rutas, reglas, datos, contratos,
  palabras ni tablas de tickets (lo busqué: solo aparecen `ticket` de Google, `comprobante_tipo:
  "ticket"` de compras y la prueba nueva). La migración `0033_tickets_a_su_servicio.sql` borra tablas
  y tipos. Lo prueban `rutas/roles.test.ts:121-125` (404 en Comercial) y `tickets.sh:36` (sin tablas
  `ticket%` en la base del mostrador; los tipos borrados no se comprueban). Quedan, como es lógico,
  las migraciones viejas `0012_tickets.sql` y `0031` que los crearon.
- **Caso borde (nombres del momento). Cumplido:** `usuario_nombre` y `resuelto_por_nombre` en la
  tabla, sin consultar a otro servicio.
- **SC-001. Cumplido:** en la web solo cambió de dónde se toman los tipos (`@tickets/*`).

## 2. Seguridad

- **2.1 Cabeceras de identidad y token. Hecho como dice.** La puerta borra `X-Usuario-Id`,
  `X-Usuario-Nombre`, `X-Permisos` y `X-Token-Servicio` del navegador (`Caddyfile:17-20`), pregunta a
  Comercial con `forward_auth` (`Caddyfile:73-86`) y agrega el token. Tickets exige token y persona en
  todo menos `/health`.
- **2.2 Fotos solo con sesión y sin rutas a otras carpetas. Hecho; la prueba de rutas no comprueba
  nada.** `/tickets/*` entero pasa por `forward_auth` (`tickets.sh:44` lo prueba: 401 sin sesión), y
  el nombre se valida con `^[0-9a-f-]{36}\.(jpg|png|webp)$` antes de leer (`reglas.ts:64`). Pero
  `rutas.test.ts:49` pide `/tickets/fotos/../../etc/passwd`: el URL se normaliza a `/etc/passwd`
  antes de llegar a Hono, no entra a la ruta de fotos y da 404 aunque se borrara la validación. Para
  comprobarlo hay que mandar los puntos y la barra codificados (`..%2F..%2Fetc%2Fpasswd`) o un nombre
  que no cumple el patrón. **Se puede anotar como defecto** (la validación está bien; la prueba no la
  cubre).
- **2.3 Tope de tamaño. Hecho, con dos cosas para anotar.** La puerta corta a 60 MB
  (`Caddyfile:80-82`) y el servicio a 55 MiB (`rutas.ts:40`). El tope del servicio y su mensaje no
  están en el plan: ver 3.5. Además, **no pude comprobar** qué recibe el navegador cuando corta la
  puerta: el 413 de `request_body` no entra en `handle_errors 502 503 504`, y no sé si sale con la
  cabecera CORS. Si sale sin ella, la web lo toma como falta de red y el ticket se reintenta para
  siempre, frenando la cola de tickets por enviar (`negocio/tickets/tickets.ts:43-46,56`). Con las
  fotos achicadas a 1.600 px que manda la web no se llega a 60 MB, así que no es un camino real hoy.
  **Se puede anotar como defecto** (sin verificar).
- **2.4 Lo que entra de afuera. Hecho:** las validaciones de siempre, y todo va a la base como
  parámetro (plantillas `sql` de Kysely, `persistencia/tickets.ts`).
- **2.5 Secretos. Hecho:** `CLAVE_BASE_TICKETS` en `.env.example`, en los dos `.env.oracle`, en `db` y
  en `tickets` (`docker-compose.yml`), en `ORACLE.md` y en `DEPLOYMENT.md`. `base-propia.sh:24`
  comprueba que el usuario de Tickets no abre la base del mostrador (no al revés: del mostrador a
  Tickets no se comprueba).
- **2.6 Quién hizo qué. Hecho:** cada acción anota su evento con `quien.id` y `quien.nombre` del
  momento, **en la transacción de la acción** (`persistencia/tickets.ts:39,47,56`, `auditoria(trx, …)`),
  y solo si la acción cambió algo. Que el evento no quede si la transacción falla lo garantiza el kit
  (`auditoria-kit/src/bandeja.test.ts:51-62`); en Tickets no hay prueba de una acción que falla a mitad.
- **2.7 Exposición. Hecho:** el servicio `tickets` no tiene `ports` y `tickets.sh:55` lo comprueba.

## 3. Reglas inventadas o diferencias con Comercial

- **3.1 Un error interno no responde lo mismo.** `rutas.ts:25-68` no tiene `app.onError`. Ante un
  error inesperado (la base caída, el disco lleno) Tickets responde el 500 de Hono en texto («Internal
  Server Error»), y Comercial respondía `{"error":"Algo falló en el servidor. Probá de nuevo; si sigue,
  avisale al dueño."}` (`comercial/src/app.ts:83-86`). La web muestra `cuerpo.error` o, si no hay,
  «Error 500» (`plataforma/servidor/cliente.ts:31-32`): en la lista de tickets y al mandar con el
  guardado deshabilitado, la persona ve «Error 500» en lugar del mensaje de antes. El plan dice «las
  mismas validaciones y mensajes». Procesos sí tiene su `onError`. **Se puede anotar como defecto**;
  es una línea y conviene hacerlo.
- **3.2 Resolver con un cuerpo que no es JSON.** Comercial tomaba un cuerpo que no es JSON como vacío
  (`validar.ts`, `leerCuerpo`) y resolvía sin nota (204). Tickets responde 400 «La nota es un texto»
  (`rutas.ts:51-52`), y la prueba lo fija como correcto (`rutas.test.ts:81`). También difieren los
  bordes del esquema de Zod: un arreglo `[]` antes era rechazado y ahora resuelve; un texto JSON suelto
  antes daba el mensaje genérico de Zod y ahora «La nota es un texto». La web siempre manda
  `{ nota }`, así que no se nota. **Se puede anotar como defecto.**
- **3.3 Un id que no es uuid al resolver o reabrir.** Comercial lo mandaba a la base, que fallaba con
  un 500; Tickets responde 409 «Ese ticket no existe…» (`reglas.ts:54,59`, prueba en
  `rutas.test.ts:88-89`). Es mejor que antes, pero no lo pide ninguna regla. **Anotar.**
- **3.4 Un formulario que no se puede leer.** Comercial respondía 500; Tickets lo toma como vacío y
  responde 400 «Falta el identificador del ticket» (`rutas.ts:41`). Sin regla que lo pida. **Anotar.**
- **3.5 Tope propio del servicio, con un mensaje que puede no ser cierto.** `rutas.ts:40` corta el
  alta a 55 MiB con «Una foto pesa más de 10 MB» (413). El plan solo nombra el tope de la puerta. Un
  pedido de, por ejemplo, seis fotos de 9,9 MB (pasa la puerta, que corta a 60.000.000 bytes, y no el
  servicio) recibe ese mensaje, cuando Comercial habría dicho «Son hasta 5 fotos por ticket». Desde la
  web no pasa. **Se puede anotar como defecto** (documentar el tope y decir algo cierto, por ejemplo
  que el pedido es demasiado grande).
- **3.6 El detalle de los eventos es nuevo.** En Comercial los eventos de tickets no tenían detalle
  (no figuraban en `DETALLES` de `en-palabras.ts`). Ahora el alta dice «Mejora · 1 foto» / «Error · 2
  fotos» y la resolución lleva la nota (cortada a 300) (`reglas.ts:46,56`). E05 pide «su título y su
  detalle», así que tiene que haber uno, pero qué dice no está escrito en ningún lado (ver 4.1).
  También: la nota de la resolución ahora queda en Auditoría, a la vista de quien ve «Quién hizo qué».
  **Anotar.**
- **3.7 Sin nombre, se usa el id.** `rutas.ts:19`: si la puerta no manda `X-Usuario-Nombre`, el ticket
  se guarda a nombre del id; si lo manda mal codificado, 401 (`rutas.test.ts:98-99`). Es lo mismo que
  hace Procesos; no está en la documentación de 028. Un 401 de Tickets hace que la web cierre la sesión
  (`cliente.ts:77`), así que una puerta mal configurada saca a la gente de la aplicación. **Anotar.**

## 4. Documentación que quedó atrás

- **4.1** Los títulos y los detalles de `ticket.creado`, `ticket.resuelto` y `ticket.reabierto`
  (`reglas.ts:46-59`) solo están en el código: otro agente no reconstruiría «Pedido de mejora o
  error», «Mejora · 1 foto» ni que la nota va de detalle. Conviene escribirlos en el plan de 028 o en
  la `spec.md` de 008. **Se puede anotar como defecto.**
- **4.2** Los topes del alta (de 3 a 5.000 letras, nota de hasta 2.000, dispositivo y versión de hasta
  80, últimos 200, tope del cuerpo de 55 MiB) no están en `specs/008-mejoras-y-errores/spec.md`; el
  plan de 028 nombra solo algunos (fotos, tipos, 10 MB, 200, 60 MB en la puerta). Lo de antes ya
  faltaba; lo del tope de 55 MiB es nuevo. **Anotar.**
- **4.3** `specs/001-base-del-sistema/quickstart.md`, «Verificaciones guardadas como integración» y
  «Unitarias», no nombra `tickets.sh` ni las pruebas de `microservices/tickets` (tampoco las de
  Auditoría, que ya faltaban). `tests/integration/health.sh` no mira `/health` de Tickets (ni de
  Auditoría), aunque el quickstart dice «cada servicio». **Anotar.**
- **4.4** `docs/adr/ADR-026-una-base-por-servicio-en-la-maquina.md:40-41` sigue diciendo «Bases de hoy:
  `mostrador` y `procesos`. Las de Tickets… nacen cuando se separen». Ya venía atrás desde 027. **Anotar.**
- **4.5** `proyecto/tasks.md:288` (T155, etapa 4) sigue sin marcar. Corresponde marcarla al cerrar,
  junto con T008. **Anotar.**
- `proyecto/estado.yml` (RF-80, RF-81, RNF-75), `DEPLOYMENT.md` (borrar a mano las fotos viejas de
  Comercial) y `ORACLE.md` sí están al día.

## 5. Pantallas

No hay maquetas: la funcionalidad no cambia pantallas, y la web solo cambió de dónde toma los tipos.

## Lo que no pude comprobar

- Qué recibe el navegador cuando la puerta corta un pedido por los 60 MB (2.3).
- Que la puerta arranque con Tickets apagado: lo deduzco del compose y de cómo Caddy resuelve, sin
  prueba (E06).
- No volví a correr e2e ni integraciones; me baso en los resultados que me pasaron.

---

## Qué se hizo con cada punto (2026-10-26)

| Punto | Qué se hizo |
|---|---|
| Error interno sin palabras | Tickets responde el 500 con las mismas palabras que Comercial. Con prueba |
| Resolver con cuerpo que no es JSON | Resuelve sin nota, como antes (204). Con prueba |
| Prueba de rutas a otras carpetas | Ahora manda `..%2F` codificado, que llega tal cual y lo frena la validación del nombre |
| Tope del servicio y su mensaje | Queda en 55 MB con «El ticket pesa demasiado: son hasta 5 fotos de 10 MB»; escrito en el plan |
| 413 de la puerta con o sin CORS | Queda así: la web achica las fotos antes de mandarlas, así que no llega a ese tope |
| La puerta arranca sin Tickets | Sin prueba propia; es la misma configuración que con Auditoría, que sí la tiene (`auditoria.sh`) |
| 409 y 400 nuevos | Escritos en el plan como diferencias que la web no ve |
| Palabras de los eventos | Escritas en el plan |
| `health.sh` | Mira también la salud de Auditoría y de Tickets |
| ADR-026 | Enmienda con las bases de Auditoría y Tickets |
| Topes del alta en la spec de 008 y el quickstart | Quedan como están: los topes ya regían antes (RF-80) y el quickstart nombra `tests/itest.sh`, que corre todo `tests/integration/` |
| T155 | Se marca al subir |
