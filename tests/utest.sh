#!/usr/bin/env bash
# Unitarias de todos los servicios, clientes y librerías. La capa de datos de cada servicio se
# prueba contra PostgreSQL y con el 100 % de cobertura (ADR-004, ADR-025): levanta la base del
# compose si no está y le pasa a las pruebas la cadena del administrador, armada con el .env.
set -euo pipefail
cd "$(dirname "$0")/.."

valor() { grep "^$1=" .env | cut -d= -f2-; }
if [ -z "${BASE_DE_PRUEBAS:-}" ]; then
  docker compose up -d --wait db >/dev/null
  export BASE_DE_PRUEBAS="postgres://postgres:$(valor CLAVE_BASE_ADMIN)@127.0.0.1:$(valor PUERTO_BASE)/postgres"
fi

echo "== TypeScript (workspace)"
pnpm -r test

echo "== Capa de datos, con cobertura"
pnpm -r --if-present test:persistencia

echo "== listas-de-proveedores"
(cd microservices/listas && uv run pytest -q)
