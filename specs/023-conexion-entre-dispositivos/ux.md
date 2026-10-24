# Requerimientos de interfaz: Conexión entre dispositivos

Maquetas aprobadas por Carlos el 2026-10-24: la variante A (`maquetas/*-variante-a-*.png` y
`maquetas/*-estados.png`).

## El indicador (historia 3)

- **Quién:** cualquiera con el celular y la computadora emparejados. Sin emparejamiento no hay
  indicador: está «Vincular», como siempre.
- **Qué ve, sin tocar nada:** un puntito de color y el estado en pocas palabras, en el lugar del
  vínculo (donde está «Vincular»), en los dos dispositivos. En la computadora además dice con quién
  («Celular de Carlos»); en el celular, el texto corto.
- **Los estados**, con el mismo color en las dos interfaces:

| Estado | Computadora | Celular | Puntito |
|---|---|---|---|
| La conexión es directa | Directa | Directa | lleno, logro (verde) |
| Va por el servidor | Por el servidor | Por el servidor | lleno, urgente (ámbar) |
| Buscando al otro | Conectando… | Conectando… | hueco, texto-3 (gris) |
| El otro está cerrado | El celular no está abierto | La compu no está abierta | hueco, borde fuerte (gris claro) |
| En pausa («Desconectar») | En pausa | En pausa | hueco, pino |
| Sin internet y sin la directa | Sin conexión | Sin conexión | lleno, error (rojo) |

- **Al tocarlo** (en la computadora también con Enter o espacio, porque es un botón) se abre el
  detalle: en la computadora, encima del botón; en el celular, una hoja desde abajo. Tiene:
  - el título con el puntito: el estado y con quién («Por el servidor con el celular»);
  - Con (el nombre del otro dispositivo), Camino (directa por el wifi, o por el servidor), Demora
    (ida y vuelta del último mensaje, o «—» si todavía no hubo), Desde (cuándo empezó este estado);
  - si va por el servidor, el motivo en un recuadro ámbar: «La red del local no deja conectar
    directo el celular y la computadora» o «Este navegador no permite la conexión directa», con
    la hora en que se probó;
  - «Probar conexión directa» (solo si va por el servidor) y «Cerrar». Escape también cierra.
  - Mientras se prueba, el botón dice «Probando…» y no se puede tocar de nuevo.
- **Textos:** largos en la computadora, cortos en el celular, en `textos` (decisión 47).

## El pedido de foto (historia 4, E24)

- Con el celular emparejado: «Pedida a tu celular»; la foto aparece sola. Sin código QR.
- Sin celular emparejado: no hay código QR; se dice que se puede elegir un archivo o vincular el
  celular desde «Vincular».

## El lector con la computadora cerrada (E32)

- El celular dice «Va a llegar cuando abras la computadora» en lugar de «No llegó».

## Chequeo contra la constitución

- II (cuaderno y calculadora): el estado se ve sin tocar nada; el detalle es para cuando hace falta.
- II (teclado): el indicador es un botón; el detalle se cierra con Escape.
- II (errores en el lugar, en castellano, que dicen qué hacer): el motivo del respaldo y «Probar
  conexión directa» van en el detalle.
- III (celular y computadora): el mismo indicador y los mismos estados en los dos.
- Mostrador: el color fuerte solo en el puntito; ningún fondo de color.
