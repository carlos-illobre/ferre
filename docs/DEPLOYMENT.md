# Despliegue

## Desarrollo local

```bash
cp .env.example .env
docker compose --profile local up -d --build --wait
```

El perfil `local` levanta un PostgreSQL en el compose; `DATABASE_URL` del `.env.example`
ya apunta ahí. La API queda en http://localhost vía Caddy. El cliente web se sirve
aparte, como en producción (ADR-010):

```bash
VITE_API_URL=http://localhost pnpm --filter gestion-del-local-web dev
```

`ORIGEN_WEB` del `.env` tiene que coincidir con el origen desde el que se abre el
cliente (`http://localhost:4173` para `vite preview`; `http://localhost:5173` para `dev`).

## Producción: una máquina en Oracle Cloud

- Máquina Always Free, sin estado: corre Caddy, `gestion-del-local` y `listas-de-proveedores`.
- Base de datos en Supabase ([ADR-002](adr/ADR-002-base-de-datos-respaldo-y-disponibilidad.md)).
- Imágenes publicadas por CI en GHCR, etiquetadas por SHA corto
  ([ADR-007](adr/ADR-007-imagenes-en-ci-y-ghcr.md)).
- Configuración en `deployment/oracle-single/.env`, a partir de la plantilla
  `.env.oracle`. Nunca se versiona. `ORIGEN_WEB` es la URL de GitHub Pages.
- **Cliente web en GitHub Pages:** el job `cliente-web` de CI lo construye con la
  variable de repositorio `API_URL` (Settings → Secrets and variables → Actions →
  Variables) y lo publica en cada push a `master`. Es lo único que vive fuera del
  `.env`: dos variables de build, `VITE_API_URL` y `VITE_BASE`.
- TLS: Caddy emite y renueva solo ([ADR-006](adr/ADR-006-caddy.md)). Puertos 80 y 443
  abiertos en la Security List de la VCN, que es el firewall efectivo.

El script de despliegue, el preflight y la guía paso a paso se generan en el issue #19.

## Respaldo y recuperación

- Volcado horario de la base a Oracle Object Storage, retención 30 días.
- Copia semanal cifrada fuera de Oracle y de Supabase.
- Prueba mensual automática de restauración.
- Ante pérdida de la máquina: crear otra, copiar el `.env`, `docker compose pull && up`.
  Objetivo: menos de 30 minutos. El mostrador sigue vendiendo desde la PWA mientras tanto.

## Reversión

Cambiar `IMAGEN_TAG` en el `.env` al SHA anterior y volver a levantar.
