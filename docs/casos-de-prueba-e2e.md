# Casos de prueba de punta a punta

Un caso por escenario de `tests/e2e/escenarios/`. Cada uno arranca sembrando en la base
lo que necesita (usuario, sesión, productos) y termina verificando en pantalla y en la
base. Corren de a uno, con `tests/e2e.sh`, contra el compose local y el cliente servido
aparte, como en producción. En CI cada caso es un paso del job `e2e`.

Convenciones de los datos sembrados: correos `e2e-*@ferre.test`, productos con `(E2E)`
en la descripción, proveedores con `(e2e)` en el nombre. Se limpian y se vuelven a crear
en cada corrida.

---

## 00 · La app abre y el servidor responde
`00-arranque.spec.ts`

**Precondiciones:** stack levantado; ningún usuario logueado.

| Paso | Resultado esperado |
|---|---|
| Abrir la app | Se ve el título "ferre" |
| Consultar `/health` de la API | Responde 200 con `ok: true` y `db: ok` |

---

## 01 · Entrar
`01-login.spec.ts`

**Precondiciones:** un dueño `e2e-dueno@ferre.test` con una sesión sembrada.

| Caso | Pasos | Resultado esperado |
|---|---|---|
| Sin sesión se pide entrar | Abrir la app sin token guardado | Se ve "Entrá con tu cuenta de Google" y el botón "Mostrar código para leer con el celular" |
| Con sesión el dueño entra | Abrir la app con el token en el dispositivo; tocar "Administración" | Arriba dice "Dueño E2E · dueño"; se ve "Usuarios autorizados" con el correo del dueño en la tabla |

---

## 02 · Cargar una lista de precios y aplicarla
`02-listas.spec.ts`

**Precondiciones:** dueño con sesión; ningún otro proveedor con lector `comodo`; la
muestra anonimizada `LISTA GENERAL PRUEBA 11-8.xlsx` (4 productos válidos y 1 fila sin
precio).

| Paso | Resultado esperado |
|---|---|
| Menú "Listas de precios": el panel "Proveedores: agregar o revisar" está arriba y abierto; cargar `Comodo (e2e)` con lector `comodo` y contado 5 %, "Agregar" | El proveedor aparece en la tabla |
| Soltar la planilla en la zona de carga | Se detecta el proveedor; el resumen dice 4 leídos, 4 nuevos, 1 salteada; el título dice "Comodo (e2e) · lista del 11/08/2026" |
| En la vista previa, abrir la explicación del costo de `MP001` | Costo $712,50 con los pasos "− 25 % (linea)" y "− 5 % (contado)" |
| "Aplicar" | Aparece la barra de progreso mientras se aplica en segundo plano; al terminar vuelve a la pantalla de listas con una tarjeta: "4 precios actualizados", "4 productos nuevos" |
| "Entendido" | La tarjeta se cierra; en "Proveedores", `Comodo (e2e)` muestra su última lista aplicada ("hace N días") |

---

## 03 · Buscar productos, elegir margen y tipear otro margen a mano
`03-productos.spec.ts`

**Precondiciones:** usuario mostrador con sesión; un proveedor con dos productos: una
mecha (costo $1.500, sin margen) y un taladro (costo $120.000, sin margen).

| Paso | Resultado esperado |
|---|---|
| Abrir "Productos" | La caja de búsqueda tiene el foco |
| Escribir `e2e madera mecha` | Un solo resultado, la mecha, con "sin precio" |
| Abrir la explicación del costo | Muestra "− 25 % (linea)" |
| Shift+3 | El botón "100 %" queda activo y el precio es $4.000,00 (1500 × 2 × 1,21 = 3630, para arriba al múltiplo de $1.000); su explicación dice "+ 100 % de margen" |
| Tocar "50 %" y recargar enseguida; buscar `me6` (código del proveedor) | "50 %" sigue elegido: el cambio se guarda en el dispositivo antes de mandarse y una recarga no lo pierde |
| Tocar "100 %", recargar, buscar `me6` | El margen 100 % sigue elegido |
| "otro margen", escribir 20, Enter | Precio $3.000,00 (1500 × 1,2 × 1,21 = 2178 → 3000) y "margen a mano · 20 %"; ningún botón queda activo |
| Buscar `e2e taladro`, tocar "25 %" | Precio $182.000,00 (181.500 para arriba) |
| Buscar `zzzz` | "Nada con "zzzz"" |
| Buscar `e2e tuerca scroll` (40 productos sembrados); sacar el foco de la búsqueda; flecha abajo dos veces; Shift+2 | Queda marcado el tercer resultado y su margen 200 % activo: los atajos funcionan sin foco en la caja |
| Llegar al final de la lista | Aparecen 30 primero; después se cargan los 40 y desaparece "Cargando más" |
| Tocar la foto chica de un producto sin foto | Se amplía con la descripción y "todavía no tiene foto"; Escape la cierra |

---

## 04 · Vender
`04-vender.spec.ts`

**Precondiciones:** usuario mostrador con sesión; una mecha con margen 100 % guardado
(costo $1.000) y un tornillo sin margen (costo $10).

| Paso | Resultado esperado |
|---|---|
| Abrir "Vender" | La búsqueda tiene el foco |
| Escribir `e2e mecha vender` | La sugerencia muestra $3.000,00 (1000 × 2 × 1,21 = 2420 → 3000) |
| Enter | La mecha está en la venta; la búsqueda queda vacía y con foco; total $3.000,00 |
| Cantidad 3 | Total $9.000,00 |
| Flechita arriba en la cantidad; escribir 2,7; volver a 3 | Queda 4 (de a 1, sin decimales); 2,7 por unidad se toma como 2; total $9.000,00 |
| Agregar `e2e tornillo vender` | La fila dice "elegí margen o precio" |
| "Cobrar" | Aviso "Hay productos sin precio" |
| "300 %" en la fila del tornillo | Precio $1.000,00 (10 × 4 × 1,21 = 48,4 → 1000); total $10.000,00 |
| Unidad "kg" en el tornillo, cantidad 1,5 | Total $10.500,00: a granel admite un decimal |
| "Cobrar" sin medio de pago | Aviso "Elegí cómo paga"; al tocar un medio de pago el aviso desaparece solo |
| "Efectivo", "Cobrar" | "Venta registrada: $10.500,00 en efectivo"; la venta queda vacía |
| Verificación en la base | Una venta confirmada; stock de la mecha −3; el ítem del tornillo con margen 300 y el tornillo con unidad kg; la explicación "+ 100 % de margen" guardada en el de la mecha |
| Abrir "Ventas de hoy" | Aparece la venta con "Efectivo"; como tiene dos productos, cada uno va en su fila (3 × mecha, 1.5 × tornillo) debajo de la fila de la venta |
| Tocar la fila de la venta; tocarla de nuevo | Se pliega a una sola fila ("2 productos: ..."); vuelve a desplegarse |
| "Anular", confirmar con motivo | La fila queda "anulada"; el stock de la mecha vuelve a 0 |
| Agregar la mecha y tocar "No llevó" | "Anotado como consulta"; queda una consulta en la base |

---

## 05 · Ingresar mercadería
`05-compras.spec.ts`

**Precondiciones:** usuario mostrador con sesión; un proveedor con una cinta a costo de
lista $1.000.

| Paso | Resultado esperado |
|---|---|
| Abrir "Compras", elegir el proveedor, número de factura `0001-00000777` | — |
| Agregar `e2e cinta aisladora compras` | El renglón muestra "según lista $1.000,00" |
| Cantidad 10, costo 1200 | El renglón marca "+20 %" |
| Escribir `PINCEL NUEVO COMPRAS (E2E)`, Enter, cantidad 5, costo 800 | Renglón libre; total $16.000,00 |
| "Registrar ingreso" | "Compra registrada: $16.000,00", "2 costo(s) actualizado(s)", "1 producto(s) nuevo(s)" |
| Verificación en la base | Stock de la cinta 10; su costo vigente $1.200 con explicación "según factura 0001-00000777"; el pincel existe como producto del proveedor |
| "Gastos de la semana" | Aparece el proveedor |
| "Compras recientes", tocar la fila de la compra | Se despliega y muestra sus renglones: 10 × cinta y 5 × pincel, con costo unitario y subtotal |
| "Anular", confirmar | La compra queda "anulada"; el stock de la cinta vuelve a 0 |

---

## 06 · Stock
`06-stock.spec.ts`

**Precondiciones:** usuario mostrador con sesión; un candado a costo $2.500 con una
compra de 20 y una venta de 3.

| Paso | Resultado esperado |
|---|---|
| Abrir "Stock" | Se ve "Valor del inventario" |
| Buscar `e2e candado stock` | Stock 17 y valor $42.500,00 |
| Tocar el número del stock | Se listan los movimientos: Compra +20, Venta −3, y "Stock 17 = suma de estos movimientos" |
| "Corregir", 15, motivo "conté la estantería", "Guardar" | Stock 15, valor $37.500,00; aparece un movimiento "Conteo" con "había 17, hay 15: conté la estantería" |
| Ir a "Vender" y buscar el candado | La sugerencia dice "stock 15" |

---

## 07 · Contar un sector
`07-contar.spec.ts` · pantalla de celular (390×844)

**Precondiciones:** usuario mostrador con sesión; una lija con stock 10 y un pincel con
stock 5.

| Paso | Resultado esperado |
|---|---|
| Abrir "Contar", escribir `Estantería E2E`, "Agregar sector" | Se abre el conteo del sector |
| Buscar `e2e lija contar`, Enter, cantidad 8, "Siguiente" | La tabla de contados muestra la lija con diferencia −2 |
| Buscar `e2e pincel contar`, Enter, cantidad 5, Enter | El pincel aparece con "=" |
| "Cerrar Estantería E2E", confirmar | "2 productos contados, 1 con diferencia ajustada" |
| Verificación en la base | Stock de la lija 8 y del pincel 5; el ajuste tiene la nota "conteo de Estantería E2E del …: había 10, hay 8"; los dos productos quedaron en el sector |
| "Contar otro sector" | El sector dice "contado hace 0 días" |

---

## 08 · Sin conexión
`08-sin-conexion.spec.ts`

**Precondiciones:** usuario mostrador con sesión; un destornillador a costo $500 con
margen 100 %.

| Caso | Pasos | Resultado esperado |
|---|---|---|
| Vender y cambiar margen sin red | Abrir "Vender" y esperar a que el catálogo quede guardado en el dispositivo; cortar la red | El indicador dice "Sin conexión" |
| | Agregar el destornillador, cantidad 2, "Efectivo", "Cobrar" | "Sin conexión: se envía sola"; el indicador dice "1 por enviar"; en la base todavía no hay venta |
| | Agregar el destornillador de nuevo, elegir "50 %", "No llevó" | Precio $1.000,00; el indicador dice "3 por enviar" |
| | Volver la red | El indicador pasa a "Sincronizado"; en la base: 1 ítem vendido, stock −2, margen 50 y 1 consulta |
| La app abre sin red | Con la app abierta y el service worker activo, cortar la red y recargar | La app abre, la búsqueda funciona y encuentra el destornillador |

---

## 09 · Carga del navegador
`09-carga.spec.ts` · solo con `CARGA=1`

| Paso | Resultado esperado |
|---|---|
| Cargar 50.000 productos y 10.000 ventas en IndexedDB | Registrar una venta más tarda menos de 50 ms; buscar en memoria menos de 100 ms |

---

## 10 · Escanear con el celular
`10-escaner.spec.ts` · dos navegadores, laptop (1366×768) y celular (390×844)

**Precondiciones:** un usuario mostrador con dos sesiones (laptop y celular); una cinta
con código de barras `7790001112223` y unos guantes sin código, ambos con margen 100 %.

| Paso | Resultado esperado |
|---|---|
| Laptop: "Vender", "Vincular celular para escanear" | Se ve el QR |
| Celular: abrir el enlace del QR | "quedó vinculado"; la laptop muestra "Celular vinculado" |
| Celular: mandar el código `7790001112223` (como lo haría el escáner) | La cinta aparece en la venta de la laptop |
| Celular: mandar `7790009998887` (desconocido) | La laptop avisa que el código no está y pide buscar el producto |
| Laptop: buscar `e2e guantes escaner`, Enter | Los guantes se agregan y el código queda asociado al producto en la base |
| Celular: mandar `7790009998887` otra vez | Los guantes pasan a cantidad 2; los tres códigos figuran entregados en la base |

El escaneo con la cámara real no se automatiza: se prueba a mano en el celular.

---

## 11 · Duplicados entre proveedores
`11-duplicados.spec.ts`

**Precondiciones:** dueño con sesión; dos productos con el mismo código de barras, uno
de un proveedor caro ($3.000, con margen 100 %) y otro de uno barato ($2.400); una venta
del barato.

| Paso | Resultado esperado |
|---|---|
| Abrir "Duplicados", "Buscar duplicados en todo el catálogo" | Aparece la sugerencia "Mismo código de barras" con los dos proveedores |
| "Es el mismo" | "Unidos"; en la base el absorbido queda inactivo apuntando al conservado, su venta ahora apunta al conservado, el preferido es el proveedor barato y hay 2 proveedores con precio |
| "Productos", buscar `e2e silicona duplicada` | Un solo producto; lista "★ Proveedor barato (e2e) $2.400,00" y "Proveedor caro (e2e) $3.000,00"; precio $6.000,00 |
| "usar" en el proveedor caro | El precio pasa a $8.000,00 |

---

## 12 · Cerrar sesiones
`12-cerrar-sesion.spec.ts`

**Precondiciones:** un dueño con dos sesiones: "esta computadora" y "otro celular".

| Caso | Pasos | Resultado esperado |
|---|---|---|
| Cerrar otra sesión | "Administración", botón azul "Cerrar" en la fila "otro celular" | La fila desaparece; la propia sigue; en la base esa sesión queda revocada |
| Cerrar la propia | "Administración", botón rojo "Cerrar" de la fila "esta sesión" | Vuelve al login; el token ya no está en el dispositivo; recargar no vuelve a entrar |
| Salir | "Salir" en la barra | Vuelve al login; en la base la sesión queda revocada |

---

## 13 · Rol admin
`13-admin.spec.ts`

**Precondiciones:** un usuario `admin` con sesión y un usuario `dueño`.

| Paso | Resultado esperado |
|---|---|
| Abrir "Administración" como admin | Arriba dice "Admin E2E · admin"; se ven "Usuarios autorizados" y el menú "Duplicados" |
| Autorizar un mostrador nuevo | Aparece en la tabla; el selector de alta no ofrece el rol "dueño" |
| Mirar la fila del dueño | Su selector de rol está deshabilitado y dice "solo el dueño" |
| Intentar por la API crear un dueño, desactivar al dueño o ascender a dueño | Las tres respuestas son 403; el dueño sigue activo y no existe el dueño nuevo |
