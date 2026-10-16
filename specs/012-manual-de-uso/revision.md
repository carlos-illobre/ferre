# Revisión: Manual de uso (012)

Revisión independiente (T004), del 2026-10-16, sobre el código sin subir (`git status`: los
cambios de T002 y T003 sin commit). Se leyeron `spec.md` (E01 a E09, RF-97), `plan.md` (con
«Seguridad»), `tasks.md`, la maqueta aprobada `maquetas/manual-entrar.html`, el código y las
pruebas que se nombran abajo. La carpeta no tiene `ux.md` ni `resumen.md`.

Qué se comprobó corriendo algo:

- Unitarias de `Manual.test.tsx` y `Entrar.test.tsx`: 7 de 7 pasan.
- `node tests/trazabilidad.mjs`: pasa.
- Capturas propias con la API de mentira (`tests/capturas/levantar.sh`) del manual en 1366, en
  1000 de ancho, con sesión abierta y en un celular (390), comparadas con la maqueta en 1366.
- El Chromium de las pruebas reproduce H.264 (`canPlayType` da «probably») y el clip carga en
  el manual (`readyState` 4, quieto y sin sonido).

**No se comprobó:** la prueba de punta a punta nueva (`tests/e2e.sh` no se corrió en esta
revisión) ni el comando de `tests/capturas/tutorial/entrar.py` (no se volvió a generar el clip).

Gravedad: **frena** el cierre, o **defecto**, que se puede anotar y arreglar después.

## 1. Escenarios

| # | Dónde | Qué pide la especificación | Qué hace el código o la prueba | Gravedad |
|---|---|---|---|---|
| 1.1 | Ninguna prueba nombra `012-E07`, `012-E08` ni `012-E09` | La constitución (VI y «Toda lista de tareas termina con estas») pide una prueba por escenario que lo nombre; la compuerta lo exige al terminar la última tarea | El plan dice que E08 y E09 «se revisan en la configuración», o sea que no tienen prueba. E07 tampoco tiene. El comportamiento existe: en mi captura del celular, `#/manual` abre la entrada del celular sin manual (E07). `vite.config.ts:51` deja `**/manual/**` afuera del precache (E09). `playwright.config.ts` tiene `video: "off"` (E08) | **Frena**: la compuerta no deja terminar. Alcanza con pruebas chicas: una unitaria de la app del celular en `#/manual`, una que lea la configuración del precache y el `video` de Playwright |
| 1.2 | `Manual.test.tsx:21` (012-E03) | E03 pide un orden completo: la entrada, el resumen (qué hace falta, cuánto tarda, dónde se hace), el aviso, el clip, los cuatro pasos con su captura, el aviso de que quedan vinculados, las otras formas y «Si algo no funciona» con su captura | La prueba solo mira que el clip esté antes del primer paso. No comprueba el resumen, el aviso de «quedan vinculados» ni la captura de «Si algo no funciona». Tampoco que cada paso tenga su captura, ni el orden de las otras secciones. Si se cambia ese orden o se borra una de esas partes, la prueba sigue pasando | Defecto |
| 1.3 | `Manual.test.tsx:53` (012-E06) | Se llega con el teclado a «Volver», al índice y al clip | La prueba mira que sean `button` y que el clip tenga `aria-label`, pero no recorre la página con Tab. Además, al elegir una sección en el índice (`Manual.tsx:29`) solo se desplaza la página: el foco se queda en el índice y el siguiente Tab sigue en el índice, no en el texto | Defecto |
| 1.4 | `Manual.test.tsx:36` (012-E04) | «Arranca cuando se lo pide» | La prueba comprueba que el clip no se reproduce solo, que no tiene sonido y que tiene controles, pero no que arranque al pedirlo. El e2e mira `paused && muted` y que el archivo cargue | Defecto menor: con controles nativos el riesgo es bajo |
| 1.5 | `Entrar.test.tsx:54` (012-E01) | Se abre «sin haber entrado», «en el capítulo Entrar» | La unitaria solo mira que la dirección cambie a `#/manual`. Que `App.tsx:237` muestre el manual sin sesión lo cubre solo el e2e de `01-login.spec.ts`, que no corrí | Defecto menor, condicionado a que el e2e pase |
| 1.6 | Bordes de la `spec.md` | Con la sesión abierta, el manual se ve igual; en una ventana angosta, el índice pasa arriba sin correrse al costado | En `App.tsx:237` el manual va antes del control de sesión, así que se ve igual. Lo comprobé con una captura con sesión. En 1000 de ancho el índice pasa arriba y la página no se corre al costado. Ninguna prueba automática los cubre | Defecto (los bordes no tienen escenario numerado; tampoco frena) |
| 1.7 | E02 y E05 | — | Las pruebas comprueban lo que dicen: E02 (nueve capítulos en orden, solo «Entrar» con botón y los demás con «pronto») y E05 (con «Volver» en la unitaria; con el botón de volver del navegador y con «Volver» en el e2e) | Sin hallazgo |

## 2. Seguridad (plan, sección «Seguridad»)

| # | Dónde | Qué dice el plan | Qué hace el código | Gravedad |
|---|---|---|---|---|
| 2.1 | `Manual.tsx` | No muestra ni pide datos del negocio | No importa `api` ni la sesión, no tiene formularios y no llama al servidor. Comprobado | Sin hallazgo |
| 2.2 | `public/manual/entrar/*.png` | Las capturas son de la API de mentira, con datos inventados | Miré `compu-adentro.png` y `celu-despues.png`: los productos son los de `tests/capturas/api-de-mentira/rutas-00-base.mjs` («Cable unipolar…») y el usuario es el de mentira (`carlos@ferre.test`, «Carlos») | Sin hallazgo |
| 2.3 | `tests/capturas/tutorial/entrar.py:29-30` | «Las capturas nunca se sacan de un ambiente con datos reales» | Nada lo impide de forma explícita: `BASE` y `API` se toman del entorno. En la práctica, el script falla al primer `PUT /mentira/permisos` si la API no es la de mentira. Pero un `BASE` de un cliente armado contra otra API igual podría sacar capturas | Defecto menor: conviene que el script se niegue si `BASE` o `API` no son locales |
| 2.4 | `App.tsx`, servidor | No agrega rutas al servidor ni permisos | Es así: solo se agregó una ruta del cliente | Sin hallazgo |
| 2.5 | `clip.mp4` | Estático y sin sonido | `ffprobe`: un solo flujo, H.264 de 1704×800 y 13,4 s, sin audio | Sin hallazgo |

## 3. Reglas inventadas

| # | Dónde | Qué hace | Gravedad |
|---|---|---|---|
| 3.1 | `estilos/manual.css:3` y el resto del archivo | El manual define su propia paleta (`--naranja:#d9400f`, `--verde-2:#21443b`, `--fondo:#eef1ee` y otros) y colores sueltos (`#9aa3a0`, `#e9f5ee`, `#1c1f1e`…) en vez de tomarlos de `src/pantallas/paleta.css`. Esa hoja dice que «para cambiar un color se cambia en este archivo y en ningún otro», y la decisión 47 dice que la paleta es una sola. Los valores son casi los de la paleta (`#d83f0e`, `#25443d`, `#e6ece6`), así que la diferencia apenas se ve, pero un cambio de color de la aplicación no le llegaría al manual. La maqueta aprobada traía esos colores; aprobarla no dice que el código no use la paleta | Defecto (conviene arreglarlo antes de cerrar: es justo lo que Carlos rechaza, colores propios en una sola pantalla) |
| 3.2 | `Manual.tsx:130` | El pie del clip dice «Sin sonido» donde la maqueta decía «15 segundos». Ninguna regla lo pide (el clip ahora dura 13,4 s) | Defecto menor: anotarlo, o mostrar la duración como la maqueta |
| 3.3 | `tests/capturas/tutorial/entrar.py` (diff) | El clip ahora se recorta para no mostrar lo que tarda en cargar (`-ss listo`), y la portada sale del segundo 1 en vez del 1,5. Es razonable, pero no está escrito. Por eso el clip y la portada de `public/manual/entrar/` ya no son iguales a los de `maquetas/entrar/`; las seis capturas sí son iguales | Defecto menor |
| 3.4 | `Manual.tsx:46` | Tocar «Entrar» en el índice sube al principio de la página | Sin gravedad: sigue al enlace de la maqueta |

## 4. Estilos que se filtran al resto de la aplicación

Ninguno. Todos los selectores de `manual.css` empiezan con `.manual` o con `.manual-…`, y las
variables se definen sobre `.manual`, no sobre `:root`. No hay clases `manual-…` en otras hojas
(`duplicados.css` usa `.duplicados-manual`, otro nombre).

## 5. Pruebas de punta a punta: sin video y sin el script del tutorial

- `tests/e2e/playwright.config.ts`: `video: "off"`. Cumple.
- `01-login.spec.ts`: no llama al script ni a nada de `tests/capturas/`. Sí depende de que
  `public/manual/entrar/clip.mp4` esté en el repositorio (pide `readyState > 0`).
  **Hoy `microservices/web/public/manual/` está sin agregar (`??`):** si no entra en el commit,
  esa prueba falla. Defecto, a tener en cuenta al subir.
- No corrí el e2e: no puedo decir si pasa.

## 6. Documentación que quedó atrás

| # | Dónde | Qué dice | Qué hace el código | Gravedad |
|---|---|---|---|---|
| 6.1 | `docs/decisiones-de-negocio.md:707-708` (decisión 93) | «Ver tutorial» «por ahora no lleva a ningún lado» | Abre el manual. La decisión 94 lo dice, pero la 93 quedó sin la línea que avisa que ese «por ahora» terminó | Defecto |
| 6.2 | `specs/007-usuarios-y-acceso/tasks.md:28` (T017) | «Por ahora no lleva a ningún lado» | Es el registro de una tarea cerrada, así que se puede dejar; se anota por si lee el tablero | Sin gravedad |
| 6.3 | `tests/capturas/README.md` | No nombra `tutorial/` | Cómo se regeneran el clip y las capturas (E08) está solo en el docstring de `entrar.py`: hace falta `levantar.sh` antes, `ffmpeg` y Playwright de Python. El README de capturas, que es donde CLAUDE.md manda a buscar, no lo cuenta | Defecto |
| 6.4 | `specs/012-manual-de-uso/` | Sin `ux.md` | Las reglas visuales del manual (pie del clip, marcas sobre la captura, ancho de las figuras, el punto de corte en 1100 px, «Siguiente: … (pronto)») están solo en la maqueta y en el CSS. Un agente que lo rehaga desde la documentación copiaría la maqueta y le saldría con «15 segundos» y la leyenda en otro lugar (ver 7.1 y 3.2) | Defecto |
| 6.5 | `proyecto/estado.yml` (RF-97) | «Hecho en parte (012-T002, 012-T003)» | T002 y T003 siguen `[ ]` en `tasks.md` | Defecto menor: se resuelve al marcar las tareas |
| 6.6 | `specs/012-manual-de-uso/tasks.md` | Termina en T004 (revisión) | Faltan las tareas de cierre que pide la constitución: comparar con la maqueta con capturas y mostrarle a Carlos las diferencias, y actualizar `estado.yml` y la `spec.md` | Defecto |
| 6.7 | `docs/adr/ADR-004` (enmienda), decisión 94, `specs/README.md` (RF-97) | — | Coinciden con el código | Sin hallazgo |

## 7. Pantallas: diferencias con la maqueta aprobada

Comparé capturas propias en 1366×768, la aplicación contra la maqueta, a la misma altura de
la página. En general es fiel: la misma barra, el mismo índice, la misma hoja, los mismos
textos y la misma tipografía (Manrope). Diferencias que se ven:

| # | Dónde | Maqueta | Aplicación | Gravedad |
|---|---|---|---|---|
| 7.1 | `Manual.tsx:133-138` | La leyenda de las marcas (1 a 4) va pegada a la captura, y «Figura 1.1 · La entrada de la computadora» va debajo de la leyenda | «Figura 1.1» va pegada a la captura y la leyenda queda debajo del pie | Defecto (se ve) |
| 7.2 | `manual.css:67-68` | «← Volver a Ferrebress» en 15 px y seminegrita | `.manual button{font:inherit}` es más específico que `.manual-volver` y le gana: sale en 17 px y con peso normal, más grande y más fino | Defecto (se ve) |
| 7.3 | `manual.css:76` | Las secciones del índice («Con el celular», «Otras formas», «Si algo no funciona») tienen 12 px más de sangría y más aire entre ellas | Menos sangría y más juntas | Defecto menor |
| 7.4 | `manual.css:50`, `Manual.tsx:157` | El celular de la figura 1.5 tiene un marco más fino (6 px) y esquinas de 22 px | Usa el marco de los otros celulares (8 px, 30 px de radio) | Defecto menor |
| 7.5 | `Manual.tsx:130` | Pie del clip: «15 segundos» | «Sin sonido» (ver 3.2) | Defecto menor |
| 7.6 | `manual.css` | Títulos en mayúsculas («CAPÍTULOS», «CAPÍTULO 1», encabezados de la tabla) en 12 y 13 px | En 14 px (seguramente por la regla de no bajar de 14 px) | Sin gravedad; conviene anotarlo en un `ux.md` |

Celular: en 390 de ancho, `#/manual` muestra la entrada del celular, sin manual ni «Ver
tutorial». Eso cumple E07.

## Resumen

- **Frena el cierre:** 1.1 (E07, E08 y E09 sin una prueba que los nombre).
- **Conviene arreglar antes de cerrar:** 3.1 (la paleta propia), 7.1 y 7.2 (diferencias
  visibles con la maqueta) y, al subir, agregar `public/manual/` (sección 5).
- **Defectos para anotar:** 1.2 a 1.6, 2.3, 3.2, 3.3, 6.1, 6.3 a 6.6 y 7.3 a 7.5.

## Qué se hizo con cada punto (2026-10-16)

- **1.1 (frenaba):** pruebas que nombran `012-E07` (la entrada del celular no tiene «Ver
  tutorial»), `012-E08` y `012-E09` (la configuración: pruebas sin video ni recorridos del manual,
  y el manual afuera del precache), anotadas en `proyecto/estado.yml`.
- **1.2:** E03 ahora mira el resumen, el aviso de que quedan vinculados y la figura 1.6.
- **1.3:** elegir una sección del índice lleva el foco a su título, y E06 lo prueba.
- **1.4:** queda como defecto aceptado: el entorno de las unitarias no reproduce video; la prueba
  de punta a punta comprueba que el clip carga.
- **Paleta propia:** el manual toma los colores de `paleta.css`; quedan fijos solo el marco negro de
  los celulares y el fondo del clip.
- **Figura 1.1:** la leyenda va debajo de la captura y arriba del pie, como en la maqueta.
- **«Volver a Ferrebress»:** vuelve a 15 px en seminegrita.
- **`public/manual/`:** entra en el commit.
- **Script del tutorial contra un ambiente real:** queda escrito en `tests/capturas/README.md` que
  va siempre contra la API de mentira.
- **«Sin sonido» y el clip recortado:** escritos en el `ux.md` nuevo de 012.
- **Documentación atrasada:** decisión 93, `tests/capturas/README.md`, `ux.md` de 012, `estado.yml`
  y `tasks.md` al día.
- **Diferencias menores con la maqueta** (sangría del índice, marco de la figura 1.5): aceptadas.
