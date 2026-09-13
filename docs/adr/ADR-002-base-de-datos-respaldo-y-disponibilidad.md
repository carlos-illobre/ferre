# ADR-002: PostgreSQL administrado en Supabase, máquina de Oracle sin estado, volcado horario y prueba de restauración

**Estado:** Aceptado
**Fecha:** 2026-09-13

---

## Contexto

El sistema va a ser la fuente de verdad de ventas, compras y stock: **no se puede perder
un dato.** Si el servidor se cae, no se pueden hacer ventas, así que la disponibilidad
importa. La escalabilidad no: dos personas lo consultan. Hay **una sola máquina** en
Oracle Cloud Always Free; se destinará presupuesto a un servicio pago cuando el sistema
demuestre resultados sobre las ventas.

Un hecho que ordena el problema: por ADR-001 la PWA sigue vendiendo sin servidor, con el
catálogo guardado en el navegador y las ventas encoladas. Una caída del servidor no frena
el mostrador; lo que hace es retrasar la visibilidad del dueño. Entonces la disponibilidad
del servidor se mide en minutos, y lo que no se negocia es el punto de recuperación: cero
ventas perdidas.

## Opciones consideradas

### 1. SQLite con Litestream
Simplísimo y con réplica continua a almacenamiento de objetos. Descartado: un solo
escritor, sin replicación nativa, y el proyecto va a integrarse con otros servicios
(ADR-003) que necesitan una base con herramientas maduras de réplica y respaldo.

### 2. PostgreSQL primario más réplica en caliente en una segunda máquina
Requiere dos máquinas; hay una sola. Queda como camino cuando haya presupuesto.

### 3. PostgreSQL en la propia máquina de Oracle con archivo continuo (pgBackRest)
Fue la primera decisión de este ADR. Punto de recuperación de un minuto, pero deja
**todos los datos en una VM gratuita sin garantía de servicio**, que Oracle puede apagar
por inactividad. La máquina es el único punto de falla y tiene estado adentro.

### 4. PostgreSQL administrado en Supabase, plan gratuito (elegida)
La base sale de la máquina gratuita y pasa a infraestructura administrada. La máquina de
Oracle queda sin estado: si desaparece, el mismo compose se levanta en cualquier otra en
minutos sin perder nada. Condiciones del plan gratuito verificadas el 2026-09-13: 500 MB,
sin respaldos incluidos, pausa tras 7 días sin consultas, sin garantía de servicio.

## Decisión

- **Base de datos:** PostgreSQL en Supabase, región San Pablo, usado **como PostgreSQL
  común por cadena de conexión**. Sin el SDK, sin su autenticación, sin sus otros
  productos: irse es un volcado y una restauración en cualquier otro Postgres.
- **Máquina de Oracle sin estado:** corre la API, el importador y Caddy. Ningún dato vive
  ahí.
- Cuatro capas contra la pérdida de datos:
  1. **Navegador:** cada venta vive en IndexedDB hasta que el servidor confirma que la
     guardó. Las ventas ya confirmadas se conservan **7 días** más (≈1.400 ventas, ≈1,5 MB
     a 200 ventas por día) para poder reconstruir un hueco si hubiera que restaurar un
     volcado viejo.
  2. **Volcado horario** (`pg_dump`) desde la máquina de Oracle a Oracle Object Storage,
     retención 30 días. La base es chica; tarda segundos.
  3. **Copia semanal fuera de Oracle y de Supabase**, cifrada.
  4. **Prueba mensual automática de restauración** en una base limpia, comparando cantidad
     de ventas y total facturado con la base viva. Un respaldo que nunca se restauró no es
     un respaldo.
- **Monitor externo** que consulta la base a diario (evita la pausa por inactividad) y
  avisa al dueño si la API o la base no responden.
- **Tamaño:** alerta al superar 350 MB; los eventos con más de un año se archivan a
  Object Storage.

## Consecuencias

### Positivas
- Recuperación ante pérdida de la máquina: minutos, sin pérdida de datos.
- La base vive en infraestructura administrada, no en una VM gratuita.
- Cambiar de proveedor de base es un volcado y una restauración.

### Negativas
- Punto de recuperación de una hora en vez de un minuto, porque no se puede archivar
  transacciones desde Supabase. Cubierto por los 7 días de ventas en el navegador.
- Dependencia de un plan gratuito que puede cambiar; se mitiga con la portabilidad.
- 500 MB de tope: suficiente para años, pero hay que vigilarlo.

### Lo que no cambia
El mostrador sigue funcionando durante cualquier caída del servidor o de la base.

## Cuándo revisar esta decisión

- Cuando haya presupuesto: comparar plan pago de Supabase, otra base administrada, o
  PostgreSQL propio con réplica (opción 2), por costo.
- Si Supabase cambia las condiciones del plan gratuito.
- Si la prueba mensual de restauración falla dos veces seguidas.
- Si la base supera los 350 MB.

## Referencias

ADR-001, ADR-003. Issues #18, #19.
