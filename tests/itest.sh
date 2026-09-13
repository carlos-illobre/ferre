#!/usr/bin/env bash
# Integración: verificaciones manuales que valió la pena guardar. Cada script en
# tests/integration/ es un asunto. Los que necesitan el stack lo dicen y se saltean
# con --rapido.
set -uo pipefail
cd "$(dirname "$0")/.."

RAPIDO=0
[[ "${1:-}" == "--rapido" ]] && RAPIDO=1
export RAPIDO

fallidos=()
for script in tests/integration/*.sh; do
  nombre=$(basename "$script" .sh)
  if bash "$script"; then
    echo "OK       $nombre"
  else
    codigo=$?
    if [[ $codigo -eq 3 ]]; then
      echo "SALTEADO $nombre (necesita el stack; --rapido)"
    else
      echo "FALLÓ    $nombre"
      fallidos+=("$nombre")
    fi
  fi
done

if (( ${#fallidos[@]} )); then
  echo; echo "Fallaron: ${fallidos[*]}"; exit 1
fi
