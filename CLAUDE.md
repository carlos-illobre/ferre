# ferre (Ferrebress)

Contexto que no se deduce leyendo el código. Lo demás está en el [README](README.md), en
[docs/](docs/) y en los [ADR](docs/adr/README.md): antes de cambiar algo que tenga un ADR,
leerlo.

## La fuente de verdad

Este repositorio es la fuente de verdad del proyecto. El tablero del portafolio
(<https://gratis-vnic.tail994934.ts.net:8444/>) lo lee y lo muestra; no guarda nada propio.

| Qué | Dónde |
|---|---|
| Requerimientos funcionales y no funcionales, y casos de uso | `docs/REQUERIMIENTOS.md` |
| Objetivos, interesados, supuestos, restricciones y cronograma | `proyecto/proyecto.yml` |
| Riesgos, con su plan y su contingencia | `proyecto/riesgos.yml` |
| Tareas | Issues de GitHub; cada etapa es un milestone |

Si lo que se hace no coincide con lo que dice `docs/REQUERIMIENTOS.md`, manda el documento: o se corrige el
trabajo, o se le pregunta a Carlos si cambia el requerimiento.

## Cómo se toma una tarea

1. **Solo tareas listas para empezar:** abiertas y con todo lo que figura en su «Depende de»
   ya cerrado. El tablero las marca; en el VPS también se pueden pedir con
   `curl -s http://127.0.0.1:8083/api/portafolio` (campo `lista` de cada tarea).
2. **Leer antes de tocar:** el requerimiento de `docs/REQUERIMIENTOS.md` que la tarea implementa, `docs/ux.md` si toca una pantalla, `docs/proceso-actual.md` si toca el mostrador, y los ADR relacionados.
3. **Proponer y esperar.** Antes de codear un issue se propone la solución y se espera la aprobación de Carlos (regla del README).
4. **Al terminar:** pruebas en verde (`tests/utest.sh`; si toca un camino principal, su escenario E2E en `tests/e2e.sh`), cambiar el estado del requerimiento en `docs/REQUERIMIENTOS.md` de `Pendiente (#N)` a `Hecho (#N)`, actualizar la documentación que haya quedado vieja y cerrar el issue.
5. **Trabajo nuevo que aparece:** un issue nuevo, con su etapa (milestone) y, si
   corresponde, su sección `## Depende de` con los `#N`. No se hace de paso.

## Qué no decide el agente

- **El alcance.** Un requerimiento nuevo, o uno que cambia, se le pregunta a Carlos. Recién con su
  respuesta se edita el documento, y se anota en la sección de decisiones con la fecha.
- **Las fechas del cronograma** y las prioridades entre etapas.
- **Lo que cruza proyectos:** el encuadre impositivo del CUIT, las marcas y la prioridad
  entre proyectos se tratan en la sesión del portafolio, no acá. Este agente no toca
  otros repositorios.

## Formato que el tablero entiende

- **Estado de un requerimiento:** tiene que empezar con `Hecho`, `Hecho en parte`, `A validar`,
  `Pendiente` o `Nuevo`. Si contiene `fuera de esta etapa` no cuenta para el avance. Los
  `#N` del estado se enlazan a esos issues.
- **Issue:** `## Depende de` seguido de `#13, #15` lo deja bloqueado hasta que se cierren.
  `Inicio: 2026-10-01` y `Fin: 2026-10-15`, cada una en su línea, le dan barra propia en
  el Gantt.
- **YAML:** un texto que tenga ` #` o `: ` adentro va entre comillas; si no, se corta o
  rompe el archivo.
- **Riesgos:** probabilidad e impacto de 1 a 5. Un riesgo nuevo, o uno que cambió, se
  actualiza en `proyecto/riesgos.yml`; uno que ya no aplica pasa a `estado: cerrado`.

## Reglas de este repositorio

- **`master` es el ambiente de pruebas y cada push lo despliega solo.** `produccion` es
  producción: se promueve con `git push origin master:produccion` y solo cuando Carlos lo
  pide.
- **Hay dos interfaces (ADR-014).** La de celular (`src/App.tsx`, `src/pantallas/`) está bien
  como está; la de computadora vive en `src/escritorio/`. Se elige por el ancho de la pantalla
  y no comparten estilos. Una función nueva con pantalla se hace en las dos, con su prueba.
  Un cambio para la computadora no puede alterar el celular: se verifica con capturas de las
  dos, antes y después.
- **Roles, no actores.** En pantallas, casos de uso y diagramas se nombra el rol
  (Administrador, Vendedor, Comprador); los actores (Dueño, Empleado, Cliente, Proveedor)
  solo donde el rol no alcanza. Ver `docs/REQUERIMIENTOS.md`, sección 2.
- **La vara es el cuaderno y la calculadora** (`docs/ux.md`): si una pantalla es más lenta
  que eso, está mal aunque sea más completa.
- **`privado/` y las listas de precios reales nunca se suben.** El repositorio es público.
- Todo en español: código, comentarios, commits y textos de la app.

## Prioridad actual

1. La interfaz de escritorio (RNF-05): desde el 2026-10-09 volvió el layout de tablas
   anterior al rediseño, a toda la pantalla y con la paleta nueva. Falta que Carlos la valide
   en la notebook; lo que pida ajustar va primero.
2. Los respaldos (RNF-21 a RNF-23, issue #19): todavía no están implementados.
