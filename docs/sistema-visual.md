# Sistema visual

Cómo se ve Ferrebress. La decisión de tener dos interfaces está en
[ADR-014](adr/ADR-014-dos-interfaces-celular-y-escritorio.md); lo que Carlos pidió de cada
pantalla, en [specs/001-base-del-sistema/ux.md](../specs/001-base-del-sistema/ux.md).

## Dos interfaces

Hay dos juegos de pantallas sobre la misma aplicación, con la misma paleta y la misma marca:

- **Celular** (ventanas de menos de 900 px): una cosa por vez, con tarjetas y hojas que suben
  desde abajo; el menú, abajo, con cuatro partes.
- **Computadora** (900 px o más): menú a la izquierda, pestañas arriba, tablas a todo el
  ancho y todo con el teclado.

Lo que comparten: la paleta, la marca, las palabras del mostrador y que todo número se explica.
Toda función nueva con pantalla se hace en las dos.

## Paleta

- **Un solo color de acción: coral.** Todo lo demás es tinta (`#0e1220`) y niebla
  (`#f3f4f7`).
- Lo que falta (sin margen, sin cliente) se marca con coral tenue.

## Tipografía

- **Los importes van en tipografía condensada (Archivo Narrow)**, más grandes que el resto:
  se leen de lejos.
- En pantalla los importes van sin centavos (`$3.000`); en explicaciones y detalles, con
  centavos.
- Letra mínima 16 px en laptop, 18 px en celular. Alto contraste.

## Componentes

Las piezas son **una sola para el celular y la computadora** (decisión 85): botón, hoja,
aviso, aviso flotante y visor de la cámara se ven igual en las dos interfaces y se acomodan
al ancho. Lo que sigue describe para qué se usa cada una.

- **Botones:** blanco con borde el común; **naranja el de la acción principal** (uno por
  pantalla); verde oscuro el de una acción que ordena; borde rojo el de una acción que no se
  deshace (anular, descartar). Chicos para acciones de un renglón; anchos y grandes para
  cobrar o registrar, con el importe adentro en el celular.
- **Avisos en el lugar** con ícono y borde: error (rojo), alerta (naranja), información
  (verde claro) y listo (verde); llevan su acción a la derecha cuando hay una («Reintentar»,
  «Cerrar»). El aviso flotante oscuro confirma lo que salió bien.
- **Visor de la cámara:** a pantalla completa, guía naranja y abajo un panel verde oscuro con
  lo último leído, el código a mano y «Cerrar».

- **Tarjetas** blancas redondeadas sobre fondo niebla. Cada fila de una lista es nombre +
  detalle a la izquierda e importe a la derecha.
- **Hojas que suben desde abajo** (en la computadora, una ventana centrada) para lo que se
  abre sobre lo que se está haciendo: explicación de un número, ficha del producto, elegir
  cliente o proveedor, revisar una lista. Tienen cabecera con el título y la cruz para
  cerrar; Escape, tocar afuera o el botón de volver del celular también cierran.
- **Pantalla de éxito a pantalla completa** al cobrar o registrar un ingreso: el importe
  grande, cómo pagó y un solo botón para seguir.
- Los avisos se van solos al corregir la causa.
- **Barra de progreso** con lo que está haciendo, para lo que va a tardar (cargar una lista).

## Lo que no es nuestro

- **El botón de Google** es el original, azul y con puntas redondeadas, tal como lo dibuja
  Google: sin estilos propios, sin nada encima y sin copiarlo con un botón nuestro
  (decisión 69). Es el único elemento fuera de la paleta, a propósito.

## Reglas del celular

Salen del diseño de referencia.

- **Cuatro pestañas, todo el negocio,** abajo: Vender · Catálogo (productos, listas,
  duplicados) · Depósito (stock, ingreso, contar) · Negocio (hoy, gastos, usuarios, sesiones,
  quién hizo qué).
- Tarjetas; nada de tablas anchas.
- Hojas, pantalla de éxito y avisos como se describen en «Componentes».
- La cámara está a un toque al lado de cada buscador.
- Cada renglón de venta es una tarjeta: producto y subtotal arriba, cantidad (− +), unidad y
  margen abajo; el margen se despliega en el mismo renglón con los cinco botones y el precio
  a mano.

## Movimiento en el celular

Se parece a una aplicación de iPhone (decisión 78). Una sola curva para todo lo que se desliza:
`cubic-bezier(0.32, 0.72, 0, 1)`.

| Qué pasa | Cómo se mueve | Cuánto dura |
|---|---|---|
| Entrar a una pantalla desde una lista (Más → una de sus pantallas) | La nueva entra desde la derecha; la anterior se corre un 30 % a la izquierda y baja a 60 % de opacidad | 350 ms |
| Volver | Al revés: la que se va sale por la derecha y la anterior vuelve desde la izquierda | 350 ms |
| Cambiar de parte (menú de abajo) o de pestaña dentro de una parte | Fundido | 180 ms |
| Abrir una hoja | Sube desde abajo, con la misma curva | 350 ms |

**Solo animaciones de CSS, y solo de posición y opacidad** (`transform` y `opacity`), que el
navegador mueve fuera del hilo principal: ninguna animación se calcula cuadro a cuadro con
código. El código solo avisa que empieza el cambio de pantalla. Pedido de Carlos del 2026-10-13.

El menú de abajo no se mueve mientras cambia la pantalla. Con «reducir movimiento» pedido en el
teléfono no hay animaciones. Se hacen con las transiciones de vista del navegador, sin
librerías; donde no existen, la pantalla cambia sin animar. La computadora no anima la navegación.

## Reglas de la computadora

- Mandan las tablas: nada de las reglas de layout del celular aplica.
- Menú completo arriba.
- La barra de arriba entra entera en la notebook: la leyenda de pruebas se acorta a «Prueba»
  y el estado de conexión es un punto verde mientras todo está sincronizado; sin conexión se
  lee completo.
- Cada renglón de venta es una fila de la tabla y el cobro queda fijo abajo.

## Concreto

- Letra mínima 16 px en laptop, 18 px en celular. Alto contraste. Los precios, más grandes
  que el resto.
- La pantalla de venta entra entera en la laptop sin desplazarse: búsqueda arriba, líneas en
  el medio, total y cobro abajo.
- Cada renglón de venta es una tarjeta: producto y subtotal arriba, cantidad (− +), unidad y
  margen abajo; el margen se despliega en el mismo renglón con los cinco botones y el precio
  a mano. En la computadora, cada renglón es una fila de la tabla y el cobro queda fijo abajo.
- Estado vacío de cada pantalla con una frase que dice qué hacer («Escribí el nombre del
  producto o escaneá el código»).
- Respuesta visible en menos de 100 ms para búsqueda y para cambiar margen. Si algo va a
  tardar más (cargar una lista), barra de progreso con lo que está haciendo.
- Nombres autodocumentados y fáciles de entender: «cuenta corriente» (no «fiado»), «lista»,
  no «importación»; «costo», no «precio de compra neto». Se abrevia «cc.» solo donde el
  espacio no alcanza, por ejemplo en una columna angosta.
- Un solo estilo de botón principal por pantalla; el resto, secundarios.
- Funciona en Chrome y Firefox de la laptop antigua y en el navegador del celular. Se prueba
  en la laptop real antes del piloto.
