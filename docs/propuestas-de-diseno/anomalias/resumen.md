# Más → Anomalías: seis maquetas para Carlos

Capturas lado a lado: `comparacion-compu.png` y `comparacion-celu.png`. Cada maqueta se abre
sola desde su `index.html` (usa `../../../_comun/` y `../../iconos-extra.js`, con los íconos
Lucide que faltaban: user-x, inbox, git-merge, lock, scale, mail-open y otros).

Todas tienen los mismos datos, para comparar igual con igual:

- **Para revisar (5).** Ana Gómez (vendedora, desactivada el jue 15/10 a las 18:40, Samsung A15
  del local) dejó 4 cambios: venta en efectivo de $25.000 a las 17:52 (pinza y tornillos),
  venta con Mercado Pago de $43.000 a las 18:21 (látex 4 L y puntas PH2, y las puntas no tienen
  stock), ajuste de clavos de −1,5 kg y margen del martillo de 50 % a 100 %. Julián Pereyra
  dejó un renglón de conteo de una lámpara que después se unió con otra, así que no se puede
  aplicar (E08). Llegó todo hoy a las 09:14.
- **Anotadas (38).** Esta semana hay 9 anomalías en 6 productos: faltaron 14 un. y 0,3 kg, y
  la mecha de 8 mm aparece 3 veces.

## Computadora

| | Idea en una frase | Ideas del catálogo |
|---|---|---|
| **1 · Bandeja y detalle** (evolución) | Las pestañas aprobadas («Para revisar 5» y «Anotadas»), cuatro números arriba y, debajo, la lista agrupada por persona a la izquierda. A la derecha, el detalle del cambio elegido: su línea de tiempo (cobrada, sesión cerrada, llegó), los productos con foto y un panel «Si la aceptás» que dice qué va a pasar antes de decidir. Se maneja con A, D y ↑ ↓. | 1, 2, 3, 4, 5, 6, 7, 8, 9 |
| **2 · Qué hay que contar** (reinvención) | «Anotadas» deja de ser un libro de quejas y pasa a ser una lista de trabajo: las anomalías se agrupan por producto, con las veces (puntos rojos), cuánto faltó y un botón «Contar»; lo ya contado queda tachado en verde. Al lado está el registro de siempre, de lo más nuevo a lo más viejo, con un gráfico de 14 días y el candado de «No se edita ni se borra». | 10, 11, 12, 13, 14, 15, 16 |
| **3 · La tarde de Ana** (audaz) | Rompe el marco: el lateral se pliega, desaparecen las pestañas y quedan los «sobres» de cada persona. Arriba se reconstruye la tarde de Ana en una línea de tiempo (pierde la señal, sus 4 cambios, la desactivan, llega el lunes). Cada cambio muestra el antes y el después y un selector Aceptar, Descartar o Después. El panel derecho suma el impacto (ventas del jueves de $412.000 a $480.000) y una sola tecla confirma todo. | 3, 4, 17, 18, 19, 20, 21, 22 |

## Celular

| | Idea en una frase | Ideas del catálogo |
|---|---|---|
| **1 · Tarjetas que se abren** (evolución) | Los segmentos aprobados y la lista de tarjetas por persona. Se abre una por vez: productos con foto, las dos horas en pastillas, el aviso de anomalía y Descartar o Aceptar bajo el pulgar. | 2, 3, 5, 6, 23 |
| **2 · De a una, deslizando** (reinvención) | Cada cambio es un ticket de papel con el importe en grande. Se desliza a la derecha para aceptar y a la izquierda para descartar (aparece el sello), o se usan los botones redondos de abajo. El avance se ve en rayitas: 2 de 5. | 3, 5, 6, 24, 25, 26, 27 |
| **3 · Sobres y a contar** (audaz) | Sin pestañas: arriba, el sobre de Ana (4 cosas) y el de Julián; abajo, «Faltó stock: 14 un.», con un anillo de lo contado (2 de 6), las fotos de los 4 productos que faltan contar y una acción principal: «Contar estos 4». | 10, 12, 17, 28, 29, 30 |

**Qué rompe la audaz.**
- **Computadora:** saca las pestañas que aprobaste en 014 (decisión 101) y cambia «se decide de
  a uno» (E09) por «se marca cada uno y se confirma junto». Cada cambio sigue teniendo su propia
  decisión, así que nada se acepta sin que alguien lo elija. Además, «Anotadas» pasa a ser un
  botón de la cabecera.
- **Celular:** saca las pestañas, y las anomalías anotadas se convierten en una tarea de conteo.

## Cuál me gusta más

**En la computadora, la 1 con el «Qué hay que contar» de la 2 en la pestaña Anotadas.** La 1
cumple todo lo aprobado y agrega lo que más falta: «Si la aceptás» dice qué va a cambiar
antes de decidir (cuánto baja el stock, si se anota una anomalía, en qué día entra la venta).
Con eso nadie acepta a ciegas. La 2 responde la pregunta que de verdad tiene el dueño al
mirar las anotadas: «¿qué tengo que ir a contar?». Del registro suelto pasa a algo que se hace.

**En el celular, la 2.** Decidir de a uno es lo que pide la regla (E09), y en el celular nada
es más rápido que deslizar una tarjeta: 1 gesto por cambio, contra 2 toques (abrir y aceptar).
El ticket con el total grande se lee de un vistazo. La 3 tiene la mejor idea para las anotadas
(contar ya, con la cámara); valdría como entrada de la pestaña Anotadas.

## Cómo se mueve (una línea por interacción)

- **Aceptar (compu 1, celu 1):** el botón se llena y se dibuja un tilde. El renglón se colapsa
  hacia arriba (200 ms), la insignia «5» de Más rueda a «4» y el detalle pasa al siguiente con
  un fundido corto. Una tostada pino dice «Venta de Ana registrada en el jue 15/10 ·
  Deshacer». En el celular vibra 10-40-10 ms.
- **Descartar:** el renglón se desliza a la izquierda y se apaga (200 ms, curva de salida). La
  tostada dice «Descartada · queda en Quién hizo qué».
- **Deslizar (celu 2):** el ticket sigue al dedo y gira hasta 8°. Al pasar la mitad aparece el
  sello verde ACEPTAR, o el rojo DESCARTAR, y vibra 10 ms. Al soltar, sale volando y la tarjeta
  de abajo sube y se endereza con un rebote corto. Si se suelta antes de la mitad, vuelve a su
  lugar.
- **Ya se decidió (E18):** el detalle se sacude 6 px a los costados una vez y sale el aviso
  ámbar «Lo aceptó Lucía hace 1 min».
- **No se puede aplicar (E08, E19):** el ícono del renglón pasa a rojo y, en vez de Aceptar,
  queda solo Descartar, con la razón en una línea. No vibra, porque no es un error de quien
  revisa.
- **Llega algo nuevo para revisar:** entra arriba de su persona, desde 8 px abajo, con el borde
  ámbar 1 s. La pastilla de Más salta.
- **Contar (compu 2, celu 3):** el renglón contado se tacha de izquierda a derecha (300 ms) y su
  dato pasa de rojo a gris. El anillo, o la barra, avanza.
- **Selector de la audaz (compu 3):** la píldora blanca se desliza entre Aceptar, Descartar y
  Después (200 ms). Las cifras del panel de impacto ruedan.

## Autocrítica (lo que corregí antes de mostrar)

- **Compu 1:** las tres horas en pastillas ocupaban dos renglones y se leían como un párrafo.
  Pasaron a una línea de tiempo de tres puntos (el rojo es la desactivación) y ahora se entiende
  sola. Los nombres de producto se partían en tres líneas: angosté el panel «Si la aceptás».
  Abajo a la izquierda quedaba un hueco; ahora está el aviso «Nada de esto cuenta hasta que lo
  aceptás».
- **Compu 2:** el título, la explicación y los segmentos se partían en dos renglones. Ahora hay
  un título corto y segmentos que no se cortan.
- **Compu 3:** en la línea de tiempo se pisaban dos rótulos, el «$» salía grande y la cuenta de
  stock estaba mal (las puntas no bajan: son 3 productos y no 4). Quedaba vacío abajo de la
  tabla: agregué «los productos que toca, como quedarían», con foto.
- **Celu 1:** la línea de resumen se partía en cuatro pedazos. La dejé en una sola frase.
- **Celu 2:** los rótulos de los botones redondos no estaban alineados y el ticket tenía un
  hueco: agregué «Si la aceptás, entra en las ventas del jueves 15/10».
- **Celu 3:** el título de sección y la explicación se partían, la flecha centraba el texto de
  «Abrir» y los nombres de la grilla se cortaban con «…».
- **Lo más flojo que queda:**
  - El celular 1 muestra solo «Para revisar»: las anotadas en el celular están únicamente en la
    3.
  - En la compu 1, la tarjeta naranja de Aceptar y la ámbar de resumen compiten un poco.
  - En la audaz de la compu hay un único botón para confirmar todo, y eso contradice E09: es una
    propuesta, no algo que la regla ya permita.
  - Las fotos de las puntas y de los tarugos son de grupo y no tienen la misma luz que el resto.

## Catálogo de ideas

Cada idea se puede tomar o descartar sola. La columna «Ahorra» cuenta lo que se ahorra en la
tarea más frecuente: revisar 5 cambios. Hoy serían unos 15 toques en el celular: por cada
cambio, abrir, leer y aceptar o descartar, más confirmar algunos.

| # | Idea | Problema que resuelve | Variantes | Patrón de | Ahorra | ¿Fuera de la spec? |
|---|---|---|---|---|---|---|
| 1 | Cuatro números arriba: esperan decisión, plata en ventas sin registrar, personas, el más viejo | Saber de un vistazo cuánto hay en juego | C1 | Stripe (disputas) | 0 | Sí (no lo pide) |
| 2 | Lista agrupada por persona, con su estado «Desactivada» y su dispositivo | Entender de quién es todo junto | C1, celu 1 | Linear (agrupar) | 0 | No (el orden sigue de lo más viejo a lo más nuevo dentro de la persona) |
| 3 | Panel «Si la aceptás»: qué stock baja, si se anota anomalía, en qué día entra, qué dice el registro | Aceptar a ciegas | C1, C3, celu 1, celu 2 | Stripe (vista previa de reembolso), GitHub (diff) | 1 (no hay que ir a mirar el stock) | Sí |
| 4 | Línea de tiempo «cobrada · sesión cerrada · llegó» | Que se note un reloj mal puesto y cuánto tardó (borde de la spec) | C1, C3 | Apple Wallet (seguimiento de envío) | 0 | No |
| 5 | Productos con foto dentro del cambio | Reconocer la venta sin leer | todas menos C2 | Shopify POS | 0 | No |
| 6 | Aviso ámbar «Sin stock de puntas: se anota 1 anomalía» antes de aceptar | Sorpresa al aceptar | C1, celu 1, celu 2, C3 | Stripe | 0 | No (es RF-59 aplicado) |
| 7 | Teclas A (aceptar), D (descartar), ↑ ↓ (siguiente) | Revisar sin mouse | C1 | Gmail, Linear | 2 por cambio | Sí |
| 8 | Aviso fijo «Nada de esto cuenta hasta que lo aceptás» | Miedo a que ya haya cambiado los números | C1, celu 1 | — | 0 | No (SC-02) |
| 9 | «Ver en Quién hizo qué» en la cabecera | Auditar lo decidido | C1 | — | 2 | Sí |
| 10 | Anotadas agrupadas por producto, ordenadas por cuánto faltó | Ver dónde está el problema, no 38 renglones | C2, celu 3 | Sentry (agrupar errores) | — | Sí (la spec las pide en orden) |
| 11 | Puntos rojos de «veces» en el renglón | Ver lo que se repite | C2 | GitHub (contribuciones) | 0 | Sí |
| 12 | Botón «Contar» en cada producto y «Contar los 4 que faltan» como acción principal | La anomalía no lleva a nada | C2, celu 3 | Linear (convertir en tarea) | 3–4 (ir a Depósito, buscar, abrir el conteo) | Sí |
| 13 | Lo ya contado queda tachado en verde con «Contado ayer» | Saber qué ya se resolvió sin editar la anomalía | C2 | Things (completado) | 0 | Sí |
| 14 | Registro cronológico al costado con candado «No se edita ni se borra» | Que se entienda que es auditoría | C2 | Stripe (eventos) | 0 | No |
| 15 | Gráfico de barras de 14 días | Saber si empeora | C2 | Shopify (análisis) | 0 | Sí |
| 16 | Segmento Por producto / En orden / período | Ver las dos lecturas | C2 | Linear (vistas) | 1 | Sí |
| 17 | «Sobres» por persona en vez de pestañas | Agrupar lo de cada uno como una sola historia | C3, celu 3 | Apple Wallet | 1 | Sí (rompe la decisión 101) |
| 18 | Reconstrucción de la tarde sin conexión en una línea de tiempo | Entender qué pasó antes de juzgar | C3 | Apple Fotos (recuerdos), Strava | 0 | Sí |
| 19 | Antes → después en cada fila (stock, precio) | Ver el efecto sin abrir | C3 | GitHub (diff) | 1 por cambio | Sí |
| 20 | Selector Aceptar / Descartar / Después por fila y un solo «Confirmar 3 decisiones» | Muchas idas y vueltas con varios cambios | C3 | Gmail (selección), revisión de PR | ~3 | **Sí, contradice E09** (cada uno sigue con su decisión) |
| 21 | Panel de impacto total (ventas del día de $412.000 a $480.000) | No saber cuánto mueve aceptar todo | C3 | Stripe (balance) | 0 | Sí |
| 22 | Lateral plegado para dar ancho | Pantalla que necesita lugar | C3 | Linear | 0 | No (ya existe en el marco) |
| 23 | Tarjetas plegadas, se abre una por vez | Pantalla chica | celu 1 | Usuarios (decisión 102) | 0 | No |
| 24 | Un cambio por pantalla como ticket de papel con el importe en 48 px | Leer con apuro | celu 2 | Apple Wallet (pase) | 0 | Sí |
| 25 | Deslizar para aceptar o descartar, con sello | Decidir con el pulgar, con guantes | celu 2 | Tinder, Apple Fotos (limpiar) | 1 por cambio | Sí |
| 26 | Botón «Después» para saltear sin decidir | No trabarse con uno dudoso | celu 2, C3 | Gmail (posponer) | 0 | Sí |
| 27 | Avance en rayitas «2 de 5» | Saber cuánto falta | celu 2 | Instagram (historias) | 0 | Sí |
| 28 | Anillo de lo contado (2 de 6) | Ver el avance de poner el stock al día | celu 3 | Apple Actividad | 0 | Sí |
| 29 | Grilla de fotos con «−6 un.» | Reconocer qué ir a buscar al estante | celu 3 | Shopify POS | 0 | Sí |
| 30 | «Contar estos 4» con la cámara y las estanterías al lado | Ir directo a contar desde la anomalía | celu 3 | — | 4–5 | Sí |
