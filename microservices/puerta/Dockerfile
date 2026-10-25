# La puerta del servidor (specs/026, ADR-031): un Caddy con su configuración adentro. En la
# máquina solo está el compose, no los archivos del repositorio: por eso va en su propia imagen.
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
