# Vincular el celular con la computadora: seis maquetas para Carlos

Capturas lado a lado: `comparacion-compu.png` y `comparacion-celu.png`. Cada maqueta se abre
sola desde su `index.html` (usa `../../../_comun/` y `../../_recursos/`: el mismo código QR con
el isotipo de la entrada, la foto del local para la cámara, `vincular.css` y 14 íconos Lucide
que faltaban en `iconos-extra.js`). Todas con el lenguaje «Mostrador» y el marco de la v2.

El caso de todas: Carlos Illobre, su «Compu del mostrador» y su Moto G54. La venta en curso es
la misma (mecha HSS × 3, cinta métrica, tarugos S8: 5 un., $46.000), salvo la compu 2 (todavía
sin celular, 2 productos, $39.000) y el celular 2 (le suma una pinza: $60.000).

## Computadora

| | Idea en una frase | Ideas |
|---|---|---|
| **1 · La hoja con el código** (evolución) | «Vincular el celular» del lateral (Alt V) abre una hoja sobre la pantalla en la que estás: el código grande con su cuenta regresiva, tres pasos, qué se comparte y qué no, y «Esperando el celular…» que late hasta que el celular lo lee; ahí la hoja se cierra sola. | 1, 2, 3, 4, 5, 6 |
| **2 · El código en la venta** (reinvención) | No hay que ir a buscar nada: sin celular vinculado, el código está siempre a la vista, chico en el pie del lateral y grande dentro de Vender, en el lugar de «Escanear con el celular». Se vincula en el momento en que se quiere escanear, con cero toques en la compu. | 1, 7, 8, 9 |
| **3 · El gemelo del celular** (audaz) | Ya vinculados, la compu dibuja al celular a la izquierda de la venta: lo que ve su cámara, lo que acaba de leer y cómo ese renglón «vuela» a la venta. Abajo, el estado del vínculo (batería, lecturas de hoy, vence el 23/11) y «Desconectar» (Alt D). | 10, 11, 12, 13, 14 |

**Qué rompe la audaz:** pliega el lateral a 72 px para hacer lugar, y mete un elemento oscuro
(el teléfono con la cámara) en una pantalla calma. La cámara del celular no se espeja hoy
(RF-77: «la cámara no arrastra al otro»): acá se muestra en la compu, sin moverla de pantalla.

## Celular

| | Idea en una frase | Ideas |
|---|---|---|
| **1 · La cámara adentro** (evolución) | «Vincular» del encabezado abre la cámara de Ferrebress a pantalla completa; al leer el código las esquinas se cierran en verde, sube una hoja que dice con qué compu y con qué usuario se une, y avisa qué venta va a aparecer. Sin botón de confirmar. | 15, 16, 17, 6 |
| **2 · Lector siempre listo** (reinvención) | En espejo y con la compu en Vender, el celular abre solo una ventana de cámara arriba de la venta: se apunta y entra, sin tocar «Escanear». Cada lectura sale como tostada dentro del visor y el renglón aparece arriba con borde verde. | 18, 19, 20, 12 |
| **3 · La isla de la venta** (audaz) | La venta en curso vive fuera de Vender (ADR-022), así que el celular la lleva en una «isla» oscura que flota arriba en cualquier pantalla: total, fotos de lo que lleva, lo último que entró y desde dónde, «Desconectar» y «Escanear». Achicada, es una píldora con el total. | 21, 22, 23, 12 |

**Qué rompe la audaz:** reemplaza el botón del vínculo del encabezado (decisiones 70 y 76) por
la isla, y usa pino lleno de fondo en un panel, cosa que el lenguaje reserva para la cámara y
las tostadas.

## La que más me gusta

**Computadora 2 con celular 2.** Juntas convierten vincular en algo que no se hace: el código
está donde se va a escanear, y apenas el celular lo lee queda de lector con la cámara abierta.
Es el uso real (decisión 60: la compu manda, el celular es la cámara) y ahorra los dos o tres
toques de cada escaneo. La hoja de la compu 1 sirve igual para las otras pantallas (Depósito,
Más) y la cámara del celular 1 es el camino de la primera vez.

## Movimiento, por interacción

- **Abrir la hoja (compu 1):** sube 16 px y se funde (320 ms, `--curva`); el fondo se oscurece a 30 %.
- **Esperando el celular:** el punto verde late cada 1,6 s; el anillo de la cuenta regresiva se vacía de a segundo.
- **Código vencido:** el QR se funde y el nuevo entra con un giro corto del anillo (200 ms).
- **El celular lee el código:** las esquinas se cierran sobre el código y se pintan de verde con rebote (200 ms), vibra 10-40-10 ms, y la hoja de abajo sube; en la compu la hoja se cierra sola y el bloque del lateral pasa a verde.
- **Algo escaneado entra (celu 2, compu 3):** la tostada entra desde 8 px abajo en el visor, el renglón aparece arriba con borde verde 1 s; en la compu 3 una pastilla vuela del teléfono a la lista (900 ms) y el total rueda hacia arriba.
- **Isla (celu 3):** se abre desde la píldora con rebote (320 ms); se achica deslizando hacia arriba; cada producto nuevo se suma a la pila de fotos con un salto chico.
- **Desconectar:** las dos flechas se separan 4 px y el verde se apaga a gris en los dos dispositivos (200 ms).

## Autocrítica (lo que se corrigió antes de mostrar)

- Compu 1: el pie de la hoja quedaba cortado y la cuenta regresiva partía en tres renglones; la hoja creció a 580 px y el texto no se parte. El bloque del lateral decía demasiado: quedó «Vincular el celular · Alt V».
- Compu 2: los botones de abajo del cobro se salían del panel; el panel quedaba vacío y ahora explica qué pasa después de vincular.
- Compu 3: la tarjeta del celular partía nombre y datos en dos líneas, y la pastilla que vuela tapaba otro renglón; se ajustaron anchos y el vuelo termina sobre el renglón nuevo. «Cta. cte.» no se parte.
- Celu 2 y 3: nombres largos partidos en tres líneas; se acortaron y «Agregar» pasó a ser solo «+».
- Lo más flojo que queda: el monitor dibujado de la cámara (celu 1) se ve plano; una foto real de una compu con el código sería mejor.

## Lo que contradice una decisión

- **Celu 3** saca el botón del vínculo del encabezado (decisiones 70, 73 y 76) y lo cambia por la isla.
- **Compu 3** muestra la cámara del celular en la compu: RF-77 dice que lo que se abre encima, como la cámara, no se espeja (acá no se espeja la pantalla, se muestra al costado).
- **Celu 2** abre la cámara sola al quedar en espejo en Vender: la decisión 59 dice que el lector es un modo aparte que pide la compu («Escanear con el celular»).
- **Compu 2** no tiene una pantalla para vincular: el código vive en el lateral y en Vender (la especificación dice que el menú ofrece «Vincular el celular»; acá lo ofrece ya con el código).

## Catálogo de ideas

1. **El código con su cuenta regresiva a la vista.** Anillo que se vacía y «Se cambia solo en 4:12 · sirve una vez». Resuelve leer un código vencido sin entender por qué falla. Compu 1 y 2. Patrón: WhatsApp Web. Ahorra un intento fallido. Dentro de la especificación (5 min, un uso).
2. **«Esperando el celular…» que late.** Dice que la compu está atenta y que no hay que tocar nada. Compu 1 y 2. Patrón: Apple TV al emparejar. Dentro.
3. **Tres pasos numerados que nombran el botón del celular.** «Tocá Vincular arriba a la derecha». Compu 1. Patrón: Stripe Terminal. Dentro (decisión 63).
4. **Qué se comparte y qué no, en pastillas.** La venta, el ingreso y el pedido sí; la búsqueda y lo que abras encima no. Evita la sorpresa del primer día. Compu 1. Patrón: permisos de iOS. Dentro (RF-77).
5. **«Otro código» con Alt N.** Pedir uno nuevo sin esperar. Compu 1. Fuera de la especificación (hoy se renueva solo).
6. **Avisar qué venta va a aparecer.** «5 productos, $46.000». Quien vincula sabe que no pierde lo armado. Compu 1, celu 1. Patrón: Handoff de Apple. Dentro (decisión 71).
7. **El código siempre en el pie del lateral, sin abrir nada.** Vincular con cero toques en la compu. Compu 2. Patrón: Discord / Spotify Connect. Ahorra 1 toque. Fuera.
8. **El código dentro de Vender, donde se va a escanear.** En lugar de «Escanear con el celular» mientras no hay celular. Compu 2. Patrón: Square (sumar un lector desde el cobro). Ahorra 2 toques. Fuera.
9. **«Ahora no» (Esc) que esconde la tarjeta del código** hasta la próxima venta. Compu 2. Fuera.
10. **El gemelo del celular en la compu.** Ver lo que apunta la cámara sin mirar el teléfono. Compu 3. Patrón: Continuity Camera de Apple. Fuera.
11. **El renglón que vuela del celular a la venta.** Dice de dónde vino cada cosa. Compu 3. Patrón: AirDrop. Fuera.
12. **«Del celular» en el renglón nuevo, con borde verde.** Compu 3, celu 2 y 3. Dentro (ya existe «Llegó del celular»).
13. **El estado del vínculo con datos: batería, lecturas de hoy, vence el 23/11.** Saber si el celular aguanta la tarde y cuándo hay que renovar. Compu 3. Patrón: AirPods en iOS. Fuera (la fecha está en la especificación; batería y lecturas no).
14. **Historial chico de quién agregó qué y desde dónde** al pie del cobro. Compu 3. Patrón: Linear (actividad). Fuera.
15. **Cámara a pantalla completa con × y linterna.** Celu 1. Dentro (decisión 63).
16. **Esquinas que se cierran en verde al leer** y una pastilla «Código de la compu leído». Celu 1. Patrón: Apple Wallet. Dentro.
17. **Hoja que dice con qué compu y con qué usuario.** Tranquiliza que se une a la compu correcta. Celu 1. Dentro (solo mismo usuario).
18. **La cámara se abre sola en espejo con la compu en Vender.** Cero toques para escanear. Celu 2. Patrón: lectores de Shopify POS. Ahorra 1 toque por producto. Fuera (y contra la decisión 59).
19. **La tostada de lo escaneado dentro del visor**, sin tapar la lista. Celu 2. Dentro.
20. **«La venta de la compu» como título de la lista** en lugar de «Esta venta». Deja claro que es una sola. Celu 2. Dentro.
21. **La isla de la venta en cualquier pantalla.** El total y lo que lleva siempre a mano, en Catálogo o Depósito. Celu 3. Patrón: Live Activities / Dynamic Island. Fuera (se apoya en ADR-022).
22. **La pila de fotos con el número.** Qué lleva sin abrir Vender. Celu 3. Patrón: Apple Pay / Uber Eats. Fuera.
23. **«Lo último que entró, desde dónde y hace cuánto».** Celu 3. Fuera.

## Para quien la integre

- El navegador de versiones (`v2/index.html`, `v3`, `v4`) no tiene «vincular» en su lista de
  nombres (`NOMBRES`, `DE_HOY`): hay que sumarla para que aparezca en el selector. Tampoco
  `_comun/navegar.js` la nombra; las maquetas usan `data-ir` y no lo necesitan para salir.
- Herramientas: `herramientas/capturar.py` (captura de cada variante, avisa textos chicos y
  desbordes) y `herramientas/comparar.py` (las comparaciones).
