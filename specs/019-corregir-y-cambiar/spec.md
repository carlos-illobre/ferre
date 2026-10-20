# Feature Specification: Corregir y cambiar una venta

**Feature Branch**: `019-corregir-y-cambiar`

**Created**: 2026-10-20

**Status**: Borrador  <!-- pasa a «Aprobada» cuando Carlos aprueba la especificación -->

**Maquetas**: Elegidas por Carlos el 2026-10-20, a confirmar con la especificación: en la
computadora, la v2 de «Ventas de hoy» del director de arte («El día y la venta»: la venta elegida a
la derecha con «Corregir», «Cambio» y «Anular»); en el celular, la hoja de la venta de la v2 («La
venta en una hoja»), para corregir y para el cambio.

**Input**: Carlos, decisión 124 (2026-10-19) y respuestas del 2026-10-20 (T132): corregir
cualquier venta y registrar un cambio de producto desde «Ventas de hoy», en el celular y en la
computadora.

## Clarifications

### Session 2026-10-19 (decisión 124)

- Q: ¿Qué ventas se corrigen? → A: Cualquier venta de cualquier día, con el permiso.
- Q: ¿Qué se puede cambiar al corregir? → A: Todo: cantidades, precios, renglones, medio de pago y cliente; cada cambio queda en Actividad para auditarlo.
- Q: ¿Cómo se registra un cambio de producto? → A: Hay que encontrar la venta original; lo devuelto se toma al precio que se pagó.
- Q: ¿Se devuelve dinero? → A: Sí, si lo nuevo vale menos (cambia «no hay devoluciones de dinero» de RF-24).

### Session 2026-10-20

- Q: ¿Hay un plazo para el cambio? → A: 15 días desde la venta.
- Q: ¿Qué permiso hace falta? → A: El mismo que para anular: «Anular ventas del día» para las de hoy y «Anular ventas de cualquier día» para las de otro día.
- Q: Si el total sube, ¿se cobra la diferencia? → A: Sí, en ese momento y con el medio que se elija.
- Q: Si baja, ¿cómo se devuelve? → A: En efectivo o, si la venta fue a cuenta corriente, bajando la deuda.
- Q: Lo devuelto, ¿vuelve al stock? → A: Se pregunta si está fallado: si lo está, no vuelve y queda anotado; si no, vuelve.
- Q: ¿Una venta anulada se corrige o se cambia? → A: No.
- Q: Si el cliente no sabe cuándo compró, ¿cómo se encuentra la venta? → A: Se busca por producto entre las ventas de los últimos días.
- Q: ¿Cómo se ve? → A: Como la v2: en la computadora, la venta a la derecha con sus tres botones; en el celular, la hoja de la venta. Teclas: E corregir, C cambio, Alt+C registrar un cambio.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Corregir una venta (Priority: P1)

Quien tiene el permiso elige una venta en «Ventas de hoy» (o de otro día) y toca «Corregir» (E):
cambia cantidades, precios, renglones, el medio de pago o el cliente; ve antes de guardar cómo
queda el total y la diferencia, y guarda. La venta queda con los valores nuevos, lo anterior
queda guardado y cada cambio aparece en Actividad.

**Why this priority**: Es el error más común del mostrador (se cargó 4 y eran 3, se cobró con
el medio equivocado) y hoy solo se puede anular y volver a vender.

**Independent Test**: Corregir una venta de 4 mechas a 3 y ver el total nuevo, el stock que
volvió, la diferencia devuelta y el registro en Actividad.

**Acceptance Scenarios**:

1. **E01** **Given** una venta confirmada de hoy y el permiso «Anular ventas del día», **When** se elige y se toca «Corregir» (o E), **Then** sus renglones se vuelven editables: cantidad, precio por unidad, quitar un renglón, agregar un producto, el medio de pago y el cliente.
2. **E02** **Given** una corrección en curso, **When** se cambia algo, **Then** antes de guardar se ve cómo queda el total y la diferencia («+$3.000» o «−$4.000»), y el botón lo dice («Guardar corrección · +$3.000»).
3. **E03** **Given** una corrección que sube el total en una venta que no es a cuenta corriente, **When** se guarda, **Then** pide con qué medio se cobra la diferencia (Efectivo viene elegido) y la registra como cobrada ahora.
4. **E04** **Given** una corrección que baja el total en una venta que no es a cuenta corriente, **When** se guarda, **Then** dice que se devuelven $X en efectivo y lo registra como dinero devuelto.
5. **E05** **Given** una venta a cuenta corriente, **When** se guarda una corrección que sube o baja el total, **Then** la deuda del cliente sube o baja en esa diferencia y no se cobra ni se devuelve dinero.
6. **E06** **Given** una corrección que cambia cantidades o renglones, **When** se guarda, **Then** el stock se mueve por la diferencia: lo que se sacó vuelve, lo que se agregó se descuenta (con la regla de siempre si no alcanza, RF-59).
7. **E07** **Given** una corrección guardada, **When** se mira la venta, **Then** muestra los valores nuevos y la marca «corregida»; lo anterior sigue a la vista (tachado) y en Actividad hay un registro por cada cosa que cambió, con quién, cuándo, el valor de antes y el de ahora.
8. **E08** **Given** una corrección en curso, **When** se toca «Descartar» (o Esc), **Then** la venta queda como estaba y no se registra nada.
9. **E09** **Given** una corrección que cambia el medio de pago de una venta pagada (de Efectivo a Mercado Pago, por ejemplo), **When** se guarda, **Then** los totales del día por medio cambian en consecuencia y no hay diferencia que cobrar ni devolver.
10. **E10** **Given** una corrección que cambia el cliente o pasa una venta a cuenta corriente, **When** se guarda, **Then** se pide el cliente con cuenta corriente y la deuda pasa al cliente nuevo (y deja de estar en el anterior, si había).

---

### User Story 2 - Registrar un cambio de producto (Priority: P1)

Un cliente vuelve con algo que compró. Quien atiende toca «Registrar un cambio» (Alt+C) o
«Cambio» (C) en la venta: encuentra la venta original (por el producto, entre las de los
últimos 15 días), marca lo que vuelve y dice si está fallado, agrega lo que se lleva, y ve la
diferencia: se cobra si lo nuevo vale más y se devuelve si vale menos.

**Why this priority**: Pasa todas las semanas y hoy no hay cómo registrarlo: el stock y la caja
quedan mal.

**Independent Test**: Una pinza de $14.000 vendida ayer vuelve y el cliente se lleva una de
$18.000: se cobran $4.000, la pinza vuelve al stock y las dos ventas quedan unidas.

**Acceptance Scenarios**:

1. **E11** **Given** «Registrar un cambio», **When** se busca un producto, **Then** aparecen las ventas confirmadas de los últimos 15 días que lo tienen, de la más nueva a la más vieja, con fecha, hora, cliente, cantidad y precio pagado.
2. **E12** **Given** una venta elegida (o «Cambio» en una venta abierta), **When** se marca lo que vuelve, **Then** se puede devolver una parte de un renglón (1 de 3 mechas, 0,5 de 1,5 kg) y se toma al precio por unidad que se pagó, aunque hoy el producto valga otro precio.
3. **E13** **Given** algo que vuelve, **When** se marca, **Then** se pregunta «¿Está fallado?»: si no, vuelve al stock; si sí, no vuelve al stock y queda anotado como devuelto fallado.
4. **E14** **Given** lo que vuelve y lo que se lleva (buscado o escaneado, como en Vender), **When** se mira, **Then** se ve la diferencia: «Cobrar $4.000» si lo nuevo vale más, «Devolver $4.000» si vale menos, o «Sin diferencia».
5. **E15** **Given** una diferencia a cobrar, **When** se confirma, **Then** se elige el medio (Efectivo viene elegido) y se registra como cobrado ahora; lo que se lleva se descuenta del stock.
6. **E16** **Given** una diferencia a devolver en una venta que no es a cuenta corriente, **When** se confirma, **Then** se registra la devolución en efectivo; en una venta a cuenta corriente, baja la deuda del cliente.
7. **E17** **Given** un cambio confirmado, **When** se mira la venta original, **Then** muestra lo que volvió y lo que se llevó («después se cambió»), queda unida al cambio y en Actividad hay un registro con quién, cuándo, qué volvió, si estaba fallado, qué se llevó y la diferencia.
8. **E18** **Given** un cambio sin nada que se lleve (solo vuelve un producto), **When** se confirma, **Then** es una devolución: se devuelve el dinero (o baja la deuda) y nada se descuenta del stock.

---

### User Story 3 - Ver lo corregido y lo cambiado (Priority: P2)

En «Ventas de hoy» las ventas corregidas y los cambios se distinguen, y los totales del día
los tienen en cuenta.

**Why this priority**: Sin esto, el total del día no coincide con la caja.

**Independent Test**: Después de una corrección y un cambio, los totales por medio del día
coinciden con lo cobrado y lo devuelto.

**Acceptance Scenarios**:

1. **E19** **Given** una venta corregida, **When** se mira en la lista, **Then** lleva la marca «corregida» (por ejemplo, «corregida: eran 4»).
2. **E20** **Given** un cambio con diferencia, **When** se mira la lista del día en que se hizo, **Then** aparece como un renglón «Cambio» con lo que volvió → lo que se llevó, su medio y la diferencia («+$4.000» o «−$4.000»).
3. **E21** **Given** correcciones y cambios en el día, **When** se miran los totales del día y por medio, **Then** suman lo cobrado y restan lo devuelto en el día en que pasó; la venta original sigue contando en su día con sus valores corregidos.

---

### Edge Cases

- **E22** Una venta anulada no ofrece «Corregir» ni «Cambio», y no aparece al buscar un cambio.
- **E23** Una venta de hace más de 15 días no aparece al buscar un cambio; si se abre desde otro día, «Cambio» dice que pasó el plazo. «Corregir» sí se puede, con el permiso de cualquier día.
- **E24** Sin el permiso que corresponde al día de la venta, «Corregir» y «Cambio» no aparecen y el servidor rechaza el pedido (403) aunque llegue igual.
- **E25** Una corrección que deja la venta sin renglones no se guarda: dice que para eso se anula.
- **E26** No se puede devolver más de lo que se vendió de un renglón, sumando cambios anteriores sobre la misma venta.
- **E27** Corregir y cambiar necesitan conexión: sin internet, dice que hace falta y la venta queda como estaba (como anular).
- **E28** Dos personas corrigiendo la misma venta a la vez: la segunda en guardar ve que la venta cambió y vuelve a empezar con los valores nuevos; no se pisa la primera.
- **E29** Un precio puesto a mano al corregir se respeta tal cual, como en la venta (RF-19).
- **E30** El producto que vuelve ya no está en el catálogo (se absorbió o se dio de baja): se acepta igual al precio pagado; si no está fallado vuelve al stock del producto que lo reemplazó, si hay uno.

## Requirements *(mandatory)*

### Functional Requirements

- **RF-126**: Quien puede anular una venta (RF-24: «Anular ventas del día» para las de hoy, «Anular ventas de cualquier día» para las demás) puede corregirla: cambiar cantidades, precios, renglones, el medio de pago y el cliente. Una venta anulada no se corrige.
- **RF-127**: Antes de guardar una corrección se ve cómo queda el total y la diferencia. Al guardar: si la venta es a cuenta corriente, la deuda del cliente cambia en la diferencia; si no, una diferencia a favor del local se cobra en ese momento con el medio que se elija, y una a favor del cliente se devuelve en efectivo. El stock se mueve por la diferencia de cantidades.
- **RF-128**: Nada se borra (principio V): la venta guarda sus valores anteriores, se ve «corregida» con lo anterior a la vista, y cada cambio queda en Actividad con quién, cuándo, el valor de antes y el de ahora.
- **RF-129**: Un cambio de producto parte de una venta confirmada de hasta 15 días, que se encuentra buscando el producto entre las ventas de esos días. Lo que vuelve se toma al precio por unidad que se pagó y no puede superar lo vendido. Se pregunta si está fallado: lo fallado no vuelve al stock y queda anotado; lo demás vuelve. Lo que se lleva se descuenta del stock como en una venta.
- **RF-130**: La diferencia de un cambio se cobra (con el medio que se elija) si lo nuevo vale más, y se devuelve en efectivo (o baja la deuda, si la venta original fue a cuenta corriente) si vale menos. Cambia «no hay devoluciones de dinero» de RF-24.
- **RF-131**: Los totales del día y por medio suman lo cobrado y restan lo devuelto por correcciones y cambios en el día en que pasaron; la venta corregida cuenta en su día con sus valores nuevos.
- **RF-132**: En la computadora, «Ventas de hoy» como la v2: la venta elegida a la derecha con «Corregir» (E), «Cambio» (C) y «Anular»; «Registrar un cambio» (Alt+C) arriba. En el celular, la hoja de la venta de la v2 con los mismos tres verbos. Todo con el teclado en la computadora (decisión 121).

### Key Entities

- **Corrección**: una edición de una venta; guarda quién, cuándo y, por cada cosa que cambió, el valor de antes y el de ahora, y la diferencia de dinero con cómo se resolvió (cobrada con un medio, devuelta en efectivo o en la cuenta corriente).
- **Cambio**: une una venta original con lo que volvió (producto, cantidad, precio pagado, si estaba fallado) y lo que se llevó; guarda la diferencia y cómo se resolvió, quién y cuándo.
- **Devuelto fallado**: lo que volvió fallado y no entró al stock; queda anotado para verlo después.
- **Movimiento de dinero**: lo cobrado o lo devuelto por una corrección o un cambio, con su medio y su día.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Corregir una cantidad mal cargada lleva menos de 20 segundos y menos de 5 toques o teclas desde la venta elegida.
- **SC-002**: Registrar un cambio de un producto por otro, encontrando la venta por el producto, lleva menos de un minuto.
- **SC-003**: Después de correcciones y cambios, el total del día por medio coincide con lo que hay en cada cajón (lo cobrado menos lo devuelto) en el 100 % de los casos.
- **SC-004**: El 100 % de las correcciones y los cambios se pueden reconstruir desde Actividad: quién, cuándo, qué había antes y qué quedó.
- **SC-005**: El stock después de una corrección o un cambio es el mismo que si la venta se hubiera hecho bien desde el principio, salvo lo devuelto fallado, que queda anotado.

## Assumptions

- La deuda de cuenta corriente y el cliente son los de la capacidad de clientes (RF de cuenta corriente vigentes); un cambio sobre una venta a cuenta corriente no mueve dinero.
- El efectivo devuelto sale del cajón del día en que se devuelve; el cierre de caja (capacidad 004) lo descuenta cuando exista.
- El comprobante que se manda por WhatsApp no es fiscal (003, historia 14): corregir no genera notas de crédito.
- Lo «devuelto fallado» se ve donde hoy se ven las anomalías de stock, con su tipo propio.
- Corregir y cambiar requieren conexión, como anular (RNF-10 dice qué funciona sin internet: registrar ventas).
- [NEEDS CLARIFICATION: Un cambio sobre una venta de otro día (dentro de los 15 días) pide «Anular ventas de cualquier día», como dijo Carlos («mismo permiso»). Eso deja a quien solo anula las del día sin poder registrar cambios de ventas de ayer. ¿Es así, o el cambio dentro de los 15 días lo puede hacer quien anula las del día?]
