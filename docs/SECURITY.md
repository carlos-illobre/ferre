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
| Servicios internos expuestos a internet | Solo Caddy publica puertos; `importador` solo es alcanzable en la red del compose | Hecho |
| Llamadas entre servicios sin autenticar | `TOKEN_SERVICIO` compartido, verificado en cada llamada interna | Pendiente (#6) |
| Acceso al mostrador sin usuario | Usuarios y roles dueño/mostrador, auditoría | Pendiente (#41) |
| Tráfico en claro | HTTPS obligatorio vía Caddy; la PWA no funciona sin él | Hecho |
| Pérdida de datos | Cuatro capas de respaldo ([ADR-002](adr/ADR-002-base-de-datos-respaldo-y-disponibilidad.md)) | Pendiente (#18, #19) |
| Contenedor corriendo como root | Usuario sin privilegios con uid fijo en ambos Dockerfiles | Hecho |

## Qué queda abierto

- Hasta el issue #41 la app no tiene login: en el MVP se confía en que la URL solo la
  conocen el dueño y el empleado. Es un riesgo aceptado para el piloto, no para después.
- El plan gratuito de Supabase no tiene garantía de servicio ni respaldos propios: el
  respaldo es responsabilidad nuestra.
