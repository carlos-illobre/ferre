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

## Enmienda del 2026-10-12: el catálogo se carga una vez y de a partes

Con el catálogo de pruebas en once mil productos, abrir cualquier pantalla con productos en
el celular tardaba segundos: cada pantalla leía el catálogo entero del dispositivo, armaba el
índice de búsqueda y lo volvía a bajar del servidor. Carlos pidió que se vieran enseguida los
primeros y el resto se cargara de fondo.

- El catálogo, el stock y los clientes viven en un solo lugar en memoria, compartido por
  todas las pantallas. Se cargan una vez por sesión de la aplicación.
- Al abrir: primero los 60 primeros productos, que se guardan aparte para leerlos de una;
  después el catálogo entero del dispositivo; después el del servidor. Las dos últimas no
  frenan la pantalla.
- Si el servidor trae lo mismo, la pantalla no se vuelve a dibujar; si trae cambios, en el
  dispositivo se guarda solo lo que cambió.
- El índice de búsqueda se arma la primera vez que se busca, no al cargar.
- El catálogo se vuelve a pedir al abrir una pantalla si pasó un minuto, o enseguida si algo
  lo cambió en el servidor (unir duplicados, aplicar una lista, un ingreso). El stock y los
  clientes, que son livianos, se piden en cada pantalla.
- Mientras solo están los primeros (un instante), una búsqueda mira solo esos.
