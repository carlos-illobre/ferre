#!/usr/bin/env bash
# E2E de los caminos principales: la red de seguridad (ADR-004). Levanta el stack si no
# está, construye y sirve el cliente web contra esa API, corre los escenarios de
# tests/e2e/ con Playwright (los de escritorio y los de celular: la app tiene dos
# interfaces), y sale con 1 nombrando cuál falló. --solo <nombre> repite uno.
# CARGA=1 activa además la prueba de carga del navegador (lenta; para la laptop del local).
# En CI se usa en dos tiempos, para que cada escenario sea un paso propio del job y se vea
# el avance: `tests/e2e.sh --preparar` deja el stack y el cliente sirviendo (el preview queda
# en segundo plano), y después `tests/e2e.sh --escenario <interfaz> <archivo>` corre uno.
#
# Corrida completa (y --solo): las dos interfaces van a la vez, cada una contra su stack, para
# que no se pisen los datos. La computadora usa el del compose (:80, cliente en :4173); el
# celular, un segundo stack (tests/e2e/segundo-stack.yml: API en :18080, cliente en :4174).
# Las pruebas que miden tiempos (marcadas @tiempo) corren al final, solas, para que la otra
# interfaz no les robe el procesador.
set -euo pipefail
cd "$(dirname "$0")/.."
# Las pruebas consultan la base del mostrador con su usuario (comun/base.worker.mjs): la clave sale
# del .env, como en cualquier ambiente. Solo esa: exportar todo el .env pisaría el del segundo stack.
CLAVE_BASE_MOSTRADOR=$(grep '^CLAVE_BASE_MOSTRADOR=' .env | cut -d= -f2-)
export CLAVE_BASE_MOSTRADOR

# Corren contra la aplicación, que abre en la raíz.
#
# Para correrlos en una máquina donde los puertos 80 y 5432 están ocupados o Docker pide
# sudo (por ejemplo el servidor): un .env con COMPOSE_PROJECT_NAME=ferre-e2e,
# COMPOSE_PROFILES= (vacío), PUERTO_API=18080, PUERTO_BASE=15432, un `docker` en el PATH que llame a
# `sudo docker`, y API_URL=http://localhost:18080 tests/e2e.sh. Con API_URL, todo corre contra
# ese único stack, una interfaz después de la otra. Al terminar,
# `docker compose down -v` para no dejar el stack levantado.
CELULAR_COMPOSE="-p ferre-e2e-celular --env-file .env --env-file tests/e2e/segundo-stack.env -f docker-compose.yml -f tests/e2e/segundo-stack.yml"
CELULAR_API=http://localhost:18080
CELULAR_PUERTO_WEB=4174
PIDS=/tmp/ferre-preview.pid

# La huella de lo que entra en el cliente web: si no cambió desde la última construcción, no se
# vuelve a construir (tarda medio minuto).
huella_web() {
  { echo "$1"; git ls-files -s microservices/web microservices/procesos/web package.json pnpm-lock.yaml
    git diff HEAD -- microservices/web microservices/procesos/web
    git ls-files --others --exclude-standard microservices/web microservices/procesos/web | xargs -r sha1sum
  } | sha1sum | cut -c1-40
}
# $1: la API a la que apunta; $2: la carpeta de salida, dentro de microservices/web.
construir_web() {
  local huella archivo="microservices/web/$2/.huella-e2e"
  huella=$(huella_web "$1")
  if [ -f "$archivo" ] && [ "$(cat "$archivo")" = "$huella" ]; then echo "cliente web en $2: sin cambios"; return; fi
  if [ "$2" = dist ]; then
    # "..." construye también las librerías de las que depende (en CI no hay dist previo).
    VITE_API_URL="$1" pnpm --filter gestion-del-local-web... build >/dev/null
  else
    # Las librerías ya las construyó el de la computadora; el control de tipos, también.
    (cd microservices/web && VITE_API_URL="$1" node_modules/.bin/vite build --outDir "$2" >/dev/null)
  fi
  echo "$huella" > "$archivo"
}
# Sirve una carpeta del cliente con `vite preview`. Si ya había uno de una corrida anterior, lo
# reemplaza: el preview no ve los archivos nuevos de una construcción posterior.
servir() {
  local carpeta=$1 puerto=$2 viejo
  viejo=$(grep -s ":$puerto$" "$PIDS" | cut -d: -f1 || true)
  [ -n "$viejo" ] && kill "$viejo" 2>/dev/null || true
  sed -i "/:$puerto$/d" "$PIDS" 2>/dev/null || true
  (cd microservices/web && exec node_modules/.bin/vite preview --outDir "$carpeta" --port "$puerto" --strictPort) >"/tmp/ferre-preview-$puerto.log" 2>&1 &
  echo "$!:$puerto" >> "$PIDS"
  for _ in $(seq 1 120); do curl -sf "http://localhost:$puerto" >/dev/null && return; sleep 0.5; done
  echo "El cliente web no arrancó en :$puerto (ver /tmp/ferre-preview-$puerto.log)"; exit 1
}

# Las pruebas cambian la base a mano (crean sesiones, sacan permisos): el servidor no tiene que
# recordar la sesión (specs/020, RF-133), o vería lo de antes hasta un minuto. Se apaga una vez y se
# reinicia la API para que lo lea; con la base que ya lo tiene, no hace nada.
sin_recordar_la_sesion() {
  # shellcheck disable=SC2068
  local psql=(docker compose $@ exec -T db psql -U mostrador -d mostrador -tAc)
  [ "$("${psql[@]}" "SELECT valor FROM configuracion WHERE clave = 'sesion.recordar_segundos'")" = "0" ] && return
  "${psql[@]}" "UPDATE configuracion SET valor = '0' WHERE clave = 'sesion.recordar_segundos'" >/dev/null
  # shellcheck disable=SC2068
  docker compose $@ restart gestion-del-local >/dev/null && docker compose $@ up -d --wait >/dev/null
}

# El stack del compose y el cliente contra su API: lo que usa el CI y la computadora.
preparar() {
  docker compose up -d --wait
  sin_recordar_la_sesion
  # El cliente vive en otro origen que la API (ADR-010): se sirve aparte, como en producción.
  construir_web "${API_URL:-http://localhost}" dist
  servir dist 4173
}

# Los dos stacks a la vez: mientras arrancan, se construyen los dos clientes.
preparar_los_dos() {
  docker compose up -d --wait >/tmp/ferre-stack.log 2>&1 & local uno=$!
  # shellcheck disable=SC2086
  docker compose $CELULAR_COMPOSE up -d --wait >/tmp/ferre-stack-celular.log 2>&1 & local dos=$!
  construir_web http://localhost dist
  construir_web "$CELULAR_API" dist-celular
  wait "$uno" || { cat /tmp/ferre-stack.log; exit 1; }
  wait "$dos" || { cat /tmp/ferre-stack-celular.log; exit 1; }
  sin_recordar_la_sesion & local tres=$!
  # shellcheck disable=SC2086
  sin_recordar_la_sesion $CELULAR_COMPOSE
  wait "$tres"
  servir dist 4173
  servir dist-celular "$CELULAR_PUERTO_WEB"
  export E2E_CELULAR_COMPOSE="$CELULAR_COMPOSE" E2E_CELULAR_API="$CELULAR_API" E2E_CELULAR_WEB="http://localhost:$CELULAR_PUERTO_WEB"
}

case "${1:-}" in
  --preparar) preparar; echo "stack y cliente listos en http://localhost:4173"; exit 0 ;;
  # --escenario <interfaz> <archivo>: escritorio o celular, y el archivo dentro de esa carpeta.
  --escenario) cd tests/e2e && exec pnpm exec playwright test --project="$2" "$2/$3" ;;
esac

# Al salir se apagan los clientes web; la salida es la de las pruebas, no la de apagarlos.
trap 'estado=$?; { [ -f "$PIDS" ] && cut -d: -f1 "$PIDS" | xargs -r kill; } 2>/dev/null || true; rm -f "$PIDS"; exit $estado' EXIT
if [ -n "${API_URL:-}" ]; then preparar; else preparar_los_dos; fi
cd tests/e2e
if [[ "${1:-}" == "--solo" ]]; then
  pnpm exec playwright test -g "$2"
else
  fallo=0
  pnpm exec playwright test --grep-invert @tiempo || fallo=1
  pnpm exec playwright test --grep @tiempo --workers 1 || fallo=1
  exit "$fallo"
fi
