# Feature Specification: Conexión entre dispositivos

**Feature Branch**: `023-conexion-entre-dispositivos`

**Created**: 2026-10-24

**Status**: Aprobada (Carlos, 2026-10-24)

**Maquetas**: Aprobadas (Carlos, 2026-10-24): la variante A, el indicador en su propio botón; `maquetas/compu-variante-a-cerrado.png`, `maquetas/compu-variante-a-detalle.png`, `maquetas/celu-variante-a-cerrado.png`, `maquetas/celu-variante-a-detalle.png` y los estados en `maquetas/compu-estados.png` y `maquetas/celu-estados.png`.

**Input**: Carlos, el 2026-10-24: «hay dos formas de comunicación, la primera es la típica
cliente servidor […]. La segunda forma es la que usa el celular para comunicarse con la
computadora con la que está vinculada para poder usar la cámara del celular, el lector de
huellas y cualquier otra funcionalidad del celular como dispositivo de la computadora, incluso
como control remoto al manejar la navegación de la computadora desde el celular y viceversa».
Eligió la conexión directa entre los dos dispositivos, con el servidor de respaldo: «quiero que
automáticamente si detecta algún problema, como wifi que aísla equipos, o firefox viejo, que
automáticamente utilice como respaldo al servidor, y que aparezca algún indicador en pantalla
que muestre si está en conexión directa o de respaldo». Y después: «reemplaza todo lo de hoy.
A respaldo se pasa en caso que los dispositivos o la red wifi no soporte la conexión directa, si
no la soporta no tiene sentido seguir reintentando. El indicador que sea un puntito en la
pantalla con un color distinto para cada estado con un pequeño label […] tocarlo para que se
vea el detalle, y que aparezca en los dos». Pidió que todo esto viva en un módulo propio, sin
dependencias, para llevarlo a otros proyectos, con reglas de código propias (RNF-68).

Esta funcionalidad cambia **cómo viajan** los mensajes entre el celular y la computadora. **Qué**
se manda y con qué reglas (quién se empareja, el espejo, el lector, el pedido de foto, pausar y
desvincular) sigue escrito en `specs/007-usuarios-y-acceso/` (RF-76, RF-77), en
`specs/002-catalogo-y-precios/` (RF-08) y en `specs/005-compras-y-stock/` (RF-50).

**Lo que pasa hoy** (medido en el código el 2026-10-24):

- Cada mensaje entre el celular y la computadora (un código escaneado, un cambio de la venta en
  espejo, «la computadora te pide una foto») va del dispositivo al servidor y del servidor al
  otro, aunque los dos estén en el mismo wifi del local.
- Cada dispositivo emparejado mantiene abiertas dos conexiones con el servidor, con un latido
  cada 25 segundos; el celular además pregunta cada cierto tiempo si la computadora le pidió
  algo, y la computadora pregunta cada 2 segundos si llegó la foto pedida. Cada pregunta
  consulta la base.
- Si se corta internet, el celular y la computadora dejan de hablarse aunque sigan en el mismo
  wifi.

## Clarifications

### Session 2026-10-24

- Q: ¿Se suma a lo de hoy o lo reemplaza? → A: Lo reemplaza todo: las conexiones con el servidor para el espejo y los códigos, y las preguntas repetidas.
- Q: ¿Cuándo se pasa al respaldo por el servidor? → A: Cuando los dispositivos o el wifi no soportan la conexión directa (por ejemplo, un wifi que aísla a los equipos o un navegador que no la tiene). Si no la soportan, no se sigue reintentando.
- Q: ¿Cómo se muestra? → A: Un puntito con un color distinto para cada estado y un texto corto, en los dos dispositivos. Al tocarlo se ve el detalle. El diseño se ve después.
- Q: ¿Dónde vive? → A: En un módulo propio, sin dependencias del resto del sistema, para poder usarlo en otros proyectos (RNF-68).
- Q: ¿Qué reglas de código lleva? → A: Solo para este módulo: lo más simple posible, sin código repetido, comentado, y con pruebas unitarias que recorren cada línea (RNF-68). El resto del proyecto no cambia por ahora.
- Q: ¿Cuándo se vuelve a probar la conexión directa? → A: Nunca sola. Solo cuando alguien la pide a mano desde el detalle del indicador.
- Q: ¿Y el pedido de foto con código QR a un celular que no está emparejado? → A: Se saca: la foto se le pide solo al celular emparejado. En la computadora sigue estando elegir un archivo.
- Q: ¿Qué queda para después? → A: Avisarle al celular con la aplicación cerrada y usar la huella del celular para confirmar algo en la computadora van en una segunda etapa.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El celular y la computadora se hablan directo (Priority: P1)

Con el celular y la computadora emparejados y la aplicación abierta en los dos, los mensajes
entre ellos van directo de uno al otro, sin pasar por el servidor. El servidor solo los presenta
al empezar.

**Why this priority**: Es lo que hace que el lector y el espejo respondan en el momento y que el
servidor y la base no carguen con cada mensaje.

**Independent Test**: Emparejar un celular y una computadora en el mismo wifi, escanear diez
códigos y ver que llegan todos, en orden, y que el servidor no recibió ninguno.

**Acceptance Scenarios**:

1. **E01** **Given** el celular y la computadora emparejados, en una red que deja conectarlos directo, **When** se abre la aplicación en los dos, **Then** se conectan directo y el indicador dice «Directa» en los dos.
2. **E02** **Given** la conexión directa, **When** el celular escanea un código o cualquiera de los dos cambia la venta en espejo, **Then** el mensaje llega al otro sin pasar por el servidor.
3. **E03** **Given** la conexión directa, **When** uno manda varios mensajes seguidos, **Then** el otro los recibe todos, una sola vez y en el orden en que salieron.
4. **E04** **Given** la conexión directa ya armada, **When** se corta internet y el wifi sigue, **Then** los dos se siguen hablando directo: el lector y el espejo andan igual.
5. **E05** **Given** la conexión directa, **When** pasa una hora sin mensajes, **Then** ni el celular ni la computadora le preguntaron nada al servidor por el vínculo, y el servidor no consultó la base por eso.

---

### User Story 2 - Si no se puede directo, va por el servidor solo (Priority: P1)

Si los dispositivos o la red no permiten la conexión directa, los mensajes pasan solos por el
servidor, sin que nadie haga nada, y el indicador lo dice. No se sigue intentando la conexión
directa.

**Why this priority**: Sin esto, en una red que aísla a los equipos o con un navegador que no la
tiene, el celular y la computadora no se podrían hablar.

**Independent Test**: Emparejar en una red que no deja conectarlos directo, escanear diez
códigos y ver que llegan todos, en orden, por el servidor, y que el indicador dice «Por el
servidor» en los dos.

**Acceptance Scenarios**:

1. **E06** **Given** el celular y la computadora emparejados, en una red que no deja conectarlos directo, **When** se abre la aplicación en los dos, **Then** a más tardar 5 segundos después se hablan por el servidor y el indicador dice «Por el servidor» en los dos.
2. **E07** **Given** uno de los dos con un navegador que no permite la conexión directa, **When** se abre la aplicación en los dos, **Then** se hablan por el servidor enseguida, sin esperar los 5 segundos.
3. **E08** **Given** la conexión por el servidor, **When** el celular escanea un código o cualquiera de los dos cambia la venta en espejo, **Then** el otro lo recibe igual que con la directa: una sola vez y en orden.
4. **E09** **Given** la conexión por el servidor porque la directa no se pudo, **When** siguen abiertos, se cierra y se vuelve a abrir la aplicación, o uno se queda sin conexión y vuelve, **Then** se siguen hablando por el servidor: la directa no se vuelve a probar sola, ni en ese momento ni después.
5. **E10** **Given** la conexión por el servidor, **When** pasa una hora sin mensajes, **Then** el servidor no consultó la base por el vínculo.
6. **E22** **Given** la conexión por el servidor, **When** en cualquiera de los dos se abre el detalle del indicador y se toca «Probar conexión directa», **Then** se prueba una vez: si se puede, los dos pasan a «Directa»; si no, siguen «Por el servidor» y el detalle dice que se probó y no se pudo, con la hora.
7. **E23** **Given** la conexión directa que andaba, **When** se corta (por ejemplo, el wifi se fue un momento) y los dos se vuelven a encontrar, **Then** se reconectan directo; si esta vez la directa no se puede, pasan al servidor y quedan así, como en E09.

---

### User Story 3 - Se ve cómo están conectados (Priority: P1)

Cada dispositivo emparejado muestra un puntito con un color por estado y un texto corto. Al
tocarlo se ve el detalle.

**Why this priority**: Quien atiende tiene que saber si el celular le está llegando a la
computadora sin tener que probar.

**Independent Test**: Pasar por cada estado (abrir uno solo, abrir los dos, pausar, cortar la
directa) y ver que el puntito y su texto cambian en los dos.

**Acceptance Scenarios**:

1. **E11** **Given** un dispositivo emparejado, **When** se mira la pantalla, **Then** se ve el puntito con uno de estos estados: «Conectando…», «Directa», «Por el servidor», «El otro no está abierto», «En pausa» o «Sin conexión». Cada estado tiene su color, el mismo en el celular y la computadora.
2. **E12** **Given** el puntito a la vista, **When** se lo toca, **Then** se ve el detalle: con qué dispositivo está, por qué camino van los mensajes, cuánto tarda un mensaje en ir y volver, desde cuándo está así y, si va por el servidor, por qué (los dispositivos no la permiten o la red no la deja) y el botón «Probar conexión directa».
3. **E13** **Given** los dos conectados, **When** cambia el estado, **Then** cambia en los dos dispositivos a la vez.
4. **E14** **Given** un dispositivo que no está emparejado, **When** se mira la pantalla, **Then** no hay puntito.

---

### User Story 4 - Lo que ya hacen el celular y la computadora sigue igual por el canal nuevo (Priority: P1)

Todo lo que hoy viaja entre el celular y la computadora pasa por esta conexión, con las mismas
reglas de siempre: el lector de códigos (RF-08), el espejo de la parte en la que están y del
trabajo en curso, pausar y reconectar (RF-77), y el pedido de foto (RF-50, RF-09, RF-80).

**Why this priority**: Reemplaza todo lo de hoy (Carlos, 2026-10-24): si algo quedara por el
camino viejo, habría dos formas de hacer lo mismo.

**Independent Test**: Correr las pruebas de punta a punta del lector, del espejo y del pedido
de foto, con la conexión directa y con la del servidor, y ver que pasan las dos.

**Acceptance Scenarios**:

1. **E15** **Given** el celular emparejado, **When** escanea un código, **Then** pasa en la computadora lo que dice RF-08, por cualquiera de los dos caminos.
2. **E16** **Given** los dos en espejo, **When** uno cambia de parte o cambia el trabajo en curso, **Then** el otro hace lo que dice RF-77, por cualquiera de los dos caminos.
3. **E17** **Given** la computadora que pide una foto, **When** el celular emparejado la saca, **Then** la foto llega a la computadora por la conexión entre los dos, sin que el servidor la guarde.
4. **E24** **Given** la computadora sin un celular emparejado y abierto, **When** hace falta una foto (comprobante, producto o ticket), **Then** no muestra un código QR para pedirla: ofrece elegir un archivo y vincular el celular.
5. **E18** **Given** los dos conectados, **When** uno se queda sin conexión un rato y vuelve, **Then** recibe lo que el otro le mandó mientras tanto, una sola vez y en orden (RF-08).
6. **E19** **Given** dos personas, cada una con su celular y su computadora emparejados, **When** una escanea, **Then** el código llega solo a su computadora (RF-77).

---

### User Story 5 - El módulo se puede llevar a otro proyecto (Priority: P2)

Todo lo de la conexión entre dispositivos vive en un módulo propio, que no sabe nada del
negocio: no conoce ventas, productos ni pantallas. La aplicación le dice quién es la persona y
le pasa mensajes; el módulo los entrega y avisa lo que pasa.

**Why this priority**: Carlos lo quiere usar en otros proyectos.

**Independent Test**: Usar el módulo desde un proyecto vacío, sin nada de Ferrebress, con dos
dispositivos que se mandan mensajes.

**Acceptance Scenarios**:

1. **E20** **Given** el módulo, **When** se mira de qué depende, **Then** no usa nada de Ferrebress ni de otra biblioteca, salvo lo que trae el navegador y el servidor.
2. **E21** **Given** el módulo, **When** se corren sus pruebas unitarias, **Then** recorren cada línea, cada rama y cada función.

---

### User Story 6 - Solo se hablan los dos del emparejamiento, y nada se pierde ni se repite (Priority: P1)

Escenarios de error, de borde y de seguridad (paso 4).

**Why this priority**: Lo que viaja es la venta en curso y las fotos de los comprobantes de una
persona: no lo puede ver ni mandar nadie más, y no se puede perder un código.

**Independent Test**: Con dos emparejamientos de personas distintas, intentar escuchar y mandar
en la sala del otro; desvincular con los dos abiertos; recargar un lado con mensajes pendientes.

**Acceptance Scenarios**:

1. **E25** **Given** un dispositivo que no es uno de los dos lados de un emparejamiento (de otra persona, o sin sesión), **When** intenta escuchar o mandar en la sala de ese emparejamiento, **Then** el servidor lo rechaza y no recibe ni pasa nada.
2. **E26** **Given** los dos conectados, **When** se desvincula desde cualquiera de los dos, vence el vínculo, se cierra a distancia la sesión de uno o se desactiva a la persona, **Then** la conexión se corta en el momento en los dos, el puntito desaparece y ninguno puede seguir mandando por el servidor.
3. **E27** **Given** el servidor, **When** le llega algo para pasar que no tiene la forma de una tanda de mensajes, o es más grande que lo permitido, **Then** lo rechaza y no se lo pasa al otro.
4. **E28** **Given** un dispositivo, **When** le llega un mensaje que no entiende, **Then** lo descarta sin romper la conexión.
5. **E29** **Given** mensajes que uno mandó y el otro todavía no confirmó, **When** el otro recarga la aplicación, **Then** al volver a encontrarse le llegan los que faltaban, una sola vez y en orden, y no los que ya había recibido antes de recargar.
6. **E30** **Given** una foto, **When** el celular la manda por cualquiera de los dos caminos, **Then** llega entera a la computadora.
7. **E31** **Given** la conexión directa, **When** se arma, **Then** no se usa ningún servicio de terceros ni se abre ningún puerto en el servidor.
8. **E32** **Given** el celular emparejado, **When** escanea un código con la computadora cerrada, **Then** dice que va a llegar cuando se abra la computadora, y llega al abrirla, una sola vez.
9. **E33** **Given** quien tiene «Administrar el sistema», **When** abre Más → Sistema, **Then** ya no está «Cada cuánto pregunta el celular emparejado»: no hay nada que preguntar (RF-138).

### Edge Cases

- **Uno de los dos cierra la aplicación o se apaga la pantalla del celular:** el otro pasa a «El
  otro no está abierto» y guarda lo que no pudo entregar; al volver, se conectan de nuevo y se
  entrega (E18).
- **La directa andaba y se corta** (se fue el wifi un momento): al volver a encontrarse se
  reconectan directo; si no se puede, pasan al servidor y quedan así (E23).
- **Se probó a mano y no se pudo:** siguen por el servidor; no se vuelve a probar hasta que
  alguien lo toque otra vez.
- **Lo que se sabe de la directa se recuerda:** que este par de dispositivos va por el servidor
  sigue valiendo aunque se cierre la aplicación, hasta que se pruebe a mano o se vuelvan a
  vincular.
- **El celular está con datos móviles y la computadora en el wifi:** no se pueden conectar
  directo; van por el servidor.
- **Sin internet en los dos y sin la directa armada:** no se pueden encontrar; el indicador dice
  «Sin conexión». Lo que se manda queda guardado mientras la aplicación esté abierta y se entrega
  al conectarse.
- **Un mensaje llega dos veces** (se cortó justo después de mandarlo): se entrega una sola vez.
- **Un mensaje de un dispositivo que no es el emparejado:** no se acepta.
- **La foto con la conexión por el servidor:** el servidor la pasa sin guardarla.
- **Desvincular** (RF-77) corta la conexión en los dos y saca el puntito.

## Requirements *(mandatory)*

### Functional Requirements

- **RF-136**: El celular y la computadora emparejados se hablan por una conexión directa entre
  los dos, sin pasar por el servidor, cuando los dos dispositivos y la red lo permiten. El
  servidor solo los presenta al empezar y comprueba que son dos sesiones del mismo usuario,
  emparejadas (RF-77).
- **RF-137**: Si los dispositivos o la red no permiten la conexión directa, los mensajes pasan
  solos por el servidor, a más tardar 5 segundos después de intentarla, y la directa no se
  vuelve a probar sola nunca: solo cuando alguien la pide desde el detalle del indicador
  (RF-139). Por los dos caminos
  cada mensaje llega una sola vez y en orden, y lo que no se pudo entregar se entrega al
  reconectar. El servidor no guarda los mensajes que pasa.
- **RF-138**: Nada del vínculo corre solo a ritmo fijo contra el servidor ni contra la base: no
  hay preguntas repetidas. Lo único periódico es lo que mantiene viva la conexión abierta.
- **RF-139**: Cada dispositivo emparejado muestra un indicador con el estado de la conexión
  (Conectando…, Directa, Por el servidor, El otro no está abierto, En pausa, Sin conexión), un
  color por estado y un texto corto, iguales en el celular y la computadora. Al tocarlo muestra
  con quién está, por qué camino, cuánto tarda un mensaje, desde cuándo y, si va por el
  servidor, por qué, con un botón para probar la directa de nuevo.
- **RF-140**: Todo lo que viaja entre el celular y la computadora usa esta conexión: el lector
  de códigos (RF-08), el espejo y la pausa (RF-77) y el pedido de foto (RF-50). No queda otro
  camino para lo mismo. La foto se le pide solo al celular emparejado: el pedido de foto con
  código QR a cualquier celular se saca, y en la computadora sigue estando elegir un archivo.

### Non-Functional Requirements

- **RNF-68**: La conexión entre dispositivos es un módulo propio que se puede llevar a otro
  proyecto: no depende de nada del sistema ni de bibliotecas de terceros, y no conoce reglas
  del negocio; se comunica con la aplicación solo por avisos y por una interfaz chica. Para este
  módulo, y solo para él (Carlos, 2026-10-24): cada pieza hace una sola cosa y con la menor
  cantidad de caminos posible; no hay código repetido; cada pieza lleva un comentario que dice
  qué hace; y sus pruebas unitarias recorren el 100 % de las líneas, ramas y funciones: una
  línea que ninguna prueba recorre no se escribe. Es una excepción al principio VI de la
  constitución («sin meta de cobertura»), que sigue valiendo para el resto.

### Key Entities

- **Conexión entre dispositivos**: la de un celular y una computadora emparejados, con su estado
  (los de RF-139), el camino (directa o por el servidor), por qué no es directa si no lo es,
  cuándo cambió y, si la directa no se pudo, que se recuerda hasta probarla a mano.
- **Mensaje**: lo que un dispositivo le manda al otro, con su número de orden. No se guarda en
  el servidor.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con la conexión directa en el mismo wifi, un código escaneado aparece en la
  computadora en menos de 200 ms.
- **SC-002**: Con la conexión por el servidor, en menos de 1 segundo con buena conexión.
- **SC-003**: Un celular y una computadora emparejados, abiertos 8 horas sin usar, no generan
  ninguna consulta a la base (hoy, cientos por día).
- **SC-004**: En una red que no permite la directa, en 5 segundos o menos ya se hablan por el
  servidor.
- **SC-005**: Ningún mensaje se pierde ni se repite al pasar de un camino al otro o al
  reconectar.

## Assumptions

- Lo que viaja y sus reglas no cambian: quién se empareja, cuánto dura el vínculo, el espejo, el
  lector y la pausa siguen como están en 002 y 007. Cambia una sola regla de 005 (RF-50) y de
  002 (RF-09): la foto ya no se pide con un código QR a cualquier celular, sino al emparejado.
- Queda para una segunda etapa (Carlos, 2026-10-24: «enfocate más que nada en la conexión»):
  avisarle al celular con la aplicación cerrada (notificaciones) y usar la huella del celular
  para confirmar algo en la computadora.
- La conexión directa necesita internet para armarse, porque el servidor los presenta; una vez
  armada, sigue sin internet mientras el wifi siga.
- La conexión directa no usa servicios de terceros: si los dos no están en la misma red, va por
  el servidor.
- Lo que no se pudo entregar se guarda en la memoria del dispositivo mientras la aplicación está
  abierta; si se cierra, se pierde, como hoy la venta en curso (ADR-022).
- Los textos del indicador y sus colores los define la maqueta, que Carlos ve después.
