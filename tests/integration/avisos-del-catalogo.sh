#!/usr/bin/env bash
# La base anota qué productos cambiaron y avisa (specs/018, RF-124): altas, costos, productos
# movidos entre duplicados, el nombre de un proveedor, márgenes y bajas. Corre dentro de una
# transacción que se deshace. Necesita el stack: con RAPIDO=1 se saltea (código 3).
set -uo pipefail
[[ "${RAPIDO:-0}" == "1" ]] && exit 3
cd "$(dirname "$0")/../.."

salida=$(${PSQL:-docker compose exec -T db psql -U mostrador -d mostrador} -v ON_ERROR_STOP=1 -tA 2>&1 <<'SQL'
BEGIN;
INSERT INTO proveedor (id,nombre) VALUES ('00000000-0000-0000-0000-0000000000a1','Prov A'),('00000000-0000-0000-0000-0000000000a2','Prov B');
INSERT INTO producto (id,descripcion) VALUES ('00000000-0000-0000-0000-000000000001','Tornillo'),('00000000-0000-0000-0000-000000000002','Tuerca'),('00000000-0000-0000-0000-000000000003','Clavo');
SELECT 'alta=' || count(*) FROM cambio_de_producto WHERE producto_id::text LIKE '00000000-0000-0000-0000-00000000000%';
DELETE FROM cambio_de_producto;
INSERT INTO precio_proveedor (id,producto_id,proveedor_id,codigo_proveedor,precio_lista,costo_neto,fecha_lista) VALUES (gen_random_uuid(),'00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','T1',10,10,'2026-10-01'),(gen_random_uuid(),'00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a2','T2',10,10,'2026-10-01');
SELECT 'precio=' || string_agg(right(producto_id::text,1),',' ORDER BY producto_id) FROM cambio_de_producto;
DELETE FROM cambio_de_producto;
UPDATE precio_proveedor SET producto_id='00000000-0000-0000-0000-000000000003' WHERE producto_id='00000000-0000-0000-0000-000000000002';
SELECT 'mover=' || string_agg(right(producto_id::text,1),',' ORDER BY producto_id) FROM cambio_de_producto;
DELETE FROM cambio_de_producto;
UPDATE proveedor SET whatsapp='1' WHERE id='00000000-0000-0000-0000-0000000000a1';
SELECT 'proveedor-sin-nombre=' || count(*) FROM cambio_de_producto;
UPDATE proveedor SET nombre='Prov A2' WHERE id='00000000-0000-0000-0000-0000000000a1';
SELECT 'proveedor-nombre=' || string_agg(right(producto_id::text,1),',') FROM cambio_de_producto;
DELETE FROM cambio_de_producto;
UPDATE producto SET margen_elegido=50 WHERE id='00000000-0000-0000-0000-000000000002';
SELECT 'margen=' || string_agg(right(producto_id::text,1),',') FROM cambio_de_producto;
DELETE FROM cambio_de_producto;
DELETE FROM precio_proveedor WHERE producto_id='00000000-0000-0000-0000-000000000001';
SELECT 'baja-costo=' || string_agg(right(producto_id::text,1),',') FROM cambio_de_producto;
ROLLBACK;
SQL
)
esperado=$'alta=3\nprecio=1,2\nmover=2,3\nproveedor-sin-nombre=0\nproveedor-nombre=1\nmargen=2\nbaja-costo=1'
obtenido=$(grep -E '^[a-z-]+=' <<<"$salida")
if [[ "$obtenido" != "$esperado" ]]; then
  echo "los cambios anotados no son los esperados:"; echo "$salida"; exit 1
fi
