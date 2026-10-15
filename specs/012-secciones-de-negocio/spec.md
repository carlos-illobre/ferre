# Feature Specification: Secciones de «Cómo va el negocio», cada una con su permiso

**Feature Branch**: `012-secciones-de-negocio`

**Created**: 2026-10-15

**Status**: Aprobada (2026-10-15)

**Maquetas**: Pendientes

**Input**: «La pantalla de "Cómo va el negocio", ¿crees que se pueda separar en secciones donde
cada sección esté en un submenú?» y después: «Me interesa separarla en secciones para poder
agregarle a cada sección un permiso distinto de lectura, para poder ocultar datos sensibles.»

## Clarifications

### Session 2026-10-15

- Q: ¿En qué secciones se separa? → A: Tres: **Ventas** (lo vendido, la cantidad de ventas, lo vendido por medio de pago y lo que preguntaron y no llevaron), **Compras** (los gastos de la semana y las compras recientes) e **Inventario** (el dinero invertido en stock, en total y por proveedor).
- Q: ¿Y los números de arriba (Vendido hoy, Ventas de hoy, Gastos de la semana, No llevaron hoy)? → A: Cada uno sigue el permiso de su sección: quien no puede ver una sección tampoco ve sus números arriba. Quien no puede ver ninguna sección no ve la pantalla.
- Q: ¿Qué pasa con «Ver los números del negocio»? → A: Se reemplaza por los permisos nuevos. Todo rol que lo tenía recibe los permisos nuevos, para que nadie pierda nada con el cambio.
- Q: ¿Qué permiso muestra los gastos de la semana? → A: Uno nuevo, «Ver los gastos». «Ver las compras» sigue mostrando las compras recientes. La sección Compras aparece con cualquiera de los dos y muestra solo lo que cada uno permite.
- Q: ¿Y el valor en pesos del stock en Depósito → Inventario, que hoy se ve con «Ver los números del negocio»? → A: Lo muestra el mismo permiso que la sección Inventario: es el mismo dato sensible.
- Q: ¿Cómo se llaman los permisos? → A: «Ver las ventas del negocio», «Ver los gastos» y «Ver el dinero invertido», en la parte «Negocio» de la lista de permisos de un rol.
- Q: ¿Las secciones van en pestañas (un submenú) o una debajo de la otra? → A: Lo decide Carlos al elegir la maqueta (paso 2).

## User Scenarios & Testing

### User Story 1 - Cada rol ve solo las secciones que su permiso deja (Priority: P1)

Quien administra el negocio arma un rol que puede ver cómo van las ventas pero no cuánto se
gasta ni cuánta plata hay invertida en el depósito. La persona con ese rol abre «Cómo va el
negocio» y ve solo lo de ventas: lo demás no aparece, ni como opción deshabilitada.

**Why this priority**: Es lo que pidió Carlos: ocultar datos sensibles a quien no le toca.

**Independent Test**: Con un rol que tiene solo «Ver las ventas del negocio», abrir la
pantalla y ver solo la sección Ventas y sus dos números de arriba; pedirle al servidor los
gastos y el dinero invertido y que los niegue.

**Acceptance Scenarios** (los completa el paso 4):

- **E01** **Given** alguien con «Ver las ventas del negocio» y ningún otro permiso de la pantalla, **When** abre «Cómo va el negocio», **Then** ve la sección Ventas con «Vendido hoy», «Ventas de hoy» y «No llevaron hoy», y no ve ni Compras, ni Inventario, ni «Gastos de la semana».
- **E02** **Given** alguien con «Ver los gastos» solo, **When** abre la pantalla, **Then** ve la sección Compras con los gastos de la semana y «Gastos de la semana» arriba, sin las compras recientes.
- **E03** **Given** alguien con «Ver las compras» solo, **When** abre la pantalla, **Then** ve la sección Compras con las compras recientes y sin los gastos de la semana.
- **E04** **Given** alguien con «Ver el dinero invertido» solo, **When** abre la pantalla, **Then** ve la sección Inventario y ningún número de ventas ni de gastos.
- **E05** **Given** alguien sin ninguno de los cuatro permisos, **When** abre Más, **Then** «Cómo va el negocio» no aparece; y si llega por la dirección, la pantalla dice qué permiso hace falta.
- **E06** **Given** alguien sin «Ver las ventas del negocio», **When** le pide al servidor lo que preguntaron y no llevaron, **Then** el servidor lo niega. Lo mismo con los gastos de la semana sin «Ver los gastos» y con el dinero invertido sin «Ver el dinero invertido».

### User Story 2 - Nadie pierde nada con el cambio (Priority: P1)

**Acceptance Scenarios**:

- **E07** **Given** un rol que tenía «Ver los números del negocio» (el Gerente o uno armado por el negocio), **When** se aplica el cambio, **Then** ese rol tiene «Ver las ventas del negocio», «Ver los gastos» y «Ver el dinero invertido», y quien lo tiene ve la pantalla igual que antes.
- **E08** **Given** la lista de permisos de un rol, **When** se la mira, **Then** «Ver los números del negocio» ya no está y los tres nuevos están en la parte «Negocio», cada uno con lo que deja ver.

### User Story 3 - El valor del stock en Depósito sigue el mismo permiso (Priority: P2)

**Acceptance Scenarios**:

- **E09** **Given** alguien sin «Ver el dinero invertido», **When** abre Depósito → Inventario, **Then** ve las cantidades pero no el valor en pesos, y el servidor no se lo manda.
- **E10** **Given** alguien con «Ver el dinero invertido», **When** abre Depósito → Inventario, **Then** ve también el valor en pesos.

### Edge Cases

- Quien tiene «Ver las ventas de hoy» (de Vender) sigue viendo la lista de ventas del día en Vender, aunque no tenga «Ver las ventas del negocio»: son pantallas distintas y no cambian.
- Si el rol de alguien cambia mientras tiene la pantalla abierta, lo que ya no puede ver deja de aparecer la próxima vez que la abre o la actualiza.
- Las reglas que la capacidad 006 ya pide para cada bloque (cargando, vacío, error, sin conexión, todo número se explica al tocarlo) valen igual dentro de cada sección.

## Requirements

### Functional Requirements

- **RF-96**: «Cómo va el negocio» se separa en tres secciones, Ventas, Compras e Inventario. Cada número y cada bloque pertenece a una sola sección.
- **RF-97**: Cada sección se ve con su propio permiso de lectura: «Ver las ventas del negocio» (Ventas), «Ver los gastos» y «Ver las compras» (Compras, cada uno su parte) y «Ver el dinero invertido» (Inventario). Lo que un permiso no deja ver no aparece, y el servidor no lo entrega.
- **RF-98**: «Ver los números del negocio» deja de existir. Los roles que lo tenían reciben los tres permisos nuevos.
- **RF-99**: El valor en pesos del stock, en cualquier pantalla, se ve con «Ver el dinero invertido».

## Success Criteria

- **SC-01**: Con un rol que solo vende y ve las ventas del negocio, ningún importe de gastos ni de inventario llega al navegador.
- **SC-02**: Quien tenía «Ver los números del negocio» no nota diferencias en lo que puede ver.
