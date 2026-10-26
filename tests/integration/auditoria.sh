#!/usr/bin/env bash
# Auditoría (specs/027) contra el stack real: con Auditoría caída se vende igual y el evento llega
# cuando vuelve; un servicio que Auditoría no conoce le manda eventos por la red interna y salen en
# el reporte; la entrada de eventos no se publica y exige el token. Necesita el stack: con
# RAPIDO=1 se saltea (código 3).
set -uo pipefail
[[ "${RAPIDO:-0}" == "1" ]] && exit 3
cd "$(dirname "$0")/../.."

API=http://localhost
psql() { docker compose exec -T db psql -U mostrador -d mostrador -tAc "$1"; }
psqlAcceso() { docker compose exec -T db psql -U acceso -d acceso -tAc "$1"; }
psqlAuditoria() { docker compose exec -T db psql -U auditoria -d auditoria -tAc "$1"; }
codigo() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
# Lo que le llega a Auditoría tarda: se espera hasta $3 segundos (15 si no se dice) a que la consulta dé lo esperado.
hasta() { local r; for _ in $(seq $(( ${3:-15} * 2 ))); do r=$(psqlAuditoria "$2"); [[ "$r" == "$1" ]] && break; sleep 0.5; done; echo "$r"; }
# Un pedido desde la red interna, como lo haría otro servicio: desde el contenedor de Comercial.
adentro() { docker compose exec -T comercial node -e "fetch('http://auditoria:8095/v1/eventos', { method: 'POST', headers: { 'Content-Type': 'application/json', ...($2 ? { 'X-Token-Servicio': process.env.TOKEN_SERVICIO } : {}) }, body: process.argv[1] }).then(async (r) => console.log(r.status, await r.text()))" "$1"; }
fallos=0
verificar() { # descripción esperado real
  if [[ "$2" == "$3" ]]; then echo "  ok   $1"; else echo "  FALLÓ $1: esperado «$2», respondió «$3»"; fallos=$((fallos+1)); fi
}

# Una persona con todos los permisos y otra que solo vende, con sesiones conocidas.
psqlAcceso "DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email LIKE 'auditoria-%@ferre.test')" >/dev/null
psqlAcceso "DELETE FROM usuario_rol WHERE usuario_id IN (SELECT id FROM usuario WHERE email LIKE 'auditoria-%@ferre.test')" >/dev/null
psqlAcceso "DELETE FROM usuario WHERE email LIKE 'auditoria-%@ferre.test'" >/dev/null
docker compose exec -T acceso node dist/crear-usuario.js auditoria-duena@ferre.test "Dueña Auditoría" >/dev/null || { echo "no se pudo crear la persona"; exit 1; }
psqlAcceso "INSERT INTO usuario (id, email, nombre) VALUES (gen_random_uuid(), 'auditoria-vende@ferre.test', 'Vende')" >/dev/null
DUENA=token-auditoria-duena; VENDE=token-auditoria-vende
for par in "$DUENA auditoria-duena@ferre.test" "$VENDE auditoria-vende@ferre.test"; do
  set -- $par
  psqlAcceso "INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '$(printf '%s' "$1" | sha256sum | cut -d' ' -f1)', 'prueba', now() + interval '1 day' FROM usuario WHERE email = '$2'" >/dev/null
done
QUIEN=$(psqlAcceso "SELECT id FROM usuario WHERE email = 'auditoria-duena@ferre.test'")

# 027-E06: con Auditoría caída se vende igual; el evento espera en la bandeja de Comercial y llega cuando vuelve.
docker compose stop auditoria >/dev/null 2>&1
VENTA=$(cat /proc/sys/kernel/random/uuid)
verificar "027-E06: sin Auditoría, la venta se registra" 201 "$(codigo -H "Authorization: Bearer $DUENA" -H 'Content-Type: application/json' -d "{\"id\":\"$VENTA\",\"medio_pago\":\"efectivo\",\"items\":[{\"descripcion\":\"Tarugo auditoría\",\"cantidad\":2,\"precio_unitario\":150}]}" $API/ventas)"
verificar "027-E06: el evento espera en la bandeja" 1 "$(psql "SELECT count(*) FROM auditoria_bandeja WHERE evento->'contenido'->>'id' = '$VENTA' AND entregado_en IS NULL")"
verificar "027-E04: sin Auditoría, «Quién hizo qué» dice que no está disponible" 502 "$(codigo -H "Authorization: Bearer $DUENA" "$API/auditoria?pagina=1")"
docker compose start auditoria >/dev/null 2>&1
docker compose up -d --wait auditoria >/dev/null 2>&1
verificar "027-E06: al volver, el evento llega con quién y sus palabras" "Venta cobrada|Dueña Auditoría|Ventas|\$300 · Efectivo · 1 producto" \
  "$(hasta "Venta cobrada|Dueña Auditoría|Ventas|\$300 · Efectivo · 1 producto" "SELECT titulo, quien_nombre, grupo, detalle FROM auditoria.evento WHERE tipo = 'venta.registrada' AND contenido->>'id' = '$VENTA'" 90)"
verificar "027-E11: en la bandeja queda marcado como entregado" 1 "$(psql "SELECT count(*) FROM auditoria_bandeja WHERE evento->'contenido'->>'id' = '$VENTA' AND entregado_en IS NOT NULL")"

# 027-E12: un servicio que Auditoría no conoce manda un evento con el contrato v1 y sale en el reporte.
ID=$(cat /proc/sys/kernel/random/uuid)
EVENTO="{\"eventos\":[{\"id\":\"$ID\",\"servicio\":\"turnos\",\"tipo\":\"turno.dado\",\"fecha\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"quien\":{\"id\":\"$QUIEN\",\"nombre\":\"Dueña Auditoría\"},\"titulo\":\"Turno dado\",\"detalle\":\"Martes 10 h\",\"grupo\":\"Turnos de prueba\",\"importancia\":\"normal\"}]}"
verificar "027-E12: Auditoría guarda el evento de un servicio nuevo" '200 {"guardados":1}' "$(adentro "$EVENTO" true)"
verificar "027-E07: mandado otra vez, no se guarda dos veces" 1 "$(adentro "$EVENTO" true >/dev/null; psqlAuditoria "SELECT count(*) FROM auditoria.evento WHERE id = '$ID'")"
verificar "027-E12: sale en «Quién hizo qué» por la puerta" sí "$(curl -s -H "Authorization: Bearer $DUENA" "$API/auditoria?pagina=1&grupo=Turnos%20de%20prueba" | grep -q '"titulo":"Turno dado"' && echo sí || echo no)"
verificar "027-E12: su grupo aparece en el filtro «qué»" sí "$(curl -s -H "Authorization: Bearer $DUENA" "$API/auditoria/grupos" | grep -q '"Turnos de prueba"' && echo sí || echo no)"

# 027-E01: lo de Comercial y lo de Procesos, en la misma lista, lo más nuevo primero.
PROCESO="Auditoría $RANDOM"
codigo -H "Authorization: Bearer $DUENA" -H 'Content-Type: application/json' -d "{\"nombre\":\"$PROCESO\"}" $API/procesos >/dev/null
hasta 1 "SELECT count(*) FROM auditoria.evento WHERE tipo = 'proceso.creado' AND contenido->>'nombre' = '$PROCESO'" >/dev/null
lista=$(curl -s -H "Authorization: Bearer $DUENA" "$API/auditoria?pagina=1&usuario=$QUIEN")
verificar "027-E01: el proceso y la venta, en la misma lista y el proceso primero" "procesos,comercial" \
  "$(node -e 'const e = JSON.parse(process.argv[1]).eventos; const p = e.findIndex((x) => x.tipo === "proceso.creado"), v = e.findIndex((x) => x.tipo === "venta.registrada"); console.log(p >= 0 && v > p ? `${e[p].servicio},${e[v].servicio}` : JSON.stringify(e.map((x) => x.tipo)))' "$lista")"

# 027-E13: un evento que no cumple el contrato se rechaza diciendo qué está mal.
verificar "027-E13: una importancia que no existe se rechaza" "400" "$(adentro "${EVENTO/\"normal\"/\"alta\"}" true | cut -d' ' -f1)"

# 027-E14: sin el token entre servicios no se mandan eventos; y la puerta no publica la entrada.
verificar "027-E14: sin el token, Auditoría lo rechaza" 401 "$(adentro "$EVENTO" false | cut -d' ' -f1)"
verificar "027-E14: la entrada de eventos no se alcanza desde afuera" 404 "$(codigo -H "Authorization: Bearer $DUENA" -H 'Content-Type: application/json' -d "$EVENTO" $API/v1/eventos)"

# 027-E03: sin el permiso, los reportes no se ven.
verificar "027-E03: sin el permiso, 403" 403 "$(codigo -H "Authorization: Bearer $VENDE" "$API/auditoria?pagina=1")"
verificar "027-E03: ni los grupos" 403 "$(codigo -H "Authorization: Bearer $VENDE" "$API/auditoria/grupos")"

# RNF-74: la puerta arranca y Comercial atiende aunque Auditoría no esté.
docker compose stop auditoria >/dev/null 2>&1
docker compose up -d --wait --force-recreate --no-deps puerta >/dev/null 2>&1
verificar "RNF-74: sin Auditoría, la puerta arranca y Comercial atiende" 200 "$(codigo -H "Authorization: Bearer $DUENA" $API/sectores)"

# 027-E09: con AUDITORIA_URL vacía en el .env, Comercial funciona igual y no anota nada.
AUDITORIA_URL= docker compose up -d --wait --force-recreate --no-deps comercial >/dev/null 2>&1
APAGADA=$(cat /proc/sys/kernel/random/uuid)
verificar "027-E09: apagada, la venta se registra" 201 "$(codigo -H "Authorization: Bearer $DUENA" -H 'Content-Type: application/json' -d "{\"id\":\"$APAGADA\",\"medio_pago\":\"efectivo\",\"items\":[{\"descripcion\":\"Tarugo apagado\",\"cantidad\":1,\"precio_unitario\":10}]}" $API/ventas)"
verificar "027-E09: apagada, no anota nada" 0 "$(psql "SELECT count(*) FROM auditoria_bandeja WHERE evento->'contenido'->>'id' = '$APAGADA'")"
docker compose up -d --wait auditoria >/dev/null 2>&1
docker compose up -d --wait --force-recreate --no-deps comercial >/dev/null 2>&1

psqlAcceso "DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email LIKE 'auditoria-%@ferre.test')" >/dev/null
psql "DELETE FROM item_venta WHERE venta_id = '$APAGADA'; DELETE FROM venta WHERE id = '$APAGADA'" >/dev/null
psql "DELETE FROM item_venta WHERE venta_id = '$VENTA'; DELETE FROM venta WHERE id = '$VENTA'" >/dev/null
[[ $fallos -eq 0 ]]
