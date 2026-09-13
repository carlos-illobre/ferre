# ADR-002: PostgreSQL en un solo servidor, con archivo continuo y prueba de restauración

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
Era la propuesta original. Descartada por ahora: solo hay una máquina. Queda como el paso
natural cuando haya presupuesto; el diseño de respaldo de la opción 3 es el mismo y se
reutiliza.

### 3. PostgreSQL en un solo servidor con archivo continuo (elegida)
Un nodo, pero con cuatro capas que cubren la pérdida de datos y una recuperación en
minutos.

### 4. Base de datos gestionada gratuita de terceros
Resuelve respaldo y disponibilidad sin trabajo, pero los planes gratuitos cambian, pausan
bases inactivas y atan a un proveedor que no se eligió por costo. Se reevalúa cuando haya
presupuesto.

## Decisión

PostgreSQL en la máquina de Oracle, en Docker Compose, con estas capas:

1. **Navegador:** cada venta vive en IndexedDB hasta que el servidor confirma que la
   guardó. Si el servidor está caído, la venta espera ahí y se reenvía sola.
2. **Archivo continuo de transacciones** con pgBackRest hacia Oracle Object Storage
   (compatible con S3, 20 GB gratis). Respaldo completo diario, WAL cada pocos minutos,
   retención 30 días. Permite volver a cualquier punto en el tiempo.
3. **Copia semanal fuera de Oracle**, en otro proveedor, cifrada. Cubre la pérdida de la
   cuenta entera.
4. **Prueba mensual automática de restauración:** restaura el último respaldo en una base
   limpia y compara la cantidad de ventas y el total facturado con la base viva. Si no
   coincide, avisa. Un respaldo que nunca se restauró no es un respaldo.

Recuperación ante caída de la máquina: script documentado que levanta el compose en una
máquina nueva y restaura desde Object Storage. Objetivo: menos de 30 minutos, sin
intervención del empleado, que sigue vendiendo en la PWA.

Monitor externo gratuito que avisa al dueño si el servidor no responde, también porque
Oracle puede apagar instancias gratuitas que considera ociosas.

## Consecuencias

### Positivas
- Cero pérdida de datos aunque la máquina desaparezca: lo no archivado está en el
  navegador y se reenvía.
- El mismo esquema de respaldo sirve cuando se agregue una réplica o se migre a un
  servicio pago.

### Negativas
- Sin réplica, una caída del servidor deja al dueño sin visibilidad hasta la
  recuperación, y si el navegador de la laptop pierde sus datos en ese lapso, se pierden
  las ventas de ese lapso. Es el riesgo aceptado hasta tener segunda máquina.
- Oracle Always Free no tiene garantía de servicio.

### Lo que no cambia
El mostrador sigue funcionando durante cualquier caída del servidor.

## Cuándo revisar esta decisión

- Cuando haya presupuesto para una segunda máquina o un servicio pago: pasar a la opción 2
  o a una base gestionada, comparando costo.
- Si la prueba mensual de restauración falla dos veces seguidas.
- Si Oracle apaga la instancia por inactividad.

## Referencias

ADR-001, ADR-003. Issues #18, #19.
