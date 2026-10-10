# Feature Specification: Clientes

**Feature Branch**: `004-clientes`

**Created**: 2026-10-10

**Status**: Baseline

**Input**: Línea de base: lo construido antes de adoptar Spec Kit (docs/REQUERIMIENTOS.md, sección 3.3)

## Clarifications

### Session 2026-10-09

- Q: «Marcar una venta de cuenta corriente como pagada» figuraba como hecho, ¿lo está? → A: No del todo. Pasa a «Hecho en parte»: se vende a cuenta corriente, y la pantalla para marcarla pagada queda en el issue #57 (decisión 12).
- Q: ¿El Cliente usa el sistema? → A: No. Cliente es un actor, no un rol: no entra al sistema. Los permisos se dan por rol (Administrador, Vendedor, Comprador) (decisión 8).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cobrar una venta a cuenta corriente (Priority: P1)

El Vendedor arma la venta como cualquier otra y, al cobrar, elige «Cuenta corriente» y el
cliente importante que se la lleva. La venta queda a nombre de ese cliente, como el renglón
del cuaderno de deudas. Es la parte construida de CU-09 y la alternativa «es un cliente
importante» de CU-01.

**Why this priority**: sin esto las ventas a los clientes grandes seguirían en un cuaderno aparte.

**Independent Test**: con un cliente cargado, armar una venta, elegir «Cuenta corriente», elegir el cliente y cobrar; la venta aparece en «Ventas de hoy» con el nombre del cliente y lo que debe ese cliente sube por el total.

**Acceptance Scenarios**:

1. **Given** una venta con productos en el celular y ningún cliente elegido, **When** el Vendedor toca «Cta. cte.», **Then** sube la hoja «¿Quién lleva a cuenta?» para elegir el cliente.
   - Prueba: clientes/gestion-del-local-web/src/pantallas/Vender.test.tsx
2. **Given** una venta con «Cuenta corriente» elegida y sin cliente, **When** el Vendedor toca «Cobrar», **Then** la venta no se registra y aparece el aviso «Cuenta corriente: elegí el cliente.» (en el celular, además, vuelve a subir la hoja de clientes).
   - Prueba: clientes/gestion-del-local-web/src/pantallas/Vender.test.tsx, clientes/gestion-del-local-web/src/escritorio/pantallas/Vender.test.tsx
3. **Given** el aviso «Cuenta corriente: elegí el cliente.» en pantalla, **When** el Vendedor cambia el medio de pago o elige el cliente, **Then** el aviso desaparece solo.
   - Prueba: clientes/gestion-del-local-web/src/pantallas/Vender.test.tsx, clientes/gestion-del-local-web/src/escritorio/pantallas/Vender.test.tsx
4. **Given** una venta que llega a la API con medio de pago cuenta corriente y sin cliente, **When** se intenta registrar, **Then** la API la rechaza con «Una venta a cuenta corriente necesita el cliente».
   - Prueba: microservices/gestion-del-local/src/rutas/ventas.test.ts
5. **Given** una venta con «Cuenta corriente» y un cliente elegido, **When** el Vendedor cobra, **Then** la venta queda registrada a nombre de ese cliente y sin pagar; en el celular la confirmación dice «Cuenta corriente · nombre del cliente».
   - Prueba: ninguna
6. **Given** clientes cargados, uno con ventas a cuenta corriente sin pagar, **When** el Vendedor abre la lista de clientes al cobrar, **Then** cada cliente muestra lo que debe: en el celular «debe $X» o «al día»; en la computadora «(debe $X)» al lado del nombre.
   - Prueba: ninguna
7. **Given** ningún cliente cargado, **When** el Vendedor abre la hoja de clientes en el celular, **Then** dice «Todavía no hay clientes con cuenta corriente.».
   - Prueba: ninguna
8. **Given** una venta del día cobrada a cuenta corriente, **When** el Vendedor mira «Ventas de hoy», **Then** la venta dice «Cuenta corriente · nombre del cliente».
   - Prueba: ninguna
9. **Given** una venta con productos en la computadora, **When** el Vendedor aprieta F8, **Then** queda elegido «Cuenta corriente» y aparece el desplegable «Cliente…».
   - Prueba: ninguna
10. **Given** la lista de clientes ya bajada al dispositivo, **When** el Vendedor abre «Vender» sin conexión, **Then** los clientes guardados siguen disponibles para elegir.
    - Prueba: ninguna

---

### User Story 2 - Cargar clientes y tachar el renglón, solo por la API (Priority: P2)

No hay pantalla para cargar un cliente importante ni para marcar pagada una venta: las dos
cosas existen únicamente como rutas de la API, para cualquier usuario con sesión. La lista
de clientes con lo que debe cada uno sí la usa la pantalla de venta.

**Why this priority**: es lo que sostiene la historia 1 (sin clientes cargados no se puede cobrar a cuenta corriente), pero todavía no llega al mostrador.

**Independent Test**: con una sesión válida, crear un cliente por la API, venderle a cuenta corriente, pedir la lista y ver su deuda; marcar la venta como pagada y ver que la deuda baja.

**Acceptance Scenarios**:

1. **Given** una sesión válida, **When** se pide crear un cliente sin nombre, **Then** la API responde «Hace falta el nombre del cliente» y no crea nada.
   - Prueba: ninguna
2. **Given** una sesión válida, **When** se crea un cliente con nombre (y teléfono opcional), **Then** queda cargado con cuenta corriente permitida, salvo que se indique lo contrario, y queda registrado quién lo creó.
   - Prueba: ninguna
3. **Given** clientes con ventas a cuenta corriente, **When** se pide la lista de clientes, **Then** vienen los activos ordenados por nombre, cada uno con su deuda: la suma de sus ventas a cuenta corriente confirmadas y sin pagar.
   - Prueba: ninguna
4. **Given** una venta a cuenta corriente confirmada y sin pagar, **When** se la marca como pagada por la API, **Then** queda con la fecha de pago, deja de sumar en la deuda del cliente y queda registrado quién la marcó.
   - Prueba: ninguna
5. **Given** una venta que no es a cuenta corriente, está anulada o ya se pagó, **When** se la quiere marcar como pagada, **Then** la API responde «La venta no es a cuenta corriente, está anulada o ya se pagó» y no cambia nada.
   - Prueba: ninguna

---

### Edge Cases

- Una venta a cuenta corriente anulada no suma en la deuda del cliente (la deuda solo cuenta ventas confirmadas).
- Si el Vendedor elige un cliente y después cambia a otro medio de pago, la venta se registra sin cliente.
- Al cobrar o descartar una venta («No llevó»), el cliente elegido se limpia para la venta siguiente.
- Lo que debe cada cliente se baja al abrir la app: no se vuelve a calcular en el dispositivo después de cobrar.
- La lista que se ofrece al cobrar trae todos los clientes activos, tengan o no permitida la cuenta corriente; nada controla ese permiso al registrar la venta.

## Requirements *(mandatory)*

### Functional Requirements

- **RF-40**: Vender a cuenta corriente a un cliente importante y marcar la venta como pagada. **Hecho en parte.** Parte construida: «Cuenta corriente» es un medio de pago de la pantalla de venta en las dos interfaces, exige elegir el cliente, y la venta queda guardada a nombre de ese cliente y sin pagar; la lista de clientes muestra lo que debe cada uno. La base y la API ya tienen el «tachar el renglón» (fecha de pago y ruta para marcarla), pero ninguna pantalla lo usa: marcar la venta como pagada desde la pantalla no está construido.

### Key Entities *(include if feature involves data)*

- **Cliente**: solo los clientes importantes; el de barrio no se carga. Tiene nombre, teléfono opcional y si se le permite comprar a cuenta corriente. No se borra: se desactiva.
- **Venta a cuenta corriente**: una venta cuyo medio de pago es cuenta corriente; siempre tiene cliente. Lleva la fecha en que se pagó, vacía mientras se debe.
- **Deuda del cliente**: no se guarda; es la suma de sus ventas a cuenta corriente confirmadas y sin pagar.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ninguna venta a cuenta corriente queda registrada sin el nombre del cliente.
- **SC-002**: Cobrar a cuenta corriente suma un solo paso a una venta común: elegir el cliente.
- **SC-003**: Al elegir el cliente, el Vendedor ve cuánto debe sin salir de la pantalla de venta.

## Assumptions

- Los clientes importantes son unos 20: la lista entra entera en una hoja o un desplegable, sin buscador.
- Los clientes se cargan hoy por fuera de las pantallas (por la API o en la base); hasta que haya una pantalla, quién los carga es un tema de operación.
- Las rutas de esta capacidad piden sesión y no distinguen rol; qué rol puede qué sigue abierto (RF-72, #59).
- El precio distinto para un cliente importante se resuelve hoy con el precio a mano del renglón de la venta (otra capacidad), no con nada propio de clientes.
