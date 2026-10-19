#!/bin/bash
# uso: cap.sh compu|celu carpeta-de-variante (relativa a usuarios/)
U="$(cd "$(dirname "$0")/.." && pwd)"
D="$U/$2"
uv run -q --with playwright==1.56.0 python "$U/../_comun/herramientas/capturar.py" $1 "$D/index.html" "$D/captura.png"
