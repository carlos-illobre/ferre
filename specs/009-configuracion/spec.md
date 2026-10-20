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
- Q: Con el guardado deshabilitado, ¿cómo se busca en el catálogo? → A: Lo elige cada persona en Configuración entre bajarlo a la memoria al abrir o buscar en el servidor; cada opción explica su ventaja y su desventaja.
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

**Cómo se buscan los productos sin guardar el catálogo.** Con «Trabajar sin conexión»
deshabilitada, la persona elige en Configuración una de dos formas, y cada una dice sus
ventajas y desventajas:

| Opción | Ventaja | Desventaja |
|---|---|---|
| **Bajar el catálogo al abrir** (de arranque) | La búsqueda es instantánea y escanear responde en el acto | Abrir la aplicación tarda unos segundos más y gasta datos cada vez |
| **Buscar en el servidor** | No baja el catálogo: abre enseguida y casi no gasta datos | Cada búsqueda y cada código escaneado espera a la red |

- **E15** **Given** «Trabajar sin conexión» deshabilitada, **When** se mira Configuración, **Then** aparece «Cómo buscar productos» con las dos opciones, cada una con su ventaja y su desventaja, y elegida «Bajar el catálogo al abrir».
- **E16** **Given** «Trabajar sin conexión» habilitada, **When** se mira Configuración, **Then** «Cómo buscar productos» no aparece: el catálogo está guardado en el celular.
- **E17** **Given** elegida «Buscar en el servidor», **When** se busca un producto o se escanea un código en Catálogo, Vender, Ingreso, Pedidos o Estanterías, **Then** aparece el mismo resultado que con el catálogo bajado, después de consultar al servidor.
- **E18** **Given** elegida «Buscar en el servidor» y una búsqueda en curso, **When** la red tarda, **Then** la pantalla dice que está buscando; si no hay conexión, lo dice.

**Los textos de la pantalla, que son regla:**

- Trabajar sin conexión, deshabilitada: «Este celular no guarda datos del negocio. Si se corta internet, no se puede registrar nada hasta que vuelva.» Habilitada: «Este celular guarda el catálogo, el stock y lo que falta enviar, para seguir trabajando si se corta internet. Ocupa varios megas.»
- Al deshabilitarla pregunta: «Se va a borrar de este celular el catálogo y lo demás que estaba guardado. ¿Seguir?»; con cambios sin enviar dice cuántos y que se pierden.
- Sin conexión y sin guardado, arriba dice «Sin conexión · no se puede registrar nada», y al intentar registrar: «Sin conexión: no se registró. Este celular no guarda nada; para trabajar sin conexión, habilitalo en Más → Configuración.»
- Cómo buscar productos: «Como este celular no guarda el catálogo, hay dos formas de buscar. Elegí la que te resulte mejor.» y las dos opciones con su ventaja y su desventaja, como en la tabla de arriba.
- Mientras consulta: «Buscando en el servidor…».

### User Story 3 - Elegir cada cuánto se busca una versión nueva (Priority: P3)

La aplicación busca sola si hay una versión nueva al abrirse, al volver a la vista y, mientras
está a la vista, cada tanto (decisión 91, ADR-020). Cada persona elige en Configuración ese
«cada tanto» para su dispositivo: más seguido se entera antes y gasta un poco más de datos.
Pedido de Carlos del 2026-10-16.

**Acceptance Scenarios**:

- **E19** **Given** un dispositivo donde nunca se cambió, **When** se abre Configuración, en el celular o en la computadora, **Then** «Buscar versión nueva» muestra cuatro botones (5 min, 15 min, 1 hora y 24 horas) con 15 min elegido, y su llave prendida, al costado de la descripción, como la de «Animaciones».
- **E20** **Given** elegido otro botón, **When** pasa ese tiempo con la aplicación a la vista, **Then** busca si hay una versión nueva; vale desde que se elige, sin recargar.
- **E21** **Given** la llave apagada («nunca»), **When** pasa cualquier tiempo, se vuelve a la aplicación o vuelve la conexión, **Then** no busca versiones nuevas. Los botones no se muestran. La versión nueva llega solo al cerrar la aplicación del todo y volver a abrirla: eso lo hace el navegador y no se puede apagar.
- **E22** **Given** la llave apagada, **When** se la prende, **Then** vuelven los botones, con el que estaba elegido antes de apagarla, y busca cada ese tiempo.
- **E23** **Given** un botón elegido o la llave apagada, **When** se cierra la aplicación y se la vuelve a abrir, o se sale de la sesión y se vuelve a entrar, **Then** sigue igual en ese dispositivo y no cambia en los demás.
- **E24** **Given** un valor guardado que no es ninguno de los cuatro (de otra versión, o tocado a mano), **When** se abre la aplicación, **Then** vale 15 min.

**Los textos de la pantalla, que son regla:** en el celular, «Cada cuánto, con la app
abierta. Más seguido gasta un poco más de datos.» y, con la llave apagada, «No busca. La
versión nueva llega al cerrar la app y volver a abrirla.»; en la computadora, «Mientras la
aplicación está a la vista, cada cuánto se fija si hay una versión nueva. También se fija al
abrirla y cada vez que se vuelve a ella. Más seguido se entera antes y gasta un poco más de
datos.» y, apagada, «No busca versiones nuevas mientras está abierta. La versión nueva llega
recién al cerrarla y volver a abrirla.»
Las opciones las fijó Carlos el 2026-10-16 (decisión 92); el arranque en 15 min lo eligió el
agente, por ser lo más parecido a la media hora de antes.
Maqueta: `maquetas/version-nueva.html`, aprobada por Carlos el 2026-10-16 junto con la regla.

## Requirements

### Functional Requirements

- **RF-83**: Más tiene la opción «Configuración», que abre una pantalla con las preferencias de la aplicación. La ve cualquier usuario con sesión. Cada preferencia dice en una línea qué cambia. La primera es «Animaciones»: habilitar o deshabilitar el movimiento al navegar (decisión 78). Se guarda en el dispositivo, vale en el momento y arranca habilitada.

- **RF-85** (desde specs/018 el catálogo se busca siempre en el servidor y esta opción no cambia nada; queda a la vista hasta que Carlos decida): Con el guardado deshabilitado (RF-84), la persona elige en Configuración cómo se buscan los productos: bajando el catálogo a la memoria cada vez que abre la aplicación (de arranque), o consultando al servidor en cada búsqueda y en cada código escaneado. Cada opción dice su ventaja y su desventaja. El resultado de buscar es el mismo en las dos. Qué es un celular lo decide el aparato (teléfono o tableta con Android o iOS), no el ancho de la ventana.

- **RF-84**: Guardar datos del negocio en el dispositivo para trabajar sin conexión es una preferencia de cada persona (RF-83), en el celular (arranca deshabilitada) y en la computadora (arranca habilitada; specs/018, decisión 133). Deshabilitada, el celular guarda solo lo mínimo para mantener la sesión y el vínculo (menos de 150 KB, sin contar los archivos de la aplicación), y sin conexión no registra ni guarda nada. Habilitada, guarda lo que falta enviar y deja bajar a mano los datos para buscar sin conexión (specs/018, historia 5); el catálogo ya no se guarda solo.

- **RF-96**: En Configuración, cada persona elige en su dispositivo cada cuánto se busca una versión nueva mientras la aplicación está a la vista: 5 min, 15 min (de arranque), 1 hora o 24 horas. Con su llave apagada la aplicación no busca versiones nuevas mientras está abierta (ni con el timer, ni al volver a ella, ni al volver la conexión); la toma al cerrarla y volver a abrirla. Al abrir y al volver a la aplicación se busca siempre, elija lo que elija (decisión 91, ADR-020). Está en el celular y en la computadora.

- **RF-106**: En Configuración está también lo que cada persona decide para sí misma y no es una preferencia guardada en el dispositivo (decisión 99): **sus celulares con huella** (verlos, vincular el que tiene en la mano y quitar uno; RF-70b) y **su vínculo entre celular y computadora** (con qué dispositivo está vinculado y «Desvincular»; RF-77). Se ven en el celular y en la computadora; vincular con la huella aparece solo en el dispositivo que puede leerla. Nada de esto figura en Más → Usuarios, donde quien tiene «Administrar usuarios» ve en la tarjeta de cada persona sus sesiones y sus celulares con huella, y al final cuántos días dura el vínculo, que Configuración no muestra (decisión 100).

### Key Entities

- **Lo propio que está en el servidor**: los celulares con huella y el vínculo entre celular y computadora de la persona (RF-106). Se guardan en el servidor, son de esa persona y los cambia ella; no son una preferencia del dispositivo.
- **Preferencia del dispositivo**: un valor que se guarda en el dispositivo (no en el servidor) y no se borra al salir de la sesión. Hoy: `animaciones` (sí o no), `sinConexion` y `buscar` (RF-84, RF-85) y cada cuánto se busca una versión nueva (RF-96).

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

