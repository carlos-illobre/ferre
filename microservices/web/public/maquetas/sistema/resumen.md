# Más → Sistema: seis maquetas para Carlos

Capturas lado a lado: `comparacion-compu.png` y `comparacion-celu.png`. Cada maqueta se abre
sola desde su `index.html` (usa `../../../_comun/`, `../../sistema.css` y `../../iconos-extra.js`,
con 7 íconos Lucide tomados de `configuracion/`). Son una propuesta aparte: la maqueta aprobada
(variante A, decisión 147) sigue en `specs/020-ajustes-del-sistema/maquetas/`.

Todas muestran el mismo caso: los valores de arranque (sesión 1 min, celular cada 1 min,
vínculo 30 días), recién guardado el cambio del celular de 30 s a 1 min por Carlos Illobre a
las 10:41, y un día de Marta Benítez que llevó el vínculo de 15 a 30.

**Lo que no cambia en ninguna:** los tramos son los de la especificación (No · 30 s · 1 · 5 · 10 min
y 5 s · 30 s · 1 · 5 · 10 min), los días van de 1 a 365, se guarda al tocar, sin botón «Guardar», y
cada cambio va a «Quién hizo qué». En la compu todo se hace con teclado.

**Los MB por día son inventados:** la base manda hoy unos 9,8 MB de ventas, catálogo y stock;
las sesiones suman 12 MB sin recordar y 1,9 MB con 1 min; el celular, 6,3 MB a 5 s y 0,5 MB a
1 min. Total con los valores de arranque: 12,2 MB de los 30 MB de tope (RNF-62). Para mostrarlos
de verdad habría que medirlos (idea 3).

## Computadora

| | Idea en una frase | Ideas |
|---|---|---|
| **1 · Renglones** (evolución) | La aprobada llevada al lenguaje Mostrador: los tres renglones con ícono, línea larga, tramos y su Alt; a la derecha, lo que manda la base contra el tope, los últimos cambios y quién puede cambiarlo. | 1, 2, 3, 4, 5, 6, 7, 8 |
| **2 · Presupuesto de datos** (reinvención) | La pregunta de quien administra no es «¿cuántos segundos?» sino «¿cuánto le pido a la base?»: la semana contra el tope de 30 MB y tres modos (Ahorro, Equilibrado, Al instante) que ponen los dos tiempos de una vez; los tramos quedan como ajuste fino. | 3, 9, 10, 11, 12, 13 |
| **3 · En una frase** (audaz) | Los ajustes se leen como una frase con huecos («El servidor recuerda cada sesión [1 minuto]…»); cada hueco abre sus tramos con lo que cuesta cada uno, debajo la consecuencia en palabras, y a la derecha la historia con «Volver a 30 s». | 3, 14, 15, 16, 17, 18 |

**Qué rompe la audaz:** pliega el lateral a íconos y saca las tarjetas: la frase va directo sobre
el papel, a 30 px. La historia de cambios pasa de «Quién hizo qué» a la propia pantalla.

## Celular

| | Idea en una frase | Ideas |
|---|---|---|
| **1 · Renglones** (evolución) | Lo de la compu, resumido: arriba los MB del día con su pastilla, los tres renglones sin ícono (el título entra en una línea) con tramos de 44 px, el aviso verde de guardado y el último cambio. | 1, 2, 4, 5, 19 |
| **2 · Presupuesto** (reinvención) | Un anillo con el 41 % del tope y tres modos de un toque; «A medida» resume los tres valores en renglones con ›. | 9, 10, 11, 12, 19 |
| **3 · En una frase** (audaz) | La frase a pantalla entera, con huecos grandes; tocar uno sube una hoja con los cinco tramos y los MB de cada uno. | 14, 15, 16, 19 |

**Qué rompe la audaz:** no tiene el título grande ni el botón del espejo arriba; la pantalla es
la frase.

## Cuál me gusta más

**Compu: la 1, con la columna de la derecha.** Esta pantalla se usa pocas veces y la toca quien
administra: lo que más le sirve es ver qué gana con cada tramo. La 1 respeta lo aprobado (mismos
renglones y textos) y suma justo eso: el gasto de la base contra el tope y los últimos cambios.
De la 2 tomaría después los modos (idea 9) si Carlos quiere un solo toque. **Celu: la 1**, por la
misma razón; la 3 es la más linda de leer, pero esconde los tramos detrás de un toque más.

## Cómo se mueve (una línea por interacción)

- **Tocar un tramo:** el anillo pino se desliza al nuevo (200 ms, `--curva`); el número de MB
  rueda hacia arriba o hacia abajo y la barra se estira; el aviso verde aparece con fundido
  (200 ms); en el celular vibra 10 ms.
- **− y + del vínculo:** el número rueda; a los 700 ms del último toque se guarda y el aviso
  verde se funde.
- **Días fuera de rango:** la caja se pone en rojo y tiembla 2 px a los costados (120 ms); el
  texto «de 1 a 365» pasa a rojo; no se guarda.
- **Elegir un modo (2):** el borde pino salta al modo elegido, los dos grupos de tramos del
  ajuste fino se mueven solos a la vez y la barra «Así queda» del gráfico crece o baja.
- **Abrir un hueco (3):** compu, la lista cae desde 8 px arriba con fundido (200 ms); celu, la
  hoja sube (320 ms) y el fondo se oscurece a 30 %. Al elegir, la hoja baja y el hueco hace un
  rebote corto con el valor nuevo.
- **Volver a 30 s (3):** el paso nuevo de la historia entra arriba desde 8 px con borde verde 1 s;
  el hueco de la frase cambia con fundido.
- **Sin conexión:** los tramos se apagan con fundido (200 ms) y arriba baja el aviso ámbar.

## Autocrítica (lo que corregí antes de mostrar)

- Compu 1: el medidor llegaba al borde y la marca del tope no decía nada; ahora la escala va a
  40 MB con «tope 30» marcado. Los colores de sesión y celular casi no se distinguían: el celular
  pasó a verde suave. La tarjeta «Quién puede cambiarlo» se salía por abajo: texto más corto.
- Celu 1: los títulos se partían en dos renglones al lado del ícono y la pantalla no llegaba al
  vínculo; saqué los íconos y acorté las líneas.
- Compu 2: los días pasados por encima del tope iban en ámbar; el ámbar dice «mirá esto», pero
  pasar el tope está mal: ahora rojo suave con el borde rojo. El pie se partía: lo acorté.
- Compu 3: los tramos decían «+5,8 MB», «−0,45 MB»: diferencias difíciles de comparar; ahora
  dicen el total por día de cada uno.
- Lo más flojo que queda: todos los MB son estimados inventados; la 2 inventa modos que la
  especificación no tiene; en la 3, la lista abierta tapa parte de la frase.

## Catálogo de ideas

«Toques» = lo que ahorra en la tarea más frecuente: cambiar uno de los tiempos (hoy, en la
especificación: Más → Sistema → tramo; 3 toques).

| # | Idea | Problema que resuelve | Variantes | Patrón de | Ahorra | ¿Fuera de la spec? |
|---|---|---|---|---|---|---|
| 1 | «Datos que salen de la base, por día: 12,2 MB de 30» con barra apilada | Ver para qué sirve el ajuste: el tope de RNF-62 | compu 1, celu 1 | Uso de datos de Android, facturación de Stripe | — | **Sí** (dato nuevo a la vista) |
| 2 | Barra apilada: ventas y catálogo / sesiones / celular, con su leyenda | Saber qué parte se puede bajar | compu 1 | Almacenamiento de iPhone | — | **Sí** |
| 3 | Medir de verdad lo que manda la base por día | Que los números no sean estimados | todas | Panel de Supabase, Vercel | — | **Sí** (medición nueva) |
| 4 | Últimos cambios en la misma pantalla (quién, de → a) con enlace a «Quién hizo qué» | Saber quién lo tocó sin ir a otra pantalla | compu 1, celu 1 | Historial de Linear, Notion | 2 (ir y volver) | No (usa lo que ya se registra) |
| 5 | Alt S, Alt C, Alt V para ir directo a cada renglón, y Tab / ← → a la vista | Todo con teclado (decisiones 80 y 121) | compu 1 | Linear | 1 | No |
| 6 | Pastilla «Administrar el sistema» en la cabecera | Que se entienda por qué esta persona ve la pantalla | compu 1, celu 3 | Permisos de Google Workspace | — | No |
| 7 | Tarjeta «Lo cambian 2 personas · Rol Administrador · Roles ›» | Saber quién más puede tocarlo y que nunca queda sin nadie | compu 1 | Miembros de Slack | — | **Sí** |
| 8 | Puntito gris sobre el tramo de arranque | Volver al valor de fábrica sin acordarse cuál era | compu 1 | Ajustes de macOS (valor por defecto) | — | **Sí** |
| 9 | Tres modos: Ahorro (10 min / 5 min), Equilibrado (1 / 1, de arranque), Al instante (No / 5 s) | Decidir una vez, sin entender cada tiempo | compu 2, celu 2 | Modo de energía de Windows, calidad de Google Fotos | 1 (un toque pone los dos) | **Sí** |
| 10 | Cada modo con sus MB por día, su barra y lo que pasa si se corta el espejo | Comparar consecuencias sin leer | compu 2, celu 2 | Planes de Stripe | — | **Sí** |
| 11 | Gráfico de la semana contra el tope, con la barra «Así queda» | Ver el efecto antes y después | compu 2 | Tiempo de uso de iPhone | — | **Sí** |
| 12 | «A medida»: tocar un tramo suelto cambia el modo a «A medida» | No perder el control fino | compu 2, celu 2 | Ajustes de cámara de iPhone | — | **Sí** |
| 13 | Teclas 1, 2, 3 para los modos | Elegir sin mouse | compu 2 | Linear | 1 | **Sí** |
| 14 | Los ajustes como una frase con huecos | Leer de un vistazo cómo trabaja el sistema, sin rótulos técnicos | compu 3, celu 3 | Atajos de iPhone, reglas de Gmail | — | **Sí** (forma) |
| 15 | Cada tramo, en su lista, con el total de MB por día | Elegir viendo lo que cuesta | compu 3, celu 3 | Elegir plan de datos de una telefónica | — | **Sí** |
| 16 | La consecuencia en palabras: «Desactivar a alguien le corta en el acto; una foto llega al instante, o en 1 minuto si se cortó el espejo» | Que se entienda que nada importante se demora | compu 3, celu 3 | Resúmenes de Stripe | — | No |
| 17 | Historia de cambios con línea de tiempo y «Volver a 30 s» | Deshacer un cambio que salió mal sin acordarse del valor anterior | compu 3 | Historial de versiones de Google Docs | 2 | **Sí** (deshacer) |
| 18 | Lateral plegado y sin tarjetas para una pantalla de lectura | Calma, foco en la frase | compu 3 | Notion en modo enfoque | — | **Sí** (marco) |
| 19 | Aviso verde «Guardado para todos: …» con lo que quedó | Confirmar sin otro botón | todas | Ajustes de iPhone, Linear | — | No (ya está en ux.md) |

Toques para cambiar los dos tiempos a la vez: spec 4 (Más, Sistema, tramo, tramo); variante 2,
3 (Más, Sistema, modo). Para uno solo: todas 3, la 3 del celular 4 (hueco y tramo).

## Para quien siga

- El navegador de versiones (`/v2/`, `/v3/`, `/v4/`) y `_comun/navegar.js` no tienen todavía
  «sistema» en sus listas de pantallas: hasta sumarla, la pantalla no aparece en el selector y
  `data-ir="sistema"` no lleva a ningún lado.
- `herramientas/capturar.sh` rearma las capturas; `herramientas/comparar.py`, las comparaciones.
