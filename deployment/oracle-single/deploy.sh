#!/usr/bin/env bash
#
# Despliega un ambiente en la máquina de Oracle (ADR-012).
#
#   bash deployment/oracle-single/deploy.sh pruebas            # último commit de master
#   bash deployment/oracle-single/deploy.sh produccion         # último commit de produccion
#   bash deployment/oracle-single/deploy.sh produccion <sha>   # un commit concreto, o volver atrás
#
# Lo corre CI en cada push a master (→ pruebas) o a produccion (→ produccion), y también
# se puede correr desde tu computadora. El destino sale de las variables SSH y
# RUTA_REMOTA (CI las toma de los secretos) o, si faltan, de deployment/oracle-single/.env.
# Este archivo no contiene ningún dato del despliegue.
#
# Por SHA y no por `latest`: con el SHA fijado, `docker compose ps` dice qué versión hay,
# revertir es determinístico, y dos despliegues del mismo commit no traen cosas distintas.
set -euo pipefail

cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)" \
    || { printf '\n\033[0;31m✗ no encuentro la raíz del repositorio\033[0m\n' >&2; exit 1; }

ok()    { printf '  \033[0;32m✓\033[0m %s\n' "$1"; }
info()  { printf '    %s\n' "$1"; }
paso()  { printf '\n\033[1m▶ %s\033[0m\n' "$1"; }
morir() { printf '\n\033[0;31m✗ %s\033[0m\n' "$1" >&2; exit 1; }

AMBIENTE=${1:-}
case "$AMBIENTE" in
    pruebas)    RAMA=master ;;
    produccion) RAMA=produccion ;;
    *) morir "uso: deploy.sh <pruebas|produccion> [sha]" ;;
esac

if [ -z "${SSH:-}" ] || [ -z "${RUTA_REMOTA:-}" ]; then
    CONFIG=deployment/oracle-single/.env
    [ -f "$CONFIG" ] || morir "faltan SSH y RUTA_REMOTA en el entorno y no existe $CONFIG (ver .env.despliegue.ejemplo)"
    set -a; . "$CONFIG"; set +a
fi
: "${SSH:?falta SSH (usuario@ip)}"
: "${RUTA_REMOTA:?falta RUTA_REMOTA}"
REMOTO="$RUTA_REMOTA/$AMBIENTE"
SERVICIOS=(gestion-del-local listas-de-proveedores)
[ "$AMBIENTE" = produccion ] && SERVICIOS+=(reverse-proxy)

# ── Qué versión ──────────────────────────────────────────────────────────────

paso "Resolviendo la versión para $AMBIENTE"
git fetch origin "$RAMA" --quiet || morir "no se pudo consultar el remoto"
if [ $# -gt 1 ]; then
    SHA=$(git rev-parse --verify "$2^{commit}" 2>/dev/null) || morir "'$2' no es un commit de este repositorio"
    info "SHA pedido a mano: ${SHA:0:7}"
else
    # El último del remoto, no el de la copia local: lo que está en disco puede no haber pasado por CI.
    SHA=$(git rev-parse "origin/$RAMA")
    info "último de origin/$RAMA: ${SHA:0:7}"
fi
ok "versión a desplegar: ${SHA:0:7}"

# ── Qué había ────────────────────────────────────────────────────────────────

paso "Estado actual de $AMBIENTE en la máquina"
ssh "$SSH" "test -f '$REMOTO/.env'" \
    || morir "no existe $REMOTO/.env en la máquina: crealo desde deployment/oracle-single/$AMBIENTE/.env.oracle (ver ORACLE.md)"
ANTERIOR=$(ssh "$SSH" "grep -m1 '^IMAGEN_TAG=' '$REMOTO/.env' | cut -d= -f2" || true)
if [ -n "$ANTERIOR" ] && [ "$ANTERIOR" != "<sha>" ]; then
    ok "corriendo ahora: ${ANTERIOR:0:7}"
    info "para volver acá:  bash ${BASH_SOURCE[0]} $AMBIENTE $ANTERIOR"
    [ "$ANTERIOR" = "$SHA" ] && info "(es la misma versión: el despliegue va a ser un no-op)"
else
    info "primer despliegue de $AMBIENTE"
fi

# ── Configuración ────────────────────────────────────────────────────────────

paso "Copiando la configuración"
# El .env de la aplicación en la máquina NO se pisa: tiene los valores reales. Solo se
# actualiza la etiqueta de versión. El compose y el Caddyfile sí van del repo.
ssh "$SSH" "mkdir -p '$REMOTO/infrastructure/reverse-proxy'"
scp -q docker-compose.yml "$SSH:$REMOTO/docker-compose.yml" || morir "no se pudo copiar el compose"
scp -q infrastructure/reverse-proxy/Caddyfile "$SSH:$REMOTO/infrastructure/reverse-proxy/Caddyfile" || morir "no se pudo copiar el Caddyfile"
ssh "$SSH" "cd '$REMOTO' && sed -i '/^IMAGEN_TAG=/d' .env && printf 'IMAGEN_TAG=%s\n' '${SHA:0:7}' >> .env" \
    || morir "no se pudo fijar la versión en la máquina"
ok "IMAGEN_TAG=${SHA:0:7} fijado en $REMOTO/.env"
# La red compartida entre ambientes tiene que existir antes que cualquiera de los dos.
ssh "$SSH" "docker network inspect ferre-borde >/dev/null 2>&1 || docker network create ferre-borde >/dev/null"
ok "red ferre-borde"

# ── Imágenes y reemplazo ─────────────────────────────────────────────────────

paso "Trayendo las imágenes"
ssh "$SSH" "cd '$REMOTO' && docker compose pull --quiet" \
    || morir "no se pudieron traer las imágenes de ${SHA:0:7}: ¿CI terminó de publicarlas?"
ok "imágenes de ${SHA:0:7} en la máquina"

paso "Reemplazando los contenedores"
# `up -d` reemplaza solo los contenedores cuya imagen cambió.
ssh "$SSH" "cd '$REMOTO' && docker compose up -d --remove-orphans" \
    || morir "el reemplazo falló: la versión anterior puede haber quedado a medias"
ok "contenedores actualizados"

# ── Que quedó arriba ─────────────────────────────────────────────────────────

paso "Comprobando que quedó arriba"
# `docker compose ps` dice «Up» aunque el contenedor se reinicie en bucle. Lo que vale es
# el healthcheck de cada servicio (que consulta su /health) en estado healthy.
for servicio in "${SERVICIOS[@]}"; do
    listo=no
    for _ in $(seq 1 30); do
        estado=$(ssh "$SSH" "cd '$REMOTO' && docker compose ps --format '{{.Health}}' '$servicio'" 2>/dev/null || true)
        if [ "$estado" = healthy ]; then listo=si; break; fi
        sleep 4
    done
    if [ "$listo" = si ]; then
        ok "$servicio sano"
    else
        ssh "$SSH" "cd '$REMOTO' && docker compose logs --tail 40 '$servicio'" || true
        morir "$servicio no quedó sano en 2 minutos. Para volver: bash ${BASH_SOURCE[0]} $AMBIENTE ${ANTERIOR:-<sha-anterior>}"
    fi
done

# ── Limpieza ─────────────────────────────────────────────────────────────────

paso "Liberando disco"
# `-a` es lo que hace el trabajo: sin ella solo se borran imágenes sin etiqueta, y las
# etiquetadas por SHA nunca lo están. `until=24h` conserva las recientes para revertir rápido.
liberado=$(ssh "$SSH" "docker image prune -af --filter until=24h" | tail -1)
info "${liberado:-sin imágenes para borrar}"
ssh "$SSH" "df -h / | awk 'NR==2 {print \"    libre en /: \" \$4 \" de \" \$2}'"

printf '\n\033[0;32m✓ %s desplegado: %s\033[0m\n' "$AMBIENTE" "${SHA:0:7}"
