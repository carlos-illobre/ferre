# API de catálogo y precios

Rutas del servicio `gestion-del-local` que usa esta capacidad, y las del servicio interno
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
| GET | `/productos` | Con sesión | El catálogo entero de productos activos y no absorbidos, ordenado por descripción: cada uno con su margen, unidad, código de barras, foto, el costo vigente del proveedor preferido (proveedor, código, costo neto, IVA, fecha y lista de origen, explicación del costo) y la lista de todos sus proveedores con el costo vigente de cada uno, del más barato al más caro. El cliente lo baja entero y busca en memoria |
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
| GET | `/equivalencias/unidos` | Dueño o admin | Las últimas 100 uniones que se pueden separar, con los proveedores del producto conservado |
| POST | `/equivalencias/separar` | Dueño o admin | Deshace una unión (`absorbido_id`) con el registro de lo que se movió. 409 si el producto no está unido o no hay registro de la unión |

## Vincular el celular para escanear

Además del rol, cada ruta comprueba que quien llama sea la sesión de la computadora o la del
celular de ese puesto.

| Método | Ruta | Rol | Para qué sirve |
|---|---|---|---|
| POST | `/puestos` | Con sesión | La computadora pide un puesto: devuelve el código para el QR, que vence a los 5 minutos |
| POST | `/puestos/:codigo/vincular` | Con sesión | El celular lee el QR y queda vinculado 12 horas. 404 si el código venció o ya se usó |
| GET | `/puestos/:id` | Con sesión | Estado del puesto (si ya se vinculó y si sigue vigente); solo para las dos sesiones del puesto |
| POST | `/puestos/:id/codigos` | Con sesión | El celular manda un código escaneado. 403 si ese celular no está vinculado a ese puesto o el vínculo venció |
| GET | `/puestos/:id/eventos` | Con sesión | Flujo de eventos (SSE) hacia la computadora: primero los códigos pendientes, después los que llegan; latido cada 25 segundos |
| POST | `/puestos/:id/codigos/:codigoId/recibido` | Con sesión | La computadora confirma que recibió un código |

## Servicio interno `listas-de-proveedores`

No se llama desde el cliente: solo lo usa `gestion-del-local`, con el encabezado
`X-Token-Servicio` (ADR-003). Sin ese token, 401.

| Método | Ruta | Exige | Para qué sirve |
|---|---|---|---|
| GET | `/health` | Nada | Dice que está vivo y qué lectores tiene |
| POST | `/detecciones` | Token de servicio | Dice de qué proveedor es una planilla, o ninguno |
| POST | `/lecturas` | Token de servicio | Lee una planilla con la configuración del proveedor (lector, IVA incluido, descuentos) y devuelve las filas con el mismo formato para todos, las salteadas, las ofertas, los avisos y el resumen. 422 si no reconoce el formato |
