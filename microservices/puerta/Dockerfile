# La puerta del servidor (specs/026, ADR-031): un Caddy con su configuración adentro. En la
# máquina solo está el compose, no los archivos del repositorio: por eso va en su propia imagen.
# Versión fija: el orden en que Caddy aplica las directivas no puede cambiar solo (revisión de 026).
FROM caddy:2.11.7-alpine
COPY Caddyfile /etc/caddy/Caddyfile
