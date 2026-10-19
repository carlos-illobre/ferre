# Entrar: seis maquetas para Carlos

Capturas lado a lado: `comparacion-compu.png` (arriba la entrada, abajo un estado de cada una),
`comparacion-celu.png` (la entrada) y `comparacion-celu-estados.png` (tres estados por variante:
la oferta de la huella, sin permiso y leer el código de la compu). Cada maqueta se abre sola
desde su `index.html` y su `estados.html`. Usan `../../../_comun/` y `../../_recursos/`, que tiene
el QR, el logotipo, la foto del local, el botón de Google y 18 íconos Lucide que le faltaban a `_comun`.
Todas tienen la misma escena: Marta Gómez, vendedora, con un Moto G54 ya vinculado, abre la caja
a las 8:47. La cuenta sin permiso es juanpablo.rios88@gmail.com.

## Computadora

| | La idea en una frase | Ideas del catálogo |
|---|---|---|
| **1 · El mostrador** (evolución) | Lo que pide RF-76, ordenado: una sola caja con el código grande a la izquierda (se cambia solo, con su anillo de tiempo) y a la derecha los dos pasos, Google debajo y quién puede entrar. Sin permiso, el rechazo aparece en el mismo lugar y el código sigue sirviendo. | 1, 2, 3, 4, 5, 6, 7 |
| **2 · ¿Quién atiende?** (reinvención) | La compu ya conoce a quienes vincularon su celular con ella: muestra sus caras, tocás la tuya (o apretás 1–4), te llega un aviso al celular, ponés la huella y la compu entra. El código queda como la tarjeta «Otra persona». | 3, 8, 9, 10, 11, 12, 13 |
| **3 · El cartel del local** (audaz) | Rompe el marco: la compu sin sesión es un cartel para el cliente, con la foto del local, la hora grande y «Abierto hasta las 20», y una tarjeta blanca con el código. Cuando el celular lo lee, el código se transforma en la cara de quien lo leyó: «Marta, poné la huella». | 1, 3, 4, 14, 15, 16 |

## Celular

| | La idea en una frase | Ideas del catálogo |
|---|---|---|
| **1 · El mostrador** (evolución) | La marca arriba y todo lo que se toca abajo, al alcance del pulgar: quién es el dueño del celular, «Entrar con la huella» en naranja, Google y «Entrar en la compu». La oferta de la huella es una hoja que sube una sola vez. | 4, 17, 18, 19, 20, 21, 22 |
| **2 · La huella es la puerta** (reinvención) | En un celular vinculado no hay botones: abre con el lector ya pedido («Hola, Marta. Apoyá el dedo»), y cero toques. En un celular nuevo hay un solo botón, el de Google. La oferta ocupa toda la pantalla y compara «4 toques con Google» con «0 con la huella». Sin permiso, muestra un código para que el Administrador dé el alta. | 17, 20, 23, 24, 25, 26, 27 |
| **3 · Pantalla bloqueada** (audaz) | Rompe el marco: la entrada es como la pantalla bloqueada del teléfono, oscura, con la hora grande. Un aviso dice «La compu del mostrador te espera», con un interruptor para entrar en las dos, y con un dedo entran el celular y la compu sin leer ningún código. Leer y Google son dos botones redondos en las esquinas. | 9, 17, 20, 28, 29, 30, 31 |

**Qué rompen las audaces.** Compu 3: el fondo deja de ser papel y pasa a ser la foto del local,
oscura (el lenguaje la reserva para la cámara). La pantalla mira al cliente y no es solo un
formulario. Celu 3: el fondo es oscuro y no hay tarjetas. Su gesto principal (entrar en los
dos sin leer el código) cambia RF-76: el código deja de ser el único puente.

## Cuál me gusta más

**Computadora: la 1 de base, con la reacción de la 3.** La 1 se lee de un vistazo, deja el código
grande donde el celular lo encuentra y cumple RF-76 al pie de la letra. Le sumaría la idea 14 de la 3:
cuando el celular lee el código, el código se convierte en la cara de quien lo leyó. Hoy la compu
no dice nada hasta que entra, y el que está parado frente a ella no sabe si anduvo. La 2 es la más
rápida (un clic y la huella, sin apuntar) y la llevaría como pregunta abierta: pide notificaciones
y muestra nombres sin sesión.

**Celular: la 2.** Es la que más ahorra en lo que se hace todos los días: un celular vinculado no
pide ni un toque, solo el dedo, como las apps de banco. En un celular nuevo hay un solo botón, el de
Google. La oferta a pantalla completa con «4 toques contra 0» convence sin explicar. Le tomaría
el «Entrar en la compu» de la 1, que en la 2 queda chico.

## Cómo se mueve (una línea por interacción)

- **El código se cambia solo (compu):** el anillo verde se vacía en 5 minutos. Al vencer, el
  código viejo se funde en 200 ms y el nuevo entra desde 8 px abajo, sin parpadeo de la pantalla.
- **El celular leyó el código (compu 1 y 3):** los módulos del QR se apagan desde el centro hacia
  afuera (300 ms) y aparece la cara de quien lo leyó con un anillo naranja que late. En el celular,
  vibra 10 ms.
- **Tocar una cara (compu 2):** la tarjeta sube 4 px y se agranda hasta ocupar el centro (320 ms).
  Las otras se funden. El anillo de «el aviso vence» empieza a correr.
- **Huella leída:** el anillo naranja se cierra sobre el ícono y el tilde se dibuja (300 ms), con
  vibración doble 10-40-10. La compu pasa a Vender con un fundido corto, sin pantalla de «listo».
- **Oferta de la huella (celu 1):** la hoja sube desde abajo (320 ms) y el fondo se oscurece al
  30 %. Al aceptar, el lector del sistema aparece encima. Con «Ahora no», la hoja baja y no vuelve.
- **Abrir la app vinculada (celu 2 y 3):** el lector del sistema se pide solo a los 300 ms. Mientras
  tanto, los dos anillos laten despacio (1,6 s) para decir «apoyá acá».
- **Entrar en los dos (celu 3):** el interruptor se desliza (200 ms). Con la huella, el tilde verde
  crece desde el sensor y las dos pastillas «Este celular» y «Compu · Caja 1» entran una tras otra.
- **Sin permiso:** el rechazo entra en su lugar (no en una ventana encima), con un temblor
  horizontal de 4 px, una sola vez. El botón de Google se queda donde estaba.

## Autocrítica (lo que corregí antes de mostrar)

- Compu 1: el isotipo del centro del QR salía con un pedazo de la «e» del logotipo. Lo recorté.
- Compu 2: «Se cambia en 4:12» se partía en dos renglones y el QR de «Otra persona» era muy chico
  para leerlo de lejos. Agrandé las tarjetas (las caras, de 88 a 112 px) y el QR.
- Compu 2, estado: el aviso del celular dibujado tapaba el sensor. Lo moví.
- Compu 3: el degradé oscuro quedaba debajo de la foto y no se veía, y la foto, nítida, era un
  ruido de colores. La desenfoqué y puse el degradé encima: ahora la hora se lee de lejos.
- Celu 1: los botones quedaban arriba, lejos del pulgar, con un hueco abajo. Bajé la tarjeta y la
  marca quedó sola arriba. El ícono de la huella en la hoja salía de 20 px y lo agrandé.
- Celu 1, código leído: tenía un botón «Entrar acá y en la compu», pero la decisión 65 dice que la
  huella se pide enseguida. Lo cambié por el lector ya abierto.
- Celu 2: «Apoyá el dedo» quedaba pisado por el anillo. Celu 3: el indicador de inicio quedaba en
  la mitad de la pantalla, y la cámara ofrecía «Producto» sin sesión. Los saqué.
- Lo más flojo que queda: la foto del local es de una ferretería de Nueva Orleans (Wikimedia, CC BY-SA
  4.0, «Mary's Ace Hardware, New Orleans, ground floor interior, March 2024 - 3»). Con una foto del
  local de Carlos, la compu 3 cambia de nivel. Las caras son iniciales y no fotos. El QR de muestra
  apunta a una dirección inventada.

## Catálogo de ideas

«Toques» se cuenta sobre la entrada más frecuente: en la compu, a la mañana, con el celular
vinculado. Hoy son: sacar el celular, abrir la cámara, apuntar, tocar el enlace y poner la huella.
En el celular, sobre abrir la app vinculada y entrar.

| # | Idea | Qué problema resuelve | Variantes | De dónde viene el patrón | Ahorra | ¿Fuera de la spec? |
|---|---|---|---|---|---|---|
| 1 | Código grande (288–300 px) con el isotipo al centro y esquinas de visor naranjas | Que el celular lo lea de lejos y al primer intento | C1, C3 | WhatsApp Web | 0 (menos reintentos) | No |
| 2 | Anillo que se vacía con «Se cambia solo en 4:12 · sirve una vez» | Entender por qué un código viejo no anda | C1, C2, C3 | Google Authenticator | — | No (lo aclara) |
| 3 | La compu se nombra («Caja 1 · mostrador») y dice si está en línea | Saber a qué compu se está entrando cuando hay más de una | C1, C2, C3 | Spotify Connect (nombre del aparato) | — | **Sí** |
| 4 | El rechazo de «sin permiso» en el lugar del formulario, con el correo, qué hacer y «Probar con otra cuenta» | Que no quede en un cartel que se cierra y se pierde | C1, celu 1, celu 3 | Stripe (error en línea) | 1 | No |
| 5 | «Copiar el correo» al lado del rechazo | Pasarle al Administrador el correo exacto sin dictarlo | C1 | GitHub (copiar) | — | **Sí** |
| 6 | Tres sellos de confianza abajo (sesión de 90 días, espejo, sin internet una vez adentro) | Que entrar dé confianza y explique qué pasa después | C1 | Stripe Checkout | — | No (ux.md ya tiene sellos) |
| 7 | «¿Primera vez? Mirá cómo se entra» en naranja texto | Llevar al manual sin competir con entrar | C1 | Notion | — | No (decisión del tutorial) |
| 8 | «¿Quién atiende?»: las caras de quienes vincularon su celular a esta compu | Entrar sin apuntar nada: un clic o una tecla | C2 | Netflix (perfiles), Square (empleados) | 3 (sacar el celular, apuntar, tocar el enlace) | **Sí** |
| 9 | Aviso al celular («¿Entrás en la Caja 1?») que pide la huella | Entrar en la compu sin cámara | C2, celu 3 | Google (aviso para iniciar sesión), Microsoft Authenticator | 2–3 | **Sí** |
| 10 | Tecla 1–4 por persona, Enter, Esc «No soy Marta» | Entrar sin mouse | C2 | Linear | 1 | **Sí** |
| 11 | Pastilla «Último en esta caja» | Quien abre siempre la caja ni busca su nombre | C2 | Netflix | — | **Sí** |
| 12 | Pantalla de espera «Mirá tu celular, Marta», con el aviso dibujado, «Mandar de nuevo» y «Mejor leo el código» | Saber qué hacer mientras se espera la huella | C2 | Google (aviso para iniciar sesión) | — | **Sí** |
| 13 | «No fui yo» en el aviso del celular | Que tocar la cara de otro no sirva para nada | C2 | Microsoft Authenticator | — | **Sí** |
| 14 | El código leído se convierte en la cara de quien lo leyó: «Marta, poné la huella» | La compu muestra que anduvo antes de entrar | C3 (y recomendada para C1) | Apple TV (configurar con el iPhone) | 0 (menos dudas) | **Sí** |
| 15 | La compu sin sesión como cartel para el cliente: hora, día y «Abierto hasta las 20» | La pantalla del mostrador sirve aunque nadie haya entrado | C3 | Pantalla bloqueada de iPad, carteles de Square | — | **Sí** |
| 16 | Los tres gestos «Leer → Huella → Listo» en una línea con íconos | Explicar el recorrido sin un párrafo | C3 | Apple Pay | — | No |
| 17 | Mostrar de quién es el celular vinculado (cara y nombre) | Saber que ese celular entra como uno y no como otro | celu 1, 2, 3 | Apps de banco | — | **Sí** (no se pidió) |
| 18 | Todo lo que se toca abajo; la marca sola arriba | Un pulgar, con el celular en una mano | celu 1 | Referencias de Carlos | — | No |
| 19 | «Entrar en la compu» como renglón con su ícono y su flecha (el molde) | Encontrarlo sin leer | celu 1 | Ajustes de iPhone | — | No |
| 20 | La oferta de la huella explica lo que preocupa: «tu huella no sale de este celular» y dónde quitarla | Que la acepten sin miedo | celu 1, 2 | Apple Face ID (configuración) | — | No |
| 21 | Código de la compu leído con la huella pedida al instante, en una hoja sobre la cámara | Decisión 65 sin otro toque | celu 1 | Apple Pay | 1 | No |
| 22 | «Avisarle al Administrador» desde el rechazo (compartir) | Pedir el alta sin buscar a quién | celu 1 | Google Drive (pedir acceso) | 2–3 | **Sí** |
| 23 | Abrir con el lector ya pedido: cero toques en un celular vinculado | Lo más frecuente, sin tocar nada | celu 2, 3 | Mercado Pago, apps de banco | 1 | **Sí** (hoy hay que tocar «Entrar con la huella») |
| 24 | Celular nuevo con un solo botón, el de Google, y un dibujo de celular y compu unidos | Que el primero que la abre no dude | celu 2 | Duolingo (primera pantalla) | — | No |
| 25 | La oferta a pantalla completa con «4 toques con Google · 0 con la huella» | Convencer con un número y no con un texto | celu 2 | Apple (pantallas de bienvenida) | — | No (cambia la forma) |
| 26 | Código para pedir el alta: el Administrador lo lee y te da de alta en un toque | Que el alta no dependa de dictar un correo | celu 2 | Google Drive (pedir acceso), WhatsApp (QR de contacto) | ~5 del Administrador | **Sí** |
| 27 | «Entrar en la compu» y «Otra cuenta» como dos botones iguales y quietos abajo | La salida alternativa sin competir con la huella | celu 2 | Pantalla bloqueada de iPhone | — | No |
| 28 | Entrada con forma de pantalla bloqueada: hora grande, oscura, botones redondos en las esquinas | Que entrar se sienta como desbloquear el teléfono, un gesto que todos saben | celu 3 | Pantalla bloqueada de iOS y Android | — | **Sí** (marco) |
| 29 | «La compu del mostrador te espera», con un interruptor: con un dedo entran las dos, sin leer el código | Entrar en las dos sin apuntar la cámara | celu 3 | Apple Watch (desbloquear la Mac) | 3 | **Sí** (cambia RF-76) |
| 30 | Confirmación con las dos pastillas «Este celular · Compu · Caja 1» | Saber que entraron las dos | celu 3 | AirPods (conectado a los dos) | — | No contradice: no es una pantalla de «listo» y dura 1 s |
| 31 | La cámara que lee el código con una tarjeta «Compu del mostrador · Caja 1 · Apoyá el dedo» | Saber qué leyó antes de poner la huella | celu 3 | Apple Pay, Cámara de iPhone | — | No |

Toques de la entrada frecuente. **Compu** (celular vinculado): hoy son unos 4 gestos (sacar el
celular, abrir la cámara, apuntar, tocar el enlace) más la huella. Compu 1 y 3 son lo mismo, pero
con la compu respondiendo. Compu 2 es **1 clic** en la compu más la huella en el aviso. Celu 3 es
**0**: abrir el celular y la huella ya entran en las dos. **Celular**: hoy, abrir y tocar «Entrar
con la huella» (1). Celu 2 y 3 lo dejan en **0**: abre con el lector ya pedido.

**Preguntas que esto le abre a Carlos** (para el que recorte, no las decide el arte): ¿la compu
sin sesión puede mostrar nombres (compu 2)? ¿Se pueden mandar avisos al celular (compu 2 y celu
3)? ¿Entrar en las dos sin leer el código es aceptable como seguridad, si la compu ya está
emparejada con ese celular (decisión 58)?
