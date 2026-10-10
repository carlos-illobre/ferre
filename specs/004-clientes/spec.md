# Feature Specification: Clientes

**Feature Branch**: `004-clientes`

**Created**: 2026-10-10

**Status**: Baseline

**Input**: Especificación completa de la capacidad

## Clarifications

### Session 2026-09-13

- Q: ¿Cómo compran los clientes importantes? → A: A cuenta corriente. Cada compra se anota en un cuaderno de deudas y, cuando el cliente paga, se tacha el renglón. El sistema reemplaza ese cuaderno: «cuenta corriente» es un medio de pago que lleva el nombre del cliente, y tachar el renglón es marcar la venta como pagada (RF-40).
- Q: ¿Todos pagan el mismo precio? → A: No. Un cliente importante a veces tiene un precio distinto, según la cantidad que compra y lo rápido que paga. Lo decide el empleado o el dueño en el momento (RF-43).
- Q: ¿Cuántos clientes importantes son? → A: Unos 20. El cliente de barrio no se carga en el sistema.

### Session 2026-10-08

- Q: ¿Cómo se redondea? → A: Siempre para arriba a múltiplos de $1.000, para no lidiar con vueltos (decisión 5; RF-19). Vale también para el precio que se le cobra a un cliente importante.
- Q: ¿Un cliente puede quedar con saldo a favor? → A: El saldo a favor llega con las devoluciones de la venta online y queda fuera de esta etapa (decisión 2; RF-24b).

### Session 2026-10-10

- Q: ¿Un precio puesto a mano que no es múltiplo de $1.000 se redondea? → A: No. Se respeta tal cual y la venta avisa que no es múltiplo de $1.000 (decisión 16; RF-19). Vale para el precio que se le pone a mano a un cliente importante.
- Q: ¿Cuántos actores hay? → A: Cuatro: Dueño, Empleado, Cliente y Proveedor (decisión 14).

### Session 2026-10-09

- Q: ¿El Cliente usa el sistema? → A: No. Cliente es un actor, no un rol: no entra al sistema. Los permisos se dan por rol (Administrador, Vendedor, Comprador), combinables (decisión 8; RF-72).
- Q: ¿Toda venta es múltiplo de $1.000? → A: Sí. Además del precio, se redondea para arriba cada renglón de la venta (decisión 7; RF-19).
- Q: ¿Marcar como pagada una venta a cuenta corriente es parte de RF-40? → A: Sí, y se hace desde la aplicación, en las dos interfaces. Es lo mínimo para dejar el cuaderno de deudas; los pagos parciales, el saldo y la antigüedad son RF-41 (decisión 12).
- Q: ¿En qué interfaces? → A: En las dos, celular y computadora, cada una con su forma propia (decisión 9; ADR-014).
- Q: ¿De dónde sale RF-43? → A: Del relato del 2026-09-13; se agregó como requerimiento en la revisión del 2026-10-09.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cobrar una venta a cuenta corriente (Priority: P1)

El Vendedor arma la venta como cualquier otra y, al cobrar, elige «Cuenta corriente» y el
cliente importante que se la lleva. La venta queda a nombre de ese cliente y sin pagar,
como el renglón del cuaderno de deudas.

**Why this priority**: sin esto las ventas a los clientes grandes seguirían en un cuaderno aparte.

**Independent Test**: con un cliente importante cargado, armar una venta, elegir «Cuenta corriente», elegir el cliente y cobrar; la venta figura entre las ventas del día con el nombre del cliente y lo que debe ese cliente sube por el total.

**Acceptance Scenarios**:

1. **Given** una venta con productos, **When** el Vendedor elige «Cuenta corriente» como medio de pago, **Then** el sistema le pide elegir el cliente entre los clientes importantes activos, ordenados por nombre.
2. **Given** la lista de clientes para elegir, uno con ventas a cuenta corriente sin pagar y otro sin deuda, **When** el Vendedor la mira, **Then** cada cliente muestra lo que debe, o que está al día.
3. **Given** una venta con «Cuenta corriente» elegida y sin cliente, **When** el Vendedor cobra, **Then** la venta no se registra y en el lugar aparece un aviso que dice que hay que elegir el cliente.
4. **Given** el aviso de que hay que elegir el cliente, **When** el Vendedor elige el cliente o cambia el medio de pago, **Then** el aviso desaparece solo (RNF-09).
5. **Given** una venta con «Cuenta corriente» y un cliente elegido, **When** el Vendedor cobra, **Then** la venta queda registrada a nombre de ese cliente y sin pagar, la confirmación dice «Cuenta corriente» y el nombre del cliente, y la venta siguiente arranca sin cliente elegido.
6. **Given** una venta cobrada a cuenta corriente, **When** el Vendedor mira las ventas del día, **Then** esa venta dice «Cuenta corriente» y el nombre del cliente.
7. **Given** un cliente que debía $10.000, **When** el Vendedor le cobra a cuenta corriente una venta de $5.000, **Then** la próxima vez que se muestra lo que debe ese cliente, en ese mismo dispositivo y sin esperar al servidor, dice $15.000.
8. **Given** un dispositivo sin conexión que ya había recibido la lista de clientes, **When** el Vendedor cobra una venta a cuenta corriente, **Then** puede elegir el cliente y cobrar igual que con conexión, y la venta se manda sola al reconectar (RNF-10, RNF-20).
9. **Given** una venta que llega al servidor con medio de pago cuenta corriente y sin cliente, **When** se intenta registrar, **Then** el servidor la rechaza con «Una venta a cuenta corriente necesita el cliente» y no guarda nada.
10. **Given** ningún cliente importante cargado, **When** el Vendedor elige «Cuenta corriente», **Then** el sistema dice que todavía no hay clientes con cuenta corriente y qué hacer para cargar uno.
11. **Given** un cliente importante cuya condición es «contado», **When** el Vendedor quiere cobrarle a cuenta corriente, **Then** [NEEDS CLARIFICATION: ¿existen clientes importantes con condición «contado», a los que no se les vende a cuenta corriente? Si existen, ¿el sistema impide cobrarles a cuenta corriente, solo avisa, o directamente no los ofrece al elegir el cliente?]
12. **Given** una venta que se cobra en efectivo, con Mercado Pago o con tarjeta, **When** el Vendedor quiere dejar anotado a qué cliente importante se la vendió, **Then** [NEEDS CLARIFICATION: ¿una venta que no es a cuenta corriente puede llevar el nombre de un cliente importante, para que figure en su ficha y cuente como compra suya? ¿O el cliente solo se anota en las ventas a cuenta corriente?]

---

### User Story 2 - Tachar el renglón: marcar como pagada una venta a cuenta corriente (Priority: P1)

Cuando el cliente viene a pagar, el Vendedor busca al cliente, ve sus ventas a cuenta
corriente sin pagar y marca como pagada la que el cliente paga. La venta deja de contar
como deuda. Es el renglón tachado del cuaderno.

**Why this priority**: mientras no se pueda tachar el renglón en el sistema, el cuaderno de deudas sigue siendo necesario.

**Independent Test**: con un cliente que tiene dos ventas a cuenta corriente sin pagar, marcar una como pagada; lo que debe el cliente baja por el total de esa venta y la otra sigue figurando.

**Acceptance Scenarios**:

1. **Given** clientes con ventas a cuenta corriente sin pagar, **When** el Vendedor abre la cuenta corriente, **Then** ve las ventas sin pagar agrupadas por cliente, cada cliente con el total que debe.
2. **Given** un cliente con ventas sin pagar, **When** el Vendedor mira sus ventas, **Then** cada una muestra la fecha, el total y sus productos, uno por renglón.
3. **Given** una venta a cuenta corriente confirmada y sin pagar, **When** el Vendedor la marca como pagada, **Then** queda con la fecha y la hora del pago, deja de figurar entre las ventas sin pagar y lo que debe el cliente baja por el total de esa venta.
4. **Given** una venta recién marcada como pagada, **When** se consulta «quién hizo qué» (RF-71), **Then** figura la acción con el usuario que la marcó.
5. **Given** una venta que no es a cuenta corriente, está anulada o ya se pagó, **When** se la quiere marcar como pagada, **Then** el servidor responde «La venta no es a cuenta corriente, está anulada o ya se pagó» y no cambia nada.
6. **Given** un dispositivo sin conexión, **When** el Vendedor marca una venta como pagada, **Then** el cambio queda guardado en el dispositivo, la venta ya no figura como deuda en ese dispositivo y el cambio se manda solo al reconectar (RNF-10, RNF-20).
7. **Given** ningún cliente con ventas sin pagar, **When** el Vendedor abre la cuenta corriente, **Then** el sistema dice que nadie debe nada.
8. **Given** un cliente que paga una venta a cuenta corriente, **When** el Vendedor la marca como pagada, **Then** [NEEDS CLARIFICATION: ¿se anota con qué pagó el cliente (efectivo, Mercado Pago o tarjeta)? ¿Esa plata cuenta en la caja del día en que pagó (RF-62)?]
9. **Given** una venta marcada como pagada por error, **When** el Vendedor se da cuenta, **Then** [NEEDS CLARIFICATION: ¿se puede deshacer y que la venta vuelva a figurar como deuda? ¿Quién puede y hasta cuándo? Si no se puede deshacer, marcarla pide confirmación, porque sería algo que no se recupera.]
10. **Given** una venta a cuenta corriente ya pagada, **When** se la anula (RF-23), **Then** [NEEDS CLARIFICATION: ¿se puede anular una venta a cuenta corriente que el cliente ya pagó? Si se puede, ¿qué pasa con la plata que pagó?]

---

### User Story 3 - Dar de alta un cliente importante (Priority: P1)

Alguien del local carga un cliente importante con su nombre para poder venderle a cuenta
corriente. Sin clientes cargados no se puede cobrar a cuenta corriente.

**Why this priority**: es la condición para que las historias 1 y 2 se puedan usar desde una instalación recién puesta en marcha.

**Independent Test**: cargar un cliente solo con el nombre y comprobar que aparece para elegir al cobrar a cuenta corriente, al día.

**Acceptance Scenarios**:

1. **Given** un usuario con permiso para cargar clientes, **When** carga un cliente con su nombre, **Then** el cliente queda activo, al día, y aparece para elegir al cobrar a cuenta corriente.
2. **Given** el alta de un cliente, **When** se intenta guardar sin nombre, **Then** no se crea nada y en el lugar aparece un aviso que dice que el nombre es obligatorio.
3. **Given** el alta de un cliente, **When** se carga además el teléfono, **Then** queda guardado; el teléfono es opcional.
4. **Given** un cliente recién cargado, **When** se consulta «quién hizo qué» (RF-71), **Then** figura el alta con el usuario que la cargó.
5. **Given** el alta de un cliente, **When** no se indica su condición, **Then** [NEEDS CLARIFICATION: ¿un cliente nuevo queda por omisión habilitado para comprar a cuenta corriente, o hay que habilitarlo aparte? El contrato tiene las dos versiones: la base lo deja sin cuenta corriente y la API lo crea con cuenta corriente.]
6. **Given** un usuario del local, **When** quiere cargar, modificar o desactivar un cliente, **Then** [NEEDS CLARIFICATION: ¿qué rol puede cargar, modificar y desactivar clientes importantes: solo el Administrador, o también el Vendedor? ¿El Vendedor tiene que poder cargarlo en medio de una venta, cuando el cliente está en el mostrador?]
7. **Given** un cliente cargado con un nombre, **When** se carga otro con el mismo nombre, **Then** [NEEDS CLARIFICATION: ¿puede haber dos clientes con el mismo nombre? Si no, ¿el sistema lo impide o solo avisa?]
8. **Given** el alta de un cliente, **When** el usuario completa sus datos, **Then** [NEEDS CLARIFICATION: ¿qué datos lleva un cliente importante además del nombre y el teléfono (CUIT, dirección, nombre del negocio, notas)? ¿Alguno más es obligatorio?]

---

### User Story 4 - Buscar un cliente y ver su ficha (Priority: P2)

El Vendedor o el Administrador busca un cliente importante por su nombre y abre su ficha:
sus datos, su condición, lo que compró y lo que debe.

**Why this priority**: es lo que permite contestarle al cliente cuánto debe y qué se llevó, y es la puerta de entrada a la cuenta corriente completa.

**Independent Test**: con un cliente que tiene ventas pagadas y sin pagar, buscarlo por parte del nombre, abrir la ficha y ver sus datos, sus compras y el total que debe.

**Acceptance Scenarios**:

1. **Given** clientes importantes cargados, **When** el usuario escribe parte del nombre, **Then** ve los clientes activos cuyo nombre coincide, cada uno con lo que debe, y el resultado aparece en menos de 100 ms (RNF-07).
2. **Given** un cliente encontrado, **When** el usuario abre su ficha, **Then** ve sus datos (nombre y teléfono), su condición (contado o cuenta corriente) y su condición de precio (RF-43).
3. **Given** la ficha de un cliente, **When** el usuario mira lo que debe, **Then** ve el total y las ventas que lo componen; al tocar el total, el sistema explica de dónde sale, con los números de origen (RF-13).
4. **Given** la ficha de un cliente, **When** el usuario mira lo que compró, **Then** ve sus ventas de la más nueva a la más vieja, cada una con fecha, total, si está pagada o no y sus productos, uno por renglón.
5. **Given** la ficha de un cliente, **When** un usuario con permiso cambia su nombre, su teléfono o su condición, **Then** el cambio queda guardado y figura en «quién hizo qué» con su usuario (RF-71).
6. **Given** un cliente al que ya no se le vende, **When** un usuario con permiso lo desactiva, **Then** deja de ofrecerse al cobrar a cuenta corriente, no se borra, y sus ventas y su ficha se siguen pudiendo consultar.
7. **Given** una búsqueda que no coincide con ningún cliente, **When** el usuario la mira, **Then** el sistema dice que no hay clientes con ese nombre.
8. **Given** un dispositivo sin conexión que ya había recibido los clientes, **When** el usuario busca un cliente, **Then** lo encuentra igual que con conexión (RNF-10).
9. **Given** un cliente con ventas sin pagar, **When** se lo quiere desactivar, **Then** [NEEDS CLARIFICATION: ¿se puede desactivar un cliente que todavía debe? Si se puede, ¿su deuda sigue figurando en la cuenta corriente?]
10. **Given** la ficha de un cliente, **When** el Administrador quiere saber cuánto gana con ese cliente, **Then** [NEEDS CLARIFICATION: ¿la ficha muestra cuánto margen o ganancia deja el cliente? Si la muestra, ¿en qué período y qué rol puede verla?]

---

### User Story 5 - Llevar la cuenta corriente completa (Priority: P2)

El Vendedor registra lo que el cliente va pagando, aunque no cubra una venta entera; el
sistema lleva el saldo y la antigüedad de la deuda de cada cliente. El Administrador ve
quién debe, cuánto y desde cuándo, y le manda al cliente el resumen de su cuenta.

**Why this priority**: saber cuánto debe cada cliente grande y desde cuándo es plata del negocio que no se conoce con el cuaderno; viene después de poder vender y tachar.

**Independent Test**: con un cliente que debe dos ventas, registrar un pago menor al total, ver que el saldo baja por ese monto, ver la antigüedad de lo que sigue debiendo y generar el resumen para mandarle.

**Acceptance Scenarios**:

1. **Given** un cliente con saldo deudor, **When** el Vendedor registra un pago por un monto menor al saldo, **Then** el pago queda guardado con su fecha, su monto y el usuario que lo registró, y el saldo del cliente baja por ese monto.
2. **Given** un cliente con ventas y pagos, **When** el usuario toca su saldo, **Then** el sistema explica de dónde sale, con las ventas y los pagos que lo componen (RF-13).
3. **Given** un pago registrado, **When** pasa el tiempo, **Then** el pago no se borra ni se pisa: si estuvo mal, se corrige sumando un movimiento nuevo (RNF-30).
4. **Given** varios clientes con saldo deudor, **When** el Administrador abre la cuenta corriente, **Then** ve cada cliente con su saldo y la antigüedad de su deuda.
5. **Given** un cliente con saldo deudor, **When** el usuario pide su resumen de cuenta, **Then** obtiene un resumen listo para mandarle por WhatsApp.
6. **Given** un dispositivo sin conexión, **When** el Vendedor registra un pago, **Then** queda guardado en el dispositivo y se manda solo al reconectar (RNF-10, RNF-20).
7. **Given** un cliente que debe varias ventas, **When** paga una parte, **Then** [NEEDS CLARIFICATION: ¿el pago parcial se aplica a una venta en particular, o a la cuenta del cliente en general (baja el saldo y cancela primero las ventas más viejas)? Cuando existan los pagos parciales, ¿se sigue pudiendo marcar una venta entera como pagada (RF-40), o todo pasa a registrarse como pago?]
8. **Given** un cliente que paga una parte de lo que debe, **When** el Vendedor registra el monto, **Then** [NEEDS CLARIFICATION: ¿el pago tiene que ser múltiplo de $1.000, como las ventas (RF-19)? ¿Se anota con qué pagó (efectivo, Mercado Pago o tarjeta)? ¿Puede pagar más de lo que debe y quedar con saldo a favor, o el sistema lo impide?]
9. **Given** un cliente con deuda de distintas fechas, **When** el Administrador mira la antigüedad, **Then** [NEEDS CLARIFICATION: ¿cómo se mide y se muestra la antigüedad de la deuda: los días desde la venta sin pagar más vieja, o el saldo repartido en tramos (por ejemplo hasta 30, hasta 60 y más de 60 días)? ¿A partir de cuántos días una deuda se considera atrasada?]
10. **Given** el resumen de cuenta de un cliente, **When** se lo genera, **Then** [NEEDS CLARIFICATION: ¿qué lleva el resumen (solo el saldo; las ventas sin pagar; cada venta con sus productos; los pagos), de qué período, y en qué forma se manda por WhatsApp (texto, imagen o PDF)?]
11. **Given** el cuaderno de deudas con lo que cada cliente debe al empezar a usar el sistema, **When** se pone en marcha la cuenta corriente, **Then** [NEEDS CLARIFICATION: ¿cómo se carga lo que cada cliente ya debía en el cuaderno: un saldo inicial por cliente, o renglón por renglón como ventas con su fecha original? El criterio de aceptación pide el saldo de cada cliente grande cargado y conciliado con el dueño.]

---

### User Story 6 - Cobrarle a un cliente importante su precio (Priority: P3)

A un cliente importante se le cobra un precio distinto al del mostrador, según la cantidad
que compra y lo rápido que paga. El Vendedor lo ve al venderle y el sistema explica por
qué ese precio.

**Why this priority**: es una condición comercial de pocos clientes; el negocio funciona sin ella mientras el precio se pueda poner a mano en el renglón.

**Independent Test**: venderle a un cliente importante con precio distinto y comprobar que el renglón muestra ese precio, que el sistema lo explica y que la venta lo guarda.

**Acceptance Scenarios**:

1. **Given** una venta a un cliente importante con precio distinto, **When** el Vendedor la arma, **Then** cada renglón se cobra al precio de ese cliente, con la regla de RF-19: lo que calcula el sistema se redondea para arriba a $1.000 y lo que se pone a mano se respeta y avisa si no es múltiplo de $1.000.
2. **Given** un renglón cobrado al precio de un cliente, **When** el Vendedor toca el precio, **Then** el sistema explica de dónde sale, con el precio de mostrador y la condición del cliente (RF-13).
3. **Given** una venta cobrada al precio de un cliente, **When** se la consulta después, **Then** conserva el costo, el margen y el precio de ese momento, aunque la condición del cliente haya cambiado (RNF-31).
4. **Given** un cliente importante con precio distinto, **When** el Vendedor le vende, **Then** [NEEDS CLARIFICATION: ¿el precio distinto lo decide la persona en el momento, poniendo el precio a mano en cada renglón, o lo calcula el sistema a partir de una condición guardada en la ficha del cliente (un descuento o una lista de precios propia)? El relato dice lo primero; el alcance de la ficha de cliente dice lo segundo.]
5. **Given** un cliente que compra mucho y paga rápido, **When** se define su precio, **Then** [NEEDS CLARIFICATION: si lo calcula el sistema, ¿cómo se traducen «la cantidad que compra» y «lo rápido que paga» en un precio: qué cantidades o montos, en qué período, qué plazos de pago y qué descuento da cada uno? ¿O el Administrador fija el descuento de cada cliente a ojo y el sistema solo lo aplica?]
6. **Given** un cliente con precio distinto, **When** alguien quiere cambiar su condición de precio, **Then** [NEEDS CLARIFICATION: ¿qué rol puede fijar o cambiar el precio de un cliente: solo el Administrador, o también el Vendedor en el momento de la venta?]
7. **Given** un cliente con precio distinto, **When** compra y paga de contado, **Then** [NEEDS CLARIFICATION: ¿el precio distinto vale solo cuando compra a cuenta corriente, o también cuando paga en el momento?]

---

### Edge Cases

- Una venta a cuenta corriente anulada no cuenta como deuda del cliente: la deuda solo suma ventas confirmadas.
- Si se corrige una venta a cuenta corriente sin pagar (RF-23), lo que debe el cliente sigue al total corregido.
- Si el Vendedor elige «Cuenta corriente», elige un cliente y después cambia a otro medio de pago, la venta deja de ser a cuenta corriente y no suma deuda.
- Al cobrar o descartar una venta, el cliente elegido se limpia para la venta siguiente.
- Un cliente desactivado no se ofrece al cobrar a cuenta corriente.
- Una venta a cuenta corriente registrada sin conexión cuenta en lo que debe el cliente en ese dispositivo desde el momento en que se cobra, sin esperar al servidor.
- Dos dispositivos marcan como pagada la misma venta, uno de ellos sin conexión: la venta queda pagada una sola vez, con la fecha del primer aviso que llega al servidor, y el segundo no produce un error que frene el mostrador.
- Un precio puesto a mano se respeta tal cual; si no es múltiplo de $1.000, la venta lo avisa y se puede cobrar igual (RF-19, decisión 16 del 2026-10-10). Es lo que hoy permite cobrarle a un cliente importante un precio distinto.

## Requirements *(mandatory)*

### Functional Requirements

- **RF-40**: Vender a cuenta corriente a un cliente importante y marcar la venta como pagada.
  - «Cuenta corriente» es uno de los medios de pago de la venta (RF-21). Una venta a cuenta corriente siempre lleva el cliente; sin cliente no se registra, ni en la interfaz ni en el servidor.
  - La venta queda a nombre del cliente y sin pagar. Lo que debe un cliente es la suma de sus ventas a cuenta corriente confirmadas y sin pagar; se calcula, no se guarda.
  - Al elegir el cliente, el Vendedor ve lo que debe cada uno.
  - Las ventas sin pagar se ven agrupadas por cliente y cada una se puede marcar como pagada con una sola acción. Marcarla guarda la fecha y la hora del pago y el usuario que lo anotó.
  - Para poder vender a cuenta corriente, los clientes importantes se dan de alta desde la aplicación, con el nombre como único dato obligatorio. [NEEDS CLARIFICATION: ¿qué rol puede cargar, modificar y desactivar clientes importantes: solo el Administrador, o también el Vendedor?]
  - Todo funciona en las dos interfaces (ADR-014) y sin conexión: elegir el cliente, cobrar y marcar como pagada (RNF-10, RNF-20).
  - [NEEDS CLARIFICATION: ¿qué rol puede marcar una venta como pagada y ver lo que debe cada cliente: el Vendedor, el Administrador o los dos? El caso de uso nombra al Vendedor; los permisos por rol (RF-72) no lo definen.]
- **RF-41**: Cuenta corriente completa: saldo, pagos parciales, antigüedad de la deuda y resumen para mandar.
  - Se registran pagos del cliente por un monto menor a lo que debe. Cada pago lleva fecha, monto y el usuario que lo registró, y no se borra ni se pisa.
  - El saldo de cada cliente se calcula a partir de sus ventas a cuenta corriente y sus pagos, y se explica con los números de origen (RF-13).
  - Se ve la antigüedad de la deuda de cada cliente.
  - Se genera el resumen de cuenta de un cliente para mandarle por WhatsApp.
  - Lo que cada cliente debía en el cuaderno de deudas se carga al empezar, y el saldo de cada cliente grande queda conciliado con el dueño.
  - Cómo se aplica un pago parcial, cómo se mide la antigüedad, qué lleva el resumen y cómo se carga la deuda del cuaderno están marcados para aclarar en la historia 5.
- **RF-42**: Buscar clientes importantes y ver su ficha con lo que compraron y lo que deben.
  - Se busca por nombre, con respuesta en menos de 100 ms (RNF-07) y también sin conexión.
  - La ficha muestra los datos del cliente, su condición (contado o cuenta corriente), su condición de precio (RF-43), lo que compró y lo que debe.
  - Desde la ficha se modifican los datos del cliente y se lo desactiva. Un cliente no se borra: se desactiva, y sus ventas se conservan (RNF-30).
  - Alta, modificación y desactivación quedan en «quién hizo qué» con su usuario (RF-71).
- **RF-43**: Precio distinto para un cliente importante según la cantidad que compra y lo rápido que paga.
  - El precio que se le cobra a un cliente importante puede ser distinto al de mostrador.
  - Ese precio sigue la regla de RF-19 (redondeo para arriba de lo calculado; el precio a mano se respeta y avisa), se explica con sus números de origen (RF-13) y queda guardado en la venta con el costo y el margen de ese momento (RNF-31).
  - [NEEDS CLARIFICATION: ¿el precio distinto lo decide la persona en el momento, con el precio a mano del renglón, o lo calcula el sistema a partir de una condición guardada en la ficha del cliente (descuento o lista de precios propia)?]

### Key Entities *(include if feature involves data)*

- **Cliente**: solo los clientes importantes, unos 20; el cliente de barrio no se carga. Tiene nombre, teléfono opcional, condición (contado o cuenta corriente) y si está activo. No se borra: se desactiva. No es un usuario del sistema.
- **Venta a cuenta corriente**: una venta cuyo medio de pago es cuenta corriente; siempre tiene cliente. Lleva la fecha en que se pagó, vacía mientras se debe.
- **Deuda del cliente**: no se guarda; es la suma de sus ventas a cuenta corriente confirmadas y sin pagar.
- **Pago de cuenta corriente** (RF-41): plata que el cliente entrega a cuenta de lo que debe, con fecha, monto y el usuario que lo registró.
- **Saldo del cliente** (RF-41): lo que debe el cliente una vez descontados sus pagos; se calcula y se explica.
- **Resumen de cuenta** (RF-41): lo que se le manda al cliente para que sepa cuánto debe.
- **Condición de precio del cliente** (RF-43): lo que hace que a ese cliente se le cobre un precio distinto al de mostrador.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ninguna venta a cuenta corriente queda registrada sin el nombre del cliente.
- **SC-002**: Cobrar a cuenta corriente suma un solo paso a una venta común: elegir el cliente.
- **SC-003**: Al elegir el cliente, el Vendedor ve cuánto debe sin salir de la venta.
- **SC-004**: Una venta a cuenta corriente marcada como pagada deja de figurar como deuda del cliente.
- **SC-005**: Marcar una venta como pagada lleva una sola acción una vez encontrado el cliente, y no es más lento que tachar el renglón en el cuaderno.
- **SC-006**: Desde una instalación recién puesta en marcha se puede cargar un cliente y cobrarle a cuenta corriente sin salir de la aplicación.
- **SC-007**: El saldo de cada cliente grande está cargado y conciliado con el dueño.
- **SC-008**: El cuaderno de deudas deja de usarse: toda venta a cuenta corriente y todo pago están en el sistema.
- **SC-009**: Todo lo que la capacidad permite se puede operar en la computadora solo con teclado y en el celular con una mano.

## Assumptions

- Los clientes importantes son unos 20; el sistema no se diseña para miles de clientes.
- El Cliente no entra al sistema: todo lo que le toca (su deuda, su resumen) lo opera un usuario del local.
- Qué rol puede cada operación de esta capacidad depende de los permisos por rol (RF-72); mientras eso no esté decidido, las historias nombran al rol que el caso de uso menciona y la pregunta queda marcada.
- El saldo a favor de un cliente (por una devolución) queda fuera de esta capacidad: llega con las devoluciones (RF-24b).
- Mientras RF-43 no esté definido, el precio distinto de un cliente importante se resuelve con el precio a mano del renglón de la venta, que pertenece a la capacidad de ventas.
- Las ventas del día, anular y corregir una venta pertenecen a la capacidad de ventas (RF-23); acá solo se dice cómo afectan a la deuda del cliente.
