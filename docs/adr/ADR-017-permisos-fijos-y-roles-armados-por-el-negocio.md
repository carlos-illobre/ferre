# ADR-017: Permisos fijos en el código y roles armados por el negocio

**Estado:** Aceptado
**Fecha:** 2026-10-11
**Enmienda a:** [ADR-011](ADR-011-autenticacion-sin-contrasenas.md) (roles)

---

## Contexto

El sistema tenía un rol por usuario, fijo en el código (`dueño`, `admin`, `mostrador`), y casi
todas las operaciones pedían solo una sesión. Carlos definió cinco funciones del negocio, que
una persona puede combinar, y pidió que los roles se puedan armar desde la aplicación sin tocar
el código (decisión 50).

## Opciones consideradas

1. **Cinco roles fijos en el código, varios por usuario.** Simple, pero cada cambio en el
   reparto de tareas pide programar.
2. **Permisos y roles libres, los dos editables.** Un permiso que nadie programó no protege
   nada: los permisos tienen que corresponder a controles reales del servidor.
3. **Permisos fijos en el código y roles editables que los agrupan.** Elegida.

## Decisión

- **Los permisos son una lista fija en el servidor** (`src/permisos.ts`): clave, nombre,
  explicación y parte de la aplicación. Es la única fuente: la pantalla los pide al servidor.
  Sumar un permiso es agregarlo ahí y usarlo en la ruta; no pide migración.
- **Cada ruta declara el permiso que exige** (`exigirPermiso`). Sin el permiso, 403 con el
  nombre del permiso que falta. Lo que no declara permiso pide solo sesión.
- **Los roles viven en la base** (`rol`, `rol_permiso`, `usuario_rol`) y se administran desde
  la aplicación. La sesión lleva los nombres de los roles y la unión de sus permisos.
- **La pantalla decide qué mostrar con los mismos permisos** (`puede(usuario, clave)`), pero
  eso es comodidad: quien decide es el servidor.
- **Una sola función cuida que siempre quede quien administre** (`quedaQuienAdministre`): se
  consulta antes de cualquier cambio en un rol, en su asignación o en el estado de un usuario.
- La columna `usuario.rol` queda como dato viejo, sin uso.

## Consecuencias

- Cada request resuelve los permisos del usuario junto con su sesión (una consulta más
  liviana, sobre tablas chicas).
- Un permiso nuevo no lo tiene ningún rol hasta que alguien se lo dé desde la pantalla.
- Las versiones históricas de la interfaz leen el rol viejo: pueden mostrar opciones que el
  servidor ya no les deja usar. Se acepta: no se usan.
