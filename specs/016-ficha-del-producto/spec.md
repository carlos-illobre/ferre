# Feature Specification: Ficha del producto renovada

**Feature Branch**: `016-ficha-del-producto`

**Created**: 2026-10-17

**Status**: Aprobada (Carlos, 2026-10-17)

**Input**: Carlos, el 2026-10-17, sobre una imagen de referencia de la ficha de un producto (la
que se abre al tocar un producto en el Catálogo): que entren el encabezado con la foto grande,
una etiqueta con el stock, el código de barras con copiar y escanear al lado, «Código
actualizado» con la fecha y hora de la última lectura, el proveedor en uso primero con una
flecha para ver los demás, «Así se calcula» plegable, el archivo de origen con sus datos y
«Agregar a la venta». No entran: un botón «Guardar cambios», un lápiz para cambiar el precio de
venta, la categoría ni el estado «Activo».

## Clarifications

### Session 2026-10-17

- Q: ¿Qué entra de la imagen de referencia? → A: El encabezado con la foto, la etiqueta de stock, el código de barras con copiar y escanear, «Código actualizado» con la última lectura, el proveedor en uso primero, «Así se calcula», el archivo de origen y, aunque no está en la imagen, «Agregar a la venta». No entran «Guardar cambios» (el margen se guarda al tocarlo, como hoy), el lápiz del precio (el precio a mano vale solo para una venta), la categoría (los productos no tienen) ni «Activo» (no existe ese estado).
- Q: ¿Qué es la «última lectura» del código? → A: La última vez que se cargó o se cambió el código de ese producto (desde su ficha o al asociar un código desconocido); escanearlo para buscar o vender no la cambia (decisión 107).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reconocer el producto de un vistazo (Priority: P1)

Quien abre la ficha ve primero la foto del producto, su nombre, su marca, su código y cuánto hay,
sin bajar. Si el producto no tiene foto, el lugar de la foto no grita: invita a sacarle una.

**Why this priority**: Es lo que se mira siempre, y hoy un producto sin foto muestra un recuadro
naranja que llama más la atención que el producto.

**Independent Test**: Abrir la ficha de un producto con foto y stock 40, y la de otro sin foto y
sin stock, en el celular y en la computadora.

**Acceptance Scenarios**:

1. **E01** **Given** un producto con foto, **When** se abre su ficha, **Then** arriba se ven la foto grande con «Cambiar foto» sobre ella, el nombre en negrita y mayúsculas, y la marca y el código del proveedor.
2. **E02** **Given** un producto sin foto, **When** se abre su ficha, **Then** en el lugar de la foto hay un espacio neutro con «Sacar foto» (en la computadora, «Subir foto»), del mismo tamaño que la foto, sin un color que llame más la atención que el nombre.
3. **E03** **Given** un producto con stock 40 que se vende por unidad, **When** se abre su ficha, **Then** una etiqueta arriba dice «40 un. en stock», igual que en la tarjeta del Catálogo.
4. **E04** **Given** un producto con stock 0, o que nunca tuvo stock, **When** se abre su ficha, **Then** la etiqueta dice «Sin stock», con el color de «Sin stock» del Catálogo.
5. **E05** **Given** «Cambiar foto», **When** se saca o se sube una foto nueva, **Then** la ficha muestra la foto nueva, con las mismas reglas de hoy (tamaño máximo, quién puede).

---

### User Story 2 - El código de barras, a mano (Priority: P1)

Quien abre la ficha ve el código de barras, lo copia con un toque (para pegarlo en un pedido o
en un mensaje) y lo carga o lo cambia escaneando. Después de cargarlo, la ficha confirma que el
código quedó actualizado y dice cuándo fue la última lectura.

**Why this priority**: El código es lo que hace que el producto se encuentre escaneando; saber
que quedó bien cargado evita volver a escanear para comprobarlo.

**Independent Test**: Abrir la ficha de un producto sin código, escanearlo, ver «Código
actualizado» con la fecha y la hora, copiarlo y pegarlo en otro lado.

**Acceptance Scenarios**:

1. **E06** **Given** un producto con código de barras, **When** se abre su ficha, **Then** se ve el código con un botón para copiarlo y, al lado, «Escanear código».
2. **E07** **Given** el botón de copiar, **When** se toca, **Then** el código queda copiado para pegarlo en otra aplicación, y un aviso breve dice «Código copiado».
3. **E08** **Given** un producto sin código de barras, **When** se abre su ficha, **Then** en lugar del código dice «Sin código» y no hay botón de copiar; «Escanear código» está igual.
4. **E09** **Given** «Escanear código», **When** se lee un código que nadie más tiene, **Then** queda cargado en el producto y la ficha muestra «Código actualizado» con la fecha y la hora de esa lectura.
5. **E10** **Given** un producto con código cargado antes, **When** se abre su ficha otro día, **Then** debajo del código dice «Última lectura:» con la fecha y la hora en que se cargó o se cambió; escanearlo para buscarlo o venderlo no la cambia.
6. **E11** **Given** un producto cuyo código se cargó antes de que existiera este dato, **When** se abre su ficha, **Then** no dice ninguna fecha: no se inventa una.
7. **E12** **Given** un código que ya tiene otro producto, **When** se lo escanea en la ficha, **Then** pasa lo de hoy (RF-08) y la fecha de la última lectura no cambia si el código no quedó cargado.
8. **E13** **Given** la computadora, **When** se toca «Escanear código», **Then** el código llega desde el celular vinculado, como hoy; sin celular vinculado, se puede tipear.

---

### User Story 3 - De dónde sale el precio (Priority: P1)

Quien puede ver costos ve primero el proveedor en uso, con su costo y la fecha de su última
lista, y con un toque ve los demás proveedores. Debajo, el precio de venta y los márgenes, y
«Así se calcula», que se despliega para mostrar la cuenta: costo, más margen, más IVA, y el
redondeo a $1.000.

**Why this priority**: Explica el precio sin que haya que preguntar, y deja a la vista si el
costo es viejo o si hay un proveedor más barato.

**Independent Test**: Abrir la ficha de un producto con dos proveedores, ver el que está en uso
con su costo, tocar la flecha y elegir el otro, y desplegar «Así se calcula».

**Acceptance Scenarios**:

1. **E14** **Given** un producto con un proveedor en uso, **When** se abre su ficha, **Then** se ve ese proveedor con su inicial, «Proveedor principal», la fecha de su última lista y su costo de compra.
2. **E15** **Given** el proveedor en uso es también el más barato, **When** se abre la ficha, **Then** su nombre lleva una estrella.
3. **E16** **Given** un producto con más de un proveedor, **When** se toca la flecha del proveedor, **Then** se ven todos, con su costo, la fecha de su lista y cuál es el más barato, y se puede elegir de cuál sale el costo, como hoy (RF-06).
4. **E17** **Given** un producto con un solo proveedor, **When** se abre su ficha, **Then** el proveedor se ve sin flecha.
5. **E18** **Given** la ficha abierta, **When** se toca «Así se calcula», **Then** se despliega la cuenta: costo de compra + margen (con su porcentaje) + IVA = precio, y el precio redondeado a $1.000 que se cobra; al tocarlo otra vez se pliega.
6. **E19** **Given** «Así se calcula» desplegado, **When** se elige otro margen, **Then** la cuenta y el precio cambian al momento, y el margen queda guardado sin otro paso, como hoy.
7. **E20** **Given** un producto sin margen, o sin costo, **When** se abre su ficha, **Then** el precio dice «sin margen» o «sin costo», como hoy, y «Así se calcula» explica qué falta en lugar de una cuenta.
8. **E21** **Given** un usuario sin permiso para ver costos, **When** abre la ficha, **Then** no ve proveedores, costos ni «Así se calcula»: ve el precio de venta, como hoy.

---

### User Story 4 - El archivo de origen (Priority: P2)

Quien puede ver costos ve de qué lista sale el costo: el nombre del archivo, el proveedor, la
fecha de la lista y cuántos productos tenía, y lo descarga con un toque.

**Why this priority**: Hoy es un botón suelto; con sus datos se sabe qué se va a bajar antes de
bajarlo.

**Independent Test**: Abrir la ficha de un producto cuyo costo sale de una lista y ver el nombre
del archivo, el proveedor, la fecha y la cantidad de productos; descargarla.

**Acceptance Scenarios**:

1. **E22** **Given** un producto cuyo costo sale de una lista cargada, **When** se abre su ficha, **Then** se ve «Archivo de origen» con el nombre del archivo, el proveedor, la fecha de la lista y cuántos productos tiene, y «Descargar Excel».
2. **E23** **Given** «Descargar Excel», **When** se toca, **Then** se baja el archivo original de esa lista, como hoy (RF-11).
3. **E24** **Given** un producto que no salió de ninguna lista (dado de alta a mano), **When** se abre su ficha, **Then** no hay «Archivo de origen».

---

### User Story 5 - Agregar a la venta desde la ficha (Priority: P2)

Quien puede vender agrega el producto a la venta en curso desde su ficha, con las mismas reglas
que desde la tarjeta del Catálogo.

**Why this priority**: Quien abrió la ficha para ver el precio o el stock muchas veces lo vende
a continuación.

**Independent Test**: Abrir la ficha de una mecha, tocar «Agregar a la venta», ir a Vender y ver
la mecha con cantidad 1.

**Acceptance Scenarios**:

1. **E25** **Given** un usuario que puede vender, **When** toca «Agregar a la venta» en la ficha, **Then** el producto entra a la venta en curso con las reglas del Catálogo (RF-108): cantidad 1, suma si ya está, sin precio o sin stock entra igual; un aviso breve lo dice y la ficha sigue abierta.
2. **E26** **Given** un usuario sin permiso de vender, **When** abre la ficha, **Then** no ve «Agregar a la venta».
3. **E27** **Given** la ficha abierta en la computadora, **When** se aprieta «+», **Then** agrega el producto a la venta, como «+» en la lista del Catálogo (con Ctrl, Cmd o Alt, no).

---

### Edge Cases

- Un nombre muy largo: se parte en renglones; nunca se corta con «…» ni tapa la foto.
- Un código de barras largo (14 dígitos): entra entero al lado de los botones, o los botones bajan a otro renglón; no se corta.
- Sin conexión: se ve todo lo que el dispositivo ya tiene; copiar el código funciona; escanear y elegir margen funcionan como hoy (se mandan al volver); la fecha de la última lectura es la de la lectura, no la de cuando llegó al servidor.
- El copiado no está permitido en ese navegador: el aviso dice que no se pudo copiar y el código queda seleccionado para copiarlo a mano.
- Un producto unido de varios proveedores: «Proveedor principal» es el proveedor en uso, el de donde sale el costo; no el que más productos vende.
- Lo que no se ve sin bajar en el celular (el archivo de origen) queda debajo; arriba siempre están la foto, el nombre, el stock y el precio.

## Requirements *(mandatory)*

### Functional Requirements

- **RF-111**: La ficha del producto empieza con la foto grande y «Cambiar foto» sobre ella (sin foto, un espacio neutro para sacarle una), el nombre en negrita y mayúsculas, la marca y el código, y una etiqueta con el stock como la del Catálogo (RF-107). En el celular y en la computadora.
- **RF-112**: En la ficha, el código de barras se copia con un toque y «Escanear código» está al lado; después de cargar o cambiar el código, la ficha dice «Código actualizado» y, desde entonces, «Última lectura» con la fecha y la hora. Esa fecha y hora se guardan con el producto.
- **RF-113**: En la ficha, quien puede ver costos ve primero el proveedor en uso («Proveedor principal»), con su inicial, la estrella si es el más barato, la fecha de su última lista y su costo, y con una flecha ve los demás y elige de cuál sale el costo (RF-06).
- **RF-114**: En la ficha, «Así se calcula» se despliega y muestra la cuenta del precio: costo + margen + IVA, y el redondeo a $1.000 que se cobra. Solo para quien puede ver costos.
- **RF-115**: En la ficha, quien puede ver costos ve el archivo de origen del costo (nombre, proveedor, fecha de la lista y cuántos productos tiene) y lo descarga (RF-11).
- **RF-116**: Desde la ficha, quien puede vender agrega el producto a la venta en curso, con las reglas del Catálogo (RF-108); en la computadora, también con la tecla «+».

### Key Entities *(include if feature involves data)*

- **Producto**: suma la fecha y hora de la última lectura de su código de barras, y quién la hizo. Lo demás (foto, código, stock, proveedores, márgenes) ya existe.
- **Lista de precios**: ya guarda el nombre del archivo, el proveedor, la fecha y sus productos; no se guarda nada nuevo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En el celular, sin bajar, se ven la foto, el nombre, el stock, el código de barras y el precio de venta.
- **SC-002**: Saber de dónde sale un precio (costo, margen, IVA y redondeo) lleva un toque, sin salir de la ficha.
- **SC-003**: Copiar el código de barras de un producto lleva un toque (hoy no se puede).
- **SC-004**: Agregar a la venta un producto desde su ficha lleva un toque, en lugar de cerrar la ficha y buscarlo en Vender.

## Assumptions

- El margen se sigue guardando al tocarlo; no hay «Guardar cambios».
- El precio de venta no se cambia en la ficha: el precio a mano vale solo para una venta (capacidad 003).
- Quién puede cargar el código, la foto y elegir el margen o el proveedor no cambia (RF-08: cualquier usuario con sesión carga el código; los márgenes, con su permiso).
- La ficha de la computadora sigue el mismo orden y las mismas reglas que la del celular, con los textos largos (decisiones 46 y 47).
- La lista de cambios del producto, sus duplicados y su historial de precios quedan como están hoy.
