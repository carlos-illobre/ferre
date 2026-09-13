#!/usr/bin/env bash
# La prueba que más rinde: todos los .env* declaran exactamente las mismas variables, y
# ninguna variable que el compose interpola queda sin declarar. Sin esto, una variable
# olvidada en un ambiente cae en su valor por omisión sin que nada avise.
set -euo pipefail
cd "$(dirname "$0")/../.."

archivos=(.env.example deployment/oracle-single/.env.oracle)
[[ -f .env ]] && archivos+=(.env)

declarar() { grep -oE '^[A-Z_][A-Z0-9_]*=' "$1" | tr -d '=' | sort -u; }

referencia=$(declarar "${archivos[0]}")
estado=0
for archivo in "${archivos[@]:1}"; do
  if ! diff <(echo "$referencia") <(declarar "$archivo") >/dev/null; then
    echo "Las variables de ${archivos[0]} y $archivo no coinciden:"
    diff <(echo "$referencia") <(declarar "$archivo") | grep '^[<>]' || true
    estado=1
  fi
done

# Variables que el compose interpola: ${VAR}, ${VAR:?...}, ${VAR:-...}
interpoladas=$(grep -oE '\$\{[A-Z_][A-Z0-9_]*' docker-compose.yml | tr -d '${' | sort -u)
faltantes=$(comm -23 <(echo "$interpoladas") <(echo "$referencia"))
if [[ -n "$faltantes" ]]; then
  echo "El compose interpola variables que ningún .env declara:"
  echo "$faltantes"
  estado=1
fi

exit $estado
