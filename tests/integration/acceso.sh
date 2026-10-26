#!/usr/bin/env bash
# Acceso en su propio servicio (specs/029) contra el stack real: las sesiones las atiende Acceso, la
# puerta le pregunta quién es la persona en cada pedido, una persona desactivada no pasa en ese mismo
# pedido, el nombre de cada acción es el de ese momento, las personas están en la base de Acceso y
# no en la de Comercial, y con Acceso caído la puerta corta la conexión. Necesita el stack: con
# RAPIDO=1 se saltea (código 3).
set -uo pipefail
[[ "${RAPIDO:-0}" == "1" ]] && exit 3
cd "$(dirname "$0")/../.."

API=http://localhost
valor() { grep -E "^$1=" .env | cut -d= -f2-; }
psql() { docker compose exec -T db psql -U mostrador -d mostrador -tAc "$1"; }
psqlAcceso() { docker compose exec -T db psql -U acceso -d acceso -tAc "$1"; }
psqlAuditoria() { docker compose exec -T db psql -U auditoria -d auditoria -tAc "$1"; }
codigo() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
# Lo que le llega a Auditoría tarda un momento: se espera hasta 15 s a que la consulta dé lo esperado.
hasta() { local r; for _ in $(seq 30); do r=$(psqlAuditoria "$2"); [[ "$r" == "$1" ]] && break; sleep 0.5; done; echo "$r"; }
fallos=0
verificar() { # descripción esperado real
  if [[ "$2" == "$3" ]]; then echo "  ok   $1"; else echo "  FALLÓ $1: esperado «$2», respondió «$3»"; fallos=$((fallos+1)); fi
}

# Quien administra (con el comando, 029-E09) y alguien que vende, con sesiones conocidas.
psqlAcceso "DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email LIKE 'acceso-%@ferre.test')" >/dev/null
psqlAcceso "DELETE FROM usuario_rol WHERE usuario_id IN (SELECT id FROM usuario WHERE email LIKE 'acceso-%@ferre.test')" >/dev/null
psqlAcceso "DELETE FROM usuario WHERE email LIKE 'acceso-%@ferre.test'" >/dev/null
docker compose exec -T acceso node dist/crear-usuario.js acceso-admin@ferre.test "Admin Acceso" >/dev/null || { echo "no se pudo crear la persona"; exit 1; }
docker compose exec -T acceso node dist/crear-usuario.js acceso-vende@ferre.test "Vende Antes" Vendedor >/dev/null || { echo "no se pudo crear la persona"; exit 1; }
ADMIN=token-acceso-admin; VENDE=token-acceso-vende
for par in "$ADMIN acceso-admin@ferre.test" "$VENDE acceso-vende@ferre.test"; do
  set -- $par
  psqlAcceso "INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '$(printf '%s' "$1" | sha256sum | cut -d' ' -f1)', 'prueba', now() + interval '1 day' FROM usuario WHERE email = '$2'" >/dev/null
done
ID_VENDE=$(psqlAcceso "SELECT id FROM usuario WHERE email = 'acceso-vende@ferre.test'")
ID_ADMIN=$(psqlAcceso "SELECT id FROM usuario WHERE email = 'acceso-admin@ferre.test'")
CON_ADMIN=(-H "Authorization: Bearer $ADMIN" -H 'Content-Type: application/json')
CON_VENDE=(-H "Authorization: Bearer $VENDE" -H 'Content-Type: application/json')

# 029-E09: la primera persona recibe todos los roles; la otra, solo el pedido.
verificar "029-E09: el comando de Acceso da todos los roles" t "$(psqlAcceso "SELECT (SELECT count(*) FROM usuario_rol WHERE usuario_id = '$ID_ADMIN') = (SELECT count(*) FROM rol)")"

# 029-E01: la sesión la atiende Acceso, con la persona y sus permisos.
verificar "029-E01: /sesiones/actual, de Acceso" sí "$(curl -s "${CON_VENDE[@]}" $API/sesiones/actual | grep -q '"nombre":"Vende Antes"' && echo sí || echo no)"

# 029-E02 029-E10: Comercial recibe a la persona hecha y anota la venta con su nombre de ese momento.
venta() { curl -s -o /dev/null -w '%{http_code}' "${CON_VENDE[@]}" -d "{\"id\":\"$1\",\"medio_pago\":\"efectivo\",\"items\":[{\"descripcion\":\"Tarugo acceso\",\"cantidad\":1,\"precio_unitario\":100}]}" $API/ventas; }
ANTES=$(cat /proc/sys/kernel/random/uuid); DESPUES=$(cat /proc/sys/kernel/random/uuid)
verificar "029-E02: quien vende registra en Comercial" 201 "$(venta "$ANTES")"
verificar "029-E02: sin el permiso, Comercial dice que falta" 403 "$(codigo "${CON_VENDE[@]}" $API/anomalias)"
verificar "029-E04: quien administra le cambia el nombre" 204 "$(codigo -X PATCH "${CON_ADMIN[@]}" -d '{"nombre":"Vende Después"}' $API/usuarios/$ID_VENDE)"
verificar "029-E02: la venta siguiente, con el nombre nuevo" 201 "$(venta "$DESPUES")"
verificar "029-E10: cada venta, con el nombre de ese momento" "Vende Antes|Vende Después" \
  "$(hasta "Vende Antes|Vende Después" "SELECT string_agg(quien_nombre, '|' ORDER BY fecha) FROM auditoria.evento WHERE tipo = 'venta.registrada' AND contenido->>'id' IN ('$ANTES', '$DESPUES')")"

# 029-E04: las reglas de siempre: nadie se desactiva a sí mismo.
verificar "029-E04: no se desactiva a sí mismo" 400 "$(codigo -X PATCH "${CON_ADMIN[@]}" -d '{"activo":false}' $API/usuarios/$ID_ADMIN)"

# 029-E03 029-E08: desactivada, la persona no pasa en su pedido siguiente, y el cambio llega a Auditoría.
verificar "029-E03: quien administra la desactiva" 204 "$(codigo -X PATCH "${CON_ADMIN[@]}" -d '{"activo":false}' $API/usuarios/$ID_VENDE)"
verificar "029-E03: Comercial la rechaza en ese pedido" 401 "$(codigo "${CON_VENDE[@]}" $API/sectores)"
verificar "029-E08: el cambio llega a Auditoría, de Acceso" "acceso|Admin Acceso" \
  "$(hasta "acceso|Admin Acceso" "SELECT servicio || '|' || quien_nombre FROM auditoria.evento WHERE tipo = 'usuario.modificado' AND contenido->>'id' = '$ID_VENDE' AND contenido->'cambios'->>'activo' = 'false' ORDER BY fecha DESC LIMIT 1")"

# 029-E11: las personas están en la base de Acceso y no en la de Comercial.
verificar "029-E11: Comercial no tiene tablas de personas" 0 "$(psql "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('usuario', 'sesion', 'rol', 'rol_permiso', 'usuario_rol', 'credencial', 'puesto', 'vinculacion', 'cambio_apartado')")"
verificar "029-E11: Acceso las tiene" 9 "$(psqlAcceso "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('usuario', 'sesion', 'rol', 'rol_permiso', 'usuario_rol', 'credencial', 'puesto', 'vinculacion', 'cambio_apartado')")"

# Seguridad: Acceso no se publica y, sin el token entre servicios, no le dice a nadie quién es quién.
verificar "seguridad: Acceso no se publica" no "$([[ "$(docker compose port acceso 8097 2>/dev/null)" =~ ^(|:0)$ ]] && echo no || echo sí)"
verificar "seguridad: /sesiones/quien sin el token, 401" 401 "$(docker compose exec -T comercial node -e "fetch('http://acceso:8097/sesiones/quien', { headers: { Authorization: 'Bearer $ADMIN' } }).then((r) => console.log(r.status))")"

# 029-E05: con Acceso parado, la puerta corta la conexión (la aplicación lo toma como sin conexión).
docker compose stop acceso >/dev/null 2>&1
curl -s -o /dev/null -H "Authorization: Bearer $ADMIN" "http://127.0.0.1:$(valor PUERTO_API)/sectores"; corte=$?
verificar "029-E05: sin Acceso, la puerta corta la conexión a Comercial" si "$([[ $corte -eq 52 || $corte -eq 56 ]] && echo si || echo "no ($corte)")"
curl -s -o /dev/null -H "Authorization: Bearer $ADMIN" "http://127.0.0.1:$(valor PUERTO_API)/sesiones/actual"; corte=$?
verificar "029-E05: sin Acceso, la puerta corta la conexión a las sesiones" si "$([[ $corte -eq 52 || $corte -eq 56 ]] && echo si || echo "no ($corte)")"
verificar "029-E05: lo que llega al navegador no lleva CORS" 0 "$(curl -s -o /dev/null -D - -H "Authorization: Bearer $ADMIN" -H "Origin: $(valor ORIGEN_WEB)" $API/sectores | grep -ic '^access-control-allow-origin:')"
docker compose up -d --wait acceso >/dev/null 2>&1
verificar "029-E05: de vuelta Acceso, Comercial atiende" 200 "$(codigo -H "Authorization: Bearer $ADMIN" $API/sectores)"

psql "DELETE FROM item_venta WHERE venta_id IN ('$ANTES', '$DESPUES'); DELETE FROM venta WHERE id IN ('$ANTES', '$DESPUES')" >/dev/null
psqlAcceso "DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email LIKE 'acceso-%@ferre.test')" >/dev/null
[[ $fallos -eq 0 ]]
