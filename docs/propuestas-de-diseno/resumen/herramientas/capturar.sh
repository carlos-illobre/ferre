#!/bin/bash
# uso: capturar.sh compu|celu carpeta-variante
B=$(cd "$(dirname "$0")/.." && pwd)
cd "$B/../_comun/herramientas"
uv run --with playwright==1.56.0 python capturar.py "$1" "$B/$1/$2/index.html" "$B/$1/$2/captura.png"
