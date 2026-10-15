# Plan: Secciones de «Cómo va el negocio», cada una con su permiso

**Spec**: [spec.md](spec.md) (aprobada el 2026-10-15) · **Maqueta**: `maquetas/elegida.html`
(aprobada el 2026-10-15) · **UX**: [ux.md](ux.md)

## Resumen técnico

No hay tecnología nueva ni decisión de arquitectura: se repite lo que ya existe.

- **Permisos (ADR-017, RF-72).** Se sacan del catálogo fijo `negocio.numeros` y se agregan
  `negocio.ventas` («Ver las ventas del negocio»), `negocio.gastos` («Ver los gastos») y
  `negocio.invertido` («Ver el dinero invertido»), en la parte «Negocio». El catálogo del
  servidor sigue siendo la única fuente; la lista del cliente se actualiza igual.
- **Migración nueva.** A cada rol que tiene `negocio.numeros` (el Gerente y cualquiera que
  haya armado el negocio) se le dan los tres nuevos, y se le quita `negocio.numeros`. Es
  configuración, no un histórico: el principio V no aplica. No se edita ninguna migración
  aplicada.
- **Rutas del servidor**, cada dato con su permiso:
  - Ventas del día: `ventas.ver` o `negocio.ventas` (antes `negocio.numeros`).
  - Lo que preguntaron y no llevaron (lectura): `negocio.ventas`.
  - Gastos de la semana: `negocio.gastos`.
  - Stock: el valor en pesos (por producto, por proveedor y total) solo con
    `negocio.invertido`; sin él, las cantidades con valor en cero, como hoy.
  - Las compras recientes siguen con `deposito.compras` o `deposito.ingresos`.
- **Cliente, lo compartido.** Las tres secciones, su orden y el permiso de cada una se
  definen una vez (como las pestañas de Usuarios, decisión 88) y las usan las dos
  interfaces. Los textos (nombres y frases de cada sección, el aviso sin permiso) van en los
  textos compartidos, largos en la computadora y cortos en el celular.
- **Computadora.** Las secciones son pestañas de la opción «Cómo va el negocio» de Más,
  igual que Usuarios: cada una con su dirección (`resumen`, `gastos`, `invertido`), sin
  atajo Alt, recorridas con las flechas; la opción de Más abre la primera que se ve. En
  estas tres pantallas no se dibuja «Volver a Más». «Actualizar» con ícono en cada sección.
- **Celular.** Igual que Más → Usuarios: `mas/negocio`, `mas/gastos` y `mas/invertido`,
  con el título y las pestañas arriba; con una sola sección, sin pestañas.
- **Lo que no es del negocio** (quién entró, la conexión, el estado del servidor y el
  ambiente de prueba) queda donde está, debajo del contenido, en cualquier sección.

## Seguridad

- **Datos que toca:** importes del negocio (ventas, gastos, dinero invertido) y lo que
  preguntaron clientes sin comprar. No hay datos personales nuevos.
- **Quién puede cada cosa:** lo dice la lista de arriba. El control está en el servidor, en
  cada ruta: el cliente solo oculta lo que el servidor igual negaría. Una ruta que hoy pedía
  `negocio.numeros` y queda sin permiso equivalente sería una fuga: por eso se buscan todas
  las que lo nombran y cada una pasa a uno de los tres nuevos.
- **Qué entra desde afuera:** nada nuevo. Las claves de permiso que se le dan a un rol ya se
  validan contra el catálogo fijo; `negocio.numeros` deja de ser válida y un rol no la puede
  volver a recibir.
- **Secretos:** ninguno.
- **Registro de quién hizo qué:** la migración no es una acción de un usuario y no deja
  evento. Cambiar los permisos de un rol desde la aplicación ya queda registrado.

## Riesgos

- Una sesión abierta antes del cambio trae la lista de permisos vieja hasta que se vuelve a
  pedir: el servidor ya decide con la nueva, así que a lo sumo la pantalla muestra una
  sección que el servidor niega (se ve el error del bloque) hasta recargar.
- Las pruebas de punta a punta que entraban a `#/resumen` o `#/mas/negocio` para ver las
  compras recientes pasan a la sección Compras.
