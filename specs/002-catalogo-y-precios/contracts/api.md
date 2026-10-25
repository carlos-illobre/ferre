# API de catálogo y precios

Rutas del servicio `comercial` que usa esta capacidad, y las del servicio interno
`listas-de-proveedores`.

**Roles.** La API usa los roles de RF-73. En la columna «Rol»:

- **Con sesión**: cualquier usuario que entró (`dueño`, `admin` o `mostrador`). Sin sesión
  válida responde 401.
- **Dueño o admin**: además de la sesión exige uno de esos dos roles; si no, 403.
- **Sin sesión**: no pide nada.

Todas mandan el token en `Authorization: Bearer …`.

## Productos

| Método | Ruta | Rol | Para qué sirve |
|---|---|---|---|
| GET | `/productos/pagina` | Con sesión | Una página de productos activos y no absorbidos (specs/018, RF-122), cada uno con su margen, unidad, código de barras, foto, el costo vigente del proveedor preferido (proveedor, código, costo neto, IVA, fecha y lista de origen, explicación del costo), todos sus proveedores con el costo vigente de cada uno (del más barato al más caro) y el precio calculado por el servidor: `precio` (el del margen elegido, o null sin costo o sin margen), `explicacion_precio`, `margen_del_precio` y `precios` (con cada uno de los cinco márgenes, o null sin costo). La aplicación muestra ese precio; calcula por su cuenta solo la vista previa de un margen o un precio tipeado, y el servidor recalcula al cobrar. Filtros, que se combinan: `buscar` (cada palabra, sin acentos ni mayúsculas, hasta 8, es el comienzo de una palabra de la descripción o la marca, o el comienzo de un código de barras o de cualquier proveedor, y lo escrito entero, con sus signos, también vale como comienzo de un código (TA-81, decisión 139); primero las descripciones más cortas; sin `buscar`, por descripción), `codigo` (exacto: el de barras o cualquiera de proveedor, también de listas viejas), `ids` (hasta 300 con forma de UUID, separados por coma; los que no tienen esa forma se ignoran; una lista vacía no trae nada), `marca` (sin importar mayúsculas), `disponibilidad` (`todos`, `con-stock`, `sin-stock`) y `primero` (un proveedor: sus productos van adelante, sobre todo lo encontrado). Página: `desde` (por omisión 0) y `limite` (por omisión 50, hasta 200). Devuelve `{ productos, stock, hay_mas, total }`: `stock` es la cantidad de cada producto de la página que tiene movimientos. Sale de la copia del servidor; de la base lee solo el stock |
| GET | `/productos/marcas` | Con sesión | Las marcas, sin repetir y en orden; con `buscar`, las de lo que encuentra esa búsqueda |
| GET | `/productos/resumen` | Con sesión | `{ productos, sin_margen }`: cuántos productos hay y cuántos tienen costo pero no margen |
| GET | `/productos/descarga` | Con sesión | Para trabajar sin conexión (specs/018, historia 5). Sin `marca`: todos los productos de a `limite` (por omisión 500, hasta 1.000), por identificador desde `desde`. Con `marca` (la de la descarga anterior, un entero de hasta 2⁶⁴−1; otra cosa se ignora): solo los que cambiaron desde entonces. Cada producto, como en `/productos/pagina`, más `codigos` (todos sus códigos de proveedor). Devuelve `{ productos, quitados, hay_mas, siguiente, marca, calculo }`: `quitados`, los identificadores dados de baja, unidos a otro o borrados que el dispositivo tiene que borrar; `siguiente`, el `desde` de la página siguiente; `marca`, la que hay que mandar la próxima vez; `calculo`, la versión de la cuenta del precio (si cambió, el dispositivo baja todo de nuevo). No lee la base |
| GET | `/productos` | Con sesión | Para las aplicaciones de la versión anterior mientras se actualizan: todos los productos, con la forma de `/productos/pagina`, o la tanda de `limite` desde `desde`; acepta `buscar`, `codigo` e `ids`. Sale de la copia |
| PATCH | `/productos/:id` | Con sesión | Cambia uno o más de: `margen_elegido` (entero de 1 a 10.000, o `null`), `unidad` (`unidad`, `kg`, `m`, `l`), `codigo_barras` (4 a 32 letras, números o guiones, o `null`), `proveedor_preferido_id`, `foto_url` (dirección http(s) o `/fotos/…`, o `null`). 400 si no hay nada válido que cambiar, 404 si el producto no existe o está inactivo. Deja el evento `producto.precio_elegido` |
| POST | `/productos/:id/foto` | Con sesión | Sube la foto del producto (campo `foto`; jpeg, png o webp; hasta 10 MB), la guarda con un nombre al azar y la deja como foto del producto. Devuelve `foto_url`. 400 si no es una imagen, 413 si pesa de más, 404 si el producto no existe |
| GET | `/fotos/:nombre` | Sin sesión | Sirve una foto subida. El nombre es un UUID con extensión `jpg`, `png` o `webp`; cualquier otro, 404 |

## Listas de precios

| Método | Ruta | Rol | Para qué sirve |
|---|---|---|---|
| GET | `/listas` | Con sesión | Las últimas 100 listas cargadas, con proveedor, fecha, estado, resumen y avisos |
| POST | `/listas` | Con sesión | Carga una planilla (multipart: `archivo`; opcionales `proveedor_id` y `fecha_lista`). Si no viene el proveedor, lo detecta por la planilla. Guarda el archivo, compara contra los costos vigentes y crea la lista `pendiente` con su resumen. No guarda ningún precio. 413 si pesa más de 30 MB; 422 si no reconoce el proveedor, si la planilla no dice su fecha o si no se pudo leer; 404 si el proveedor no existe; 502 si el servicio de listas falla |
| GET | `/listas/lectores` | Con sesión | Qué lectores tiene el servicio de listas, para elegir uno al dar de alta un proveedor. 502 si el servicio no responde |
| GET | `/listas/:id` | Con sesión | Estado, resumen y progreso de una lista; se consulta mientras se aplica |
| GET | `/listas/:id/filas` | Con sesión | Vista previa: las filas leídas con su costo, su explicación y el costo anterior, las que cambian de precio primero; de a 200 (`?desde=`) |
| POST | `/listas/:id/aplicar` | Con sesión | Pasa la lista de `pendiente` a `aplicando` y la aplica en segundo plano, en lotes de 500 filas: crea los productos nuevos y agrega los costos que cambiaron; después busca duplicados entre los productos nuevos. Responde 202; 409 si la lista ya no está pendiente |
| POST | `/listas/:id/descartar` | Con sesión | Descarta una lista pendiente. 204; 409 si no existe o ya no está pendiente |
| GET | `/listas/:id/archivo` | Con sesión | Baja el Excel original de la lista, con su nombre. 404 si la lista no existe, no guardó el archivo o el archivo ya no está |

## Proveedores

| Método | Ruta | Rol | Para qué sirve |
|---|---|---|---|
| GET | `/proveedores` | Con sesión | Todos los proveedores con su configuración de costo (IVA incluido o no, descuento general, descuento por contado), su lector y si están activos |
| POST | `/proveedores` | Dueño o admin | Da de alta un proveedor. Exige el nombre; los descuentos van entre 0 y 1. 400 si falta algo o está fuera de rango, 409 si ya existe ese nombre |
| PATCH | `/proveedores/:id` | Dueño o admin | Cambia nombre, IVA, descuentos, lector o `activo`. 404 si no existe |

## Duplicados

Todas exigen dueño o admin.

| Método | Ruta | Rol | Para qué sirve |
|---|---|---|---|
| GET | `/equivalencias` | Dueño o admin | Hasta 100 sugerencias pendientes, cada una con el motivo y el resumen de los dos productos (descripción, marca, código de barras, proveedor, costo, fecha de lista) |
| POST | `/equivalencias/buscar` | Dueño o admin | Vuelve a buscar duplicados en todo el catálogo. Devuelve cuántas sugerencias nuevas encontró |
| POST | `/equivalencias/:id/unir` | Dueño o admin | Une los dos productos de una sugerencia; `conservar` (`a` o `b`) dice cuál queda. 409 si la sugerencia no existe o ya se resolvió |
| POST | `/equivalencias/:id/rechazar` | Dueño o admin | Marca la sugerencia como «son distintos». 409 si ya se resolvió |
| POST | `/equivalencias/unir` | Dueño o admin | Une a mano dos productos cualesquiera (`conservar_id`, `absorber_id`). 400 si no son dos distintos, 404 si alguno no existe o ya fue unido |
| GET | `/equivalencias/unidos` | Dueño o admin | Las últimas 100 uniones que se pueden separar, con la marca, la foto y los proveedores del producto conservado |
| POST | `/equivalencias/separar` | Dueño o admin | Deshace una unión (`absorbido_id`) con el registro de lo que se movió. 409 si el producto no está unido o no hay registro de la unión |

## Vincular el celular para escanear

Además del rol, cada ruta comprueba que quien llama sea la sesión de la computadora o la del
celular de ese puesto.

| Método | Ruta | Rol | Para qué sirve |
|---|---|---|---|
| POST | `/puestos` | Con sesión | La computadora pide un puesto: devuelve el código para el QR, que vence a los 5 minutos |
| POST | `/puestos/:codigo/vincular` | Con sesión | El celular lee el QR y queda vinculado 12 horas. 404 si el código venció o ya se usó |
| GET | `/puestos/:id` | Con sesión | Estado del puesto (si ya se vinculó y si sigue vigente); solo para las dos sesiones del puesto |
| GET y POST | `/puestos/:id/enlace` | Con sesión, de uno de los dos lados del vínculo | La conexión entre los dos (specs/023): los códigos que lee el celular viajan por acá cuando no pueden hablarse directo (ver `specs/007-usuarios-y-acceso/contracts/api.md`) |

## Servicio interno `listas-de-proveedores`

No se llama desde el cliente: solo lo usa `comercial`, con el encabezado
`X-Token-Servicio` (ADR-003). Sin ese token, 401.

| Método | Ruta | Exige | Para qué sirve |
|---|---|---|---|
| GET | `/health` | Nada | Dice que está vivo y qué lectores tiene |
| POST | `/detecciones` | Token de servicio | Dice de qué proveedor es una planilla, o ninguno |
| POST | `/lecturas` | Token de servicio | Lee una planilla con la configuración del proveedor (lector, IVA incluido, descuentos) y devuelve las filas con el mismo formato para todos, las salteadas, las ofertas, los avisos y el resumen. 422 si no reconoce el formato |
