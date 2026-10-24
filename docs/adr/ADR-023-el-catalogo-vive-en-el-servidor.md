# ADR-023: El catálogo vive en el servidor; los dispositivos piden de a páginas

**Estado:** Aceptado
**Fecha:** 2026-10-20
**Reemplaza:** la parte de ADR-005 que guarda el catálogo, el stock y los clientes en el
dispositivo, y la enmienda del 2026-10-12 de `specs/009-configuracion/`
**Especificación:** `specs/018-descarga-eficiente/`

---

## Contexto

El 18/10 Supabase avisó que la organización pasó el tope del plan gratuito: 6,45 de 5 GB de
datos que salen de la base y 1,51 de 1 GB de registros. Desde el 18/11 puede restringir la base.

- Cada dispositivo bajaba el catálogo entero (once mil productos con proveedores y costos, unos
  10 MB) cada vez que abría una pantalla con productos y había pasado un minuto, y el servidor
  armaba cada respuesta leyendo la base. Los picos de uso del panel coinciden con los días de
  mucho trabajo.
- El chequeo de salud consultaba la base cada 10 segundos y el pool cerraba las conexiones a los
  10 segundos sin uso: casi cada chequeo abría una conexión, y cada conexión deja registros. Los
  registros eran parejos, unos 105 MB por día, también sin uso.

Carlos decidió (decisión 129): no se descarga nada por adelantado; se busca en el servidor y se
traen solo los resultados, de a páginas; lo que cambia poco se guarda en el servidor; sin
internet se pierde la búsqueda y se conserva registrar ventas.

## Alternativas

1. **Mantener el catálogo en el dispositivo y bajar solo lo que cambió.** Conserva buscar sin
   conexión, pero cada dispositivo sigue guardando costos y márgenes de todo, y el servidor sigue
   leyendo la base para armar las diferencias. Carlos no lo quiere.
2. **Buscar en el servidor leyendo la base en cada búsqueda.** Simple, pero cada búsqueda gasta
   la base, que es lo que se paga.
3. **Buscar en el servidor sobre una copia en memoria que la base mantiene al día (elegida).**
   La base avisa con `pg_notify` desde triggers cuando cambia algo del catálogo; el servidor lee
   solo lo que cambió. La copia se guarda en el disco para no leer todo en cada arranque.
4. **Actualizar la copia desde cada ruta que escribe.** Sin triggers, pero hay que acordarse en
   cada camino (listas, márgenes, duplicados, ingresos, proveedores) y un cambio hecho a mano no
   llega. Más frágil.

## Decisión

- La base lleva la tabla `cambio_de_producto` (producto y transacción que lo cambió); triggers por
  sentencia la mantienen y avisan por `pg_notify`. El servidor escucha con una conexión propia y
  lee desde el «xmin» de la foto de su lectura anterior, así no pierde el cambio de una
  transacción que confirma tarde (con un contador simple se perdería).
- El servidor tiene en memoria los productos (tal como los arma la consulta del catálogo) y
  contesta búsquedas, códigos, identificadores, marcas y páginas desde ahí. El stock
  se lee de la base, solo el de la página.
- La copia se guarda en el volumen de datos con su marca y su versión de formato.
- Los clientes no van en la copia: llevan su deuda, que cambia con cada venta a cuenta corriente.
- La salud del servidor no consulta la base; el pool conserva las conexiones 10 minutos.
- Los dispositivos no bajan el catálogo, el stock ni los clientes solos. Con «Trabajar sin
  conexión» habilitado (en el celular y, desde ahora, también en la computadora), un botón los
  baja a mano; la vez siguiente trae solo lo que cambió desde la marca que dio el servidor (no el
  reloj del dispositivo: un reloj corrido o un cambio que confirma tarde harían perder datos).
  Lo bajado se usa solo sin conexión. El stock lleva la transacción de cada movimiento para eso.

## Consecuencias

- Sin conexión se busca y se escanea solo si se bajaron los datos a mano; la venta en curso se
  cobra y queda en la cola.
- Un solo proceso del servidor por ambiente: si hubiera más, cada uno escucha y se pone al día
  igual.
- Si la conexión de escucha se corta, la copia puede quedar atrás hasta que reconecta; al
  reconectar lee lo que cambió.
- La base de pruebas ya no recibe consultas solas: si nadie la usa 7 días, Supabase la pausa.
  Lo cubre el monitor diario (RNF-12, T091).

## Enmienda (2026-10-24): la salud vuelve a consultar la base

Sin Supabase (ADR-026) no hay plan que cuidar: la salud del servidor vuelve a decir si la base
responde, y el monitor ya no consulta la base desde afuera (no se alcanza desde internet). La
marca de «lo que cambió» lleva el identificador de la base, para que una marca de otra base no
se use.
