# Seguridad

## Qué se protege

Datos de ventas, compras, costos y márgenes del negocio; listas de precios de proveedores
(información de terceros); acceso al mostrador.

## Amenazas y mitigaciones

| Amenaza | Mitigación | Estado |
|---|---|---|
| Datos sensibles en el repo público | `privado/` y todo `.xlsx`/`.pdf`/`.env` en `.gitignore`; plantillas con marcadores | Hecho (#1) |
| Secretos en imágenes o código | Toda configuración sale del `.env`; los Dockerfiles ignoran `.env*` | Hecho |
| Variable de seguridad olvidada que deja algo abierto | Sin valores por omisión: el arranque falla ([ADR-009](adr/ADR-009-compose-unico-y-env.md)); prueba de paridad | Hecho |
| Servicios internos expuestos a internet | Solo Caddy publica puertos; `listas-de-proveedores` solo es alcanzable en la red del compose | Hecho |
| Cualquier sitio llamando a la API desde un navegador | CORS restringido a `ORIGEN_WEB` | Hecho |
| Llamadas entre servicios sin autenticar | `TOKEN_SERVICIO` compartido, verificado en cada llamada interna | Pendiente (#7) |
| Acceso al mostrador sin usuario | Login con Google (sin contraseñas), sesiones opacas revocables, roles dueño/mostrador, límite de intentos ([ADR-011](adr/ADR-011-autenticacion-sin-contrasenas.md)) | Hecho (#41) |
| No saber quién hizo qué | Cada evento lleva el usuario; el dueño lo consulta filtrado | Hecho (#41) |
| Robo del token de sesión del dispositivo | Token hasheado en la base; revocación desde la app; 90 días renovables | Hecho (#41) |
| Tráfico en claro | HTTPS obligatorio vía Caddy; la PWA no funciona sin él | Hecho |
| Pérdida de datos | Cuatro capas de respaldo ([ADR-002](adr/ADR-002-base-de-datos-respaldo-y-disponibilidad.md)) | Pendiente (#18, #19) |
| Contenedor corriendo como root | Usuario sin privilegios con uid fijo en ambos Dockerfiles | Hecho |

## Qué queda abierto

- Quien tenga acceso físico al navegador desbloqueado de la laptop opera como el usuario
  logueado. Mitigación: cerrar sesión al terminar el día o revocarla desde el celular.
- El plan gratuito de Supabase no tiene garantía de servicio ni respaldos propios: el
  respaldo es responsabilidad nuestra.
