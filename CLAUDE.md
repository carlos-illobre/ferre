# ferre (Ferrebress)

Sistema de gestión de una ferretería de barrio. Se desarrolla con **spec driven
development sobre GitHub Spec Kit**: no se escribe código de una funcionalidad sin su
especificación aprobada.

## Por dónde empezar

1. [.specify/memory/constitution.md](.specify/memory/constitution.md): lo que no se
   negocia y el flujo de trabajo. **Leela antes de tocar nada.**
2. [specs/README.md](specs/README.md): de qué se trata el proyecto, cada requerimiento con
   su estado y en qué carpeta está especificado.
3. La carpeta de `specs/` de la capacidad que vayas a tocar (`001` a `007` son lo ya
   construido).
4. [docs/adr/](docs/adr/README.md): el porqué de cada decisión técnica.

## Cómo se trabaja

| Querés | Usá |
|---|---|
| Especificar una funcionalidad nueva | `/speckit-specify`, y `/speckit-clarify` para cerrar dudas con Carlos |
| Diseñar sus pantallas | `/ux` |
| Planificarla | `/speckit-plan`, `/speckit-tasks`, `/speckit-analyze` |
| Escribir sus pruebas antes del código | subagente `qa` |
| Implementarla | `/speckit-implement` |
| Revisarla | subagentes `seguridad`, `revision-ux` y `verificador` |
| Cerrarla | `/cerrar` |

- **Una funcionalidad, una rama** con el nombre de su carpeta. `master` es el ambiente de
  pruebas y cada push lo despliega; `produccion` se promueve con
  `git push origin master:produccion` solo cuando Carlos lo pide.
- **Carlos aprueba tres veces:** la especificación, el diseño de pantallas y el resultado
  verificado. Nada avanza sin la aprobación que le toca.
- **Lo que falta hacer son los issues abiertos de GitHub.** Se toma uno solo si todo lo que
  figura en su `## Depende de` está cerrado. Al tomarlo se le crea su carpeta en `specs/`.
- **Un arreglo que no cambia lo que el usuario ve o puede hacer** no necesita
  especificación: va directo, con su prueba.
- **Trabajo nuevo que aparece:** un issue nuevo con su etapa (milestone). No se hace de paso.

## Qué no decide el agente

- **El alcance.** Un requerimiento nuevo, o uno que cambia, se le pregunta a Carlos.
- **Las fechas y las prioridades.**
- **Lo que cruza proyectos** (impuestos, marcas, prioridad entre proyectos): se trata en la
  sesión del portafolio. Este agente no toca otros repositorios.

## Lo que lee el tablero del portafolio

El tablero (<https://gratis-vnic.tail994934.ts.net:8444/>) lee `specs/README.md`,
`proyecto/proyecto.yml`, `proyecto/riesgos.yml` y los issues.

- En `specs/README.md`, el estado de cada requerimiento empieza con `Hecho`,
  `Hecho en parte` (o `Parcial`), `A validar`, `Pendiente` o `Nuevo`. Si dice
  `fuera de esta etapa` o `segunda versión`, no cuenta para el avance.
- En un issue, `## Depende de` seguido de `#13, #15` lo deja bloqueado hasta que se cierren.
- En los YAML de `proyecto/`, un texto con ` #` o `: ` adentro va entre comillas.

## Comandos

```bash
tests/utest.sh               # unitarias, sin nada levantado
node tests/trazabilidad.mjs  # cada escenario de specs/ nombra una prueba que existe
tests/itest.sh --rapido      # paridad de configuración
tests/e2e.sh                 # caminos principales, en las dos interfaces (levanta el stack)
```

Cómo levantarlo: [specs/001-base-del-sistema/quickstart.md](specs/001-base-del-sistema/quickstart.md).
Operación del servidor: [docs/operacion/](docs/operacion/).

## Prioridad actual

1. Que Carlos valide en la notebook la interfaz de computadora (RNF-05).
2. Los respaldos (RNF-21 a RNF-23, issue #19): todavía no están implementados.
