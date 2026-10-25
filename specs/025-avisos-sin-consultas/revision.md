# Revisión: Avisos sin consultas (025)

**Revisó**: el subagente revisor (paso 7), 2026-10-25. **Sobre**: el commit `776fa65` (spec, plan,
ADR-030, tareas) y los cambios sin commitear del árbol de trabajo (T003 a T009). Las tareas
T003 a T009 no tienen commits todavía: `git log --grep 025` solo trae T001 y T002.

**Qué corrí**:

- Módulo `microservices/conexion`: `vitest run --coverage`: 87 pruebas pasan, 100 % en todo.
- API, unitarias: 246 pasan (incluye `rutas/canal.test.ts`, `salud.test.ts`, `puestos.test.ts`).
- Web, unitarias: 627 pasan (incluye `avisos-sin-consultas.test.tsx`, `Entrar.test.tsx`,
  `sesion.test.tsx`).
- `node tests/trazabilidad.mjs`: coinciden (solo avisos viejos de otros RNF).
- Un script de prueba aparte, fuera del repositorio, contra la central y el indicador de verdad,
  para confirmar B1, B2 y B3 (abajo dice qué dio).
- **No corrí las e2e** (`tests/e2e.sh`) ni saqué capturas. T010 (las e2e y el estado) sigue
  abierta.

---

## Lo que frena el cierre

### B1. Lo pendiente no sale al abrir la aplicación, ni después de un error del servidor

- **Dónde**: `microservices/web/src/negocio/conexion/index.ts:26` (lo pendiente sale solo cuando
  el indicador *pasa* a «en línea»), `microservices/web/src/datos/conexion/api.ts:45` (el
  indicador arranca en «en línea» si el navegador dice que hay red),
  `microservices/conexion/src/navegador/indicador.ts:31-36` (solo avisa si cambia).
- **Qué dice la especificación**: RF-144 y la historia 4: lo que quedó sin mandar sale «cuando hay
  una señal de que volvió la conexión», y E18: «cualquier pedido al servidor vuelve a contestar,
  se manda en ese momento». Se cambia el reintento cada 60 s por esas señales, no se saca el envío.
- **Qué hace el código**: si la aplicación se abre con cosas pendientes (por ejemplo, ventas de ayer
  hechas sin conexión y la aplicación cerrada), el indicador arranca en «en línea». La primera
  respuesta del servidor no lo cambia, así que no hay transición y no se manda nada. Lo pendiente
  queda en el dispositivo hasta que haya un cambio nuevo (que vacía la cola) o un corte y una
  vuelta. Lo mismo pasa si un envío falla con un 5xx: cuenta como «contestó», el indicador sigue
  «en línea» y nadie lo vuelve a intentar. Antes salía en menos de 60 s. Lo confirmé con el
  script: con el indicador en «en línea», la primera respuesta da 0 cambios.
- **Pruebas**: E17 y E18 (`avisos-sin-consultas.test.tsx:54, 62`) prueban solo la transición,
  no este caso.
- **Gravedad**: frena el cierre. Es una regresión en ventas y stock.

### B2. Los canales sin sesión se agrupan por su primer tema, y las entradas comparten el grupo «version»

- **Dónde**: `microservices/api/src/avisos/reglas.ts:60` (`const grupo = sesion?.id ?? pedidos[0]!.t`),
  `reglas.ts:46` (lo que va a cuestas se da sin sesión),
  `microservices/conexion/src/navegador/central.ts:66-73` (el canal pide todos los temas, en el
  orden en que se declararon), `microservices/web/src/pantallas/actualizacion.ts:22` (la espera
  `version` se declara al registrar el service worker, al arrancar),
  `microservices/conexion/src/servidor/canales.ts:40` (`maximoPorGrupo = 10`).
- **Qué dice la especificación**: E33 y el plan, «Saturación»: un tope por dispositivo o sesión y
  uno total, y que el servidor no se sature. E01: la computadora entra en menos de 2 s.
- **Qué hace el código**: en la entrada de la computadora el canal pide
  `[{"t":"version"},{"t":"entrada:<id>","k":…}]`. Lo confirmé con el script: ese es el orden cuando
  la espera de la versión ya está declarada, que es lo normal en producción. Entonces el grupo de
  **todas** las computadoras en la entrada es `"version"`, con un tope de 10 canales:
  - la pestaña número 11 en la entrada, sumando todas las computadoras, recibe un 503;
  - cualquiera, sin sesión ni secreto, puede abrir 10 canales con `X-Temas: [{"t":"version"}]` y
    dejar a todas las entradas sin su aviso. El dispositivo dice «Sin conexión», vuelve a intentar
    cada 3 s y el QR no lo hace entrar.
- **Pruebas**: no hay una prueba con más de un tema sin sesión. En las e2e el service worker no
  registra la versión, así que tampoco aparecería ahí.
- **Gravedad**: frena el cierre. Es un punto de seguridad (E33) que se puede atacar sin
  autenticarse, y rompe el camino principal para entrar.

### B3. La sesión cerrada no llega «en el momento» por el canal del vínculo (E11)

- **Dónde**: `microservices/conexion/src/navegador/central.ts:66-69`: el canal se reconecta solo
  si cambian las esperas **temporarias**, y una permanente que llega después no entra.
  `microservices/web/src/enlace.ts:118`: el enlace arranca al cargar la aplicación.
  `microservices/web/src/datos/sesion/sesion.tsx:45-49`: la espera `sesion:<id>` se declara recién
  cuando contesta `/sesiones/actual`.
- **Qué dice la especificación**: E11, «un vínculo por el servidor […] le cierran la sesión, se
  entera en el momento por esa conexión». Lo repiten 007 escenario 4, RF-74 y `ux.md` («o en el
  momento si tiene el canal abierto por otra cosa»).
- **Qué hace el código**: en un dispositivo vinculado, la espera del vínculo (temporaria) abre el
  canal antes de que se sepa el id de la sesión. Cuando llega la espera de la sesión, las
  temporarias no cambiaron y el canal no se vuelve a abrir. El tema `sesion:<id>` nunca llega al
  servidor, y `cerrarSesiones` no le encuentra canal. El script lo confirma: se pide solo
  `[{"t":"vinculo:1","l":"computadora"}]`. El dispositivo vuelve a la entrada con su próximo pedido
  (E10), no en el momento. La versión sí llega igual, porque va en `{"a":…}` al abrir.
- **Pruebas**: `sesion.test.tsx:78` declara la sesión **antes** que la temporaria y escribe el
  aviso en el flujo sin mirar qué temas se pidieron. Pasaría aunque el tema no estuviera en el
  canal.
- **Gravedad**: frena el cierre. Es un escenario numerado y la documentación de 007 lo promete.

### B4. La entrada de la computadora se puede quedar trabada sin código y sin nada que lo vuelva a pedir

- **Dónde**: `microservices/web/src/negocio/entrada/codigo-para-entrar.ts:66-69` y `:79`,
  `microservices/web/src/pantallas/compu/entrada/Entrar.tsx:16-30`.
- **Qué dice la especificación**: E14 acepta que el indicador sin canal diga lo último que se supo,
  y que «el próximo pedido lo corrige». `007/ux.md`: «Sin conexión: que para entrar se necesita
  internet, y reintento».
- **Qué hace el código**: si el pedido del código falla porque el servidor no está, pero la red del
  navegador sí (un despliegue, un reinicio, un 502 del proxy), pasa esto:
  - **Por la red**: el indicador queda en «Sin conexión», «Otras formas» queda inerte y no hay
    canal abierto. El navegador nunca avisa `online`, porque la red no se fue, así que nada vuelve
    a pedir el código.
  - **Con un 502**: el indicador queda «En línea» con el error y sin QR. El efecto depende de
    `[activo, conCodigo]`, que no cambian.

  En los dos casos la pantalla queda así hasta recargar. Antes, la pregunta a `/health` cada 30 s
  la destrababa. En la entrada no hay «próximo pedido» que corrija nada.
- **Pruebas**: `Entrar.test.tsx:128` prueba el corte de red con su aviso `online`, no el servidor
  caído con la red bien.
- **Gravedad**: frena el cierre, o lo decide Carlos. Es la pantalla con la que se entra, y puede
  pasar en cada despliegue.

### B5. Cierre del canal al cerrarse la sesión (E32): no está hecho como dice el plan

- **Dónde**: `microservices/api/src/avisos/canales.ts:24` (`cerrarSesiones` solo cierra el tema
  `sesion:<id>`), `microservices/conexion/src/servidor/canales.ts:101-108` (el canal se corta
  solo si se queda sin temas), `canales.ts:110` (`cerrarGrupo` existe y Ferrebress no lo usa),
  `microservices/api/src/acceso/reglas.ts:81-84` («Salir» no cierra nada).
- **Qué dice la especificación**: E32, «la sesión del canal se cierra **o vence** → el servidor
  cierra el canal». El plan, «Cierre»: «con el temporizador del vencimiento que ya existe».
- **Qué hace el código**:
  - Cerrar a distancia o desactivar a la persona saca el tema `sesion:<id>` y los del vínculo,
    pero el canal sigue abierto si tiene otros temas (la versión, `puesto:<id>`). Además, B3 hace
    que muchas veces el tema de la sesión ni siquiera esté.
  - Cuando la sesión vence, ningún reloj cierra el canal.
  - Con «Salir», las otras pestañas del mismo navegador siguen con su canal y con el tema del
    vínculo, recibiendo lo que el otro manda por el servidor.

  Lo que se filtra es poco, porque los temas del vínculo sí se cierran al cerrar a distancia o
  desactivar, pero no es lo que dice el plan.
- **Pruebas**: `rutas/canal.test.ts:119` abre canales con un solo tema (`sesion:…`), así que se
  cierran por quedarse vacíos. La prueba pasa aunque el canal real no se cerraría.
- **Gravedad**: frena el cierre (punto de la sección «Seguridad»).

### B6. Falta T010 y el estado dice «Hecho»

- **Dónde**: `specs/025-avisos-sin-consultas/tasks.md` (T010 abierta), `proyecto/estado.yml`
  (RF-141 a RNF-71 en «Hecho»).
- **Qué falta**:
  - las e2e de E02, E04, E05 y E22 a E24;
  - la medición de SC-001: la e2e mira 6 s, no una hora;
  - las pruebas de E20, que el plan pide con relojes falsos, y de E29;
  - correr las e2e.

  Sin eso, el estado no puede decir «Hecho».
- **Gravedad**: frena el cierre (proceso).

---

## Lo que se puede anotar como defecto

| # | Dónde | Qué pasa | Gravedad |
|---|---|---|---|
| M1 | `web/src/negocio/tickets/tickets.ts:78`, `negocio/configuracion/configuracion.ts:48`, `negocio/sistema/ajustes.ts:40` | E08 y E19 dicen que al volver la red no se pregunta nada. Estas tres pantallas, si están abiertas, hacen un GET al recibir `online`. Además, `negocio/ventas/venta.ts:40` vacía la cola con su propio `online`, por fuera de la central (RNF-70 pide «una sola pieza»). | Defecto, o anotarlo como excepción en la spec |
| M2 | `conexion/src/navegador/flujo.ts:7, 45-48` | El canal cortado se reconecta cada 3 s, sin tope y sin espera creciente: también con un 503 (E33, saturación) y sin red. Es el único temporizador que usa la red. RNF-71 no lo exceptúa por escrito. | Defecto, y documentarlo |
| M3 | `conexion/src/servidor/canales.ts:50-51, 79` | `quitar` borra por `id` sin mirar si es el mismo canal. Si el `cancel` del canal viejo llega después de que el mismo dispositivo abrió uno nuevo (cambio de temas), borra el nuevo del tablero. El nuevo queda abierto, con latido, pero sin avisos, y el otro lado ve que se fue. No lo reproduje. | Defecto (carrera) |
| M4 | `conexion/src/navegador/flujo.ts:32, 41-44` y `canal.ts:56-60` | `rechazar` no mira `activo`. Un rechazo de un flujo ya cerrado pone `flujo = null` y pierde la referencia al flujo nuevo, que queda abierto sin que nadie lo pueda cerrar. Es una ventana muy chica. No lo reproduje. | Defecto (carrera) |
| M5 | `conexion/src/navegador/canal.ts:59` y `central.ts:101` | Un rechazo con un cuerpo que no se entiende (un 404 de texto, por ejemplo una API vieja en pleno despliegue) se toma como «todos los temas». La central saca para siempre también las esperas **permanentes** (`version`, `sesion:<id>`). En esa página no se vuelve a detectar la versión nueva. | Defecto |
| M6 | `conexion/src/navegador/central.ts:66-69` con `canal.ts:56-60` | Si el servidor rechaza solo temas permanentes, las temporarias no cambian y el canal queda cerrado aunque haya una temporaria viva. Hoy en Ferrebress no pasa, pero un caso nuevo (RNF-70) lo puede disparar. | Defecto latente |
| M7 | `api/src/avisos/reglas.ts:59` y `web/src/enlace.ts:81` | El rechazo lleva un solo estado (el del primer tema) para todos los temas. Un 404 de otro tema puede llegarle al vínculo y hacer `soltarLocal`. Solo pasa con temas que no son UUID. | Menor |
| M8 | `web/src/negocio/entrada/codigo-para-entrar.ts:37-41, 51` | Al volver a una ventana tapada con el código vencido, se piden **dos** códigos: uno al volver a la vista, y otro por el 404 del canal, que se reabre con el tema vencido. | Menor |
| M9 | `conexion/src/navegador/enlace.ts:100, 146` | El primero de los dos al que se le abre la directa suelta el tema enseguida. Si al otro le llega `p:false` antes de que se le abra a él, cancela su intento: la directa se corta y vuelven a probar. Por la diferencia de tiempos es poco probable. No lo reproduje. | Menor (carrera) |
| M10 | `conexion/src/servidor/canales.ts:60` con `avisarPresencia` | Cada cambio de temas reconecta, y el otro lado del vínculo ve `p:false` y después `p:true`: se reencuentran, se saludan y, si estaban probando la directa, la vuelven a probar. | Menor |
| M11 | `web/src/negocio/conexion/index.ts:48` y `web/src/datos/conexion/api.ts:45` | Adentro, «conectando» cuenta como en línea. Con el canal reintentando sin red, el punto alterna. En la entrada se ve «En línea», después «Conectando…» y después «En línea» al cargar. No lo comprobé con capturas. | Menor |
| M12 | `web/src/plataforma/servidor/cliente.ts` (`llegar`) | `alNoLlegar` también salta con un pedido abortado o un error de CORS, y pone «Sin conexión» sin que falte la red. | Menor |
| M13 | `api/src/rutas/canal.ts:12` y `api/src/avisos/reglas.ts:57` | `/canal` no tiene `limitarIntentos` ni tope de temas por pedido, y cada tema es una consulta a la base, también sin sesión. `/vinculaciones/:id/estado`, al que reemplaza, tenía 240. | Menor (seguridad) |
| M14 | `api/src/avisos/reglas.ts:60` | Sin sesión, con códigos de entrada pedidos (30 por ventana del limitador) y 10 canales por código, se llena el tope total de 1 000 desde unas pocas direcciones. Eso tumba el respaldo del vínculo para todos. | Menor (seguridad) |
| M15 | `conexion/src/servidor/canales.ts:123-130` | `tandaDe` repite la lectura de JSON de `comun/temas.ts`. RNF-68 pide no repetir código. | Menor |

---

## 1. Escenarios

| Escenario | Código | Prueba | Nota |
|---|---|---|---|
| E01 | Cumple | `api rutas/canal.test.ts:47`, `Entrar.test.tsx:146`, e2e `20-conexion` «025-E01» | Lo rompe B2 en producción |
| E02 | Cumple | `avisos-sin-consultas.test.tsx:81`, `api rutas/canal.test.ts:57` | Falta la e2e (T010) |
| E03 | Cumple | `navegador/canal.test.ts:19`, `central.test.ts:7`, e2e (6 s) | SC-001 no se midió |
| E04 | Cumple | `Entrar.test.tsx:87` (a la vista) | Con la ventana tapada no hay prueba; M8 |
| E05 | Cumple en el módulo | `canal.test.ts:32, 49`, `central.test.ts:7` | En la aplicación no hay prueba de «oculta» ni de «se entra» |
| E06 | Cumple | `api rutas/canal.test.ts:38, 57` (estado al abrir) | En la aplicación, solo indirecto (`Entrar.test.tsx:156`) |
| E07 | Cumple | `canal.test.ts:19`, `api rutas/canal.test.ts:134` | Un canal por pestaña, como dice el borde |
| E08 | Parcial | `avisos-sin-consultas.test.tsx:42`, `sesion.test.tsx:68` | M1. La prueba solo monta la espera de la versión |
| E09 | Cumple | `avisos-sin-consultas.test.tsx:31`, `central.test.ts:40`, `salud.test.ts` | |
| E10 | Cumple (401) | `sesion.test.tsx:30, 68` | |
| E11 | Cumple para la versión; **no para la sesión** | `sesion.test.tsx:78` (no lo comprueba) | B3 |
| E12 | Cumple | `Entrar.test.tsx:128, 156`, e2e | M11 |
| E13 | Cumple | `central.test.ts:59`, `indicador.test.ts:7` | |
| E14 | Cumple en general | `indicador.test.ts` (genérico) | B4 en la entrada |
| E15 | Cumple por construcción | Sin prueba (aceptable) | |
| E16 | Cumple | `indicador.test.ts:17` | |
| E17 | Cumple | `avisos-sin-consultas.test.tsx:54` | |
| E18 | Parcial | `avisos-sin-consultas.test.tsx:62` | B1 (al abrir, después de un 5xx) |
| E19 | Parcial | `avisos-sin-consultas.test.tsx:71` prueba otra cosa (el paso del tiempo, no la vuelta de la red sin nada pendiente) | M1 (Tickets) |
| E20 | Sin cambios de código | **Sin prueba** (el plan la pedía) | B6 |
| E21 | Cumple | `enlace.test.ts:45`, `servidor.test.ts:32`, e2e «025-E21» | |
| E22 | Parcial | `enlace.test.ts:57` | Se entera por la directa, pero reabre el canal con el servidor en el acto (`enlace.ts:107-118`), y la spec dice «sin el servidor». Ver la sección 4 |
| E23 | Cumple | `enlace.test.ts:168` | |
| E24 | Cumple | `enlace.test.ts:70`, `canal.test.ts:49` | Falta la e2e |
| E25 | Cumple por construcción (canal único) | Indirecta | |
| E26 | No comprobado | Las unitarias de 023 pasan; **las e2e de 17 y 20 no las corrí** | |
| E27 | Cumple | `central.test.ts:7`, `canales.test.ts:16` | |
| E28 | Cumple | `central.test.ts:22` | |
| E29 | Cumple por construcción | **Sin prueba** | |
| E30 | Cumple | `api rutas/canal.test.ts:38` | |
| E31 | Cumple | `api rutas/canal.test.ts:29, 57, 71, 119` | |
| E32 | **Parcial** | `api rutas/canal.test.ts:119` (pasa siempre, ver B5) | B5 |
| E33 | **Parcial** | `canales.test.ts:105` (solo el módulo) | B2, M2, M14. Que el dispositivo diga «Sin conexión» con un 503 sale de `flujo.ts` (cortado), sin prueba |
| E34 | Cumple | `temas.test.ts:15`, `canal.test.ts:64` | |

## 2. Seguridad (sección del plan)

- **Quién escucha qué (E30, E31)**: hecho como dice el plan. Detalles:
  - `entrada:<id>` exige la clave (`reglas.ts:23-26`) y la clave va en la cabecera `X-Temas`, no
    en la dirección.
  - `puesto:` y `vinculo:` exigen la sesión dueña, y el lado sale de la base, no del pedido.
  - `sesion:<id>` acepta solo la propia.
  - Un tema desconocido da 403.
  - **Se aparta del plan**: lo que va a cuestas se escucha sin sesión (`reglas.ts:46`), y con eso
    pasa B2.
- **La sesión nueva**: no viaja por el canal. El canal avisa `{listo:true}` y la sesión se retira
  con `POST /sesiones/vinculaciones/:id/estado` y la clave, una sola vez. Es igual de seguro, pero
  el plan dice otra cosa (sección 4).
- **Cierre (E32)**: no está hecho como dice (B5).
- **Saturación (E33)**:
  - Hay un tope por grupo (10) y uno total (1 000), y un canal por pestaña (`X-Canal`, con el
    grupo adelante para que otro grupo no lo reemplace).
  - Las tandas conservan 64 KB por mensaje y 1 MB por tanda (`rutas/canal.ts:15`, `canales.ts`).
  - Pero el grupo sin sesión está mal armado (B2), no hay limitador de pedidos (M13) y el tope
    total lo puede llenar alguien sin sesión (M14).
- **Lo que llega (E34)**: hecho. `leerEvento` valida la forma y lo que no la tiene se descarta.
  Los datos de cada aviso los valida quien los usa (`vinculo.ts`, `codigo-para-entrar.ts`,
  `servidor.ts:30`).
- **A cuestas**: hecho. Solo lleva `version` (`avisos/canales.ts:9`).

## 3. Reglas inventadas

- **«con-red» pasa el indicador a «en línea»** (`indicador.ts:13`). El plan, en «El indicador»,
  dice «conectando, hasta lo próximo». Con la regla del código, E17 anda. Hay que alinear el plan
  o el código.
- **Los topes de 1 000 canales en total y 10 por grupo** (`canales.ts:40`) no figuran en ningún
  documento.
- **El grupo de un canal sin sesión es su primer tema** (`reglas.ts:60`). No está escrito en
  ningún lado, y además falla (B2).
- **El canal se puede escuchar sin sesión para lo que va a cuestas** (`reglas.ts:46`).
- **El rechazo parcial**: el servidor contesta 401, 403 o 404 con la lista de temas, y el
  dispositivo suelta esos y vuelve a abrir con el resto (`reglas.ts:59`, `canal.ts:56-60`). El plan
  dice «un tema no autorizado rechaza todo el canal (403)». Lo de soltar los rechazados figura
  solo en T005.
- **La cabecera `X-Canal`**, una por pestaña (`web/src/datos/conexion/api.ts:35-41`). El borde
  «muchas pantallas» lo cubre, pero el nombre y la regla de reemplazo no están escritos.

## 4. Documentación que quedó atrás

- **`plan.md`**:
  - La tabla del indicador («con-red» → «conectando») no coincide con el código.
  - El árbol de archivos dice que `servidor/central.ts` «cambia», pero se borró; y que
    `navegador/flujo.ts` se reutiliza «tal cual», pero cambió (`alRechazar` con el cuerpo).
  - El tema de la sesión figura como `sesion`, pero es `sesion:<id>`.
  - Dice que «la sesión nueva viaja solo por el canal», y viaja por `POST …/estado`.
  - Dice «rechaza todo el canal (403)» (ver la sección 3).
- **Decisiones 97, 157 y 158** (`docs/decisiones-de-negocio.md:742-744, 1318-1335`): siguen
  diciendo que se busca o se sale «al volver a la vista» y «al volver la conexión», y no llevan la
  marca «precisada por la 160», como sí la llevan la 91 y la 92 con la 157. La 160 dice que las
  precisa, pero quien lea la 157 o la 158 sola reconstruye lo de antes.
- **ADR-027, línea 94**: sigue describiendo `/puestos/:id/enlace`. La enmienda no dice que la ruta
  pasó a ser `/canal` y `POST /canal/<tema>`, aunque ADR-030 sí lo dice.
- **specs/025, E22**: dice «sin el servidor», pero el código reabre el canal en cuanto se corta la
  directa, para esperar al otro (`enlace.ts:107-118`). Lo permiten E23 y RF-145 («mientras
  esperan encontrarse»). Hay que aclarar E22 o cambiar el código.
- **007 (escenario 4, RF-74, `ux.md`)**: prometen lo de E11 para la sesión, que hoy no se cumple
  en un dispositivo vinculado (B3).
- **RNF-71**: no exceptúa la reconexión del canal cada 3 s (M2).
- **`proyecto/estado.yml`**:
  - RF-137 sigue nombrando `api/src/rutas/puestos.test.ts`, que ya no prueba el enlace, y no nombra
    `api/src/rutas/canal.test.ts`.
  - RF-141 a RNF-71 dicen «Hecho» con T010 abierta, E20 y E29 sin prueba y las e2e sin correr.
  - Los defectos de esta lista no figuran.
- **`microservices/conexion/README.md`**: muestra `cerrarGrupo` para cuando se cierra una sesión.
  Ferrebress no lo usa (B5).
- **009 RF-96 y E21, `specs/README.md` y ADR-020 (enmienda)**: coinciden con el código.

## 5. Pantallas

No hay maquetas: la spec dice que ninguna pantalla cambia de aspecto. Viendo el código, la
entrada muestra «En línea», después «Conectando…» y después «En línea» al cargar, y el punto de
adentro puede alternar sin red (M11). **No lo comprobé con capturas.**

## Lo que no pude comprobar

- Las e2e (`tests/e2e.sh`), entre ellas E26 (todo lo de 023 sigue igual), E21 y el conteo de
  pedidos de la entrada.
- SC-001 (menos de 20 KB por hora): no está medido. La cuenta en papel da unos 7 KB por hora de
  latido, con el armado de cada paquete.
- Las carreras M3, M4 y M9: salen de leer el código, no las reproduje.
- B2 en producción: el orden `[version, entrada]` lo confirmé con la central de verdad; que en
  producción la espera de la versión se declare antes que la de la entrada lo deduzco del orden de
  arranque (`main.tsx:16` y `onRegisteredSW`), no lo vi en un navegador.

## Qué se hizo con cada punto (2026-10-25)

**Lo que frenaba el cierre: todo corregido.**

- **B1.** Lo pendiente sale al abrir la aplicación, al pasar el indicador a «en línea» y, si algo
  quedó sin salir con el servidor contestando, con la próxima respuesta pasado un minuto (se compara
  la hora, sin timer). RF-144 lo dice así. Pruebas: E17, E18 y E19 en `avisos-sin-consultas.test.tsx`.
- **B2.** Lo que va a cuestas ya no es un tema del canal: la espera de la versión se declara
  `aCuestas` y nunca se pide, y el servidor ya no da `version` como tema. Sin sesión, el único tema
  que se da es `entrada:<id>` con su secreto, y el grupo es ese código. Además: hasta 10 temas por
  canal y 120 aperturas por minuto por dirección (M13).
- **B3.** El canal se vuelve a abrir cuando cambia la lista de temas (no solo las temporarias): la
  sesión que se conoce después entra en la próxima apertura. La carrera que eso podía traer en el
  vínculo se cerró en el canal: al cambiar de temas, primero avisa que se cerró y los dos empiezan
  la directa de nuevo (prueba nueva en `enlace.test.ts`, que sin el arreglo falla). La prueba de
  E11 ahora declara el canal antes de saberse la sesión y mira que el tema llegue.
- **B4.** Si el servidor no contesta con la red bien, el código se vuelve a pedir al tocar la
  pantalla o volver a la ventana (sin timer). Está en E12. Prueba en `Entrar.test.tsx`.
- **B5.** Al cerrar una sesión a distancia o al desactivar, se avisa por su tema y se cierran
  todos los canales de esa sesión; al salir, solo se cierran. La prueba usa un canal con dos temas.
  El vencimiento con un canal abierto queda como borde en la spec: la sesión se estira con el uso y
  el canal vive solo con la aplicación a la vista.
- **B6.** T010 hecha: e2e de E01, E02 (sin preguntar si el celular leyó el código), E03, E12 y E21;
  E04, E05, E20, E22 a E24 y E29 con pruebas unitarias. Las tareas T003 a T011 van en un commit
  que las nombra.

**Defectos.**

- **M1.** `venta.ts` ya no manda lo pendiente por su cuenta. Las tres pantallas que vuelven a
  traer lo que muestran al volver la red quedan: es su transacción (fuera de este rediseño); está
  escrito como borde en la spec.
- **M2.** El flujo espera el doble cada vez que no puede conectar, hasta un minuto; al abrir, vuelve
  a 3 s. Está en el plan.
- **M3.** No se cambia: un canal reemplazado se cierra desde el servidor antes de quitarlo, y un
  flujo cerrado no recibe la cancelación del cliente, así que no puede borrar al nuevo.
- **M4.** El flujo ignora lo que contesta el servidor si ya se lo cerró. Prueba en `flujo.test.ts`.
- **M5 y M6.** Si el servidor no da un tema permanente, la espera sigue (a cuestas) y el canal se
  abre sin él; solo las temporarias rechazadas terminan. Prueba en `central.test.ts`.
- **M7.** Queda: los temas que se piden son UUID o el de la sesión, y el estado del primero alcanza.
- **M8.** Cada código pide uno nuevo una sola vez, venza o lo rechace el servidor. Prueba E04.
- **M9.** El enlace suelta el tema del servidor recién cuando le llega algo del otro por la
  directa: así sabe que al otro también se le abrió.
- **M10.** Con el aviso de cierre de B3, los dos se reencuentran y empiezan de nuevo, en orden.
- **M11.** Queda: «conectando» dura lo que tarda en abrir el canal.
- **M12.** Un pedido cancelado a propósito ya no cuenta como falta de red.
- **M14.** Queda como está: cada canal sin sesión necesita un código vigente (30 por minuto por
  dirección) y como mucho 10 por código.
- **M15.** `tandaDe` usa la lectura de JSON de `comun/temas.ts`.

**Lo que salió al correr las e2e (17-espejo y 20-conexion).** Fallaban de a ratos, sobre todo al
recargar la computadora con el celular abierto: la computadora quedaba «Por el servidor» y anotaba
que la red no deja la directa, o un mensaje del celular no le llegaba. Eran varias carreras, todas
arregladas en el módulo y cada una con una prueba que falla sin el arreglo:

1. Al volver a abrirse el canal con otros temas, el otro lado cortaba su intento y este no. Ahora
   el canal avisa que se cerró y los dos empiezan de nuevo.
2. El que recibe una oferta vieja que llegó tarde la contestaba, y la nueva quedaba sin respuesta;
   y las señales de un intento anterior hacían fallar al nuevo. Ahora cada intento tiene un número
   que crece: se contesta siempre la oferta más nueva y se descarta lo de otro intento.
3. Si el otro se recargaba mientras acá había una directa, esta no se enteraba hasta que se cortara.
   Ahora, si por el servidor saluda una época nueva del otro, se deja la directa y se reencuentran.
4. Lo que llegaba por la directa antes del aviso de «abierto» se perdía. Ahora se guarda y se
   entrega enseguida.
5. Si igual se perdía un dato, la entrega confiable no lo recuperaba hasta abrir otro camino. Ahora
   el que recibe un dato adelantado saluda una vez y el otro reenvía lo que falta.

Además, `tests/e2e.sh` no volvía a construir el cliente web cuando cambiaba solo el módulo: la
huella ahora incluye `microservices/conexion`. Con todo eso, 17-espejo pasó 24 veces seguidas.

**Documentación.** `plan.md` puesto al día (árbol, tabla del indicador, temas, la sesión nueva por
`POST …/estado`, el rechazo con la lista, topes); decisiones 97, 157 y 158 marcadas como precisadas
por la 160; ADR-027 nombra `/canal`; E22, E32 y RF-144 corregidos; `estado.yml` con `canal.test.ts`.
