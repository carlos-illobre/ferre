# Feature Specification: Avisos sin consultas

**Feature Branch**: `025-avisos-sin-consultas`

**Created**: 2026-10-25

**Status**: Aprobada (Carlos, 2026-10-25)

**Maquetas**: No lleva pantallas: ninguna pantalla cambia de aspecto.

**Input**: Carlos, el 2026-10-25, después de sacar el timer de la versión nueva (decisión 157) y
el de la sesión cerrada (decisión 158): «rediseñemos lo de ese temporizador […] poné foco en
minimizar el consumo de datos». Agrupó la comunicación de la aplicación por para qué sirve y
pidió rediseñar cuatro grupos sin temporizadores que consulten la red: **esperar algo que pasa
del otro lado** (temporario, como el código QR, o permanente, como la versión nueva), **saber si
hay conexión**, **trabajar sin conexión** y el **respaldo de la conexión entre dispositivos**.
Las transacciones y lo que pasa dentro del servidor quedan afuera. «Los permanentes son los
críticos, podemos sacrificar precisión con tal de minimizar el consumo de ancho de banda. En los
temporarios podemos gastar un poco más de ancho de banda para garantizar tiempo real.» Y sobre
el código: «quiero un código reutilizable para la funcionalidad que ocurra en el futuro, que sea
fácil de extender y simple de leer» (RNF-70).

**Lo que pasa hoy** (medido en el código el 2026-10-25):

- La entrada de la computadora pregunta cada 2 segundos si escanearon su código QR, y cada 30
  segundos si el servidor contesta (el cartel «En línea»). Una computadora que queda en la
  entrada gasta unos 2 MB por hora en eso.
- «Vincular el celular» pregunta cada 2 segundos si el celular ya leyó el código.
- Con la aplicación adentro, cada 60 segundos se intenta mandar lo que quedó pendiente (solo
  usa la red si hay algo).
- La versión nueva y la sesión cerrada se buscan al volver a la aplicación y al volver la red
  (decisiones 157 y 158).
- El celular y la computadora vinculados tienen cada uno una conexión abierta con el servidor
  todo el tiempo, con un latido cada 25 segundos, aunque se estén hablando directo por el wifi
  (specs/023).

## Clarifications

### Session 2026-10-25

- Q: ¿Qué temporizadores se sacan? → A: Solo los que consultan la red. Los que no la usan (la cuenta regresiva del código QR en pantalla) se quedan: lo que importa es el consumo de datos.
- Q: ¿Cómo se entera la aplicación de algo permanente (versión nueva, sesión cerrada)? → A: Sin consultas propias: viaja en las respuestas a los pedidos que la aplicación ya hace. Si la aplicación no se está usando, no hace falta ninguna consulta, ni al volver a ella.
- Q: ¿Y de algo temporario (el código QR)? → A: En el momento: si alguien pidió un código QR, es muy probable que lo escaneen enseguida. Vale gastar un poco de datos, solo mientras el código está en pantalla.
- Q: ¿Se puede sin conexiones abiertas ni latido? → A: El servidor no tiene otra forma de avisar en el momento sin que el dispositivo pregunte. Las notificaciones push no dejan conexiones en nuestro servidor, pero piden permiso a cada persona y quedan para la segunda etapa (decisión 152). Se acepta una conexión abierta con latido solo mientras hay un código QR en pantalla o un vínculo que no pudo ir directo.
- Q: ¿Qué tan exacto es el indicador de conexión? → A: Exacto mientras haya una conexión abierta; si no, dice lo último que se supo y se corrige con el próximo pedido. Un wifi sin internet puede mostrar «En línea» hasta entonces. Carlos lo acepta.
- Q: ¿El vínculo usa la misma conexión? → A: Sí, ahora: un solo canal por dispositivo. El servidor sirve para armar la conexión directa y, armada, se deja; queda solo como respaldo si la directa no se pudo.
- Q: ¿Dónde vive el código? → A: En el módulo de comunicación de specs/023, con sus reglas (RNF-68).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Lo que se espera en un momento llega en el momento, y solo ese rato gasta (Priority: P1)

Cuando una pantalla espera algo puntual (que escaneen el código QR para entrar a la computadora,
que el celular lea el código para vincularse), la aplicación se entera en el momento, sin
preguntar a ritmo fijo, y deja de gastar apenas esa pantalla ya no lo espera.

**Why this priority**: es lo que hoy más datos gasta.

**Independent Test**: mostrar el código QR de entrada, escanearlo con el celular y ver que la
computadora entra sola en un instante; contar los pedidos que hizo mientras esperaba.

**Acceptance Scenarios**:

- **E01** **Given** la entrada de la computadora con su código QR en pantalla, **When** un celular lo escanea y aprueba la entrada, **Then** la computadora entra en menos de 2 segundos, sin haber preguntado nada a ritmo fijo.
- **E02** **Given** «Vincular el celular» con su código en pantalla, **When** el celular lo lee, **Then** la computadora queda vinculada en menos de 2 segundos, sin haber preguntado nada a ritmo fijo.
- **E03** **Given** un código QR en pantalla, **When** pasa el tiempo sin que nadie lo escanee, **Then** mientras tanto la aplicación no hace ningún pedido; la conexión abierta solo lleva el latido del servidor.
- **E04** **Given** un código QR en pantalla, **When** la cuenta regresiva llega a cero, **Then** pide un código nuevo, como hoy; si la ventana está tapada, lo pide al volver a ella.
- **E05** **Given** una pantalla que esperaba algo, **When** se sale de ella, se entra, se vincula o la aplicación queda oculta, **Then** la conexión abierta para esperarlo se cierra, salvo que otra cosa a la vista la siga necesitando. Al volver a la vista se abre de nuevo y el servidor cuenta cómo está lo esperado (E06).
- **E06** **Given** un código QR en pantalla, **When** la conexión se corta y vuelve, **Then** el servidor le cuenta cómo está lo que se esperaba: si lo aprobaron mientras tanto, la computadora entra igual.
- **E07** **Given** dos cosas que se esperan a la vez en el mismo dispositivo, **When** están las dos, **Then** usan una sola conexión abierta.

---

### User Story 2 - Lo de siempre (versión nueva, sesión cerrada) llega sin gastar nada (Priority: P1)

Lo que puede pasar en cualquier momento y casi nunca pasa no tiene consultas propias: la
aplicación se entera con las respuestas a lo que ya pide. Se sacrifica precisión para no gastar.

**Why this priority**: está todo el tiempo, en todos los dispositivos.

**Independent Test**: dejar la aplicación abierta sin usarla, publicar una versión nueva y cerrar
la sesión a distancia; ver que no hace ningún pedido, y que al usarla se entera de las dos.

**Acceptance Scenarios**:

- **E08** **Given** la aplicación abierta sin usarse, a la vista u oculta, **When** pasa cualquier tiempo, **Then** no hace ningún pedido al servidor ni busca versión nueva: ni por timer, ni al volver a ella, ni al volver la red.
- **E09** **Given** que hay una versión nueva, **When** la aplicación hace su próximo pedido al servidor, **Then** la respuesta lo dice (cada respuesta trae lo permanente que el servidor tenga para decir, y la aplicación reacciona solo cuando un valor cambia) y la aplicación busca la versión nueva (decisión 54 para cómo se actualiza). Reemplaza a la búsqueda al volver a la aplicación de la decisión 157.
- **E10** **Given** una sesión cerrada a distancia o un usuario desactivado, **When** el dispositivo hace su próximo pedido, **Then** vuelve a la entrada en ese momento. Reemplaza a la consulta al volver a la aplicación de la decisión 158.
- **E11** **Given** un dispositivo con una conexión abierta por otro motivo (un código QR en pantalla, un vínculo por el servidor), **When** hay una versión nueva o le cierran la sesión, **Then** se entera en el momento por esa conexión, sin gastar más.

---

### User Story 3 - Saber si hay conexión, sin preguntar (Priority: P1)

Los indicadores de conexión («En línea» en la entrada de la computadora, «En línea · todo
enviado» adentro) se arman con lo que ya pasa: las respuestas del servidor, los avisos del
navegador de que se fue o volvió la red y las conexiones abiertas. No preguntan nada.

**Why this priority**: el de la entrada pregunta hoy cada 30 segundos.

**Independent Test**: dejar la entrada abierta, cortar la red y volverla, y ver que el cartel
cambia sin que la aplicación haya preguntado nada a ritmo fijo.

**Acceptance Scenarios**:

- **E12** **Given** la entrada de la computadora, **When** abre la conexión para esperar el código QR, **Then** dice «En línea»; si esa conexión se corta, dice «Sin conexión» en el momento y vuelve sola; mientras la abre, «Conectando…». Si al abrir la entrada el servidor no contesta (con la red bien), dice «Sin conexión» y el código se vuelve a pedir cuando alguien toca la pantalla o vuelve a la ventana, o cuando el navegador avisa que volvió la red: no a ritmo fijo.
- **E13** **Given** cualquier indicador, **When** el navegador avisa que se fue la red, **Then** dice «Sin conexión» en el momento.
- **E14** **Given** un indicador sin una conexión abierta, **When** pasa el tiempo sin pedidos, **Then** sigue diciendo lo último que se supo; el próximo pedido lo corrige (si falla por la red, «Sin conexión»; si contesta, «En línea»).
- **E15** **Given** un wifi conectado sin salida a internet y sin una conexión abierta, **When** nadie hace nada, **Then** el indicador puede seguir en «En línea» hasta el próximo pedido. Es aceptado.
- **E16** **Given** un indicador nuevo que haga falta en el futuro, **When** se agrega, **Then** se arma diciendo qué mira, sin escribir consultas ni manejo de la red.

---

### User Story 4 - Lo pendiente sale cuando vuelve la conexión, sin reintentos a ritmo fijo (Priority: P2)

Con «Trabajar sin conexión» habilitado en Configuración (RF-84), lo que quedó sin mandar sale
cuando hay una señal de que volvió la conexión. Deshabilitado, no se trabaja sin conexión y no
hay nada pendiente.

**Why this priority**: reemplaza un reintento cada 60 segundos.

**Independent Test**: con el guardado habilitado, cobrar sin red, volver la red y ver que la
venta sube sola, sin reintentos a ritmo fijo.

**Acceptance Scenarios**:

- **E17** **Given** algo pendiente, **When** el navegador avisa que volvió la red, **Then** se manda en ese momento.
- **E18** **Given** algo pendiente y un microcorte del que el navegador no avisó, **When** cualquier pedido al servidor vuelve a contestar, **Then** se manda en ese momento.
- **E19** **Given** nada pendiente, **When** vuelve la red, **Then** no se manda nada ni se pregunta nada.
- **E20** **Given** «Trabajar sin conexión» deshabilitado, **When** se corta la red, **Then** no se registra nada (RF-84) y no hay nada que mandar después.

---

### User Story 5 - El vínculo usa el servidor solo para encontrarse, o de respaldo (Priority: P1)

El celular y la computadora vinculados usan el servidor para armar la conexión directa por el
wifi; armada, dejan la conexión con el servidor. Si la directa no se puede, el servidor queda de
respaldo, por el mismo canal que usa todo lo demás (User Story 1).

**Why this priority**: hoy cada dispositivo vinculado tiene una conexión abierta todo el día.

**Independent Test**: vincular, ver que se arma la directa y que ninguno de los dos queda con
una conexión abierta con el servidor; mandar un código y una foto.

**Acceptance Scenarios**:

- **E21** **Given** un celular y una computadora vinculados en un wifi que deja la directa, **When** se arma, **Then** los dos cierran la conexión con el servidor y siguen hablándose; el indicador dice «Directa».
- **E22** **Given** la directa armada, **When** uno de los dos se cierra o se va del wifi, **Then** el otro se entera por la directa y vuelve al canal a esperarlo; el indicador lo dice («Solo en …»).
- **E23** **Given** la directa que se cortó o que no se pudo armar, **When** hace falta, **Then** abren el canal con el servidor para volver a encontrarse o para ir por el servidor (specs/023: no se reintenta la directa sola si los dispositivos o la red no la soportan).
- **E24** **Given** el vínculo por el servidor (sin directa), **When** la aplicación queda oculta, **Then** cierra el canal y lo abre al volver a la vista; lo que el otro mande mientras tanto le llega al volver, como cuando la aplicación está cerrada.
- **E25** **Given** un dispositivo vinculado por el servidor que además muestra un código QR, **When** están las dos cosas, **Then** usa una sola conexión abierta (E07).
- **E26** **Given** todo lo de specs/023 (lector, espejo, pedido de foto, el indicador y su detalle, «Probar conexión directa»), **When** se usa, **Then** sigue igual.

---

### User Story 6 - Agregar un caso nuevo es declararlo (Priority: P2)

Quien programe un caso nuevo (por ejemplo, «avisame cuando el proveedor confirme el pedido»)
declara qué se espera, si es temporario o permanente y qué hacer cuando llega; y del lado del
servidor, avisa. No escribe código de red, conexiones, latidos ni reintentos.

**Why this priority**: es lo que Carlos pidió para lo que venga (RNF-70).

**Independent Test**: en las pruebas del módulo, agregar un caso con una declaración y un aviso
del servidor, y ver que llega, sin código nuevo de red.

**Acceptance Scenarios**:

- **E27** **Given** un caso temporario declarado, **When** el servidor avisa ese tema, **Then** le llega a quien lo espera; al dejar de esperarlo, la conexión se cierra si nadie más la usa.
- **E28** **Given** un caso permanente declarado, **When** el servidor tiene algo para decirle, **Then** le llega con la próxima respuesta o por una conexión ya abierta; nunca abre una conexión por su cuenta.
- **E29** **Given** un caso que se quita, **When** se borra su declaración, **Then** no queda nada más que tocar.

### Edge Cases

- **El servidor se reinicia (una versión nueva) con un código QR en pantalla:** la conexión se corta, vuelve sola y el servidor cuenta cómo está lo esperado (E06); la versión nueva llega en la misma conexión (E11).
- **Se pierde un aviso** (llegó justo cuando la conexión se cortaba): al volver la conexión, el servidor cuenta el estado de lo esperado, no la lista de avisos; nada depende de recibir cada aviso.
- **Muchas pantallas abiertas en la misma computadora:** cada pestaña tiene su canal solo mientras espera algo.
- **Se suelta el vínculo con la directa armada:** quien lo suelta cierra su lado, la directa se corta y el otro vuelve al canal, donde el servidor ya no le da el tema: deja de figurar (023-E26). Si el vínculo vence o se cierra la sesión con la directa armada, el servidor no tiene por dónde avisar: siguen hablándose hasta que uno se cierre o haga un pedido (la sesión cerrada vuelve a la entrada, E10).
- **La sesión vence con un canal abierto:** no pasa en la práctica (la sesión se estira con el uso y el canal solo está abierto con la aplicación a la vista); si pasara, al volver a abrirse el canal el servidor no lo da y la aplicación vuelve a la entrada.
- **Una pantalla que muestra datos del servidor** (tickets, Configuración, Ajustes) los vuelve a traer al volver la red: es la transacción de esa pantalla, que queda fuera de este rediseño.
- **El servidor no guarda avisos para nadie:** lo que importa (que se aprobó la entrada, que se vinculó) ya está guardado como estado; los avisos son la forma de enterarse rápido.

### Seguridad

- **E30** **Given** un canal para esperar la entrada con código QR (todavía sin sesión), **When** se abre, **Then** el servidor exige el secreto de ese código; sin él, no se abre, y la sesión nueva viaja solo a quien lo tiene.
- **E31** **Given** un canal con sesión, **When** alguien pide temas que no son suyos (el vínculo de otro, la entrada de otra computadora), **Then** el servidor no se los da.
- **E32** **Given** que la sesión del canal se cierra (a distancia, al salir o al desactivar a la persona), **When** pasa, **Then** el servidor cierra los canales de esa sesión; si se cerró a distancia o al desactivar, antes lo avisa por el tema de la sesión.
- **E33** **Given** demasiados canales abiertos desde el mismo dispositivo o en total, **When** se pide otro, **Then** el servidor lo rechaza y no se satura; el dispositivo lo dice como «Sin conexión».
- **E34** **Given** un aviso que llega por el canal, **When** no tiene la forma esperada, **Then** se descarta sin romper nada.

## Requirements *(mandatory)*

### Functional Requirements

- **RF-141**: Lo que una pantalla espera en un momento puntual (el código QR de entrada y el de vincular el celular) llega en el momento por un canal abierto solo mientras esa pantalla lo espera; mientras tanto la aplicación no pregunta nada a ritmo fijo. La cuenta regresiva del código, que no usa la red, se queda.
- **RF-142**: Lo que puede pasar en cualquier momento (la versión nueva, la sesión cerrada) no tiene consultas propias: viaja en las respuestas a los pedidos que la aplicación ya hace, o por un canal que ya esté abierto por otro motivo. Si la aplicación no se usa, no consulta nada, tampoco al volver a ella ni al volver la red. Precisa RF-96 (009) y RF-74 (007).
- **RF-143**: Los indicadores de conexión no preguntan nada: dicen lo que muestran las respuestas del servidor, los avisos del navegador y los canales abiertos. Son exactos con un canal abierto; sin él, dicen lo último que se supo. Un indicador nuevo se arma diciendo qué mira.
- **RF-144**: Con «Trabajar sin conexión» habilitado (RF-84), lo pendiente se manda al abrir la aplicación, cuando el navegador avisa que volvió la red o cuando el servidor vuelve a contestar un pedido; si algo quedó sin salir con el servidor contestando (un error suyo), sale con la próxima respuesta del servidor pasado un minuto. No hay reintentos a ritmo fijo. Sin nada pendiente, no usa la red.
- **RF-145**: Cada dispositivo tiene a lo sumo un canal abierto con el servidor, que comparten todas las esperas y el respaldo del vínculo. El celular y la computadora vinculados lo usan para armar la conexión directa y, armada, lo cierran; queda abierto solo como respaldo si la directa no se pudo o mientras esperan encontrarse. Con la aplicación oculta, el canal se cierra; al volver a la vista se abre si algo lo necesita.

### Non-Functional Requirements

- **RNF-70**: Esperar algo del otro lado, saber si hay conexión y mandar lo pendiente se hacen con una sola pieza reutilizable, en el módulo de comunicación de specs/023 y con sus reglas (RNF-68). Un caso nuevo, temporario o permanente, o un indicador nuevo, se agrega declarándolo, sin código de red; quitarlo es borrar su declaración.
- **RNF-71**: En los dispositivos no hay temporizadores que consulten la red. Una aplicación abierta sin código QR en pantalla y sin vínculo por el servidor no gasta datos mientras no se la usa. Un canal abierto gasta solo el latido del servidor (unos 14 KB por hora).

### Key Entities

- **Espera**: lo que alguien en el dispositivo quiere saber del otro lado: un tema, si es temporaria o permanente y qué hacer cuando llega. No se guarda: vive mientras la pantalla la necesita.
- **Canal**: la única conexión abierta de un dispositivo con el servidor, para lo temporario y el respaldo del vínculo. Se abre cuando la primera espera temporaria la necesita y se cierra cuando se va la última.
- **Indicador**: un estado de conexión armado con lo que pasa (respuestas, avisos del navegador, canales).

## Success Criteria *(mandatory)*

- **SC-001**: Una computadora en la entrada, con su código QR, gasta menos de 20 KB por hora en esperar (hoy, unos 2 MB).
- **SC-002**: Una aplicación abierta sin usar, sin código QR y sin vínculo por el servidor, no hace ningún pedido en una hora.
- **SC-003**: Entrar con el código QR y vincular el celular siguen tardando menos de 2 segundos desde que el celular aprueba.
- **SC-004**: Un caso nuevo de espera se agrega con una declaración en el dispositivo y un aviso en el servidor, sin código de red.
