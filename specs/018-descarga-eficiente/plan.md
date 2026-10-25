# Plan: Descarga eficiente

**Spec**: [spec.md](spec.md) (aprobada el 2026-10-20, también la historia 5) · **Maquetas**:
`maquetas/celular-descarga.html` y `maquetas/compu-descarga.html` (aprobadas el 2026-10-20) ·
**Decisión técnica**: [ADR-023](../../docs/adr/ADR-023-el-catalogo-vive-en-el-servidor.md), que
precisa [ADR-005](../../docs/adr/ADR-005-indexeddb-directo.md): el dispositivo ya no guarda el
catálogo por su cuenta; solo lo que se baja a mano para trabajar sin conexión.

Reescrito el 2026-10-20 después de la revisión independiente (`revision.md`, 4.1): la primera
versión sacaba «Trabajar sin conexión» de Configuración, y Carlos pidió lo contrario (decisión 136).

## Summary

- **La salud no toca la base (RF-125).** `/health` contesta que el proceso anda, su versión y la
  del cálculo del precio. Las conexiones del pool viven 10 minutos sin uso (antes, 10 segundos) y
  con «keep alive». Una consulta `SELECT 1` por día, con un temporizador que no retiene el proceso,
  evita que Supabase pause la base (E31).
- **La base anota qué cambió (RF-124).** La tabla `cambio_de_producto (producto_id, transaccion)`.
  Triggers por sentencia sobre `producto`, `precio_proveedor` (alta, cambio y baja, con el
  producto viejo y el nuevo) y `proveedor` (cambio de nombre) anotan cada producto tocado con su
  transacción y hacen `pg_notify('catalogo')`, venga el cambio del camino que venga. El aviso no
  lleva contenido.
- **El stock anota su transacción.** `movimiento_stock.transaccion` (la transacción que escribió el
  movimiento, y también la que lo mueve de producto al unir duplicados, con un trigger antes de cada
  cambio). Con eso «Actualizar» trae solo el stock que se movió.
- **La marca.** Cada lectura de cambios se hace en una foto (`REPEATABLE READ`) y su marca es el
  «xmin» de esa foto: la próxima lectura pide `transaccion >= marca`, así un cambio que confirma
  tarde no se pierde. Una marca mayor que el «xmax» de la foto es de otra base: se lee todo.
  Una marca que no es un entero entre 0 y 2⁶⁴−1 se ignora (se lee todo).
- **La copia del servidor (RF-124).** En memoria, cada producto como lo arma la consulta del
  catálogo, más si sigue a la venta, todos sus códigos de proveedor (también de listas viejas) y la
  transacción de su último cambio. Los dados de baja y los unidos quedan en la copia, sin mostrarse,
  para avisarle a la descarga que los quite; los borrados de la base se recuerdan aparte con la
  misma marca.
  - Escucha `catalogo` por una conexión propia. Si esa conexión da error o se corta, se suelta (con
    un oyente de errores vacío, para que un error tardío no tumbe el proceso), se reconecta con
    espera creciente y al volver lee lo que cambió. Si la lectura de un aviso falla, se reintenta a
    los 30 segundos.
  - Se guarda en el volumen de datos con su formato, la base de la que vino (servidor, puerto y
    nombre, sin clave), la marca y las filas. Al arrancar se lee de ahí si el formato y la base
    coinciden y cada fila tiene la forma esperada; si no, se lee entera de la base de a 1.000. El
    servidor no atiende hasta tener la copia.
  - **Antes de contestar un cambio** hecho por la API en las rutas que tocan productos (productos,
    equivalencias, listas, compras, proveedores, sectores, conteos, apartados), la copia se pone al
    día: quien cambió algo lo ve en su respuesta siguiente sin esperar el aviso.
- **Buscar en la copia (RF-122).** La búsqueda (cada palabra es el comienzo de una palabra de la
  descripción o la marca, o el comienzo de un código; hasta 8 palabras; primero las descripciones
  más cortas), el código exacto (el de barras o cualquiera de proveedor), los identificadores, la
  marca, la disponibilidad, «primero los del proveedor» y la página se resuelven en memoria. El
  precio se calcula al contestar. De la base se lee solo el stock de los productos de la página y,
  con el filtro de disponibilidad, qué productos tienen stock.
- **Las rutas** (contratos en las capacidades 002 y 005):
  - `GET /productos/pagina`: `{ productos, stock, hay_mas, total }`, de a 50 (hasta 200).
  - `GET /productos/marcas`, `GET /productos/resumen`.
  - `GET /productos/descarga` y `GET /stock/cambios`: la descarga a mano, con la marca.
  - `GET /productos` sigue, desde la copia, para las aplicaciones de la versión anterior.
  - `GET /stock` lee de la base solo la suma de los movimientos por producto; el costo y el
    proveedor salen de la copia.
- **El cliente pregunta siempre al servidor (RF-122, RF-123).** Guarda en memoria lo que fue
  llegando en la sesión, compartido por las pantallas.
  - Una búsqueda sale cuando se deja de escribir (300 ms). Lo contestado se reutiliza un minuto y
    se olvida con cada cambio guardado (una venta, un ajuste, un margen). Enter espera la respuesta
    de lo escrito, nunca toma la lista de una búsqueda anterior.
  - Mientras el servidor contesta se muestra lo que ya está en memoria con la misma regla y el
    mismo orden que el servidor.
  - Pedidos e Ingreso mandan el proveedor elegido: el servidor pone primero sus productos sobre todo
    lo encontrado, no solo sobre los primeros 50.
  - Las listas sin búsqueda (Catálogo y Productos) piden de a 50 y los siguientes al llegar al
    final («Cargando más…»).
  - Los clientes se piden al abrir Vender, como mucho una vez por minuto.
- **Sin conexión (historia 5).** Solo un error de red (el pedido no llegó) es «sin conexión»; un
  error que contesta el servidor se dice tal cual. Sin conexión:
  - con algo bajado a mano, la búsqueda, el código, los productos puntuales, las marcas, la lista,
    los clientes y el stock de Inventario y Depósito salen de lo bajado, con la regla y el orden
    del servidor; lo contestado así se vuelve a preguntar al servidor a los 5 segundos, por si
    volvió la conexión. El stock de Inventario sale sin su valor (es del dueño y no se baja);
  - sin nada bajado, buscar y escanear dicen que hace falta internet (E10).
- **La descarga a mano (E23 a E30).** En Configuración, con «Trabajar sin conexión» habilitado (en
  la computadora arranca habilitado). «Descargar» baja de a 500 los productos con sus códigos, el
  stock y los clientes, y guarda la marca de la primera página, la del stock, cuándo, cuántos y la
  versión del cálculo del precio. «Actualizar» pide solo lo cambiado desde esas marcas y quita lo
  dado de baja; si cambió la versión del cálculo, baja todo de nuevo. Apagar la llave borra lo
  bajado y lo deja de usar en esa misma sesión. Al abrir, una versión anterior que había guardado
  el catálogo sola, sin descarga a mano, lo pierde (E13).

## Technical Context

- Servidor (`microservices/comercial`): Node, Hono, `pg`. La conexión de producción es el «Session
  pooler» de Supabase, que deja usar `LISTEN`.
- Cliente (`microservices/web`): React; lo bajado vive en IndexedDB (ADR-005).
- Volumen: once mil productos, unos 10 MB en memoria. Buscar en memoria recorre la lista una vez:
  pocos milisegundos.

## Constitution Check

- Principio IV cambia por decisión de Carlos (decisión 129): sin conexión se conserva registrar
  ventas; buscar, solo con lo bajado a mano (decisión 136). Se actualizó la constitución, RNF-10,
  RNF-12 y la capacidad 009 (RF-84 y la nota de RF-85).
- La regla de búsqueda la decide el servidor. Sin conexión el dispositivo la repite sobre lo
  bajado, con el mismo orden, porque el servidor no está; es la única copia de la regla y la
  prueban las dos partes con los mismos casos.

## Seguridad

- **Datos que toca:** los mismos que hoy (productos con sus costos y proveedores, clientes,
  stock). La copia está en la memoria y en el volumen de datos del servidor, que ya guarda las
  listas con los mismos costos; no sale de la máquina. Lo bajado a mano queda en el dispositivo
  solo con la llave habilitada y se borra al apagarla.
- **Permisos:** las rutas nuevas piden sesión, como `GET /productos`. Lo que cada pantalla oculta
  según los permisos no cambia (E07); `/stock` sigue sin valor para quien no ve el dinero
  invertido.
- **Qué entra desde afuera:** la búsqueda (hasta 8 palabras), el código, hasta 300 identificadores
  con forma de UUID, la marca, la disponibilidad (`todos`, `con-stock`, `sin-stock`), `primero`
  (con forma de UUID), `desde` y `limite` (enteros, `limite` hasta 200 en las páginas y 1.000 en
  la descarga, que pide 500) y la marca de la descarga (entero de hasta 2⁶⁴−1). Lo que no cumple se ignora o se
  recorta. Todo va como parámetro a las consultas.
- **El archivo de la copia:** se lee con su formato y la base de la que vino; si no coincide o una
  fila no tiene la forma esperada, se descarta y se lee de la base.
- **El aviso de la base:** `pg_notify` sin contenido; el servidor no confía en lo que diga, solo
  vuelve a leer de la base lo que cambió.
- **Secretos:** ninguno nuevo. El monitor externo (001, T040) usa su propia cadena de conexión,
  con un usuario que solo puede conectarse.
- **Registro de quién hizo qué:** no cambia.

## Project Structure

### Documentation (this feature)

`spec.md`, `plan.md`, `ux.md`, `tasks.md`, `maquetas/`, `checklists/`, `revision.md`.

### Source Code (repository root)

- Servidor: migraciones de cambios, avisos y la transacción del stock; la copia, su búsqueda, su
  puesta al día y su guardado en el tema de productos; rutas de productos y de stock; salud, pool
  y la consulta diaria.
- Cliente: el catálogo compartido, la descarga a mano, el guardado del dispositivo, las listas de
  Catálogo y Productos, Inventario, Pedidos, Ingreso, Configuración y los textos.

## Complexity Tracking

- **Una conexión larga para `LISTEN`.** Es la forma de enterarse sin preguntar a cada rato. Si se
  corta, se reconecta con espera creciente y, al volver, lee lo que cambió.
- **Una transacción larga abierta en la base** (un respaldo, otro servicio) no deja avanzar el
  «xmin»: mientras dure, cada puesta al día y cada «Actualizar» vuelven a leer lo cambiado desde
  entonces. No es un error; gasta un poco más.
- **Pendiente** (en `proyecto/estado.yml`): Inventario y el stock del Depósito piden todos los
  productos con movimientos de a 200 al abrirse, para ordenarlos por nombre; mostrar solo los de la
  página a la vista necesita que el servidor ordene el stock.
