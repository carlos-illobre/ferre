# ADR-005: IndexedDB directo con un wrapper propio, sin Dexie

**Estado:** Aceptado
**Fecha:** 2026-09-13

---

## Contexto

La PWA guarda en el navegador tres cosas: el catálogo con precios (~15.000 productos), las
ventas del día, y la cola de cambios pendientes de enviar al servidor. Cuatro operaciones:
reemplazar el catálogo, buscar, agregar a la cola, vaciar la cola.

## Opciones consideradas

### 1. Dexie
Aporta API con promesas, migraciones de esquema versionadas y consultas reactivas. Las dos
últimas no hacen falta para tres almacenes y cuatro operaciones. Es una dependencia más
que aprender y mantener.

### 2. IndexedDB nativo con un wrapper propio (elegida)
Unas 150 líneas que envuelven las operaciones en promesas. El único riesgo real de la API
nativa, que una transacción se cierra sola si adentro se espera algo que no sea IndexedDB,
se encierra en el wrapper y no se repite en el resto del código.

## Decisión

IndexedDB directo detrás de un módulo propio con interfaz explícita, para poder probarlo
sin navegador con una implementación en memoria.

## Consecuencias

### Positivas
- Cero dependencias para la capa offline; se entiende entera leyendo un archivo.

### Negativas
- Las migraciones de esquema se escriben a mano en el evento de actualización.

### Lo que no cambia
Nada: es la primera decisión sobre esta capa.

## Cuándo revisar esta decisión

- Si la capa offline crece a más de cinco almacenes o necesita consultas reactivas.

## Referencias

ADR-001. Issue #18.
