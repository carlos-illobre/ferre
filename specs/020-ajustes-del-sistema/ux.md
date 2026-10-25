# Ajustes del sistema: requerimientos de interfaz

**Maquetas**: Carlos eligió la variante A el 2026-10-24 (decisión 147):
`maquetas/celular-variante-a.png` y `maquetas/compu-variante-a.png`. Sus estados:
`maquetas/*-sistema-guardado.png`, `maquetas/*-sistema-error.png`,
`maquetas/*-sistema-sin-red.png`, y la entrada en Más: `maquetas/*-mas.png`. La variante B
(número y «Guardar para todos») quedó descartada.

## Más → Sistema (historia 3)

**Quién:** quien tiene «Administrar el sistema». Quien no lo tiene no ve la entrada en Más.

**Entrada en Más:** «Sistema», después de Configuración, con su línea: «Lo que vale para todos
los dispositivos: la sesión, el celular emparejado y el vínculo» (en el celular, hasta los dos
puntos).

**A la vista, en este orden**, cada renglón con su nombre, una línea que dice qué se gana y qué
se pierde, y el valor elegido:

1. **Cuánto recuerda la sesión el servidor**: tramos «No», «30 s», «1 min», «5 min», «10 min».
2. **Cada cuánto pregunta el celular emparejado**: tramos «5 s», «30 s», «1 min», «5 min», «10 min».
3. **Cuántos días dura el vínculo**: el número, con − y +, «días» y «de 1 a 365».

Debajo, una nota: vale para todos los dispositivos, llega a los abiertos en menos de un minuto y
cada cambio queda en «Quién hizo qué».

**Cómo se cambia:** tocar un tramo lo guarda en ese momento, sin otro botón. Los días se guardan
medio segundo largo (700 ms) después del último − o + (varios toques seguidos se guardan juntos), y
al terminar de escribir el número (Enter o salir de la caja).

**Lo que exige cada interfaz:**

- Las dos tienen los mismos renglones, los mismos tramos y dicen lo mismo; en la computadora las
  líneas explican más, en el celular van resumidas (decisión 47).
- En la computadora, todo con teclado (las teclas se rehacen en T147, decisión 159): Tab llega a
  cada grupo de tramos, ← → recorren los tramos (es un grupo de opciones) y Enter o espacio elige; − y + y el número también con teclado.
- En el celular, cada tramo y cada botón mide al menos 44 px de alto.

**Estados:**

- **Guardado:** la nota pasa a decir, en verde, qué quedó: «✓ Guardado para todos: la sesión se
  recuerda 5 minutos.»
- **Días fuera de rango:** el número con el color de error de la paleta (el naranja fuerte de «Mostrador», que no tiene un rojo) y «Puede ir de 1 a 365 días. No se guardó: sigue en
  N.»; no se guarda.
- **Sin conexión:** arriba, «Sin conexión: para cambiar los ajustes del sistema hace falta
  internet. Se ve lo último que se guardó.»; los tramos y los días apagados.
- **Rechazo del servidor** (sin el permiso, un valor que no vale): el mensaje del servidor, como
  aviso de error; el valor vuelve al guardado.
- **Cargando:** los renglones con su nombre y su línea; los valores aparecen cuando llegan.

## Chequeo contra los principios de interfaz de la constitución

- Sin manual: cada renglón dice qué cambia y qué cuesta.
- Celular y computadora: las dos, con las mismas reglas y textos.
- Consistencia: los mismos tramos y la misma llave visual que «Buscar versión nueva» en Configuración.
- Teclado en la computadora: todo se elige sin mouse.
- Sin conexión: dice que hace falta internet y no deja cambiar.
