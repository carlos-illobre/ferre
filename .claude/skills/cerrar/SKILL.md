---
name: cerrar
description: Cierra una funcionalidad de ferre ya verificada y aprobada por Carlos. Incorpora lo que cambió a la especificación de su capacidad, actualiza el índice, escribe el ADR si hubo una decisión técnica, une la rama y cierra el issue. Usar solo después del veredicto del verificador.
---

# Cierre de una funcionalidad

## Condiciones

No cierres si falta alguna:

- `verificacion.md` tiene veredicto «Aprobada» y Carlos la aprobó.
- Todas las casillas de `tasks.md` están tildadas, o las que no, explicadas.
- `tests/utest.sh` y `node tests/trazabilidad.mjs` pasan.

## Pasos

1. **Lo vigente.** En la `spec.md` y el `ux.md` de cada capacidad que la funcionalidad toca
   (`specs/001` a `specs/007`), incorporá los requerimientos y escenarios nuevos o
   cambiados, sin nombrar archivos del código ni decir si están hechos. Al lado de cada uno, una nota: `(cambió con specs/NNN-nombre, AAAA-MM-DD)`.
   Lo que dejó de valer se quita de la capacidad; su historia queda en la carpeta de la
   funcionalidad.
2. **El índice y el estado.** Si hay requerimientos nuevos, sumalos a `specs/README.md`
   (ID, texto y carpeta; el índice no dice si están hechos). En `proyecto/estado.yml`,
   actualizá el `estado` de cada requerimiento tocado (empieza con `Hecho`,
   `Hecho en parte`, `A validar`, `Pendiente` o `Nuevo`), sus `pruebas` y sus `defectos`:
   un defecto resuelto se quita.
3. **Las decisiones.** Si `plan.md` o `research.md` tomaron una decisión técnica que afecta
   a más de una funcionalidad, escribí su ADR en `docs/adr/` y sumalo al índice de ADR.
4. **El estado.** En la `spec.md` de la funcionalidad, `Status` pasa a `Implemented`, con
   la fecha.
5. **La rama.** Uní la rama de la funcionalidad a `master` y subila. Cada push a `master`
   despliega el ambiente de pruebas.
6. **El issue.** Cerralo con un comentario que enlace la carpeta de la funcionalidad.
7. Contale a Carlos qué quedó cerrado y qué requerimientos cambiaron de estado.
