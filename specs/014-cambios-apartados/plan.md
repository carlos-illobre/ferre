# Plan: Lo que hizo sin conexión alguien a quien desactivaron, apartado para revisar

**Spec**: [spec.md](spec.md) (aprobada el 2026-10-17) · **Maqueta**: `maquetas/para-revisar-c-*.png`
(aprobada el 2026-10-17) · **Decisión técnica**: [ADR-021](../../docs/adr/ADR-021-lo-apartado-se-sube-con-la-sesion-cerrada-y-se-acepta-repitiendo-el-pedido.md)

## Resumen técnico

- **Base.** Una tabla nueva de cambios apartados: de qué usuario y de qué sesión, el
  dispositivo de esa sesión, el tipo, el método, la ruta y el cuerpo tal como estaban en la
  cola, cuándo se hizo según el dispositivo, cuándo llegó, y la decisión (aceptado o
  descartado), quién la tomó, cuándo y, si no se pudo aceptar, por qué. La sesión y el número
  de orden de la cola son únicos juntos: el mismo cambio no se guarda dos veces.
- **Servidor, tema `apartados` en tres capas (ADR-018).**
  - `POST /apartados`: lo sube el dispositivo con el token de la sesión cerrada (ADR-021).
    Sesión existente de un usuario desactivado: guarda los cambios y contesta cuántos. Usuario
    activo: 409. Token desconocido: 401. Hasta 200 cambios por pedido; cada uno de un tipo
    conocido con su ruta (venta `POST /ventas`, «no llevó» `POST /consultas`, ajuste
    `POST /stock/:id/ajustes`, cambio de producto `PATCH /productos/:id`, renglón de conteo
    `PUT|DELETE /conteos/:id/renglones/:id`); si alguno no lo es, se rechaza todo el pedido.
    Con límite de intentos por dirección, como los demás puntos sin sesión.
  - `GET /apartados`, `POST /apartados/:id/aceptar` y `POST /apartados/:id/descartar`: con
    «Administrar usuarios». La lista trae lo pendiente, de lo más viejo a lo más nuevo, con el
    nombre de quien lo hizo, cuándo se cerró su sesión y el dispositivo, y una descripción
    legible de cada cambio (qué es, el producto, el importe) armada en el servidor.
  - Aceptar: dentro de una transacción que bloquea el cambio, se repite el pedido original con
    la identidad de quien lo hizo (ADR-021); si la ruta contesta un error, se guarda el motivo
    y el cambio sigue apartado; si sale bien, queda aceptado. Descartar: queda descartado.
    Cada decisión se anota en el registro de quién hizo qué, a nombre de quien decidió.
  - La identidad interna: el control de sesión del servidor toma la sesión del entorno del
    pedido si el servidor la puso ahí; desde la red ese entorno no se puede llenar.
- **Cliente, lo compartido.**
  - El cliente del servidor avisa qué token se perdió al recibir un 401. La cola de Ferrebress
    lo guarda junto a quién era (el autor de los cambios) y sube lo de esa persona a
    `/apartados`; si sale bien, lo saca del dispositivo. Si no hay conexión, lo intenta de nuevo
    al volver; con 409 o 401 deja de intentar y los cambios quedan en el dispositivo.
  - Las pestañas de Anomalías, su orden y el permiso de cada una se definen una vez (como las de
    Usuarios): «Para revisar» (`admin.usuarios`) y «Anotadas» (`negocio.anomalias`). La opción
    de Más se ve con cualquiera de los dos y abre la primera que se ve.
  - La pantalla «Para revisar» es una sola para las dos interfaces, como Anomalías: agrupa por
    persona, una tarjeta por cambio con «Aceptar» y «Descartar»; sin conexión no deja decidir.
  - La cantidad pendiente va a la derecha del nombre de la pestaña, en las dos interfaces.
- **Computadora.** Anomalías pasa a ser una opción de Más con pestañas, como Usuarios y Cómo
  va el negocio: `para-revisar` y `anomalias`, sin atajo Alt.
- **Celular.** `mas/para-revisar` y `mas/anomalias`, con el título y las pestañas arriba.

## Seguridad

- **Datos que toca:** ventas, stock, márgenes y conteos de una persona desactivada; el token de
  una sesión cerrada.
- **Quién puede:** subir, solo el dispositivo que tiene el token de una sesión de un usuario
  desactivado; ver, aceptar y descartar, solo quien tiene «Administrar usuarios». El servidor lo
  controla en cada ruta, no solo la pantalla.
- **Abusos posibles y su límite:**
  - Un token robado de alguien desactivado solo deja apartar cambios, que no se aplican hasta
    que alguien con permiso los acepta y los ve antes de aceptarlos.
  - Un cambio apartado no puede apuntar a otra ruta que la de su tipo: no se puede usar para
    llegar a la administración ni a ninguna ruta que la cola no use.
  - Al aceptar, corren las reglas y los permisos de la ruta original con los permisos actuales
    de quien lo hizo: no gana nada que no tuviera.
  - Tamaño: hasta 200 cambios por pedido y el límite de cuerpo del servidor; límite de intentos
    por dirección.
  - La identidad interna para repetir el pedido no se puede pasar desde la red.
- **Registro:** cada aceptación y cada descarte quedan en el registro de quién hizo qué, con quién
  decidió, qué cambio y de quién era.

## Pruebas

- Servidor (unitarias de rutas, con la base simulada): subir (E01, E03, E04, E14 a E17),
  listar y permisos (E05, E11 a E13), aceptar repitiendo como quien lo hizo (E06), descartar
  (E07), un cambio que ya no se puede aplicar (E08), decidir dos veces (E18).
- Cliente: la cola sube lo de quien salió y lo saca del dispositivo (E01, E03), las pestañas y
  la pantalla en las dos interfaces (E05, E09 a E12, E19).
- De punta a punta: una venta apartada de una persona desactivada, aceptada desde Anomalías, en
  computadora y en celular (E06).
