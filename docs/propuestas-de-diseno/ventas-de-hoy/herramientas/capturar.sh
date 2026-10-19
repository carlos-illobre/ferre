#!/bin/bash
# uso: herramientas/capturar.sh [filtro]  — captura cada variante con _comun/herramientas/capturar.py
cd "$(dirname "$0")/.."
C=../_comun/herramientas/capturar.py
for d in compu/variante-* celu/variante-*; do
  [[ -n "$1" && "$d" != *"$1"* ]] && continue
  modo=${d%%/*}
  echo "== $d"; uv run -q --with playwright==1.56.0 python $C $modo "$PWD/$d/index.html" "$PWD/$d/captura.png"
done
