# ADR-016: La computadora pide las fotos al celular con un código QR

**Estado:** Aceptado
**Fecha:** 2026-10-11

---

## Contexto

La computadora del local no tiene cámara, y hay tres lugares donde hace falta una foto: la
factura o el remito de un ingreso (RF-50), la foto de un producto (RF-09) y la captura de un
ticket (RF-80). La primera solución, en la que la computadora esperaba una foto subida por
el mismo usuario desde su celular, no avisaba nada al celular y Carlos la rechazó: pidió el
mismo mecanismo que se usa para vincular el celular, con un código QR (decisiones 41 y 42).

## Opciones consideradas

1. **Esperar una foto subida por el mismo usuario.** Sin código; el celular no sabe que le
   están pidiendo algo. Descartada por Carlos.
2. **Reusar la vinculación del celular (los puestos).** Sirve para mandar códigos de barras
   durante doce horas; obliga a vincular antes y mezcla dos cosas distintas.
3. **Un pedido de foto por vez, con su propio código QR.** Elegida.

## Decisión

- La computadora crea un **pedido de foto**, que dice para qué es, y muestra un código QR con
  un enlace a la aplicación. El celular lo abre (con la sesión iniciada), saca la foto y la
  manda con el código. La computadora pregunta cada dos segundos y, cuando llega, la retira.
- **El servidor solo pasa la imagen del celular a la computadora.** No la guarda en disco ni
  sabe para qué es: la computadora la recibe como un archivo y sigue el camino de siempre
  (subirla como foto del comprobante, del producto, o sumarla al ticket). Así un solo
  mecanismo sirve para cualquier foto, presente o futura.
- Los pedidos viven **en la memoria del servidor, diez minutos,** como los oyentes de la
  vinculación (un solo proceso, ADR-001). Al retirar la foto el pedido se termina.
- En la computadora siempre queda la opción de elegir un archivo.

## Consecuencias

- Si el servidor se reinicia mientras se espera una foto, hay que pedir el código de nuevo.
- Si algún día hay más de un proceso del servidor, los pedidos tienen que pasar a la base.
- Cualquier usuario con sesión que tenga el código puede mandar la foto; el código es largo,
  al azar y dura diez minutos.

## Enmienda (2026-10-24): la foto se le pide al celular emparejado, sin código QR

Carlos decidió (decisión 152) que la foto se le pide solo al celular emparejado: el pedido y la
foto viajan por la conexión entre los dos (ADR-027), directa o por el servidor, y el servidor no
la guarda ni pregunta nada. Se sacan el pedido con código QR para cualquier celular, sus rutas
(`/pedidos-de-foto`) y las preguntas cada 2 segundos. Sin celular emparejado, en la computadora se
elige un archivo o se vincula el celular (`specs/023-conexion-entre-dispositivos/`, E24).
