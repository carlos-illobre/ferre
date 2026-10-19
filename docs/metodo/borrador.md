# Método de desarrollo: borrador

Lo aprendido trabajando en Ferrebress, para usar en otros proyectos. **Es un borrador**: Carlos
pidió revisarlo cuando terminen las pantallas nuevas (2026-10-19) y recién entonces armarlo como
una skill de su cuenta de claude.ai, `metodo-de-desarrollo`, sin nada propio de Ferrebress
(tarea T130 de `proyecto/tasks.md`).

## Dónde se guarda cada cosa

- **Lo de un proyecto** (paleta, decisiones, maquetas): en su repositorio.
- **El método**: en una skill de la cuenta de claude.ai, que se carga en todas las sesiones de
  cualquier proyecto. Una copia en `docs/metodo/` de este repositorio, por la historia en git.
- La skill tendría: el proceso, las plantillas de arranque (`CLAUDE.md`, constitución,
  `tasks.md`, la compuerta), el director de arte y su encargo en versión general, y el maquetador
  crítico.

## El proceso

**0. Arranque (una vez).** Entorno de la nube (script de preparación, red, Docker para las
pruebas) y despliegue automático del ambiente de pruebas en cada subida a `master`. `CLAUDE.md`
corto, una constitución con lo que no se negocia, `tasks.md` con la compuerta que no deja
programar sin tarea, y las decisiones del dueño numeradas.

**1. Negocio.** El analista escribe la especificación por capacidad y le pregunta todo al dueño,
que la aprueba. Lo que decide se anota con número.

**2. Diseño.**
1. Opcional: imágenes de estilo (tres o cuatro estéticas) para elegir una dirección.
2. El director de arte define el lenguaje común (paleta, letra, íconos, piezas, marco) con una
   pantalla de muestra.
3. Las demás pantallas en paralelo: un agente por pantalla, tres variantes por dispositivo
   (evolución, reinvención, audaz), sobre ese lenguaje, en HTML.
4. Se les agregan los enlaces y los botones que abren o agregan, y se navegan en el ambiente de
   pruebas (/v2, /v3, /v4).
5. El dueño elige pantalla por pantalla.
6. El maquetador crítico recorta y deja una maqueta realista por pantalla; lo que queda fuera de
   la especificación vuelve al paso 1 como pregunta. El dueño aprueba.

**3 a 7. Construcción.** Plan con seguridad, escenarios de prueba, tareas, programación con
pruebas y las de punta a punta en Docker, revisor independiente al final.

**8. Manual de uso.** Capturas y clips armados por un script contra una API de mentira, que se
regeneran cuando cambia una pantalla.

## Lo aprendido que va como regla

- El dueño prueba con una captura y un pedido corto por vez; quiere consistencia entre celular y
  computadora y entre pantallas.
- Subagentes solo para aislar (el creativo que no ve el código, el revisor que no programó) o para
  trabajar en paralelo; para lo demás, una sola sesión.
- Maquetas en HTML, no imágenes: el texto y los números salen bien, se fotografían gratis, se
  navegan, comparten el lenguaje común y quedan cerca del código. La imagen pura solo para elegir
  un estilo al principio o para lo que no es interfaz.
- Nunca datos personales en pedidos a internet.
- Fotos livianas en las maquetas; la aplicación instalada no las guarda.
- Tiempos de referencia: unos 30 minutos para el lenguaje común, 10 a 18 por pantalla en
  paralelo; unas 2 horas para 16 pantallas.

## El maquetador crítico (prompt)

Recibe la especificación aprobada y el trabajo del director de arte (variantes y catálogo de
ideas). Recorta funciones, pasos y adornos que no informan; no recorta calidad: si su maqueta se
parece a la pantalla de antes, falló. Lee lo que el director no leyó: la especificación, las
decisiones, el código de la pantalla y de las vecinas, la paleta, los textos y la aplicación
funcionando. Juzga cada idea del catálogo (Entra / Pregunta / Afuera, con el motivo) con estos
filtros, en orden: contradice una regla o decisión; está fuera de la especificación; necesita un
dato que no se guarda; repite a otra (queda la de menos toques); rompe la consistencia; no cumple
el dispositivo (texto ≥ 14 px, toque ≥ 44 px, contraste AA); costo chico, medio o grande. Entrega
una maqueta (dos como máximo), la tabla de juicio, los toques antes y después, las preguntas
numeradas con la opción recomendada y una autocrítica de tres puntos.

## Lenguaje visual de cada proyecto

- El prompt del director de arte es genérico: parte del lenguaje oficial del proyecto si tiene
  uno, y si no, propone una paleta única. Cuál es el lenguaje de cada proyecto lo dice el encargo
  del proyecto (en Ferrebress, «Mostrador», `docs/lenguaje-mostrador/`), nunca el prompt.
- Cuando el dueño aprueba el lenguaje común que armó el director de arte, se guarda en `docs/`
  del proyecto como el oficial, fuera de las maquetas (que se borran).

## Para revisar al terminar las pantallas

- Si hace falta agregar o cambiar algún paso, según cómo salgan la elección y el maquetador
  crítico.
