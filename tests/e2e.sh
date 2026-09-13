#!/usr/bin/env bash
# E2E de los caminos principales: la red de seguridad (ADR-004). Levanta el stack si no
# está, corre los escenarios de tests/e2e/ con Playwright, y sale con 1 nombrando cuál
# falló. Acepta --solo <nombre> para repetir uno.
set -euo pipefail
cd "$(dirname "$0")/.."

docker compose --profile local up -d --wait

cd tests/e2e
[[ -d node_modules ]] || pnpm install
if [[ "${1:-}" == "--solo" ]]; then
  pnpm exec playwright test -g "$2"
else
  pnpm exec playwright test
fi
