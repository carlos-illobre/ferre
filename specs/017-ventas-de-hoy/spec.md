# Feature Specification: Ventas de hoy renovada

**Feature Branch**: `017-ventas-de-hoy`

**Created**: 2026-10-17

**Status**: Aprobada (Carlos, 2026-10-17, con sus respuestas a las dos aclaraciones)

**Input**: Carlos, el 2026-10-17, sobre una imagen de referencia de «Ventas de hoy»: que entren la
comparación con ayer, un gráfico de lo vendido por hora, cada medio de pago en su tarjeta con su
color y cuántas ventas, tres números (ventas realizadas, productos vendidos, ticket promedio),
cada venta como un renglón corto que se toca para ver el detalle, y «Cambiar fecha» para ver
otro día. No entran: un número de venta correlativo, el «Tip», «Ver todas», imprimir
comprobantes. Los colores de los medios de pago siguen la decisión 108 (colores por significado).

## Clarifications

### Session 2026-10-17

- Q: ¿Qué entra de la imagen de referencia? → A: Los seis puntos de arriba; no entran el número de venta, el «Tip», «Ver todas» ni imprimir.
- Q: ¿Contra qué se compara el total de hoy? → A: Contra lo vendido ayer hasta la misma hora: a las 11 se compara con ayer a las 11. Un día anterior, ya terminado, se compara entero con el suyo entero (decisión 109).
- Q: ¿Quién ve las ventas de otros días? → A: Cualquiera con «Ver las ventas del día», el permiso de la pestaña «Hoy»; no hay un permiso aparte (decisión 109).
- Q: ¿Qué maqueta? → A: La C: el total, la comparación, el gráfico y los cuatro medios en renglones, todo en la tarjeta oscura; debajo, los tres números en una tira y la lista de ventas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cómo va el día, de un vistazo (Priority: P1)

Quien abre «Hoy» ve el total vendido, si va mejor o peor que ayer, a qué horas se vendió y
cuánto entró por cada medio de pago, sin sumar nada.

**Why this priority**: Es lo que se mira varias veces por día y al cerrar la caja.

**Independent Test**: Con ventas de hoy y de ayer en distintos medios y horas, abrir «Hoy» y
comprobar el total, la comparación, el gráfico y las tarjetas de cada medio.

**Acceptance Scenarios**:

1. **E01** **Given** ventas confirmadas hoy por $293.000, **When** se abre «Hoy», **Then** el total dice $293.000; las anuladas no suman.
2. **E02** **Given** hoy $293.000 hasta las 11:30 y ayer $250.000 hasta las 11:30, **When** se abre «Hoy», **Then** debajo del total dice «+17 % vs. ayer ($250.000)», en verde; si hoy va por debajo, el porcentaje es negativo y en el color de lo que baja.
3. **E03** **Given** ayer no hubo ventas (cerrado), **When** se abre «Hoy», **Then** dice «Ayer a esta hora no había ventas» en lugar de un porcentaje.
4. **E04** **Given** ventas a las 9, 10 y 11, **When** se abre «Hoy», **Then** el gráfico muestra una barra por hora con lo vendido en esa hora, desde la primera hora con ventas hasta la última (y, si es hoy, hasta la hora actual); tocar o señalar una barra dice el importe y la hora.
5. **E05** **Given** ventas en efectivo, Mercado Pago y cuenta corriente, **When** se abre «Hoy», **Then** hay una tarjeta por medio de pago (Efectivo, Mercado Pago, Tarjeta, Cuenta corriente), cada una con su ícono, su color, el importe y cuántas ventas («1 venta», «0 ventas»).
6. **E06** **Given** los medios de pago en otra pantalla (Vender, el cobro, Anular), **When** se los ve, **Then** cada medio tiene el mismo color que en «Hoy» (decisión 108).

---

### User Story 2 - Tres números del día (Priority: P2)

Quien abre «Hoy» ve cuántas ventas se hicieron, cuántos productos se vendieron y el ticket
promedio.

**Why this priority**: Dicen si se vendió a mucha gente poco o a poca gente mucho.

**Independent Test**: Con tres ventas confirmadas (una de dos productos) y una anulada, ver «3
ventas», «4 productos» y el ticket promedio.

**Acceptance Scenarios**:

1. **E07** **Given** tres ventas confirmadas y una anulada, **When** se abre «Hoy», **Then** «Ventas realizadas» dice 3.
2. **E08** **Given** ventas con 2, 1 y 3 productos distintos, **When** se abre «Hoy», **Then** «Productos vendidos» dice 6: cuenta los renglones de las ventas confirmadas, no las unidades ni los kilos.
3. **E09** **Given** $293.000 en 3 ventas, **When** se abre «Hoy», **Then** «Ticket promedio» dice $97.667 (el total dividido las ventas, sin centavos).
4. **E10** **Given** ninguna venta en el día, **When** se abre «Hoy», **Then** los tres números dicen 0 y el ticket promedio «—».

---

### User Story 3 - Las ventas, cortas, y el detalle al tocar (Priority: P1)

Cada venta es un renglón corto: la hora, cuántos productos, el medio de pago con su ícono y el
importe. Al tocarla se ven sus productos, uno por renglón, con cantidad y precio.

**Why this priority**: Hoy, en el celular, una venta grande ocupa media pantalla; con renglones
cortos se ven más ventas a la vez.

**Independent Test**: Con una venta de tres productos, verla en un renglón («11:05 · 3
productos · Cuenta corriente · $58.000») y tocarla para ver los tres.

**Acceptance Scenarios**:

1. **E11** **Given** una venta de 3 productos en cuenta corriente a Constructora Martínez, **When** se mira la lista, **Then** su renglón dice la hora, «3 productos», el medio con su ícono, el cliente y el importe.
2. **E12** **Given** una venta de un solo producto, **When** se mira la lista, **Then** el renglón dice el producto («1 × Taladro inalámbrico 18 V») en lugar de «1 producto».
3. **E13** **Given** el renglón de una venta, **When** se lo toca, **Then** se ven sus productos, uno por renglón, con cantidad, precio por unidad y total (lo que hoy muestra «Hoy»); en la computadora, también con Enter.
4. **E14** **Given** una venta anulada, **When** se mira la lista, **Then** sigue en su hora, tachada y con «anulada», y no suma en el total, los medios ni los tres números.
5. **E15** **Given** la lista, **When** se mira, **Then** está ordenada de la más reciente a la más vieja.

---

### User Story 4 - Ver otro día (Priority: P2)

Quien puede ve las ventas de un día anterior con «Cambiar fecha»: lo mismo que «Hoy», para ese
día, comparado con el día anterior a ese.

**Why this priority**: Es lo que falta de RF-23 (días anteriores): revisar un día que no cerró,
o comparar.

**Independent Test**: Elegir ayer con «Cambiar fecha» y ver sus ventas, su total y su
comparación con anteayer; volver a hoy.

**Acceptance Scenarios**:

1. **E16** **Given** «Hoy» abierto, **When** se toca «Cambiar fecha» y se elige el 15/10/2026, **Then** el título dice «Ventas del miércoles 15/10» y todo (total, comparación, gráfico, medios, números y lista) es de ese día.
2. **E17** **Given** otro día elegido, **When** se mira la comparación, **Then** es el día entero contra el día anterior a ese, entero.
3. **E18** **Given** otro día elegido, **When** se toca «Volver a hoy», **Then** se ve hoy otra vez.
4. **E19** **Given** «Cambiar fecha», **When** se elige una fecha futura, **Then** no se puede: el calendario llega hasta hoy.
5. **E20** **Given** un día sin ventas, **When** se lo elige, **Then** dice «No hubo ventas ese día» y los números en 0.
6. **E21** **Given** sin conexión, **When** se elige otro día, **Then** dice que hace falta internet para ver otro día; hoy se sigue viendo con lo que el dispositivo tiene, como ahora.

### Edge Cases

- Una venta cerca de la medianoche cuenta en el día del local (hora de Buenos Aires), como hoy (capacidad 003).
- Una venta sin mandar todavía (sin conexión): aparece en la lista como hoy, marcada como pendiente, y suma en el total del dispositivo.
- Ayer con ventas solo después de la hora actual: la comparación dice «Ayer a esta hora no había ventas».
- Un día de muchas ventas (200): la lista sigue siendo de renglones cortos y se desplaza; los números de arriba se ven sin bajar.
- Quien no tiene «Ver las ventas del día» no ve la pestaña, como hoy.

## Requirements *(mandatory)*

### Functional Requirements

- **RF-117**: «Hoy» muestra el total del día con su comparación contra ayer (porcentaje e importe de ayer) y un gráfico de lo vendido por hora. En el celular y en la computadora.
- **RF-118**: Cada medio de pago se muestra con su ícono y su color, el importe y cuántas ventas; el color de cada medio es el mismo en toda la aplicación (decisión 108).
- **RF-119**: «Hoy» muestra las ventas realizadas, los productos vendidos (renglones) y el ticket promedio del día, sin las anuladas.
- **RF-120**: Cada venta del día es un renglón corto (hora, cuántos productos o el único producto, medio de pago con ícono, cliente si hay, importe) que se abre para ver sus productos.
- **RF-121**: «Cambiar fecha» muestra lo mismo para un día anterior, comparado con su día anterior (completa RF-23, días anteriores).

### Key Entities *(include if feature involves data)*

- **Venta**: la que ya existe, con su fecha y hora, medio de pago, cliente, estado y renglones. No se guarda nada nuevo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Saber si el día va mejor o peor que ayer lleva cero cuentas: se lee arriba de todo.
- **SC-002**: En el celular, sin bajar, se ven el total, la comparación, el gráfico y los cuatro medios de pago.
- **SC-003**: En el celular entran al menos el doble de ventas por pantalla que hoy.
- **SC-004**: Ver las ventas de un día anterior lleva dos toques.

## Assumptions

- «Productos vendidos» cuenta renglones de ventas confirmadas (un producto vendido por kilo es uno), porque sumar unidades y kilos no da un número que se entienda.
- El gráfico va por hora entera del local; las horas sin ventas entre la primera y la última aparecen vacías.
- «Anular» sigue en su pestaña con sus reglas; «Hoy» no deja tocar nada, como ahora (decisión 72).
- Los colores de los medios salen de la paleta compartida y se eligen en la maqueta.
