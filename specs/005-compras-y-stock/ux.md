# Pantallas de compras y stock

Las dos interfaces usan la misma API (ADR-014). Código del cliente en
`clientes/gestion-del-local-web/src/`.

## Celular

Todo vive en la pestaña **Depósito**, un solo archivo: `pantallas/Deposito.tsx`. Arriba, un
segmento con tres sub-pantallas. Las rutas viejas `#/stock`, `#/compras` y `#/contar` abren
la que corresponde.

| Sub-pantalla | Ruta | Qué muestra |
|---|---|---|
| Stock | `#/deposito` | Tarjeta «Valor del inventario» con el total y una barra por proveedor. Buscador. Cada producto es una fila con su stock; al tocarla se abren sus movimientos, la leyenda «Stock N = suma de estos movimientos» y «Corregir el stock» (cuántas hay y motivo opcional) |
| Ingreso | `#/deposito/ingreso` | Proveedor (se elige en una hoja que sube), comprobante (Factura, Remito, Sin), número y fecha. Buscador con botón de escanear si hay cámara. Cada renglón es una tarjeta con cantidad, costo y la diferencia contra la lista. Botón «Registrar ingreso» con el total. Al registrar, aviso «Ingreso registrado». Abajo, «Gastos de la semana» (solo el total) y las compras recientes: cada una se abre, muestra sus renglones y «Anular esta compra» |
| Contar | `#/deposito/contar` | Los sectores como botones, con cantidad de productos y estado (nunca contado, contado hoy, contado hace N días, conteo en curso), y «+ Sector nuevo». Dentro de un sector: buscador con escáner, «¿cuántas hay?» con «Siguiente», la lista de contados con su diferencia, los del sector sin contar, y «Cerrar <sector>» con su confirmación |

## Computadora

Tres pantallas del menú, cada una en su archivo, con tablas.

| Pantalla | Ruta | Archivo | Qué muestra |
|---|---|---|---|
| Compras | `#/compras` | `escritorio/pantallas/Compras.tsx` | «Ingreso de mercadería»: proveedor y comprobante en desplegables, número y fecha. Buscador que se maneja con flechas y Enter. Tabla de renglones: producto, cantidad, costo unitario sin IVA, según lista (con el porcentaje de diferencia), subtotal. Total, «Registrar ingreso» y «Descartar». Abajo, ya desplegados, «Gastos de la semana» (tabla por proveedor) y «Compras recientes» (tabla; cada fila se abre y muestra sus renglones con costo unitario y subtotal; «Anular»). No tiene escáner |
| Stock | `#/stock` | `escritorio/pantallas/Stock.tsx` | «Valor del inventario» y los cinco proveedores con más valor. Buscador. Tabla: producto, proveedor, stock, costo, valor, último movimiento, «Corregir». Al tocar el stock se abre el detalle con los movimientos y la cuenta del valor (stock × costo) |
| Contar | `#/contar` | `escritorio/pantallas/Contar.tsx` | Lista de sectores con su estado y un renglón para agregar uno. Dentro de un sector: buscador (y «Escanear» si hay cámara), «¿Cuántas hay?», tabla de contados (contado, teórico, diferencia), desplegable con los del sector sin contar, y «Cerrar <sector>» con las dos opciones para los no contados |

## Diferencias entre las dos

- El aviso al registrar: «Ingreso registrado … 2 costos actualizados, 1 producto nuevo» en
  el celular; «Compra registrada: $… 2 costo(s) actualizado(s)…, 1 producto(s) nuevo(s)» en
  la computadora.
- Gastos de la semana: el celular muestra solo el total; la computadora, el detalle por
  proveedor.
- Sector contado en el día: «contado hoy» en el celular; «contado hace 0 días» en la
  computadora.
- Anular una compra pide el motivo (opcional) en una ventana del navegador, en las dos.
