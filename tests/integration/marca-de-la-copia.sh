#!/usr/bin/env bash
# La marca «xmin» de la copia del catálogo (specs/018, ADR-023) contra una base real: el cambio de
# una transacción que confirma tarde, después de que otra leyó, se lee la vez siguiente desde la
# marca; y mover un movimiento de stock (unir duplicados) lo anota. Deja la base como estaba.
# Necesita el stack (perfil local): con RAPIDO=1 se saltea (código 3).
set -uo pipefail
[[ "${RAPIDO:-0}" == "1" ]] && exit 3
cd "$(dirname "$0")/../.."
PSQL=${PSQL:-docker compose exec -T db psql -U ferre -d ferre}
P1=00000000-0000-0000-0000-0000000e1a01
P2=00000000-0000-0000-0000-0000000e1a02
sql() { $PSQL -v ON_ERROR_STOP=1 -tAc "$1"; }
limpiar() { sql "DELETE FROM movimiento_stock WHERE producto_id IN ('$P1','$P2'); DELETE FROM cambio_de_producto WHERE producto_id IN ('$P1','$P2'); DELETE FROM producto WHERE id IN ('$P1','$P2')" >/dev/null; }
limpiar
sql "INSERT INTO producto (id, descripcion) VALUES ('$P1', 'MARCA TARDE (INT)'), ('$P2', 'MARCA DESTINO (INT)')" >/dev/null

# Una transacción cambia el producto y tarda en confirmar; mientras tanto, otra lee la marca.
$PSQL -v ON_ERROR_STOP=1 -tAc "BEGIN; UPDATE producto SET margen_elegido = 77 WHERE id = '$P1'; SELECT pg_sleep(3); COMMIT;" >/dev/null &
lenta=$!
sleep 1
marca=$(sql "SELECT pg_snapshot_xmin(pg_current_snapshot())::text")
antes=$(sql "SELECT count(*) FROM cambio_de_producto WHERE producto_id = '$P1' AND transaccion >= '$marca'::xid8")
wait $lenta
despues=$(sql "SELECT count(*) FROM cambio_de_producto WHERE producto_id = '$P1' AND transaccion >= '$marca'::xid8")
if [[ "$antes" != "0" || "$despues" != "1" ]]; then
  echo "la marca perdió el cambio que confirmó tarde (antes de confirmar: $antes, después: $despues)"; limpiar; exit 1
fi

# Mover un movimiento de stock de un producto a otro lo anota con la transacción que lo movió.
sql "INSERT INTO movimiento_stock (id, producto_id, tipo, cantidad, fecha) VALUES (gen_random_uuid(), '$P1', 'ajuste', 5, now())" >/dev/null
marca=$(sql "SELECT pg_snapshot_xmin(pg_current_snapshot())::text")
sql "UPDATE movimiento_stock SET producto_id = '$P2' WHERE producto_id = '$P1'" >/dev/null
movido=$(sql "SELECT count(*) FROM movimiento_stock WHERE producto_id = '$P2' AND transaccion >= '$marca'::xid8")
limpiar
if [[ "$movido" != "1" ]]; then echo "el movimiento de stock movido no quedó anotado"; exit 1; fi
