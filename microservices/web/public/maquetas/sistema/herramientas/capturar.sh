#!/bin/bash
# Captura cada variante (compu 1366×768, celu 390×844 a escala 2) con la herramienta común.
# uso: bash herramientas/capturar.sh [filtro]
B="$(cd "$(dirname "$0")/.." && pwd)"
for f in "$B"/compu/variante-*/index.html "$B"/celu/variante-*/index.html; do
  [[ -n "$1" && "$f" != *"$1"* ]] && continue
  d=$(dirname "$f"); modo=compu; [[ "$f" == */celu/* ]] && modo=celu
  echo "== $d"
  uv run -q --with playwright==1.56.0 python "$B/../_comun/herramientas/capturar.py" $modo "$f" "$d/captura.png"
done
