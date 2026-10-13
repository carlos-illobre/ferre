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

## Requirements

### Functional Requirements

- **RF-80**: Más tiene la opción «Configuración», que abre una pantalla con las preferencias de la aplicación. La ve cualquier usuario con sesión. Cada preferencia dice en una línea qué cambia. La primera es «Animaciones»: habilitar o deshabilitar el movimiento al navegar (decisión 78). Se guarda en el dispositivo, vale en el momento y arranca habilitada.

### Key Entities

- **Preferencia del dispositivo**: un valor que se guarda en el dispositivo (no en el servidor) y no se borra al salir de la sesión. Hoy: `animaciones` (sí o no).

## Success Criteria

- Cambiar la opción lleva un toque y se nota en la navegación siguiente.

## Assumptions

- El deslizamiento entre pantallas existe solo en el celular; en la computadora la opción apaga el movimiento de ventanas y avisos.
- Otras opciones (por ejemplo, el guardado para trabajar sin conexión en el celular) se sumarán a esta pantalla con su propia especificación.
