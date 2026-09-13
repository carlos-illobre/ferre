#!/usr/bin/env bash
# Unitarias de todos los servicios, clientes y librerías. Sin compuerta de cobertura (ADR-004).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== TypeScript (workspace)"
pnpm -r test

echo "== listas-de-proveedores"
(cd microservices/listas-de-proveedores && uv run pytest -q)
