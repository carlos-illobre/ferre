# Feature Specification: Tickets en su propio servicio

**Feature Branch**: `028-tickets-aparte`

**Created**: 2026-10-25

**Status**: Borrador, para aprobar

**Maquetas**: No lleva pantallas

**Input**: Carlos, el 2026-10-25 (decisiones 150 y 164). Es la etapa 4 del plan
(`proyecto/tasks.md`, T155). Los tickets (mejoras y errores que reporta la gente, con sus
fotos) salen de Comercial a un servicio propio con su base. No hacen transacciones con nada
más, así que se separan limpio.

## Clarifications

### Session 2026-10-25

- Q: ¿Qué pasa con los tickets que ya hay? → A: Tickets arranca vacío en los dos ambientes (Carlos, 2026-10-25).
- Q: ¿Cambia algo para quien los usa? → A: No: se cargan, se ven, se resuelven y se reabren igual, por la misma dirección.
- Q: ¿Y «Quién hizo qué»? → A: Tickets le manda sus eventos a Auditoría, con el formato de todos (027).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Los tickets andan igual, desde su servicio (Priority: P1)

**Independent Test**: cargar un ticket con foto, verlo, resolverlo y reabrirlo, y ver que está en la base de Tickets y no en la de Comercial.

**Acceptance Scenarios**:

1. **E01** **Given** una persona con sesión, **When** carga un ticket con sus fotos, **Then** queda en el servicio de Tickets, con las mismas validaciones de hoy (tipo, descripción, tamaño y cantidad de fotos), y uno repetido no se guarda dos veces.
2. **E02** **Given** tickets cargados, **When** se ven los últimos, **Then** aparecen como hoy, con quién lo cargó y quién lo resolvió.
3. **E03** **Given** quien tiene permiso, **When** resuelve un ticket con una nota o lo reabre, **Then** cambia como hoy.
4. **E04** **Given** la foto de un ticket, **When** se la pide, **Then** se la sirve el servicio de Tickets.
5. **E05** **Given** cada acción sobre un ticket, **When** sale bien, **Then** Tickets le manda su evento a Auditoría, con su título y su detalle.
6. **E06** **Given** Tickets sin responder, **When** se carga un ticket, **Then** la aplicación dice que no se pudo mandar, como cuando no hay conexión, y el resto de la aplicación sigue andando.
7. **E07** **Given** un pedido a Tickets sin pasar por la puerta, **When** llega, **Then** lo rechaza.
8. **E08** **Given** Comercial, **When** se busca algo de tickets en su código o en su base, **Then** no hay nada.

---

### Edge Cases

- **Los nombres de quien cargó y quién resolvió:** Tickets guarda el nombre del momento junto con el ticket (como Comercial desde 029), sin consultar a otro servicio.

## Requirements *(mandatory)*

### Non-Functional Requirements

- **RNF-75**: Los tickets (mejoras y errores, con sus fotos) viven en su propio servicio, con su base y su carpeta de fotos; ninguna otra pieza guarda ni lee tickets.

### Key Entities

- **Ticket** y **foto de ticket**: los de hoy, ahora en la base y la carpeta del servicio de Tickets.

## Success Criteria *(mandatory)*

- **SC-001**: Los tickets funcionan igual que antes y las pruebas de punta a punta pasan sin cambios en la web.

## Assumptions

- Mientras Acceso no esté separado, la puerta le pregunta a Comercial quién es la persona.

## Out of Scope (por ahora)

- Cambiar qué es un ticket o cómo se resuelve.
