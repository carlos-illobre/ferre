# Contrato de la API: Usuarios y acceso

> Vigente desde el 2026-10-11 (RF-72 y RF-75, decisión 50): cada ruta exige un **permiso**; los roles son grupos de permisos que arma el negocio.

Servicio `gestion-del-local`.

## Reglas comunes

- **Sesión:** el token va en la cabecera `Authorization: Bearer <token>`. Sin token, o con
  uno que no corresponde a una sesión sin revocar, sin vencer y de un usuario activo:
  `401 {"error": "Hay que iniciar sesión"}`.
- **Permiso:** donde la columna «Exige» nombra un permiso, quien no lo tiene en ninguno de
  sus roles recibe `403 {"error": "No tenés permiso para esto. Hace falta: <nombre del permiso>", "permiso": "<clave>"}`.
  Si nombra dos, alcanza con uno.
- **El usuario de la sesión** viaja siempre con `roles` (los nombres de sus roles) y
  `permisos` (las claves de todo lo que esos roles le dejan hacer).
- **Límite de intentos:** en las rutas sin sesión, por dirección IP (primer valor de
  `X-Forwarded-For`) y por minuto; pasado el límite, `429 {"error": "Demasiados intentos; esperá un minuto"}`.
- **Errores:** siempre `{"error": "<texto en castellano>"}`.
- **CORS:** solo el origen del cliente web (`ORIGEN_WEB`).

En la columna «Exige», «sesión» quiere decir cualquier persona con sesión, tenga los roles que tenga.

## Sesiones (`/sesiones`)

| Método | Ruta | Exige | Para qué sirve |
|---|---|---|---|
| POST | `/sesiones/google` | Nada; 10 intentos por minuto | Entrar con Google. Cuerpo: `credencial` (el token del botón de Google) y `dispositivo` opcional. `201` con `token` y `usuario` (`id`, `email`, `nombre`, `rol`). `400` sin credencial; `401` si Google no verifica la cuenta; `403` «<correo> no está autorizado. Pedile a quien administra los usuarios que te dé de alta.» si el correo no está cargado o está desactivado. Registra `sesion.iniciada` con medio `google` |
| GET | `/sesiones/actual` | Sesión | Quién soy: `id` de la sesión y `usuario` |
| DELETE | `/sesiones/actual` | Sesión | Salir: revoca la sesión propia. `204`. Registra `sesion.cerrada` |
| GET | `/sesiones` | `admin.sesiones` | Sesiones abiertas de todos los usuarios (sin revocar ni vencidas), la más usada recientemente primero: `id`, `dispositivo`, `creada_en`, `ultimo_uso_en`, `expira_en`, `email`, `nombre` |
| DELETE | `/sesiones/:id` | `admin.sesiones` | Cerrar a distancia la sesión de cualquiera. `204` (también si el id no existe). Registra `sesion.revocada` |

### Entrar a la computadora con el celular (RF-76)

| Método | Ruta | Exige | Para qué sirve |
|---|---|---|---|
| POST | `/sesiones/vinculaciones` | Nada; 30 por minuto | La computadora pide un código. Cuerpo opcional: `dispositivo`. `201` con `id`, `codigo` (va en el QR), `clave` (no sale de la computadora) y `expiraEnSegundos` (300). Se guardan hasheados |
| POST | `/sesiones/vinculaciones/aprobar` | Sesión | El celular aprueba el código que leyó. Cuerpo: `codigo`. `200` con `dispositivo`; `400` sin código; `410` si venció o ya se aprobó |
| POST | `/sesiones/vinculaciones/:id/estado` | Nada; 240 por minuto | La computadora pregunta por su código. Cuerpo: `clave`. Responde `estado`: `pendiente`, `vencida` o `aprobada`; con `aprobada` trae `token` y `usuario`, una sola vez, y abre la sesión de la computadora a nombre de quien aprobó. Registra `sesion.iniciada` con `medio: "celular"` |

Los límites de intentos de estas dos rutas se cuentan aparte de los de entrar con Google o con
la huella: la computadora que espera en la entrada consulta cada dos segundos.

## Usuarios (`/usuarios`)

Todas exigen el permiso `admin.usuarios`.

| Método | Ruta | Para qué sirve |
|---|---|---|
| GET | `/usuarios` | Lista de usuarios por orden de alta: `id`, `email`, `nombre`, `activo`, `creado_en` y `roles` (cada uno con `id` y `nombre`) |
| POST | `/usuarios` | Autorizar a alguien. Cuerpo: `email`, `nombre`, `roles` (lista de ids de rol, al menos uno). `201` con el usuario. `400` si falta el nombre, el correo no tiene arroba, no viene ningún rol o alguno no existe; `409` si el correo ya existe. Registra `usuario.creado` |
| PATCH | `/usuarios/:id` | Cambiar `roles`, `activo` o `nombre` (los que vengan). `roles` reemplaza la lista entera. `400` si es uno mismo y se desactiva o se quita los permisos de administrar, o si la lista de roles queda vacía o nombra uno que no existe; `404` si no existe; `409` si el cambio deja al sistema sin nadie activo que pueda administrar usuarios y roles. Con `activo: false` revoca todas las sesiones de ese usuario. Registra `usuario.modificado` |

## Permisos y roles (`/permisos`, `/roles`)

Los permisos son fijos: los define el sistema. Los roles los arma el negocio.

| Método | Ruta | Exige | Para qué sirve |
|---|---|---|---|
| GET | `/permisos` | Sesión | La lista de permisos del sistema, en el orden en que se muestran: `clave`, `parte`, `nombre`, `detalle` |
| GET | `/roles` | `admin.roles` o `admin.usuarios` | Los roles por nombre: `id`, `nombre`, `descripcion`, `permisos` (claves) y `usuarios` (cuántas personas lo tienen) |
| POST | `/roles` | `admin.roles` | Crear un rol. Cuerpo: `nombre` (hasta 40 letras) y `permisos` (claves, al menos una). `201` con el rol. `400` si falta el nombre, no hay permisos o alguno no existe; `409` si ya hay un rol con ese nombre (sin distinguir mayúsculas). Registra `rol.creado` |
| PATCH | `/roles/:id` | `admin.roles` | Cambiar `nombre` o `permisos` (los que vengan; `permisos` reemplaza la lista). Vale enseguida para quienes lo tienen. `404` si no existe; `409` si el nombre ya está usado, o si el cambio deja al sistema sin nadie que administre o le quita a quien lo pide sus permisos de administrar. Registra `rol.modificado` |
| DELETE | `/roles/:id` | `admin.roles` | Borrar un rol que nadie tiene. `204`; `404` si no existe; `409` si alguien lo tiene asignado. Registra `rol.borrado` |

Las claves de permiso: `ventas.registrar`, `ventas.ver`, `ventas.anular` (del día), `ventas.anular_cualquiera`, `catalogo.costos`, `catalogo.margenes`,
`catalogo.listas`, `catalogo.duplicados`, `deposito.pedidos`, `deposito.ingresos`, `deposito.compras`,
`deposito.stock`, `negocio.numeros`, `negocio.anomalias`, `negocio.actividad`,
`admin.usuarios`, `admin.roles`, `admin.sesiones`. Qué deja hacer cada una está en la tabla
de permisos de [spec.md](../spec.md).

## Celulares con huella (`/credenciales`)

| Método | Ruta | Exige | Para qué sirve |
|---|---|---|---|
| POST | `/credenciales/registro/opciones` | Sesión | Empezar a vincular este dispositivo: devuelve `desafioId` y las `opciones` de WebAuthn (clave descubrible, verificación del usuario obligatoria, atadas al dominio del cliente web; excluye los ya vinculados del usuario) |
| POST | `/credenciales/registro` | Sesión | Terminar de vincular. Cuerpo: `desafioId`, `respuesta` del teléfono, `dispositivo` (nombre). `201` con `id` y `dispositivo`. `400` si el desafío venció, ya se usó o es de otro usuario, o si la clave no verifica. Registra `credencial.vinculada` |
| GET | `/credenciales` | Sesión | Mis celulares vinculados sin quitar: `id`, `dispositivo`, `creada_en`, `ultimo_uso_en` |
| DELETE | `/credenciales/:id` | Sesión; el de otro usuario, `admin.sesiones` | Quitar un celular. `204`; `404` si no existe o no es propio. Registra `credencial.quitada` |
| POST | `/credenciales/login/opciones` | Nada; 20 intentos por minuto | Empezar a entrar con la huella: devuelve `desafioId` y `opciones` |
| POST | `/credenciales/login` | Nada; 20 intentos por minuto | Entrar con la huella. Cuerpo: `desafioId`, `respuesta`, `dispositivo` opcional. `201` con `token` y `usuario`, igual que Google. `400` si el desafío venció o se repitió; `401` si el celular no está vinculado o la firma no verifica; `403` si el usuario está desactivado. Actualiza el contador y el último uso. Registra `sesion.iniciada` con medio `huella` |

Los desafíos valen 5 minutos y un solo uso, y viven en la memoria del proceso.

## Quién hizo qué (`/auditoria`)

| Método | Ruta | Exige | Para qué sirve |
|---|---|---|---|
| GET | `/auditoria` | `negocio.actividad` | El registro de acciones, de la más reciente a la más vieja, de a 10. Parámetro `pagina` (desde 1; un valor inválido es 1). Devuelve `eventos` (`id`, `tipo`, `fecha`, `dispositivo_id`, `contenido`, `email`, `nombre`), `total`, `pagina` y `por_pagina` (10) |

Filtros opcionales y combinables (RF-71): `usuario` (id del usuario), `tipo` (prefijo del
tipo de evento), `desde` (fecha y hora, inclusive) y `hasta` (fecha y hora, exclusive).
`total` cuenta las acciones que cumplen los filtros.

## Emparejamiento celular–computadora (`/puestos`)

Pertenecen a RF-08 (capacidad de catálogo). Figuran acá porque todas exigen
sesión y atan una sesión de computadora con una de celular; no son una forma de entrar.

| Método | Ruta | Exige | Para qué sirve |
|---|---|---|---|
| POST | `/puestos` | Sesión | La computadora pide un puesto: devuelve `id`, el `codigo` para el QR y `expiraEnSegundos` (5 minutos) |
| POST | `/puestos/:codigo/vincular` | Sesión | El celular leyó el QR de «Vincular el celular». Cuerpo opcional: `dispositivo_id` (el identificador que ese celular guarda para sí). Quedan vinculados los días configurados (`dias` en la respuesta) y se suelta el vínculo anterior de cualquiera de los dos. Guarda de qué usuario y de qué dos dispositivos es el vínculo. Registra `puesto.vinculado` |
| GET | `/puestos/mio?dispositivo=…` | Sesión | Con quién está vinculada esta sesión: `comoComputadora` y `comoCelular` (cada uno `id`, `nombre`, `expira_en`, o `null`). `dispositivo` es el identificador de este dispositivo (8 a 64 letras, números, guiones): se anota en la sesión y, si este usuario tenía en ese dispositivo un vínculo vigente de una sesión anterior, el vínculo pasa a esta sesión. Cuenta aunque la sesión del otro lado esté cerrada |
| GET | `/puestos/configuracion` | Sesión | `dias`: cuántos días dura un vínculo (30 de arranque) |
| PUT | `/puestos/configuracion` | «Administrar sesiones» (si no, `403`) | Cuerpo: `dias`, entero de 1 a 365 (si no, `400`). Vale para los vínculos nuevos y los que se renueven. Registra `vinculo.dias_cambiados` |
| DELETE | `/puestos/:id` | Sesión de cualquiera de los dos | Desvincular. `204`. Registra `puesto.desvinculado`. Es la única forma de cortarlo desde la aplicación, junto con el cierre a distancia de la sesión de uno de los dos (`DELETE /sesiones/:id`); salir (`DELETE /sesiones/actual`) no lo corta |
| POST | `/puestos/:id/codigos` | Sesión del celular vinculado a ese puesto (si no, `403`) | El celular manda un código escaneado |
| POST | `/puestos/:id/codigos/:codigoId/recibido` | Sesión de la computadora dueña del puesto | La computadora confirma que lo recibió. `204` |
| GET | `/puestos/:id` | Sesión de la computadora o del celular de ese puesto (si no, `404`) | Estado del puesto: si ya se vinculó y si sigue vigente |
| GET | `/puestos/:id/eventos` | Sesión de la computadora dueña del puesto (si no, `404`) | Flujo de eventos (SSE) con los códigos que vayan llegando y los que quedaron sin entregar en los últimos 2 minutos. Con `?nuevos=1`, solo los que lleguen de ahí en más (lo atrasado se da por entregado) |

El emparejamiento también nace solo: cuando la computadora retira la sesión que le dejó un
celular (`POST /sesiones/vinculaciones/:id/estado`), la respuesta trae `puesto` (`id`,
`expira_en`) y ese celular queda emparejado con ella. Como se crea un vínculo nuevo, el plazo
empieza otra vez: así se renueva. `POST /sesiones/vinculaciones/aprobar` y
`POST /sesiones/vinculaciones/:id/estado` aceptan `dispositivo_id` en el cuerpo, para anotar de
qué dispositivos es el vínculo.

El espejo (RF-77). El estado vive en memoria del servidor, por emparejamiento:

| Método | Ruta | Exige | Para qué sirve |
|---|---|---|---|
| POST | `/puestos/:id/espejo` | Sesión de cualquiera de los dos (si no, `404`) | Avisar un cambio. Cuerpo: `tipo` y `datos`. Tipos: `ir` (la parte), un trabajo en curso (`venta`, `ingreso`, `pedido`, `pedido-renglones`), `pausa` (si se pausa) o `aviso` (un texto de algo que terminó; no se guarda). `204`; `400` con otro tipo; `413` si un trabajo pasa de 200.000 caracteres o un aviso de 300. `pausa` les llega a los dos; lo demás, al otro |
| GET | `/puestos/:id/espejo` | Sesión de cualquiera de los dos (si no, `404`) | Flujo de eventos (SSE). Al conectar: `estado` (`lado`, `parte`, `docs` con cada trabajo en curso, `pausado`, `presentes`). Después: `ir`, cada trabajo, `aviso`, `pausa`, `presencia` (quién está conectado) y `desvinculado` |

`POST /puestos/:codigo/vincular` responde `403` si la computadora tiene la sesión de otro usuario.

Lo que la computadora le pide a su celular emparejado:

| Método | Ruta | Exige | Para qué sirve |
|---|---|---|---|
| POST | `/puestos/:id/lector` | Sesión de la computadora de ese emparejamiento (si no, `404`) | Pedirle al celular que haga de lector. Vale 2 minutos. `204` |
| GET | `/puestos/avisos` | Sesión | Lo que las computadoras emparejadas con este celular esperan de él: `lector` (si pidieron el lector) y `fotos` (cada pedido de foto, con `codigo` y `para`). El celular lo consulta cada 3 segundos |
| DELETE | `/puestos/avisos/lector` | Sesión | El celular abrió el lector o lo dejó para después: el pedido queda atendido. `204` |
| GET | `/pedidos-de-foto/para-mi` | Sesión | Solo los pedidos de foto, con la misma forma que `fotos` |

## Qué exigen las rutas de las otras capacidades

| Rutas | Exige |
|---|---|
| `GET /health`, `GET /fotos/…` | Nada |
| `GET /productos`, `PATCH /productos/:id` (foto, código de barras, unidad), `GET /proveedores`, `GET /clientes`, `GET /stock`, `GET /stock/:id/movimientos`, `GET /listas/:id/archivo`, `/tickets`, `/puestos` | Sesión |
| `PATCH /productos/:id` cuando trae el margen | `catalogo.margenes` |
| `POST /ventas`, `POST /ventas/:id/pagar`, `POST /consultas`, `POST /clientes` | `ventas.registrar` |
| `GET /ventas` | `ventas.ver` o `negocio.numeros` |
| `POST /ventas/:id/anular` | `ventas.anular` si la venta es de hoy (el día del local); `ventas.anular_cualquiera` para cualquier día. Con solo la primera, una venta de otro día da `403` |
| `/listas` (salvo bajar el archivo), `POST /proveedores`, `PATCH /proveedores/:id` | `catalogo.listas` |
| `/equivalencias/*` | `catalogo.duplicados` |
| `PUT`, `DELETE` y `POST` de `/pedidos` | `deposito.pedidos` |
| `GET /pedidos` | `deposito.pedidos` o `deposito.ingresos` |
| `POST /compras`, `POST /compras/fotos`, `POST /compras/:id/anular` | `deposito.ingresos` |
| `GET /compras`, `GET /compras/:id` | `deposito.compras` o `deposito.ingresos` |
| `POST /stock/ajustes`, `/sectores`, `/conteos` | `deposito.stock` |
| `GET /compras/semana`, `GET /consultas` | `negocio.numeros` |
| `GET /anomalias` | `negocio.anomalias` |

`GET /stock` no trae el valor en dinero (ni el de cada producto ni el total) a quien no tiene
`negocio.numeros`.

`catalogo.costos` («Ver costos») no lo exige ninguna ruta: decide qué muestran las pantallas.
`GET /productos` trae el costo a cualquiera con sesión, porque el precio de venta se calcula
en el dispositivo (también sin conexión) a partir del costo y el margen.
