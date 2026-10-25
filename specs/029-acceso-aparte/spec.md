# Feature Specification: Acceso en su propio servicio

**Feature Branch**: `029-acceso-aparte`

**Created**: 2026-10-25

**Status**: Borrador, para aprobar

**Maquetas**: No lleva pantallas

**Input**: Carlos, el 2026-10-25 (decisión 164). Es la etapa 5 del plan (`proyecto/tasks.md`,
T144). Quién es cada uno y qué puede (usuarios, roles, permisos, sesiones, huellas, vincular el
celular y sus ajustes) sale de Comercial a un servicio propio con su base. La puerta le pregunta
a Acceso, en cada pedido, quién es la persona y qué puede, y los demás servicios reciben eso
hecho.

## Clarifications

### Session 2026-10-25

- Q: Si Acceso está caído, ¿se sigue trabajando? → A: No contra el servidor: la puerta le pregunta a Acceso en cada pedido, así que cerrar una sesión o desactivar a alguien corta en el momento. La aplicación sigue vendiendo sin conexión y manda todo cuando Acceso vuelve, como cuando no hay internet (Carlos, 2026-10-25, opción A).
- Q: Comercial muestra nombres de personas (faltantes, quién envió o cerró un pedido); ¿de dónde los saca? → A: Guarda el nombre del momento junto con lo que se hizo, como la auditoría: si después le cambian el nombre a alguien, lo viejo muestra el anterior (Carlos, 2026-10-25).
- Q: ¿Qué más va con Acceso? → A: Lo apartado (lo que hizo sin conexión alguien a quien después desactivaron) y la conexión entre dispositivos (023), que dependen de las sesiones y del vínculo (Carlos, 2026-10-25).
- Q: ¿Se mudan las personas de hoy? → A: No: la base de Acceso arranca nueva; se crea el primer usuario con el comando de siempre y todos vuelven a entrar una vez (Carlos, 2026-10-25).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entrar y lo que cada uno puede, desde Acceso (Priority: P1)

**Independent Test**: entrar con Google, con la huella y con el celular; administrar usuarios y roles; cerrar una sesión a distancia; y ver que todo está en la base de Acceso.

**Acceptance Scenarios**:

1. **E01** **Given** una persona autorizada, **When** entra (Google, huella o el celular), **Then** Acceso abre su sesión como hoy.
2. **E02** **Given** una sesión abierta, **When** la aplicación pide algo a cualquier servicio, **Then** la puerta le pregunta a Acceso quién es y qué puede, y el servicio recibe eso hecho, sin consultar a Acceso por su cuenta.
3. **E03** **Given** una sesión cerrada a distancia o una persona desactivada, **When** su dispositivo pide algo, **Then** la puerta lo rechaza en ese mismo pedido.
4. **E04** **Given** quien administra usuarios, **When** crea, cambia o desactiva a alguien, o cambia roles y permisos, **Then** pasa en Acceso con las mismas reglas de hoy (nunca queda nadie que administre, no se desactiva a sí mismo).
5. **E05** **Given** Acceso caído, **When** la aplicación pide algo al servidor, **Then** la puerta contesta que no puede comprobar quién es; la aplicación lo trata como sin conexión y sigue vendiendo con lo que tiene.
6. **E06** **Given** el celular y la computadora vinculados, **When** se usan juntos (el lector, la foto, la pausa), **Then** la conexión entre los dos anda como hoy, ahora desde Acceso.
7. **E07** **Given** lo que hizo sin conexión alguien a quien desactivaron, **When** sube, **Then** queda apartado en Acceso y quien administra lo acepta o descarta como hoy; aceptar repite el pedido original, como quien lo hizo, en el servicio que corresponde.
8. **E08** **Given** cada acción de Acceso (entrar, salir, cambiar a alguien, vincular), **When** sale bien, **Then** Acceso le manda su evento a Auditoría.
9. **E09** **Given** el comando para crear la primera persona, **When** se corre en el contenedor de Acceso, **Then** la crea con todos los roles.

---

### User Story 2 - Los demás servicios no guardan datos de personas (Priority: P1)

**Independent Test**: buscar en Comercial y Tickets tablas o consultas de usuarios, sesiones o roles, y no encontrar nada.

**Acceptance Scenarios**:

1. **E10** **Given** algo hecho por una persona en Comercial (una venta, un faltante, un pedido enviado o cerrado), **When** se muestra quién lo hizo, **Then** sale el nombre guardado en ese momento, sin preguntarle a Acceso.
2. **E11** **Given** Comercial, **When** se busca en su código o en su base, **Then** no hay usuarios, sesiones, roles ni permisos.

---

### Edge Cases

- **El token entre servicios:** solo la puerta y los servicios lo conocen; un pedido que llega a un servicio sin él se rechaza.
- **Los ajustes que hoy viven en el sistema (cuánto recuerda la sesión, cuántos días dura el vínculo):** van con Acceso.

## Requirements *(mandatory)*

### Non-Functional Requirements

- **RNF-76**: Quién es cada uno y qué puede (usuarios, roles, permisos, sesiones, huellas, vincular el celular, lo apartado y sus ajustes) vive en su propio servicio, con su base. La puerta le pregunta en cada pedido y los demás servicios reciben quién es y qué puede, sin guardar datos de personas más que el nombre del momento junto con lo que se hizo.

### Key Entities

- **Acceso**: el servicio y su base, con usuarios, roles, permisos, sesiones, credenciales, vínculos, lo apartado y sus ajustes.

## Success Criteria *(mandatory)*

- **SC-001**: Entrar y usar la aplicación funciona igual que antes; las pruebas de punta a punta pasan sin cambios en las pantallas.
- **SC-002**: Ningún otro servicio tiene tablas de personas, sesiones ni permisos.

## Assumptions

- Todos vuelven a entrar una vez al pasar a esta versión.

## Out of Scope (por ahora)

- Cambiar cómo se entra, los roles o los permisos.
