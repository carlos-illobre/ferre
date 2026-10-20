# Revisión: Descarga eficiente (018)

**Revisor:** subagente `revisor`, 2026-10-20. **Base:** `spec.md` (historias 1 a 5, E01 a E30,
RF-122 a RF-125, RNF-62, Clarifications), `plan.md` (sección «Seguridad»), `ux.md`, las maquetas
aprobadas (`celular-descarga.html`/`.png`, `compu-descarga.html`/`.png`), `tasks.md`, ADR-023 y las
decisiones 129 y 136 (`docs/decisiones-de-negocio.md`). Commits `170e8b5` (T002), `69f87cf` (T003),
`f4c5596` y `9a7c827` (T004, T005), `3f322aa` (T011), `75dd510` (T006), `2e02395` (T007), `f3da73d`,
`d0e8681`, `d83120e` (T008), `39f7cf8` y `6354ef8` (T009).

**Qué se comprobó de verdad:** se leyeron el código y las pruebas. Se corrieron las unitarias de la
funcionalidad: en `microservices/api`, `src/productos/*`, `rutas/productos.test.ts`,
`rutas/stock.test.ts` y `salud.test.ts` (5 archivos, 36 pruebas, todas pasan); en
`microservices/web`, `catalogo.test.tsx`, `descarga.test.tsx`, `guardado.test.tsx` y
`pantallas/celular/Catalogo.test.tsx` (4 archivos, 43 pruebas, todas pasan).
**Qué no se comprobó:** las e2e ni `tests/integration/avisos-del-catalogo.sh` (necesitan el stack;
no se corrieron), el comportamiento con una base real (carreras de la marca, `LISTEN` con el
«Session pooler» de Supabase, los 5 segundos de E16, que en una hora quieto no haya consultas), y
las pantallas con capturas propias: lo visual se compara leyendo el marcado y el CSS contra las
imágenes de las maquetas. Lo marcado «leído, no ejecutado» sale de leer el código y no se reprodujo.

**Nota:** al revisar, `spec.md` y `tasks.md` tienen cambios sin subir de otra sesión: E31 (una
consulta por día para que Supabase no pause la base), un cambio a RF-125 y la tarea T012, abierta.
Se revisa lo subido; E31 se trata en 1.10.

Gravedad: **Frena el cierre** (hay que arreglarlo o que Carlos lo acepte antes de cerrar T010) o
**Defecto** (se puede anotar en `proyecto/estado.yml` y seguir).

---

## 1. Escenarios sin cumplir o con prueba que no los comprueba

### 1.1 E25: después de unir o separar duplicados, «Actualizar» no trae el stock que se movió — Defecto (leído, no ejecutado)
- **Dónde:** `microservices/api/migrations/0027_transaccion_de_cada_movimiento_de_stock.sql` (la
  columna `transaccion` solo tiene `DEFAULT`), `microservices/api/src/duplicados/datos.ts:70` y `:100`
  (`UPDATE movimiento_stock SET producto_id = …`), `microservices/api/src/deposito/datos.ts:40`.
- **Spec:** E25: «Actualizar» baja «el stock que se movió» desde la descarga anterior.
- **Código:** unir duplicados pasa los movimientos del absorbido al conservado con un `UPDATE`, que
  no cambia `transaccion` (el `DEFAULT` vale solo al insertar). `stockQueCambio` busca productos con
  algún movimiento `transaccion >= marca`: el conservado no aparece, y el dispositivo sigue con su
  stock viejo (sin lo que sumó el absorbido) hasta el próximo movimiento suyo. Separar es igual, al
  revés.
- **Propone:** que el `UPDATE` de duplicados también ponga `transaccion = pg_current_xact_id()`, o un
  trigger en `movimiento_stock` que lo haga en todo `UPDATE`; y una prueba que lo nombre.

### 1.2 E26: sin conexión, Inventario y el stock del Depósito no usan lo bajado — Defecto
- **Dónde:** `microservices/web/src/negocio/deposito/inventario.ts:23-32` (`traerStock`),
  `pantallas/compu/Inventario.tsx:61`, `pantallas/celular/Deposito.tsx:66-68`.
- **Spec:** E26: con datos bajados y sin conexión se encuentra el producto «en cualquier pantalla
  del día a día», «con su precio, su stock». La historia 5 incluye a quien compra.
- **Código:** sin conexión, `useStock` muestra solo lo visto en esta sesión o falla («Sin conexión
  con el servidor y sin stock guardado en este dispositivo»), aunque el stock esté bajado. Buscar
  dentro de esas pantallas sí usa lo bajado, pero la lista sin búsqueda sale de `/stock`.
- **Propone:** que `traerStock` caiga en lo bajado como `oLoBajado` en `catalogo.ts`, o que la spec
  diga qué pantallas son «del día a día».

### 1.3 E26: sin conexión, un código de proveedor que no es el del proveedor preferido no se encuentra — Defecto
- **Dónde:** `microservices/web/src/catalogo.ts:63` (`conCodigos`) y `:67` (filtro por `codigo`).
- **Spec:** E26 (escanear con lo bajado) y RF-122/E04 (código de barras o de proveedor). En el
  servidor un código exacto es el de barras o *cualquiera* de los de proveedor, también de listas
  viejas (`productos/copia.ts:176`, `FilaDeLaCopia.codigos`).
- **Código:** sin conexión se compara solo con `codigo_barras` y `codigo_proveedor` (el del proveedor
  preferido): la descarga no trae `codigos` (`reglas.ts:27` los saca). El mismo código encuentra el
  producto con internet y no lo encuentra sin internet.
- **Propone:** mandar los códigos en la descarga (o en `proveedores[].codigo_proveedor`, que ya
  viene, y usarlo) y una prueba.

### 1.4 La búsqueda sin conexión sigue otra regla y otro orden que la del servidor — Defecto
- **Dónde:** `microservices/web/src/catalogo.ts:66` usa `plataforma/busqueda/busqueda.ts` (puntaje:
  código exacto primero, palabra exacta, comienzo de palabra, después menos palabras); el servidor,
  `productos/copia.ts:168-183` (descripción más corta en caracteres, sin puntaje). Además las dos
  normalizan distinto: el cliente conserva `/ . , -` («1/2»), el servidor parte en cualquier signo.
- **Spec/plan:** «La regla de búsqueda está una sola vez, en el servidor; el cliente ya no busca por
  su cuenta» (plan, «Constitution Check»); E03, «en el mismo orden que hoy».
- **Código:** sin conexión, y también mientras el servidor contesta (`resultadosDe`, `:156`, que
  muestra lo que ya está en memoria), la lista sale con la regla del cliente; al llegar la respuesta
  cambia el orden. Con conexión, buscar un código exacto ya no lo pone primero (antes, en el modo de
  memoria de arranque, sí): E03 pide «primero las descripciones más cortas», así que eso cumple la
  spec, pero es un cambio de lo que veía el mostrador.
- **Propone:** decidir si la regla del cliente queda para lo bajado y escribirlo en la spec, o usar la
  misma regla de un solo lugar; preguntar a Carlos si el código exacto va primero.

### 1.5 Pedidos e Ingreso: «primero los del proveedor elegido» se aplica solo sobre los 50 primeros — Defecto
- **Dónde:** `microservices/web/src/pantallas/Pedidos.tsx:172-177`,
  `microservices/web/src/negocio/deposito/ingreso.ts:111-115`.
- **Spec:** RF-122/E03 y la regla anterior de esas pantallas (los productos del proveedor elegido,
  primero), que esta funcionalidad no cambia.
- **Código:** la búsqueda trae del servidor los 50 primeros por largo de descripción y recién ahí
  se ponen primero los del proveedor; un producto del proveedor que quedó en el puesto 51 no aparece
  aunque sea el que se busca. Con el catálogo en memoria se ordenaba sobre todos.
- **Propone:** mandar el proveedor como criterio de orden al servidor, o anotarlo como cambio aceptado.

### 1.6 E06 y consumo: Inventario y Depósito leen productos de la base y traen todos los que tienen movimientos — Defecto
- **Dónde:** `microservices/api/src/deposito/datos.ts:53-68` (`stockDeTodos`, `GET /stock`) y
  `microservices/web/src/negocio/deposito/inventario.ts:41` (`traerPorIds` de todos).
- **Spec:** RF-124 («los productos con sus precios y proveedores … responde desde ahí»), SC-002, y
  E06 («pide esos productos por su identificador, de a páginas, y no el resto»); el pedido de
  revisión: ninguna lectura frecuente lee productos de la base.
- **Código:** cada vez que se abre Inventario o el stock del Depósito (React Query sin `staleTime`:
  en cada montaje), `GET /stock` hace un `JOIN` de `producto`, `precio_proveedor` y `proveedor` de
  todos los productos con movimientos para sacar su costo, que la copia ya tiene. Después el cliente
  pide *todos* esos productos de a 200 seguidos (no al llegar al final), aunque la pantalla muestra
  100. E06 se cumple a la letra (por identificador, de a páginas), pero con miles de productos con
  movimientos es casi el catálogo entero en cada apertura.
- **Propone:** que `/stock` lea de la base solo `SUM(cantidad)` y tome el costo de la copia; que la
  pantalla pida los productos de la página a la vista.

### 1.7 E10 y E28: cualquier error que no es de la API se dice como «sin conexión» — Defecto (leído, no ejecutado)
- **Dónde:** `microservices/web/src/catalogo.ts:56` (`sinConexion = !(e instanceof ErrorApi)`) y
  `microservices/web/src/descarga.ts:66`.
- **Código:** un fallo de IndexedDB (por ejemplo, sin lugar) al descargar, o un error de programa al
  buscar, se muestra como «Sin conexión: para bajar los datos hace falta internet.» y, al buscar,
  hace caer en lo bajado. Con conexión, la persona no entiende qué pasa.
- **Propone:** distinguir el error de red (`TypeError` de `fetch`, `navigator.onLine`) del resto.

### 1.8 Escenarios sin prueba que los nombre, o con prueba que no los comprueba — Defecto
- **Sin prueba con su número:** E07 (permisos: lo oculto sigue oculto), E09 (venta sin conexión,
  cola, una sola vez), E11 (renglón a mano sin conexión), E13 (sin la descarga no se guarda catálogo,
  stock ni clientes: `respetarElGuardado` se usa en las pruebas pero ninguna lo nombra ni comprueba
  que borre lo que bajó una versión anterior), E29 (la llave apagada borra lo bajado: lo cubre
  `009-E11` en general, sin mirar la `meta` «descarga»). Pueden estar cubiertos por pruebas de otras
  capacidades; no se encontró cuáles.
- **E17:** la prueba (`copia.test.ts:99`) solo mira que si *la lectura* falla la copia queda igual.
  No hay prueba de que un cambio que la base deshace (o la mitad de una lista que falla) no llegue a
  la copia; depende de que `NOTIFY` y `cambio_de_producto` sean transaccionales, lo que es correcto
  pero no está probado.
- **La marca «xmin» y el cambio que confirma tarde** (lo central del plan y del ADR): sin prueba
  contra una base real. Las pruebas simulan `leerCambiosDesde`; la de integración mira qué se anota,
  no qué se lee.
- **E16 (menos de 5 segundos):** no se mide.
- **E20:** la prueba solo mira `/health`; no hay prueba de que, quieto, el servidor no consulte (la
  conexión de `LISTEN` y su reconexión sí consultan, ver 3.2).
- **E22:** la prueba mira que `/health` contesta con la base caída, no que un pedido falle «con el
  aviso de siempre».
- **E24 a E28 en las pantallas:** la fila de Configuración se prueba en `descarga.test.tsx`; el texto
  de «Actualizar» en curso («Bajando lo que cambió… N productos.») no tiene prueba.
- **`GET /productos/descarga` sin sesión:** no tiene prueba de 401 (las otras rutas nuevas sí).

### 1.9 E02: la computadora dice otro texto mientras carga más — Defecto
- **Dónde:** `microservices/web/src/pantallas/compu/base/pantallas/Productos.tsx:198` («Trayendo más
  productos…») y `pantallas/celular/Catalogo.tsx:142` («Cargando más…»).
- **Spec/ux:** E02 y `ux.md`: «Cargando más…». CLAUDE.md (decisión 47): los textos dicen lo mismo y
  están en `textos.ts`; estos dos están escritos en la pantalla.

### 1.10 E31 (sin subir) no está hecho — Frena el cierre
- **Spec (cambio sin subir):** RF-125 y E31: una consulta por día para que Supabase no pause la base.
- **Código:** no hay nada que corra a ritmo fijo en `microservices/api` (no hay `setInterval`); T012
  está abierta. Si se sube la spec con E31, la funcionalidad no se puede cerrar sin T012.

## 2. Seguridad (sección «Seguridad» del plan)

- **Datos que toca:** se cumple. La copia queda en memoria y en `CARPETA_LISTAS/copia/catalogo.json`
  (`copia.ts:19`), el mismo volumen de las listas.
- **Permisos:** se cumple. `productos.use("/*", exigirSesion)` y `stock.use("/*", exigirSesion)`
  cubren `/pagina`, `/marcas`, `/resumen`, `/descarga` y `/stock/cambios`. Como `GET /productos`,
  cualquier sesión puede bajar todos los costos y proveedores con `/productos/descarga`: es lo mismo
  que antes, no algo nuevo. Falta la prueba de 401 de `/descarga` (1.8).
- **Qué entra desde afuera:** se cumple en lo esencial (`productos/reglas.ts:31-33`, `:49-63`): ids
  con forma de UUID y hasta 300, `limite` hasta 200, `desde` entero, disponibilidad de una lista, la
  búsqueda hasta 8 palabras. Nada va pegado al SQL: el stock va por Kysely con parámetros, la marca
  como `$1::xid8`. Dos detalles — **Defecto**:
  - `marca` acepta hasta 20 dígitos (`deposito/reglas.ts:26`), pero un número de 20 dígitos mayor que
    2^64-1 hace fallar la conversión a `xid8` en `/stock/cambios` con un 500, en vez de ignorarse
    «como hoy». En `/productos/descarga` no pasa (se compara en memoria).
  - El plan no nombra los parámetros de `/productos/descarga` (`marca`, `desde`, `limite` hasta 1000)
    ni los de `/stock/cambios`.
- **El archivo de la copia:** se cumple a medias — **Defecto**. Se descarta si no se puede leer, si
  el formato no es el 2 o si la marca no son dígitos (`copia.ts:97-104`), y si la marca es mayor que
  lo que la base ya alcanzó se lee todo de nuevo (`datos.ts:91`). Pero las filas no se validan una por
  una, y un archivo de otra base con una marca menor (un volumen copiado entre ambientes, una base
  restaurada que ya pasó esa transacción) se usaría tal cual: sus productos quedarían en la copia
  hasta que cambien. «Nunca se toma algo del archivo que la base no dijo» no está garantizado. Se
  podría guardar en el archivo un identificador de la base (`system_identifier` o el nombre del
  ambiente) y compararlo al arrancar.
- **El aviso de la base:** se cumple. `pg_notify('catalogo', '')` sin contenido; `alAviso` no lee el
  contenido y vuelve a leer desde la marca.
- **Secretos:** se cumple; ninguno nuevo.
- **Registro de quién hizo qué:** se cumple; no cambia.

## 3. Carreras y lo que el código hace sin que lo diga una regla

### 3.1 La marca «xmin»: correcta en lo leído — sin hallazgo
Se revisó `enUnaFoto` (`productos/datos.ts:58-70`), los triggers (0026) y `stockQueCambio`: una
transacción en curso al sacar la foto tiene identificador mayor o igual que el «xmin»; una que
escribe después también; `ON CONFLICT … SET transaccion = pg_current_xact_id()` no puede bajar la
marca por debajo del «xmin» de una foto en la que esa transacción no estaba confirmada. La descarga
del dispositivo guarda la marca de la *primera* página (`descarga.ts:49`), así un producto que
cambia o se agrega entre páginas llega la vez siguiente. El arranque escucha *después* de leer y
vuelve a leer al conectarse (`copia.ts:139`), así no se pierde lo que cambió en el medio; el servidor
no atiende hasta que la copia está lista (`index.ts:36`). No se probó contra una base real (1.8).
Efecto conocido: mientras haya una transacción larga abierta en la base (un respaldo, otro servicio),
la marca no avanza y cada puesta al día y cada «Actualizar» vuelven a leer todo lo cambiado desde
entonces. No es un error, pero gasta; no está escrito.

### 3.2 La reconexión de `LISTEN` — Defecto (leído, no ejecutado)
- **Dónde:** `microservices/api/src/productos/copia.ts:122-141`.
- `reconectar` hace `oyente.removeAllListeners()` y después `oyente.end()`: si el cliente de `pg`
  emite otro `error` después de eso, ya no tiene quien lo escuche y Node lo tira como excepción no
  atrapada, que tumba el proceso. No se reprodujo.
- Si `connect()` falla, el cliente `c` nuevo no se cierra (`reconectar` cierra `oyente`, que es el
  anterior o `null`).
- Si la lectura que sigue a la reconexión falla (`alAviso` → `ponerAlDia`), solo se anota en la
  consola; la copia queda atrás hasta el próximo aviso o el próximo cambio hecho por la API (E19).
- Cada reconexión consulta la base: si el «Session pooler» corta conexiones quietas, E20 («una hora
  sin uso, ninguna consulta ni conexión nueva») no se cumple. No se pudo comprobar.

### 3.3 Productos borrados de verdad — Defecto menor
- **Dónde:** `copia.ts:56` y `:193-200`.
- Un producto que la base borra (`DELETE`, por ejemplo a mano) sale de la copia, pero
  `/productos/descarga` solo informa como «quitados» los que siguen con `vigente = false`: un
  dispositivo que ya lo había bajado lo conserva para siempre. Hoy el código no borra productos.

### 3.4 Los precios bajados no se recalculan si cambia la regla del precio — Defecto menor
- **Dónde:** `productos/reglas.ts:27` (el precio se calcula al contestar) y `copia.ts:196`.
- Si una versión nueva cambia el cálculo del precio (`VERSION_DE_PRECIOS`), «Actualizar» no vuelve a
  bajar los productos que no cambiaron en la base: sin conexión se ven con el precio de la regla
  vieja. Se podría devolver la versión del cálculo con la marca y bajar todo si cambió.

### 3.5 Reglas inventadas (sin regla escrita) — Defecto menor
- La puesta al día antes de contestar (T011) vale para las rutas de una lista fija
  (`app.ts:41`: productos, equivalencias, listas, compras, proveedores, sectores, apartados). No
  está `/conteos`, que cambia el sector del producto (`conteos/datos.ts:53`); llega igual con el aviso.
  La lista y el porqué no están en el plan ni en el ADR, solo en `tasks.md` (T011).
- Una búsqueda contestada con lo bajado se vuelve a preguntar al servidor a los 5 segundos
  (`catalogo.ts:109`); una búsqueda ya hecha se reutiliza 60 segundos y se olvida con cada cambio
  guardado (`:27`, `:121`); los clientes se piden como mucho una vez por minuto (`:241-245`);
  mientras el servidor contesta se muestra lo que ya está en memoria con la regla del cliente
  (`:156`). Ninguna está en la spec ni en el plan.
- El filtro de stock lee de la base *todos* los productos con stock en cada página pedida, también
  en cada «cargar más» (`productos/reglas.ts:50`). La spec lo permite (casos límite), pero es una
  lectura de miles de identificadores por página; se podría recordar unos segundos.
- `GET /productos` sin `limite` (versión anterior) devuelve el catálogo entero de una vez, no «de a
  páginas» como dice el caso límite (`reglas.ts:39-44`). No gasta la base.

## 4. Documentación que quedó atrás

### 4.1 El plan contradice la spec aprobada — Frena el cierre
- **Dónde:** `specs/018-descarga-eficiente/plan.md`, «Summary», último punto, y encabezado.
- El plan dice «Configuración (RF-123). Se sacan “Trabajar sin conexión” y “Cómo buscar productos”,
  sus textos y sus preferencias; la cola se guarda siempre», y «Maquetas: no lleva pantallas nuevas».
  La spec (Clarifications, historia 5, decisión 136) y el código dicen lo contrario: Configuración
  queda, la llave va también en la computadora y se suma la fila de descarga con sus maquetas.
- Al plan le falta, además: la descarga a mano (`GET /productos/descarga`, `GET /productos/resumen`,
  `GET /stock/cambios`), la migración que anota la transacción de cada movimiento de stock, la marca
  del dispositivo, la puesta al día antes de contestar (T011) y que el módulo está en `productos/`
  (el plan dice `catalogo/`). Otro agente que lea el plan reconstruiría otra cosa.

### 4.2 Los contratos de la API no tienen las rutas nuevas — Frena el cierre
- **Dónde:** `specs/002-catalogo-y-precios/contracts/api.md:19-20` y
  `specs/005-compras-y-stock/contracts/api.md`.
- No figuran `GET /productos/pagina`, `/productos/marcas`, `/productos/resumen`,
  `/productos/descarga` ni `GET /stock/cambios` (parámetros, topes, respuesta, permisos). `GET
  /productos` sigue diciendo «El cliente lo baja entero y busca en memoria».
- Los modelos de datos (`specs/002-…/data-model.md`, `specs/005-…/data-model.md`) no tienen la tabla
  `cambio_de_producto`, sus triggers ni la columna `transaccion` de `movimiento_stock`.

### 4.3 «Cómo buscar productos» promete lo que ya no hace — Defecto
- **Dónde:** `microservices/web/src/pantallas/Configuracion.tsx:15-18` y `:87-100`.
- Carlos decidió dejarla a la vista (decisión 136; `specs/009-configuracion/spec.md`, RF-85, lo
  anota). Pero la opción de arranque sigue diciendo «Bajar el catálogo al abrir: la búsqueda es
  instantánea … abrir la aplicación tarda unos segundos más y gasta datos cada vez», cosa que ya no
  pasa, y elegir una recarga la aplicación sin cambiar nada. Conviene anotarlo como pregunta abierta
  para Carlos.

## 5. Pantallas (maquetas aprobadas)

- No se sacaron capturas propias. Leyendo el marcado (`Configuracion.tsx:128-151`) y el CSS
  (`configuracion.css`, `.cfg-boton` y `.cfg-barra`) contra `celular-descarga.png` y
  `compu-descarga.png`: la fila, sus tres estados, los textos, el botón de 44 px (principal verde
  «Descargar», secundario con borde «Actualizar», «Descargando…» apagado) y la barra verde coinciden.
  No se encontró una diferencia visible; no está comprobado en pantalla.
- `AvisoError` del Catálogo del celular (`pantallas/celular/Catalogo.tsx:133`): el error de la lista
  (`lista.error`) no se puede cerrar, porque `alCerrar` solo borra el otro error. Defecto menor
  (leído, no ejecutado).
