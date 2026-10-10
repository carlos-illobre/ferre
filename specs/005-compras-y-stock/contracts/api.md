# API de compras y stock

Servicio `gestion-del-local`. Código en `microservices/gestion-del-local/src/rutas/`
(`compras.ts`, `stock.ts`, `conteos.ts`, `proveedores.ts`), montado en `src/app.ts`.

**Qué exige cada ruta.** Todas exigen sesión (`Authorization: Bearer <token>`; sin sesión
válida, 401 «Hay que iniciar sesión»). Los roles que hoy existen en el código son `dueño`,
`admin` y `mostrador`; Administrador, Vendedor y Comprador todavía no (#59). Donde la tabla
dice «cualquiera con sesión», entra cualquiera de los tres.

## Compras (`compras.ts`)

| Método | Ruta | Exige | Para qué sirve |
|---|---|---|---|
| POST | `/compras` | Cualquiera con sesión | Registrar un ingreso de mercadería. Cuerpo: `id` (UUID, opcional), `proveedor_id`, `fecha` (AAAA-MM-DD, opcional), `comprobante_tipo` (`factura`, `remito`, `sin_comprobante`), `comprobante_numero`, `nota`, `items[]` (`producto_id` o nulo para producto nuevo, `descripcion`, `marca`, `cantidad` > 0, `costo_unitario` ≥ 0). Suma stock, crea los productos nuevos y actualiza el costo vigente si difiere. Devuelve 201 con `id`, `total`, `productos_nuevos`, `costos_actualizados`. Si el `id` ya existe, 200 con `repetida: true` y no hace nada. 400 si falta o está mal un dato; 404 si el proveedor no existe o está inactivo |
| GET | `/compras` | Cualquiera con sesión | Las últimas 50 compras, con proveedor, comprobante, total, estado, cantidad de renglones y sus `items` (descripción, cantidad, costo unitario) |
| GET | `/compras/semana` | Cualquiera con sesión | Gastos de los últimos 7 días: total por proveedor de las compras confirmadas, y total general |
| GET | `/compras/:id` | Cualquiera con sesión | Los renglones de una compra. Las pantallas no la usan: toman los `items` de `GET /compras` |
| POST | `/compras/:id/anular` | Cualquiera con sesión | Anular una compra. Cuerpo: `motivo` (opcional). La marca `anulada` y devuelve el stock con un ajuste por renglón; el costo que dejó el comprobante no se toca. 204; 409 si no existe o ya está anulada |

## Stock (`stock.ts`)

| Método | Ruta | Exige | Para qué sirve |
|---|---|---|---|
| GET | `/stock` | Cualquiera con sesión | Stock, costo vigente y valor de cada producto activo con movimientos; `valor_total` y `por_proveedor` (unidades, valor, productos) |
| GET | `/stock/:productoId/movimientos` | Cualquiera con sesión | Los movimientos que explican el stock de un producto, del más nuevo al más viejo (hasta 200) |
| POST | `/stock/:productoId/ajustes` | Cualquiera con sesión | Corregir el stock a mano. Cuerpo: `cantidad_real` (≥ 0), `motivo` (opcional). Registra la diferencia como ajuste con la nota «había N, hay M: motivo». Devuelve `stock` y `diferencia`; sin diferencia no registra nada. 400 si la cantidad no es válida |

## Sectores y conteos (`conteos.ts`)

| Método | Ruta | Exige | Para qué sirve |
|---|---|---|---|
| GET | `/sectores` | Cualquiera con sesión | Los sectores activos, con cuántos productos tienen, cuándo se cerró su último conteo y el id del conteo abierto, si hay |
| POST | `/sectores` | Cualquiera con sesión | Crear un sector. Cuerpo: `nombre`. 201 con `id` y `nombre`; 400 sin nombre; 409 si ya existe |
| POST | `/conteos` | Cualquiera con sesión | Abrir el conteo de un sector, o retomar el que está abierto. Cuerpo: `sector_id`. 201 con `id` y `retomado: false`, o 200 con `retomado: true` |
| GET | `/conteos/:id` | Cualquiera con sesión | El conteo: sector, estado, los renglones contados con su stock teórico, y los productos del sector sin contar (`sin_contar`). 404 si no existe |
| PUT | `/conteos/:id/renglones/:productoId` | Cualquiera con sesión | Contar un producto o corregir lo contado. Cuerpo: `cantidad` (≥ 0). El producto pasa a ser de ese sector. 204; 400 si la cantidad no es válida; 409 si el conteo no existe o ya se cerró |
| DELETE | `/conteos/:id/renglones/:productoId` | Cualquiera con sesión | Quitar un producto de lo contado, si el conteo está abierto. 204. Las pantallas no la usan |
| POST | `/conteos/:id/cerrar` | Cualquiera con sesión | Cerrar el conteo. Cuerpo: `faltantes_en_cero` (opcional). Cada diferencia pasa a ser un ajuste; con `faltantes_en_cero`, los productos del sector no contados quedan en cero. Devuelve `sector`, `contados`, `ajustados`, `sin_contar`, `puestos_en_cero`, `diferencia_unidades`. 409 si no existe o ya se cerró |

## Proveedores (`proveedores.ts`)

De esta capacidad solo se usa la lectura, para elegir el proveedor de la compra. Alta y
modificación configuran el costo de las listas y pertenecen al catálogo.

| Método | Ruta | Exige | Para qué sirve |
|---|---|---|---|
| GET | `/proveedores` | Cualquiera con sesión | Todos los proveedores, con su configuración de costo y si están activos |
| POST | `/proveedores` | `dueño` o `admin` | Crear un proveedor. 201; 400 si falta el nombre o un descuento no va entre 0 y 1; 409 si el nombre ya existe |
| PATCH | `/proveedores/:id` | `dueño` o `admin` | Modificar un proveedor o desactivarlo. 204; 404 si no existe |
