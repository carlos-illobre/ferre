#!/bin/bash
# Captura cada variante (o las que se pasen) con la herramienta común.
cd "$(dirname "$0")/.."; A=$(pwd)
for d in ${@:-compu/* celu/*}; do
  modo=${d%%/*}
  uv run -q --with playwright==1.56.0 python "$A/../_comun/herramientas/capturar.py" $modo "$A/$d/index.html" "$A/$d/captura.png" | grep -v "^fuentes" 
done
