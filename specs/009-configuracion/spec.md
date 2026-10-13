# Feature Specification: Configuración

**Feature Branch**: `009-configuracion`

**Created**: 2026-10-13

**Status**: Aprobada la historia 1; la historia 2 espera la aprobación de Carlos

**Maquetas**: Aprobadas

**Input**: «Agregá en Más una opción de configuración; en esa pantalla vamos a ir agregando cosas. En principio que esté la opción de habilitar o deshabilitar las animaciones.»

## Clarifications

### Session 2026-10-13

- Q: ¿De quién es la preferencia de las animaciones? → A: De cada persona en su dispositivo: la elige ahí y no cambia nada de los demás.
- Q: ¿Cómo arranca? → A: Habilitada.
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
- **E11** **Given** la opción habilitada y sin nada por enviar, **When** se la deshabilita, **Then** se borra del celular todo lo guardado, salvo lo mínimo.
- **E12** **Given** la opción habilitada y con ventas u otros cambios todavía sin enviar, **When** se la quiere deshabilitar, **Then** no deja, y dice cuántos cambios faltan enviar y que se deshabilita cuando se manden.
- **E13** **Given** la aplicación abierta en la computadora, **When** se mira Configuración, **Then** la opción no aparece y la computadora sigue guardando como siempre.
- **E14** **Given** un celular que venía usando la aplicación antes de este cambio, con datos guardados, **When** se actualiza, **Then** queda deshabilitada y lo guardado se borra, salvo que haya cambios sin enviar: en ese caso queda habilitada hasta que se manden, y lo dice.

[NEEDS CLARIFICATION: con la opción deshabilitada, el catálogo ya no puede quedar guardado. Hay dos formas de buscar: (a) bajar el catálogo entero a la memoria cada vez que se abre la aplicación (la búsqueda sigue siendo instantánea, pero abrir tarda unos segundos más y gasta datos: se estima medio mega por apertura, sin medir todavía); o (b) buscar en el servidor en cada consulta (no baja nada, pero cada búsqueda espera a la red y hay que construir esa búsqueda en el servidor). Propuesta: (a).]

[NEEDS CLARIFICATION: E12 y E14 son propuestas del agente, para no perder ventas que todavía no llegaron al servidor. ¿Están bien?]

## Requirements

### Functional Requirements

- **RF-80**: Más tiene la opción «Configuración», que abre una pantalla con las preferencias de la aplicación. La ve cualquier usuario con sesión. Cada preferencia dice en una línea qué cambia. La primera es «Animaciones»: habilitar o deshabilitar el movimiento al navegar (decisión 78). Se guarda en el dispositivo, vale en el momento y arranca habilitada.

- **RF-81**: En el celular, guardar datos del negocio en el dispositivo para trabajar sin conexión es una preferencia de cada persona (RF-80), que arranca deshabilitada. Deshabilitada, el celular guarda solo lo mínimo para mantener la sesión y el vínculo (menos de 150 KB, sin contar los archivos de la aplicación), y sin conexión no registra ni guarda nada. Habilitada, guarda y trabaja sin conexión como la computadora. No aplica a la computadora.

### Key Entities

- **Preferencia del dispositivo**: un valor que se guarda en el dispositivo (no en el servidor) y no se borra al salir de la sesión. Hoy: `animaciones` (sí o no).

## Success Criteria

- Cambiar la opción lleva un toque y se nota en la navegación siguiente.

## Assumptions

- El deslizamiento entre pantallas existe solo en el celular; en la computadora la opción apaga el movimiento de ventanas y avisos.
- Otras opciones (por ejemplo, el guardado para trabajar sin conexión en el celular) se sumarán a esta pantalla con su propia especificación.
