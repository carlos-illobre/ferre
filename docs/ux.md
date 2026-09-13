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

## Concreto

- Letra mínima 16 px en laptop, 18 px en celular. Alto contraste. Los precios, más
  grandes que el resto.
- La pantalla de venta entra entera en la laptop sin desplazarse: búsqueda arriba, líneas
  en el medio, total y cobro abajo.
- Cada línea de venta muestra en una sola fila: producto, costo, selector de margen,
  precio unitario, cantidad, subtotal. Editable en la fila.
- Estado vacío de cada pantalla con una frase que dice qué hacer ("Escribí el nombre del
  producto o escaneá el código").
- Respuesta visible en menos de 100 ms para búsqueda y para cambiar margen. Si algo va a
  tardar más (cargar una lista), barra de progreso con lo que está haciendo.
- Nombres de las cosas como las dice el empleado: "fiado", no "cuenta corriente";
  "lista", no "importación"; "costo", no "precio de compra neto".
- Un solo estilo de botón principal por pantalla; el resto, secundarios.
- Funciona en Chrome y Firefox de la laptop antigua y en el navegador del celular. Se
  prueba en la laptop real antes del piloto.

## Cómo se verifica

- Cronómetro con el empleado: una venta de 3 productos con teclado, menos de 20 segundos.
- Un producto que no está en ninguna lista se vende igual en menos de 2 pasos extra.
- Cortar el wifi en medio de una venta: nada cambia salvo el indicador.
- Preguntarle al empleado al final del día qué molestó. Cada respuesta es un issue `ux`.
