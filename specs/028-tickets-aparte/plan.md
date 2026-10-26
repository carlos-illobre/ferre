# Plan: Tickets en su propio servicio (028)

## Contexto técnico (cómo está hoy, después de 027)

- Comercial atiende `/tickets` (listar los últimos 200, crear con fotos, resolver con nota,
  reabrir y servir cada foto), con sesión y sin otro permiso. Guarda `ticket` y `ticket_foto` en su
  base `mostrador` y las fotos en su carpeta de archivos (`tickets/`). Sus eventos van a Auditoría
  con las palabras de Comercial (grupo «Mejoras y errores»).
- La lista muestra el nombre de quien lo cargó y de quien lo resolvió, leído de la tabla de
  usuarios de Comercial.
- La web manda el ticket como formulario con fotos; si no llega al servidor (sin conexión), lo
  guarda en el dispositivo y lo vuelve a mandar después, con el mismo id.
- La puerta (026) reparte por ruta y a los servicios que no saben de sesiones les pregunta a
  Comercial quién es la persona; las bases nuevas aparecen solas con su `CLAVE_BASE_<SERVICIO>`
  (027).

## Decisiones

**Un servicio como Auditoría** (`microservices/tickets`, Node con Hono, puerto 8096): su base
`tickets` (esquema `tickets`), su capa de datos al 100 % contra PostgreSQL, su carpeta de fotos
en un volumen propio (`tickets-fotos`), y sus eventos por el kit de auditoría.

- **Las mismas rutas y respuestas** que tenía Comercial (`GET /tickets`, `POST /tickets`,
  `POST /tickets/:id/resolver`, `POST /tickets/:id/reabrir`, `GET /tickets/fotos/:nombre`), con las
  mismas validaciones y mensajes: la web no cambia (SC-001). El contrato de respuesta
  (`contratos/tickets.ts`) pasa al servicio; la web lo toma de ahí (`@tickets/*`).
- **Quién es la persona** lo dice la puerta (`X-Usuario-Id`, `X-Usuario-Nombre`), como en Procesos
  y Auditoría. Tickets exige el token entre servicios en todo menos `/health` (E07) y una persona
  en cada pedido.
- **El nombre del momento** se guarda con el ticket (`usuario_nombre`, `resuelto_por_nombre`):
  Tickets no consulta a otro servicio.
- **Los eventos** (`ticket.creado`, `ticket.resuelto`, `ticket.reabierto`) van por el kit, en la
  transacción de cada acción, con sus palabras en las reglas de Tickets (grupo «Mejoras y
  errores»): «Pedido de mejora o error» con el detalle «Error · 2 fotos» (o «Mejora»), «… resuelto»
  con la nota de la resolución como detalle, y «… reabierto» sin detalle. La descripción no va
  en el evento. Sale de Comercial lo de tickets en `en-palabras.ts`.
- **Diferencias con Comercial que la web no ve:** un id que no es uuid al resolver o reabrir da
  409 (antes, un error interno); un formulario que no se puede leer da 400. Un error inesperado se
  dice con las mismas palabras que Comercial. Resolver con un cuerpo que no es JSON resuelve sin
  nota, como antes.
- **Las fotos** se guardan en el disco antes de confirmar la transacción del ticket; si la
  transacción falla, quedan sueltas sin que nadie las nombre (como hoy).
- **Arranca vacío** (Carlos): Comercial borra `ticket` y `ticket_foto` y sus tipos; las fotos
  viejas de la carpeta de Comercial se borran a mano en la máquina (no hay SQL para eso).

**La puerta** reparte `/tickets` y `/tickets/*` a Tickets, preguntando quién es, con un tope de
60 MB por pedido (5 fotos de hasta 10 MB y el texto); el servicio, además, corta a los 55 MB con
«El ticket pesa demasiado: son hasta 5 fotos de 10 MB». Si Tickets no responde, la puerta corta la
conexión, como con Comercial: la web lo toma como sin conexión y guarda el ticket para mandarlo
después (E06).

**Compose y CI:** servicio `tickets` sin puertos, `CLAVE_BASE_TICKETS` en el `.env` (y en `db`),
`AUDITORIA_URL` como los demás, la imagen en la CI y en `imagenes-nube.sh`.

## Pruebas

- Tickets: la capa de datos al 100 % (alta sin repetir, lista con fotos y nombres, resolver,
  reabrir, fotos en el disco), las reglas y las rutas (validaciones, token, persona, eventos con
  sus palabras).
- Comercial: sin rutas, reglas, datos ni tablas de tickets (E08: la migración y una prueba de que
  `/tickets` ya no existe en Comercial).
- Integración (`tests/integration/tickets.sh`, con el stack): cargar con foto, ver, resolver y
  reabrir por la puerta; la foto la sirve Tickets; el ticket está en la base de Tickets y no en la
  de Comercial; sin token, rechazado; con Tickets parado, la puerta corta la conexión.
- e2e: la de tickets de siempre, leyendo su base.

## Seguridad

- **Datos que toca:** texto y capturas de pantalla que pueden mostrar datos del negocio. Las fotos
  se sirven solo con sesión (por la puerta) y con nombre al azar validado (sin rutas a otras
  carpetas).
- **Permisos:** como hoy, cualquier persona con sesión; quién es lo pone la puerta, que borra las
  cabeceras de identidad del navegador (026).
- **Lo que entra de afuera:** el formulario se valida como hoy (tipo, largo, hasta 5 fotos jpeg,
  png o webp de hasta 10 MB); la puerta corta a los 60 MB; todo va a la base como parámetro.
- **Secretos:** `CLAVE_BASE_TICKETS` nueva en el `.env`; el token entre servicios ya existe.
- **Quién hizo qué:** cada acción va a Auditoría con quién y su nombre en ese momento.
- **Exposición:** Tickets no publica puertos; rechaza pedidos sin el token aunque alguien llegue a
  la red interna.
