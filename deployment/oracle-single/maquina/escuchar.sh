#!/usr/bin/env bash
#
# Escucha el canal de avisos de ntfy con una sola conexión saliente y, por cada aviso,
# corre desplegar.sh (ADR-013). El aviso no trae información: la máquina verifica sola
# contra GitHub y GHCR. Al arrancar hace una verificación, por si se perdió un aviso.
# Lo corre systemd como servicio de usuario (ferre-despliegue.service), sin root.
set -uo pipefail

CONFIG="${FERRE_BASE:-$HOME/ferre}/despliegue.env"
[ -f "$CONFIG" ] || { echo "falta $CONFIG (NTFY_AVISOS, y opcionalmente NTFY_URL y NTFY_RESULTADOS)"; exit 1; }
set -a; . "$CONFIG"; set +a
: "${NTFY_AVISOS:?falta NTFY_AVISOS en $CONFIG}"
NTFY_URL="${NTFY_URL:-https://ntfy.sh}"
DESPLEGAR="$(dirname "$0")/desplegar.sh"

echo "verificación inicial"
"$DESPLEGAR" || true

while true; do
    echo "escuchando $NTFY_URL/$NTFY_AVISOS"
    # /raw entrega una línea por mensaje; la conexión queda abierta sin consumir CPU.
    curl -sN --retry 0 "$NTFY_URL/$NTFY_AVISOS/raw" | while IFS= read -r linea; do
        [ -n "$linea" ] || continue   # los keepalives son líneas vacías
        echo "aviso recibido: ${linea:0:80}"
        "$DESPLEGAR" || true
    done
    echo "conexión cerrada; reintento en 10 s"
    sleep 10
done
