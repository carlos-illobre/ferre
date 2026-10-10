# Feature Specification: Ventas

**Feature Branch**: `003-ventas`

**Created**: 2026-10-10

**Status**: Baseline

**Input**: Línea de base: lo construido antes de adoptar Spec Kit (docs/REQUERIMIENTOS.md, sección 3.2)

## User Scenarios & Testing *(mandatory)*

Los escenarios describen lo que hoy hace el sistema, comprobado en las pruebas o en el
código. Cuando un texto de pantalla cambia entre interfaces, se aclara cuál es de la
computadora y cuál del celular. Los importes siguen el redondeo de RF-19 (capacidad 002):
el precio de venta y cada renglón van para arriba al múltiplo de $1.000.

### User Story 1 - Vender en el mostrador (Priority: P1)

El Vendedor registra una venta en el orden del mostrador (CU-01): busca el producto, ve el
precio, pone la cantidad, elige cómo paga el cliente y cobra. La venta queda guardada con
sus renglones y descuenta el stock.

**Why this priority**: es lo que reemplaza al cuaderno; sin esto no hay sistema.

**Independent Test**: con un producto que ya tiene margen, se lo busca en «Vender», se lo
agrega con Enter, se elige «Efectivo» y se cobra; la venta queda confirmada y el stock baja.

**Acceptance Scenarios**:

1. **Given** un Vendedor con sesión, **When** abre «Vender», **Then** la búsqueda está habilitada y tiene el foco.
   - Prueba: tests/e2e/escritorio/04-vender.spec.ts, tests/e2e/celular/04-vender.spec.ts
2. **Given** una mecha con costo $1.000 y margen 100 % guardado, **When** el Vendedor escribe su nombre en la búsqueda, **Then** la sugerencia muestra el precio $3.000 (1000 × 2 × 1,21 = 2420, para arriba a $1.000).
   - Prueba: tests/e2e/escritorio/04-vender.spec.ts, tests/e2e/celular/04-vender.spec.ts
3. **Given** la sugerencia de la mecha elegida, **When** aprieta Enter, **Then** la mecha queda en la venta, la búsqueda queda vacía y con el foco, y el total es $3.000.
   - Prueba: tests/e2e/escritorio/04-vender.spec.ts, tests/e2e/celular/04-vender.spec.ts, clientes/gestion-del-local-web/src/escritorio/pantallas/Vender.test.tsx, clientes/gestion-del-local-web/src/pantallas/Vender.test.tsx
4. **Given** la mecha en la venta, **When** pone cantidad 3, **Then** el total pasa a $9.000.
   - Prueba: tests/e2e/escritorio/04-vender.spec.ts, tests/e2e/celular/04-vender.spec.ts
5. **Given** un renglón que se vende por unidad, **When** el Vendedor sube la cantidad con la flechita (computadora) o con el «+» (celular), escribe 2,7 o borra la cantidad y sale del campo, **Then** sube de a 1, 2,7 se toma como 2 y el campo vacío vuelve a 1: nunca queda un cero ni un decimal.
   - Prueba: tests/e2e/escritorio/04-vender.spec.ts, tests/e2e/celular/04-vender.spec.ts, clientes/gestion-del-local-web/src/escritorio/pantallas/Vender.test.tsx, clientes/gestion-del-local-web/src/pantallas/Vender.test.tsx, clientes/gestion-del-local-web/src/unidades.test.ts
6. **Given** un renglón en la venta, **When** le cambia la unidad a «kg» y escribe 1,5, **Then** la cantidad admite un decimal y la unidad queda guardada en el producto para la próxima vez.
   - Prueba: tests/e2e/escritorio/04-vender.spec.ts, tests/e2e/celular/04-vender.spec.ts, clientes/gestion-del-local-web/src/escritorio/pantallas/Vender.test.tsx, clientes/gestion-del-local-web/src/pantallas/Vender.test.tsx
7. **Given** una venta con productos y sin medio de pago elegido, **When** toca «Cobrar», **Then** aparece el aviso «Elegí cómo paga» y no se registra nada; al elegir un medio de pago el aviso desaparece solo.
   - Prueba: tests/e2e/escritorio/04-vender.spec.ts, tests/e2e/celular/04-vender.spec.ts, clientes/gestion-del-local-web/src/escritorio/pantallas/Vender.test.tsx, clientes/gestion-del-local-web/src/pantallas/Vender.test.tsx
8. **Given** una venta de $11.000 con «Efectivo» elegido, **When** toca «Cobrar», **Then** en la computadora aparece «Venta registrada: $11.000,00 en efectivo» y en el celular una pantalla de éxito con «Venta registrada», el importe, «Efectivo» y el botón «Nueva venta»; la venta queda vacía.
   - Prueba: tests/e2e/escritorio/04-vender.spec.ts, tests/e2e/celular/04-vender.spec.ts, clientes/gestion-del-local-web/src/escritorio/pantallas/Vender.test.tsx, clientes/gestion-del-local-web/src/pantallas/Vender.test.tsx
9. **Given** una venta cobrada de 3 mechas, **When** se mira la base, **Then** hay una venta confirmada, el stock de la mecha bajó 3 y el renglón guardó su cantidad, su precio, su margen y la explicación del precio («+ 100 % de margen»).
   - Prueba: tests/e2e/escritorio/04-vender.spec.ts, tests/e2e/celular/04-vender.spec.ts, microservices/gestion-del-local/src/rutas/ventas.test.ts
10. **Given** una venta armada, **When** el Vendedor aprieta F5, **Then** queda elegido «Efectivo» sin tocar el mouse.
   - Prueba: clientes/gestion-del-local-web/src/escritorio/pantallas/Vender.test.tsx, clientes/gestion-del-local-web/src/pantallas/Vender.test.tsx
11. **Given** una venta armada, **When** aprieta F6, F7 o F8, F2, o Esc con la búsqueda vacía, **Then** elige Mercado Pago, tarjeta o cuenta corriente, cobra, o descarta la venta anotándola como consulta, respectivamente.
   - Prueba: ninguna
12. **Given** una venta que llega a la API, **When** el medio de pago no es efectivo, Mercado Pago, tarjeta o cuenta corriente, **Then** la API la rechaza y dice cuáles son los medios de pago.
   - Prueba: microservices/gestion-del-local/src/rutas/ventas.test.ts
13. **Given** una venta con «Cuenta corriente» elegida y sin cliente, **When** toca «Cobrar», **Then** aparece el aviso «Cuenta corriente: elegí el cliente» y no se registra; la API también la rechaza («necesita el cliente»). En el celular, elegir «Cta. cte.» abre la hoja «¿Quién lleva a cuenta?».
   - Prueba: clientes/gestion-del-local-web/src/escritorio/pantallas/Vender.test.tsx, clientes/gestion-del-local-web/src/pantallas/Vender.test.tsx, microservices/gestion-del-local/src/rutas/ventas.test.ts
14. **Given** una venta con «Cuenta corriente» y un cliente elegido, **When** cobra, **Then** la venta se registra con ese cliente y en «Ventas de hoy» figura su nombre al lado del medio de pago.
   - Prueba: ninguna
15. **Given** una venta que llega a la API sin productos, con una cantidad que no es mayor que cero, con un precio negativo, con un renglón sin descripción o con un id que no es un UUID, **When** se intenta registrar, **Then** la API la rechaza y dice qué está mal.
   - Prueba: microservices/gestion-del-local/src/rutas/ventas.test.ts
16. **Given** una venta ya guardada, **When** el dispositivo la reenvía con el mismo id (reintento o vuelta de la conexión), **Then** la API responde con la venta guardada y no la duplica.
   - Prueba: microservices/gestion-del-local/src/rutas/ventas.test.ts

---

### User Story 2 - Elegir el margen o poner el precio a mano en la venta (Priority: P1)

El Vendedor resuelve el precio sin salir de la venta (RF-20b): si el producto no tiene
margen lo elige en el renglón y queda guardado en el producto; si quiere cobrar otra cosa,
tipea un importe que vale solo para esa venta.

**Why this priority**: el cliente decide con el precio en la mano; frenar la venta para ir a
otra pantalla es más lento que la calculadora.

**Independent Test**: se agrega a la venta un producto sin margen, se toca «300 %» en su
renglón y se cobra; el producto queda con margen 300 y el renglón vendido también.

**Acceptance Scenarios**:

1. **Given** un tornillo con costo $10 y sin margen, **When** el Vendedor lo agrega a la venta, **Then** el renglón pide el margen («elegí margen o precio» en la computadora; «elegí margen», con el detalle ya abierto, en el celular).
   - Prueba: tests/e2e/escritorio/04-vender.spec.ts, tests/e2e/celular/04-vender.spec.ts, clientes/gestion-del-local-web/src/escritorio/pantallas/Vender.test.tsx, clientes/gestion-del-local-web/src/pantallas/Vender.test.tsx
2. **Given** una venta con un renglón sin precio, **When** toca «Cobrar», **Then** aparece el aviso «Hay productos sin precio» y no se registra.
   - Prueba: tests/e2e/escritorio/04-vender.spec.ts, tests/e2e/celular/04-vender.spec.ts
3. **Given** el tornillo sin margen en la venta, **When** toca «300 %» en su renglón, **Then** el precio pasa a $1.000 (10 × 4 × 1,21 = 48,4, para arriba), el margen 300 queda guardado en el producto y el renglón vendido guarda margen 300.
   - Prueba: tests/e2e/escritorio/04-vender.spec.ts, tests/e2e/celular/04-vender.spec.ts, clientes/gestion-del-local-web/src/escritorio/pantallas/Vender.test.tsx, clientes/gestion-del-local-web/src/pantallas/Vender.test.tsx
4. **Given** una mecha de $3.000 en la venta, **When** tipea 2500 en «a mano», **Then** ese importe vale solo para esta venta: el margen guardado en el producto no cambia (y el renglón se cobra $3.000 por RF-19).
   - Prueba: clientes/gestion-del-local-web/src/escritorio/pantallas/Vender.test.tsx, clientes/gestion-del-local-web/src/pantallas/Vender.test.tsx
5. **Given** un renglón con margen en el celular, **When** toca el chip del margen, **Then** se despliega en el mismo renglón el costo (que al tocarlo explica de dónde sale), los cinco botones de margen con el vigente marcado y el campo del precio a mano.
   - Prueba: clientes/gestion-del-local-web/src/pantallas/Vender.test.tsx
6. **Given** un renglón de 3 mechas en el celular, **When** toca el subtotal, **Then** una hoja explica de dónde sale, paso por paso, hasta «× 3 unidades = $9.000,00».
   - Prueba: clientes/gestion-del-local-web/src/pantallas/Vender.test.tsx

---

### User Story 3 - Cada renglón de la venta es múltiplo de $1.000 (Priority: P1)

No hay billetes chicos para dar vuelto: además del precio, cada renglón de la venta se
redondea para arriba a $1.000 (RF-19, capacidad 002). Acá se describe su efecto en la venta:
lo que se vende suelto y el precio puesto a mano.

**Why this priority**: lo decidió el dueño el 2026-10-09; una venta que no es múltiplo de
$1.000 no se puede cobrar en el mostrador.

**Independent Test**: se venden 1,5 kg de un producto de $1.000 el kilo y el renglón se
cobra $2.000.

**Acceptance Scenarios**:

1. **Given** una venta con 3 mechas ($9.000) y un tornillo a $1.000 el kilo, **When** el Vendedor pone 1,5 kg de tornillo, **Then** ese renglón vale $2.000 (1,5 × 1000 = 1500, para arriba) y el total es $11.000 (RF-19).
   - Prueba: tests/e2e/escritorio/04-vender.spec.ts, tests/e2e/celular/04-vender.spec.ts
2. **Given** un precio tipeado a mano que no es múltiplo de $1.000 ($1.500 o $2.500), **When** se suma a la venta, **Then** el renglón se cobra para arriba ($2.000 o $3.000) (RF-19).
   - Prueba: libraries/calculo-de-precios/src/precio.test.ts, clientes/gestion-del-local-web/src/escritorio/pantallas/Vender.test.tsx, clientes/gestion-del-local-web/src/pantallas/Vender.test.tsx
3. **Given** una venta que llega a la API con un renglón de 0,5 × $3.000, uno a mano de $1.500 y uno de 0,3 × $10.000, **When** se registra, **Then** el total guardado es $7.000 ($2.000 + $2.000 + $3.000): el servidor suma los renglones redondeados igual que la pantalla, y la cantidad y el precio por unidad se guardan tal cual (RF-19).
   - Prueba: microservices/gestion-del-local/src/rutas/ventas.test.ts
4. **Given** un renglón cuyo importe ya es múltiplo de $1.000 (3 × $3.000; 0,3 m × $10.000), **When** se calcula, **Then** no sube: ni por redondear de más ni por un error de coma flotante (RF-19).
   - Prueba: libraries/calculo-de-precios/src/precio.test.ts
5. **Given** un renglón de 0,5 kg a $3.000, **When** se pide la explicación del subtotal, **Then** dice «× 0,5 kg = $1.500,00» y «Redondeado para arriba a $2.000,00 (múltiplo de $1.000,00) para no dar vuelto» (RF-19).
   - Prueba: libraries/calculo-de-precios/src/precio.test.ts

---

### User Story 4 - Vender algo que no está en ninguna lista (Priority: P2)

El Vendedor vende un producto que la búsqueda no encuentra (stock viejo, compra ocasional)
como ítem libre: escribe qué es y le pone el precio (RF-22, CU-01).

**Why this priority**: la venta no se puede frenar porque falte un producto en el catálogo.

**Independent Test**: se escribe en la búsqueda algo que no existe, Enter, se tipea el
precio y se cobra.

**Acceptance Scenarios**:

1. **Given** una búsqueda sin resultados («bolsa de arena»), **When** el Vendedor aprieta Enter, **Then** se agrega un renglón de ítem libre con ese texto como descripción y sin precio, con el campo del precio listo para tipear.
   - Prueba: clientes/gestion-del-local-web/src/pantallas/Vender.test.tsx
2. **Given** un ítem libre en la venta, **When** le tipea el precio 1500, **Then** el total es $2.000 (el renglón se redondea por RF-19).
   - Prueba: clientes/gestion-del-local-web/src/pantallas/Vender.test.tsx
3. **Given** una venta con un ítem libre, **When** se registra, **Then** la API la acepta con ese renglón sin producto asociado y lo suma al total.
   - Prueba: microservices/gestion-del-local/src/rutas/ventas.test.ts
4. **Given** una venta con un ítem libre, **When** se registra, **Then** ese renglón no mueve el stock de ningún producto.
   - Prueba: ninguna

---

### User Story 5 - Ver las ventas de hoy y anular una (Priority: P2)

El Vendedor abre las ventas del día, ve cada una con sus productos, uno por renglón, y anula
la que estuvo mal (CU-02; la parte construida de RF-23). Corregir una venta todavía no
existe: hoy se anula y se carga de nuevo.

**Why this priority**: el cuaderno permite tachar; el sistema también, con rastro.

**Independent Test**: después de cobrar una venta de dos productos, se la encuentra en
«Ventas de hoy», se la anula y el stock vuelve a donde estaba.

**Acceptance Scenarios**:

1. **Given** una venta en efectivo de 3 mechas y 1,5 kg de tornillos cobrada hoy, **When** el Vendedor mira «Ventas de hoy» debajo de la venta en la computadora (arranca desplegado), **Then** la venta aparece con «Efectivo» y cada producto va en su fila («3 × MECHA…», «1.5 × TORNILLO…») debajo de la fila de la venta.
   - Prueba: tests/e2e/escritorio/04-vender.spec.ts, clientes/gestion-del-local-web/src/escritorio/pantallas/Vender.test.tsx
2. **Given** esa venta de dos productos en la computadora, **When** toca la fila de la venta y la vuelve a tocar, **Then** se pliega a una sola fila («2 productos: …») y vuelve a desplegarse; una venta de un solo producto no se pliega.
   - Prueba: tests/e2e/escritorio/04-vender.spec.ts, clientes/gestion-del-local-web/src/escritorio/pantallas/Vender.test.tsx
3. **Given** esa misma venta, **When** el Vendedor abre «Negocio» en el celular, **Then** ve el total de hoy, cuántas ventas hubo y, en «Detalle de hoy», la venta con cada producto en su renglón, el medio de pago y el importe.
   - Prueba: tests/e2e/celular/04-vender.spec.ts, clientes/gestion-del-local-web/src/pantallas/Negocio.test.tsx
4. **Given** un usuario que administra (rol dueño o admin) en el celular, **When** está en «Vender», **Then** ve un chip «Hoy» con el total del día que abre la hoja «Ventas de hoy» con las mismas ventas.
   - Prueba: clientes/gestion-del-local-web/src/pantallas/Vender.test.tsx
5. **Given** una venta confirmada en «Ventas de hoy», **When** toca «Anular» y confirma escribiendo el motivo, **Then** la venta queda marcada «anulada» (no se borra) y el stock de sus productos vuelve a donde estaba.
   - Prueba: tests/e2e/escritorio/04-vender.spec.ts, tests/e2e/celular/04-vender.spec.ts
6. **Given** una venta anulada, **When** se la mira en «Ventas de hoy», **Then** dice «anulada» y no ofrece «Anular».
   - Prueba: clientes/gestion-del-local-web/src/pantallas/Vender.test.tsx, clientes/gestion-del-local-web/src/escritorio/pantallas/Vender.test.tsx
7. **Given** una venta que no existe o que ya está anulada, **When** se pide anularla, **Then** la API responde «La venta no existe o ya está anulada» y no mueve stock.
   - Prueba: ninguna
8. **Given** ventas confirmadas y anuladas en el día, **When** se piden las ventas de hoy, **Then** el total del día y el total por medio de pago cuentan solo las confirmadas, y «hoy» es el día del local (Buenos Aires), no el del servidor.
   - Prueba: ninguna

---

### User Story 6 - Anotar lo que pidieron y no llevaron (Priority: P2)

Cuando el cliente pregunta el precio y no compra, el Vendedor descarta la venta con un toque
y queda anotado qué pidió y a cuánto se le ofreció (CU-03; la parte construida de RF-25).

**Why this priority**: pasa muy seguido y hoy es demanda que se pierde; anotarlo cuesta un
toque.

**Independent Test**: se agrega un producto a la venta y se toca «No llevó»; queda una
consulta guardada con el producto y el precio ofrecido.

**Acceptance Scenarios**:

1. **Given** una venta con una mecha de $3.000, **When** el Vendedor toca «No llevó», **Then** la venta se vacía, aparece «Anotado como consulta» y queda guardada una consulta con ese producto y el precio ofrecido ($3.000).
   - Prueba: tests/e2e/escritorio/04-vender.spec.ts, tests/e2e/celular/04-vender.spec.ts, clientes/gestion-del-local-web/src/escritorio/pantallas/Vender.test.tsx, clientes/gestion-del-local-web/src/pantallas/Vender.test.tsx
2. **Given** un pedido de anotar una consulta sin ningún renglón, **When** llega a la API, **Then** responde «No hay nada que registrar».
   - Prueba: ninguna

---

### User Story 7 - Vender sin conexión (Priority: P1)

Si se corta internet, el Vendedor sigue vendiendo igual: la venta, el cambio de margen y el
«No llevó» quedan en el dispositivo y se mandan solos al reconectar (alternativa de CU-01;
el mecanismo es de RNF-10 y RNF-20).

**Why this priority**: el internet del local es intermitente y el mostrador no se puede
frenar.

**Independent Test**: con «Vender» abierto se corta la red, se cobra una venta y se vuelve a
conectar; la venta aparece en la base una sola vez.

**Acceptance Scenarios**:

1. **Given** «Vender» abierto con el catálogo ya guardado en el dispositivo y la red cortada, **When** el Vendedor agrega un producto, pone cantidad 2, elige «Efectivo» y cobra, **Then** ve «Sin conexión: se envía sola», el indicador de conexión dice «1 por enviar» y en la base todavía no hay venta.
   - Prueba: tests/e2e/escritorio/08-sin-conexion.spec.ts, tests/e2e/celular/08-sin-conexion.spec.ts
2. **Given** la red cortada y una venta por enviar, **When** agrega el producto de nuevo, le elige margen «50 %» y toca «No llevó», **Then** el precio se recalcula en el momento y el indicador dice «3 por enviar».
   - Prueba: tests/e2e/escritorio/08-sin-conexion.spec.ts, tests/e2e/celular/08-sin-conexion.spec.ts
3. **Given** tres cambios por enviar, **When** vuelve la red, **Then** el indicador pasa a «Sincronizado» y en la base hay un solo renglón vendido, el stock bajó 2, el producto quedó con margen 50 y hay una consulta: todo llegó en orden y una sola vez.
   - Prueba: tests/e2e/escritorio/08-sin-conexion.spec.ts, tests/e2e/celular/08-sin-conexion.spec.ts, clientes/gestion-del-local-web/src/cola.test.ts

---

### Edge Cases

- **Precio a mano que no es múltiplo de $1.000:** se redondea para arriba como todo lo
  demás ($1.500 tipeado se cobra $2.000) y la explicación del renglón lo dice. Si el precio
  a mano tiene que respetarse tal cual, es una pregunta abierta
  (docs/decisiones-de-negocio.md, «Preguntas abiertas», punto 3).
- **Mismo producto agregado dos veces:** no se abre otro renglón; se suma 1 a la cantidad
  del que ya está (comprobado en el código de las dos pantallas; sin prueba propia en esta
  capacidad).
- **Vender más de lo que hay:** no se impide. El renglón avisa «(queda negativo)» al lado
  del stock (solo en el código; sin prueba).
- **La API no acepta la venta** (un dato inválido): el aviso aparece en la pantalla y la
  venta queda armada para corregirla (solo en el código; sin prueba).
- **Ítem libre sin descripción:** la API rechaza la venta («no tiene descripción»).
- **Anular a cuenta corriente:** una venta anulada deja de contar en lo que debe el cliente
  (la deuda suma solo ventas confirmadas; ver capacidad de Clientes).

## Requirements *(mandatory)*

Solo lo construido. Lo pendiente, lo nuevo y lo que está fuera de esta etapa (RF-24, RF-24b,
RF-26 a RF-32, y lo que falta de RF-22, RF-23 y RF-25) no figura acá.

### Functional Requirements

- **RF-20**: Registrar una venta en el orden del mostrador: buscar, ver precio, cantidad, cobrar. La venta guarda sus renglones, descuenta el stock de cada producto y queda con el usuario que la hizo. (#15)
- **RF-20b**: En la venta, el margen de un producto se elige o cambia ahí mismo y queda guardado en el producto; el precio de un renglón se puede poner a mano (un importe) solo para esa venta. (#15)
- **RF-21**: Medios de pago: efectivo, Mercado Pago, tarjeta y cuenta corriente. La cuenta corriente exige elegir el cliente. (#15)
- **RF-22**: *Construido en parte.* Vender un producto que no está en ninguna lista como ítem libre, con descripción y precio tipeados (#17). La otra mitad del requerimiento, darlo de alta como producto ahí mismo, [NEEDS CLARIFICATION: el documento lo da por hecho y no encontré prueba ni código que lo respalde].
- **RF-23**: *Construido en parte.* Ver las ventas del día, con el total del día y por medio de pago, y anularlas; cada venta muestra sus productos, uno por renglón (#16). No está construido corregir una venta ni ver las de días anteriores.
- **RF-25**: *Construido en parte.* Anotar lo que un cliente pidió y no llevó: «No llevó» guarda el producto y el precio ofrecido. No está construido cargar el motivo desde la pantalla (la tabla y la API tienen el campo, ninguna pantalla lo pide) ni la vista para consultar lo anotado.

### Key Entities *(include if feature involves data)*

- **Venta**: un ticket; agrupa los renglones que lleva un mismo cliente. Tiene fecha, medio de pago, total, estado (confirmada o anulada) y, si es a cuenta corriente, el cliente.
- **Renglón de venta**: un renglón del cuaderno. Guarda descripción, cantidad, precio por unidad, y el costo, el margen y la explicación del precio de ese momento. Sin producto asociado es un ítem libre.
- **Consulta**: lo que preguntaron y no llevaron: producto o descripción, precio ofrecido y, si se carga, el motivo.
- **Cliente**: solo los importantes; hace falta para vender a cuenta corriente (pertenece a la capacidad de Clientes).
- **Movimiento de stock**: cada venta descuenta y cada anulación devuelve (pertenece a la capacidad de Compras y stock).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una venta de 3 productos se registra en menos de 20 segundos, con teclado (RNF-02; a validar en el piloto, #21).
- **SC-002**: El total de toda venta registrada es múltiplo de $1.000 (RF-19).
- **SC-003**: Vender algo que no está en ninguna lista no agrega más de 2 pasos respecto de una venta normal (criterio de aceptación del issue #17).
- **SC-004**: Una venta hecha sin conexión llega al servidor al reconectar, una sola vez, sin que el Vendedor haga nada.
- **SC-005**: Después de anular una venta, el stock de cada producto vuelve al valor que tenía antes de venderla.

## Clarifications

### Session 2026-10-08

- Q: ¿Hay devoluciones? → A: En esta versión no. Sí habrá cambios por otro producto (RF-24, todavía sin construir). Las devoluciones llegan con la venta online: reintegro o saldo a favor, según elija el cliente; el plazo se define entonces (RF-24b).
- Q: ¿Se toma seña por un pedido de algo que no hay en stock? → A: No. Se le dice al cliente qué día va a estar y se lo espera. Es el procedimiento actual y se quiere mejorar (RF-26, todavía sin construir).
- Q: ¿Cómo se redondea? → A: Siempre para arriba a múltiplos de $1.000, para no lidiar con vueltos (RF-19).

### Session 2026-10-09

- Q: ¿Alcanza con redondear el precio? → A: No. No hay billetes chicos: toda venta tiene que ser múltiplo de $1.000. Además del precio, se redondea para arriba cada renglón de la venta: lo que se vende suelto y el precio puesto a mano (RF-19).
- Q: ¿Un precio puesto a mano que no es múltiplo de $1.000 se respeta tal cual? → A: Sin decidir. Hoy se redondea para arriba como todo lo demás ($1.500 a mano se cobra $2.000) y la pantalla lo explica. Si tiene que respetarse, RF-19 necesita esa excepción (pregunta abierta, sección 9, punto 3).
- Q: ¿Corregir una venta está hecho? → A: No. Estaba marcado «Hecho» y no lo estaba del todo: RF-23 pasa a «Hecho en parte» y corregir una venta va en el issue #56.
- Q: ¿Cómo se ofrece el sistema a otras ferreterías? → A: Cada una con su instalación y su base de datos propias (RF-32, fuera de esta etapa).

## Assumptions

- Buscar productos, calcular el precio (costo + margen + IVA) y el redondeo a $1.000 son de la capacidad 002 (RF-07, RF-10, RF-19); acá solo se describe su efecto en la venta.
- Agregar un producto a la venta escaneando su código de barras es de RF-08 y no se especifica acá.
- El mecanismo para guardar en el dispositivo y enviar al reconectar es de RNF-10 y RNF-20; acá solo se describe cómo se ve al vender.
- Hoy la API no distingue roles para vender: cualquier usuario con sesión (dueño, admin o mostrador) puede registrar, ver y anular ventas y anotar consultas. Los permisos por rol son RF-72 (#59), pendiente; qué rol puede ver y anular ventas es una pregunta abierta (sección 9, punto 1).
- Marcar pagada una venta a cuenta corriente (RF-40) pertenece a la capacidad de Clientes; la ruta existe en la API de ventas y ninguna pantalla la usa todavía (#57).
- Anular pide confirmación con un cuadro del navegador donde se escribe el motivo (opcional); el motivo queda en el registro de quién hizo qué.
