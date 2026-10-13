# ferre (Ferrebress)

Sistema de gestión de una ferretería de barrio. Se desarrolla con **spec driven
development sobre GitHub Spec Kit**: no se escribe código de una funcionalidad sin su
especificación aprobada.

## Por dónde empezar

1. [.specify/memory/constitution.md](.specify/memory/constitution.md): lo que no se
   negocia y el flujo de trabajo. **Leela antes de tocar nada.**
2. [specs/README.md](specs/README.md): de qué se trata el proyecto, cada requerimiento y en
   qué carpeta está especificado.
3. La carpeta de `specs/` de la capacidad que vayas a tocar (`001` a `008`, una por
   capacidad, con todos sus requerimientos).
4. [proyecto/estado.yml](proyecto/estado.yml): qué está hecho hoy, con qué pruebas, y dónde
   el código se aparta de la regla.
5. [docs/adr/](docs/adr/README.md): el porqué de cada decisión técnica.

**La especificación no depende del código.** Lo fijo son las reglas de negocio; el código
puede rehacerse. `specs/` nunca nombra archivos del código ni dice si algo está hecho: eso
vive en `proyecto/estado.yml`.

## Cómo se trabaja

Una funcionalidad nueva pasa por siete pasos, en este orden (el detalle está en la
constitución). El código se escribe recién en el sexto.

| Paso | Rol | Usá | Aprueba Carlos |
|---|---|---|---|
| 1 | Analista de negocio | `/speckit-specify` y `/speckit-clarify`: preguntarle todo lo que falte | Sí |
| 2 | Diseñador gráfico, si hay pantallas | `/ux`: maquetas para que elija | Sí |
| 3 | Arquitecto | `/speckit-plan`, con la sección «Seguridad»; ADR si hay una decisión | No |
| 4 | QA | Escenarios numerados en la `spec.md`, con errores, bordes y seguridad | No |
| 5 | Planificador | `/speckit-tasks`: tareas con dependencias | No |
| 6 | Desarrollador | `/speckit-implement`: una prueba por escenario | Lo prueba él |
| 7 | Revisor | El subagente `revisor`, que deja `revision.md` | No |

**Antes de tocar nada, decidí el tamaño del pedido** con las cinco preguntas de la
constitución («Qué tamaño tiene el cambio») y decíselo a Carlos en una línea:

| Tamaño | Cuándo | Dónde se escribe |
|---|---|---|
| Arreglo | El código no cumple lo que la documentación ya dice | No cambia la documentación |
| Funcionalidad nueva | Pantalla o recorrido nuevo, dato nuevo que se guarda, integración, más de una capacidad o más de un día | **Carpeta nueva** en `specs/`, con los siete pasos |
| Cambio de regla | Una regla del negocio nueva o distinta en una capacidad que existe | La `spec.md` de esa capacidad |
| Cambio de interfaz | Una pantalla que existe cambia de un modo que Carlos tiene que ver | Maqueta en la carpeta de la capacidad |
| Ajuste | Un color, un texto, la forma de un botón, el orden de un menú | El `ux.md` o la `spec.md` de la capacidad, o `docs/` |

Solo la funcionalidad nueva crea carpeta; todo lo demás se escribe en la carpeta de la
capacidad que toca. **Ningún cambio queda solo en el código:** si otro agente reconstruyera
la aplicación leyendo solo la documentación, le tiene que salir igual que ahora.

- **Todo en una sola sesión y sin subagentes:** el mismo agente hace los pasos en orden; el único
  subagente es el revisor del final. Se lee la constitución y el `resumen.md` de la capacidad que se toca; la `spec.md`
  y el `ux.md` completos, solo en la parte que se va a cambiar. Si la capacidad no tiene
  resumen, lo escribe quien la lee completa por primera vez.
- **Sin ramas ni pull requests:** todo se sube directo a `master`. `master` es el ambiente de
  pruebas y cada push lo despliega; `produccion` se promueve con
  `git push origin master:produccion` solo cuando Carlos lo pide.
- **Nada avanza sin la aprobación que le toca:** la especificación y, si hay pantallas, la
  maqueta.

## La interfaz

- **La aplicación es una sola y abre en la raíz.** Su código está en
  `clientes/gestion-del-local-web/src/principal/` (se llamó «versión 5» hasta el 2026-10-11).
  Cómo está armada y dónde vive cada cosa:
  [ADR-015](docs/adr/ADR-015-la-interfaz-elegida-es-la-version-5.md). Lo que Carlos pidió de
  ella, que es regla para cualquier cambio:
  [specs/001-base-del-sistema/ux.md](specs/001-base-del-sistema/ux.md), sección «2026-10-11».
- **Tiene dos juegos de pantallas, celular y computadora, en archivos separados, a
  propósito** (decisión 46). Entre los dos: **las reglas son idénticas, la paleta es una sola
  (`paleta.css`) y los textos dicen lo mismo** (`textos.ts`: largos en la computadora, que
  explican; resumidos en el celular). Un cambio de regla o de texto se hace en lo compartido
  o en los dos lados, nunca en uno solo (decisión 47).
- **Las versiones 1 a 4 son históricas** (`historico/`): se conservan para ver su maquetado.
  No se usan, no se prueban y **no reciben ninguna funcionalidad nueva**. Su código
  (`src/pantallas`, `src/componentes`, `src/escritorio`, `src/v2`, `src/v4`) está congelado:
  la aplicación no importa nada de ahí. Lo único que comparten es lo común de `src/`
  (la llamada a la API, el catálogo, el envío sin conexión, la sesión).
- **Solo la aplicación principal tiene pruebas.** Un cambio en una pantalla va con su prueba
  en `src/principal/` y, si toca un camino principal, en `tests/e2e/`.
- **Cada cosa que Carlos decide** se anota con su número en
  [docs/decisiones-de-negocio.md](docs/decisiones-de-negocio.md) y, si es una regla, en la
  `spec.md` de la capacidad.

## Cada pedido es una tarea, y se anota en `tasks.md`

`tasks.md` es la fuente de verdad de las tareas; lo lee el tablero del portafolio. **Los
issues de GitHub no se usan.**

- **El plan** está en `proyecto/tasks.md`: lo previsto, por etapa. El trabajo nuevo que
  aparece y no se hace ahora se anota ahí, con `[carlos]` o `[agente]`.
- **El trabajo** se anota en el `tasks.md` de su carpeta de `specs/`, antes de empezarlo:
  `- [ ] T014 [ajuste] El botón de Google va azul y redondeado`.
- **Antes de tocar el código:** `node tests/compuerta.mjs empezar 003-T014`. Dice qué documentos
  le faltan a la tarea según su tamaño. Sin eso, la compuerta no deja editar el código.
- **Cada commit nombra su tarea** al final del título: `(003-T014)`.
- **Al terminar:** marcarla `[x]` y `node tests/compuerta.mjs terminar 003-T014`.

Las preguntas y las consultas que no cambian nada en el repositorio no llevan tarea.

## Qué no decide el agente

- **El alcance.** Un requerimiento nuevo, o uno que cambia, se le pregunta a Carlos.
- **Las fechas y las prioridades.**
- **Lo que cruza proyectos** (impuestos, marcas, prioridad entre proyectos): se trata en la
  sesión del portafolio. Este agente no toca otros repositorios.

## Lo que lee el tablero del portafolio

El tablero (<https://gratis-vnic.tail994934.ts.net:8444/>) lee `specs/README.md`,
`proyecto/estado.yml`, `proyecto/proyecto.yml`, `proyecto/riesgos.yml` y los `tasks.md`.

- En `proyecto/estado.yml`, el `estado` de cada requerimiento empieza con `Hecho`,
  `Hecho en parte`, `A validar`, `Pendiente` o `Nuevo`. Si dice `fuera de esta etapa` o
  `segunda versión`, no cuenta para el avance. Un `#19` nombra la tarea `T019` de `proyecto/tasks.md`.
- En los YAML de `proyecto/`, un texto con ` #` o `: ` adentro va entre comillas.

## Comandos

```bash
tests/utest.sh               # unitarias, sin nada levantado
node tests/trazabilidad.mjs  # la especificación y el estado coinciden, y specs/ no nombra código
tests/itest.sh --rapido      # paridad de configuración
tests/e2e.sh                 # caminos principales de la aplicación, en celular y computadora (levanta el stack)
tests/capturas/levantar.sh   # API de mentira y cliente, para mirar pantallas sin Docker
python tests/capturas/capturar.py vender   # captura una pantalla de la aplicación en computadora y celular
```

Para mirar o comparar una pantalla, usá `tests/capturas/` ([cómo](tests/capturas/README.md))
en vez de armar algo nuevo; lo que le falte, agregalo ahí.

Cómo levantarlo: [specs/001-base-del-sistema/quickstart.md](specs/001-base-del-sistema/quickstart.md).
Operación del servidor: [docs/operacion/](docs/operacion/).

## Qué sigue

Este archivo no dice qué está hecho ni qué va primero. El avance está en
[proyecto/estado.yml](proyecto/estado.yml) y en el tablero; las tareas y su orden, en
`proyecto/tasks.md`; lo que falta decidir, en
[specs/preguntas-abiertas.md](specs/preguntas-abiertas.md).
