#!/usr/bin/env bash
# Cargar y aplicar listas de precios de punta a punta (issues #7 a #12): alta de
# proveedores con su configuración, carga de las muestras (detección automática del
# proveedor), vista previa, aplicación, y reaplicar no duplica. Necesita el stack.
set -uo pipefail
[[ "${RAPIDO:-0}" == "1" ]] && exit 3
cd "$(dirname "$0")/../.."

API=http://localhost
MUESTRAS=microservices/listas-de-proveedores/tests/muestras
psql() { docker compose exec -T db psql -U ferre -d ferre -tAc "$1"; }
json() { python3 -c "import json,sys; d=json.load(sys.stdin); print(eval('d$1'))"; }

# Dueño de prueba con sesión sembrada (como en autenticacion.sh).
psql "DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = 'prueba-listas@ferre.test')" >/dev/null
psql "INSERT INTO usuario (id, email, nombre, rol) SELECT gen_random_uuid(), 'prueba-listas@ferre.test', 'Dueño listas', 'dueño' WHERE NOT EXISTS (SELECT 1 FROM usuario WHERE email = 'prueba-listas@ferre.test')" >/dev/null
TOKEN=token-de-prueba-listas
psql "INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '$(printf '%s' "$TOKEN" | sha256sum | cut -d' ' -f1)', 'prueba', now() + interval '1 day' FROM usuario WHERE email = 'prueba-listas@ferre.test'" >/dev/null
AUTH="Authorization: Bearer $TOKEN"

# Limpieza de corridas anteriores (los proveedores de prueba y todo lo que cuelga de ellos).
for p in "Comodo (prueba)" "3GE (prueba)" "ERPA (prueba)" "Ixnova (prueba)"; do
  psql "DELETE FROM equivalencia_sugerida WHERE producto_a IN (SELECT id FROM producto WHERE proveedor_preferido_id IN (SELECT id FROM proveedor WHERE nombre = '$p')) OR producto_b IN (SELECT id FROM producto WHERE proveedor_preferido_id IN (SELECT id FROM proveedor WHERE nombre = '$p'))" >/dev/null
  psql "DELETE FROM precio_proveedor WHERE proveedor_id IN (SELECT id FROM proveedor WHERE nombre = '$p')" >/dev/null
  psql "DELETE FROM lista_importada WHERE proveedor_id IN (SELECT id FROM proveedor WHERE nombre = '$p')" >/dev/null
  psql "DELETE FROM producto WHERE proveedor_preferido_id IN (SELECT id FROM proveedor WHERE nombre = '$p') AND id NOT IN (SELECT producto_id FROM precio_proveedor)" >/dev/null
  psql "DELETE FROM proveedor WHERE nombre = '$p'" >/dev/null
done

fallos=0
verificar() { if [[ "$2" == "$3" ]]; then echo "  ok   $1"; else echo "  FALLÓ $1: esperado $2, respondió $3"; fallos=$((fallos+1)); fi; }
alta() { curl -s -H "$AUTH" -H 'Content-Type: application/json' -d "$1" $API/proveedores | json '["id"]'; }

# Otras corridas (los E2E) pueden haber dejado otro proveedor con el lector comodo; la
# detección tiene que caer en el de esta prueba.
psql "UPDATE proveedor SET lector = NULL WHERE lector = 'comodo'" >/dev/null
COMODO=$(alta '{"nombre":"Comodo (prueba)","descuento_contado":0.05,"lector":"comodo"}')
TRESGE=$(alta '{"nombre":"3GE (prueba)","lector":"tresge"}')
alta '{"nombre":"ERPA (prueba)","lector":"erpa"}' >/dev/null
alta '{"nombre":"Ixnova (prueba)","lector":"ixnova"}' >/dev/null
verificar "alta de proveedor devuelve id" sí "$([[ ${#COMODO} -eq 36 ]] && echo sí || echo no)"
verificar "descuento fuera de rango da 400" 400 "$(curl -s -o /dev/null -w '%{http_code}' -H "$AUTH" -H 'Content-Type: application/json' -d '{"nombre":"X","descuento_general":25}' $API/proveedores)"

# Carga sin indicar proveedor: se detecta por la planilla.
R=$(curl -s -H "$AUTH" -F "archivo=@$MUESTRAS/LISTA GENERAL PRUEBA 11-8.xlsx" $API/listas)
LISTA=$(echo "$R" | json '["id"]')
verificar "detecta Comodo y crea la lista pendiente" "Comodo (prueba)" "$(echo "$R" | json '["proveedor"]')"
verificar "resumen: 4 leídas, 1 salteada, 4 nuevas" "4 1 4" "$(echo "$R" | json '["resumen"]["leidas"], d["resumen"]["salteadas"], d["resumen"]["nuevos"]' | tr -d "(),")"
verificar "vista previa trae filas con explicación" sí "$(curl -s -H "$AUTH" $API/listas/$LISTA/filas | json '["filas"][0]["explicacion"][0][:15]' | grep -q "Precio de lista" && echo sí || echo no)"
verificar "todavía no hay precios" 0 "$(psql "SELECT count(*) FROM precio_proveedor WHERE proveedor_id = '$COMODO'")"

A=$(curl -s -X POST -H "$AUTH" $API/listas/$LISTA/aplicar)
verificar "aplicar crea 4 productos y precios" "aplicada 4 0" "$(echo "$A" | json '["estado"], d["nuevos"], d["modificados"]' | tr -d "(),'")"
verificar "precios guardados" 4 "$(psql "SELECT count(*) FROM precio_proveedor WHERE proveedor_id = '$COMODO'")"
verificar "costo neto con descuento de línea y contado" 712.5000 "$(psql "SELECT costo_neto FROM precio_proveedor WHERE proveedor_id = '$COMODO' AND codigo_proveedor = 'MP001'")"
verificar "aplicar dos veces da 409" 409 "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "$AUTH" $API/listas/$LISTA/aplicar)"

# La misma lista otra vez: nada nuevo, nada modificado, ningún precio duplicado.
R2=$(curl -s -H "$AUTH" -F "archivo=@$MUESTRAS/LISTA GENERAL PRUEBA 11-8.xlsx" -F "proveedor_id=$COMODO" $API/listas)
verificar "recargar: 0 nuevos, 4 sin cambio" "0 4" "$(echo "$R2" | json '["resumen"]["nuevos"], d["resumen"]["sin_cambio"]' | tr -d "(),")"
curl -s -X POST -H "$AUTH" $API/listas/$(echo "$R2" | json '["id"]')/aplicar >/dev/null
verificar "reaplicar no duplica precios" 4 "$(psql "SELECT count(*) FROM precio_proveedor WHERE proveedor_id = '$COMODO'")"
verificar "un solo producto por código" 4 "$(psql "SELECT count(DISTINCT producto_id) FROM precio_proveedor WHERE proveedor_id = '$COMODO'")"

# Descartar una lista pendiente.
R3=$(curl -s -H "$AUTH" -F "archivo=@$MUESTRAS/Lista 3GE PRUEBA 26-08-26.xlsx" $API/listas)
verificar "3GE detectado con 3 filas" "3" "$(echo "$R3" | json '["resumen"]["leidas"]')"
verificar "descartar da 204" 204 "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "$AUTH" $API/listas/$(echo "$R3" | json '["id"]')/descartar)"
verificar "la lista descartada no aplicó nada" 0 "$(psql "SELECT count(*) FROM precio_proveedor WHERE proveedor_id = '$TRESGE'")"

# Planilla sin fecha y sin proveedor reconocible.
verificar "archivo irreconocible da 422" 422 "$(curl -s -o /dev/null -w '%{http_code}' -H "$AUTH" -F "archivo=@README.md" $API/listas)"

# Lista real completa si está en esta máquina.
if [[ -f "privado/lista_precios_ixnova_14-8-2026.xlsx" ]]; then
  R4=$(curl -s -H "$AUTH" -F "archivo=@privado/lista_precios_ixnova_14-8-2026.xlsx" $API/listas)
  verificar "Ixnova real: 4109 filas leídas" 4109 "$(echo "$R4" | json '["resumen"]["leidas"]')"
  A4=$(curl -s -X POST -H "$AUTH" $API/listas/$(echo "$R4" | json '["id"]')/aplicar)
  verificar "Ixnova real aplicada: 4109 productos nuevos" 4109 "$(echo "$A4" | json '["nuevos"]')"
fi

verificar "la auditoría registró la aplicación" sí "$([[ $(psql "SELECT count(*) FROM evento WHERE tipo = 'lista.aplicada'") -ge 1 ]] && echo sí || echo no)"
exit $(( fallos > 0 ))
