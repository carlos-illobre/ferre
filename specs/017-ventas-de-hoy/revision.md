# Revisión: Ventas de hoy renovada (017)

**Revisor:** subagente `revisor`, 2026-10-17. **Base:** `spec.md` (E01 a E21, RF-117 a RF-121),
`plan.md` (sección «Seguridad»), `ux.md`, las maquetas aprobadas (variante C:
`celular-hoy-c.html`/`.png`, `celular-hoy-c-entera.png`, `compu-hoy.html`/`.png`), `tasks.md`, las
decisiones 108 y 109 (`docs/decisiones-de-negocio.md`, `docs/sistema-visual.md`,
`specs/001-base-del-sistema/ux.md`); commits `dad891f` (T003), `27736b7` (T004) y `2faf289` (T005 a T007).

**Qué se comprobó de verdad:** se leyeron el código y las pruebas. Se corrieron las unitarias de
`microservices/web` (73 archivos, 499 pruebas, todas pasan) y `node tests/trazabilidad.mjs` («la
especificación y el estado coinciden»; solo los avisos de RNF de siempre). Para ver qué regla de
estilos gana se construyó el cliente (`vite build`) en una carpeta temporal fuera del repositorio
y se leyeron los CSS resultantes.
**Qué no se comprobó:** las e2e (no se corrieron; las corre el agente principal) ni las pantallas
con capturas propias: lo visual se compara leyendo el CSS y el marcado contra las imágenes de las
maquetas. Los hallazgos marcados «leído, no ejecutado» salen de leer el código y no se
reprodujeron con una prueba.

Gravedad: **Frena el cierre** (hay que arreglarlo o que Carlos lo acepte antes de cerrar T008) o
**Defecto** (se puede anotar en `proyecto/estado.yml` y seguir).

---

## 1. Escenarios sin cumplir o con prueba que no los comprueba

### 1.1 E06: en «Cómo va el negocio» de la computadora los cuatro medios salen del mismo color — Frena el cierre
- **Dónde:** `compu/base/pantallas/Resumen.tsx:69` (`<IconoDeMedio … conFondo className="resumen-medio-icono" />`)
  y `compu/base/estilos/negocio.css:38`.
- **Spec:** E06 y RF-118: el color de cada medio es el mismo en toda la aplicación (decisión 108);
  `ux.md` nombra «Cómo va el negocio».
- **Código:** al ícono compartido se le puso la clase vieja `resumen-medio-icono`, que sigue
  diciendo `color: var(--azul); background: var(--azul-suave)`. El fondo lo gana
  `.medio-icono.con-fondo` (más específico), pero el color empata en especificidad con
  `.medio-icono { color: var(--medio) }` y, en el CSS construido, `negocio.css` queda en el
  paquete de la computadora (`App-*.css`) y `medios.css` en un paquete compartido que se carga
  antes: gana `--azul`. Los cuatro íconos van del mismo color (el `--azul` de la computadora, que
  además se redefine en otro lado como `var(--p-verde-texto)`, o sea el verde del efectivo) sobre
  el fondo suave de cada medio. Comprobado en el CSS construido; no visto en pantalla.
- **Prueba:** ninguna. Las de E06 (`IconoDeMedio.test.tsx`, `celular/Vender.test.tsx:126`,
  `compu/Vender.test.tsx:83`) solo miran que el elemento tenga la clase `medio-<medio>`, no el color
  que termina teniendo; «Cómo va el negocio» y «Anular» no tienen prueba de E06.

### 1.2 E06: Mercado Pago en el cobro del celular, con el celeste viejo — Defecto
- **Dónde:** CSS del celular, regla `.cobro .medios .isotipo-mp { color: #0091c4 }` (anterior a
  017, sigue en los estilos de Vender del celular; aparece en el CSS construido).
- **Código:** con más especificidad que `.medio-icono`, pinta el isotipo de Mercado Pago del
  cobro con `#0091c4`, no con `--p-medio-mp` (`#0a6aa8`) como en «Hoy». Es parecido pero no es el
  mismo color. Comprobado en el CSS construido; no visto en pantalla.
- **Prueba:** la de E06 en `celular/Vender.test.tsx:126` solo mira la clase.

### 1.3 E13: el celular no muestra el precio por unidad — Defecto (la spec y el `ux.md` se contradicen)
- **Dónde:** `celular/pantallas/VentasDeHoy.tsx:152`.
- **Spec:** E13: «sus productos, uno por renglón, con cantidad, precio por unidad y total».
- **`ux.md` y maqueta C:** «cada producto con su cantidad y su total (en la computadora también el
  precio por unidad)». El código sigue al `ux.md` y a la maqueta; la computadora sí lo muestra
  (`compu/.../Hoy.tsx:147`, «$10.000 c/u»).
- Hay que corregir uno de los dos documentos. La prueba del celular (`Hoy.test.tsx:85`) comprueba
  el detalle sin precio por unidad.

### 1.4 E19: una fecha futura tecleada entra igual — Defecto (leído, no ejecutado)
- **Dónde:** `celular/pantallas/VentasDeHoy.tsx:59-60` y `compu/.../Hoy.tsx:72-73`.
- **Spec:** «se elige una fecha futura → no se puede: el calendario llega hasta hoy».
- **Código:** solo pone `max={hoyLocal()}`. El atributo limita el calendario desplegable, pero
  no impide que el campo cambie a un día posterior si se lo escribe (en la computadora el campo
  existe aunque esté oculto; el navegador marca el valor como fuera de rango pero dispara
  `change`). El `onChange` acepta cualquier valor: se pide `/ventas?dia=<futuro>`, el servidor lo
  acepta y la pantalla dice «Sábado 24/10» con «No hubo ventas ese día».
- **Prueba:** `celular/.../Hoy.test.tsx:93` solo mira el atributo `max`. En la computadora, ninguna.

### 1.5 E17: ninguna prueba distingue «día entero» de «hasta la misma hora» en la pantalla — Defecto
- **Dónde:** `negocio/ventas/resumen-del-dia.ts:73` (`minuto = esHoy ? … : null`).
- **Código:** cumple (otro día pasa `null` y se suma entero).
- **Prueba:** `resumen-del-dia.test.tsx:57` prueba `totalHasta(AYER, null)` suelta, no que
  `useResumenDelDia` pase `null` para otro día. La de pantalla (`celular/.../Hoy.test.tsx:97`)
  compara el 16/10 con el 15/10, que tiene una sola venta a las 10: a las 12 (la hora falsa de la
  prueba) el resultado sería el mismo si se cortara a la hora actual. La prueba pasaría con el error.

### 1.6 E20 y E21: lo que dicen no está probado entero — Defecto
- **E20** («un día sin ventas → «No hubo ventas ese día»»): las dos pruebas que lo nombran
  (`celular/.../Hoy.test.tsx:70`, `compu/.../Hoy.test.tsx:94`) usan hoy sin ventas y miran
  «Todavía no hay ventas hoy.». El texto de otro día (`t.sinVentasDia`) no se prueba en ningún lado.
- **E21**, segunda mitad («hoy se sigue viendo con lo que el dispositivo tiene»): sin prueba. En
  la computadora, sin prueba ninguna de E21.

### 1.7 Escenarios sin prueba de pantalla en la computadora — Defecto
- `compu/.../Hoy.test.tsx` no prueba E03, E04 (señalar una barra dice importe y hora: allí es con
  el mouse o el foco, `Hoy.tsx:124`), E10, E12, E14, E15, E17, E19 ni E21. E04, E10 y E14 a E17
  quedan cubiertos por la función compartida, pero lo que es de la pantalla (barra señalada,
  «—», tachado y pastilla «anulada», texto de otro día) no.

### 1.8 Pruebas que comprueban menos de lo que dice el escenario — Defecto
- **E02** «en verde / en el color de lo que baja»: solo se prueba el texto; no la clase `sube`/`baja`.
- **E05** «su color»: se mira la clase del medio (`Hoy.test.tsx:62`), no el color (ver 1.1).
- **E14** «tachada»: se mira la clase `anulada` del renglón (`Hoy.test.tsx:81`), no el tachado.
- **E16** con el 16/10 en el celular, no con el 15/10 del escenario (en la computadora sí).

### 1.9 La e2e de escritorio depende de dónde quedó el foco — Defecto (no ejecutado)
- **Dónde:** `tests/e2e/escritorio/04-vender.spec.ts:113` (`page.keyboard.press("Enter")` justo
  después de hacer clic en la pestaña «Hoy»).
- Las teclas con el foco en las pestañas no llegan a la pantalla (`plataforma/teclado/teclas.ts:25`,
  `zonasConTeclasPropias`), y Enter sobre la pestaña la vuelve a elegir. Si después del clic el
  foco queda en la pestaña y no en `#contenido`, Enter no abre la venta y la prueba falla. No se
  corrió.

### Escenarios que se cumplen y su prueba los comprueba
E01, E02 (texto), E03, E04 (celular y función), E05, E07 a E10, E11, E12, E14 (no suma: el total, los
medios y los números lo excluyen), E15, E16 y E18 (las dos interfaces), E13 en la computadora
(click y Enter).

## 2. Seguridad (plan.md, «Seguridad»)

- **Datos que toca:** las ventas de un día, que ya mostraba «Hoy»; nada nuevo se guarda. Cumplido:
  no hay cambios en el servidor.
- **Permisos — «Ver las ventas del día» para hoy y otros días (decisión 109):** cumplido en las
  pantallas: la pestaña «Hoy» pide `ventas.ver` (celular `Vender.tsx:43`, computadora `App.tsx:93`).
  El servidor (`api/src/rutas/ventas.ts:19`) deja pedir cualquier día con `ventas.ver` **o**
  `negocio.ventas` («Ver las ventas del negocio»). Es anterior a 017 y lo usa «Cómo va el
  negocio», pero quiere decir que quien tiene solo `negocio.ventas` puede pedir las ventas de
  cualquier día por la API. La decisión 109 nombra un solo permiso. — Defecto: escribirlo o que
  Carlos decida.
- **«Hoy» sigue sin dejar tocar nada:** cumplido; ni el celular ni la computadora tienen «Anular»
  en «Hoy» (probado en `celular/Vender.test.tsx` y en las e2e).
- **Qué entra desde afuera — la fecha:** **no se cumple como dice el plan.** «El calendario limita
  hasta hoy» no se sostiene si se escribe la fecha (ver 1.4). «El servidor ya valida el día que
  se le pide» tampoco: `ventas/datos.ts:43` pasa el texto tal cual a `${dia}::date`. Va como
  parámetro, así que no hay inyección; pero una fecha mal formada (`?dia=hola`) hace fallar la
  consulta y vuelve un 500 genérico (`app.ts:68`) en vez de un 400, y una fecha futura se acepta y
  vuelve vacía. No hay prueba del servidor para `dia`. — Defecto (leído, no ejecutado): validar el
  formato con un 400 o corregir el plan.
- **Secretos:** ninguno. Cumplido.
- **Registro de quién hizo qué:** mirar no se registra, como antes. Cumplido.

## 3. Reglas inventadas

### 3.1 La hora y el día salen del reloj del dispositivo, no del huso del local — Defecto
- **Dónde:** `resumen-del-dia.ts:29, 35, 40, 56-63, 73` (`getHours`, `getMinutes`, `new Date(…T12:00:00)`),
  `formato.ts:24` (`hoyLocal`), `hora()` en las dos pantallas (`toLocaleTimeString` sin `timeZone`).
- **Spec:** «una venta cerca de la medianoche cuenta en el día del local (hora de Buenos Aires)»;
  el gráfico va «por hora entera del local». El servidor decide el día con
  `America/Argentina/Buenos_Aires` (`ventas/datos.ts:8`).
- **Código:** la barra de cada venta, el corte «hasta la misma hora», «Hasta las 11:52», el día
  que se pide como «ayer» (`diaAnterior(hoyLocal())`) y el `max` del calendario usan el huso del
  dispositivo. El comentario dice «el local está en un solo huso». Mientras el dispositivo esté en
  Buenos Aires da lo mismo; con otro huso (una computadora mal configurada, un navegador de prueba
  en UTC) las ventas caen en otras horas, la comparación corta a otra hora y, de 21 a 24 h, «ayer»
  del dispositivo no es el ayer del servidor. No está escrito en ningún lado que se suponga el
  huso del dispositivo. Las unitarias arman las horas en el huso de la máquina, así que pasan en
  cualquier huso y no lo detectan.

### 3.2 Enter con el foco en un botón abre la venta en lugar de apretar el botón — Defecto (leído, no ejecutado)
- **Dónde:** `compu/.../Hoy.tsx:30-37`.
- El manejador global toma Enter siempre que haya una venta elegida y hace `preventDefault`, salvo
  en campos de texto. Con el foco en «Volver a hoy», «Cambiar fecha», la flecha de otra fila o una
  barra del gráfico, Enter abre o cierra la venta elegida y no hace lo del botón. Con la tecla en la
  flecha de una fila, abre la fila elegida, no esa.

### 3.3 Celular: una venta abierta por vez; computadora: varias — Defecto
- **Dónde:** celular `VentasDeHoy.tsx:130` (`abierta: string | null`); computadora `Hoy.tsx:23`
  (`Set`). El `ux.md` dice «tocarla la abre debajo… tocarla otra vez la cierra», sin decir si se
  cierra la anterior. Distinto entre interfaces (decisión 47) y sin escribir.

### 3.4 Con lo guardado y sin conexión, la computadora avisa y el celular no — Defecto (leído, no ejecutado)
- **Dónde:** computadora `Hoy.tsx:40-45` muestra el aviso de error siempre que haya error, también
  con datos en pantalla; celular `VentasDeHoy.tsx:62-63` solo lo muestra sin datos.
- Con hoy ya bajado y sin conexión al volver a pedir, la computadora dice «Sin conexión: las ventas
  de hoy se ven cuando vuelva internet.» **encima de las ventas de hoy**, y el celular no dice nada.
  Distinto entre interfaces y el texto contradice lo que se ve.

### 3.5 «0 %» va en verde y con la flecha que sube — Defecto menor
- **Dónde:** celular `VentasDeHoy.tsx:102`, computadora `Hoy.tsx:107` (`porcentaje < 0 ? "baja" : "sube"`).
  Igual a ayer, o apenas por debajo (−0,4 % redondea a 0), se muestra como si subiera. La spec solo
  habla de por encima y por debajo.

### 3.6 «El día anterior no hubo ventas» — Defecto menor
- **Dónde:** `textos.ts:159` (`diaSinVentas`). Para otro día cuyo anterior no tuvo ventas. Razonable,
  pero no está en la spec ni en el `ux.md` (E03 solo cubre hoy).

### 3.7 «Hasta las …» es la hora de dibujar, no la de los datos — Defecto menor
- **Dónde:** `VentasDeHoy.tsx:48,55`, `Hoy.tsx:67`, `resumen-del-dia.ts:67,73`.
  `ahora` se toma en cada dibujo; la comparación corta a ayer «a esta hora» aunque las ventas de
  hoy sean de un pedido anterior (la memoria las muestra mientras se vuelven a pedir). La hora y la
  comparación cambian solo cuando algo hace redibujar.

### 3.8 «Ir a vender» en la computadora sin ventas — Defecto menor
- **Dónde:** `compu/.../Hoy.tsx:83`. Venía de la pantalla anterior; el celular no lo tiene y no está
  en la maqueta ni en el `ux.md`.

## 4. Documentación que quedó atrás

- **4.1 Dos decisiones con el número 109** en `docs/decisiones-de-negocio.md` (líneas 856 y 867: el
  manual por dispositivo y «Ventas de hoy renovada»). La spec y el plan dicen «decisión 109»
  sin que se sepa cuál. — Defecto.
- **4.2 E13 contra `ux.md`** (precio por unidad en el celular): ver 1.3. — Defecto.
- **4.3 E02 dice «vs. ayer ($250.000)»; el `ux.md`, la maqueta y el código, «vs. ayer a esta hora
  ($250.000)».** Corregir la spec. — Defecto menor.
- **4.4 El huso:** ver 3.1. — Defecto.
- **4.5 Textos fuera de `textos.ts`:** computadora: el título de la página «Ventas de hoy» /
  «Ventas del …» (`Hoy.tsx:42`), «Buscando las ventas del día» (`:44`), «Ir a vender» (`:83`), las
  cabeceras «Hora», «Productos», «Cómo pagó», «Total», «Detalle» (`:86`), «Cerrar el detalle» /
  «Ver el detalle» (`:143`); las dos: «h» de la hora de la barra (`VentasDeHoy.tsx:116,120`,
  `Hoy.tsx:120,125`) y «—» del ticket. El celular no tiene título de página y la computadora sí. —
  Defecto.
- **4.6 Colores sin token:** la pastilla que sube (`#2f7d5c`) y las barras (`#6fbf98`, `#b6e4cc`)
  están escritas como hexadecimales en los dos `hoy.css`, no en `paleta.css`. La decisión 108 pide
  que un color con significado («lo que sube») esté en la paleta compartida. — Defecto.
- **4.7 Código que quedó sin uso:** el modo `"hoy"` de `compu/base/pantallas/VentasDeHoy.tsx` (los
  `Indicador` con los íconos viejos `ICONO_MEDIO`, líneas 14 y 50-56) ya no se usa desde `App.tsx:330`;
  y `.ventas-medio`, que usa «Anular», está en `estilos/hoy.css:46`, que importa «Hoy» y no «Anular».
  Funciona porque los dos se cargan en el mismo paquete. — Defecto menor.
- **4.8 `tasks.md`:** T008 y T009 sin marcar, como corresponde; esta revisión es T009.

Lo demás que hace el código (pedir el día y el anterior y esperar a los dos; las horas vacías entre
la primera y la última; «Productos vendidos» por renglones; el ticket redondeado; la tecla «F»; la
barra de la hora actual vacía) está escrito en la spec, el plan o el `ux.md`.

## 5. Pantallas (contra las maquetas aprobadas)

No se sacaron capturas; se comparó el CSS y el marcado con `celular-hoy-c-entera.png`,
`celular-hoy-c.html` y `compu-hoy.png`.

- **5.1 Los íconos de dos medios no son los de la maqueta:** en la maqueta (y en su HTML)
  Mercado Pago es un eslabón y Cuenta corriente una persona; el código usa el isotipo de Mercado
  Pago y una libreta (`IconoDeMedio.tsx:7-11`, los de Vender). Puede ser a propósito, para que sean
  los mismos que en el cobro, pero no está escrito. Afecta «Hoy» en las dos interfaces. — Defecto.
- **5.2 «Cómo va el negocio» de la computadora:** los cuatro íconos del mismo color (ver 1.1). —
  Frena el cierre.
- **5.3 Computadora: título de página arriba.** `Pagina` dibuja un `<h1>` «Ventas de hoy» encima de
  las dos columnas; la maqueta pasa de las pestañas directo al resumen. No comprobado si el estilo
  de la página lo esconde. — Defecto, a mirar en la captura de T008.
- **5.4 Celular, «Cómo va el negocio»:** el ícono y el nombre del medio van en un `span.medio-nombre`
  sin estilo (`ComoVaElNegocio.tsx:63`): sin separación entre los dos. No comprobado en pantalla. —
  Defecto menor.
- **5.5 SC-002** (total, comparación, gráfico y cuatro medios sin bajar en el celular): no medido.
- **5.6 Lo demás coincide según el CSS:** encabezado con el día y «Hasta las…», botón «Cambiar
  fecha» con borde, tarjeta oscura redondeada con el total grande, pastilla con flecha, barras de
  64 px (90 px en la computadora) con las horas debajo y la actual vacía, medios en renglones
  separados por una línea tenue con ícono sobre su fondo suave, tira de tres números, título
  «Ventas», renglones con ícono en su color, texto, hora · medio · cliente, importe y flecha,
  anulada tachada con la pastilla naranja suave, detalle abierto sobre fondo gris; en la
  computadora, dos columnas, tabla Hora · Productos · Cómo pagó (pastilla del color del medio y el
  cliente debajo) · Total, fila elegida con el borde verde y la línea de teclas. No verificado con
  captura.

## Resumen

| # | Punto | Gravedad |
|---|---|---|
| 1.1 / 5.2 | «Cómo va el negocio» (computadora): los cuatro medios del mismo color; E06 sin prueba que mire el color | Frena el cierre |
| 1.2 | Mercado Pago en el cobro del celular con `#0091c4`, no con el color de la paleta | Defecto |
| 1.3 / 4.2 | E13: precio por unidad en el celular; la spec y el `ux.md` se contradicen | Defecto |
| 1.4 / 2 | E19 y el plan: una fecha futura escrita entra; el servidor no valida `dia` (500 si está mal) | Defecto |
| 1.5 / 1.6 / 1.7 / 1.8 | E17, E20, E21 y varios de la computadora sin prueba que los compruebe | Defecto |
| 1.9 | La e2e de escritorio aprieta Enter sin asegurar el foco (no ejecutada) | Defecto |
| 2 | El servidor deja pedir cualquier día también con «Ver las ventas del negocio» | Defecto, a decidir por Carlos |
| 3.1 / 4.4 | Hora y día del dispositivo, no del huso del local, sin escribir | Defecto |
| 3.2 | Enter sobre un botón abre la venta elegida en vez de apretar el botón | Defecto |
| 3.3 / 3.4 | Diferencias celular / computadora (una o varias abiertas; aviso sin conexión con datos) | Defecto |
| 4.1 | Dos decisiones con el número 109 | Defecto |
| 4.5 / 4.6 | Textos fuera de `textos.ts`; colores de la pastilla y las barras fuera de la paleta | Defecto |
| 5.1 | Íconos de Mercado Pago y Cuenta corriente distintos de la maqueta | Defecto |
| 3.5 / 3.6 / 3.7 / 3.8 / 4.3 / 4.7 / 5.3 / 5.4 | Menores: 0 % en verde, textos sin escribir, «Hasta las», «Ir a vender», E02, código sin uso, título, separación | Defecto |

---

---

## Qué se hizo con cada punto (T009, 2026-10-17)

| Punto | Qué se hizo |
|---|---|
| 1.1 / 5.2 Los medios de «Cómo va el negocio» (computadora), todos del mismo color (Frena el cierre) | Arreglado: la clase vieja ya no pisa el color, y el color de los medios gana sobre cualquier regla de una pantalla. Comprobado en el navegador: cuatro colores distintos. |
| 1.2 Mercado Pago del cobro del celular con su azul propio | Arreglado: el tema del celular ya no le pone color; toma el de la paleta. Comprobado en el navegador. |
| 1.3 E13: precio por unidad en el celular | La spec dice ahora lo que muestran `ux.md` y la maqueta: en el celular, cantidad y total; en la computadora, también el precio por unidad. |
| 1.5 E17 no distingue hoy de otro día | La prueba de negocio lo distingue (`totalHasta` con hora y sin hora); la de pantalla compara un día entero contra el suyo entero. |
| 1.6 a 1.8 Pruebas que faltaban | Agregadas: otro día sin ventas (E20), sin conexión hoy (E21), fecha futura escrita (E19), 0 %, varias abiertas, Enter sobre un botón, sin conexión con datos a la vista. |
| 1.9 La e2e de escritorio dependía del foco | Abre la venta con el mouse; Enter lo prueban las unitarias. |
| 3.1 El huso del dispositivo | Escrito en los bordes de la spec: las horas salen del reloj del dispositivo, que está en el local. |
| 3.2 Enter sobre un botón abría la venta | Arreglado: con el foco en un botón, Enter es de ese botón. |
| 3.3 Una abierta en el celular, varias en la computadora | Arreglado: en las dos se abren de a varias. |
| 3.4 El aviso sin conexión con datos a la vista | Arreglado: en la computadora, el aviso solo aparece si no hay nada que mostrar, como en el celular. |
| Permiso «Ver las ventas del negocio» | De antes de 017: escrito en el plan («Seguridad»). |
| E19 y el servidor sin validar el día | Arreglado: una fecha futura escrita a mano no se toma, y el servidor rechaza con 400 un día mal escrito, sin ir a la base (prueba nueva). |
| 4.1 Dos decisiones 109 | La de «Ventas de hoy» pasó a ser la 111, con sus referencias. |
| 4.5 Textos fuera de `textos.ts` | El título, las cabeceras de la tabla, «Ir a vender», ver y cerrar el detalle y «Buscando…» pasaron a `textos.ts`. |
| 4.6 Colores escritos a mano | La pastilla que sube y las barras toman colores de la paleta (`--p-sube`, `--p-barra`, `--p-barra-elegida`). |
| 5.1 Íconos distintos a la maqueta | Se dejan los del cobro de Vender, para que el ícono de cada medio sea uno solo en toda la aplicación; escrito en `ux.md`. Se le muestra a Carlos. |
| Menores | «0 %» sin flecha ni color (prueba nueva); el modo «hoy» viejo de la computadora, borrado; el título «Ventas de hoy» de la computadora no se ve en pantalla (es el de la página, como en las demás); el «Anular» nuevo del celular (003-T005) usa también el ícono compartido. |
