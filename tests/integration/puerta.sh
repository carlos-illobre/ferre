#!/usr/bin/env bash
# La puerta del servidor (specs/026, ADR-031) contra el stack real: reparte por ruta, pregunta
# quién es la persona, borra las cabeceras de identidad que manda el navegador, atiende el CORS,
# y es lo único que se publica. Necesita el stack: con RAPIDO=1 se saltea (código 3).
set -uo pipefail
[[ "${RAPIDO:-0}" == "1" ]] && exit 3
cd "$(dirname "$0")/../.."

API=http://localhost
valor() { grep -E "^$1=" .env | cut -d= -f2-; }
ORIGEN=$(valor ORIGEN_WEB)
psql() { docker compose exec -T db psql -U mostrador -d mostrador -tAc "$1"; }
psqlProcesos() { docker compose exec -T db psql -U procesos -d procesos -tAc "$1"; }
psqlAuditoria() { docker compose exec -T db psql -U auditoria -d auditoria -tAc "$1"; }
# Lo que le llega a Auditoría tarda un momento: se espera hasta 15 s a que la consulta dé lo esperado.
hasta() { local r; for _ in $(seq 30); do r=$(psqlAuditoria "$2"); [[ "$r" == "$1" ]] && break; sleep 0.5; done; echo "$r"; }
codigo() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
fallos=0
verificar() { # descripción esperado real
  if [[ "$2" == "$3" ]]; then echo "  ok   $1"; else echo "  FALLÓ $1: esperado «$2», respondió «$3»"; fallos=$((fallos+1)); fi
}

# Una persona con todos los permisos y otra que solo vende, con sesiones conocidas.
psql "DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email LIKE 'puerta-%@ferre.test')" >/dev/null
psql "DELETE FROM usuario_rol WHERE usuario_id IN (SELECT id FROM usuario WHERE email LIKE 'puerta-%@ferre.test')" >/dev/null
psql "DELETE FROM usuario WHERE email LIKE 'puerta-%@ferre.test'" >/dev/null
docker compose exec -T comercial node dist/crear-usuario.js puerta-duena@ferre.test "Dueña Núñez" >/dev/null || { echo "no se pudo crear la persona"; exit 1; }
psql "INSERT INTO usuario (id, email, nombre) VALUES (gen_random_uuid(), 'puerta-vende@ferre.test', 'Vende')" >/dev/null
DUENA=token-puerta-duena; VENDE=token-puerta-vende
for par in "$DUENA puerta-duena@ferre.test" "$VENDE puerta-vende@ferre.test"; do
  set -- $par
  psql "INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '$(printf '%s' "$1" | sha256sum | cut -d' ' -f1)', 'prueba', now() + interval '1 day' FROM usuario WHERE email = '$2'" >/dev/null
done

# 026-E01: lo de Comercial pasa por la puerta.
verificar "026-E01: /sesiones/actual llega a Comercial" 200 "$(codigo -H "Authorization: Bearer $DUENA" $API/sesiones/actual)"

# 026-E02: Procesos recibe quién es y qué puede, y anota el cambio con el nombre de la persona.
nombre="Puerta $RANDOM"
verificar "026-E02: con sesión y permiso, Procesos crea" 201 "$(codigo -H "Authorization: Bearer $DUENA" -H 'Content-Type: application/json' -d "{\"nombre\":\"$nombre\"}" $API/procesos)"
verificar "026-E02 026-E10: Procesos anota quién lo hizo" "Dueña Núñez" "$(hasta "Dueña Núñez" "SELECT quien_nombre FROM auditoria.evento WHERE tipo = 'proceso.creado' AND contenido->>'nombre' = '$nombre'")"
verificar "026-E02: sin el permiso de Procesos, Procesos dice que falta" 403 "$(codigo -H "Authorization: Bearer $VENDE" $API/procesos)"

# 026-E03: sin sesión, la puerta no pasa el pedido y devuelve el aviso de siempre.
verificar "026-E03: sin sesión, 401" '{"error":"Hay que iniciar sesión"}' "$(curl -s $API/procesos)"
verificar "026-E03: con la sesión cerrada, 401" 401 "$(codigo -H 'Authorization: Bearer cualquiera' $API/procesos)"

# Seguridad (plan de 026): las cabeceras de identidad que manda el navegador no valen.
falsas=(-H "X-Usuario-Id: alguien" -H "X-Usuario-Nombre: Falso" -H "X-Permisos: procesos.ver,procesos.dibujar" -H "X-Token-Servicio: inventado")
verificar "seguridad: sin sesión, las cabeceras falsas no alcanzan" 401 "$(codigo "${falsas[@]}" $API/procesos)"
verificar "seguridad: con sesión sin permiso, los permisos falsos no alcanzan" 403 "$(codigo "${falsas[@]}" -H "Authorization: Bearer $VENDE" -H 'Content-Type: application/json' -d '{"nombre":"Falso"}' $API/procesos)"

# 026-E04: una ruta que nadie atiende.
verificar "026-E04: ruta inexistente, 404" 404 "$(codigo -H "Authorization: Bearer $DUENA" $API/no-existe)"

# 026-E05: la puerta tiene su salud y el compose la vigila.
verificar "026-E05: la salud de la puerta" ok "$(curl -s $API/puerta/salud)"
verificar "026-E05: el contenedor de la puerta está sano" healthy "$(docker compose ps --format '{{.Health}}' puerta)"

# 026-E06: solo la puerta se publica.
publicado() { [[ "$(docker compose port "$1" "$2" 2>/dev/null)" =~ ^(|:0)$ ]] && echo no || echo sí; }
verificar "026-E06: Comercial no se publica" no "$(publicado comercial 8080)"
verificar "026-E06: Procesos no se publica" no "$(publicado procesos 8090)"
verificar "026-E06: la puerta, solo en 127.0.0.1" 1 "$(docker compose port puerta 8080 | grep -c '^127\.0\.0\.1:')"

# 026-E07: desde la red interna, sin el token entre servicios, los servicios rechazan.
verificar "026-E07: Comercial sin token, 401" 401 "$(docker compose exec -T puerta wget -S -qO- http://comercial:8080/sesiones/actual 2>&1 | grep -o 'HTTP/1.1 [0-9]*' | head -1 | cut -d' ' -f2)"
verificar "026-E07: Procesos sin token, 401" 401 "$(docker compose exec -T puerta wget -S -qO- http://procesos:8090/procesos 2>&1 | grep -o 'HTTP/1.1 [0-9]*' | head -1 | cut -d' ' -f2)"

# 026-E09 y 025-E09: el CORS lo atiende la puerta, para el origen de la web.
previa=$(curl -s -o /dev/null -D - -X OPTIONS -H "Origin: $ORIGEN" -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: authorization,content-type' $API/procesos | tr -d '\r')
verificar "026-E09: la consulta previa, 204" 204 "$(printf '%s\n' "$previa" | head -1 | cut -d' ' -f2)"
verificar "026-E09: la consulta previa permite el origen de la web" "$ORIGEN" "$(printf '%s\n' "$previa" | grep -i '^access-control-allow-origin:' | cut -d' ' -f2)"
verificar "026-E09: la consulta previa permite Authorization" 1 "$(printf '%s\n' "$previa" | grep -ic '^access-control-allow-headers:.*authorization')"
respuesta=$(curl -s -o /dev/null -D - -H "Origin: $ORIGEN" $API/health | tr -d '\r')
verificar "026-E09: una respuesta lleva el origen de la web" "$ORIGEN" "$(printf '%s\n' "$respuesta" | grep -i '^access-control-allow-origin:' | cut -d' ' -f2)"
verificar "025-E09: el navegador puede leer X-Avisos" 1 "$(printf '%s\n' "$respuesta" | grep -ic '^access-control-expose-headers:.*x-avisos')"
verificar "025-E09: la respuesta lleva X-Avisos" 1 "$(printf '%s\n' "$respuesta" | grep -ic '^x-avisos:')"

# 026-E08: Procesos sin responder: la puerta lo dice con palabras y lo demás sigue andando.
docker compose stop procesos >/dev/null 2>&1
verificar "026-E08: Procesos caído, 502 con el aviso" '{"error":"Procesos no responde ahora. Probá de nuevo en un rato"}' "$(curl -s -H "Authorization: Bearer $DUENA" $API/procesos)"
verificar "026-E08: Comercial sigue andando" 200 "$(codigo -H "Authorization: Bearer $DUENA" $API/sesiones/actual)"
docker compose start procesos >/dev/null 2>&1
docker compose up -d --wait >/dev/null 2>&1

# Comercial sin responder: la puerta corta la conexión, como si no hubiera red (la aplicación sigue
# con lo que tiene en el dispositivo), en vez de contestar un error.
docker compose stop comercial >/dev/null 2>&1
curl -s -o /dev/null "http://127.0.0.1:$(valor PUERTO_API)/sesiones/actual"; corte=$?
verificar "026: Comercial caído, la puerta corta la conexión (sin respuesta)" si "$([[ $corte -eq 52 || $corte -eq 56 ]] && echo si || echo "no ($corte)")"
# El proxy de adelante (el de la máquina, o el de desarrollo) contesta 502 sin CORS: para el
# navegador es una falla de red.
verificar "026: Comercial caído, lo que llega al navegador no lleva CORS" 0 "$(curl -s -o /dev/null -D - -H "Origin: $ORIGEN" $API/sesiones/actual | grep -ic '^access-control-allow-origin:')"
docker compose start comercial >/dev/null 2>&1
docker compose up -d --wait >/dev/null 2>&1

[[ $fallos -eq 0 ]] || { echo "$fallos verificación(es) de la puerta fallaron"; exit 1; }
