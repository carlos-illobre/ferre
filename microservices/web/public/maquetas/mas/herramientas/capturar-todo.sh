#!/bin/bash
# Captura las seis variantes de Más y arma las comparaciones. Uso: bash capturar-todo.sh
cd "$(dirname "$0")"
for d in ../compu/*/; do uv run -q --with playwright==1.56.0 python capturar.py compu "$(realpath $d)/index.html" "$(realpath $d)/captura.png"; done
for d in ../celu/*/; do uv run -q --with playwright==1.56.0 python capturar.py celu "$(realpath $d)/index.html" "$(realpath $d)/captura.png"; done
