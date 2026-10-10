# Feature Specification: Información del negocio

**Feature Branch**: `006-informacion-del-negocio`

**Created**: 2026-10-10

**Status**: Baseline

**Input**: Especificación completa de la capacidad

## User Scenarios & Testing *(mandatory)*

La capacidad responde dos preguntas del Administrador, que mira la ferretería a distancia:
cómo va el negocio y cuán rentable es. Reúne el gasto semanal en compras (RF-65), el
tablero de ventas y ganancia (RF-60), lo más vendido y lo que no rota (RF-61), el cierre de
caja (RF-62), las novedades del día (RF-63) y los gastos con el resultado mensual (RF-64).

Reglas que valen para todas las historias:

- **El día** es el día calendario en la hora del local (Argentina), no el del servidor.
- **Solo cuentan las ventas y las compras confirmadas.** Una venta o una compra anulada no
  suma en ningún número de esta capacidad, y al anularla los números se corrigen solos.
- **Todo número se puede tocar y dice de dónde sale**, con los números de origen
  (constitución, principio V; RF-13).
- **Cada rol ve lo suyo** (RF-72): el tablero, lo más vendido, las novedades y el resultado
  mensual son del Administrador; el cierre de caja lo registra el Vendedor; el gasto semanal
  lo ve el Comprador donde registra las compras y el Administrador en el tablero. El
  servidor rechaza el pedido de quien no tiene el rol, además de no mostrárselo.
- **Las dos interfaces** (ADR-014): todo lo de esta capacidad se puede usar en el celular y
  en la computadora.
- **Los importes** se muestran en pesos, con punto de miles y sin centavos.

### User Story 1 - Ver cuánto se gastó en compras en la semana, sin papel (Priority: P1)

El Comprador registra cada compra a proveedor y, en el mismo lugar, ve cuánto se lleva
gastado en compras en la semana: el total y cuánto a cada proveedor. Reemplaza el papel que
se sumaba a mano, se le mostraba al Administrador y después se tiraba.

**Why this priority**: reemplaza una tarea de papel que se repite todas las semanas, y es
el dato de compras que el Administrador mira en el tablero.

**Independent Test**: se registra una compra a un proveedor y, sin recargar, el gasto de la
semana muestra ese importe con el proveedor en el detalle.

**Acceptance Scenarios**:

1. **Given** un Comprador en el celular y ninguna compra en la semana, **When** registra una compra de $16.000 a un proveedor, **Then** «Gastos de la semana» muestra un total de $16.000 sin recargar.
2. **Given** un Comprador en la computadora y ninguna compra en la semana, **When** registra una compra de $16.000 a un proveedor, **Then** «Gastos de la semana» muestra el total de $16.000 y, en el detalle, ese proveedor con 1 compra y $16.000, sin recargar.
3. **Given** dos compras confirmadas en la semana al proveedor A por $40.000 en total y una al proveedor B por $16.000, **When** se mira el gasto de la semana, **Then** el total es $56.000 y el detalle trae primero a A ($40.000, 2 compras) y después a B ($16.000, 1 compra).
4. **Given** un gasto de la semana de $56.000 que incluye una compra de $16.000, **When** esa compra se anula, **Then** el total pasa a $40.000 sin recargar y el proveedor que se quedó sin compras confirmadas sale del detalle.
5. **Given** una compra confirmada con fecha anterior al primer día de la semana, **When** se mira el gasto de la semana, **Then** esa compra no suma.
6. **Given** una compra que se registra dentro de la semana pero con fecha de compra de una semana anterior, **When** se mira el gasto de la semana, **Then** no suma: cuenta la fecha de la compra, no el momento en que se cargó.
7. **Given** que no hay compras confirmadas en la semana, **When** el Comprador mira el gasto de la semana, **Then** ve un total de $0 y un texto que dice que en la semana no se registraron compras.
8. **Given** un proveedor con $40.000 en 2 compras en el detalle, **When** el Comprador o el Administrador toca ese renglón, **Then** ve las 2 compras que forman el importe, cada una con su fecha y su total.
9. **Given** el gasto de la semana a la vista, **When** se lo mira, **Then** dice desde qué día y hasta qué día cuenta.
10. **Given** un usuario que solo tiene el rol Vendedor, **When** entra a la app o le pide el gasto de la semana al servidor, **Then** no lo ve y el servidor rechaza el pedido.

---

### User Story 2 - Ver ventas y ganancia desde cualquier lado (Priority: P2)

El Administrador abre Negocio, desde el celular o la computadora y desde cualquier lado, y
ve cuánto se vendió y cuánto se ganó en el día, en la semana y en el mes, comparado con el
período anterior. En el mismo lugar ve lo demás que necesita para saber cómo va el negocio:
la plata invertida en stock, el stock bajo, los pedidos de clientes sin entregar, las
listas de precios sin aplicar, el gasto de la semana, lo más vendido y las novedades del día.

**Why this priority**: es lo que el Administrador mira todos los días para administrar a
distancia, y el primer objetivo del proyecto: saber qué se vende y cuánto se gana.

**Independent Test**: con ventas confirmadas del día cargadas, el Administrador abre Negocio
en el celular y lee total vendido, cantidad de ventas, ticket promedio y ganancia, y al
tocar la ganancia ve las ventas y los costos de los que sale.

**Acceptance Scenarios**:

1. **Given** tres ventas confirmadas en el día por $10.000, $20.000 y $30.000, **When** el Administrador abre Negocio, **Then** ve, sin tocar nada, vendido en el día $60.000, 3 ventas y ticket promedio $20.000.
2. **Given** ventas del día por $60.000 cuyo costo guardado en cada venta suma $36.000, **When** el Administrador abre Negocio, **Then** ve una ganancia del día de $24.000.
3. **Given** la ganancia del día a la vista, **When** el Administrador la toca, **Then** ve la cuenta con sus números de origen: vendido $60.000 menos costo de lo vendido $36.000.
4. **Given** una venta confirmada con un producto de costo $6.000, **When** después una lista de precios nueva sube el costo de ese producto a $8.000, **Then** la ganancia de esa venta no cambia: se calcula con el costo que la venta guardó en su momento (RNF-31).
5. **Given** ventas del día por $60.000 que incluyen una de $10.000, **When** esa venta se anula, **Then** el tablero muestra vendido $50.000, 2 ventas y ticket promedio $25.000, y la ganancia baja en lo que aportaba esa venta.
6. **Given** el tablero mostrando el día, **When** el Administrador elige la semana o el mes, **Then** ve los mismos cuatro números (vendido, cantidad de ventas, ticket promedio y ganancia) de ese período.
7. **Given** un período con $60.000 vendidos y el período anterior con $50.000, **When** el Administrador mira el tablero, **Then** junto a lo vendido ve lo del período anterior y la diferencia: $10.000 más, 20 % más. La ganancia, la cantidad de ventas y el ticket promedio se comparan igual.
8. **Given** un período anterior sin ventas, **When** el Administrador mira la comparación, **Then** ve que en el período anterior no hubo ventas, sin un porcentaje.
9. **Given** un día sin ventas confirmadas, **When** el Administrador abre Negocio, **Then** ve vendido $0, 0 ventas y un texto que dice que en el día todavía no se registraron ventas; el ticket promedio no muestra un número.
10. **Given** un Administrador, **When** abre Negocio, **Then** además de ventas y ganancia tiene a la vista la plata invertida en stock (RF-53), los productos con stock bajo (RF-54), los pedidos de clientes sin entregar (RF-26), las listas de precios recibidas y sin aplicar (RF-01, RF-04), el gasto de la semana en compras (RF-65), lo más vendido y lo que no rota (RF-61) y las novedades del día (RF-63).
11. **Given** un Administrador en el celular con conexión de datos móviles, **When** abre Negocio, **Then** los números del día están a la vista en menos de 2 segundos.
12. **Given** un Administrador en la computadora, **When** abre Negocio, **Then** tiene la misma información que en el celular.
13. **Given** un usuario sin el rol Administrador, **When** entra a la app o le pide los números del tablero al servidor, **Then** no ve el tablero y el servidor rechaza el pedido.
14. **Given** el dispositivo sin conexión, **When** el Administrador abre Negocio, **Then** ve un texto que dice que los números se ven cuando vuelva internet; si se muestran los últimos números recibidos, dicen de qué momento son.

---

### User Story 3 - Cerrar la caja (Priority: P3)

Al terminar el día, el Vendedor cuenta el efectivo de la caja, tipea el importe y el sistema
le muestra la diferencia contra las ventas en efectivo registradas. Es un control cruzado
simple: lo registrado contra lo que hay en la caja. El resultado les llega a los
Administradores con las novedades del día.

**Why this priority**: es el control diario de la plata del mostrador y el dato que
alimenta las novedades del día.

**Independent Test**: con ventas en efectivo del día por $50.000, el Vendedor tipea $48.000
contados y ve una diferencia de $2.000 de menos, que queda guardada con su usuario.

**Acceptance Scenarios**:

1. **Given** ventas confirmadas en efectivo en el día por $50.000, **When** el Vendedor tipea $50.000 de efectivo contado y cierra la caja, **Then** ve que la diferencia es $0.
2. **Given** ventas confirmadas en efectivo en el día por $50.000, **When** el Vendedor tipea $48.000 y cierra la caja, **Then** ve una diferencia de $2.000 de menos en la caja.
3. **Given** ventas confirmadas en efectivo en el día por $50.000, **When** el Vendedor tipea $53.000 y cierra la caja, **Then** ve una diferencia de $3.000 de más en la caja.
4. **Given** ventas del día por $50.000 en efectivo, $30.000 con Mercado Pago, $20.000 con tarjeta y $15.000 a cuenta corriente, **When** el Vendedor cierra la caja, **Then** el efectivo esperado es $50.000: los otros medios de pago no entran en la cuenta.
5. **Given** ventas en efectivo del día por $50.000, una de ellas de $10.000 anulada antes del cierre, **When** el Vendedor cierra la caja, **Then** el efectivo esperado es $40.000.
6. **Given** un día sin ventas en efectivo, **When** el Vendedor tipea $0 y cierra la caja, **Then** el cierre se guarda con diferencia $0.
7. **Given** la diferencia a la vista, **When** el Vendedor la toca, **Then** ve de dónde sale: cuántas ventas en efectivo hubo, cuánto suman y cuánto efectivo contó.
8. **Given** un cierre de caja guardado, **When** se lo consulta, **Then** tiene el día, la hora, el usuario que lo registró, el efectivo contado, el efectivo esperado y la diferencia, y figura en el registro de quién hizo qué (RF-71).
9. **Given** el Vendedor por cerrar la caja, **When** deja el importe vacío o tipea algo que no es un importe de cero o más, **Then** ve el error en el lugar, que dice que tipee el efectivo contado, y no se guarda nada.
10. **Given** el dispositivo sin conexión, **When** el Vendedor tipea el efectivo contado y cierra la caja, **Then** el importe queda guardado en el dispositivo, se manda solo al volver la conexión y la diferencia se muestra cuando el servidor la calcula con todas las ventas del día (constitución, principio IV).
11. **Given** un cierre de caja guardado, **When** el Administrador mira las novedades de ese día, **Then** ve el efectivo contado, el esperado y la diferencia (RF-63).
12. **Given** un usuario sin el rol Vendedor, **When** entra a la app o le manda un cierre de caja al servidor, **Then** no puede cerrar la caja y el servidor rechaza el pedido.

---

### User Story 4 - Enterarse de lo que pasó en el día (Priority: P4)

Cada día, sin que nadie haga nada, a los Administradores les llega un resumen de lo que
pasó en el local: lo vendido, por qué medios de pago, la diferencia de caja, los ítems
libres que se vendieron y las alertas. El mismo resumen se ve en la app, el del día y los
de días anteriores.

**Why this priority**: es la forma de administrar a distancia sin abrir la app; depende de
las ventas y del cierre de caja.

**Independent Test**: con ventas y un cierre de caja en el día, a la hora de cierre el
Administrador recibe el resumen y, al abrir la app, ve las mismas novedades.

**Acceptance Scenarios**:

1. **Given** un día con 3 ventas confirmadas por $60.000 ($50.000 en efectivo y $10.000 con Mercado Pago), **When** el Administrador abre las novedades del día, **Then** ve el total vendido, la cantidad de ventas y cuánto se cobró por cada medio de pago: efectivo, Mercado Pago, tarjeta y cuenta corriente.
2. **Given** un día con un cierre de caja de $48.000 contados contra $50.000 esperados, **When** el Administrador abre las novedades del día, **Then** ve la diferencia de caja: $2.000 de menos.
3. **Given** un día en que se vendieron dos ítems libres (RF-22), **When** el Administrador abre las novedades del día, **Then** ve cada uno con su descripción, su cantidad y su precio.
4. **Given** dos usuarios con el rol Administrador y uno que solo es Vendedor, **When** llega la hora de cierre, **Then** el resumen del día les llega a los dos Administradores y a nadie más, sin que ningún usuario haga nada.
5. **Given** un usuario al que se le quitó el rol Administrador o que fue desactivado, **When** llega la hora de cierre, **Then** no recibe el resumen.
6. **Given** el resumen que se envió, **When** el Administrador abre las novedades de ese día en la app, **Then** ve la misma información que recibió.
7. **Given** novedades de días anteriores, **When** el Administrador elige un día pasado, **Then** ve las novedades de ese día: no se borran (constitución, principio V).
8. **Given** una venta del día que se registró sin conexión y llegó al servidor después de enviado el resumen, **When** el Administrador abre las novedades de ese día en la app, **Then** la venta está incluida en los números.
9. **Given** un día sin ventas ni cierre de caja, **When** el Administrador abre las novedades del día, **Then** ve un texto que dice que en el día no se registraron ventas.
10. **Given** un usuario sin el rol Administrador, **When** entra a la app o le pide las novedades al servidor, **Then** no las ve y el servidor rechaza el pedido.

---

### User Story 5 - Saber qué se vende y qué no rota (Priority: P5)

El Administrador ve qué productos son los que más se venden y cuáles tienen stock y no se
venden desde hace 90 días, para decidir qué reponer y dónde hay plata parada.

**Why this priority**: orienta las compras y los márgenes, pero necesita varias semanas de
ventas y de stock cargados para decir algo útil.

**Independent Test**: con ventas cargadas y un producto con stock sin ventas en más de 90
días, el Administrador abre Negocio y ve los más vendidos en orden y ese producto entre los
que no rotan.

**Acceptance Scenarios**:

1. **Given** ventas confirmadas de varios productos, **When** el Administrador mira lo más vendido, **Then** ve los productos ordenados del que más se vendió al que menos, cada uno con cuánto se vendió.
2. **Given** un producto con stock cuya última venta confirmada fue 120 días atrás, **When** el Administrador mira lo que no rota, **Then** el producto figura, con la fecha de su última venta y su stock.
3. **Given** un producto con stock cuya última venta confirmada fue 30 días atrás, **When** el Administrador mira lo que no rota, **Then** el producto no figura.
4. **Given** un producto cuya única venta de los últimos 90 días se anuló, **When** el Administrador mira lo que no rota, **Then** el producto figura: una venta anulada no cuenta como rotación ni suma en lo más vendido.
5. **Given** un producto en lo más vendido, **When** el Administrador lo toca, **Then** ve de dónde sale el número: las ventas del período que lo forman.
6. **Given** que no hay ventas confirmadas en el período, **When** el Administrador mira lo más vendido, **Then** ve un texto que dice que todavía no hay ventas para mostrar.
7. **Given** que ningún producto lleva 90 días sin venderse, **When** el Administrador mira lo que no rota, **Then** ve un texto que dice que no hay productos sin rotación.

---

### User Story 6 - Saber cuán rentable es el negocio, mes a mes (Priority: P6)

El Administrador carga los gastos del negocio (alquiler, sueldo, servicios, impuestos) y el
sistema calcula el resultado de cada mes: la ganancia bruta de las ventas menos los gastos.
Ve los últimos 12 meses y cuánto hay que vender por día para cubrir los gastos.

**Why this priority**: responde cuán rentable es el negocio, pero recién sirve con meses
enteros de ventas con su costo.

**Independent Test**: con las ventas de un mes y dos gastos cargados en ese mes, el
Administrador ve el resultado del mes y, al tocarlo, la ganancia bruta y los gastos de los
que sale.

**Acceptance Scenarios**:

1. **Given** un Administrador, **When** carga un gasto con su concepto («Alquiler»), su importe ($400.000) y el mes al que corresponde, **Then** el gasto figura en los gastos de ese mes, con el usuario que lo cargó.
2. **Given** un mes con una ganancia bruta de $900.000 y gastos por $600.000, **When** el Administrador mira el resultado de ese mes, **Then** ve un resultado de $300.000.
3. **Given** un mes con una ganancia bruta de $500.000 y gastos por $600.000, **When** el Administrador mira el resultado de ese mes, **Then** ve un resultado de $100.000 en contra, distinguible a simple vista de un resultado a favor y no solo por el color.
4. **Given** el resultado de un mes a la vista, **When** el Administrador lo toca, **Then** ve de dónde sale: lo vendido, el costo de lo vendido, la ganancia bruta y cada gasto del mes con su concepto y su importe.
5. **Given** ventas y gastos en varios meses, **When** el Administrador mira el resultado mensual, **Then** ve el resultado de cada uno de los últimos 12 meses, en orden, y puede comparar un mes con otro de un vistazo.
6. **Given** un mes sin gastos cargados, **When** el Administrador mira el resultado de ese mes, **Then** ve la ganancia bruta y un texto que dice que ese mes no tiene gastos cargados, para que no se lea como el resultado final.
7. **Given** un gasto cargado con un importe equivocado, **When** el Administrador lo corrige o lo da de baja, **Then** el resultado del mes se recalcula y el valor anterior queda en el historial con el usuario y la fecha del cambio: no se borra (constitución, principio V).
8. **Given** una compra de mercadería confirmada en el mes, **When** se calcula el resultado, **Then** la compra no se resta como gasto: el costo de la mercadería ya está descontado en la ganancia bruta, al venderse.
9. **Given** gastos cargados en el mes, **When** el Administrador mira el punto de equilibrio, **Then** ve cuánto hay que vender por día para cubrir los gastos y, al tocarlo, la cuenta con sus números de origen.
10. **Given** un usuario sin el rol Administrador, **When** entra a la app o le pide al servidor los gastos o el resultado, **Then** no los ve y el servidor rechaza el pedido.

---

### Edge Cases

- **Cambio de día con la app abierta:** al pasar la medianoche del local, «el día» pasa a
  ser el nuevo; los números del día anterior dejan de mostrarse como del día.
- **Ventas que llegan tarde:** una venta registrada sin conexión cuenta en el día en que se
  vendió, no en el que llegó al servidor (RNF-10). Los números del tablero, de las novedades
  y el efectivo esperado de ese día la incluyen desde que llega.
- **Una venta anulada después del cierre de caja:** el cierre guardado no se modifica
  (constitución, principio V). Cómo se refleja la anulación en la diferencia depende de la
  aclaración de RF-62 sobre lo que pasa después del cierre.
- **Importes de venta:** toda venta es múltiplo de $1.000 (RF-19), así que el efectivo
  esperado también lo es. El efectivo contado se acepta tal como se tipea.
- **Varios dispositivos:** el efectivo esperado y los números del tablero salen de todas
  las ventas del día, sin importar desde qué dispositivo se cargaron.
- **El resumen no se pudo enviar:** las novedades del día se ven igual en la app, que no
  depende del envío.
- **Producto unido con otro (RF-06):** lo más vendido y lo que no rota cuentan las ventas
  de los productos unidos como de uno solo.
- **Producto que se vende fraccionado (RF-12):** las cantidades vendidas se muestran en su
  unidad (kilo, metro, litro), con hasta un decimal.
- **Servidor caído o respuesta con error:** cada bloque de información dice que no se pudo
  cargar y ofrece reintentar; lo demás de la app sigue funcionando (RNF-11).

## Requirements *(mandatory)*

### Functional Requirements

- **RF-60**: El sistema muestra al Administrador un tablero con las ventas y la ganancia
  del día, de la semana y del mes, y su comparación con el período anterior.
  - Por período: total vendido, cantidad de ventas, ticket promedio (total vendido dividido
    por cantidad de ventas) y ganancia (lo vendido menos el costo de lo vendido, con el
    costo que cada venta guardó en su momento, RNF-31).
  - La comparación muestra, para cada número, el valor del período anterior y la diferencia
    en pesos y en porcentaje.
  - El tablero reúne además lo que el Administrador necesita para ver cómo va el negocio:
    plata invertida en stock (RF-53), stock bajo (RF-54), pedidos de clientes sin entregar
    (RF-26), listas de precios sin aplicar (RF-01, RF-04), gasto de la semana (RF-65), lo
    más vendido y lo que no rota (RF-61) y las novedades del día (RF-63).
  - Se ve en el celular y en la computadora, desde cualquier lado, y en el celular carga en
    menos de 2 segundos.
  - [NEEDS CLARIFICATION: ¿la «semana» y el «mes» del tablero son de calendario (de lunes a
    domingo; del 1 al último día del mes) o móviles (los últimos 7 y los últimos 30 días)?
    ¿Y se puede mirar un día, una semana o un mes anteriores, o solo el período en curso?]
  - [NEEDS CLARIFICATION: ¿contra qué se compara cada período? Para el día: ¿contra el día
    anterior o contra el mismo día de la semana anterior? Para la semana y el mes en curso,
    que están incompletos: ¿contra el período anterior entero o contra el período anterior
    hasta el mismo día?]
  - [NEEDS CLARIFICATION: un ítem libre (RF-22) se vende sin costo conocido. ¿Cómo entra en
    la ganancia: como ganancia total, con ganancia cero, o se deja afuera y se muestra
    aparte cuánto se vendió sin costo?]
  - [NEEDS CLARIFICATION: una venta a cuenta corriente, ¿cuenta en lo vendido y en la
    ganancia del día en que se vendió, o recién cuando el cliente la paga?]
- **RF-61**: El sistema muestra al Administrador lo más vendido y lo que no rota.
  - Lo más vendido: los productos ordenados del que más se vendió al que menos, con cuánto
    se vendió de cada uno.
  - Lo que no rota: los productos sin ninguna venta confirmada en los últimos 90 días, con
    la fecha de su última venta y su stock.
  - [NEEDS CLARIFICATION: ¿«lo más vendido» se ordena por unidades vendidas, por plata
    vendida o por ganancia? ¿De qué período (el día, la semana, el mes, o el mismo que se
    elige en el tablero)? ¿Cuántos productos se muestran?]
  - [NEEDS CLARIFICATION: ¿«lo que no rota» incluye solo productos con stock, o también los
    que están en el catálogo sin stock? ¿Y un producto que entró al stock hace menos de 90
    días y todavía no se vendió nunca figura como sin rotación?]
- **RF-62**: El Vendedor cierra la caja del día tipeando el efectivo contado, y el sistema
  muestra la diferencia contra las ventas en efectivo confirmadas de ese día.
  - Solo cuentan las ventas cobradas en efectivo; Mercado Pago, tarjeta y cuenta corriente
    no entran.
  - El cierre queda guardado con el día, la hora, el usuario, el efectivo contado, el
    efectivo esperado y la diferencia; no se borra ni se modifica.
  - La diferencia dice de dónde sale: cuántas ventas en efectivo hubo, cuánto suman y
    cuánto se contó.
  - El resultado del cierre forma parte de las novedades del día (RF-63).
  - [NEEDS CLARIFICATION: ¿la caja arranca el día con un fondo de cambio? ¿Y en el día entra
    o sale efectivo que no es una venta: pagos a proveedores con plata de la caja, retiros
    del Administrador, gastos chicos, cobros en efectivo de una cuenta corriente? Si pasa,
    ¿el Vendedor tiene que anotarlos para que la diferencia los tenga en cuenta?]
  - [NEEDS CLARIFICATION: antes de tipear lo contado, ¿el Vendedor puede ver cuánto efectivo
    espera el sistema, o se le muestra recién después de cerrar, para que cuente sin saber
    el número?]
  - [NEEDS CLARIFICATION: ¿hay un solo cierre por día? Si el Vendedor se equivocó al tipear,
    ¿puede cerrar de nuevo, y quién puede hacerlo? ¿Y qué pasa con una venta en efectivo que
    se registra o se anula después del cierre: cambia la diferencia de ese día o pasa al
    día siguiente?]
- **RF-63**: El sistema arma cada día las novedades del día, un resumen de lo que pasó, las
  muestra en la app y las envía solas a los Administradores y a nadie más.
  - Contenido: total vendido y cantidad de ventas, lo cobrado por cada medio de pago, la
    diferencia de caja (RF-62), los ítems libres vendidos (RF-22) y las alertas.
  - El envío sale todos los días a la hora de cierre, sin que nadie intervenga, a cada
    usuario activo con el rol Administrador.
  - En la app se ven las novedades del día y las de los días anteriores.
  - [NEEDS CLARIFICATION: ¿por dónde se envía el resumen: WhatsApp, correo, o los dos? El
    envío no puede tener costo (RNF-42).]
  - [NEEDS CLARIFICATION: ¿cuál es la «hora de cierre»: una hora fija (¿cuál?) o el momento
    en que el Vendedor cierra la caja? Si es una hora fija y la caja no se cerró, ¿el
    resumen sale igual, avisando que la caja está sin cerrar? ¿Se envía también los días en
    que el local no abre?]
  - [NEEDS CLARIFICATION: ¿qué alertas trae el resumen? Por ejemplo: diferencia de caja,
    ventas anuladas, productos que quedaron con stock bajo, ventas con precio puesto a mano,
    pedidos de clientes prometidos para el día.]
  - [NEEDS CLARIFICATION: en la app, ¿las novedades del día las ven solo los Administradores,
    o también el Vendedor y el Comprador?]
- **RF-64**: El sistema guarda los gastos del negocio y calcula el resultado de cada mes.
  - Un gasto tiene concepto, importe y mes al que corresponde; queda con el usuario que lo
    cargó, y corregirlo o darlo de baja no borra el valor anterior.
  - Resultado del mes = ganancia bruta del mes (lo vendido menos el costo de lo vendido)
    menos los gastos del mes. El mes es el de calendario.
  - Las compras de mercadería no son un gasto del resultado: su costo se descuenta en la
    ganancia bruta, al venderse.
  - Se ve el resultado de cada uno de los últimos 12 meses.
  - Se ve el punto de equilibrio: cuánto hay que vender por día para cubrir los gastos.
  - Los gastos fijos son además el dato de entrada para decidir márgenes con datos (RF-16).
  - [NEEDS CLARIFICATION: ¿quién carga los gastos: solo el Administrador? Y un gasto fijo
    (alquiler, sueldo), ¿se carga una vez y se repite solo todos los meses hasta que se
    cambia, o se carga mes a mes?]
  - [NEEDS CLARIFICATION: además de los fijos, ¿qué gastos variables hay que poder cargar?
    Por ejemplo fletes o las comisiones de Mercado Pago y de la tarjeta. ¿Las comisiones se
    cargan a mano o el sistema las calcula a partir de las ventas?]
  - [NEEDS CLARIFICATION: para el punto de equilibrio, ¿qué margen se usa para pasar de
    gastos a ventas necesarias (el del mes en curso, el promedio de los últimos meses) y
    entre cuántos días se reparte (qué días de la semana abre el local)?]
  - [NEEDS CLARIFICATION: el resultado tiene que cerrar con lo que informa el contador
    «dentro de un margen razonable». ¿Cuánta diferencia es aceptable, y contra qué número
    del contador se compara (con o sin IVA, solo lo facturado o todo lo vendido)?]
- **RF-65**: El sistema muestra el gasto semanal en compras, sin papel: el total de la
  semana y, por proveedor, el importe y la cantidad de compras, de mayor a menor importe.
  - Solo cuentan las compras confirmadas (RF-50); las anuladas no. Cuenta la fecha de la
    compra, no el momento en que se cargó.
  - Lo ve el Comprador en el lugar donde registra las compras, y el Administrador en el
    tablero (RF-60). Se actualiza sin recargar al registrar o anular una compra.
  - Dice desde qué día y hasta qué día cuenta, y cada importe por proveedor se abre para
    ver las compras que lo forman.
  - [NEEDS CLARIFICATION: ¿la «semana» del gasto son los últimos 7 días contando el día en
    curso, o la semana de calendario (de lunes a domingo)? Tiene que ser la misma definición
    que la semana del tablero (RF-60). ¿Y hay que poder ver el gasto de semanas anteriores,
    ya que el papel se tiraba y el sistema lo guarda?]

### Key Entities *(include if feature involves data)*

- **Venta** (de la capacidad de ventas): con su fecha, su medio de pago, su estado
  (confirmada o anulada) y, por renglón, el precio y el costo de ese momento. De ella salen
  lo vendido, la ganancia, lo más vendido, el efectivo esperado y las novedades.
- **Compra** (de la capacidad de compras y stock): cada ingreso de mercadería a un
  proveedor, con su fecha, su total y su estado. De ella sale el gasto semanal.
- **Proveedor** (de catálogo y precios): da el nombre con que se agrupa el gasto semanal.
- **Producto y su stock** (de catálogo y de compras y stock): para lo más vendido y lo que
  no rota.
- **Cierre de caja**: el día, la hora, el usuario que lo registró, el efectivo contado, el
  efectivo esperado y la diferencia. Solo se agregan cierres; ninguno se borra ni se pisa.
- **Novedades del día**: el resumen de un día, con sus números y sus alertas.
- **Gasto**: concepto, importe, mes al que corresponde, usuario que lo cargó e historial de
  sus cambios.
- **Usuario y rol** (de usuarios y acceso): quién puede ver cada cosa y a quién se le
  envían las novedades.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Para saber cuánto se gastó en compras en la semana no se usa ningún papel ni
  se suma nada a mano.
- **SC-002**: Una compra recién registrada o anulada se refleja en el gasto de la semana
  sin recargar.
- **SC-003**: El gasto de la semana coincide con la suma de los totales de las compras
  confirmadas de ese período, y cada número del tablero coincide con la suma de las ventas
  confirmadas de las que dice salir.
- **SC-004**: El Administrador ve los números del día en el celular en menos de 2 segundos
  desde que abre Negocio.
- **SC-005**: Para cerrar la caja el Vendedor tipea un solo dato, el efectivo contado, y
  ve la diferencia sin hacer ninguna cuenta.
- **SC-006**: El resumen del día les llega a los Administradores todos los días a la hora
  de cierre, sin que nadie haga nada.
- **SC-007**: El resultado de un mes coincide con el que informa el contador, dentro del
  margen que se acuerde (ver RF-64).
- **SC-008**: Desde cualquier número de la capacidad se llega, tocándolo, a los números de
  origen que lo explican.

## Assumptions

- Registrar, ver y anular compras es RF-50, de la capacidad de compras y stock; acá solo se
  especifica la suma semanal que sale de ellas.
- La lista de las ventas del día, con su detalle, su corrección y su anulación, es RF-23,
  de la capacidad de ventas; acá se especifican los totales y la ganancia.
- La plata invertida en stock (RF-53), el stock bajo (RF-54), los pedidos de clientes
  (RF-26) y las listas de precios (RF-01, RF-04) se especifican en su capacidad; el tablero
  los muestra con las reglas de cada una.
- Qué rol puede cada cosa lo fija RF-72. Esta especificación asigna el tablero, lo más
  vendido, las novedades y el resultado al Administrador, el cierre de caja al Vendedor y
  el gasto semanal al Comprador y al Administrador, como lo dicen la decisión 8 del
  2026-10-09 y los casos de uso «Ver cómo va el negocio» y «Cerrar la caja».
- El gasto semanal cuenta lo comprado en la semana, esté pago o no. Lo que se les debe a
  los proveedores y cuándo vence es RF-56.
- La ganancia de esta capacidad es bruta: lo vendido menos el costo de lo vendido. El costo
  es el que rige para las ventas, con la regla de RF-11.
- En esta etapa no hay devoluciones de plata (RF-24b) ni señas por pedidos (RF-26), así que
  por esos motivos no entra ni sale efectivo de la caja.

## Clarifications

### Session 2026-10-08

- Q: ¿Hay devoluciones de plata? → A: En esta versión no; solo cambios por otro producto
  (decisión 2, RF-24). Para el cierre de caja: no sale efectivo por devoluciones.
- Q: ¿Se toma seña por los pedidos de clientes sin stock? → A: No, se le dice al cliente
  qué día va a estar y se lo espera (decisión 3, RF-26). Para el cierre de caja: no entra
  efectivo por señas.
- Q: ¿Cómo se les paga a los proveedores? → A: Por adelantado cuando hay descuento; si no,
  a 30 o 60 días (decisión 4, RF-56). Para el gasto semanal: lo comprado en la semana y lo
  pagado en la semana no son lo mismo.
- Q: ¿Cómo se redondean los precios? → A: Siempre para arriba, a múltiplos de $1.000
  (decisión 5, RF-19).

### Session 2026-10-09

- Q: ¿Qué pasa con el vuelto? → A: No hay billetes chicos: toda venta es múltiplo de $1.000
  y se redondea para arriba cada renglón (decisión 7, RF-19). Para el cierre de caja: el
  efectivo esperado es siempre múltiplo de $1.000.
- Q: ¿Cómo se dan los permisos para ver la información del negocio? → A: Por rol:
  Administrador, Vendedor y Comprador, combinables en un mismo usuario. «Ver cómo va el
  negocio» es del Administrador; vender, del Vendedor; recibir la mercadería y registrarla,
  del Comprador (decisión 8, RF-72).
- Q: ¿La información del negocio tiene que verse igual en las dos interfaces? → A: Celular
  y computadora son interfaces distintas sobre la misma información, con la misma paleta y
  la misma marca (decisión 9, ADR-014).

### Session 2026-10-10

- Q: ¿La especificación describe lo que el código hace o lo que el negocio necesita? → A:
  Lo que el negocio necesita: es independiente del código y tiene que alcanzar para
  rehacer la aplicación (constitución, principio I).
