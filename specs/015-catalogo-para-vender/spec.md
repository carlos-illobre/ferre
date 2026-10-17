# Feature Specification: Catálogo para vender

**Feature Branch**: `015-catalogo-para-vender`

**Created**: 2026-10-17

**Status**: Aprobada (Carlos, 2026-10-17)

**Maquetas**: Aprobadas (variante B, Carlos, 2026-10-17: `maquetas/celular-catalogo-b.html`, `maquetas/celular-filtros.html`, `maquetas/compu-catalogo.html` y `maquetas/compu-filtros.html`)

**Input**: Carlos, el 2026-10-17, sobre una imagen de referencia del Catálogo: que entren el
stock de cada producto, filtrar por disponibilidad y por marca, «Agregar» a la venta desde el
Catálogo, las pestañas más altas y un buscador que diga qué busca. No entran: categorías,
«Avisar» en los productos sin stock, un menú por producto, ordenar, ni el signo «+» en el margen.

## Clarifications

### Session 2026-10-17

- Q: ¿Qué entra de la imagen de referencia? → A: El stock de cada producto, filtrar por disponibilidad y por marca, «Agregar» a la venta, las pestañas más altas y el buscador que dice qué busca. No entran categorías, «Avisar», un menú por producto, ordenar ni el «+» en el margen.
- Q: «Stock bajo» necesita el stock mínimo, que todavía no existe (RF-54). → A: Espera al mínimo: por ahora, la cantidad y «Sin stock»; «Stock bajo» aparece cuando exista RF-54 (decisión 103).
- Q: ¿Qué pasa después de «Agregar»? → A: Se queda en el Catálogo, con un aviso breve, y el menú muestra en Vender cuántos productos lleva la venta (decisión 103).
- Al elegir la maqueta (variante B): en el celular el buscador dice «Producto, código o marca», porque el texto largo no entra (decisión 47: mismos textos, resumidos en el celular); la computadora dice «Buscar productos, códigos o marcas…». Se aceptan uno o dos productos menos por pantalla a cambio del stock y «Agregar». Los botones secundarios como «Agregar» miden al menos 36 px; las pestañas, al menos 44 (decisión 104).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Saber si hay, sin salir del Catálogo (Priority: P1)

El Vendedor busca un producto que le pide el cliente y, en la misma lista, ve cuánto hay. Hoy
para saberlo tiene que ir a Depósito y buscarlo de nuevo.

**Why this priority**: Es la pregunta que sigue a «¿cuánto sale?» en el mostrador: «¿tenés?».

**Independent Test**: Con un producto con stock 12, otro con 0 y otro vendido por kilo con
3,5 kg, buscarlos en el Catálogo y ver la cantidad de cada uno, en el celular y en la computadora.

**Acceptance Scenarios**:

1. **E01** **Given** un producto con stock 12 que se vende por unidad, **When** aparece en el Catálogo, **Then** dice «12 un.» (la abreviatura de Vender, en toda la aplicación; decisión 106).
2. **E02** **Given** un producto que se vende por kilo con 3,5 kg, **When** aparece en el Catálogo, **Then** dice «3,5 kg», con la unidad en que se vende.
3. **E03** **Given** un producto con stock 0, o con stock que nunca se cargó, **When** aparece en el Catálogo, **Then** dice «Sin stock», de modo que se distinga a la vista de los que tienen.
4. **E04** **Given** un producto con stock mínimo cargado y un stock igual o menor, **When** aparece en el Catálogo, **Then** dice su cantidad marcada como «Stock bajo». Depende del stock mínimo (RF-54): mientras no exista, ningún producto dice «Stock bajo» (decisión 103).
5. **E05** **Given** el stock de un producto cambió en otro dispositivo (una venta, un ingreso, un ajuste), **When** se vuelve a mirar el Catálogo, **Then** muestra el stock nuevo, con la misma demora con que hoy se actualizan los precios.

---

### User Story 2 - Agregar a la venta desde el Catálogo (Priority: P1)

El Vendedor encontró el producto en el Catálogo y lo agrega a la venta en curso con un toque,
sin ir a Vender ni buscarlo otra vez. Si está trabajando en espejo con la computadora, lo
agregado aparece también en la venta de la computadora.

**Why this priority**: Ahorra buscar dos veces el mismo producto, que es lo más frecuente
cuando el cliente pregunta primero y compra después.

**Independent Test**: Con la venta vacía, agregar una mecha desde el Catálogo, agregarla otra
vez, ir a Vender y ver un renglón de la mecha con cantidad 2.

**Acceptance Scenarios**:

1. **E06** **Given** la venta en curso vacía, **When** el Vendedor toca «Agregar» en una mecha del Catálogo, **Then** la mecha queda en la venta con cantidad 1, como si la hubiera agregado en Vender, y el Catálogo lo confirma a la vista sin perder la búsqueda ni el lugar en la lista.
2. **E07** **Given** la mecha ya en la venta, **When** la agrega otra vez desde el Catálogo, **Then** no se abre otro renglón: se suma 1 a la cantidad (la regla de Vender).
3. **E08** **Given** productos agregados desde el Catálogo, **When** el Vendedor va a Vender, **Then** están en la venta, con su precio, y la venta se cobra como cualquier otra.
4. **E09** **Given** el celular y la computadora en espejo, **When** se agrega un producto desde el Catálogo de uno de los dos, **Then** aparece en la venta del otro.
5. **E10** **Given** un producto sin precio (sin margen elegido), **When** se lo agrega, **Then** entra a la venta y la venta avisa «Hay productos sin precio» al cobrar, como en Vender.
6. **E11** **Given** un producto sin stock, **When** se lo agrega, **Then** entra igual: la venta no se impide por falta de stock (la regla de Vender).
7. **E12** **Given** alguien sin el permiso de vender, **When** mira el Catálogo, **Then** no ve «Agregar».
8. **E13** **Given** el dispositivo sin conexión, **When** se agrega un producto desde el Catálogo, **Then** entra a la venta igual, como en Vender sin conexión.
9. **E14** **Given** un producto agregado desde el Catálogo, **When** termina de agregarse, **Then** el Vendedor sigue en el Catálogo, con la misma búsqueda y en el mismo lugar de la lista; un aviso breve dice que se agregó, y el menú muestra en Vender cuántos productos lleva la venta (decisión 103).
10. **E24** **Given** la venta en curso con productos, **When** se mira el menú desde cualquier parte, **Then** Vender muestra cuántos renglones lleva la venta; con la venta vacía (o recién cobrada) no muestra número.
11. **E25** **Given** productos agregados a la venta (desde el Catálogo o en Vender), **When** el Vendedor va a otra parte y vuelve a Vender, con o sin espejo, **Then** la venta sigue como la dejó (ADR-022).
12. **E26** **Given** una venta cobrada en un dispositivo en espejo, **When** se mira el menú de los dos, **Then** ninguno muestra número en Vender.
13. **E27** **Given** la computadora con un producto elegido en el Catálogo, **When** se aprieta «+», **Then** se agrega a la venta como con «Agregar»; quien no puede vender aprieta «+» y no pasa nada.

---

### User Story 3 - Filtrar por disponibilidad y por marca (Priority: P2)

Cuando el cliente pregunta «¿qué tenés de tal marca?» o «¿qué discos de corte tenés?», el
Vendedor filtra la lista para ver solo lo que hay, o solo una marca.

**Why this priority**: Ayuda a contestar rápido, pero buscar ya resuelve la mayoría de los casos.

**Independent Test**: Con productos de dos marcas, algunos con stock y otros sin, buscar
«disco», filtrar «Con stock» y una marca, y ver solo los que cumplen las dos cosas.

**Acceptance Scenarios**:

1. **E15** **Given** el Catálogo, **When** el Vendedor mira la lista sin filtrar, **Then** los filtros no ocupan un renglón fijo arriba de la lista: se abren desde un botón junto al buscador, y la lista empieza tan arriba como hoy.
2. **E16** **Given** los filtros abiertos, **When** elige disponibilidad «Con stock», **Then** la lista muestra solo los productos con stock mayor que cero; con «Sin stock», solo los que no tienen; con «Todos», todos.
3. **E17** **Given** los filtros abiertos, **When** elige una marca de la lista de marcas del catálogo, **Then** la lista muestra solo los productos de esa marca.
4. **E18** **Given** una búsqueda escrita y filtros elegidos, **When** se mira la lista, **Then** muestra solo lo que cumple la búsqueda y todos los filtros, y la cantidad de productos que muestra.
5. **E19** **Given** algún filtro elegido, **When** se mira el botón de filtros, **Then** se nota que hay filtros puestos y cuántos, y hay una forma de sacarlos todos de un toque.
6. **E20** **Given** filtros que no dejan ningún producto, **When** se mira la lista, **Then** dice que no hay productos con esos filtros y ofrece sacarlos.
7. **E28** **Given** la lista de marcas, **When** dos proveedores escriben la misma marca con distintas mayúsculas («3M» y «3m»), **Then** figura una sola vez y la elige para los dos.
8. **E29** **Given** el celular que busca en el servidor (sin el catálogo en el dispositivo), **When** abre los filtros después de buscar, **Then** la lista de marcas son las de lo encontrado, y la disponibilidad filtra con el stock de siempre.
9. **E30** **Given** los filtros abiertos en la computadora, **When** se aprieta Esc, **Then** el panel se cierra y los filtros elegidos quedan puestos; todo el panel se recorre con el teclado.

---

### User Story 4 - Pestañas cómodas y un buscador que dice qué busca (Priority: P3)

Las pestañas Productos, Listas y Duplicados se tocan cómodas con el dedo, y el buscador dice
que encuentra por nombre, por código y por marca.

**Why this priority**: Es comodidad; no cambia lo que se puede hacer.

**Independent Test**: Medir la altura de las pestañas en el celular y leer el buscador vacío.

**Acceptance Scenarios**:

1. **E21** **Given** el Catálogo en el celular, **When** se miden las pestañas Productos, Listas y Duplicados, **Then** cada una tiene al menos 44 px de alto, la medida mínima para tocar con el dedo.
2. **E22** **Given** el buscador vacío, **When** se lo mira, **Then** en la computadora dice «Buscar productos, códigos o marcas…» y en el celular, «Producto, código o marca».
3. **E23** **Given** una marca escrita en el buscador, **When** se busca, **Then** aparecen los productos de esa marca (lo que el buscador promete).

### Edge Cases

- Un producto con stock negativo por un ajuste viejo: se muestra como «Sin stock», nunca con
  un número negativo (el stock no baja de 0, regla de Ventas).
- Un catálogo de 11.000 productos: el stock y los filtros no hacen más lenta la búsqueda que hoy.
- Una marca escrita distinto por dos proveedores («3M» y «3m»): en la lista de marcas figura una sola vez.
- Un producto sin marca: no figura en ninguna marca, y sí con el filtro de marca sin elegir.
- Muy poco stock (0,04 kg): se escribe con su primera cifra, «0,04 kg en stock»; nunca un «0»
  que parezca que hay y diga que no.
- Con filtros y más productos de los que la lista muestra de una vez: el renglón de filtros dice
  igual cuántos son («81 productos con filtros»).
- Cerrar la sesión («Salir», o que el servidor la cierre): la venta a medio armar se vacía; quien
  entra después en el mismo dispositivo no la encuentra ni puede cobrarla.
- En la computadora, la tecla «+» con el foco en el buscador agrega el elegido: el buscador no
  busca signos, así que no se pierde nada. Con Ctrl, Cmd o Alt no agrega (Ctrl y «+» agranda la
  página).
- Las pestañas de 44 px valen para todas las pestañas del celular, no solo las del Catálogo: son
  las mismas en toda la aplicación (consistencia, como pide Carlos).

## Requirements *(mandatory)*

### Functional Requirements

- **RF-107**: En el Catálogo, cada producto muestra su stock: la cantidad con su unidad, o «Sin stock» si no tiene, distinto a la vista; y «Stock bajo» cuando exista el stock mínimo (RF-54). En el celular y en la computadora.
- **RF-108**: Desde el Catálogo se agrega un producto a la venta en curso con un toque, con las mismas reglas que agregarlo en Vender (cantidad 1, suma si ya está, sin precio o sin stock entra igual); con el espejo, aparece en el otro dispositivo. Se sigue en el Catálogo, con un aviso breve, y el menú muestra en Vender cuántos productos lleva la venta. Solo lo ve quien puede vender.
- **RF-109**: El Catálogo se filtra por disponibilidad (todos, con stock, sin stock) y por marca, junto con la búsqueda; los filtros se abren desde un botón y no ocupan lugar fijo arriba de la lista.
- **RF-110**: Las pestañas del Catálogo tienen al menos 44 px de alto en el celular, y el buscador dice qué busca: «Buscar productos, códigos o marcas…» en la computadora y «Producto, código o marca» en el celular.

### Key Entities *(include if feature involves data)*

- **Producto**: su stock y su unidad de venta, que ya existen; no se guarda nada nuevo.
- **Venta en curso**: la misma de Vender, compartida con el espejo; el Catálogo le agrega renglones.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El Vendedor sabe si hay un producto sin salir del Catálogo: cero pantallas extra (hoy, ir a Depósito y buscarlo de nuevo).
- **SC-002**: Agregar a la venta un producto encontrado en el Catálogo lleva un toque, en lugar de ir a Vender y buscarlo otra vez.
- **SC-003**: Sin filtros, la lista del celular muestra al menos 4 productos por pantalla (hoy, 7; Carlos aceptó ver menos a cambio del stock y «Agregar»).
- **SC-004**: Buscar con stock y filtros responde tan rápido como hoy, con 11.000 productos.

## Assumptions

- El stock es el mismo que muestra Depósito (capacidad 005); el Catálogo solo lo muestra.
- La computadora tiene los mismos cambios que el celular, adaptados a su tabla (decisión 47): una
  columna o dato de stock, «Agregar» y los filtros; las pestañas ya son cómodas en la computadora.
- Agregar sigue las reglas de agregar en Vender (capacidad 003); no hay reglas nuevas de venta.
- «Agregar» no pide cantidad: se ajusta después en Vender, como cuando se agrega allá.
- Los filtros no se recuerdan al cerrar la aplicación.
- No entran (Carlos, 2026-10-17): categorías, «Avisar» en los productos sin stock, un menú por
  producto, ordenar la lista, ni el signo «+» en el margen.
