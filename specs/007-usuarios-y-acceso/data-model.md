# Modelo de datos: Usuarios y acceso

> Vigente desde el 2026-10-11 (RF-72 y RF-75, decisión 50): un usuario tiene uno o más roles, y cada rol es un grupo de permisos.

Contrato de datos del servicio `gestion-del-local` para esta capacidad. Valen las reglas
generales del modelo: nada se borra físicamente y `evento` solo recibe filas nuevas.

```mermaid
erDiagram
    usuario ||--o{ sesion : abre
    usuario ||--o{ credencial : vincula
    usuario o|--o{ evento : hace
    usuario o|--o{ vinculacion : aprobaba
    sesion o|--o{ vinculacion : entregaba
```

## usuario

Quién puede entrar.

| Columna | Tipo | Detalle |
|---|---|---|
| `id` | uuid, clave primaria | Lo genera la API |
| `email` | text, único, obligatorio | El correo de Google; se guarda y se compara en minúsculas |
| `nombre` | text, obligatorio | |
| `rol` | text, opcional | Dato viejo, de cuando había un solo rol fijo por usuario. Ya no se usa ni se exige; los roles están en `usuario_rol` |
| `activo` | boolean, por omisión `true` | Desactivar es la baja; no se borra |
| `creado_en`, `modificado_en` | timestamptz | `modificado_en` lo mantiene el trigger `usuario_modificado` |

Reglas que aplica la API: un usuario activo tiene al menos un rol; nadie se desactiva ni se
quita a sí mismo los permisos de administrar; siempre queda al menos un usuario activo que
puede administrar usuarios y roles; desactivar a un usuario revoca sus sesiones abiertas. El
primer usuario se crea con el comando `crear-usuario` del servicio, que le da todos los roles.

## rol, rol_permiso y usuario_rol

Los roles que arma el negocio (RF-75) y a quién se le asignan (RF-72).

| Tabla | Columna | Tipo | Detalle |
|---|---|---|---|
| `rol` | `id` | uuid, clave primaria | Los cinco roles de arranque tienen id fijo |
| `rol` | `nombre` | text, obligatorio | Único sin distinguir mayúsculas (índice `rol_nombre_unico`) |
| `rol` | `descripcion` | text, opcional | |
| `rol` | `creado_en` | timestamptz | |
| `rol_permiso` | `rol_id` | uuid → `rol`, se borra con el rol | |
| `rol_permiso` | `permiso` | text | La clave del permiso. La lista válida es del sistema, no de la base: sumar un permiso no pide migración |
| `usuario_rol` | `usuario_id` | uuid → `usuario`, se borra con el usuario | |
| `usuario_rol` | `rol_id` | uuid → `rol` | Sin borrado en cascada: un rol asignado no se puede borrar |

La migración siembra Vendedor, Comprador, Recepción, Administrador y Gerente con los permisos
de la tabla de [spec.md](spec.md), y les da los cinco a los usuarios que ya existían.

Otras tablas guardan quién hizo algo apuntando a `usuario`: `lista_importada.cargada_por`
y `aplicada_por`, `conteo.abierto_por` y `cerrado_por`, `renglon_conteo.contado_por`,
`equivalencia_sugerida.resuelto_por`.

## sesion

Un dispositivo en el que un usuario está adentro.

| Columna | Tipo | Detalle |
|---|---|---|
| `id` | uuid, clave primaria | |
| `usuario_id` | uuid, obligatorio → `usuario` | |
| `token_hash` | text, único, obligatorio | SHA-256 del token opaco (32 bytes al azar). El token solo existe en el dispositivo |
| `dispositivo` | text | Lo que manda el cliente («celular · Chrome»), o el user agent; hasta 120 caracteres |
| `creada_en` | timestamptz | |
| `ultimo_uso_en` | timestamptz | Se actualiza con el uso, como mucho una vez por hora |
| `expira_en` | timestamptz, obligatorio | 90 días desde que se creó; cada actualización la corre otros 90 |
| `revocada_en` | timestamptz | Cierre: por «Salir», por un Administrador o por desactivar al usuario |

Índice `sesion_por_usuario (usuario_id) WHERE revocada_en IS NULL`. Una sesión vale si no
está revocada, no venció y su usuario está activo.

`puesto.sesion_id` y `puesto.celular_sesion_id` (capacidad de catálogo, RF-08) apuntan a `sesion`: la computadora que muestra el QR y el celular que escanea.

## credencial

Un celular vinculado para entrar con la huella (passkey).

| Columna | Tipo | Detalle |
|---|---|---|
| `id` | text, clave primaria | El identificador que elige el teléfono, en base64url |
| `usuario_id` | uuid, obligatorio → `usuario` | |
| `clave_publica` | bytea, obligatorio | La privada nunca sale del teléfono |
| `contador` | bigint, por omisión 0 | Se actualiza en cada entrada; sirve para detectar una copia |
| `transportes` | text[] | Cómo se comunica el autenticador (por ejemplo `internal`) |
| `dispositivo` | text | El nombre que le puso el usuario («Celular de Carlos») |
| `creada_en` | timestamptz | |
| `ultimo_uso_en` | timestamptz | Última entrada con la huella |
| `revocada_en` | timestamptz | «Quitar»: deja de servir, la fila queda |

Índice `credencial_por_usuario (usuario_id) WHERE revocada_en IS NULL`. El desafío de cada
vinculación o entrada no se guarda en la base: vive 5 minutos en la memoria del proceso.

## evento

Registro de eventos de dominio (ADR-003) y, a la vez, «quién hizo qué». Solo recibe filas
nuevas.

| Columna | Tipo | Detalle |
|---|---|---|
| `id` | uuid, clave primaria | |
| `tipo` | text, obligatorio | `entidad.acción`; los de esta capacidad están abajo |
| `version` | integer, por omisión 1 | Versión del formato de `contenido` para ese tipo |
| `fecha` | timestamptz, obligatorio | Cuándo pasó; el registro se ordena por esta columna |
| `dispositivo_id` | text | |
| `usuario_id` | uuid → `usuario` | Quién lo hizo. Nulo si lo hizo el sistema (el comando `crear-usuario`) |
| `contenido` | jsonb, obligatorio | El evento completo |
| `creado_en` | timestamptz | |

Índices: `evento_por_fecha (creado_en)`, `evento_por_tipo (tipo, creado_en)`,
`evento_por_usuario (usuario_id, creado_en)`.

Tipos que escribe esta capacidad:

| Tipo | Cuándo | Contenido |
|---|---|---|
| `usuario.creado` | Alta desde la app o por comando | `id`, `email`, `roles` (y `medio: "comando"`) |
| `usuario.modificado` | Cambio de roles, nombre o activo | `id`, `cambios` |
| `rol.creado`, `rol.modificado`, `rol.borrado` | Un rol se crea, cambia de nombre o de permisos, o se borra | `id`, `nombre`, `permisos` o `cambios` |
| `sesion.iniciada` | Entrada con Google, con la huella, o de la computadora aprobada desde el celular | `sesionId`, `dispositivo`, `medio` (`google`, `huella` o `celular`), `credencial` si fue con huella |
| `sesion.cerrada` | «Salir» o cerrar la propia | `sesionId` |
| `sesion.revocada` | Un Administrador cierra una sesión | `sesionId` |
| `credencial.vinculada` | Se vincula un celular | `id`, `dispositivo`, `tipo` |
| `credencial.quitada` | Se quita un celular | `id` |

Las demás capacidades escriben los suyos (`venta.registrada`, `lista.aplicada`,
`conteo.cerrado`…) con el mismo `usuario_id`.

## vinculacion

El código de un solo uso con el que se entra a la computadora leyéndolo con el celular
(RF-76). La forma se había quitado el 2026-10-09 y volvió el 2026-10-12 (decisión 57).

| Columna | Tipo | Detalle |
|---|---|---|
| `id` | uuid, clave primaria | |
| `codigo_hash` | text, único | El hash del código que va en el QR |
| `clave_hash` | text | El hash de la clave con la que la computadora retira su sesión. El código, que está a la vista, no alcanza para retirarla |
| `dispositivo` | text | Cómo se describe la computadora que lo pidió |
| `creada_en`, `expira_en` | timestamptz | Vence a los 5 minutos |
| `aprobada_en`, `aprobada_por` | timestamptz, uuid → `usuario` | Cuándo y quién lo aprobó desde el celular |
| `retirada_en` | timestamptz | Cuándo la computadora retiró la sesión: se retira una sola vez |
| `sesion_id` | uuid → `sesion` | La sesión que se le abrió a la computadora |

## puesto (el vínculo entre un celular y una computadora)

Un vínculo es de un usuario y de dos dispositivos, no de dos sesiones (decisión 73).

| Dato | Qué es |
|---|---|
| `id` | Identificador |
| `sesion_id` | La sesión de la computadora que hoy lo usa. Cambia sola cuando el usuario vuelve a entrar en esa computadora |
| `celular_sesion_id` | La sesión del celular que hoy lo usa. Cambia igual |
| `usuario_id` | De quién es el vínculo. Solo ese usuario lo reactiva |
| `compu_dispositivo`, `celular_dispositivo` | El identificador que cada dispositivo guarda para sí y no borra al salir |
| `nombre` | Cómo se llama la computadora, para mostrarla en el celular |
| `vinculado_en`, `expira_en` | Cuándo se vinculó y cuándo vence: los días configurados, contados desde que se vinculó |
| `codigo_hash` | El código de un solo uso del QR, mientras el vínculo todavía no se completó |

Reglas: uno a uno (un vínculo nuevo de cualquiera de los dos dispositivos da por vencido el
anterior); vigente mientras `expira_en` no pasó; se da por vencido al desvincular o cuando se
cierra a distancia la sesión de uno de los dos.

`sesion` suma `dispositivo_id`: el identificador del dispositivo desde el que se abrió.

## configuracion

Lo que el negocio configura desde la aplicación: `clave`, `valor`, `actualizado_en`. Hoy tiene
una sola clave, `vinculo.dias` (30 de arranque; entero de 1 a 365).
