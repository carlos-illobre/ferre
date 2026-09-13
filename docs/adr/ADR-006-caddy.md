# ADR-006: Caddy como reverse proxy con TLS automático

**Estado:** Aceptado
**Fecha:** 2026-09-13

---

## Contexto

La PWA necesita HTTPS: sin él, el navegador no registra el service worker y no hay modo
offline (ADR-001). Hay dominio propio. La máquina es una sola y quien opera es el dueño,
sin tiempo para renovar certificados a mano.

## Opciones consideradas

### 1. nginx más certbot
Lo más conocido. Dos procesos, un cron de renovación y una recarga del proxy después de
renovar que se olvida: un certificado nuevo en disco que nginx no releyó sigue sirviendo
el viejo hasta que alguien reinicia.

### 2. Caddy (elegida)
Emite el certificado al arrancar, lo renueva a los 60 días y lo carga en caliente. El
`Caddyfile` completo son tres líneas. El dueño confirmó que prefiere Caddy.

### 3. Traefik
Hace lo mismo que Caddy con descubrimiento por etiquetas de Docker. Más configuración
para un solo servicio detrás.

## Decisión

Caddy en el compose, con el dominio tomado del `.env` (`SITIO`) y un volumen para el
estado de ACME. Con `SITIO=http://localhost` sirve HTTP plano en desarrollo. Los
servicios no publican puertos: solo Caddy es alcanzable desde afuera.

## Consecuencias

### Positivas
- Cero operación de certificados.
- Un solo archivo de configuración legible.

### Negativas
- Si el puerto 80 se cierra después de la primera emisión, la renovación falla en
  silencio a los 60 días. El preflight de despliegue lo verifica.

### Lo que no cambia
El firewall efectivo sigue siendo la Security List de Oracle (skill
`desplegar-en-oracle-cloud`).

## Cuándo revisar esta decisión

- Si aparece un segundo dominio o un servicio con reglas de enrutamiento complejas.

## Referencias

ADR-001. Skill `desplegar-en-oracle-cloud`, `referencias/operacion.md`.
