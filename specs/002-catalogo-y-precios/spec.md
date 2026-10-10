# Feature Specification: Catálogo y precios

**Feature Branch**: `002-catalogo-y-precios`

**Created**: 2026-10-10

**Status**: Baseline

**Input**: Línea de base: lo construido antes de adoptar Spec Kit (docs/REQUERIMIENTOS.md, sección 3.1)

## User Scenarios & Testing *(mandatory)*

Cada escenario describe comportamiento comprobado en una prueba o, donde dice «Prueba:
ninguna», leído en el código sin prueba que lo cubra. Los de punta a punta existen dos veces,
uno por interfaz (computadora y celular).

### User Story 1 - Buscar un producto sin saber el proveedor (Priority: P1)

El Vendedor escribe unas palabras, el código del proveedor o el código de barras y encuentra
el producto al instante, sin saber quién lo vende.

**Why this priority**: es el primer paso del mostrador (buscar, precio, cantidad, cobro); sin
búsqueda no hay venta ni carga de márgenes.

**Independent Test**: con un catálogo sembrado, abrir Productos (computadora) o Catálogo
(celular), escribir y ver el resultado.

**Acceptance Scenarios**:

1. **Given** el catálogo ya bajado al dispositivo, **When** el Vendedor abre Productos, **Then** la caja de búsqueda tiene el foco.
   - Prueba: tests/e2e/escritorio/03-productos.spec.ts, tests/e2e/celular/03-productos.spec.ts
2. **Given** una mecha para madera de 6 mm en el catálogo, **When** escribe `e2e madera mecha` (las palabras en cualquier orden, sin mayúsculas ni acentos), **Then** aparece un solo resultado, la mecha.
   - Prueba: tests/e2e/escritorio/03-productos.spec.ts, tests/e2e/celular/03-productos.spec.ts, libraries/calculo-de-precios/src/busqueda.test.ts
3. **Given** un producto con código de proveedor `ME6` y código de barras, **When** escribe el código del proveedor o el de barras, **Then** lo encuentra, y la coincidencia exacta de código va primero.
   - Prueba: libraries/calculo-de-precios/src/busqueda.test.ts, tests/e2e/escritorio/03-productos.spec.ts, tests/e2e/celular/03-productos.spec.ts
4. **Given** el catálogo, **When** escribe una palabra empezada (`mad mec`), **Then** encuentra los productos cuyas palabras empiezan así; un número no coincide adentro de un código.
   - Prueba: libraries/calculo-de-precios/src/busqueda.test.ts
5. **Given** el catálogo, **When** busca `zzzz`, **Then** ve «Nada con "zzzz". Probá con menos palabras.».
   - Prueba: tests/e2e/escritorio/03-productos.spec.ts, tests/e2e/celular/03-productos.spec.ts
6. **Given** 40 productos que coinciden, **When** busca, **Then** ve 30 primero y, al llegar al final de la lista, se cargan los 40 y desaparece «Cargando más…».
   - Prueba: tests/e2e/escritorio/03-productos.spec.ts, tests/e2e/celular/03-productos.spec.ts, clientes/gestion-del-local-web/src/pantallas/Catalogo.test.tsx, clientes/gestion-del-local-web/src/escritorio/pantallas/Productos.test.tsx
7. **Given** un catálogo de 50.000 productos en memoria, **When** se busca con cuatro palabras, **Then** la búsqueda responde en menos de 100 ms.
   - Prueba: libraries/calculo-de-precios/src/busqueda.test.ts
8. **Given** resultados en pantalla y el foco fuera de la caja de búsqueda, **When** aprieta flecha abajo dos veces y Shift+2, **Then** queda elegido el tercer resultado con margen 200 %.
   - Prueba: tests/e2e/escritorio/03-productos.spec.ts, tests/e2e/celular/03-productos.spec.ts, clientes/gestion-del-local-web/src/teclas.test.tsx

---

### User Story 2 - Elegir el margen y ver el precio de venta explicado (Priority: P1)

El Vendedor ve el costo del producto, elige el margen con un toque (300 / 200 / 100 / 50 /
25 %) o tipea otro porcentaje, y el sistema calcula el precio de venta redondeado para arriba
a $1.000. Cada número calculado dice de dónde sale.

**Why this priority**: el precio de venta sale siempre del costo y del margen; sin margen
elegido el producto no tiene precio.

**Independent Test**: con un producto de costo conocido y sin margen, elegir un margen y
comparar el precio y su explicación.

**Acceptance Scenarios**:

1. **Given** una mecha con costo $1.500 y sin margen, **When** el Vendedor elige 100 % (Shift+3 en la computadora, el botón en la ficha del celular), **Then** el botón «100 %» queda activo, el precio es $4.000 (1.500 × 2 × 1,21 = 3.630, para arriba al múltiplo de $1.000) y su explicación dice «+ 100 % de margen».
   - Prueba: tests/e2e/escritorio/03-productos.spec.ts, tests/e2e/celular/03-productos.spec.ts
2. **Given** un producto sin margen elegido, **When** se lo ve en los resultados, **Then** dice «sin precio» (computadora) o «sin margen» (celular) en vez de un precio.
   - Prueba: tests/e2e/escritorio/03-productos.spec.ts, tests/e2e/celular/03-productos.spec.ts
3. **Given** la mecha de costo $1.500, **When** elige «otro margen» y tipea 20, **Then** el precio es $3.000 (1.500 × 1,2 × 1,21 = 2.178 → 3.000), dice que el margen es 20 % a mano y ningún botón queda activo: lo tipeado es un porcentaje, no un precio.
   - Prueba: tests/e2e/escritorio/03-productos.spec.ts, tests/e2e/celular/03-productos.spec.ts, clientes/gestion-del-local-web/src/pantallas/Catalogo.test.tsx, clientes/gestion-del-local-web/src/escritorio/pantallas/Productos.test.tsx
4. **Given** un taladro de costo $120.000, **When** elige 25 %, **Then** el precio es $182.000 (181.500 para arriba).
   - Prueba: tests/e2e/escritorio/03-productos.spec.ts, tests/e2e/celular/03-productos.spec.ts, libraries/calculo-de-precios/src/precio.test.ts
5. **Given** un margen recién elegido cuyo envío al servidor todavía no terminó, **When** se recarga la página, **Then** el margen sigue elegido: el cambio se guarda en el dispositivo antes de mandarse y se reenvía.
   - Prueba: tests/e2e/escritorio/03-productos.spec.ts, tests/e2e/celular/03-productos.spec.ts, clientes/gestion-del-local-web/src/cola.test.ts
6. **Given** un producto, **When** se manda como margen un porcentaje entero entre 1 y 10.000, o ninguno, **Then** se guarda en el producto y queda registrado con el usuario que lo hizo; un decimal, cero, un negativo, más de 10.000 o un texto se rechazan.
   - Prueba: microservices/gestion-del-local/src/rutas/productos.test.ts
7. **Given** el costo de un producto que salió de una lista con descuentos, **When** el Vendedor abre la explicación del costo, **Then** ve los pasos, por ejemplo «− 25 % (linea)».
   - Prueba: tests/e2e/escritorio/03-productos.spec.ts, tests/e2e/celular/03-productos.spec.ts, clientes/gestion-del-local-web/src/componentes/componentes.test.tsx, clientes/gestion-del-local-web/src/escritorio/componentes/componentes.test.tsx
8. **Given** un costo de $1.649,14, margen 100 % e IVA 21 %, **When** se calcula el precio, **Then** los pasos son «Costo $1.649,14», «+ 100 % de margen = $3.298,28», «+ IVA 21 % = $3.990,92» y «Redondeado para arriba a $4.000,00 (múltiplo de $1.000,00)»; una fila con IVA 10,5 % usa ese IVA.
   - Prueba: libraries/calculo-de-precios/src/precio.test.ts
9. **Given** un precio ya múltiplo de $1.000, **When** se redondea, **Then** queda igual; $1.000,01 pasa a $2.000 y $15,10 a $1.000.
   - Prueba: libraries/calculo-de-precios/src/precio.test.ts
10. **Given** un renglón de venta de 0,5 kg a $3.000 el kilo, **When** se calcula el subtotal, **Then** es $2.000 y lo explica («× 0,5 kg = $1.500,00», «Redondeado para arriba a $2.000,00 (múltiplo de $1.000,00) para no dar vuelto»); un precio puesto a mano de $1.500 se cobra $2.000.
    - Prueba: libraries/calculo-de-precios/src/precio.test.ts, microservices/gestion-del-local/src/rutas/ventas.test.ts

---

### User Story 3 - Actualizar precios con la lista de un proveedor (Priority: P1)

El Comprador sube el Excel de un proveedor. El sistema reconoce de quién es, muestra qué
cambia y recién al confirmar actualiza los costos; con el margen de cada producto cambian los
precios de venta. Si algo se ve mal, se descarta y no cambia nada (CU-04).

**Why this priority**: el catálogo y todos los costos salen de las listas; sin ellas no hay
productos que buscar ni precios que calcular.

**Independent Test**: con un proveedor dado de alta con su lector, subir la muestra
anonimizada, revisar el resumen y aplicar; verificar productos y precios creados.

**Acceptance Scenarios**:

1. **Given** un proveedor «Comodo (e2e)» con lector `comodo` y descuento por contado de 5 %, **When** se sube la planilla `LISTA GENERAL PRUEBA 11-8.xlsx` sin decir de quién es, **Then** el sistema reconoce el proveedor y muestra su nombre con la fecha de la lista y el resumen: 4 productos leídos, 4 nuevos, 1 fila salteada.
   - Prueba: tests/e2e/escritorio/02-listas.spec.ts, tests/e2e/celular/02-listas.spec.ts, tests/integration/listas.sh
2. **Given** la vista previa de esa lista, **When** se abre la explicación del costo de `MP001`, **Then** el costo es $712,50 con los pasos «− 25 % (linea)» y «− 5 % (contado)».
   - Prueba: tests/e2e/escritorio/02-listas.spec.ts, tests/e2e/celular/02-listas.spec.ts, microservices/listas-de-proveedores/tests/test_lectores.py
3. **Given** una lista cargada y todavía pendiente, **When** se consultan los precios del proveedor, **Then** no hay ninguno guardado: nada se guarda hasta aplicar.
   - Prueba: tests/integration/listas.sh
4. **Given** la lista pendiente, **When** se toca «Aplicar», **Then** se aplica en segundo plano y al terminar se vuelve a la pantalla de listas con el resultado («4 precios actualizados», «4 productos nuevos»), que se cierra; el proveedor muestra su última lista aplicada («hace N días»).
   - Prueba: tests/e2e/escritorio/02-listas.spec.ts, tests/e2e/celular/02-listas.spec.ts
5. **Given** una lista que se está aplicando, **When** se consulta su estado, **Then** la pantalla muestra una barra de progreso con las filas procesadas y, al final, la etapa de búsqueda de duplicados.
   - Prueba: ninguna
6. **Given** una lista ya aplicada, **When** se la quiere aplicar otra vez, **Then** el sistema la rechaza (409).
   - Prueba: tests/integration/listas.sh
7. **Given** una lista ya aplicada, **When** se carga y aplica el mismo archivo otra vez, **Then** el resumen dice 0 nuevos y 4 sin cambio, y no se duplica ningún precio ni ningún producto.
   - Prueba: tests/integration/listas.sh
8. **Given** una lista pendiente, **When** se la descarta, **Then** queda descartada y no se guarda ningún precio.
   - Prueba: tests/integration/listas.sh
9. **Given** un archivo que no es la planilla de ningún proveedor conocido, **When** se lo sube, **Then** el sistema no lo acepta (422) y pide elegir el proveedor a mano.
   - Prueba: tests/integration/listas.sh, microservices/listas-de-proveedores/tests/test_lectores.py
10. **Given** que el sistema no reconoció el proveedor, **When** el Comprador lo elige de la lista de proveedores y toca «Leer», **Then** la planilla se lee con el lector de ese proveedor.
    - Prueba: ninguna
11. **Given** una planilla que no dice su fecha, **When** se la sube, **Then** el sistema pregunta de qué fecha es la lista antes de leerla.
    - Prueba: ninguna
12. **Given** las planillas de muestra de Comodo, 3GE, ERPA e Ixnova, **When** se detecta el formato, **Then** cada una se reconoce como su proveedor, por el nombre del archivo o por sus hojas.
    - Prueba: microservices/listas-de-proveedores/tests/test_lectores.py
13. **Given** la planilla de un proveedor, **When** se la lee, **Then** cada fila sale con el mismo formato (código, descripción, marca, grupo, precio de lista, descuentos, costo neto sin IVA con su explicación, IVA, bulto, código de barras y precio sugerido cuando la planilla los trae), y las filas sin código o sin precio se saltean con su motivo.
    - Prueba: microservices/listas-de-proveedores/tests/test_lectores.py, microservices/listas-de-proveedores/tests/test_api.py
14. **Given** un proveedor cuya configuración dice que sus precios incluyen IVA, **When** se lee su lista, **Then** el costo neto es el precio sin IVA (1.000 / 1,21 = 826,4463).
    - Prueba: microservices/listas-de-proveedores/tests/test_lectores.py
15. **Given** un descuento por contado configurado que no coincide con el de la planilla, **When** se lee la lista, **Then** la vista previa trae un aviso de que no coincide.
    - Prueba: microservices/listas-de-proveedores/tests/test_lectores.py
16. **Given** el alta de un proveedor, **When** se manda un descuento fuera de rango (25 en vez de 0,25), **Then** se rechaza (400).
    - Prueba: tests/integration/listas.sh
17. **Given** una lista aplicada, **When** se revisa el registro, **Then** quedó anotada la aplicación con el usuario que la hizo.
    - Prueba: tests/integration/listas.sh
18. **Given** una lista que trae productos nuevos, **When** termina de aplicarse, **Then** el sistema busca si esos productos son duplicados de otros proveedores y deja las sugerencias pendientes.
    - Prueba: ninguna

---

### User Story 4 - Bajar el Excel original de la lista de un producto (Priority: P2)

Desde un producto, el Vendedor o el Comprador baja el Excel tal como lo mandó el proveedor,
para revisar de dónde salió el costo.

**Why this priority**: es la forma de comprobar un costo dudoso contra la fuente.

**Independent Test**: con un producto cuyo costo vino de una lista con archivo guardado, tocar
«lista del …» y recibir el archivo con su nombre.

**Acceptance Scenarios**:

1. **Given** un producto cuyo costo salió de una lista cargada, **When** se toca «lista del …» (computadora) o «Bajar el Excel de la lista del …» en la ficha (celular), **Then** se pide el archivo de esa lista.
   - Prueba: clientes/gestion-del-local-web/src/escritorio/pantallas/Productos.test.tsx, clientes/gestion-del-local-web/src/pantallas/Catalogo.test.tsx
2. **Given** una lista con su archivo guardado, **When** se pide el archivo con sesión, **Then** se devuelve el contenido original con su nombre de archivo.
   - Prueba: microservices/gestion-del-local/src/rutas/listas.test.ts
3. **Given** una lista que no existe, que se cargó sin guardar el archivo o cuyo archivo ya no está, **When** se pide el archivo, **Then** responde que no existe (404); sin sesión, 401.
   - Prueba: microservices/gestion-del-local/src/rutas/listas.test.ts

---

### User Story 5 - Averiguar quién vende un producto y a cuánto (Priority: P2)

El Vendedor o el Comprador busca un producto y ve todos los proveedores que lo tienen, el
costo de cada uno y cuál es el más barato; puede elegir de cuál sale el costo (CU-05).

**Why this priority**: decide a quién comprar y sobre qué costo se calcula el precio.

**Independent Test**: con un producto que tiene precio de dos proveedores, abrirlo y ver los
dos costos, la marca del más barato y el precio según el elegido.

**Acceptance Scenarios**:

1. **Given** un producto unido con precio de un proveedor barato ($2.400) y uno caro ($3.000) y margen 100 %, **When** se lo busca, **Then** aparece un solo producto con «★ Proveedor barato $2.400,00» y «Proveedor caro $3.000,00», y el precio es $6.000 (sale del más barato).
   - Prueba: tests/e2e/escritorio/11-duplicados.spec.ts, tests/e2e/celular/11-duplicados.spec.ts
2. **Given** ese producto, **When** se elige usar el proveedor caro, **Then** el costo pasa a ser el de ese proveedor y el precio $8.000.
   - Prueba: tests/e2e/escritorio/11-duplicados.spec.ts, tests/e2e/celular/11-duplicados.spec.ts, clientes/gestion-del-local-web/src/pantallas/Catalogo.test.tsx, clientes/gestion-del-local-web/src/escritorio/pantallas/Productos.test.tsx

---

### User Story 6 - Unir el mismo artículo de varios proveedores y volver a separarlo (Priority: P2)

El Administrador ve las sugerencias de duplicados, decide «es el mismo» o «son distintos»,
une dos productos a mano si hace falta y puede separar una unión hecha por error.

**Why this priority**: sin unir, el mismo artículo aparece una vez por proveedor y no se
puede comparar quién es más barato.

**Independent Test**: con dos productos de proveedores distintos y el mismo código de barras,
buscar duplicados, unirlos, verificar el producto resultante y separarlos.

**Acceptance Scenarios**:

1. **Given** dos productos de proveedores distintos con el mismo código de barras, **When** el Administrador abre Duplicados y toca «Buscar duplicados en todo el catálogo», **Then** aparece la sugerencia «Mismo código de barras» con los dos proveedores.
   - Prueba: tests/e2e/escritorio/11-duplicados.spec.ts, tests/e2e/celular/11-duplicados.spec.ts
2. **Given** esa sugerencia, **When** toca «Es el mismo», **Then** dice «Unidos»; el producto absorbido queda inactivo apuntando al conservado, sus ventas pasan al conservado, el producto queda con los dos proveedores y el preferido es el más barato.
   - Prueba: tests/e2e/escritorio/11-duplicados.spec.ts, tests/e2e/celular/11-duplicados.spec.ts, microservices/gestion-del-local/src/equivalencias.test.ts
3. **Given** dos productos que se unen, **When** al conservado le faltaba código de barras, marca, sector o margen, **Then** hereda los del absorbido, y queda registrado exactamente qué se movió.
   - Prueba: microservices/gestion-del-local/src/equivalencias.test.ts
4. **Given** una unión hecha, **When** en «Unidos» toca «Separar» y confirma, **Then** dice «Separados», la unión desaparece de la lista, el absorbido vuelve a estar activo, su venta vuelve a apuntarle y cada producto queda con un solo proveedor.
   - Prueba: tests/e2e/escritorio/11-duplicados.spec.ts, tests/e2e/celular/11-duplicados.spec.ts, microservices/gestion-del-local/src/equivalencias.test.ts
5. **Given** un usuario con rol «mostrador», **When** intenta separar una unión, **Then** se le niega (403); si el producto no está unido o no hay registro de la unión, no se separa (409).
   - Prueba: microservices/gestion-del-local/src/equivalencias.test.ts
6. **Given** una sugerencia pendiente, **When** el Administrador toca «Son distintos», **Then** la sugerencia queda rechazada y no vuelve a aparecer.
   - Prueba: ninguna
7. **Given** dos productos cualesquiera, **When** el Administrador abre «Unir dos productos a mano», busca uno para conservar y otro para absorber y toca «Unir», **Then** quedan unidos igual que con una sugerencia.
   - Prueba: ninguna
8. **Given** dos productos de proveedores distintos sin código de barras en común pero con la misma descripción (sin acentos, símbolos ni espacios, de 8 caracteres o más), **When** se buscan duplicados, **Then** aparece la sugerencia «Misma descripción».
   - Prueba: ninguna

---

### User Story 7 - Leer el código de barras con la cámara del celular (Priority: P2)

El Vendedor escanea con el celular. Si está usando la computadora, vincula el celular
leyendo un QR y lo que escanea aparece en la pantalla de la computadora.

**Why this priority**: la cámara del celular es el único lector de códigos del local.

**Independent Test**: con dos sesiones del mismo usuario (computadora y celular), vincular,
mandar un código conocido y uno desconocido, y ver la venta de la computadora.

**Acceptance Scenarios**:

1. **Given** la pantalla Vender en la computadora, **When** el Vendedor toca «Vincular celular para escanear», **Then** se ve un QR; al abrir su enlace en el celular dice que «quedó vinculado» y la computadora muestra «Celular vinculado».
   - Prueba: tests/e2e/escritorio/10-escaner.spec.ts, tests/e2e/celular/10-escaner.spec.ts
2. **Given** el celular vinculado, **When** manda el código de barras de un producto conocido, **Then** el producto aparece en la venta de la computadora.
   - Prueba: tests/e2e/escritorio/10-escaner.spec.ts, tests/e2e/celular/10-escaner.spec.ts
3. **Given** el celular vinculado, **When** manda un código que no está en el catálogo, **Then** la computadora avisa que no lo conoce; al buscar el producto y dar Enter, se agrega a la venta y el código queda guardado en ese producto.
   - Prueba: tests/e2e/escritorio/10-escaner.spec.ts, tests/e2e/celular/10-escaner.spec.ts
4. **Given** ese código ya asociado, **When** el celular lo manda otra vez, **Then** el producto pasa a cantidad 2 y los códigos mandados figuran como entregados.
   - Prueba: tests/e2e/escritorio/10-escaner.spec.ts, tests/e2e/celular/10-escaner.spec.ts
5. **Given** un celular con cámara, **When** el Vendedor abre el escáner y apunta a un código de barras, **Then** el código se lee (el mismo código seguido no se repite antes de 2,5 segundos) y también se puede tipear si la cámara no lee.
   - Prueba: ninguna

---

### User Story 8 - Sacarle una foto al producto (Priority: P3)

El Vendedor o el Comprador le saca una foto al producto con el celular y queda en su ficha.
La foto chica se amplía al tocarla y desde ahí se saca otra.

**Why this priority**: ayuda a reconocer el producto, pero no frena ninguna operación.

**Independent Test**: abrir la foto de un producto sin foto, sacar una y verla chica y grande.

**Acceptance Scenarios**:

1. **Given** un producto sin foto, **When** se toca la foto chica, **Then** se amplía con la descripción y dice que «todavía no tiene foto»; Escape la cierra.
   - Prueba: tests/e2e/escritorio/03-productos.spec.ts, tests/e2e/celular/03-productos.spec.ts, clientes/gestion-del-local-web/src/componentes/componentes.test.tsx, clientes/gestion-del-local-web/src/escritorio/componentes/componentes.test.tsx
2. **Given** la foto ampliada, **When** se toca «Sacar foto», **Then** se abre la cámara trasera del celular y la foto elegida se sube.
   - Prueba: clientes/gestion-del-local-web/src/componentes/componentes.test.tsx, clientes/gestion-del-local-web/src/escritorio/componentes/componentes.test.tsx
3. **Given** una foto jpeg, png o webp, **When** se la sube para un producto, **Then** se guarda con un nombre al azar, queda como foto del producto y se muestra chica y grande; lo que no es una imagen se rechaza.
   - Prueba: microservices/gestion-del-local/src/rutas/productos.test.ts, clientes/gestion-del-local-web/src/componentes/componentes.test.tsx, clientes/gestion-del-local-web/src/escritorio/componentes/componentes.test.tsx
4. **Given** un producto que ya tiene foto, **When** se la amplía, **Then** el botón dice «Sacar otra foto» y la nueva reemplaza a la anterior.
   - Prueba: ninguna

---

### User Story 9 - Productos que se venden sueltos (Priority: P3)

El Vendedor marca cómo se vende un producto: por unidad, o a granel por kilo, metro o litro.

**Why this priority**: clavos por kilo y cable por metro son ventas de todos los días, pero
son pocos productos.

**Independent Test**: cambiar la unidad de un producto a kg y cargar 1,5 como cantidad.

**Acceptance Scenarios**:

1. **Given** un producto, **When** se le pone como unidad `unidad`, `kg`, `m` o `l`, **Then** queda guardada en el producto; cualquier otra se rechaza.
   - Prueba: microservices/gestion-del-local/src/rutas/productos.test.ts
2. **Given** un producto que se vende por unidad, **When** se tipea 2,7 como cantidad, **Then** se toma 2; **Given** uno que se vende por kilo, **Then** admite un decimal, con coma o con punto.
   - Prueba: clientes/gestion-del-local-web/src/unidades.test.ts, clientes/gestion-del-local-web/src/pantallas/Vender.test.tsx, clientes/gestion-del-local-web/src/escritorio/pantallas/Vender.test.tsx

---

### Edge Cases

- **Cargar una lista sin internet:** no se puede; la pantalla dice «Sin conexión con el servidor. Cargar una lista necesita internet.».
- **El servicio que lee las planillas no responde:** la carga falla con un error (502) y no se crea ninguna lista.
- **Archivo de lista de más de 30 MB, o foto de más de 10 MB:** se rechazan (413).
- **Dos personas aplican la misma lista a la vez:** solo la primera la aplica; la otra recibe «La lista ya está aplicándose» (409).
- **La aplicación de una lista se corta a mitad:** la lista vuelve a «pendiente» con el motivo del error; los lotes ya guardados quedan, y al reaplicar no se duplican porque un precio igual al vigente no agrega fila.
- **Productos que ya no aparecen en la lista nueva:** se cuentan en la vista previa («Ya no aparecen») y nada más; siguen activos y con su último costo.
- **Proveedor más barato con lista vieja:** al unir o separar, el preferido es el más barato entre los que tienen lista de los últimos 120 días.
- **Cambiar el proveedor del que sale el costo:** vuelve a bajar el catálogo, así que necesita conexión para verse reflejado.
- **El QR para vincular el celular vence a los 5 minutos** y sirve una sola vez; el vínculo dura 12 horas. Lo que la computadora no llegó a recibir se le entrega al reconectar.
- **Producto sin costo** (sin precio de ningún proveedor): los botones de margen quedan deshabilitados y dice «sin costo».
- **Código de barras inválido** (menos de 4 o más de 32 letras o números): no se guarda.
- **Catálogo vacío:** la pantalla dice «Todavía no hay productos: cargá una lista de precios primero.».

## Requirements *(mandatory)*

### Functional Requirements

Solo lo construido. Los requerimientos pendientes o nuevos de la sección 3.1 (RF-02, RF-03,
RF-04, RF-09b, RF-11, RF-14 a RF-18) no forman parte de esta línea de base.

- **RF-01**: El sistema carga la lista de precios de un proveedor subiendo el archivo Excel: reconoce el proveedor (cuatro lectores: Comodo, 3GE, ERPA, Ixnova), muestra qué cambia (leídos, nuevos, cambian de precio con su variación promedio, sin cambio, ya no aparecen, filas salteadas con su motivo) y recién al confirmar crea los productos nuevos y agrega los costos. Nada se guarda hasta aplicar y la lista se puede descartar. Lo que ya no aparece en la lista solo se cuenta: [NEEDS CLARIFICATION: el documento lo da por hecho («actualiza todo al confirmar» incluye los dados de baja) y no encontré prueba ni código que lo respalde; al aplicar no cambia nada en esos productos].
- **RF-01b**: Desde un producto se baja el Excel original de la lista de la que salió su costo.
- **RF-05**: Cada artículo guarda el código de cada proveedor que lo vende, uno por cada precio de proveedor, y se lo encuentra por ese código. Construido para los cuatro proveedores iniciales; el volumen de más de 100.000 artículos no está probado (la búsqueda está probada con 50.000).
- **RF-06**: Un mismo artículo vendido por varios proveedores se une en uno solo; se ve quién lo vende, a qué costo y quién es el más barato, y se elige de cuál sale el costo. El sistema sugiere los duplicados (mismo código de barras o misma descripción) al aplicar una lista y a pedido; también se unen a mano, una sugerencia se puede rechazar y dos productos unidos se pueden volver a separar.
- **RF-07**: Se busca un producto por nombre, marca, código del proveedor o código de barras, sin saber el proveedor, con varias palabras en cualquier orden y sin acentos ni mayúsculas. La búsqueda corre sobre el catálogo guardado en el dispositivo.
- **RF-08**: El código de barras se lee con la cámara del celular. Para usarlo en la computadora, el celular se vincula leyendo un QR y lo que escanea aparece en la venta de la computadora; un código desconocido se asocia al producto que se elija.
- **RF-09**: Desde el celular se le saca una foto al producto y queda guardada en su ficha. La foto chica se amplía al tocarla y desde ahí se saca otra que la reemplaza.
- **RF-10**: El precio de venta es costo + margen (+ IVA de la fila). El margen se elige con un toque (300 / 200 / 100 / 50 / 25 %, también con Shift+1 a Shift+5) o a mano, y queda guardado por producto. En el catálogo, «a mano» es un porcentaje entero, no un precio.
- **RF-12**: Un producto se vende por unidad, con cantidades enteras, o fraccionado por kilo, metro o litro, con hasta un decimal. La unidad queda guardada en el producto.
- **RF-13**: Todo número calculado explica de dónde sale: el costo, con los pasos de la lista (precio de lista, IVA si lo incluía, cada descuento en orden); el precio de venta, con costo, margen, IVA y redondeo.
- **RF-19**: Toda venta es múltiplo de $1.000. El precio de venta se redondea para arriba a $1.000 y cada renglón de la venta también: lo que se vende suelto y el precio puesto a mano. El redondeo figura en la explicación.

### Key Entities *(include if feature involves data)*

- **Proveedor**: quien vende. Guarda si sus precios incluyen IVA, sus descuentos general y por contado, y qué lector entiende su planilla.
- **Lista importada**: cada archivo cargado de un proveedor, con su fecha, su estado (pendiente, aplicándose, aplicada, descartada), el resumen de cambios, los avisos y quién la cargó y quién la aplicó. El archivo original se conserva.
- **Producto**: lo que se vende. Guarda descripción, marca, código de barras, unidad, margen elegido, foto y el proveedor del que sale su costo. Un producto absorbido por otro queda inactivo y apunta al que lo reemplaza.
- **Precio de proveedor**: el costo de un producto según un proveedor en una lista: código del proveedor, precio de lista, descuentos aplicados con su explicación, costo neto, IVA y bulto. El costo vigente es el más reciente.
- **Equivalencia sugerida**: par de productos que podrían ser el mismo artículo, con el motivo y si quedó pendiente, unida o rechazada.
- **Puesto y código escaneado**: la computadora vinculada a un celular por un rato, y cada código que el celular le manda.

El detalle está en [data-model.md](data-model.md).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Buscar en un catálogo de 50.000 productos responde en menos de 100 ms.
- **SC-002**: Las listas reales de los cuatro proveedores se leen completas, sin filas salteadas: Comodo 7.096 filas, Ixnova 4.109, 3GE 2.167 y ERPA 729.
- **SC-003**: Volver a cargar una lista ya aplicada no agrega ningún precio ni ningún producto.
- **SC-004**: Todo precio de venta y todo renglón de venta es múltiplo de $1.000 y nunca queda por debajo del precio calculado.
- **SC-005**: Unir dos productos y volver a separarlos deja cada venta, precio y stock en el producto donde estaba.

## Assumptions

- **Roles.** Las historias nombran los roles de la sección 2 del documento de requerimientos (Administrador, Vendedor, Comprador), pero el sistema todavía trabaja con los roles de RF-73: «dueño», «admin» y «mostrador». Hoy cualquier usuario con sesión busca, elige márgenes, carga, aplica y descarta listas, saca fotos y escanea; dar de alta o modificar proveedores y todo lo de Duplicados exige «dueño» o «admin». Quién puede cargar listas, elegir márgenes, unir duplicados y ver costos con los roles nuevos sigue abierto (docs/REQUERIMIENTOS.md, sección 9, punto 1; RF-72, #59).
- **«Hecho» significa issue cerrado**, no validado en el mostrador: falta el piloto (#21).
- **Precio a mano que no es múltiplo de $1.000.** Hoy se redondea para arriba como todo lo demás; si tiene que respetarse tal cual, RF-19 necesita esa excepción (sección 9, punto 3).
- **Costo comparable entre proveedores (RF-11) sigue pendiente (#11)**: el cálculo del costo neto ya aplica IVA y descuentos en cascada según la configuración de cada proveedor, pero la regla no está cerrada con el dueño.
- **Las listas reales no están en el repositorio**: viven en `privado/`. La lectura completa de las listas reales (SC-002) solo se comprueba en una máquina que las tenga; en el repositorio hay muestras anonimizadas.
- **Las pruebas de punta a punta y la de integración de listas no corren en cada push**: se lanzan a mano o los lunes. En cada push corren las unitarias.
- **El escaneo con la cámara real se prueba a mano** en el celular; las pruebas automáticas mandan el código por la misma API que usa el escáner.
- Depende de la capacidad de usuarios y sesiones para saber quién hace cada cosa, y del servicio `listas-de-proveedores` para leer las planillas.

## Clarifications

Decisiones del dueño (docs/REQUERIMIENTOS.md, sección 7) que afectan a esta capacidad.

### Session 2026-10-08

- Q: ¿Hace falta encontrar un producto sin código de barras sacándole una foto? → A: En la primera versión alcanza con escanear el código de barras y fotografiar facturas; buscar por foto va en la segunda (RF-09b).
- Q: ¿Cómo se redondea el precio de venta? → A: Siempre para arriba a múltiplos de $1.000, para no lidiar con vueltos (RF-19).
- Q: ¿Qué tamaño puede tener el catálogo? → A: Entre todos los proveedores puede superar los 100.000 artículos. Se empieza con pocos proveedores y se agregan de a poco (RF-05, RNF-08).

### Session 2026-10-09

- Q: ¿Alcanza con redondear el precio? → A: No. No hay billetes chicos: toda venta tiene que ser múltiplo de $1.000, así que además del precio se redondea para arriba cada renglón de la venta (RF-19).
- Q: ¿Con qué nombres se dan los permisos? → A: Por rol: Administrador, Vendedor y Comprador, combinables. Los actores (Dueño, Empleado, Cliente, Proveedor) se usan solo donde el rol no alcanza (sección 2, RF-72).
