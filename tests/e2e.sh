#!/usr/bin/env bash
# E2E de los caminos principales: la red de seguridad (ADR-004). Levanta el stack si no
# está, construye y sirve el cliente web contra esa API, corre los escenarios de
# tests/e2e/ con Playwright, y sale con 1 nombrando cuál falló. --solo <nombre> repite uno.
set -euo pipefail
cd "$(dirname "$0")/.."

docker compose --profile local up -d --wait

# El cliente vive en otro origen que la API (ADR-010): se sirve aparte, como en producción.
VITE_API_URL=http://localhost pnpm --filter gestion-del-local-web build >/dev/null
pnpm --filter gestion-del-local-web preview >/dev/null 2>&1 &
PREVIEW=$!
trap 'kill $PREVIEW 2>/dev/null || true' EXIT
until curl -sf http://localhost:4173 >/dev/null; do sleep 0.5; done

cd tests/e2e
if [[ "${1:-}" == "--solo" ]]; then
  pnpm exec playwright test -g "$2"
else
  pnpm exec playwright test
fi
