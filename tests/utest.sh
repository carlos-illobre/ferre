#!/usr/bin/env bash
# Unitarias de todos los servicios. Sin compuerta de cobertura (ADR-004).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== mostrador"
(cd microservices/mostrador && pnpm test)

echo "== importador"
(cd microservices/importador && uv run pytest -q)
