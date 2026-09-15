# Guía de interfaz

Reglas verificables para cada pantalla. Se usan como checklist en todo issue con etiqueta
`ux`. La vara es el cuaderno y la calculadora (`docs/proceso-actual.md`): si una pantalla
es más lenta que eso, está mal, aunque sea más completa.

## Principios

1. **Curva de aprendizaje cero.** El empleado tiene que poder vender el primer día sin
   manual. Cada pantalla se explica sola con lo que muestra.
2. **El orden de la pantalla es el orden del mostrador.** Buscar → costo, margen y precio
   → cantidad → cobro. Nunca el orden de un sistema de facturación.
3. **Nada obligatorio que el cuaderno no tenga hoy.** Fecha, producto, cantidad, precio.
   Todo lo demás (cliente, medio de pago, motivo) es opcional y se puede saltear con
   Enter.
4. **Teclado primero.** Todo se opera sin mouse. Enter avanza y confirma; Esc cancela y
   vuelve; flechas eligen; teclas 1 a 5 eligen margen. El mouse y el táctil funcionan,
   pero nunca son la única forma.
5. **Una caja de búsqueda grande, siempre visible, con foco automático.** Al abrir la
   pantalla de venta, ya se puede escribir.
6. **Sin ventanas de confirmación**, salvo para borrar algo que no se pueda recuperar.
   Equivocarse se corrige editando, no confirmando antes.
7. **Todo número calculado se puede tocar y explica de dónde sale** (issue #47), en
   castellano y con los números de origen.
8. **Los errores se muestran en el lugar, en castellano, y dicen qué hacer.** Nunca un
   código, nunca un mensaje en inglés, nunca una pantalla en blanco.
9. **Sin internet no se nota.** Buscar y vender funcionan igual; un indicador discreto
   dice "sin conexión, N cambios pendientes". Nunca un error bloqueante por red.
10. **Máximo tres pantallas en el MVP:** vender, buscar (que es la misma), cargar lista.
    Ingreso de mercadería y conteo se suman con su mismo estilo.

## Sistema visual (rediseño 2026-09-14)

El diseño de referencia es `mockups/Ferre iOS.html` (Claude Design). Reglas que salen de ahí
y valen igual en el celular y en la computadora:

- **Cuatro pestañas, todo el negocio:** Vender · Catálogo (productos, listas, duplicados) ·
  Depósito (stock, ingreso, contar) · Negocio (hoy, gastos, usuarios, sesiones, quién hizo
  qué). En el celular van abajo; en la computadora arriba.
- **Un solo color de acción (coral).** Todo lo demás es tinta (`#0e1220`) y niebla
  (`#f3f4f7`). Lo que falta (sin margen, sin cliente) se marca con coral tenue.
- **Los importes van en tipografía condensada (Archivo Narrow)**, más grandes que el resto:
  se leen de lejos. En pantalla van sin centavos (`$3.000`); en explicaciones y detalles, con
  centavos.
- **Tarjetas blancas redondeadas sobre fondo niebla**; nada de tablas anchas. Cada fila de una
  lista es nombre + detalle a la izquierda e importe a la derecha.
- **Hojas que suben desde abajo** (ventana centrada en la computadora) para lo que se abre
  sobre lo que se está haciendo: explicación de un número, ficha del producto, elegir
  cliente o proveedor, revisar una lista. Escape o tocar afuera cierra.
- **Pantalla de éxito a pantalla completa** al cobrar o registrar un ingreso: el importe
  grande, cómo pagó y un solo botón para seguir.
- **Avisos en el lugar:** un toast oscuro para lo que salió bien, un aviso coral para lo que
  falta; se van solos al corregir la causa.
- La cámara está a un toque al lado de cada buscador, en el celular.
- **En la computadora se usa toda la pantalla** (sin ancho máximo, 32 px de margen): las
  pantallas se reparten en dos columnas (Negocio, Listas) o en panel lateral fijo + contenido
  (Stock con la valorización, Ingreso con el comprobante, Contar con la búsqueda); las
  sugerencias de duplicados y los sectores van en cuadrícula. Cuando una lista mide más de
  640 px, cada fila va en una sola línea (nombre · detalle · importe) para que entren más
  filas; en columnas angostas y en las hojas siguen apiladas. El celular no cambia.

## Concreto

- Letra mínima 16 px en laptop, 18 px en celular. Alto contraste. Los precios, más
  grandes que el resto.
- La pantalla de venta entra entera en la laptop sin desplazarse: búsqueda arriba, líneas
  en el medio, total y cobro abajo.
- Cada renglón de venta es una tarjeta: producto y subtotal arriba, cantidad (− +),
  unidad y margen abajo; el margen se despliega en el mismo renglón con los cinco botones
  y el precio a mano. En la computadora, la venta y el panel de cobro van lado a lado.
- Estado vacío de cada pantalla con una frase que dice qué hacer ("Escribí el nombre del
  producto o escaneá el código").
- Respuesta visible en menos de 100 ms para búsqueda y para cambiar margen. Si algo va a
  tardar más (cargar una lista), barra de progreso con lo que está haciendo.
- Nombres autodocumentados y fáciles de entender: "cuenta corriente" (no "fiado"),
  "lista", no "importación"; "costo", no "precio de compra neto". Se abrevia "cc." solo
  donde el espacio no alcanza, por ejemplo en una columna angosta.
- Un solo estilo de botón principal por pantalla; el resto, secundarios.
- Funciona en Chrome y Firefox de la laptop antigua y en el navegador del celular. Se
  prueba en la laptop real antes del piloto.

## Cómo se verifica

- Cronómetro con el empleado: una venta de 3 productos con teclado, menos de 20 segundos.
- Un producto que no está en ninguna lista se vende igual en menos de 2 pasos extra.
- Cortar el wifi en medio de una venta: nada cambia salvo el indicador.
- Preguntarle al empleado al final del día qué molestó. Cada respuesta es un issue `ux`.
