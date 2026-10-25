# Revisión independiente: 026, la puerta del servidor y el servicio Comercial (T009)

Revisor: subagente `revisor`, 2026-10-25. Revisé `spec.md`, `plan.md` (sobre todo «Seguridad»),
`tasks.md` y ADR-031, y el código y las pruebas de los commits locales `b816b98..HEAD`
(`ca0b99a` 026-T003, `8df7a4d` 026-T004 a T006), todavía no subidos. No hay maquetas: no lleva
pantallas. No revisé `specs/027` (sin programar).

**Qué corrí:**

- Las unitarias de `microservices/comercial` (proyecto `unitarias`: 34 archivos, 242 pruebas) y
  de `microservices/procesos/servidor` (proyecto `unitarias`: 2 archivos, 27 pruebas). Pasan
  todas.
- `pnpm -r --no-bail typecheck`: **falla en `microservices/procesos/servidor`** (hallazgo 1.1).
  Los otros seis paquetes dan bien.
- `node tests/trazabilidad.mjs` y `node tests/compuerta.mjs revisar`: dan bien.
- La configuración de la puerta, sin levantar nada. Saqué el binario de Caddy de la imagen
  `caddy:2-alpine` que ya estaba en la máquina (`docker save`, sin crear contenedores). Es la
  v2.11.7. Con ese binario corrí `caddy adapt` sobre el `Caddyfile` para ver en qué orden quedan
  las directivas.

**No corrí** (se pidió no correrlos): `tests/utest.sh` (la capa de datos contra la base, con la
cobertura del 100 %), `tests/itest.sh`, `tests/integration/puerta.sh` ni las e2e. De
`puerta.sh` y el resto de `itest.sh` tomo lo que dijo quien me pidió la revisión: 24
verificaciones bien. **No comprobé:** la prueba de persistencia nueva de Procesos ni su
cobertura, el resultado de las e2e, ni cómo se comporta el reverse proxy de la máquina de
Oracle (qué manda en `X-Forwarded-For` y qué devolvía antes cuando el servidor no respondía).

Gravedad: **Frena el cierre**, o **Defecto** (se puede anotar en `proyecto/estado.yml` y
seguir).

---

## 1. Escenarios sin cumplir o sin una prueba que los compruebe

### 1.1 El control de tipos falla en la prueba nueva de Procesos — Frena el cierre

- **Dónde:** `microservices/procesos/servidor/src/persistencia/procesos.test.ts:57` (la prueba de
  026-E10 y E12).
- **Qué pasa:** `base.selectFrom("procesos.evento")` no compila. Da `TS2345: Argument of type
  '"procesos.evento"' is not assignable to parameter of type 'TableExpressionOrList<DB, never>'`
  y `TS2349`. En `tablas.ts` la tabla se llama `evento`, sin el esquema adelante. Vitest no
  controla tipos, así que la prueba igual corre. Pero `pnpm typecheck` corta el CI y es una de
  las compuertas de antes de subir.
- `tests/revisar-al-editar.mjs` solo controla `comercial` y `web`, así que el control de cada
  edición no lo vio.

### 1.2 Con Comercial caído, la web ya no lo toma como «sin conexión» — Frena el cierre

- **Dónde:** `microservices/puerta/Caddyfile:58-63` (`handle_errors 502 503 504`), contra
  `microservices/web/src/plataforma/servidor/cliente.ts:12` (`esFaltaDeRed`) y
  `microservices/web/src/negocio/catalogo/lo-bajado.ts:51` (`oLoBajado`).
- **Qué dice la spec** (caso borde «Comercial sin responder»): «la puerta contesta que el servidor
  no responde; la web lo trata como hoy, como sin conexión».
- **Qué hace el código:** si falla cualquier servicio, también Comercial, la puerta contesta 502
  con `Access-Control-Allow-Origin` y un JSON. El navegador puede leer esa respuesta, así que la
  web recibe un `ErrorDelServidor(502)` y no un `TypeError`. Para la web, solo un `TypeError` es
  falta de red. Antes, Comercial ponía el CORS de su propia respuesta. Con Comercial caído, el
  502 lo daba el proxy y no traía `Access-Control-Allow-Origin`. El navegador lo rechazaba como
  un error de red y la web lo trataba como sin conexión (deduzco el comportamiento de antes a
  partir del código. No pude ver qué devuelve el proxy de la máquina).
- **Qué cambia:** la búsqueda del catálogo ya no usa la copia bajada al dispositivo (`oLoBajado`).
  Muestra «Esa parte del sistema no responde ahora». Lo mismo en `inventario.ts` y `ajustes.ts`.
  Además, `alContestar` hace que el indicador de conexión diga «contestó». Pasa cada vez que
  Comercial se reinicia, por ejemplo en cada despliegue. La cola de cambios no se ve afectada:
  reintenta con cualquier respuesta de 500 o más.
- **Sin prueba:** ninguna prueba cubre este caso borde. Las e2e de «sin conexión» usan
  `setOffline`, que no pasa por acá.
- Para E08 (Procesos caído, con su mensaje) sí está bien que la respuesta sea legible. Lo que
  falta es distinguir a Comercial de Procesos.

### 1.3 E08: el aviso con Procesos caído cambió de texto — Defecto

- **Dónde:** `microservices/puerta/Caddyfile:62`.
- **Spec:** «la puerta contesta que Procesos no responde ahora, como hoy».
- **Código:** antes decía «Procesos no responde ahora. Probá de nuevo en un rato». Ahora dice «Esa
  parte del sistema no responde ahora. Probá de nuevo en un rato», el mismo texto para todos los
  servicios. `puerta.sh:80` comprueba el texto nuevo. Hay que elegir: o se corrige la spec, o el
  texto nombra a Procesos.

### 1.4 E13 no tiene prueba que lo nombre — Defecto

- Ninguna prueba nombra `026-E13`. Lo cubre en parte el control de capas de Procesos
  (`.dependency-cruiser.cjs`, RNF-61): no importa nada de Ferrebress. Los nombres de los permisos
  vienen de la configuración.

### 1.5 Que Procesos lea los permisos con los nombres de su configuración no se comprueba de verdad — Defecto

- **Dónde:** `microservices/procesos/servidor/src/rutas.test.ts:7`.
- **Plan («Pruebas»):** «que lee `X-Permisos` con los nombres del `.env`».
- **Prueba:** usa justo `procesos.ver` y `procesos.dibujar`, los mismos nombres que Ferrebress.
  También pasaría si el código tuviera esos nombres escritos a mano. Falta un caso con otros
  nombres (por ejemplo `ver: "p.leer"`), en el que `procesos.ver` no alcance.

### 1.6 E14 y E15 no tienen prueba con su número; E15 no se puede comprobar acá — Defecto

- E14: `tests/integration/reordenamiento.sh` comprueba la carpeta y el nombre del servicio y de la
  imagen en el compose, pero bajo los números de 010 (E01, E03). Ninguna prueba nombra `026-E14`.
- E15: no hay prueba, y no pude comprobar la máquina. `desplegar.sh` no cambió en estos commits.
  Lee los servicios del compose de cada versión (`config --services`) y espera que todos estén
  sanos, también la puerta. En el código, E05 («no figura sano sin la puerta») y E15 se
  sostienen. Volver atrás a una versión de antes de 026 baja su compose, y `--remove-orphans`
  saca la puerta. No lo probé.

### 1.7 El resto de los escenarios

- E01 a E09: `puerta.sh` los nombra a todos y comprueba lo que dicen contra el stack real (no lo
  corrí yo). E01 solo prueba `/sesiones/actual`; «la misma respuesta que antes» para todo lo demás
  depende de las e2e, cuyo resultado no vi.
- E05: se prueba que la puerta está sana, no que el ambiente deje de figurar sano si ella no lo
  está. Eso sale de `desplegar.sh` (punto 1.6).
- E10, E11 y E12: tienen pruebas que de verdad comprueban, en `reglas.test.ts` (almacén en
  memoria) y en `persistencia/procesos.test.ts` (Postgres, que no corrí). Ver también 3.3.

---

## 2. Seguridad (cada punto del plan)

### 2.1 Cabeceras de identidad del navegador — Hecho; la prueba no aísla el borrado — Defecto

- **Código:** `Caddyfile:17-20`. Con `caddy adapt` se ve que los cuatro `request_header -…`
  quedan en la primera ruta del servidor, antes del CORS, de la salud y de los `handle`. Corren
  antes que cualquier otra cosa, como dice el plan. Además, `forward_auth` con `copy_headers`
  primero borra cada cabecera y después la pone solo si Comercial la mandó, y `header_up`
  reemplaza `X-Token-Servicio`. Son dos defensas.
- **La prueba** (`puerta.sh:47-49`): pasaría igual sin las cuatro líneas de borrado. Sin sesión,
  el 401 lo da Comercial, que no lee esas cabeceras. Y con permisos falsos, `copy_headers` ya los
  pisa. Para Procesos, el efecto queda probado. Lo que el plan llama «una prueba de integración lo
  comprueba» (el borrado mismo) no está probado. Hoy ese borrado solo importa en las rutas que van
  a Comercial, y Comercial ignora esas cabeceras. Para el próximo servicio que las lea por el
  camino de Comercial convendría una prueba con un eco. Tampoco se prueba un `X-Usuario-Nombre`
  falso con una sesión válida (que el evento quede con el nombre de verdad).

### 2.2 El orden de las directivas de Caddy — Bien con la versión que hay; depende de la versión — Defecto

- Con la v2.11.7, `caddy adapt` deja este orden: borrado de cabeceras y CORS de respuesta, la
  consulta previa (`@consultaPrevia`), `/puerta/salud`, `/procesos*` y, al final, lo demás. La
  consulta previa a `/procesos` no pasa por `forward_auth`, y por eso contesta 204.
- **Riesgo:** ese orden lo decide el algoritmo de Caddy para ordenar los `handle`, no el orden del
  archivo. En versiones anteriores, un `handle` con matcher de ruta iba antes que uno con matcher
  con nombre. Con ese orden, la consulta previa a `/procesos` caería en `forward_auth`, que sin
  `Authorization` contesta 401, y el navegador no podría llamar a Procesos. El `Dockerfile` usa
  `caddy:2-alpine` sin versión fija (`microservices/puerta/Dockerfile:3`). Convendría fijar la
  versión, o poner los `handle` dentro de un `route` para que el orden sea explícito. `puerta.sh`
  lo detectaría, pero solo con el stack levantado.
- `request_body` queda antes de `forward_auth` dentro de `/procesos*` (orden de Caddy). No cambia
  nada, porque `forward_auth` no lee el cuerpo.

### 2.3 CORS en la puerta — Hecho

- `Caddyfile:24-35`: el mismo origen fijo, los mismos métodos (los de Hono `cors` por defecto),
  las mismas cabeceras permitidas (`Authorization`, `Content-Type`, `X-Temas`, `X-Canal`), la
  misma expuesta (`X-Avisos`) y `Vary: Origin`. Comercial ya no lo hace, y ni Comercial ni
  Procesos ponen `Access-Control-*` (busqué en los dos). La consulta previa contesta 204, como
  Hono.
- **Defecto menor:** antes los nombres `X-Temas` y `X-Avisos` salían de las constantes de
  `conexion-entre-dispositivos` (`CABECERA_DE_TEMAS`, `CABECERA_A_CUESTAS`). Ahora están escritos
  a mano en el `Caddyfile`, y un cambio en la constante no llega a la puerta. Conviene anotarlo
  al lado de la constante.
- La puerta solo trata como consulta previa un `OPTIONS` con `Access-Control-Request-Method`.
  Hono atendía cualquier `OPTIONS`. Un `OPTIONS` sin esa cabecera ahora va a Comercial. El
  navegador no lo manda, así que es inofensivo.

### 2.4 `X-Forwarded-For` y el límite de intentos — Hecho como antes; no pude comprobarlo en la máquina

- `Caddyfile:10`: `trusted_proxies static private_ranges` (incluye `127.0.0.1/8`). Así la puerta
  le suma su eslabón al `X-Forwarded-For` que trae el proxy, en vez de pisarlo con la dirección
  del proxy. `limitarIntentos` (`microservices/comercial/src/autenticacion.ts:85`) toma el primer
  valor, así que sigue viendo la IP que puso el proxy de adelante, como antes de 026. Sin esa
  línea, todo el mundo compartiría un solo cupo de intentos.
- Si el proxy de la máquina deja pasar el `X-Forwarded-For` que manda el cliente sin pisarlo, el
  primer valor se puede falsificar. Pero eso ya pasaba antes de 026 y no lo pude ver.
- **Documentación:** ni el plan ni el ADR-031 dicen que la puerta confía en el `X-Forwarded-For`
  de las redes privadas ni por qué (punto 4.4).

### 2.5 Token entre servicios en Comercial — Hecho

- `app.ts:48-49`: `exigirTokenDeServicio` va después de `/health` y antes de todas las rutas. La
  comparación es en tiempo constante (`autenticacion.ts:24-28`). `salud.test.ts` (026-E07) prueba
  que sin token, o con uno distinto, da 401, y que `/health` no lo pide. `puerta.sh` lo prueba
  desde otro contenedor.
- **El pedido interno de lo apartado** (`apartados/reglas.ts:81`) manda el token. Lo prueba de
  verdad `rutas/apartados.test.ts` (014-E06: aceptar repite la venta): sin el token, el pedido
  interno daría 401 y la prueba fallaría. No hay otros `app.request` internos.
- El ayudante `pedir` de las pruebas manda el token siempre (`pruebas/base-falsa.ts:79`), como
  dice el plan.

### 2.6 Eventos de Procesos en la misma transacción y con la regla del borrador — Hecho, con un borde — ver 3.3

- `persistencia/procesos.ts`: `crear`, `renombrar`, `borrar` y los tres cambios con revisión
  anotan dentro de la misma transacción y solo si la fila cambió (`RETURNING`). El nombre del
  borrado sale del `DELETE … RETURNING nombre`, sin leerlo antes. Es mejor que lo de antes. Los
  tipos son los de siempre (`proceso.creado`, `importado`, `renombrado`, `borrado`, `vigente`,
  `borrador_cambiado`, `borrador_descartado`). La regla del borrador está en las reglas
  (`reglas.ts:66-76, 147-150`), con el arreglo de no contar la media hora si el guardado perdió
  contra otro.

### 2.7 Exposición, tamaños y secretos — Hecho

- Compose: solo `puerta` publica, en `127.0.0.1:${PUERTO_API}`. `comercial` y `procesos` no
  publican. `TOKEN_SERVICIO` y `ORIGEN_WEB` llegan a la puerta desde el `.env`. No hay secretos
  nuevos.
- **Tamaño:** `max_size 6MB` en Caddy son 6 000 000 bytes (lo dice `caddy adapt`). Antes
  Comercial cortaba en 6 MiB (6 291 456) con «Pesa más de 5 MB». El tope que vale de verdad es el
  de Procesos (5 MiB + 512 KiB, con el mismo mensaje), que es menor y no cambió. Un cuerpo de más
  de 6 000 000 bytes ahora lo corta Caddy, sin el mensaje en palabras (no comprobé si contesta 413
  o 502). Defecto menor.
- **Quién hizo qué:** lo de Procesos va a `procesos.evento` y deja de verse en «Quién hizo qué»
  hasta 027, como dice la decisión 165. Ver 4.2.

---

## 3. Reglas inventadas

### 3.1 Un solo aviso para cualquier servicio caído, con CORS — Defecto (causa de 1.2 y 1.3)

- `Caddyfile:58-63`: contesta 502, 503 y 504 de cualquier servicio con un texto propio. Ninguna
  regla escrita pide ese texto, y para Comercial contradice el caso borde (1.2).

### 3.2 `/puerta/salud` y el prefijo `/procesos*` — Defecto menor

- La ruta `/puerta/salud` no está en la documentación: ni el plan ni el ADR dicen dónde se
  consulta la salud de la puerta.
- `handle /procesos*` también toma `/procesos-algo` o `/procesosX`. Antes Comercial montaba
  `/procesos` y `/procesos/*`. Hoy no choca con nada, pero un prefijo futuro de Comercial que
  empiece igual iría a Procesos. Conviene `/procesos /procesos/*`.

### 3.3 La media hora del borrador empieza a contar aunque el guardado falle por un error — Defecto

- **Dónde:** `microservices/procesos/servidor/src/reglas.ts:147-150`.
- `anotacionDelBorrador` marca la hora **antes** de guardar. La marca se deshace solo si el
  guardado devuelve `null` (otro cambió antes). Si `guardarBorrador` tira un error (la base cae, o
  falla la transacción), la marca queda. Entonces el siguiente guardado que sí sale bien, dentro
  de la media hora, no se anota. Antes, Comercial marcaba solo con la respuesta buena (E11: «se
  anota el primero»).

### 3.4 Los nombres de los permisos van fijos en el compose, no en el `.env` — Defecto menor

- `docker-compose.yml:129-131` los fija en el compose, con el comentario de que no cambian entre
  ambientes. El plan dice «su `.env` dice qué permiso es "ver"». Para Ferrebress da lo mismo, pero
  el plan quedó desactualizado.

---

## 4. Documentación que quedó atrás

### 4.1 T007 y T008 sin hacer, pero el estado ya dice «Hecho» — Defecto

- `tasks.md`: T007 (integración y e2e) y T008 (documentación y `estado.yml`) siguen con `[ ]`, y
  T009 depende de T008. Sin embargo, `proyecto/estado.yml` ya pone RNF-72 y RNF-73 en «Hecho
  (026)». Con las e2e corriendo y los puntos 1.1 y 1.2 abiertos, correspondería «A validar».

### 4.2 Procesos (011) y ADR-019 siguen describiendo la ruta de paso de Comercial — Defecto

- `specs/011-procesos/spec.md:105` (E22): «queda registrado en «Quién hizo qué»». Hasta 027 eso
  ya no es cierto (decisión 165), y la 011 no lo dice.
- `specs/011-procesos/plan.md:28-30` y `:68-72`: `X-Puede`, `PROCESOS_URL` y «una ruta de paso
  `/procesos/*` en el servidor de Ferrebress… lo anota en el registro de eventos».
- `docs/adr/ADR-019-procesos-como-modulo-que-se-lleva.md:31-36`: lo mismo (`ver`, `dibujar`;
  «El servidor de Ferrebress además anota»). ADR-031 no dice que reemplaza esa parte.
- Otro agente que leyera la 011 y el ADR-019 rearmaría la ruta de paso en Comercial.

### 4.3 El README de Procesos, a medias — Defecto

- `microservices/procesos/README.md:21-22`: todavía dice que la aplicación tiene que «reenviarle
  cada pedido».
- `:65`: «con las tres variables». Ahora son cinco: `DATABASE_URL`, `TOKEN_SERVICIO`, `PORT`,
  `PERMISO_VER` y `PERMISO_DIBUJAR`.
- `:66-67`: «la ruta que reenvía `/procesos/…`» no nombra la alternativa de la puerta, ni que el
  proyecto que lo use tiene que mandar `X-Permisos` con sus nombres.
- `microservices/procesos/web/src/tipos.ts:3`: «que reenvía a Procesos».
- Es parte de T008, que está pendiente.

### 4.4 Lo que la puerta hace y el plan no dice — Defecto

- Que confía en el `X-Forwarded-For` de las redes privadas, y por qué (2.4).
- La ruta de salud `/puerta/salud` y el aviso único con un servicio caído (3.1, 3.2).
- Que las cabeceras del CORS están copiadas de las constantes del paquete de conexión (2.3).
- Que el orden de los `handle` depende de la versión de Caddy (2.2).

### 4.5 La spec y el plan se contradicen sobre reinstalar los scripts de la máquina — Defecto

- `spec.md:26` y E15 (`:86`) dicen que hay que reinstalar los scripts de despliegue una vez.
  `plan.md:17-18` dice que desde 001-T051 un servicio renombrado se despliega sin reinstalar.
  `desplegar.sh` no cambió y lee los servicios del compose, así que el plan parece tener razón.
  La spec debería decir lo mismo, o explicar qué hay que reinstalar.

### 4.6 Nombres viejos que quedan — Defecto menor

- El paquete de la web sigue llamándose `gestion-del-local-web` (`microservices/web/package.json:2`,
  `.github/workflows/ci.yml:131,141`, `README.md:27`, `docs/operacion/DEPLOYMENT.md:18`,
  `quickstart.md:25`). La spec renombra solo el servidor, pero RNF-73 pide «cada servicio se llama
  igual en todos lados». Hay que aclarar si la web cuenta.
- Rutas que ya no existen: `docs/adr/ADR-001-stack-tecnologico.md:82`,
  `ADR-010-servicios-clientes-y-librerias.md:43`, `ADR-015-…:60` y
  `docs/auditoria-de-arquitectura.md:66` nombran `clientes/gestion-del-local-web`. El problema es
  de antes de 026.
- `README.md:66`: la línea de `microservices/comercial` quedó desalineada.
- No encontré referencias rotas a `microservices/api`, a `gestion-del-local` como servicio, a
  `PROCESOS_URL` ni a `X-Puede` en el código, la CI, los scripts, el compose ni la documentación
  vigente. Solo quedan en las `revision.md` viejas, que son historia, y en lo de la 011 del
  punto 4.2. La ruta `@servidor/*`, el workspace, `imagenes-nube.sh`, `revisar-al-editar.mjs` y
  la prueba de la vista previa siguen el nombre nuevo.

### 4.7 La decisión 167 está dos veces — Defecto

- `docs/decisiones-de-negocio.md`: hay dos entradas «166» (una sobre el dibujo entre el celular y
  la computadora, otra sobre el contrato de Auditoría). La spec cita «decisiones 164, 165 y 167».
  Ya estaba así antes de estos commits.

---

## 5. Pantallas

No lleva pantallas ni maquetas: no hay nada que comparar.

---

## Qué se hizo con cada punto (2026-10-25)

| Punto | Qué se hizo |
|---|---|
| Control de tipos en `procesos.test.ts` | Arreglado (`withSchema("procesos")`). `tests/revisar-al-editar.mjs` suma Procesos, Auditoría y el kit, para que no vuelva a pasar |
| Comercial caído no se veía como falta de red | Arreglado: la respuesta con palabras queda solo para Procesos; con Comercial caído, la puerta corta la conexión y lo que llega al navegador no lleva CORS, como antes. `puerta.sh` lo comprueba |
| Borrado de cabeceras sin probar | Queda como defensa adicional: `copy_headers` y `header_up` ya pisan las cabeceras, así que desde afuera no se puede distinguir. Anotado como defecto |
| Orden de Caddy | Versión fija (`caddy:2.11.7-alpine`) |
| `X-Temas` y `X-Avisos` escritos a mano | Anotado como defecto: el Caddyfile no puede importar las constantes del módulo de conexión |
| `X-Forwarded-For` sin documentar | En el plan |
| La media hora del borrador si la base falla | Arreglado, con prueba |
| Texto de E08 | Vuelve a decir «Procesos no responde ahora» |
| E13, E14, E15 sin prueba que los nombre | E13: el control de capas de Procesos; E14: `reordenamiento.sh`; E15: se comprueba con el despliegue en la máquina. Anotado en `estado.yml` |
| Permisos con los mismos nombres en la prueba | La prueba usa otros nombres |
| Tope de 6 MB y su mensaje | Vale el de Procesos, que es menor y da el mensaje de siempre; sin cambios |
| `/procesos*` tomaba `/procesosX`; `/puerta/salud` sin documentar | La ruta es `/procesos` y `/procesos/*`; la salud, en el plan |
| Nombres de permisos en el compose | El plan lo dice (no cambian entre ambientes) |
| `estado.yml` con T007 y T008 abiertas | Se actualiza al cerrar |
| 011 y ADR-019 con el paso por Comercial | Enmienda en ADR-019; la 011 sigue valiendo («queda registrado en Quién hizo qué» vuelve con 027) |
| Spec y plan sobre reinstalar los scripts | Hace falta reinstalarlos una vez, por 001-T051; después no |
| Decisión 166 dos veces | La de Auditoría pasa a ser la 167 |
