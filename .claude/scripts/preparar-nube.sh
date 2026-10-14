#!/bin/bash
# Prepara el proyecto al empezar una sesión de Claude Code en la nube: instala las
# dependencias del repositorio, que el script de preparación del entorno no puede instalar
# porque corre antes de que exista el clon. Fuera de la nube no hace nada.
# El entorno y su script están en docs/operacion/sesiones-en-la-nube.md.
[ "$CLAUDE_CODE_REMOTE" = "true" ] || exit 0
set -e
cd "$CLAUDE_PROJECT_DIR"
pnpm install --frozen-lockfile --reporter=silent
(cd microservices/listas && uv sync --quiet)
echo "Dependencias instaladas (pnpm y uv)."

# Docker viene instalado en la máquina de la nube, pero sin arrancar. Las pruebas de punta
# a punta (tests/e2e.sh) levantan el stack con Docker Compose, como en el CI.
set +e
if ! docker info >/dev/null 2>&1; then
  service docker start >/dev/null 2>&1 || (dockerd >/tmp/dockerd.log 2>&1 &)
  for _ in $(seq 1 30); do docker info >/dev/null 2>&1 && break; sleep 1; done
fi
if docker info >/dev/null 2>&1; then
  echo "Docker listo."
else
  echo "Aviso: Docker no arrancó (ver /tmp/dockerd.log). Las pruebas de punta a punta lo necesitan; no las reemplaces con servicios levantados a mano."
fi

# Docker Hub limita las descargas sin cuenta por dirección, y las máquinas de la nube comparten
# la salida: sin entrar, las imágenes base fallan con «429 Too Many Requests». Se entra con un
# token de solo lectura que Carlos cargó en el entorno; el token no se muestra.
if docker info >/dev/null 2>&1; then
  if [ -n "$DOCKERHUB_USUARIO" ] && [ -n "$DOCKERHUB_TOKEN" ]; then
    if printf '%s' "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USUARIO" --password-stdin >/dev/null 2>&1; then
      echo "Docker Hub: sesión iniciada."
    else
      echo "Aviso: no se pudo entrar a Docker Hub con DOCKERHUB_USUARIO y DOCKERHUB_TOKEN; las imágenes base pueden fallar con 429."
    fi
  else
    echo "Aviso: faltan DOCKERHUB_USUARIO y DOCKERHUB_TOKEN en el entorno; sin ellas, bajar imágenes de Docker Hub puede fallar con 429."
  fi
fi
