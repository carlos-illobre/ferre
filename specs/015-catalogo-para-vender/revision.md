# Revisión: Catálogo para vender (015)

**Revisor:** subagente `revisor`, 2026-10-17. **Base:** `spec.md` (E01 a E30, RF-107 a RF-110),
`plan.md` (sección «Seguridad»), `ux.md`, las cuatro maquetas aprobadas (variante B), ADR-022 y
`tasks.md`; commits `4f2afde`, `0072dca`, `167f937` y `42debcb`.

**Qué se comprobó de verdad:** se leyó el código y las pruebas, y se corrieron las cuatro
unitarias de la funcionalidad (29 pruebas, todas pasan) y `node tests/trazabilidad.mjs` (coinciden).
**Qué no se comprobó:** las e2e (no se corrieron; no hay Docker en esta revisión), ni las pantallas
con capturas propias: lo visual se compara leyendo el CSS contra las imágenes de las maquetas.
Los hallazgos de comportamiento de abajo salen de leer el código; los marcados «leído, no
ejecutado» no se reprodujeron con una prueba.

Gravedad: **Frena el cierre** (hay que arreglarlo o que Carlos lo acepte antes de cerrar T008) o
**Defecto** (se puede anotar en `proyecto/estado.yml` y seguir).

---

## 1. Escenarios sin cumplir o con prueba que no los comprueba

### 1.1 E29: las marcas, buscando en el servidor, no son «las de lo encontrado» — Frena el cierre
- **Dónde:** `microservices/web/src/pantallas/celular/Catalogo.tsx:91` (`marcasDe(catalogo ?? [])`);
  igual en `pantallas/compu/base/pantallas/Productos.tsx` (`const marcas = useMemo(() => marcasDe(catalogo ?? []), [catalogo])`).
  Prueba: `negocio/catalogo/stock-y-filtros.test.ts:43-45`.
- **Spec / plan:** E29: «la lista de marcas son las de lo encontrado». Plan, Filtros: «buscando en el
  servidor, de los resultados».
- **Código:** las marcas salen siempre de `catalogo`, que buscando en el servidor es todo lo que la
  memoria fue juntando (los primeros productos más todo lo traído en búsquedas anteriores,
  `src/catalogo.ts`, `sumar`). Después de dos o tres búsquedas, la lista de marcas mezcla marcas
  de búsquedas viejas que no están en lo encontrado; elegir una deja la lista vacía.
- **Prueba:** la de E29 llama a `marcasDe([MECHA, SIN_MARCA])` con una lista armada a mano: prueba la
  función, no qué lista le pasa la pantalla. Pasa siempre, con o sin el defecto. No hay prueba de
  pantalla en modo «buscar en el servidor».

### 1.2 E18: la cantidad de productos no se dice cuando hay 30 o más — Defecto
- **Dónde:** `pantallas/celular/Catalogo.tsx:131`; `Productos.tsx` (renglón `con-filtros`).
- **Spec:** E18: «muestra solo lo que cumple la búsqueda y todos los filtros, **y la cantidad de
  productos que muestra**».
- **Código:** si los resultados llegan al tramo cargado (`resultados.length >= limite`, 30 en el
  celular), el renglón dice «Productos con filtros», sin número. En el celular la hoja sí lo dice
  («Ver N productos»), pero al cerrarla se pierde; en la computadora no hay otro lugar.
- **Prueba:** las de E18 usan 2 a 4 productos; el caso de más de un tramo no se prueba.

### 1.3 E09: solo se prueba una dirección del espejo — Defecto
- **Dónde:** `tests/e2e/celular/17-espejo.spec.ts` y `tests/e2e/escritorio/17-espejo.spec.ts`
  (bloque «015-E09 015-E26», idéntico en los dos archivos).
- **Spec:** «se agrega un producto desde el Catálogo de **uno de los dos**, aparece en la venta del otro».
- **Prueba:** solo agrega desde el celular y mira la computadora. Agregar desde el Catálogo de la
  computadora (botón o «+») y verlo en el celular no se prueba. El código usa el mismo camino, así
  que es probable que funcione, pero no está comprobado. No se corrieron las e2e en esta revisión.

### 1.4 E10: la prueba no mira el aviso «Hay productos sin precio» — Defecto
- **Dónde:** `pantallas/celular/Catalogo.para-vender.test.tsx:66-73`.
- **Spec:** «entra a la venta y la venta avisa «Hay productos sin precio» al cobrar».
- **Prueba:** comprueba que entra y que el renglón queda `abierto`; no cobra ni busca el aviso. El
  aviso es el de Vender de siempre, así que el riesgo es bajo, pero el escenario no está probado
  como dice.

### 1.5 E08: «la venta se cobra como cualquier otra» no se prueba — Defecto
- **Dónde:** `Catalogo.para-vender.test.tsx:119-126`.
- **Prueba:** mira que el producto y el precio estén en Vender; no cobra. (E26 en la e2e sí cobra una
  venta armada desde el Catálogo, solo con el celular agregando; eso lo cubre en parte.)

### 1.6 E05, E21, E25 y E13: pruebas que comprueban menos de lo que dice el escenario — Defecto
- **E05** (`stock-y-filtros.test.ts:21-23`): llama a `stockDe` con otro mapa. No mira que la pantalla
  muestre el stock nuevo cuando cambia en el catálogo. Pasa siempre.
- **E21** (`Catalogo.para-vender.test.tsx:150-153`): busca con una expresión regular un renglón en
  `tema.css`. No mide la pestaña: si otra regla lo pisara o el renglón se escribiera distinto,
  fallaría o pasaría sin relación con el alto real. Leído: `min-height: 44px` le gana al
  `height: 34px` de `estilos.css:133`, así que hoy mide 44 px; no medido en un navegador.
- **E25** (`venta-en-curso.test.tsx:68-75`): usa un componente de prueba (`Contador`), no Vender, y
  no prueba «con espejo».
- **E13** (`Catalogo.para-vender.test.tsx:66-73`): mira que no se llame a la API; no pone el
  dispositivo sin conexión. Aceptable porque agregar no habla con el servidor.

### 1.7 E30: el foco salta dentro del panel de filtros — Defecto (leído, no ejecutado)
- **Dónde:** `Productos.tsx`, `PanelDeFiltros`: el `useEffect` con `[alCerrar]` que hace
  `querySelector("[aria-checked='true']")?.focus()`; el padre le pasa `alCerrar` como función nueva
  en cada dibujo (`alCerrar={() => { setViendoFiltros(false); caja.current?.focus(); }}`).
- **Spec:** E30: «todo el panel se recorre con el teclado».
- **Código:** cada vez que `Productos` se vuelve a dibujar (elegir una disponibilidad o una marca, el
  aviso de «Agregado», o la actualización periódica del stock y el catálogo), el efecto corre de
  nuevo y manda el foco al primer botón marcado (la disponibilidad). Quien eligió una marca con
  Enter, o está escribiendo en «Buscar una marca», pierde el lugar.
- **Prueba:** la de E30 solo prueba que Esc cierra y los filtros quedan; el recorrido con el teclado
  no se prueba.

### 1.8 Sin cobertura en la computadora — Defecto
La computadora no tiene prueba de E07, E10, E11, E13, E14, E17, E18, E20, E24 (salvo la e2e de E26)
y E28. La regla está en el negocio compartido y las pruebas de la computadora la usan igual, pero
`tasks.md` (T005) dice que la computadora cubre E06 a E20.

### Escenarios que se cumplen y su prueba los comprueba
E01, E02, E03 (también stock negativo), E04 (nadie dice «Stock bajo», como pide la decisión 103),
E06, E07, E11, E12 (celular y computadora), E14 (búsqueda conservada, sin ir a Vender, aviso),
E15, E16, E17, E19, E20, E22, E23, E24 (celular), E26 (e2e, no ejecutada), E27 (con y sin
permiso), E28.

## 2. Seguridad (plan.md, «Seguridad»)

- **Permisos — «Agregar» y «+» solo con `ventas.registrar`:** cumplido. Celular
  `Catalogo.tsx:59,142`; computadora `Productos.tsx` (`puedeVender` en el botón, en la tecla «+» y en
  la línea de atajos). Probado en las dos interfaces. El servidor sigue exigiendo
  `ventas.registrar` al registrar la venta (`microservices/api/src/rutas/ventas.ts:12`).
- **Qué entra desde afuera:** cumplido. El buscador de marcas solo filtra en el dispositivo.
- **Datos y secretos:** nada nuevo se guarda en el dispositivo ni en el servidor; cumplido.
- **Hueco no previsto en el plan — la venta en curso sobrevive a «Salir»: Frena el cierre.**
  - **Dónde:** `negocio/ventas/venta-en-curso.ts:21` (estado del módulo) y `src/sesion.tsx:61-65`
    (`salir` no vacía la venta); nadie más llama a `vaciarVenta` salvo cobrar y las pruebas.
  - **Antes:** la venta era estado de Vender, que se desmontaba al salir: cerrar sesión la perdía.
  - **Ahora:** si un usuario arma una venta, sale, y entra otro en el mismo navegador (o vence la
    sesión y entra otro), el segundo encuentra la venta del primero, con el número en Vender, y
    puede cobrarla a su nombre. El plan dice «la venta se registra al cobrar, con quién», pero no
    prevé que la venta armada por uno pase a otro. ADR-022 dice «recargar la aplicación la vacía»
    y no dice nada de cerrar sesión. Carlos tiene que decir si se vacía al salir (lo más probable)
    y quedar escrito en ADR-022.
- **Registro de quién hizo qué:** sin cambios; cumplido.

## 3. Reglas inventadas

### 3.1 La tecla «+» agrega aunque el foco esté en el buscador, y también con Ctrl — Frena el cierre (leído, no ejecutado)
- **Dónde:** `Productos.tsx`, `teclas`: `else if (e.key === "+" && puedeVender && resultados[elegido])`,
  registrada con `useTeclasGlobales(teclas, caja.current)`; `plataforma/teclado/teclas.ts:27` le pasa
  las teclas a la pantalla cuando el foco está en su caja (`objetivo === m.excepto`).
- **Spec:** E27: «con un producto elegido en el Catálogo, se aprieta «+»».
- **Código:** el buscador de la computadora tiene `autoFoco` y siempre hay un elegido (el primero),
  así que:
  - escribir «+» en el buscador no escribe nada y agrega a la venta el primer producto de la lista
    (con la búsqueda vacía, el primero del catálogo);
  - no se mira `ctrlKey`/`metaKey`: Ctrl y «+» (agrandar la página del navegador; en el teclado
    español la tecla «+» da `e.key === "+"`) agrega un producto y además le corta el zoom.
- Ninguna de las dos cosas está escrita. La prueba dispara la tecla sobre `window`, no sobre el
  buscador, y no lo ve.

### 3.2 Las pestañas de 44 px valen para toda la aplicación, no solo para el Catálogo — Defecto
- **Dónde:** `pantallas/celular/tema.css:43` (`.segmentos.con-icono button { min-height: 44px; }`),
  que usa `Pestanas` en Catálogo, Depósito, Usuarios, Anomalías y las demás.
- **Spec:** RF-110 y E21 hablan de las pestañas del Catálogo. Probablemente sea lo que Carlos quiere
  (consistencia), pero no está escrito: o se escribe en `001/ux.md` o en la `spec.md` de 015, o se
  limita.

### 3.3 En el celular, «Ver N productos» se vuelve «No hay productos con esos filtros.» — Defecto
- **Dónde:** `Catalogo.tsx:199`. El botón principal de la hoja cambia de texto con cero resultados.
  No está en `ux.md` ni en la maqueta. Es razonable; falta escribirlo.

### 3.4 Stock muy chico se muestra como «0 kg en stock» — Defecto
- **Dónde:** `negocio/catalogo/stock-y-filtros.ts:104-107`. Con 0,04 kg el texto es «0 kg» y
  `hay: true` (verde, cuenta como «Con stock»); con 0,4 u. es «0 u.». La spec dice cantidad con su
  unidad o «Sin stock»; un «0» en verde contradice E03 a la vista. Borde raro; anotarlo.

### 3.5 Columna Stock de la computadora: «sin contar» pasó a «Sin stock» — sin hallazgo
Antes decía «sin contar» si nunca se cargó; ahora «Sin stock», que es lo que pide E03. Correcto.

## 4. Documentación que quedó atrás

- **4.1 Venta y «Salir»** (ver 2): ADR-022 no dice qué pasa con la venta al cerrar sesión. — Frena el cierre junto con el punto 2.
- **4.2 La tecla «+» desde el buscador** (ver 3.1): si se decide que sí, hay que escribirlo; hoy no
  está en ningún lado. — Va con 3.1.
- **4.3 Plan, Technical Context:** «el filtro corre sobre la lista ya buscada (cientos de productos
  como mucho), no sobre los 11.000». El código, con filtros puestos, pide `buscarProductos(…, Number.MAX_SAFE_INTEGER)`
  o el catálogo entero (`Catalogo.tsx:88-89`, `Productos.tsx` igual) y filtra todo; con la búsqueda
  vacía son los 11.000, y `stockDe` arma el texto con `toLocaleString` por cada producto. La hoja
  del celular lo repite en cada dibujo para «Ver N productos» (`Catalogo.tsx:147`), también al
  escribir en «Buscar una marca». SC-004 («tan rápido como hoy con 11.000») no está medido por
  ninguna prueba. — Defecto: medirlo, o corregir el plan.
- **4.4 El renglón «N productos con filtros · Sacar filtros»** arriba de la lista (celular
  `Catalogo.tsx:130-133`, computadora `Productos.tsx`): confirmado, no está en las maquetas ni en
  `ux.md`. Cumple E18 y E19 y solo aparece con filtros puestos, así que no choca con E15; falta
  escribirlo en `ux.md` y mostrárselo a Carlos. — Defecto.
- **4.5 Textos fuera de `textos.ts`:** «con filtros», «producto/productos», «Ver N productos» y
  «Productos» están escritos en cada pantalla (`Catalogo.tsx:131,199`, `Productos.tsx`), no en la
  sección `catalogo` de `textos.ts`. Hoy dicen lo mismo en los dos lados, pero la decisión 47 pide
  los textos compartidos. Los textos largos que tiene solo la computadora («Ningún producto del
  catálogo cumple esos filtros.», «La lista se filtra mientras elegís. Esc cierra.») son el
  agregado que explica, aceptable. — Defecto.
- **4.6 `spec.md` de 002 y 003** no cuentan todavía que Vender ya no es dueña de la venta y que el
  Catálogo agrega: está previsto en T009 (sin hacer). Sin hallazgo nuevo; recordar que T009 incluye
  4.1 y 4.2.
- **4.7 Pruebas e2e de E09/E26** están copiadas igual en `tests/e2e/celular/17-espejo.spec.ts` y
  `tests/e2e/escritorio/17-espejo.spec.ts`: el mismo recorrido corre dos veces. No es un error de
  documentación; se anota por si una de las dos debería probar la otra dirección (1.3).

Lo demás que hace el código (la venta compartida, el espejo enganchado desde cada aplicación, el
número en Vender, el aviso de 3 segundos, los filtros que no se guardan, «Stock bajo» esperando a
RF-54) está escrito en la spec, el plan, ADR-022 o `ux.md`.

## 5. Pantallas (contra las maquetas aprobadas)

No se sacaron capturas; se comparó el CSS y el marcado con las imágenes de las maquetas.

- **5.1 Texto del buscador cortado en 390 px:** confirmado leyendo, pero **la maqueta aprobada
  `celular-catalogo-b.png` ya lo muestra cortado** («Producto, código o marc»). No es una diferencia
  con la maqueta; sí contradice el motivo de la aclaración («el texto largo no entra»). Que Carlos
  diga si se acepta así. — Defecto.
- **5.2 Fondo de la hoja de filtros del celular:** la maqueta es blanca; el código usa el componente
  `Hoja` de siempre. Confirmado que no hay un fondo propio en `catalogo.css`; el color real no se
  comprobó con captura. Usar el fondo común es coherente con lo que pide Carlos (consistencia
  entre pantallas). — Defecto, a mostrarle.
- **5.3 Renglón «con filtros»:** no está en ninguna maqueta (ver 4.4). — Defecto.
- **5.4 Buscador de marcas de la computadora sin lupa:** la maqueta `compu-filtros.png` tiene la lupa
  dentro de «Buscar una marca»; el código usa un `<input type="search">` sin ícono
  (`Productos.tsx`, `PanelDeFiltros`). En el celular sí usa `Buscador`, con lupa. — Defecto menor.
- **5.5 «Stock bajo»:** no aparece, como dice la spec (decisión 103). Confirmado; sin hallazgo.
- **5.6 Lo demás:** tarjetas con 1 px entre sí, nombre en negrita y mayúsculas, margen en verde,
  etiqueta de stock arriba del nombre (verde / naranja), «Agregar» secundario de 38 px en el
  celular y 36 px en la computadora, botón de filtros al lado del lector con su número, número
  naranja en Vender del menú, aviso «Agregado a la venta: …», panel de la computadora debajo de
  «Filtros» con Disponibilidad, Marca y «Sacar filtros», línea de atajos con «+»: coinciden con las
  maquetas según el CSS. No verificado con captura.

## Resumen

| # | Punto | Gravedad |
|---|---|---|
| 1.1 | E29: marcas de toda la memoria, no de lo encontrado; la prueba pasa siempre | Frena el cierre |
| 2 / 4.1 | La venta en curso pasa de un usuario a otro al salir y entrar | Frena el cierre |
| 3.1 | «+» escrito en el buscador o Ctrl y «+» agregan a la venta | Frena el cierre |
| 1.7 | El foco salta en el panel de filtros de la computadora (E30) | Defecto |
| 1.2 | Sin cantidad con 30 o más resultados filtrados (E18) | Defecto |
| 1.3–1.6, 1.8 | Pruebas que comprueban menos que el escenario o faltan en la computadora | Defecto |
| 3.2–3.4 | Pestañas de 44 px en toda la app; texto del botón con cero; «0 kg en stock» | Defecto |
| 4.3–4.5 | Rendimiento sin medir y distinto del plan; renglón «con filtros» sin escribir; textos fuera de `textos.ts` | Defecto |
| 5.1–5.4 | Buscador cortado (también en la maqueta), fondo de la hoja, renglón nuevo, sin lupa en marcas | Defecto |

---

## Qué se hizo con cada punto (T008, 2026-10-17)

| # | Qué se hizo |
|---|---|
| 1.1 | Arreglado. Las marcas salen de lo encontrado con la búsqueda escrita, en las dos interfaces. Pruebas de pantalla nuevas en el celular y en la computadora: buscar «cinta» deja solo «3M»; buscar «mecha», solo «Bosch». |
| 2 / 4.1 | Arreglado. «Salir» y la sesión cerrada por el servidor vacían la venta. Escrito en ADR-022 y en los bordes de la `spec.md`; dos pruebas nuevas de la sesión. Se le muestra a Carlos, porque es una regla. |
| 3.1 / 4.2 | Arreglado. Con Ctrl, Cmd o Alt, «+» no agrega. Con el foco en el buscador sí agrega: el buscador no busca signos, así que no se pierde nada. Escrito en `ux.md` y en los bordes; probado las dos cosas. |
| 1.7 | Arreglado. El panel pone el foco una sola vez, al abrirse. La prueba nueva escribe en «Buscar una marca» mientras cambia la lista; falla sin el arreglo. |
| 1.2 | Arreglado. El renglón dice siempre la cantidad («81 productos con filtros»), también con más de un tramo. Probado en las dos interfaces. |
| 1.8 | La computadora tiene ahora pruebas de E07, E11, E14, E17, E18, E20 y E29. E10, E13, E24 y E28 siguen probadas solo en el celular, con la misma regla compartida. |
| 1.3 a 1.6 | Se dejan como están. E09 en la otra dirección usa el mismo camino; E08 y E10 se cobran en Vender, que ya tiene sus pruebas; E21 queda leído. Anotado en `proyecto/estado.yml`. |
| 3.2 | Escrito. Las pestañas de 44 px valen para todo el celular (`spec.md`, bordes, y `ux.md`). |
| 3.3 | Escrito en `ux.md`. |
| 3.4 | Arreglado. Lo que redondeado da «0» se escribe con su primera cifra («0,04 kg»). Borde escrito, con su prueba. |
| 4.3 | Corregido el plan: dice lo que hace el código. SC-004 queda sin medir y anotado. |
| 4.4 / 5.3 | Escrito en `ux.md`. Se le muestra a Carlos con la captura. |
| 4.5 | Los textos «con filtros», «Ver» y la cantidad de productos pasaron a `textos.ts`. |
| 5.1, 5.2 | Se le muestran a Carlos: la maqueta aprobada ya era así. |
| 5.4 | Arreglado: el buscador de marcas de la computadora tiene lupa. |
