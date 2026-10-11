# Feature Specification: Mejoras y errores

**Feature Branch**: `008-mejoras-y-errores`

**Created**: 2026-10-11

**Status**: Aprobada

**Input**: «En Más quiero una pantalla nueva que permita al usuario crear tickets con mejoras y sugerencias. Debe poder escribir y subir fotos. La idea es que pueda reportar bugs que encuentre, con capturas de pantalla, o sugerencias de nuevas funcionalidades o mejoras.»

## Clarifications

### Session 2026-10-11

- Q: ¿Dónde quedan los tickets? → A: En la misma aplicación, no en un servicio externo.
- Q: ¿Qué seguimiento tiene un ticket? → A: Dos estados: abierto y resuelto. Al resolverlo se puede dejar una nota, y se puede reabrir.
- Q: ¿Quién ve los tickets? → A: Todos los usuarios ven todos los tickets.
- Q: ¿Qué pasa sin conexión? → A: El ticket se guarda en el dispositivo, con sus fotos, y se envía solo cuando vuelve la conexión.

## User Scenarios & Testing

### User Story 1 - Avisar de un error o proponer una mejora (Priority: P2)

Quien usa la aplicación encuentra algo que no anda, o se le ocurre algo que falta. Abre
«Mejoras y errores» dentro de Más, elige si es un error o una idea, lo cuenta con sus
palabras y, si quiere, suma fotos o capturas de pantalla. Lo envía y sigue trabajando.

**Why this priority**: La aplicación se está probando en el local; lo que se encuentra hoy
se cuenta de palabra y se pierde. No frena el mostrador, por eso no es P1.

**Independent Test**: Enviar un ticket con una captura desde el celular y verlo, con su
foto, desde la computadora de otro usuario.

**Acceptance Scenarios**:

1. **Given** un usuario en «Mejoras y errores», **When** elige «error», escribe qué pasó y envía, **Then** el ticket queda abierto en la lista, con su texto, quién lo escribió, cuándo y desde qué dispositivo.
2. **Given** un ticket que se está escribiendo, **When** suma fotos o capturas (desde la cámara o la galería en el celular; eligiendo archivos o pegándolas en la computadora), **Then** las ve en miniatura, puede quitar cualquiera antes de enviar, y viajan con el ticket. Son hasta 5 por ticket.
3. **Given** un ticket sin texto, **When** quiere enviarlo, **Then** se le pide que cuente qué pasó; el texto es lo único obligatorio.
4. **Given** el dispositivo sin conexión, **When** envía un ticket, **Then** queda guardado en el dispositivo con sus fotos, figura como «por enviar», y se envía solo cuando vuelve la conexión, una sola vez.
5. **Given** un ticket que se envió dos veces por un reintento, **When** llega el segundo, **Then** no se duplica.
6. **Given** un archivo que no es una imagen, o más de 5 fotos, **When** se quiere sumar, **Then** no se acepta y se avisa.

### User Story 2 - Seguir los tickets (Priority: P2)

Cualquier usuario abre la lista y ve todos los tickets, propios y ajenos, separados en
abiertos y resueltos. Quien lo arregla lo marca resuelto y puede dejar una nota.

**Independent Test**: Marcar resuelto un ticket con una nota, verlo entre los resueltos con
quién y cuándo, y reabrirlo.

**Acceptance Scenarios**:

1. **Given** tickets de varios usuarios, **When** cualquiera abre la lista, **Then** ve todos, los más nuevos primero, y elige ver los abiertos o los resueltos, con la cantidad de cada uno.
2. **Given** un ticket con fotos, **When** toca una, **Then** la ve en grande.
3. **Given** un ticket abierto, **When** se lo marca resuelto, con o sin nota, **Then** pasa a los resueltos y muestra quién lo resolvió, cuándo y la nota.
4. **Given** un ticket resuelto, **When** se lo reabre, **Then** vuelve a los abiertos y se le borran la nota y quién lo había resuelto.
5. **Given** alguien sin sesión, **When** pide un ticket o una de sus fotos, **Then** no los recibe: las capturas pueden mostrar datos del negocio.
6. **Given** la lista sin conexión, **When** se abre, **Then** se avisa que los enviados se ven cuando vuelva la conexión y los «por enviar» se ven igual.

## Requirements

### Functional Requirements

- **RF-80**: Cualquier usuario puede crear un ticket para avisar de un error o proponer una mejora: elige cuál de los dos es, lo describe con texto (obligatorio) y puede sumar hasta 5 fotos o capturas de pantalla. Cada ticket guarda quién lo escribió, cuándo y desde qué dispositivo y versión de la aplicación. Sin conexión queda guardado en el dispositivo y se envía solo, una sola vez, cuando vuelve.
- **RF-81**: Todos los usuarios ven todos los tickets, separados en abiertos y resueltos. Un ticket abierto se marca resuelto, con una nota opcional, y uno resuelto se puede reabrir; queda quién lo resolvió y cuándo. Crear, resolver y reabrir quedan en el registro de quién hizo qué (RF-71). Los tickets y sus fotos solo se ven con la sesión iniciada.

### Key Entities

- **Ticket**: un aviso de error o una propuesta de mejora, con su texto, sus fotos, su autor, su fecha, el dispositivo y su estado (abierto o resuelto, con la nota de la resolución).

## Success Criteria

- **SC-001**: Enviar un ticket con una captura lleva menos de un minuto desde que se abre la pantalla.
- **SC-002**: Ningún ticket escrito sin conexión se pierde ni se duplica.
