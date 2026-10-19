#!/bin/bash
# Captura una o todas las variantes de Procesos. Uso: capturar.sh [compu|celu] [carpeta-variante]
P="$(cd "$(dirname "$0")/.." && pwd)"
CAP="$P/../_comun/herramientas/capturar.py"
for modo in ${1:-compu celu}; do
  for d in "$P/$modo"/variante-*; do
    [ -n "$2" ] && [[ "$d" != *"$2"* ]] && continue
    uv run -q --with playwright==1.56.0 python "$CAP" $modo "$d/index.html" "$d/captura.png" | grep -v "^fuentes" | grep -v "^$"
    echo "ok $d"
  done
done
