# Contrato de la API: Usuarios y acceso

Servicio `gestion-del-local`. Fuente: `microservices/gestion-del-local/src/app.ts`,
`autenticacion.ts`, `sesiones.ts` y `rutas/` (`sesiones.ts`, `usuarios.ts`,
`credenciales.ts`, `auditoria.ts`, `puestos.ts`).

## Reglas comunes

- **Sesión:** el token va en la cabecera `Authorization: Bearer <token>`. Sin token, o con
  uno que no corresponde a una sesión sin revocar, sin vencer y de un usuario activo:
  `401 {"error": "Hay que iniciar sesión"}`.
- **Rol:** donde dice «dueño o admin», cualquier otro rol recibe
  `403 {"error": "Solo puede hacerlo un dueño o un admin"}`.
- **Límite de intentos:** en las rutas sin sesión, por dirección IP (primer valor de
  `X-Forwarded-For`) y por minuto; pasado el límite, `429 {"error": "Demasiados intentos; esperá un minuto"}`.
- **Errores:** siempre `{"error": "<texto en castellano>"}`.
- **CORS:** solo el origen del cliente web (`ORIGEN_WEB`).

En la columna «Exige», «sesión» quiere decir cualquier rol.

## Sesiones (`/sesiones`)

| Método | Ruta | Exige | Para qué sirve |
|---|---|---|---|
| POST | `/sesiones/google` | Nada; 10 intentos por minuto | Entrar con Google. Cuerpo: `credencial` (el token del botón de Google) y `dispositivo` opcional. `201` con `token` y `usuario` (`id`, `email`, `nombre`, `rol`). `400` sin credencial; `401` si Google no verifica la cuenta; `403` «<correo> no está autorizado. Pedile al dueño que te dé de alta.» si el correo no está cargado o está desactivado. Registra `sesion.iniciada` con medio `google` |
| GET | `/sesiones/actual` | Sesión | Quién soy: `id` de la sesión y `usuario`. La app lo llama al abrir |
| DELETE | `/sesiones/actual` | Sesión | Salir: revoca la sesión propia. `204`. Registra `sesion.cerrada` |
| GET | `/sesiones` | Dueño o admin | Sesiones abiertas de todos los usuarios (sin revocar ni vencidas), la más usada recientemente primero: `id`, `dispositivo`, `creada_en`, `ultimo_uso_en`, `expira_en`, `email`, `nombre` |
| DELETE | `/sesiones/:id` | Dueño o admin | Cerrar a distancia la sesión de cualquiera. `204` (también si el id no existe). Registra `sesion.revocada` |

`/sesiones/vinculaciones` y `/sesiones/vinculaciones/:codigo/aprobar` (login por QR) se
quitaron el 2026-10-09: responden `404`.

## Usuarios (`/usuarios`)

Todas exigen sesión con rol dueño o admin.

| Método | Ruta | Exige | Para qué sirve |
|---|---|---|---|
| GET | `/usuarios` | Dueño o admin | Lista de usuarios por orden de alta: `id`, `email`, `nombre`, `rol`, `activo`, `creado_en` |
| POST | `/usuarios` | Dueño o admin; crear un `dueño`, solo dueño | Autorizar a alguien. Cuerpo: `email`, `nombre`, `rol` (`dueño`, `admin` o `mostrador`). `201` con el usuario. `400` si falta el nombre, el correo no tiene arroba o el rol no es uno de los tres; `403` «Un admin no puede crear dueños»; `409` si el correo ya existe. Registra `usuario.creado` |
| PATCH | `/usuarios/:id` | Dueño o admin; sobre un dueño o para dar el rol `dueño`, solo dueño | Cambiar `rol`, `activo` o `nombre` (los que vengan). `204`. `400` si es uno mismo y se desactiva o se cambia el rol, o si el rol no es válido; `403` si un admin toca a un dueño o da ese rol; `404` si no existe. Con `activo: false` revoca todas las sesiones de ese usuario. Registra `usuario.modificado` |

## Celulares con huella (`/credenciales`)

| Método | Ruta | Exige | Para qué sirve |
|---|---|---|---|
| POST | `/credenciales/registro/opciones` | Sesión | Empezar a vincular este dispositivo: devuelve `desafioId` y las `opciones` de WebAuthn (clave descubrible, verificación del usuario obligatoria, atadas al dominio del cliente web; excluye los ya vinculados del usuario) |
| POST | `/credenciales/registro` | Sesión | Terminar de vincular. Cuerpo: `desafioId`, `respuesta` del teléfono, `dispositivo` (nombre). `201` con `id` y `dispositivo`. `400` si el desafío venció, ya se usó o es de otro usuario, o si la clave no verifica. Registra `credencial.vinculada` |
| GET | `/credenciales` | Sesión | Mis celulares vinculados sin quitar: `id`, `dispositivo`, `creada_en`, `ultimo_uso_en` |
| DELETE | `/credenciales/:id` | Sesión; el de otro usuario, solo dueño o admin | Quitar un celular. `204`; `404` si no existe o no es propio. Registra `credencial.quitada` |
| POST | `/credenciales/login/opciones` | Nada; 20 intentos por minuto | Empezar a entrar con la huella: devuelve `desafioId` y `opciones` |
| POST | `/credenciales/login` | Nada; 20 intentos por minuto | Entrar con la huella. Cuerpo: `desafioId`, `respuesta`, `dispositivo` opcional. `201` con `token` y `usuario`, igual que Google. `400` si el desafío venció o se repitió; `401` si el celular no está vinculado o la firma no verifica; `403` si el usuario está desactivado. Actualiza el contador y el último uso. Registra `sesion.iniciada` con medio `huella` |

Los desafíos valen 5 minutos y un solo uso, y viven en la memoria del proceso.

## Quién hizo qué (`/auditoria`)

| Método | Ruta | Exige | Para qué sirve |
|---|---|---|---|
| GET | `/auditoria` | Dueño o admin | El registro de acciones, de la más reciente a la más vieja, de a 10. Parámetro `pagina` (desde 1; un valor inválido es 1). Devuelve `eventos` (`id`, `tipo`, `fecha`, `dispositivo_id`, `contenido`, `email`, `nombre`), `total`, `pagina` y `por_pagina` (10) |

La ruta también acepta `usuario` (id), `tipo` (prefijo), `desde` y `hasta` (fechas). Ninguna
pantalla los usa y no tienen prueba: los filtros de RF-71 son el issue #58.

## Celular como lector de la computadora (`/puestos`)

Pertenecen a RF-08 (issue #52, capacidad de catálogo). Figuran acá porque todas exigen
sesión y atan una sesión de computadora con una de celular; no son una forma de entrar.

| Método | Ruta | Exige | Para qué sirve |
|---|---|---|---|
| POST | `/puestos` | Sesión | La computadora pide un puesto: devuelve `id`, el `codigo` para el QR y `expiraEnSegundos` (5 minutos) |
| POST | `/puestos/:codigo/vincular` | Sesión | El celular leyó el QR: queda vinculado 12 horas. `404` si el código venció o ya se usó. Registra `puesto.vinculado` |
| POST | `/puestos/:id/codigos` | Sesión del celular vinculado a ese puesto (si no, `403`) | El celular manda un código escaneado |
| POST | `/puestos/:id/codigos/:codigoId/recibido` | Sesión de la computadora dueña del puesto | La computadora confirma que lo recibió. `204` |
| GET | `/puestos/:id` | Sesión de la computadora o del celular de ese puesto (si no, `404`) | Estado del puesto: si ya se vinculó y si sigue vigente |
| GET | `/puestos/:id/eventos` | Sesión de la computadora dueña del puesto (si no, `404`) | Flujo de eventos (SSE) con los códigos pendientes y los que vayan llegando |

## Qué exigen las rutas de las otras capacidades

| Rutas | Exige |
|---|---|
| `GET /health`, `GET /fotos/…` | Nada |
| `/ventas`, `/productos`, `/listas`, `/compras`, `/stock`, `/sectores`, `/conteos`, `/clientes`, `/consultas`, `GET /proveedores` | Sesión |
| `/equivalencias/*`, `POST /proveedores`, `PATCH /proveedores/:id` | Dueño o admin |
