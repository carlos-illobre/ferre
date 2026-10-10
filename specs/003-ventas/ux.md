# UX: Ventas

Qué pantallas existen hoy para esta capacidad. Las reglas generales (la vara del cuaderno,
avisos en el lugar, sin ventanas de confirmación) están en `docs/ux.md` y en la
constitución, principio II. La interfaz se elige por el ancho de la pantalla: menos de
900 px, celular; 900 px o más, computadora (`clientes/gestion-del-local-web/src/vista.ts`).

## Computadora

| Pantalla | Archivo | Qué muestra |
|---|---|---|
| Vender | `clientes/gestion-del-local-web/src/escritorio/pantallas/Vender.tsx` | Es la pantalla de inicio. Búsqueda arriba, con el foco, y sus sugerencias (descripción, marca y proveedor, stock, precio o «sin precio»). La venta es una tabla, una fila por renglón: foto, producto, costo (con su explicación), los cinco botones de margen, precio (con su explicación) y campo «a mano», cantidad y unidad, subtotal (explica el redondeo cuando lo hubo) y ✕ para quitar. Abajo: total, los cuatro medios de pago, selector de cliente si es cuenta corriente, «Cobrar» y «No llevó». Una línea recuerda los atajos: Enter agrega, Esc descarta, F5 a F8 medio de pago, F2 cobrar. Los avisos van en el lugar |
| Ventas de hoy | Mismo archivo (componente `VentasDeHoy`, dentro de Vender) | Panel plegable debajo de la venta, que arranca abierto. El título lleva el total del día, el total por medio de pago y la cantidad de ventas. Tabla con hora, productos, pago, total y «Anular». Una venta de varios productos muestra cada uno en su fila (cantidad × producto, precio por unidad, subtotal) y se pliega tocando la fila de la venta. Las anuladas dicen «anulada». «Anular» pide el motivo en un cuadro del navegador |

## Celular

| Pantalla | Archivo | Qué muestra |
|---|---|---|
| Vender | `clientes/gestion-del-local-web/src/pantallas/Vender.tsx` | Primera de las cuatro pestañas. Indicador de conexión, título, buscador con el botón de la cámara. Sin nada cargado, el estado vacío: «Venta nueva. Escribí el nombre del producto o escaneá el código de barras». Cada renglón es una tarjeta: foto, producto y subtotal (al tocarlo explica de dónde sale) arriba; cantidad con − y +, unidad, chip del margen y quitar abajo. El chip despliega en el mismo renglón el costo con su explicación, los cinco botones de margen y «Otro precio solo para esta venta». Si la búsqueda no encuentra nada, ofrece «Agregar … como ítem libre». La barra de cobro queda abajo: los cuatro medios de pago, el cliente si es cuenta corriente, «No llevó» y «Cobrar» con el total |
| Elegir cliente | Mismo archivo (hoja «¿Quién lleva a cuenta?») | Sube al elegir «Cta. cte.» sin cliente: lista de clientes con «debe $…» o «al día» |
| Venta registrada | Mismo archivo (componente `Exito` de `src/componentes/base.tsx`) | Pantalla completa al cobrar: «Venta registrada» (o «Guardada en este dispositivo» sin conexión), el importe grande, cómo pagó, el detalle y un solo botón, «Nueva venta» |
| Ventas de hoy, en Vender | `clientes/gestion-del-local-web/src/pantallas/VentasDeHoy.tsx`, abierta desde `Vender.tsx` | Solo para quien administra (dueño o admin): un chip «Hoy» con el total del día abre una hoja con la lista de ventas |
| Ventas de hoy, en Negocio | `clientes/gestion-del-local-web/src/pantallas/VentasDeHoy.tsx`, usada en `clientes/gestion-del-local-web/src/pantallas/Negocio.tsx` | Para todos: tarjeta con el total de hoy, la cantidad de ventas y el total por cada medio de pago; debajo, «Detalle de hoy»: cada venta con sus productos uno por renglón, hora, medio de pago, cliente, importe y «Anular». Las anuladas van tachadas y dicen «anulada». Sin ventas: «Todavía no hay ventas hoy» |

## Diferencias entre las dos interfaces

- Al cobrar, la computadora muestra un mensaje en la misma pantalla y deja el foco en la
  búsqueda; el celular muestra la pantalla de éxito.
- En la computadora los botones de margen están siempre a la vista en la fila; en el celular
  se despliegan con el chip (arrancan abiertos si el producto no tiene margen).
- En la computadora «Ventas de hoy» está debajo de la venta, para cualquier usuario; en el
  celular está en Negocio, y además en Vender solo para quien administra.
- En el celular la cantidad sube con «+» de a 1 (por unidad) o de a 0,5 (a granel); en la
  computadora, con la flechita del campo, de a 1 o de a 0,1.

## Mockups

- `mockups/Vender.png`: la venta en la computadora. Tabla con Producto, Costo, Margen, Precio
  unitario, Cantidad y Subtotal; una fila «sin precio, elegí un margen» con los botones de
  margen; abajo el total, los medios de pago, «Cobrar», «No llevó» y «Ventas de hoy». Los
  importes del mockup no están redondeados a $1.000: es anterior a RF-19.
- El celular sigue el diseño de `mockups/Ferre iOS.html`, según `docs/ux.md`. Ese archivo no
  está en `mockups/` del repositorio.
