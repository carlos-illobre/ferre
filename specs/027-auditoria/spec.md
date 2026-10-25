# Feature Specification: Auditoría, un servicio que junta lo que hizo cada uno en todos los servicios

**Feature Branch**: `027-auditoria`

**Created**: 2026-10-25

**Status**: Aprobada (Carlos, 2026-10-25)

**Maquetas**: No lleva pantallas («Quién hizo qué» se ve igual)

**Input**: Carlos, el 2026-10-25 (decisiones 164, 165 y 166). Es la etapa 3 del plan
(`proyecto/tasks.md`, T157). Con los servicios separados, lo que hizo cada persona queda en la
base de cada servicio. Un servicio de Auditoría lo junta y arma los reportes. Carlos pidió que
un servicio nuevo, en el futuro, se pueda sumar sin cambiar Auditoría ni la web, y que ningún
servicio dependa de Auditoría para funcionar: mandarle eventos es una opción de cada uno.

## Clarifications

### Session 2026-10-25

- Q: ¿Cómo llegan los eventos a Auditoría? → A: Cada servicio se los manda con un formato único y versionado. No se pierde ninguno: el servicio los anota en su propia base, dentro de su transacción, y después los entrega (decisión 166).
- Q: ¿Auditoría tiene que conocer a los servicios? → A: No: acepta cualquier servicio que mande eventos con el formato, con el token entre servicios. Cada evento trae su texto para personas armado por el servicio que lo conoce (decisión 166).
- Q: ¿Un servicio puede andar sin Auditoría? → A: Sí, es opcional: si su archivo de variables de entorno no dice dónde está Auditoría, no anota ni manda nada. Encendido, tampoco depende de ella: si está caída, los eventos esperan (decisión 166).
- Q: ¿Qué pasa con los eventos que ya hay? → A: Auditoría arranca vacía en los dos ambientes; no se mudan (Carlos, 2026-10-25: no hay datos reales).
- Q: ¿Quién ve los reportes? → A: Quien tiene hoy el permiso de ver «Quién hizo qué» (Carlos, 2026-10-25).
- Q: ¿Cuánto tiempo queda un evento en la base del servicio que lo anotó? → A: Hasta una semana después de que Auditoría confirma que lo guardó (decisión 166).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - «Quién hizo qué» muestra lo de todos los servicios (Priority: P1)

Quien tiene el permiso ve en «Quién hizo qué» una sola lista con lo que se hizo en todos los
servicios, como hoy: con los mismos filtros (persona, tipo, desde, hasta), de a 10 por página,
lo más nuevo primero.

**Why this priority**: es lo que se perdió al separar Procesos y lo que se perdería al separar Tickets y Acceso.

**Independent Test**: hacer algo en Comercial y algo en Procesos, abrir «Quién hizo qué» y ver los dos.

**Acceptance Scenarios**:

1. **E01** **Given** una venta en Comercial y un proceso creado en Procesos, **When** el dueño abre «Quién hizo qué», **Then** ve los dos en una sola lista, lo más nuevo primero, cada uno con quién, cuándo, el nombre de la acción, su detalle y su color (rojo lo anulado, ámbar lo que se revisa).
2. **E02** **Given** la lista, **When** filtra por persona, por tipo o por fechas, **Then** ve solo lo que corresponde, de a 10 por página, con el total.
3. **E03** **Given** una persona sin el permiso de ver «Quién hizo qué», **When** lo pide, **Then** no lo ve.
4. **E04** **Given** un ambiente sin Auditoría, **When** se abre «Quién hizo qué», **Then** dice que no está disponible, sin error.

---

### User Story 2 - Ningún evento se pierde, y ningún servicio depende de Auditoría (Priority: P1)

**Why this priority**: «cada acción queda con el usuario que la hizo» (principio V), y el mostrador no puede dejar de vender por la auditoría.

**Independent Test**: apagar Auditoría, vender, prenderla y ver la venta en «Quién hizo qué».

**Acceptance Scenarios**:

1. **E05** **Given** una acción que se guarda en un servicio con Auditoría encendida, **When** la transacción se confirma, **Then** el evento queda anotado en la base del servicio en la misma transacción; si la transacción se deshace, no queda.
2. **E06** **Given** Auditoría caída, **When** se vende, **Then** la venta se registra igual, y su evento llega a Auditoría cuando vuelve.
3. **E07** **Given** un evento que llegó a Auditoría pero cuya confirmación se perdió, **When** el servicio lo vuelve a mandar, **Then** Auditoría no lo guarda dos veces.
4. **E08** **Given** un servicio que se reinicia con eventos sin entregar, **When** arranca, **Then** los entrega.
5. **E09** **Given** un servicio sin la dirección de Auditoría en su archivo de variables de entorno, **When** se usa, **Then** funciona igual y no anota ni manda eventos.
6. **E10** **Given** un evento entregado hace más de una semana, **When** pasa ese tiempo, **Then** ya no está en la base del servicio que lo anotó; sigue en Auditoría.
7. **E11** **Given** un evento entregado hace menos de una semana, **When** se mira la base del servicio, **Then** todavía está, marcado como entregado.

---

### User Story 3 - Un servicio nuevo se suma sin cambiar Auditoría ni la web (Priority: P1)

**Why this priority**: es el pedido de Carlos: que Auditoría no quede acoplada a los servicios de hoy.

**Independent Test**: un servicio de prueba, que Auditoría no conoce, manda un evento con el formato y aparece en «Quién hizo qué» con su texto.

**Acceptance Scenarios**:

1. **E12** **Given** un servicio que Auditoría no conoce, con el token entre servicios, **When** manda eventos con el formato, **Then** Auditoría los guarda y «Quién hizo qué» los muestra con el título, el detalle y el color que trae cada evento, sin cambiar Auditoría ni la web.
2. **E13** **Given** un evento que no cumple el formato (le falta un campo obligatorio, una importancia que no existe), **When** llega, **Then** Auditoría lo rechaza diciendo qué está mal, y no guarda nada de ese lote.
3. **E14** **Given** un pedido a Auditoría sin el token entre servicios, **When** llega, **Then** lo rechaza: la web no puede mandar eventos.
4. **E15** **Given** el formato, **When** se lee su documento, **Then** dice cada campo, cuáles son obligatorios, cómo se entrega y cómo se reintenta, para que un servicio en otro lenguaje lo cumpla.

---

### Edge Cases

- **Un evento sin persona** (lo hace el sistema solo): se guarda sin persona y se muestra como «el sistema».
- **A una persona le cambian el nombre:** lo viejo sigue con el nombre que tenía cuando lo hizo.
- **Un lote grande de pendientes** (Auditoría estuvo caída un día): se entrega por partes, sin frenar al servicio.
- **Dos copias del mismo servicio** entregando a la vez: cada evento se entrega una sola vez.
- **La regla que hoy lee un evento** (deshacer la unión de dos productos lee el evento de la unión): pasa a leer una tabla propia de Comercial; el evento queda solo para la auditoría.

## Requirements *(mandatory)*

### Functional Requirements

- **RF-146**: «Quién hizo qué» muestra en una sola lista lo que se hizo en todos los servicios, con los filtros de hoy, de a 10 por página, con el texto, el detalle y el color que trae cada evento.

### Non-Functional Requirements

- **RNF-74**: Los servicios le mandan a Auditoría lo que hizo cada persona con un formato único y versionado, que trae el texto para personas, y Auditoría acepta cualquier servicio que lo cumpla: sumar un servicio no cambia Auditoría ni la web. Mandarlo es opcional para cada servicio y ninguno depende de Auditoría para funcionar. No se pierde ningún evento: el servicio lo anota en su propia base dentro de su transacción y lo entrega después, sin duplicar; lo entregado se borra de su base a la semana. Precisa RNF-30 (los eventos solo suman filas, ahora en Auditoría).

### Key Entities

- **Evento**: lo que hizo una persona: id, servicio, tipo (`cosa.accion`), fecha, quién (número y nombre en ese momento), dispositivo, título, detalle, importancia (normal, revisar, anulación), referencias a las cosas que toca y contenido libre.
- **Bandeja de salida**: en la base de cada servicio, los eventos que esperan ser entregados o ya entregados hace menos de una semana.
- **Auditoría**: el servicio y su base, que guarda los eventos de todos y responde los reportes.

## Success Criteria *(mandatory)*

- **SC-001**: «Quién hizo qué» muestra lo de Comercial y Procesos juntos, como antes de separar.
- **SC-002**: Un servicio de prueba que Auditoría no conoce aparece en «Quién hizo qué» sin cambiar Auditoría ni la web.
- **SC-003**: Con Auditoría apagada se vende igual y, al prenderla, no falta ningún evento.

## Assumptions

- Comercial y Procesos son los primeros en mandar eventos; Tickets y Acceso nacen mandándolos (028, 029).
- Las listas de proveedores no anotan eventos: lo que se hace con una lista lo anota Comercial.

## Out of Scope (por ahora)

- Reportes nuevos: arranca con «Quién hizo qué».
- Un broker de mensajes entre los servicios (etapa 11, T156).
- Que los eventos dejen de estar en la base del servicio que los anotó.
