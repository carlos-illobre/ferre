#!/usr/bin/env bash
# Cada servicio responde 200 en /health con el stack levantado. Necesita el stack:
# con RAPIDO=1 se saltea (código 3).
set -uo pipefail
[[ "${RAPIDO:-0}" == "1" ]] && exit 3
cd "$(dirname "$0")/../.."

codigo=$(curl -s -o /dev/null -w '%{http_code}' http://localhost/health || echo 000)
if [[ "$codigo" != "200" ]]; then
  echo "comercial /health respondió $codigo a través del proxy"
  exit 1
fi
docker compose exec -T listas-de-proveedores python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health').status==200 else 1)" \
  || { echo "listas-de-proveedores /health no respondió 200"; exit 1; }
docker compose exec -T procesos node -e "fetch('http://127.0.0.1:8090/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" \
  || { echo "procesos /health no respondió 200"; exit 1; }
