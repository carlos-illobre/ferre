# Research: Ventas

Relevamiento mudado de `docs/proceso-actual.md` (secciones «Venta» y «Consulta de precio sin
venta»). Describe cómo se trabaja en el mostrador sin sistema, paso por paso: es la vara
contra la que se mide la pantalla de venta. Fuente original: relato del dueño, 2026-09-13;
conviene confirmarlo observando en el mostrador durante el piloto (issue #21).

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
