# Plan: Auditoría, un servicio que junta lo que hizo cada uno en todos los servicios (027)

## Contexto técnico (cómo está hoy, después de 026)

- Comercial anota cada acción en su tabla `evento` (`persistencia/eventos.ts`, `anotarEvento`),
  dentro de la transacción de la acción. «Quién hizo qué» la lee de ahí
  (`GET /auditoria`, `persistencia/actividad.ts`): de a 10, filtros por persona, por el comienzo
  del tipo y por fechas, con el nombre de la persona leído de la tabla de usuarios.
- Procesos anota lo suyo en `procesos.evento` (026).
- La regla «deshacer la unión de dos productos» lee el evento `producto.unido` para saber qué
  filas mover de vuelta (`persistencia/duplicados.ts`).
- La web arma el nombre, el ícono, el color y el detalle de cada acción con tablas por tipo
  (`pantallas/comun/negocio/que-fue.ts` y `detalle-del-evento.ts`), y la lista del filtro «qué»
  (`TIPOS`) también es una tabla de tipos.
- Las bases de cada servicio y sus usuarios los crea `microservices/base-de-datos/iniciar.sh`,
  **una sola vez**, con el volumen vacío: una base nueva no aparece en un ambiente que ya existe.

## Decisiones

**El contrato v1** (`docs/auditoria/contrato-v1.md`). Un evento es un objeto JSON:

| Campo | Obligatorio | Qué es |
|---|---|---|
| `id` | sí | uuid que pone el servicio; Auditoría no guarda dos veces el mismo |
| `servicio` | sí | quién lo manda (`comercial`, `procesos`…) |
| `tipo` | sí | `cosa.accion` |
| `fecha` | sí | ISO 8601, la hora de la base del servicio |
| `quien` | no | `{ id, nombre }` en ese momento; sin quién, «el sistema» |
| `dispositivo` | no | texto |
| `titulo` | sí | lo que se lee en la lista («Venta cobrada») |
| `detalle` | no | la línea de abajo |
| `grupo` | sí | para el filtro «qué» («Ventas», «Procesos») |
| `importancia` | sí | `normal`, `revisar` o `anulacion` |
| `referencias` | no | `[{ cosa, id }]` |
| `contenido` | no | objeto libre |

Se entrega con `POST /v1/eventos` a Auditoría por la red interna, en lotes de hasta 100, con el
token entre servicios. La respuesta dice cuántos se guardaron; un `id` repetido cuenta como
guardado y no se duplica. Un lote con un evento mal formado se rechaza entero (400) diciendo cuál
y por qué. Solo se le agregan campos opcionales; un cambio que rompa es `v2`.

**El kit** (`microservices/auditoria-kit`, paquete del workspace, sin nada de Ferrebress, como el
módulo de conexión): lo usan Comercial y Procesos desde su capa de datos.

- `bandejaDeAuditoria({ base, conexion, servicio, auditoria, token })` devuelve
  `{ encendida, anotar, iniciar, mandar, parar }`. Sin `auditoria` (la variable `AUDITORIA_URL`
  vacía en el `.env`), `anotar` no hace nada e `iniciar` no crea la bandeja ni manda: el servicio
  funciona igual (E09). `AUDITORIA_URL` va en el `.env` de cada ambiente; el compose la exige
  presente, vacía o no.
- `anotar(trx, evento)` inserta en `auditoria_bandeja` de la base del servicio, en la
  transacción de la acción, y avisa con `pg_notify` al confirmarse (E05). Un evento que no
  cumple el contrato **no deshace la acción**: queda en la bandeja con `rechazo` (el motivo) y no
  se manda; lo mismo uno que Auditoría rechazó. Un lote rechazado se manda de a uno, para apartar
  solo el malo. Los apartados no se borran solos.
- El mandador escucha ese aviso (y manda lo pendiente al arrancar, E08): toma pendientes en lotes
  con `FOR UPDATE SKIP LOCKED` (dos copias del servicio no mandan el mismo, borde), los entrega,
  y marca `entregado_en` al confirmar. Si Auditoría no responde (o no contesta en 10 s), reintenta
  con esperas crecientes hasta un minuto (E06), sin frenar al servicio; con un reintento
  esperando, los avisos nuevos no suman otros. Borra lo entregado hace más de 7 días (E10, E11).
- La bandeja la crea el kit al iniciar (`CREATE TABLE IF NOT EXISTS`): un servicio apagado no la
  tiene.
- Pruebas contra PostgreSQL al 100 %, como la capa de datos (RNF-66).

**El servicio de Auditoría** (`microservices/auditoria`, Node con Hono, como Procesos): su base
`auditoria`, su capa de datos, `POST /v1/eventos` (solo con el token, E14) y los reportes en
`GET /auditoria` (filtros de hoy, de a 10) y `GET /auditoria/grupos` (para el filtro «qué»). Los
reportes los ve quien tiene el permiso que dice su `.env` (`PERMISO_REPORTES`), leído de
`X-Permisos` que pone la puerta (E03). La tabla de eventos solo suma filas: su usuario de base
no puede cambiar ni borrar (RNF-30).

**La puerta** reparte `/auditoria*` a Auditoría, preguntando quién es como con Procesos. Las
entregas (`/v1/eventos`) no pasan por la puerta: van por la red interna.

**Las bases nuevas aparecen solas** (`microservices/base-de-datos/asegurar.sh`): el script de
arranque pasa a ser repetible y corre también en el control de salud del contenedor. Crea las
bases y los usuarios que falten según las claves del `.env` (`CLAVE_BASE_<SERVICIO>`) y no toca
los que ya están. Se agrega `CLAVE_BASE_AUDITORIA`.

**Comercial:**

- `anotarEvento` pasa a ser el kit: cada evento lleva su título, detalle, grupo e importancia,
  armados en Comercial con las mismas palabras que hoy arma la web (`eventos/en-palabras.ts`,
  una vez, en sus reglas). El grupo sale del comienzo del tipo; uno que no está en la tabla va
  en «Otras». Lo que pasa los topes del contrato se corta antes de anotar (ver el contrato,
  «Para no perder ninguno»), para que la acción nunca falle por su evento.
- Las uniones de productos pasan a su propia tabla (`union_de_productos`), y deshacer una unión
  lee de ahí.
- Salen `GET /auditoria`, `persistencia/actividad.ts` y la tabla `evento` (Auditoría arranca
  vacía, decisión de Carlos).

**Procesos:** su `anotar` pasa a ser el kit; sale `procesos.evento`. Borrar un proceso es una
anulación (rojo), como ya se veía en la web.

**La web:** cada acción se muestra con el título, el detalle y la importancia que trae (el color
por importancia: rojo la anulación, ámbar lo que se revisa; el ícono por grupo, con uno de
siempre para un grupo que la web no conoce); el filtro «qué» lo arma con
`/auditoria/grupos`. Salen las tablas de tipos (`QUE`, `ESPECIALES`, `TIPOS`, el detalle por
tipo). El resumen de arriba (cuántas ventas, entradas, precios, ajustes y anulaciones) es del
negocio de Comercial y se queda en la web, contando por tipo.

## Pruebas

- Kit, contra PostgreSQL: anotar en la transacción (E05), apagado (E09), entrega, reintento
  (E06), reinicio con pendientes (E08), sin duplicar (E07), dos mandadores a la vez, borrar lo
  viejo (E10, E11). 100 %.
- Auditoría: el contrato (E12 a E14), los filtros y la paginación (E01 a E03), su capa de datos
  al 100 %.
- Comercial: las palabras de cada evento, las uniones en su tabla.
- Web: «Quién hizo qué» con eventos de un servicio que no conoce (E12), sin Auditoría (E04).
- Integración (`tests/integration/auditoria.sh`, con el stack): vender con Auditoría apagada y
  ver el evento al prenderla (E06), un servicio de prueba que manda un evento con `curl` desde la
  red interna y aparece en el reporte (E12).
- e2e: «Quién hizo qué» de siempre.

## Seguridad

- **Datos que toca:** quién hizo qué, con nombre y dispositivo. Viajan solo por la red interna.
- **Permisos:** los reportes, con el permiso de hoy («Ver la actividad del negocio»). Mandar
  eventos: solo los servicios, con el token entre servicios.
- **Lo que entra de afuera:** los eventos se validan contra el contrato (tipos, largos máximos:
  título 120, detalle 300, contenido 16 KB) y se guardan como parámetros, nunca armando SQL. La
  web no alcanza `/v1/eventos`: la puerta no lo publica.
- **Secretos:** `CLAVE_BASE_AUDITORIA` nueva en el `.env`; el token entre servicios ya existe.
- **Quién hizo qué:** es lo que se construye. Ninguna consulta cambia, borra ni vacía un evento:
  la base frena `UPDATE`, `DELETE` y `TRUNCATE` en la tabla. El usuario de Auditoría es dueño de
  su base y corre sus migraciones, así que podría sacar esos frenos cambiando el esquema a
  propósito; un usuario aparte para migrar queda pendiente (T166 de `proyecto/tasks.md`).
- **El token entre servicios** es uno solo para la puerta y los servicios: Auditoría no distingue
  quién le manda. Separarlos queda pendiente con 029 (T168).
- **Auditoría no es necesaria para arrancar:** la puerta no la espera; si no responde, dice que
  no está disponible.
