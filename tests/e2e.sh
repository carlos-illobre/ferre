#!/usr/bin/env bash
# E2E de los caminos principales: la red de seguridad (ADR-004). Levanta el stack si no
# está, construye y sirve el cliente web contra esa API, corre los escenarios de
# tests/e2e/ con Playwright, y sale con 1 nombrando cuál falló. --solo <nombre> repite uno.
# CARGA=1 activa además la prueba de carga del navegador (lenta; para la laptop del local).
# En CI se usa en dos tiempos, para que cada escenario sea un paso propio del job y se vea
# el avance: `tests/e2e.sh --preparar` deja el stack y el cliente sirviendo (el preview queda
# en segundo plano), y después `tests/e2e.sh --escenario <archivo>` corre uno.
set -euo pipefail
cd "$(dirname "$0")/.."

preparar() {
  docker compose up -d --wait
  # El cliente vive en otro origen que la API (ADR-010): se sirve aparte, como en producción.
  # "..." construye también las librerías de las que depende (en CI no hay dist previo).
  VITE_API_URL=http://localhost pnpm --filter gestion-del-local-web... build >/dev/null
  if ! curl -sf http://localhost:4173 >/dev/null; then
    nohup pnpm --filter gestion-del-local-web preview >/tmp/ferre-preview.log 2>&1 &
    echo $! > /tmp/ferre-preview.pid
    until curl -sf http://localhost:4173 >/dev/null; do sleep 0.5; done
  fi
}

case "${1:-}" in
  --preparar) preparar; echo "stack y cliente listos en http://localhost:4173"; exit 0 ;;
  --escenario) cd tests/e2e && exec pnpm exec playwright test "escenarios/$2" ;;
esac

preparar
trap '[ -f /tmp/ferre-preview.pid ] && kill "$(cat /tmp/ferre-preview.pid)" 2>/dev/null; rm -f /tmp/ferre-preview.pid' EXIT
cd tests/e2e
if [[ "${1:-}" == "--solo" ]]; then
  pnpm exec playwright test -g "$2"
else
  pnpm exec playwright test
fi
