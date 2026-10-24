# Especificación: la aplicación como la v2

**Carpeta**: `021-interfaz-como-v2` · **Creada**: 2026-10-24

**Status**: Aprobada (Carlos, 2026-10-24, decisión 148)

**Maquetas**: Aprobadas (la v2 de cada pantalla, elegida por Carlos el 2026-10-24; decisión 148)

**Pedido de Carlos**: «quiero que modifiques todas las pantallas excepto la del login y las del
tutorial, para que se vean iguales a v2, tienen que tener exactamente el mismo diseño que v2».
La v2 es la variante 1 («la evolución») de cada pantalla en las maquetas del director de arte
(decisión 113). Las maquetas no se borran: después se agregan detalles de la v3 y la v4.

## Clarifications

### Session 2026-10-24 (decisión 148)

- Q: Lo que Carlos ya eligió distinto de la v2 (el cobro deslizable, los medios de pago en pastillas de la v4, el botón de cobrar redondeado, la cuenta corriente en rojo, la unidad al lado de cada cantidad, el calendario de «Otro día», el menú que se achica, el panel y la boleta de Vender en la computadora), ¿se vuelve a la v2? → A: No, se mantiene.
- Q: Lo que la v2 muestra y el sistema no hace (por ejemplo los cuatro números de Usuarios, el punto verde de quien está conectado, «Ganás en esta venta», «38 KB de 150 KB», el precio de estantería antes y después en Listas) → A: Se copia el diseño entero; donde no hay datos, el lugar queda vacío o con «—» hasta que se programe.
- Q: Las pantallas que la v2 no dibujó (Más, Ingreso, Pedidos, Sistema y Vincular) → A: El director de arte las diseña en sus tres versiones, como maquetas; se programan cuando Carlos elija.
- Q: ¿Quedan afuera? → A: La entrada (login) y el manual de uso.

## User Scenarios & Testing

### Historia 1 - Cada pantalla se ve como su v2 (Priority: P1)

Quien usa la aplicación, en el celular o en la computadora, ve cada pantalla con el diseño de su
v2: la misma disposición, las mismas piezas, los mismos colores, letras e íconos, y los mismos
textos donde la pantalla hace lo mismo. Lo que la pantalla hace no cambia.

**Independent Test**: abrir la pantalla en la aplicación y su v2 en el mismo tamaño, y compararlas lado a lado.

**Acceptance Scenarios**:

1. **E01** **Given** cualquier pantalla de la lista de abajo, en el celular o en la computadora, **When** se compara con su v2 en el mismo tamaño, **Then** tiene la misma disposición, las mismas piezas, los mismos colores, la misma letra y los mismos íconos.
2. **E02** **Given** un lugar de la v2 que muestra algo que el sistema todavía no sabe (un número, una marca, una acción nueva), **When** se abre la pantalla, **Then** el lugar está, vacío o con «—», y no muestra un dato inventado ni un botón que no hace nada sin decirlo.
3. **E03** **Given** una de las excepciones elegidas por Carlos (ver Clarifications), **When** se abre la pantalla, **Then** se ve como lo eligió Carlos, no como la v2.
4. **E04** **Given** cualquier pantalla rediseñada, **When** se la usa, **Then** hace lo mismo que antes, con los mismos permisos y las mismas teclas; nada que antes se podía hacer se pierde.
5. **E05** **Given** el celular y la computadora, **When** se comparan, **Then** dicen lo mismo con la misma paleta (decisiones 46 y 47).
6. **E06** **Given** el celular, **When** se recorre cualquier pantalla, **Then** ninguna se desplaza hacia el costado y ningún texto es menor de 14 px.

Las pantallas: Listas de precios, Duplicados, Stock, Compras, Contar, Cómo va el negocio
(Resumen), Usuarios, Quién hizo qué, Anomalías, Procesos, Mejoras y errores y Configuración, y
el marco (menú lateral, pestañas y menú de abajo). Vender, Ventas del día y Productos ya están
como la v2 (decisiones 140, 141 y 145).

### Edge Cases

- Una parte de la v2 que solo tiene sentido con un dato que no existe (por ejemplo, filtrar por «sin usar hace 30 días»): queda visible y apagada, con un «—», hasta que se programe.
- Una v2 que contradice una decisión de Carlos posterior: manda la decisión (E03).
- Una lista de la computadora con el elegido al lado, como la v2 (Stock, Usuarios, Duplicados, Para revisar): siempre hay uno elegido y las flechas lo mueven; ↑ desde el primero no saca el cursor de la búsqueda (decisiones 130 y 133). E04 se cumple con esa marca en lugar de la marca de la fila que se podía quitar.
- Las secciones de Resumen son segmentos, como la v2: ← y → pasan a la otra sección y el teclado sigue en los segmentos.

## Requirements

- Ninguna regla de negocio cambia: es un cambio de interfaz (la regla de cada pantalla sigue en su capacidad).
- Lo que la v2 trae como idea nueva («¿Fuera de la spec? Sí» en el `resumen.md` de cada maqueta) se anota en `proyecto/tasks.md` para especificarlo cuando Carlos lo pida.

## Success Criteria

- **SC-01**: Las capturas de cada pantalla, al lado de su v2, no muestran diferencias de diseño salvo las excepciones de Carlos y los lugares vacíos de E02.
