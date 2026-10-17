# Revisión: Ficha del producto renovada (016)

**Revisor:** subagente `revisor`, 2026-10-17. **Base:** `spec.md` (E01 a E27, RF-111 a RF-116),
`plan.md` (sección «Seguridad»), `ux.md`, las maquetas aprobadas (variante A:
`celular-ficha-a.html`/`.png`, `celular-ficha-a-entera.png`, `compu-ficha.html`/`.png`) y
`tasks.md`; commits `9b5e1e3` (T003), `df37fa4` (T004) y `4f45390` (T005 a T007).

**Qué se comprobó de verdad:** se leyeron el código y las pruebas. Se corrieron las unitarias de
`microservices/web` (67 archivos, 454 pruebas, todas pasan) y de `microservices/api` (29 archivos,
174 pruebas, todas pasan), y `node tests/trazabilidad.mjs` («la especificación y el estado
coinciden»; solo los avisos de RNF de siempre).
**Qué no se comprobó:** las e2e (no se corrieron; las corre el agente principal) ni las pantallas
con capturas propias: lo visual se compara leyendo el CSS y el marcado contra las imágenes de las
maquetas. Los hallazgos marcados «leído, no ejecutado» salen de leer el código y no se
reprodujeron con una prueba.

Gravedad: **Frena el cierre** (hay que arreglarlo o que Carlos lo acepte antes de cerrar T008) o
**Defecto** (se puede anotar en `proyecto/estado.yml` y seguir).

---

## 1. Escenarios sin cumplir o con prueba que no los comprueba

### 1.1 E12: la prueba que lo nombra prueba otra cosa — Frena el cierre
- **Dónde:** `microservices/api/src/rutas/ficha-del-producto.test.ts:39-42` («016-E12: otro cambio
  del producto (el margen) no toca la última lectura»).
- **Spec:** E12: «un código que ya tiene otro producto, se lo escanea en la ficha: pasa lo de hoy
  (RF-08) y la fecha de la última lectura no cambia si el código no quedó cargado».
- **Código:** hoy (RF-08) el código se carga igual aunque otro producto lo tenga, con el aviso
  «También lo tiene…» (`pantallas/CodigoDeBarras.tsx:51`); así que la fecha sí cambia, y está
  bien. El único caso en que «no quedó cargado» es que el servidor lo rechace (por ejemplo, un
  código con caracteres que el esquema no acepta, `productos/esquemas.ts:20`). En ese caso el
  cliente ya anotó el código y la hora en el catálogo del dispositivo antes de mandarlo
  (`src/catalogo.ts:247-255`, cambio optimista sin vuelta atrás): la ficha muestra la fecha nueva
  hasta que el catálogo se vuelve a bajar. Leído, no ejecutado.
- **Prueba:** ninguna prueba escanea un código que ya tiene otro producto y mira la fecha, ni un
  código rechazado. La que lleva el nombre E12 prueba que cambiar el margen no toca la columna:
  correcto, pero no es E12. La de pantalla «si otro producto ya tiene ese código, lo dice»
  (`CodigoDeBarras.test.tsx:47`) no mira la última lectura.
- Hace falta una prueba de E12 de verdad y decidir qué pasa con la fecha local cuando el
  servidor rechaza el código.

### 1.2 E06: el botón de al lado no siempre dice «Escanear código» — Defecto
- **Dónde:** `pantallas/CodigoDeBarras.tsx:64`.
- **Spec / ux:** E06: «al lado, «Escanear código»». `ux.md`: en la computadora, «Escanear con el
  celular», «donde el código llega del celular vinculado o se tipea».
- **Código:** dice «Escanear código» solo en el celular con cámara y «Escanear con el celular»
  solo en la computadora con un celular vinculado. Sin cámara en el celular, o en la computadora
  sin celular vinculado (el caso más común al abrir la ficha), dice «Cargar el código» o «Cambiar
  el código», como antes. Puede ser razonable (no promete una cámara que no hay), pero no está
  escrito y la maqueta de la computadora muestra «Escanear con el celular».
- **Prueba:** `CodigoDeBarras.test.tsx:82` y `:113` prueban solo los dos casos con lector.

### 1.3 E18, E19 y E16 sin prueba de pantalla en la computadora — Defecto
- **Dónde:** `pantallas/compu/base/pantallas/FichaProducto.test.tsx`.
- La cuenta de «Así se calcula», desplegar y plegar, y que siga al margen (E18, E19) solo se
  prueban en el celular (`celular/Catalogo.test.tsx:83`) y en la función compartida
  (`negocio/catalogo/ficha.test.tsx:17-25`). En la computadora el componente `AsiSeCalcula` es
  otra copia (`compu/.../FichaProducto.tsx:170-191`), sin prueba.
- E16 (la flecha muestra los demás y se elige uno) en la computadora se recorre en la prueba de
  teclado de `compu/Productos.test.tsx` (≈ línea 100), que no lleva el número del escenario ni
  mira la estrella del más barato en la lista desplegada.

### 1.4 E21 en la computadora: no se mira que falte «Así se calcula» — Defecto
- **Dónde:** `compu/base/pantallas/FichaProducto.test.tsx:104-110`.
- **Código:** cumple (`FichaProducto.tsx:150`, `{veCostos && <AsiSeCalcula …/>}`).
- **Prueba:** mira proveedor, archivo y «Agregar», pero no `asi-se-calcula` ni que no aparezca
  el costo. En el celular sí (`celular/Catalogo.test.tsx:210-224`).

### 1.5 Pruebas que comprueban menos de lo que dice el escenario — Defecto
- **E01** (`celular/FichaProducto.test.tsx:34`, compu `:34`): «nombre en negrita y mayúsculas» queda
  en un comentario («en mayúsculas por estilo»); no se mira. Leído: `text-transform: uppercase` y
  `font-weight: 800` en `celular/ficha.css:13` y `compu/base/estilos/ficha.css:7`.
- **E02** (`:42`/`:43`): mira la clase `sin`, no el tamaño ni el color neutro. Leído: en el celular
  `.ficha-foto.sin button.foto-chica:empty` (especificidad mayor) le gana al recuadro naranja de
  `tema.css:49`; en la computadora fondo `--p-fondo-2`. No medido en un navegador.
- **E05** (`:51`/`:52`): prueba que se sube y se llama a `alCambiar`; no que la ficha muestre la
  foto nueva ni «las mismas reglas de hoy (tamaño máximo, quién puede)». Esas reglas viven en el
  servidor y tienen sus pruebas propias; no se tocaron.
- **E25** (`:94`/`:95`): prueba cantidad, suma y aviso; «sin precio o sin stock entra igual» no se
  prueba desde la ficha (sí en 015, con la misma función `agregarALaVenta`).
- **E09** en el servidor (`ficha-del-producto.test.ts:23-30`) prueba `horaDeLectura` directo; la
  regla está bien probada (futuro, anterior a 2026, sin hora, con zona horaria).

### 1.6 Borde «código de 14 dígitos» no comprobado — Defecto (leído, no ejecutado)
- **Dónde:** `pantallas/codigo-de-barras.css`: `.cb-fila` sin `flex-wrap`, `.cb code` con
  `white-space: nowrap`, y en el celular el botón con `max-width: 38%`.
- **Spec:** «entra entero al lado de los botones, o los botones bajan a otro renglón; no se corta».
- **Código:** los botones nunca bajan de renglón. Con 14 dígitos en monoespaciada de 16 px más el
  botón de copiar, la caja queda muy justa a 390 px; si no entra, el texto se sale de la caja (no
  hay `overflow: hidden`, así que no se corta, pero se monta sobre el botón de copiar). No hay
  prueba ni captura con 14 dígitos.

### Escenarios que se cumplen y su prueba los comprueba
E03 y E04 (celular y computadora), E07 (copia, aviso y selección si el navegador no deja), E08,
E09 (cliente manda la hora; servidor la guarda, la registra y la corrige si es futura o vieja;
e2e en `10-escaner`, no ejecutada), E10, E11 (sin fecha, y borrar el código la borra), E13 (con
celular vinculado; tipear sin celular, prueba anterior «en la computadora se tipea»), E14, E15,
E17 (las dos interfaces), E16 (celular), E18 a E20 (celular y negocio), E21 (celular; servidor
403 en `/listas/:id/origen`), E22 (con y sin conexión, y la memoria), E23, E24 (sin lista; y 404 sin
consultar la base para un id que no es una lista), E26, E27 (con Ctrl no agrega; Mayús + 1).

## 2. Seguridad (plan.md, «Seguridad»)

- **Datos que toca:** una columna `codigo_leido_en timestamptz` nueva
  (`migrations/0025_ultima_lectura_del_codigo.sql`) y los datos de la lista. Nada personal. Cumplido.
- **Permisos — cargar el código con cualquier sesión:** cumplido; `PATCH /productos/:id` solo pide
  sesión y el margen sigue pidiendo `catalogo.margenes` (`productos/reglas.ts:42`).
- **Permisos — el origen pide «Ver costos»:** cumplido. `rutas/listas.ts:44`,
  `exigirPermiso("catalogo.costos")`; probado 403 y 401 (`ficha-del-producto.test.ts:62-65`). En
  las pantallas la tarjeta solo existe con `useVeCostos()` (celular `FichaProducto.tsx:47`,
  computadora `:62`), así que el hook no pide nada sin el permiso.
- **Permisos — «Agregar a la venta» pide `ventas.registrar`:** cumplido en el botón y en la tecla
  «+» de las dos interfaces (celular `:50`, computadora `:31,38,51,55`); probado.
- **Qué entra desde afuera — la hora de la lectura:** cumplido en lo que pide el plan:
  - es fecha y hora con zona (`z.iso.datetime({ offset: true })`, `productos/esquemas.ts:25`);
    «ayer» da 400, probado;
  - solo junto con un código (`esquemas.ts:28`); sola da 400, probado;
  - en el futuro, se toma la del servidor (`productos/reglas.ts:30-35`), probado;
  - anterior a 2026: **no se rechaza, se reemplaza por la del servidor**. El plan dice «se valida
    que… no sea anterior al 2026» sin decir qué pasa; el código eligió reemplazar. Razonable,
    pero hay que escribirlo (ver 4.3). — Defecto.
  - con el código en `null`, la hora se ignora y la columna queda en `null`, aunque se mande una.
- **Qué entra desde afuera — el id de la lista:** cumplido; se valida que sea un UUID antes de
  consultar (`listas/reglas.ts:154-155`) y lo que no existe da 404; probado.
- **Registro de quién hizo qué:** cumplido; el evento `producto.precio_elegido` lleva
  `codigo_leido_en` (`productos/reglas.ts:45`), probado (`ficha-del-producto.test.ts:20`).
- **Hueco no previsto en el plan, anterior a 016 — Defecto (anotar):** «Descargar Excel» llama a
  `GET /listas/:id/archivo` (`rutas/listas.ts:34`), que **solo pide sesión**. El archivo es la lista
  entera del proveedor, con todos sus costos. El plan protege con «Ver costos» los datos del
  origen (nombre, fecha, cantidad) «igual que la tarjeta que los muestra», pero la descarga, que
  expone mucho más, la puede pedir cualquiera con sesión y un id de lista (y los ids llegan a
  todos con el catálogo, `lista_importada_id`). No lo introdujo 016 y es del mismo tipo que el
  defecto ya anotado en `proyecto/estado.yml` (los costos viajan con el catálogo a todos), pero
  esa nota no menciona la descarga. Que Carlos decida si la descarga pide «Ver costos».

## 3. Reglas inventadas

### 3.1 Con el código rechazado, la fecha local queda igual — ver 1.1
Ya contado en 1.1.

### 3.2 La computadora no avisa si falla la foto — Defecto (leído, no ejecutado)
- **Dónde:** `compu/base/pantallas/FichaProducto.tsx:75-81` (`try { await alSubir(f); } finally …`,
  sin `catch`).
- **Celular:** `celular/FichaProducto.tsx:71` muestra «No se pudo subir la foto: …».
- **Código:** en la computadora, si la subida falla (foto muy grande, sin conexión, sin permiso),
  el botón vuelve a «Cambiar foto» sin decir nada y queda una promesa rechazada sin atender. Las
  dos interfaces se comportan distinto (decisión 47).

### 3.3 La computadora dice «Sin marca ni código» y el celular nada — Defecto
- **Dónde:** `compu/base/pantallas/FichaProducto.tsx:47`; celular `FichaProducto.tsx:40` deja el
  renglón vacío. No está en la spec, el `ux.md` ni las maquetas, y no es igual en los dos lados.

### 3.4 «Otro margen» con el margen a mano: dos textos distintos — Defecto
- Celular: «Otro margen · 120 % a mano» (`celular/FichaProducto.tsx:146`); computadora: «Otro
  margen: hoy 120 % a mano» (`compu/.../FichaProducto.tsx:146`). Venía así de antes, pero ahora
  que la ficha tiene sección en `textos.ts` tendría que decir lo mismo (decisión 47).

### 3.5 «Sin margen» en «Así se calcula» pide elegir aunque no se pueda — Defecto
- **Dónde:** `textos.ts`, `ficha.faltaMargen`: «Sin margen: elegí uno y la cuenta aparece acá.»
- Quien ve costos pero no tiene «Fijar márgenes» no tiene los botones de margen
  (`fijaMargen && …`): el texto le pide algo que no puede hacer. Igual con «elegí un margen» en
  lugar del precio (ver 4.1).

### 3.6 Menos de 900 px en la computadora: una columna y sin teclas — Defecto menor
- **Dónde:** `compu/base/estilos/ficha.css` (`@media (max-width: 899px)`): una sola columna y se
  esconde la línea de teclas. No está en `ux.md`; anotarlo.

### 3.7 Dónde está el proveedor en uso se reconoce por el nombre — Defecto menor
- **Dónde:** `celular/FichaProducto.tsx:91` y `compu/.../FichaProducto.tsx:98`
  (`todos.find((v) => v.proveedor === p.proveedor)`), aunque el producto trae `proveedor_id`. Con
  dos proveedores del mismo nombre se marcaría el equivocado. Venía de la ficha anterior.

## 4. Documentación que quedó atrás

- **4.1 E20 dice «sin margen»; el código dice «elegí un margen»** (celular `FichaProducto.tsx:137`,
  computadora `:141`). Es lo que decía la ficha de antes («como hoy»), así que el código cumple la
  intención y es la spec la que está mal escrita; las pruebas solo miran «sin costo». — Defecto:
  corregir la spec o el texto.
- **4.2 La etiqueta del botón del código según haya lector** (ver 1.2): no está escrita. — Defecto.
- **4.3 Hora de lectura anterior a 2026 se reemplaza por la del servidor** (ver 2): el plan no dice
  qué pasa. Tampoco dice que si el dispositivo no manda hora (versiones viejas, o cualquier
  cliente) vale la del servidor. — Defecto.
- **4.4 Unir duplicados no lleva la última lectura:** `duplicados/datos.ts:74-78` copia el código
  del absorbido al conservado (`COALESCE(c.codigo_barras, a.codigo_barras)`) sin su
  `codigo_leido_en`; el conservado queda con código y sin fecha (no inventa una, así que no
  contradice E11, pero pierde un dato que existía). Ni la spec ni el plan dicen qué pasa al unir o
  separar. — Defecto.
- **4.5 Textos fuera de `textos.ts`.** La sección `ficha` es nueva y cubre lo principal, pero
  quedaron escritos en las pantallas: «Código » (delante del código del proveedor, las dos),
  «Subiendo…», «sin costo» / «elegí un margen», «productos» (en el archivo de origen, en lugar del
  `cantidadDeProductos` que ya existe al final de `textos.ts`), «No se pudo bajar la lista: …»
  (la computadora le agrega un punto final y el celular no), «No se pudo subir la foto» (solo
  celular), «Sin marca ni código» (solo computadora), «ej. 120», «margen», «cierra», y en
  `CodigoDeBarras.tsx` «También lo tiene…» (`:51`, cambiado en esta tarea), «Escribí el código…»
  (`:45`), «Guardar el código» (`:103`), «Cancelar» y las tres ayudas. Además `sacarFoto` usa
  `largo`/`corto` para decir dos cosas distintas («Subir foto» / «Sacar foto»), no un texto largo y
  uno resumido. — Defecto.
- **4.6 `tasks.md`:** T008 y T009 sin marcar, como corresponde; esta revisión es T009.
- **4.7 `CodigoDeBarras`:** «Código copiado» es un renglón dentro de la tarjeta que desaparece a
  los 2,5 s, no un aviso flotante como «Agregado a la venta». `ux.md` dice «un aviso breve»; está
  bien, pero el tiempo no está escrito. — Defecto menor.

Lo demás que hace el código (la memoria del origen mientras la aplicación está abierta, el 404
sin preguntar a la base para un id que no es UUID, que la cuenta tome lo que se cobra de la
misma regla que el precio, «Código actualizado» solo en la ficha donde se cargó, la franja de
sin conexión del archivo) está escrito en el plan o en `ux.md`.

## 5. Pantallas (contra las maquetas aprobadas)

No se sacaron capturas; se comparó el CSS y el marcado con `celular-ficha-a-entera.png` y
`compu-ficha.png`.

- **5.1 Botón del código en la computadora:** la maqueta dice «Escanear con el celular»; sin
  celular vinculado el código dice «Cargar el código» / «Cambiar el código» (ver 1.2). — Defecto.
- **5.2 Ícono del archivo de origen en la computadora:** la maqueta muestra una planilla; la
  computadora usa `archivo` (una hoja lisa, `compu/.../FichaProducto.tsx:201`) y el celular
  `excel` (`celular/FichaProducto.tsx:190`). Distinto de la maqueta y entre las dos interfaces. —
  Defecto menor.
- **5.3 «Descargar Excel» en la computadora:** en la maqueta es un botón con borde al lado del
  nombre; el código usa `Boton tam="chico"`, que sigue ese lugar; el tamaño real no se midió. Sin
  hallazgo comprobado.
- **5.4 Pie fijo del celular** (`celular/ficha.css`, `.ficha-pie` con `position: sticky` y márgenes
  negativos de 24 px): depende del relleno de `Hoja`; no comprobado que quede pegado abajo sin
  hueco. SC-001 (foto, nombre, stock y código sin bajar en el celular) tampoco se midió.
- **5.5 Lo demás coincide según el CSS:** foto de 128 px (celular) y 112 px (computadora) con
  «Cambiar foto» encima, etiqueta de stock arriba del nombre, nombre en mayúsculas y negrita,
  tarjetas con título verde, caja del código con copiar adentro, franja verde de «Código
  actualizado» con la última lectura, inicial en un cuadrado naranja suave, estrella amarilla,
  chip «Proveedor principal», flecha a la derecha que gira al abrir, precio grande, cinco márgenes
  y «Otro margen», «Así se calcula» naranja suave con la cuenta y «Se cobra» en verde, archivo con
  ícono verde, pie con «Listo» y «Agregar a la venta» con el carrito, y en la computadora dos
  columnas y la línea de teclas. No verificado con captura.

## Resumen

| # | Punto | Gravedad |
|---|---|---|
| 1.1 | E12 sin prueba de verdad; con el código rechazado, la fecha local queda nueva | Frena el cierre |
| 2 | La descarga del Excel solo pide sesión (anterior a 016, no anotado) | Defecto, a decidir por Carlos |
| 1.2 / 4.2 / 5.1 | El botón del código no siempre dice «Escanear…», distinto de E06 y la maqueta | Defecto |
| 1.3 / 1.4 | E16, E18, E19 y E21 sin prueba de pantalla en la computadora | Defecto |
| 1.5 | Pruebas que comprueban menos que el escenario (E01, E02, E05, E25) | Defecto |
| 1.6 | Código de 14 dígitos sin comprobar; los botones nunca bajan | Defecto |
| 3.2 / 3.3 / 3.4 | Diferencias celular / computadora (error de foto, «Sin marca ni código», «a mano») | Defecto |
| 3.5 / 4.1 | «Elegí un margen» a quien no puede, y la spec dice «sin margen» | Defecto |
| 2 / 4.3 | Hora anterior a 2026 o sin hora: se usa la del servidor, sin escribir | Defecto |
| 4.4 | Unir duplicados no lleva la última lectura | Defecto |
| 4.5 | Textos fuera de `textos.ts` | Defecto |
| 3.6 / 3.7 / 4.7 / 5.2 | Menores: una columna bajo 900 px, proveedor por nombre, 2,5 s, ícono del archivo | Defecto |

---

## Qué se hizo con cada punto (T009, 2026-10-17)

| Punto | Qué se hizo |
|---|---|
| E12 sin prueba; el dispositivo no deshacía un código rechazado (Frena el cierre) | Arreglado. Si el servidor rechaza el código, vuelven el código y la última lectura de antes, y la ficha deja de decir «Código actualizado» (solo lo dice mientras el producto tiene el código recién cargado). Prueba nueva, que falla sin el arreglo. La prueba del servidor que decía E12 pasó a E10, que es lo que comprueba. |
| Descarga del Excel con solo sesión | Viene de antes de 016. Anotado como defecto de RF-115 en `proyecto/estado.yml`; se le pregunta a Carlos. |
| Hora anterior a 2026 | Escrito en el plan: no se rechaza, vale la del servidor (igual que una en el futuro). |
| E06: «Cargar el código» sin cámara o sin celular vinculado | Escrito en `ux.md`: ahí el código se tipea, y el botón lo dice. |
| Faltan pruebas en la computadora (E16, E18, E19, E21) | Agregadas. |
| Pruebas que comprueban menos (E01, E02, E05, E25) | E05: se agregó la del error al subir. E01 y E02 son de estilo (mayúsculas, fondo neutro): se comprueban por la clase; anotado en `proyecto/estado.yml`. E25 comprueba la regla del Catálogo (suma 1) y el aviso. |
| Diferencias celular / computadora | Arregladas: la computadora avisa si la foto no se sube; «Sin marca ni código» y «· 138 % a mano» iguales en los dos; el ícono del archivo es el de planilla en los dos. |
| E20: «elegí un margen» / «sin margen» | La spec y `ux.md` dicen ahora lo que hace: «elegí un margen» a quien puede fijarlo, «sin margen» a quien no (antes lo decía a todos). |
| Unir duplicados no pasaba la última lectura | Arreglado: pasa con el código y separar la devuelve. Prueba actualizada. |
| Textos fuera de `textos.ts` | Los nuevos de las dos fichas pasaron a `textos.ts` (sin marca, a mano, sin costo, elegí un margen, sin margen, subiendo, no se pudo subir, la cantidad de productos). Los de `CodigoDeBarras.tsx` que vienen de antes (panel para tipear, ayudas) quedan como estaban. |
| Código de 14 dígitos | Comprobado con captura: con 13 y 14 dígitos el código entra entero al lado del botón; si no entrara, el botón baja de renglón (escrito en `ux.md`). |
| Menores | Escritos en `ux.md`: una columna y sin teclas debajo de 900 px; el aviso de copiado dura dos segundos y medio. El proveedor en uso se reconoce ahora por su id. |
