# Tasks: Configuración

Funcionalidad nueva: pantalla «Configuración» en Más, con las preferencias personales del
dispositivo: las animaciones, trabajar sin conexión en el celular y cómo buscar productos.
Carlos aprobó la especificación y la maqueta el 2026-10-13. Todo lo que hay en Configuración
es personal: de esa persona en ese dispositivo.

## Tareas

- [x] T001 Pantalla Configuración en Más, con la opción de habilitar o deshabilitar las animaciones
- [x] T002 En el celular, guardar datos para trabajar sin conexión solo si la persona lo habilita en Configuración (deshabilitado de arranque) (depende de T001)
- [x] T003 En el celular, con el guardado deshabilitado, elegir entre bajar el catálogo al abrir o buscar en el servidor (depende de T002)
- [x] T004 Corregir lo que encontró la revisión independiente: qué es un celular, la falla de red al leer un código, el espejo buscando en el servidor y los números de requerimiento repetidos (depende de T003)
- [x] T005 [regla] Elegir en Configuración cada cuánto se busca una versión nueva: 5 min, 15 min, 1 hora o 24 horas, o apagarlo (decisión 92) (RF-96, pedido de Carlos del 2026-10-16)
