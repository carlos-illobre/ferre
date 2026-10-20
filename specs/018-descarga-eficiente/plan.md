# Plan: Descarga eficiente

**Spec**: [spec.md](spec.md) (aprobada el 2026-10-20) · **Maquetas**: no lleva pantallas nuevas ·
**Decisión técnica**: [ADR-023](../../docs/adr/ADR-023-el-catalogo-vive-en-el-servidor.md), que
reemplaza la parte de [ADR-005](../../docs/adr/ADR-005-indexeddb-directo.md) que guardaba el
catálogo en el dispositivo.

## Summary

- **La salud no toca la base (RF-125).** `/health` contesta que el proceso anda y su versión. Las
  conexiones del pool viven 10 minutos sin uso en vez de 10 segundos.
- **La base avisa qué cambió (RF-124).** Una migración agrega la tabla
  `cambio_de_producto (producto_id, transaccion)`. Triggers por sentencia sobre `producto`,
  `precio_proveedor` (alta, cambio y baja, con el producto viejo y el nuevo) y `proveedor`
  (cambio de nombre) anotan cada producto tocado, con su transacción, y hacen
  `pg_notify('catalogo')`. Así se entera de todo cambio, venga del camino
  que venga (listas, márgenes, duplicados, ingresos, a mano), sin tocar el código de cada uno.
- **La copia del servidor (RF-124).** Un módulo del servidor (`catalogo/`) tiene en memoria cada
  producto como lo arma hoy la consulta del catálogo, ordenado. Escucha `catalogo` por una
  conexión propia, larga y quieta; al aviso, y al reconectarse, lee solo los productos anotados
  desde su marca (también los dados de baja o unidos, para sacarlos). La marca es el «xmin» de la
  foto de la lectura anterior: un cambio de una transacción que confirma tarde no se pierde.
  Los clientes no van en la copia: llevan su deuda, que cambia con cada venta a cuenta corriente;
  el dispositivo los pide al abrir Vender y Clientes, no en cada pantalla.
  Guarda la copia en el volumen de datos (junto a las listas y las fotos) con su marca; al
  arrancar parte de ahí y lee lo que falte. Sin copia guardada, o con otra versión del formato, la
  lee entera de a 1.000.
- **Buscar en la copia (RF-122).** La búsqueda (las mismas reglas de hoy: cada palabra es el
  comienzo de una palabra de la descripción o la marca, o de un código), el código exacto, los
  identificadores, la marca y la página se resuelven en memoria. El precio se calcula al
  contestar, como hoy. De la base se lee solo el stock de los productos de la página, y, para el
  filtro de disponibilidad, qué productos tienen stock.
- **Una ruta de páginas.** `GET /productos/pagina` devuelve `{ productos, stock, hay_mas }`;
  `GET /productos/marcas`, las marcas. `GET /productos` sigue contestando lo de siempre, desde la
  copia, para las aplicaciones de la versión anterior mientras se actualizan.
- **El cliente busca siempre en el servidor (RF-122, RF-123).** El catálogo de memoria guarda solo
  lo que fue llegando en esta sesión (el camino que ya existía para «Buscar en el servidor»). Las
  listas sin búsqueda (Catálogo y Productos) piden de a 50 y los siguientes al llegar al final, con
  sus filtros. Sin conexión, buscar y escanear lo dicen. El dispositivo no guarda catálogo, stock ni
  clientes: al actualizarse se borran; la cola y la venta en curso quedan.
- **Configuración (RF-123).** Se sacan «Trabajar sin conexión» y «Cómo buscar productos», sus
  textos y sus preferencias; la cola se guarda siempre.

## Technical Context

- Servidor (`microservices/api`): Node, Hono, `pg`. La conexión de producción es el «Session
  pooler» de Supabase, que deja usar `LISTEN`.
- Cliente (`microservices/web`): React; el catálogo compartido está en `src/catalogo.ts`.
- Volumen: once mil productos, unos 10 MB en memoria. Buscar en memoria recorre la lista una vez:
  pocos milisegundos.

## Constitution Check

- Principio IV cambia por decisión de Carlos (decisión 129): se conserva registrar ventas sin
  conexión, no buscar. Se actualiza la constitución, RNF-10, RNF-11 y la capacidad 009 (RF-84 y
  RF-85 quedan reemplazados por RF-123).
- La regla de búsqueda está una sola vez, en el servidor; el cliente ya no busca por su cuenta.

## Seguridad

- **Datos que toca:** los mismos que hoy (productos con sus costos y proveedores, clientes,
  stock). La copia está en la memoria y en el volumen de datos del servidor, que ya guarda las
  listas con los mismos costos; no sale de la máquina.
- **Permisos:** las rutas nuevas piden sesión, como `GET /productos`. Lo que cada pantalla oculta
  según los permisos no cambia (E07).
- **Qué entra desde afuera:** la búsqueda (hasta 8 palabras, como hoy), el código, hasta 300
  identificadores con forma de UUID, la marca, la disponibilidad (`todos`, `con-stock`,
  `sin-stock`), `desde` y `limite` (enteros, `limite` hasta 200). Lo que no cumple se ignora o
  se recorta, como hoy. Los identificadores van como parámetro a la consulta de stock.
- **El archivo de la copia:** se lee con su versión de formato; si no se puede leer o no
  coincide, se descarta y se lee de la base. Nunca se toma algo del archivo que la base no dijo.
- **El aviso de la base:** `pg_notify` sin contenido; el servidor no confía en lo que diga, solo
  vuelve a leer de la base lo que cambió.
- **Secretos:** ninguno nuevo.
- **Registro de quién hizo qué:** no cambia; los cambios siguen auditados donde ya lo estaban.

## Project Structure

### Documentation (this feature)

`spec.md`, `plan.md`, `tasks.md`, `checklists/`.

### Source Code (repository root)

- Servidor: migración de cambios y avisos; la copia en `productos/` (copia, búsqueda, puesta al día,
  guardado); rutas de productos; salud y pool.
- Cliente: el catálogo compartido, las listas de Catálogo y Productos, Configuración, el guardado
  del dispositivo y los textos.

## Complexity Tracking

- **Una conexión larga para `LISTEN`.** Es la forma de enterarse sin preguntar a cada rato. Si
  se corta, se reconecta con espera creciente y, al volver, lee lo que cambió.
