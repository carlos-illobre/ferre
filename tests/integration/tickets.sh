#!/usr/bin/env bash
# Tickets en su propio servicio (specs/028) contra el stack real: se cargan, se ven, se resuelven y
# se reabren por la puerta como antes; las fotos las sirve Tickets; están en su base y no en la de
# Comercial; sin token no atiende; caído, la puerta corta la conexión. Necesita el stack: con
# RAPIDO=1 se saltea (código 3).
set -uo pipefail
[[ "${RAPIDO:-0}" == "1" ]] && exit 3
cd "$(dirname "$0")/../.."

API=http://localhost
psql() { docker compose exec -T db psql -U mostrador -d mostrador -tAc "$1"; }
psqlAcceso() { docker compose exec -T db psql -U acceso -d acceso -tAc "$1"; }
psqlTickets() { docker compose exec -T db psql -U tickets -d tickets -tAc "$1"; }
psqlAuditoria() { docker compose exec -T db psql -U auditoria -d auditoria -tAc "$1"; }
codigo() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
hasta() { local r; for _ in $(seq 30); do r=$(psqlAuditoria "$2"); [[ "$r" == "$1" ]] && break; sleep 0.5; done; echo "$r"; }
fallos=0
verificar() { # descripción esperado real
  if [[ "$2" == "$3" ]]; then echo "  ok   $1"; else echo "  FALLÓ $1: esperado «$2», respondió «$3»"; fallos=$((fallos+1)); fi
}

# Una persona con sesión conocida.
psqlAcceso "DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = 'tickets-ana@ferre.test')" >/dev/null
psqlAcceso "DELETE FROM usuario WHERE email = 'tickets-ana@ferre.test'" >/dev/null
psqlAcceso "INSERT INTO usuario (id, email, nombre) VALUES (gen_random_uuid(), 'tickets-ana@ferre.test', 'Ana Tickets')" >/dev/null
ANA=token-tickets-ana
psqlAcceso "INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '$(printf '%s' "$ANA" | sha256sum | cut -d' ' -f1)', 'prueba', now() + interval '1 day' FROM usuario WHERE email = 'tickets-ana@ferre.test'" >/dev/null
CON=(-H "Authorization: Bearer $ANA")

# 028-E01: cargar con foto por la puerta; un reenvío no se guarda dos veces.
ID=$(cat /proc/sys/kernel/random/uuid)
FOTO=$(mktemp --suffix=.png); printf '\x89PNG\r\n\x1a\nfoto' > "$FOTO"
cargar() { codigo "${CON[@]}" -F "id=$ID" -F tipo=error -F "descripcion=No imprime el ticket" -F dispositivo=Prueba -F "fotos=@$FOTO;type=image/png" $API/tickets; }
verificar "028-E01: se carga con su foto" 201 "$(cargar)"
verificar "028-E01: un reenvío no se guarda dos veces" 200 "$(cargar)"
verificar "028-E01: está en la base de Tickets, con el nombre de quien lo cargó" "1|Ana Tickets" "$(psqlTickets "SELECT count(*) || '|' || max(usuario_nombre) FROM tickets.ticket WHERE id = '$ID'")"
verificar "028-E08: Comercial ya no tiene tablas de tickets" 0 "$(psql "SELECT count(*) FROM information_schema.tables WHERE table_name LIKE 'ticket%'")"
verificar "028-E01: las validaciones de siempre" '{"error":"Decí si es un error o una mejora"}' "$(curl -s "${CON[@]}" -F "id=$(cat /proc/sys/kernel/random/uuid)" -F tipo=otro -F "descripcion=Algo" $API/tickets)"

# 028-E02 028-E04: se ve como antes y la foto la sirve Tickets.
lista=$(curl -s "${CON[@]}" $API/tickets)
verificar "028-E02: se ve con quién lo cargó" sí "$(grep -q "\"id\":\"$ID\"[^}]*\"usuario\":\"Ana Tickets\"" <<<"$lista" && echo sí || echo no)"
foto=$(grep -o "\"id\":\"$ID\"[^}]*" <<<"$lista" | grep -o '/tickets/fotos/[^"]*' | head -1)
verificar "028-E04: la foto la sirve Tickets, con sesión" 200 "$(codigo "${CON[@]}" "$API$foto")"
verificar "028-E04: sin sesión, la foto no" 401 "$(codigo "$API$foto")"

# 028-E03 028-E05: resolver con nota y reabrir; cada acción llega a Auditoría.
verificar "028-E03: se resuelve con una nota" 204 "$(codigo "${CON[@]}" -H 'Content-Type: application/json' -d '{"nota":"Arreglado"}' $API/tickets/$ID/resolver)"
verificar "028-E03: queda resuelto por quien lo resolvió" "resuelto|Ana Tickets|Arreglado" "$(psqlTickets "SELECT estado || '|' || resuelto_por_nombre || '|' || nota FROM tickets.ticket WHERE id = '$ID'")"
verificar "028-E03: se reabre" 204 "$(codigo "${CON[@]}" -X POST $API/tickets/$ID/reabrir)"
verificar "028-E05: los tres eventos llegan a Auditoría, de Tickets" "tickets:ticket.creado,ticket.resuelto,ticket.reabierto" \
  "$(hasta "tickets:ticket.creado,ticket.resuelto,ticket.reabierto" "SELECT min(servicio) || ':' || string_agg(tipo, ',' ORDER BY fecha) FROM auditoria.evento WHERE contenido->>'id' = '$ID'")"

# 028-E07: sin pasar por la puerta, sin el token, no atiende; y no se publica.
verificar "028-E07: sin el token, Tickets lo rechaza" 401 "$(docker compose exec -T comercial node -e "fetch('http://tickets:8096/tickets', { headers: { 'X-Usuario-Id': 'alguien' } }).then((r) => console.log(r.status))")"
verificar "028-E07: Tickets no se publica" no "$([[ "$(docker compose port tickets 8096 2>/dev/null)" =~ ^(|:0)$ ]] && echo no || echo sí)"

# 028-E06: con Tickets parado, la puerta corta la conexión (la web lo toma como sin conexión) y lo demás anda.
docker compose stop tickets >/dev/null 2>&1
curl -s -o /dev/null "${CON[@]}" "http://127.0.0.1:$(grep -E '^PUERTO_API=' .env | cut -d= -f2-)/tickets"; corte=$?
verificar "028-E06: sin Tickets, la puerta corta la conexión" si "$([[ $corte -eq 52 || $corte -eq 56 ]] && echo si || echo "no ($corte)")"
# El proxy de adelante contesta 502 sin CORS: para el navegador es una falla de red, y el ticket
# queda guardado en el dispositivo.
verificar "028-E06: lo que llega al navegador no lleva CORS" 0 "$(curl -s -o /dev/null -D - "${CON[@]}" -H "Origin: $(grep -E '^ORIGEN_WEB=' .env | cut -d= -f2-)" $API/tickets | grep -ic '^access-control-allow-origin:')"
verificar "028-E06: sin Tickets, Comercial sigue andando" 200 "$(codigo "${CON[@]}" "$API/productos?ids=")"
docker compose up -d --wait tickets >/dev/null 2>&1

rm -f "$FOTO"
psqlAcceso "DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = 'tickets-ana@ferre.test')" >/dev/null
[[ $fallos -eq 0 ]]
