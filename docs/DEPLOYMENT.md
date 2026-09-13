# Despliegue

## Desarrollo local

```bash
cp .env.example .env
docker compose --profile local up -d --build --wait
```

El perfil `local` levanta un PostgreSQL en el compose; `DATABASE_URL` del `.env.example`
ya apunta ahí. La app queda en http://localhost. Para desarrollar la PWA con recarga en
caliente: `cd microservices/mostrador && pnpm dev` (API) y `pnpm --filter pwa dev` (Vite
en :5173, que reenvía `/health` y `/api` a la API).

## Producción: una máquina en Oracle Cloud

- Máquina Always Free, sin estado: corre Caddy, `mostrador` e `importador`.
- Base de datos en Supabase ([ADR-002](adr/ADR-002-base-de-datos-respaldo-y-disponibilidad.md)).
- Imágenes publicadas por CI en GHCR, etiquetadas por SHA corto
  ([ADR-007](adr/ADR-007-imagenes-en-ci-y-ghcr.md)).
- Configuración en `deployment/oracle-single/.env`, a partir de la plantilla
  `.env.oracle`. Nunca se versiona.
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
