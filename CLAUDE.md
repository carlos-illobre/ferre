# ferre (Ferrebress)

Sistema de gestión de una ferretería de barrio. Se desarrolla con **spec driven
development sobre GitHub Spec Kit**: no se escribe código de una funcionalidad sin su
especificación aprobada.

## Por dónde empezar

1. [.specify/memory/constitution.md](.specify/memory/constitution.md): lo que no se
   negocia y el flujo de trabajo. **Leela antes de tocar nada.**
2. [specs/README.md](specs/README.md): de qué se trata el proyecto, cada requerimiento y en
   qué carpeta está especificado.
3. La carpeta de `specs/` de la capacidad que vayas a tocar (`001` a `007`, una por
   capacidad, con todos sus requerimientos).
4. [proyecto/estado.yml](proyecto/estado.yml): qué está hecho hoy, con qué pruebas, y dónde
   el código se aparta de la regla.
5. [docs/adr/](docs/adr/README.md): el porqué de cada decisión técnica.

**La especificación no depende del código.** Lo fijo son las reglas de negocio; el código
puede rehacerse. `specs/` nunca nombra archivos del código ni dice si algo está hecho: eso
vive en `proyecto/estado.yml`.

## Cómo se trabaja

Cuatro roles, y ninguno más (el detalle está en la constitución):

| Paso | Rol | Usá | Aprueba Carlos |
|---|---|---|---|
| 1 | Analista de negocio | `/speckit-specify`, y `/speckit-clarify` para preguntarle a Carlos | Sí |
| 2 | Diseñador, si hay pantallas nuevas | `/ux`: maquetas para que elija | Sí |
| 3 | Planificador | `/speckit-plan` y `/speckit-tasks` | No |
| 4 | Desarrollador | `/speckit-implement` | Lo prueba en el ambiente de pruebas |

- **Un arreglo** que no cambia ninguna regla va solo con el desarrollador, con su prueba.
- **Un cambio de regla** dentro de una capacidad va con analista y desarrollador: la regla
  se escribe directamente en la `spec.md` de la capacidad, sin carpeta propia.
- **Toda lista de tareas termina con tres:** una prueba por escenario, comparar con la
  maqueta aprobada si hay pantallas, y dejar al día `proyecto/estado.yml`, la `spec.md` de
  la capacidad y el issue.
- **Sin ramas ni pull requests:** todo se sube directo a `master`. `master` es el ambiente de
  pruebas y cada push lo despliega; `produccion` se promueve con
  `git push origin master:produccion` solo cuando Carlos lo pide.
- **Nada avanza sin la aprobación que le toca:** la especificación y, si hay pantallas, la
  maqueta.
- **Lo que falta hacer son los issues abiertos de GitHub.** Se toma uno solo si todo lo que
  figura en su `## Depende de` está cerrado. Al tomarlo se le crea su carpeta en `specs/`.
- **Trabajo nuevo que aparece:** un issue nuevo con su etapa (milestone). No se hace de paso.

## Qué no decide el agente

- **El alcance.** Un requerimiento nuevo, o uno que cambia, se le pregunta a Carlos.
- **Las fechas y las prioridades.**
- **Lo que cruza proyectos** (impuestos, marcas, prioridad entre proyectos): se trata en la
  sesión del portafolio. Este agente no toca otros repositorios.

## Lo que lee el tablero del portafolio

El tablero (<https://gratis-vnic.tail994934.ts.net:8444/>) lee `specs/README.md`,
`proyecto/estado.yml`, `proyecto/proyecto.yml`, `proyecto/riesgos.yml` y los issues.

- En `proyecto/estado.yml`, el `estado` de cada requerimiento empieza con `Hecho`,
  `Hecho en parte`, `A validar`, `Pendiente` o `Nuevo`. Si dice `fuera de esta etapa` o
  `segunda versión`, no cuenta para el avance. Los `#N` se enlazan a esos issues.
- En un issue, `## Depende de` seguido de `#13, #15` lo deja bloqueado hasta que se cierren.
- En los YAML de `proyecto/`, un texto con ` #` o `: ` adentro va entre comillas.

## Comandos

```bash
tests/utest.sh               # unitarias, sin nada levantado
node tests/trazabilidad.mjs  # la especificación y el estado coinciden, y specs/ no nombra código
tests/itest.sh --rapido      # paridad de configuración
tests/e2e.sh                 # caminos principales, en las dos interfaces (levanta el stack)
```

Cómo levantarlo: [specs/001-base-del-sistema/quickstart.md](specs/001-base-del-sistema/quickstart.md).
Operación del servidor: [docs/operacion/](docs/operacion/).

## Qué sigue

Este archivo no dice qué está hecho ni qué va primero. El avance está en
[proyecto/estado.yml](proyecto/estado.yml) y en el tablero; las tareas y su orden, en los
issues y sus etapas; lo que falta decidir, en
[specs/preguntas-abiertas.md](specs/preguntas-abiertas.md).
