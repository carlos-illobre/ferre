# Feature Specification: Configuración

**Feature Branch**: `009-configuracion`

**Created**: 2026-10-13

**Status**: Borrador

**Maquetas**: Pendientes de aprobar

**Input**: «Agregá en Más una opción de configuración; en esa pantalla vamos a ir agregando cosas. En principio que esté la opción de habilitar o deshabilitar las animaciones.»

## Clarifications

### Session 2026-10-13

- [NEEDS CLARIFICATION: ¿la preferencia de las animaciones es de cada dispositivo (cada persona la elige en su celular) o del negocio (un administrador la fija para todos)? Propuesta: de cada dispositivo.]
- [NEEDS CLARIFICATION: ¿las animaciones arrancan habilitadas o deshabilitadas? Propuesta: habilitadas.]
- [NEEDS CLARIFICATION: la pantalla Configuración, ¿está también en la computadora? Hoy la computadora no anima la navegación, así que ahí quedaría vacía hasta que se sume otra opción. Propuesta: que esté en los dos, y que cada opción aparezca solo donde aplica.]

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
- **E02** **Given** las animaciones habilitadas, **When** se las deshabilita, **Then** desde ese momento cambiar de pantalla, de parte o de pestaña y abrir una hoja no anima nada.
- **E03** **Given** las animaciones deshabilitadas, **When** se cierra la aplicación y se la vuelve a abrir, o se sale de la sesión y se vuelve a entrar, **Then** siguen deshabilitadas en ese dispositivo.
- **E04** **Given** un teléfono con «reducir movimiento» pedido en el sistema, **When** se abre Configuración, **Then** la opción dice que el teléfono ya tiene pedido no animar, y no hay animaciones aunque la opción esté habilitada.
- **E05** **Given** un navegador que no puede guardar la preferencia (modo privado, datos bloqueados), **When** se cambia la opción, **Then** vale mientras la aplicación esté abierta y no da error.
- **E06** **Given** cualquier usuario con sesión, sin importar sus permisos, **When** abre Más, **Then** ve «Configuración» y puede cambiar sus animaciones: no pide ningún permiso.

## Requirements

### Functional Requirements

- **RF-80**: Más tiene la opción «Configuración», que abre una pantalla con las preferencias de la aplicación. La ve cualquier usuario con sesión. Cada preferencia dice en una línea qué cambia. La primera es «Animaciones»: habilitar o deshabilitar el movimiento al navegar (decisión 78). Se guarda en el dispositivo, vale en el momento y arranca habilitada.

### Key Entities

- **Preferencia del dispositivo**: un valor que se guarda en el dispositivo (no en el servidor) y no se borra al salir de la sesión. Hoy: `animaciones` (sí o no).

## Success Criteria

- Cambiar la opción lleva un toque y se nota en la navegación siguiente.

## Assumptions

- Las animaciones existen solo en el celular; la computadora no anima la navegación.
- Otras opciones (por ejemplo, el guardado para trabajar sin conexión en el celular) se sumarán a esta pantalla con su propia especificación.
