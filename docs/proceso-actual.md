# Procedimiento actual del empleado

Cómo se trabaja hoy, sin sistema, paso por paso. Es la vara contra la que se mide cada
pantalla: si el sistema es más lento que esto, está mal (ver `docs/ux.md`).

Fuente: relato del dueño, 2026-09-13. Conviene confirmarlo observando en el mostrador durante el piloto (issue #21).

## Venta

1. Entra un cliente al mostrador y pide un producto.
2. El empleado **recuerda de memoria qué proveedor** lo vende y busca el producto en la
   lista de precios de ese proveedor.
3. Con la **calculadora**, aplica el margen sobre el costo. El porcentaje sale de a ojo
   según el monto: barato (un clavo) ~300 %, medio (un pincel) ~100 %, caro (un taladro)
   ~25 %.
4. Le dice el precio al cliente.
5. Si el cliente acepta, dice la cantidad. El empleado **va a buscar la mercadería**.
6. Cobra: efectivo, Mercado Pago o tarjeta.
7. Entrega el producto.
8. **Después**, anota en el cuaderno: fecha, nombre del producto, cantidad y precio de
   venta. **Un renglón por producto.**

### Lo que hoy no queda registrado

- El medio de pago.
- El costo al que se calculó el precio, ni el margen aplicado.
- El proveedor del producto.
- Qué ventas fueron a un mismo cliente (no hay noción de "ticket", solo renglones).
- Las ventas que no se concretaron porque el cliente no aceptó el precio.

### Dónde se va el tiempo

| Paso | Cuánto cuesta hoy | Qué puede mejorar el sistema |
|---|---|---|
| Recordar el proveedor y buscar en su lista | Depende de la memoria; con proveedores nuevos o productos raros, se demora o se pregunta | Búsqueda única sobre todas las listas, sin saber el proveedor |
| Calcular el margen con calculadora | Un cálculo por producto, con riesgo de error de tecla | Costo a la vista y selector de margen: un clic o una tecla (issue #13) |
| Anotar en el cuaderno después de entregar | Se hace al final, cuando el cliente ya se fue; si entra otro cliente, se posterga o se olvida | La venta queda registrada en el mismo gesto de calcular el precio (issue #15) |

### Consecuencia para el diseño de la pantalla de venta

El orden de la pantalla tiene que ser el orden real del mostrador, no el de un sistema de
facturación:

1. Buscar el producto (sin pedir proveedor).
2. Ver costo, elegir margen, ver precio. **Antes de saber la cantidad**, porque el
   cliente decide con el precio en la mano.
3. Cantidad.
4. Medio de pago (un toque; no debe frenar si se saltea).
5. Listo. Si el cliente no acepta, se descarta con una tecla y no queda basura.

El cuaderno registra un renglón por producto: la pantalla puede agrupar varios renglones
en una venta cuando el cliente lleva varias cosas, pero tiene que ser igual de natural
cargar uno solo.

## Consulta de precio sin venta

Pasa **muy seguido** y no se anota. Es demanda que hoy se pierde: no se sabe qué piden y
no se compra, ni si fue por precio o porque no había.

**Consecuencia:** cuando una venta se descarta, la pantalla puede guardar la consulta con
una tecla (producto, precio ofrecido, motivo si se quiere). Costo casi nulo; sirve para
decidir qué comprar y qué remarcar. Se agrega como opcional en el issue #15.

## Compra a proveedor

1. Se detecta que falta algo (góndola, pedido de un cliente).
2. **No todos los proveedores venden todo:** se identifica qué proveedores tienen el
   producto y, entre ellos, se elige **el más barato**. Hoy eso es memoria más consulta
   de varios Excel.
3. Se pide por **teléfono, WhatsApp, o al vendedor que pasa por el local**. En urgencias
   el empleado va en persona al proveedor, pero se evita: su tiempo es para el mostrador.
4. Llega la mercadería con **remito y factura** en la gran mayoría de los casos. **Dos
   proveedores no emiten factura**: la mercadería se verifica cuando la entregan en
   persona, contra lo pedido, y no queda papel.
5. El empleado controla lo que llega.
6. Lo único que se anota es **un papel a mano con los gastos de la semana**, que el
   empleado le muestra al dueño y después se tira.

### Lo que hoy no queda registrado

- Qué ingresó, cuándo y a qué costo real (la factura queda, pero no se carga en ningún
  lado).
- El detalle de gastos: el papel semanal se tira después de mostrarlo.
- Qué proveedor tenía el mejor precio en cada compra.

### Consecuencia para el diseño

- El ingreso de mercadería (issue #30) reemplaza el papel semanal: si cada compra queda
  cargada, el "gasto de la semana" es un informe automático para el dueño.
- Saber qué proveedores venden el mismo producto y cuál es el más barato (issue #29) es
  parte del trabajo diario de comprar, no una mejora tardía.
- Para los dos proveedores sin factura el ingreso se carga igual, con "sin factura" como
  comprobante.

## Clientes importantes

- Compran a **cuenta corriente** (fiado). Cada compra se anota en **un cuaderno de deudas**; cuando el cliente
  paga, se tacha el renglón.
- A veces tienen **precio distinto**, según la cantidad que compran y la velocidad con
  que pagan. Lo decide el empleado o el dueño en el momento.

### Consecuencia para el diseño

- "Cuenta corriente" tiene que ser un medio de pago desde el MVP, con el nombre del
  cliente. Sin eso, las ventas a los clientes grandes seguirían en un cuaderno aparte.
- La cuenta corriente completa (saldo, pagos parciales, resumen) es el issue #43; el
  tachado del renglón se traduce a "marcar como pagada".
- El precio especial se cubre con el precio manual por línea del issue #13; no hace
  falta una lista de precios por cliente en el MVP.

## Listas de precios

- No hay listas impresas: se usan **los mismos Excel que mandan los proveedores**, en la
  laptop.
- Las descarga **el propio empleado** del mail del negocio.

### Consecuencia para el diseño

- La carga de una lista (issue #12) la hace el empleado, así que tiene que ser arrastrar
  el archivo y confirmar. La ingesta automática desde el mail (issue #25) le saca ese
  paso.
- Mientras el sistema no tenga un proveedor, el empleado va a seguir abriendo su Excel:
  cargar los 50 proveedores (issue #28) es lo que hace que deje de hacerlo.
