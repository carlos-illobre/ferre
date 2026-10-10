# Feature Specification: Compras y stock

**Feature Branch**: `005-compras-y-stock`

**Created**: 2026-10-10

**Status**: Baseline

**Input**: Línea de base: lo construido antes de adoptar Spec Kit (docs/REQUERIMIENTOS.md, sección 3.4)

## Clarifications

### Session 2026-10-08

- Q: ¿Cómo se les paga a los proveedores? → A: Por adelantado cuando hay descuento; si no, a 30 o 60 días (RF-56). Todavía no está construido: hoy la compra no guarda forma de pago ni vencimiento.
- Q: ¿Hace falta buscar por foto en la primera versión? → A: No. Alcanza con escanear el código de barras y fotografiar facturas. La foto de la factura de compra (RF-51, #55) sigue pendiente; hoy los renglones se cargan buscando o escaneando.

### Session 2026-10-09

- Q: ¿Quién registra la mercadería que llega? → A: Los permisos se dan por rol (Administrador, Vendedor, Comprador, combinables); recibir la mercadería y registrarla es del Comprador. Quién puede contar stock sigue abierto (docs/REQUERIMIENTOS.md, sección 9, punto 1; #59).
- Q: ¿Cómo quedan las dos interfaces? → A: La de celular queda como está; la de computadora vuelve al layout de tablas, con la paleta y la marca del celular (ADR-014). Compras, stock y conteo existen en las dos.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar la mercadería que llega (Priority: P1)

Llega la mercadería. El Comprador elige el proveedor y el comprobante, carga los renglones
buscando el producto (o escaneándolo con el celular), pone cuántos llegaron y el costo que
dice la factura, y registra el ingreso. El stock sube y, si el costo de la factura no es el
de la lista, pasa a ser el costo vigente con su explicación.

**Why this priority**: Es la mitad del stock (lo que entra) y reemplaza el papel semanal de
gastos, que hoy se tira. Sin esto no hay costo real ni stock.

**Independent Test**: Con un proveedor que tiene una cinta a costo de lista $1.000, registrar
un ingreso de 10 cintas a $1.200 y 5 pinceles nuevos a $800, y comprobar en la base el
stock, el costo vigente y el producto nuevo.

**Acceptance Scenarios**:

1. **Given** un proveedor con una cinta a costo de lista $1.000, **When** el Comprador abre el ingreso de mercadería, elige el proveedor, pone el número de factura y agrega la cinta buscándola y con Enter, **Then** aparece el renglón con el costo de la lista ($1.000,00).
   - Prueba: tests/e2e/escritorio/05-compras.spec.ts, tests/e2e/celular/05-compras.spec.ts, clientes/gestion-del-local-web/src/escritorio/pantallas/Compras.test.tsx, clientes/gestion-del-local-web/src/pantallas/Deposito.test.tsx
2. **Given** el renglón de la cinta con costo de lista $1.000, **When** pone cantidad 10 y costo 1200, **Then** el renglón marca «+20 %» contra la lista.
   - Prueba: tests/e2e/escritorio/05-compras.spec.ts, tests/e2e/celular/05-compras.spec.ts, clientes/gestion-del-local-web/src/pantallas/Deposito.test.tsx
3. **Given** un ingreso en curso, **When** escribe una descripción que no está en el catálogo y aprieta Enter, y le pone cantidad 5 y costo 800, **Then** queda un renglón de producto nuevo con la descripción editable y el total es $16.000.
   - Prueba: tests/e2e/escritorio/05-compras.spec.ts, tests/e2e/celular/05-compras.spec.ts
4. **Given** el ingreso con los dos renglones, **When** toca «Registrar ingreso», **Then** se avisa el total registrado, «2 costos actualizados» y «1 producto nuevo»; el stock de la cinta queda en 10, su costo vigente pasa a $1.200 con la explicación «según factura 0001-00000777» y el pincel existe como producto de ese proveedor.
   - Prueba: tests/e2e/escritorio/05-compras.spec.ts, tests/e2e/celular/05-compras.spec.ts, clientes/gestion-del-local-web/src/escritorio/pantallas/Compras.test.tsx, clientes/gestion-del-local-web/src/pantallas/Deposito.test.tsx
5. **Given** un renglón de un producto que se vende por unidad y otro de uno que se vende por metro, **When** tipea 10.9 en el primero y 2.55 en el segundo, **Then** la cantidad queda en 10 y en 2,6: entera por unidad y con un decimal a granel.
   - Prueba: clientes/gestion-del-local-web/src/escritorio/pantallas/Compras.test.tsx, clientes/gestion-del-local-web/src/pantallas/Deposito.test.tsx
6. **Given** un proveedor que no factura, **When** elige el comprobante «Sin comprobante» (o «Remito»), **Then** con «Sin comprobante» no se pide el número y el ingreso se registra igual, y en las compras recientes figura como «sin comprobante» (o «remito» con su número).
   - Prueba: ninguna
7. **Given** un ingreso sin proveedor elegido, sin renglones, o con un renglón sin costo o sin descripción, **When** toca «Registrar ingreso», **Then** no se registra y se le dice en el lugar qué falta («Elegí el proveedor.», «La compra no tiene productos.», «Hay renglones sin costo o sin descripción.»).
   - Prueba: ninguna
8. **Given** el ingreso abierto en el celular con cámara, **When** escanea el código de barras de un producto del catálogo, **Then** se agrega su renglón; si el código no está en el catálogo, se le avisa que lo busque por nombre.
   - Prueba: ninguna
9. **Given** el dispositivo sin conexión, **When** toca «Registrar ingreso», **Then** no se registra y se le avisa «Sin conexión con el servidor. Registrar una compra necesita internet.»; los renglones cargados siguen en pantalla.
   - Prueba: ninguna

---

### User Story 2 - Ver las compras recientes y los gastos de la semana, y anular una compra (Priority: P2)

El Comprador ve lo gastado en los últimos siete días y la lista de compras recientes. Abre
una compra para ver qué trajo y, si se cargó mal, la anula: el stock vuelve atrás.

**Why this priority**: El «gasto de la semana» es el informe que hoy se hace a mano en un
papel; anular es la forma de corregir una carga equivocada.

**Independent Test**: Después de registrar una compra, abrirla en compras recientes, ver sus
renglones, anularla y comprobar que el stock volvió al valor anterior.

**Acceptance Scenarios**:

1. **Given** una compra recién registrada por $16.000, **When** mira «Gastos de la semana», **Then** ve el total de los últimos siete días; en la computadora, además, el detalle por proveedor.
   - Prueba: tests/e2e/escritorio/05-compras.spec.ts, tests/e2e/celular/05-compras.spec.ts, clientes/gestion-del-local-web/src/escritorio/pantallas/Compras.test.tsx, clientes/gestion-del-local-web/src/pantallas/Deposito.test.tsx
2. **Given** la compra en «Compras recientes», **When** la toca, **Then** se despliega y muestra sus renglones: 10 × cinta y 5 × pincel, con el subtotal de cada uno (en la computadora, también el costo unitario).
   - Prueba: tests/e2e/escritorio/05-compras.spec.ts, tests/e2e/celular/05-compras.spec.ts, clientes/gestion-del-local-web/src/escritorio/pantallas/Compras.test.tsx, clientes/gestion-del-local-web/src/pantallas/Deposito.test.tsx
3. **Given** la compra de 10 cintas, **When** toca «Anular» y acepta (el motivo es opcional), **Then** la compra queda «anulada» y el stock de la cinta vuelve a 0.
   - Prueba: tests/e2e/escritorio/05-compras.spec.ts, tests/e2e/celular/05-compras.spec.ts

---

### User Story 3 - Ver el stock y la plata invertida, y corregirlo a mano (Priority: P1)

El Administrador o el Comprador abre el stock y ve cuánta plata hay invertida en mercadería.
Busca un producto, ve cuántos hay y cuánto valen, toca el número para ver los movimientos
que lo explican y, si en la estantería hay otra cantidad, lo corrige diciendo cuántas hay.

**Why this priority**: Saber qué hay y cuánta plata hay invertida es el primer objetivo del
sistema.

**Independent Test**: Con un candado a costo $2.500, una compra de 20 y una venta de 3,
comprobar que el stock es 17 y vale $42.500, ver sus movimientos, corregirlo a 15 y ver el
ajuste explicado.

**Acceptance Scenarios**:

1. **Given** productos con movimientos de stock, **When** abre «Stock», **Then** ve «Valor del inventario» al costo vigente y sin IVA, con el desglose por proveedor.
   - Prueba: tests/e2e/escritorio/06-stock.spec.ts, tests/e2e/celular/06-stock.spec.ts, clientes/gestion-del-local-web/src/pantallas/Deposito.test.tsx
2. **Given** un candado a costo $2.500 con una compra de 20 y una venta de 3, **When** lo busca, **Then** ve stock 17 y valor $42.500.
   - Prueba: tests/e2e/escritorio/06-stock.spec.ts, tests/e2e/celular/06-stock.spec.ts
3. **Given** el candado con stock 17, **When** toca el número del stock, **Then** se listan los movimientos (Compra +20, Venta −3) y la leyenda «Stock 17 = suma de estos movimientos».
   - Prueba: tests/e2e/escritorio/06-stock.spec.ts, tests/e2e/celular/06-stock.spec.ts, clientes/gestion-del-local-web/src/pantallas/Deposito.test.tsx
4. **Given** el candado con stock 17, **When** toca «Corregir», pone 15, escribe el motivo «conté la estantería» y guarda, **Then** el stock pasa a 15, el valor a $37.500 y aparece un movimiento «Conteo» con «había 17, hay 15: conté la estantería».
   - Prueba: tests/e2e/escritorio/06-stock.spec.ts, tests/e2e/celular/06-stock.spec.ts, clientes/gestion-del-local-web/src/pantallas/Deposito.test.tsx
5. **Given** el stock corregido a 15, **When** va a «Vender» y busca el candado, **Then** la sugerencia dice «stock 15».
   - Prueba: tests/e2e/escritorio/06-stock.spec.ts, tests/e2e/celular/06-stock.spec.ts

---

### User Story 4 - Cargar el stock que ya hay, contando de a un sector (Priority: P2)

El stock arranca en cero. El Comprador elige una estantería (un sector), busca o escanea
cada producto y pone cuántos hay. Si lo interrumpe un cliente, el conteo queda abierto y lo
sigue después. Al cerrar el sector, cada diferencia contra lo que decía el sistema queda
como un ajuste explicado.

**Why this priority**: Nunca se hizo un recuento y el local no se puede cerrar para contar:
se carga de a poco. Va después del ingreso y del stock porque ajusta sobre ellos.

**Independent Test**: Con una lija con stock 10 y un pincel con stock 5, crear un sector,
contar 8 lijas y 5 pinceles, cerrarlo y comprobar los ajustes en la base.

**Acceptance Scenarios**:

1. **Given** la pantalla «Contar», **When** escribe un nombre de sector nuevo y toca «Agregar sector», **Then** el sector se crea y se abre su conteo.
   - Prueba: tests/e2e/escritorio/07-contar.spec.ts, tests/e2e/celular/07-contar.spec.ts
2. **Given** un sector que nunca se contó, **When** abre «Contar», **Then** el sector figura con su cantidad de productos y «nunca contado», y se ofrece crear un sector nuevo.
   - Prueba: clientes/gestion-del-local-web/src/pantallas/Deposito.test.tsx
3. **Given** el conteo abierto y una lija con stock 10, **When** busca la lija, Enter, pone 8 y toca «Siguiente», **Then** la lija aparece en los contados con diferencia −2.
   - Prueba: tests/e2e/escritorio/07-contar.spec.ts, tests/e2e/celular/07-contar.spec.ts
4. **Given** un pincel con stock 5, **When** lo busca, pone 5 y aprieta Enter, **Then** el pincel aparece en los contados con «=».
   - Prueba: tests/e2e/escritorio/07-contar.spec.ts, tests/e2e/celular/07-contar.spec.ts
5. **Given** dos productos contados, uno con diferencia, **When** toca «Cerrar» el sector y confirma, **Then** se informa «2 productos contados, 1 con diferencia ajustada»; el stock de la lija queda en 8 y el del pincel en 5; el ajuste lleva la nota «conteo de <sector> del <fecha>: había 10, hay 8»; los dos productos quedan asignados al sector.
   - Prueba: tests/e2e/escritorio/07-contar.spec.ts, tests/e2e/celular/07-contar.spec.ts
6. **Given** el sector recién cerrado, **When** toca «Contar otro sector», **Then** el sector figura como contado hoy («contado hoy» en el celular, «contado hace 0 días» en la computadora).
   - Prueba: tests/e2e/escritorio/07-contar.spec.ts, tests/e2e/celular/07-contar.spec.ts
7. **Given** un conteo con productos contados y sin cerrar, **When** vuelve a la lista de sectores y más tarde elige el mismo sector, **Then** el sector figura con «conteo en curso» y se retoma el mismo conteo, con lo ya contado.
   - Prueba: ninguna
8. **Given** un sector con productos asignados que no se contaron en este conteo, **When** toca «Cerrar», **Then** se le dice cuántos productos no contó y elige entre «Cerrar y poner en cero los no contados» (cada uno queda con un ajuste «no se encontró ninguno (había N)») y «Cerrar y dejar los no contados como están».
   - Prueba: ninguna
9. **Given** un conteo abierto en un dispositivo con cámara, **When** escanea el código de un producto del catálogo, **Then** queda elegido para poner cuántos hay; si el código no está en el catálogo, se le avisa que lo busque por nombre.
   - Prueba: ninguna

---

### Edge Cases

- **La misma compra llega dos veces** (reintento con el mismo id): el servidor responde con la compra ya guardada y no la duplica ni vuelve a sumar stock.
- **Proveedor inexistente o inactivo:** la compra se rechaza con «No existe ese proveedor».
- **Anular una compra ya anulada o que no existe:** se rechaza con «La compra no existe o ya está anulada». Anular no deshace el costo que dejó la factura: fue real aunque la compra se anule.
- **El costo de la factura coincide con el vigente** (diferencia menor a medio centavo): no se agrega un costo nuevo.
- **Corregir el stock a la cantidad que ya figura:** no se crea ningún movimiento.
- **Cantidad negativa o que no es un número** al corregir o al contar: se rechaza con «Decí cuántas hay (un número mayor o igual a cero)».
- **Corregir el stock o contar un producto sin conexión:** el cambio queda en la cola del dispositivo y se manda al volver la conexión; en el conteo, lo contado se muestra igual. Cerrar un conteo, crear un sector y registrar o anular una compra necesitan conexión.
- **Contar o cerrar un conteo ya cerrado:** se rechaza con «El conteo no existe o ya se cerró».
- **Sector con un nombre repetido:** se rechaza con «Ya existe un sector llamado …».
- **Producto contado dos veces en el mismo conteo:** vale la última cantidad. Un producto contado en un sector pasa a ser de ese sector.
- **Producto sin ningún movimiento:** figura con stock 0 y no suma al valor del inventario.
- **Producto a granel en el conteo:** en el celular la cantidad contada solo acepta enteros.

## Requirements *(mandatory)*

### Functional Requirements

- **RF-50**: El sistema registra cada compra a proveedor con su costo real y suma stock por cada renglón. El comprobante es factura, remito o «sin comprobante» (hay proveedores que no facturan). Si el costo del comprobante difiere del vigente, pasa a ser el costo vigente de ese producto para ese proveedor, con la explicación «según <comprobante> de <proveedor> del <fecha>». Un producto que no estaba en ninguna lista nace en la compra. Las compras recientes (las últimas 50) se abren para ver sus renglones y se pueden anular: la compra queda marcada «anulada» y el stock vuelve con un ajuste. Los gastos de los últimos siete días se muestran por proveedor.
- **RF-52**: El stock arranca en cero: es la suma de los movimientos de cada producto. Lo que ya hay se carga de a poco, por sector, desde el celular o la computadora: se crea el sector, se busca o escanea cada producto y se pone cuántos hay. Un conteo sin cerrar queda abierto (uno por sector) y se retoma. Al cerrar, cada diferencia contra el stock del sistema es un ajuste con su nota, y los productos del sector que no se contaron se ponen en cero o se dejan como están, a elección.
- **RF-53**: El sistema muestra el stock actual de cada producto y cuánta plata hay invertida (stock × costo vigente, sin IVA), en total y por proveedor. El stock de cada producto muestra los movimientos que lo explican (compras, ventas, ajustes y conteos) y se puede corregir a mano diciendo cuántas hay; el motivo es opcional y queda en la nota del ajuste.

### Key Entities *(include if feature involves data)*

- **Proveedor**: a quién se le compra. Esta capacidad solo lo elige entre los activos.
- **Compra**: un ingreso de mercadería: proveedor, fecha, tipo y número de comprobante, total y estado (confirmada o anulada).
- **Renglón de compra**: un producto de la compra, con cantidad y costo unitario sin IVA.
- **Movimiento de stock**: cada entrada o salida de un producto, con signo, tipo (compra, venta, ajuste), a qué documento corresponde y una nota. El stock es la suma.
- **Sector**: un lugar del local (una estantería, una pared) donde viven productos.
- **Conteo**: el recuento de un sector, abierto o cerrado, con quién lo abrió y lo cerró y el resumen del cierre.
- **Renglón de conteo**: cuántas unidades de un producto se contaron, cuándo y quién.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Después de registrar una compra, el stock de cada producto sube exactamente la cantidad cargada y el costo vigente es el del comprobante.
- **SC-002**: El stock de cualquier producto es igual a la suma de los movimientos que la pantalla lista al tocarlo.
- **SC-003**: Después de cerrar un conteo, el stock de cada producto contado es igual a la cantidad contada, y cada diferencia tiene un ajuste que dice cuánto había y cuánto hay.
- **SC-004**: Anular una compra deja el stock de sus productos como estaba antes de registrarla.
- **SC-005**: El gasto de la semana sale de las compras cargadas, sin anotar nada aparte.

## Assumptions

- **Roles:** las historias nombran al Comprador como propone la sección 5 de docs/REQUERIMIENTOS.md, pero lo construido no distingue roles en esta capacidad: cualquier usuario con sesión registra y anula compras, ve y corrige el stock y cuenta. Los roles Administrador, Vendedor y Comprador son el issue #59 (RF-72), todavía abierto.
- **Costos sin IVA:** el costo unitario de la compra y el valor del inventario van sin IVA.
- **Validación en el mostrador:** todo lo de esta capacidad falta validarlo en el piloto (#21).
- **Pruebas:** el comportamiento del servidor de esta capacidad solo está cubierto por las pruebas de punta a punta, que no corren en cada push; las rutas de compras, stock y conteos no tienen pruebas unitarias.
- **Fuera de esta línea de base** (pendientes o nuevos en la sección 3.4): la foto de la factura (RF-51), el aviso de stock bajo (RF-54), el pedido a proveedor (RF-55), lo que se les debe a los proveedores (RF-56), las etiquetas (RF-57) y el plan de conteo (RF-58).
