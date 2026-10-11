#!/usr/bin/env bash
# Construye la maqueta y la copia a la carpeta pública del cliente web (borra lo anterior).
set -euo pipefail
cd "$(dirname "$0")"
DESTINO="../../clientes/gestion-del-local-web/public/v4"
corepack pnpm run build
rm -rf "$DESTINO"
mkdir -p "$DESTINO"
cp -R dist/. "$DESTINO/"
echo "Publicada en $(cd "$DESTINO" && pwd)"
