#!/usr/bin/env bash
# Cada servicio responde 200 en /health con el stack levantado. Necesita el stack:
# con RAPIDO=1 se saltea (código 3).
set -uo pipefail
[[ "${RAPIDO:-0}" == "1" ]] && exit 3
cd "$(dirname "$0")/../.."

codigo=$(curl -s -o /dev/null -w '%{http_code}' http://localhost/health || echo 000)
if [[ "$codigo" != "200" ]]; then
  echo "mostrador /health respondió $codigo a través del proxy"
  exit 1
fi
docker compose exec -T importador python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health').status==200 else 1)" \
  || { echo "importador /health no respondió 200"; exit 1; }
