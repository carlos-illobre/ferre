# Pantallas: Clientes

No hay una pantalla propia de clientes en ninguna de las dos interfaces. Lo que existe son
partes de la pantalla de venta.

## Celular

| Parte | Archivo | Qué muestra |
|---|---|---|
| Botón «Cta. cte.» en la barra de cobro | `clientes/gestion-del-local-web/src/pantallas/Vender.tsx` | Uno de los cuatro medios de pago. Al tocarlo sin cliente elegido sube la hoja de clientes |
| Renglón del cliente en la barra de cobro | `clientes/gestion-del-local-web/src/pantallas/Vender.tsx` | Solo con cuenta corriente elegida: el nombre del cliente o «Elegí el cliente»; al tocarlo abre la hoja |
| Hoja «¿Quién lleva a cuenta?» | `clientes/gestion-del-local-web/src/pantallas/Vender.tsx` | Un renglón por cliente con su nombre y «debe $X» o «al día»; el elegido queda marcado. Vacía dice «Todavía no hay clientes con cuenta corriente.» |
| Confirmación de la venta | `clientes/gestion-del-local-web/src/pantallas/Vender.tsx` | El medio de pago con el nombre del cliente: «Cuenta corriente · nombre» |
| Ventas de hoy (en Vender y en Negocio) | `clientes/gestion-del-local-web/src/pantallas/VentasDeHoy.tsx` | En cada venta: hora, medio de pago y, si tiene, el nombre del cliente |

## Computadora

| Parte | Archivo | Qué muestra |
|---|---|---|
| Botón «Cuenta corriente» (F8) en el cobro | `clientes/gestion-del-local-web/src/escritorio/pantallas/Vender.tsx` | Uno de los cuatro medios de pago |
| Desplegable «Cliente…» | `clientes/gestion-del-local-web/src/escritorio/pantallas/Vender.tsx` | Solo con cuenta corriente elegida: los clientes por nombre, con «(debe $X)» si deben |
| Tabla «Ventas de hoy», columna Pago | `clientes/gestion-del-local-web/src/escritorio/pantallas/Vender.tsx` | El medio de pago y, si tiene, el nombre del cliente |

En las dos, cobrar con cuenta corriente y sin cliente muestra en el lugar el aviso
«Cuenta corriente: elegí el cliente.», que se va solo al corregirlo.

## Lo que no tiene pantalla

Cargar, editar o buscar un cliente, ver su ficha y marcar una venta como pagada.
