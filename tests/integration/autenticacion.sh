#!/usr/bin/env bash
# La API exige sesión y respeta roles. Necesita el stack (perfil local): con RAPIDO=1 se
# saltea (código 3). Crea un dueño y un empleado con sesiones insertadas a mano (sin
# pasar por Google) y verifica 401, 403 y 200 donde corresponde.
set -uo pipefail
[[ "${RAPIDO:-0}" == "1" ]] && exit 3
cd "$(dirname "$0")/../.."

API=http://localhost
psql() { docker compose exec -T db psql -U ferre -d ferre -tAc "$1"; }
codigo() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

# Limpieza de corridas anteriores (en orden de dependencias).
psql "DELETE FROM vinculacion WHERE aprobada_por IN (SELECT id FROM usuario WHERE email LIKE 'prueba-%@ferre.test') OR sesion_id IN (SELECT id FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email LIKE 'prueba-%@ferre.test'))" >/dev/null
psql "DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email LIKE 'prueba-%@ferre.test')" >/dev/null
psql "DELETE FROM evento WHERE usuario_id IN (SELECT id FROM usuario WHERE email LIKE 'prueba-%@ferre.test')" >/dev/null
psql "UPDATE lista_importada SET cargada_por = NULL, aplicada_por = NULL WHERE cargada_por IN (SELECT id FROM usuario WHERE email LIKE 'prueba-%@ferre.test') OR aplicada_por IN (SELECT id FROM usuario WHERE email LIKE 'prueba-%@ferre.test')" >/dev/null
psql "DELETE FROM usuario WHERE email LIKE 'prueba-%@ferre.test'" >/dev/null

docker compose exec -T gestion-del-local node dist/crear-usuario.js prueba-dueno@ferre.test "Dueño de prueba" dueño >/dev/null || { echo "no se pudo crear el dueño"; exit 1; }
docker compose exec -T gestion-del-local node dist/crear-usuario.js prueba-empleado@ferre.test "Empleado de prueba" mostrador >/dev/null

# Token conocido, guardado hasheado como hace la API.
TOKEN_DUENO=token-de-prueba-dueno; TOKEN_EMPLEADO=token-de-prueba-empleado
for par in "$TOKEN_DUENO prueba-dueno@ferre.test" "$TOKEN_EMPLEADO prueba-empleado@ferre.test"; do
  set -- $par
  hash=$(printf '%s' "$1" | sha256sum | cut -d' ' -f1)
  psql "INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '$hash', 'prueba', now() + interval '1 day' FROM usuario WHERE email = '$2'" >/dev/null
done

fallos=0
verificar() { # descripción esperado real
  if [[ "$2" == "$3" ]]; then echo "  ok   $1"; else echo "  FALLÓ $1: esperado $2, respondió $3"; fallos=$((fallos+1)); fi
}
verificar "sin sesión, /sesiones/actual da 401"      401 "$(codigo $API/sesiones/actual)"
verificar "sin sesión, /usuarios da 401"             401 "$(codigo $API/usuarios)"
verificar "token inválido da 401"                    401 "$(codigo -H 'Authorization: Bearer cualquiera' $API/sesiones/actual)"
verificar "empleado ve su sesión"                    200 "$(codigo -H "Authorization: Bearer $TOKEN_EMPLEADO" $API/sesiones/actual)"
verificar "empleado no puede listar usuarios (403)"  403 "$(codigo -H "Authorization: Bearer $TOKEN_EMPLEADO" $API/usuarios)"
verificar "empleado no puede ver auditoría (403)"    403 "$(codigo -H "Authorization: Bearer $TOKEN_EMPLEADO" $API/auditoria)"
verificar "dueño lista usuarios"                     200 "$(codigo -H "Authorization: Bearer $TOKEN_DUENO" $API/usuarios)"
verificar "dueño autoriza un usuario nuevo"          201 "$(codigo -H "Authorization: Bearer $TOKEN_DUENO" -H 'Content-Type: application/json' -d '{"email":"prueba-nuevo@ferre.test","nombre":"Nuevo","rol":"mostrador"}' $API/usuarios)"
verificar "correo repetido da 409"                   409 "$(codigo -H "Authorization: Bearer $TOKEN_DUENO" -H 'Content-Type: application/json' -d '{"email":"prueba-nuevo@ferre.test","nombre":"Nuevo","rol":"mostrador"}' $API/usuarios)"
verificar "la auditoría registra el alta"            1   "$(psql "SELECT count(*) FROM evento e JOIN usuario u ON u.id = e.usuario_id WHERE e.tipo = 'usuario.creado' AND u.email = 'prueba-dueno@ferre.test'")"
verificar "login con Google sin credencial da 400"   400 "$(codigo -H 'Content-Type: application/json' -d '{}' $API/sesiones/google)"
verificar "credencial de Google inválida da 401"     401 "$(codigo -H 'Content-Type: application/json' -d '{"credencial":"basura"}' $API/sesiones/google)"

# Login por QR: la laptop crea la vinculación, el celular (empleado) aprueba, la laptop retira el token.
CODIGO=$(curl -s -H 'Content-Type: application/json' -d '{"dispositivo":"laptop de prueba"}' $API/sesiones/vinculaciones | python3 -c 'import json,sys; print(json.load(sys.stdin)["codigo"])')
verificar "QR pendiente antes de aprobar"            pendiente "$(curl -s $API/sesiones/vinculaciones/$CODIGO | python3 -c 'import json,sys; print(json.load(sys.stdin)["estado"])')"
verificar "el celular aprueba el QR"                 200 "$(codigo -X POST -H "Authorization: Bearer $TOKEN_EMPLEADO" $API/sesiones/vinculaciones/$CODIGO/aprobar)"
TOKEN_LAPTOP=$(curl -s $API/sesiones/vinculaciones/$CODIGO | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("token",""))')
verificar "la laptop recibe un token"                sí  "$([[ -n "$TOKEN_LAPTOP" ]] && echo sí || echo no)"
verificar "el token de la laptop sirve"              200 "$(codigo -H "Authorization: Bearer $TOKEN_LAPTOP" $API/sesiones/actual)"
verificar "el mismo QR no entrega el token dos veces" retirada "$(curl -s $API/sesiones/vinculaciones/$CODIGO | python3 -c 'import json,sys; print(json.load(sys.stdin)["estado"])')"
verificar "cerrar sesión da 204"                     204 "$(codigo -X DELETE -H "Authorization: Bearer $TOKEN_LAPTOP" $API/sesiones/actual)"
verificar "sesión cerrada ya no sirve"               401 "$(codigo -H "Authorization: Bearer $TOKEN_LAPTOP" $API/sesiones/actual)"

exit $(( fallos > 0 ))
