# Relevamiento: compra a proveedor

Viene de `docs/proceso-actual.md`, sección «Compra a proveedor». Fuente original: relato del
dueño, 2026-09-13; conviene confirmarlo observando en el mostrador durante el piloto
(issue #21).

## Compra a proveedor

1. Se detecta que falta algo (estantería, pedido de un cliente).
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
