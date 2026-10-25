#!/usr/bin/env bash
# Las migraciones se aplicaron todas y el esquema tiene las tablas del modelo. Necesita
# el stack: con RAPIDO=1 se saltea (código 3).
set -uo pipefail
[[ "${RAPIDO:-0}" == "1" ]] && exit 3
cd "$(dirname "$0")/../.."

esperadas=$(ls microservices/comercial/src/persistencia/migraciones/*.sql | wc -l)
aplicadas=$(docker compose exec -T db psql -U mostrador -d mostrador -tAc "SELECT count(*) FROM kysely_migration" 2>/dev/null | tr -d '[:space:]')
if [[ "$aplicadas" != "$esperadas" ]]; then
  echo "migraciones aplicadas: ${aplicadas:-ninguna}, archivos: $esperadas"
  exit 1
fi

for tabla in proveedor lista_importada producto precio_proveedor cliente venta item_venta consulta compra item_compra movimiento_stock evento; do
  docker compose exec -T db psql -U mostrador -d mostrador -tAc "SELECT 1 FROM $tabla LIMIT 0" >/dev/null 2>&1 \
    || { echo "falta la tabla $tabla"; exit 1; }
done
