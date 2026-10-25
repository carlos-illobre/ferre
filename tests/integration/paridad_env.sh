#!/usr/bin/env bash
# La prueba que más rinde: todos los .env* declaran exactamente las mismas variables, y
# ninguna variable que el compose interpola queda sin declarar. Sin esto, una variable
# olvidada en un ambiente cae en su valor por omisión sin que nada avise.
set -euo pipefail
cd "$(dirname "$0")/../.."

archivos=(.env.example deployment/oracle-single/produccion/.env.oracle deployment/oracle-single/pruebas/.env.oracle)
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

# 022-E10: ningún ambiente usa Supabase.
if grep -qi supabase "${archivos[@]}"; then
  echo "Algún .env todavía nombra Supabase: la base es la del compose (ADR-026)."
  estado=1
fi

# 022-E02: cada proyecto de compose (un ambiente) tiene su propia instancia de base: el volumen
# de datos no tiene un nombre fijo que compartan dos proyectos.
if ! docker compose -p ambiente-a config 2>/dev/null | grep -q "name: ambiente-a_db-data"; then
  echo "El volumen de la base no es propio de cada proyecto de compose."
  estado=1
fi

# 022-E22: el código no tiene direcciones, puertos ni nombres de ambiente escritos adentro: salen
# del .env. Se revisa el código que corre (sin pruebas); `ambiente.ts` de la web es donde se dice
# qué valor del ambiente es producción.
escrito=$(grep -rnE "localhost|127\.0\.0\.1|supabase|duckdns|:5432|\"(produccion|pruebas)\"" microservices/*/src microservices/procesos/*/src \
  --include=*.ts --include=*.tsx --exclude=*.test.ts --exclude=*.test.tsx 2>/dev/null | grep -v "/pruebas/" | grep -v "^microservices/web/src/plataforma/ambiente/ambiente.ts:" || true)
if [[ -n "$escrito" ]]; then
  echo "El código tiene direcciones o ambientes escritos adentro:"
  echo "$escrito"
  estado=1
fi

# Decisión 161: los logs de cada contenedor no pasan de 10 MB (dos archivos de 5 MB que rotan).
sin_tope=$(docker compose --profile gateway config --format json 2>/dev/null | node -e '
  const s = JSON.parse(require("fs").readFileSync(0, "utf8")).services;
  for (const [n, v] of Object.entries(s)) { const o = v.logging?.options ?? {}; if (o["max-size"] !== "5m" || o["max-file"] !== "2") console.log(n); }' | tr "\n" " ")
if [[ -n "$sin_tope" ]]; then
  echo "Servicios sin tope de logs (decisión 161): $sin_tope"
  estado=1
fi

exit $estado
