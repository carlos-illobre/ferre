#!/usr/bin/env bash
# Deja listo lo que hace falta para sacar capturas de la interfaz sin Docker: la API de
# mentira en el 8799 y el cliente web en el 5199 apuntando a ella. --apagar los baja.
set -euo pipefail
cd "$(dirname "$0")/../.."

apagar() {
  # El patrón lleva corchetes para que pgrep no encuentre a este mismo comando.
  pgrep -f "servidor.mjs 879[9]" | xargs -r kill || true
  pgrep -f "vite --port 519[9]" | xargs -r kill || true
}

if [ "${1:-}" = "--apagar" ]; then apagar; echo "apagados"; exit 0; fi

apagar
mkdir -p tests/capturas/salida
(cd tests/capturas/api-de-mentira && nohup node servidor.mjs 8799 > ../salida/api.log 2>&1 &)
(cd clientes/gestion-del-local-web && VITE_API_URL=http://localhost:8799 VITE_GOOGLE_CLIENT_ID=captura nohup corepack pnpm exec vite --port 5199 --strictPort > ../../tests/capturas/salida/vite.log 2>&1 &)
until curl -sf http://localhost:8799/health >/dev/null && curl -sf http://localhost:5199/v4/ >/dev/null; do sleep 0.5; done
echo "listo: API de mentira en :8799 y cliente en http://localhost:5199/ (v1/, v2/, v4/)"
