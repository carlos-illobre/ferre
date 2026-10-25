# Feature Specification: Configuración

**Feature Branch**: `009-configuracion`

**Created**: 2026-10-13

**Status**: Aprobada

**Maquetas**: Aprobadas

**Input**: «Agregá en Más una opción de configuración; en esa pantalla vamos a ir agregando cosas. En principio que esté la opción de habilitar o deshabilitar las animaciones.»

## Clarifications

### Session 2026-10-13

- Q: ¿De quién es la preferencia de las animaciones? → A: De cada persona en su dispositivo: la elige ahí y no cambia nada de los demás.
- Q: ¿Cómo arranca? → A: Habilitada.
- Q: Con el guardado deshabilitado, ¿cómo se busca en el catálogo? → A: Lo elige cada persona en Configuración entre bajarlo a la memoria al abrir o buscar en el servidor; cada opción explica su ventaja y su desventaja. (Ya no vale: desde specs/018 se busca siempre en el servidor y la opción se sacó, decisión 138.)
- Q: ¿Qué pasa con las ventas sin enviar al deshabilitar el guardado? → A: Se pierden. Es un caso extremo y Carlos lo acepta.
- Q: ¿Qué es «no guardar nada»? → A: Guardar lo mínimo para mantener la sesión y el vínculo: menos de 150 KB, sin contar los archivos de la aplicación. Nada de productos, ventas ni listas.
- Todo lo que hay en Configuración es personal: de esa persona en ese dispositivo.

### Session 2026-10-17

- Q: ¿Qué más va en Configuración? → A: Todo lo que la persona puede decidir para sí misma: sus celulares con huella y su vínculo entre celular y computadora, que estaban en Más → Usuarios, pestaña Sesiones, que se sacó (decisión 100). Las sesiones abiertas no: cerrar la de otro es cosa de quien administra, porque es la respuesta a un celular perdido (decisión 99).
- Las maquetas `maquetas/celular-configuracion-propio.png` y `maquetas/compu-configuracion-propio.png` las aprobó Carlos el 2026-10-17: debajo de las preferencias, «Mis celulares con huella» y «Vínculo entre celular y computadora» (con qué está vinculado, hasta cuándo y «Desvincular»).
- Q: ¿Puede una opción estar en Configuración y en Sesiones? → A: No: cada cosa en un solo lugar. Por eso la sesión del propio dispositivo sale de la lista de sesiones (se cierra con «Salir»), los celulares propios no figuran en Sesiones y los días que dura el vínculo no figuran en Configuración.
- Q: ¿La pantalla está también en la computadora? → A: Carlos lo dejó a criterio del agente, por lo más simple y consistente: está en los dos, como todas las opciones de Más (decisión 47), y la opción de las animaciones vale en los dos. En la computadora no hay deslizamiento entre pantallas, pero sí el movimiento de las ventanas y los avisos, que también se apaga.
- La maqueta del celular se le mostró a Carlos el 2026-10-13 junto con estas preguntas; las contestó sin pedir cambios.

## User Scenarios & Testing

### User Story 1 - Elegir si la aplicación se anima (Priority: P3)

Quien usa la aplicación en el celular abre Más → Configuración y decide si quiere que las
pantallas se animen al navegar. El cambio vale en el momento, sin recargar, y queda elegido
para las próximas veces en ese dispositivo.

**Why this priority**: Es comodidad: no cambia ninguna operación del negocio.

**Independent Test**: Con las animaciones deshabilitadas, entrar a una pantalla de Más la
muestra en el acto, sin deslizarse; al habilitarlas, vuelve a deslizarse.

**Acceptance Scenarios**:

- **E01** **Given** el celular con la aplicación recién instalada, **When** se abre Configuración, **Then** «Animaciones» figura habilitada.
- **E02** **Given** las animaciones habilitadas, **When** se las deshabilita, **Then** desde ese momento cambiar de pantalla, de parte o de pestaña y abrir una hoja o una ventana no anima nada, en el celular y en la computadora.
- **E03** **Given** las animaciones deshabilitadas, **When** se cierra la aplicación y se la vuelve a abrir, o se sale de la sesión y se vuelve a entrar, **Then** siguen deshabilitadas en ese dispositivo.
- **E04** **Given** un teléfono con «reducir movimiento» pedido en el sistema, **When** se abre Configuración, **Then** la opción dice que el teléfono ya tiene pedido no animar, y no hay animaciones aunque la opción esté habilitada.
- **E05** **Given** un navegador que no puede guardar la preferencia (modo privado, datos bloqueados), **When** se cambia la opción, **Then** vale mientras la aplicación esté abierta y no da error.
- **E06** **Given** cualquier usuario con sesión, sin importar sus permisos, **When** abre Más en el celular o en la computadora, **Then** ve «Configuración» y puede cambiar sus animaciones: no pide ningún permiso.

### User Story 2 - Decidir si el celular guarda datos para trabajar sin conexión (Priority: P2)

El celular es del empleado y tiene poco lugar, y en el local hay buena conexión. Por eso el
celular, de arranque, no guarda datos del negocio: guarda solo lo mínimo para mantener la
sesión y el vínculo con la computadora. Quien quiera poder trabajar sin conexión lo habilita
en Configuración, en su celular. La computadora no cambia: sigue guardando como siempre.

**Why this priority**: Cuida el teléfono de quien trabaja. No frena el mostrador mientras haya
conexión.

**Qué se guarda hoy en el dispositivo** (relevado el 2026-10-13):

| Qué | Tamaño | Con la opción deshabilitada |
|---|---|---|
| La sesión, el usuario, el identificador del dispositivo, el vínculo, las preferencias y si la huella está vinculada | Menos de 10 KB | Se sigue guardando |
| El catálogo completo, para buscar sin esperar y sin conexión | Varios megas | No se guarda |
| El stock y los clientes | Cientos de KB | No se guardan |
| Las ventas de los últimos 7 días y lo que está por enviarse (ventas, ingresos, tickets con sus fotos) | Crece con el uso | No se guardan |

Los archivos de la aplicación (lo que se instala) no cuentan.

**Acceptance Scenarios**:

- **E07** **Given** un celular donde la aplicación se abre por primera vez, **When** se mira Configuración, **Then** «Trabajar sin conexión» figura deshabilitada.
- **E08** **Given** la opción deshabilitada, **When** se usa la aplicación con conexión, **Then** todo funciona igual, y en el celular no queda guardado ningún dato del negocio: lo guardado no pasa de 150 KB.
- **E09** **Given** la opción deshabilitada y el celular sin conexión, **When** se intenta registrar una venta, un ingreso, un pedido, un conteo o un ticket, **Then** no se registra ni se guarda, y la aplicación dice que no hay conexión y que para trabajar así hay que habilitarlo en Configuración.
- **E10** **Given** la opción deshabilitada, **When** se la habilita, **Then** el celular baja y guarda los datos, y desde ese momento trabaja sin conexión como antes de este cambio.
- **E11** **Given** la opción habilitada, **When** se la deshabilita, **Then** se borra del celular todo lo guardado, salvo lo mínimo.
- **E12** **Given** la opción habilitada y con ventas u otros cambios todavía sin enviar, **When** se la quiere deshabilitar, **Then** la aplicación avisa cuántos cambios se van a perder y pregunta; si la persona sigue, se pierden. Carlos lo aceptó: es un caso extremo (sin conexión y, a la vez, decidir dejar de guardar).
- **E13** **Given** la aplicación abierta en la computadora, **When** se mira Configuración, **Then** la opción no aparece y la computadora sigue guardando como siempre, también con la ventana angosta.
- **E14** **Given** un celular que venía usando la aplicación antes de este cambio, con datos guardados, **When** se actualiza, **Then** queda deshabilitada y lo guardado se borra, también lo que hubiera sin enviar.

**Cómo se buscan los productos sin guardar el catálogo.** Ya no se elige: desde specs/018 el
catálogo se busca siempre en el servidor, y «Cómo buscar productos» se sacó de Configuración
(decisión 138, 2026-10-20). Los escenarios de esa opción quedan como estaban numerados:

- **E15** **Given** cualquier dispositivo, con «Trabajar sin conexión» habilitada o no, **When** se mira Configuración, **Then** «Cómo buscar productos» no aparece.
- **E16** Ya no vale (decisión 138): lo cubre E15.
- **E17** Ya no vale (decisión 138): el resultado de buscar lo dice specs/018 (E03).
- **E18** Ya no vale (decisión 138): mientras el servidor contesta, specs/018.

**Los textos de la pantalla, que son regla:**

- Trabajar sin conexión, deshabilitada: «Este celular no guarda datos del negocio. Si se corta internet, no se puede registrar nada hasta que vuelva.» Habilitada: «Este celular guarda el catálogo, el stock y lo que falta enviar, para seguir trabajando si se corta internet. Ocupa varios megas.»
- Al deshabilitarla pregunta: «Se va a borrar de este celular el catálogo y lo demás que estaba guardado. ¿Seguir?»; con cambios sin enviar dice cuántos y que se pierden.
- Sin conexión y sin guardado, arriba dice «Sin conexión · no se puede registrar nada», y al intentar registrar: «Sin conexión: no se registró. Este celular no guarda nada; para trabajar sin conexión, habilitalo en Más → Configuración.»
- Mientras consulta: «Buscando en el servidor…».

### User Story 3 - La versión nueva se busca sin timer (Priority: P3)

La aplicación se entera de una versión nueva por lo que pasa, nunca con un timer (decisión 157,
ADR-020): al abrirse, al volver a la vista, al volver la conexión y cuando el servidor, en
cualquier respuesta, dice una versión distinta de la que dijo antes. Configuración ya no tiene
nada para elegir sobre esto. Pedido de Carlos del 2026-10-25: «elimina cualquier temporizador».

**Acceptance Scenarios**:

- **E19** **Given** cualquier dispositivo, **When** se abre Configuración, en el celular o en la computadora, **Then** no está «Buscar versión nueva»: ni botones de tiempo ni llave.
- **E20** **Given** la aplicación a la vista, **When** pasa cualquier tiempo sin que pase nada (ni se vuelve a ella, ni vuelve la conexión, ni contesta el servidor), **Then** no busca versión nueva: no hay timer.
- **E21** **Given** la aplicación abierta, **When** se vuelve a ella (estaba oculta) o vuelve la conexión, **Then** no busca nada por eso: busca con el próximo pedido que haga (decisión 160, specs/025).
- **E22** **Given** la aplicación abierta, **When** el servidor contesta un pedido diciendo una versión distinta de la que dijo en la respuesta anterior, **Then** busca si hay una versión nueva, una sola vez por cada versión distinta.
- **E23** **Given** el servidor contesta siempre la misma versión, o la primera respuesta desde que se abrió, **When** llega, **Then** no busca: la búsqueda al abrir ya se hizo.
- **E24** **Given** un dispositivo que tenía guardado un tiempo o la llave apagada (de la versión anterior), **When** se abre la aplicación, **Then** no cuenta: busca igual que cualquier otro.

Si la encuentra, vale lo de siempre (decisión 54): recién abierta se actualiza sola; si ya se
estaba usando, avisa «Hay una versión nueva» con «Actualizar ahora».
Las opciones las fijó Carlos el 2026-10-16 (decisión 92); el arranque en 15 min lo eligió el
agente, por ser lo más parecido a la media hora de antes.
Maqueta: `maquetas/version-nueva.html`, aprobada por Carlos el 2026-10-16 junto con la regla.

## Requirements

### Functional Requirements

- **RF-83**: Más tiene la opción «Configuración», que abre una pantalla con las preferencias de la aplicación. La ve cualquier usuario con sesión. Cada preferencia dice en una línea qué cambia. La primera es «Animaciones»: habilitar o deshabilitar el movimiento al navegar (decisión 78). Se guarda en el dispositivo, vale en el momento y arranca habilitada.

- **RF-85**: Se sacó (decisión 138, 2026-10-20). Era la elección, con el guardado deshabilitado, entre bajar el catálogo a la memoria al abrir o buscar en el servidor; desde specs/018 el catálogo se busca siempre en el servidor (specs/018, RF-122) y la opción no cambiaba nada. Configuración no la muestra en ningún dispositivo.

- **RF-84**: Guardar datos del negocio en el dispositivo para trabajar sin conexión es una preferencia de cada persona (RF-83), en el celular (arranca deshabilitada) y en la computadora (arranca habilitada; specs/018, decisión 136). Deshabilitada, el celular guarda solo lo mínimo para mantener la sesión y el vínculo (menos de 150 KB, sin contar los archivos de la aplicación), y sin conexión no registra ni guarda nada. Habilitada, guarda lo que falta enviar y deja bajar a mano los datos para buscar sin conexión (specs/018, historia 5); el catálogo ya no se guarda solo.

- **RF-96**: La aplicación busca una versión nueva solo cuando pasa algo, nunca con un timer ni con consultas propias: al abrirse y cuando el servidor contesta un pedido con una versión distinta de la que dijo antes (cada respuesta dice su versión), o lo avisa por un canal que ya esté abierto (decisión 160, specs/025). Si no se la usa, no consulta nada, tampoco al volver a ella ni al volver la conexión. Configuración no tiene nada para elegir sobre esto (decisión 157, ADR-020; reemplaza a las decisiones 91 y 92). En el celular y en la computadora.

- **RF-106**: En Configuración está también lo que cada persona decide para sí misma y no es una preferencia guardada en el dispositivo (decisión 99): **sus celulares con huella** (verlos, vincular el que tiene en la mano y quitar uno; RF-70b) y **su vínculo entre celular y computadora** (con qué dispositivo está vinculado y «Desvincular»; RF-77). Se ven en el celular y en la computadora; vincular con la huella aparece solo en el dispositivo que puede leerla. Nada de esto figura en Más → Usuarios, donde quien tiene «Administrar usuarios» ve en la tarjeta de cada persona sus sesiones y sus celulares con huella, y al final cuántos días dura el vínculo, que Configuración no muestra (decisión 100).

### Key Entities

- **Lo propio que está en el servidor**: los celulares con huella y el vínculo entre celular y computadora de la persona (RF-106). Se guardan en el servidor, son de esa persona y los cambia ella; no son una preferencia del dispositivo.
- **Preferencia del dispositivo**: un valor que se guarda en el dispositivo (no en el servidor) y no se borra al salir de la sesión. Hoy: `animaciones` (sí o no), y `sinConexion` (RF-84).

## Success Criteria

- Cambiar la opción lleva un toque y se nota en la navegación siguiente.

## Assumptions

- El deslizamiento entre pantallas existe solo en el celular; en la computadora la opción apaga el movimiento de ventanas y avisos.
- Otras opciones (por ejemplo, el guardado para trabajar sin conexión en el celular) se sumarán a esta pantalla con su propia especificación.

## Enmienda del 2026-10-20: el catálogo vive en el servidor (specs/018)

Reemplaza la enmienda del 2026-10-12. Ningún dispositivo baja el catálogo solo: cada pantalla le
pide al servidor lo que muestra, de a 50 (RF-122). «Trabajar sin conexión» está también en la
computadora y, habilitada, suma la fila «Datos para trabajar sin conexión», que baja a mano lo que
hace falta para buscar sin internet (specs/018, historia 5). Ver ADR-023.

