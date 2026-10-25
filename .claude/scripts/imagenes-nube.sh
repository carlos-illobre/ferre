#!/bin/bash
# Construye las imágenes del stack en una sesión de Claude Code en la nube, para correr
# tests/e2e.sh. Adentro de `docker build` no se confía en el certificado del proxy de la
# nube, así que cada Dockerfile se copia a una carpeta temporal con ese certificado agregado
# y se construye con esas copias. Ni las copias ni el certificado entran al repositorio.
# El porqué: docs/operacion/sesiones-en-la-nube.md, «Construir imágenes en la nube».
set -euo pipefail
cd "$(dirname "$0")/../.."
CERT_ORIGEN=/root/.ccr/ca-bundle.crt
[ -f "$CERT_ORIGEN" ] || { echo "No está $CERT_ORIGEN: esto no es una sesión en la nube; construí con docker compose build."; exit 1; }
docker info >/dev/null 2>&1 || { echo "Docker no está corriendo: primero bash .claude/scripts/preparar-nube.sh"; exit 1; }
[ -f .env ] || cp .env.example .env

T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
mkdir "$T/cert" && cp "$CERT_ORIGEN" "$T/cert/ca-bundle.crt"
CERT='COPY --from=cert ca-bundle.crt /etc/ssl/certs/proxy-ca.crt\nENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/proxy-ca.crt SSL_CERT_FILE=/etc/ssl/certs/proxy-ca.crt REQUESTS_CA_BUNDLE=/etc/ssl/certs/proxy-ca.crt UV_NATIVE_TLS=1'
# El certificado va en la etapa que baja dependencias; la imagen final no lo lleva.
sed "/^FROM node:22-alpine AS base/a $CERT" microservices/comercial/Dockerfile > "$T/api.Dockerfile"
sed "/^FROM node:22-alpine AS base/a $CERT" microservices/procesos/servidor/Dockerfile > "$T/procesos.Dockerfile"
sed "/^FROM .* AS build/a $CERT" microservices/listas/Dockerfile > "$T/listas.Dockerfile"
for f in "$T"/*.Dockerfile; do grep -q proxy-ca.crt "$f" || { echo "No se pudo agregar el certificado a $(basename "$f"): cambió su primer FROM; actualizá este script."; exit 1; }; done

cat > "$T/override.yml" <<EOF
services:
  comercial:
    build: { dockerfile: $T/api.Dockerfile, additional_contexts: { cert: $T/cert } }
  procesos:
    build: { dockerfile: $T/procesos.Dockerfile, additional_contexts: { cert: $T/cert } }
  listas-de-proveedores:
    build: { context: ./microservices/listas, dockerfile: $T/listas.Dockerfile, additional_contexts: { cert: $T/cert } }
EOF
# Las copias de los Dockerfiles están fuera del repositorio: el `docker buildx bake` con que construye
# compose pide permiso para leerlas («--allow=fs.read=…») y, sin quién lo dé, se frena (2026-10-20).
export BUILDX_BAKE_ENTITLEMENTS_FS=0
docker compose -f docker-compose.yml -f "$T/override.yml" build
echo "Imágenes listas. Ahora: tests/e2e.sh"
