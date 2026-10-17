#!/usr/bin/env bash
# El orden del código que dejó el reordenamiento (specs/010-reordenamiento-del-codigo/) se
# mantiene. No necesita el stack.
set -uo pipefail
cd "$(dirname "$0")/../.."
mal=0
falla() { echo "$1"; mal=1; }

# 010-E01: todo el código de la aplicación está bajo microservices/ (el front, el servidor y el
# lector de planillas) y la documentación no tiene código mezclado.
for carpeta in microservices/web microservices/api microservices/listas; do
  [[ -d "$carpeta" ]] || falla "010-E01: falta $carpeta"
done
codigo_en_docs=$(git ls-files docs specs | grep -E '\.(ts|tsx|js|mjs|py)$' || true)
[[ -z "$codigo_en_docs" ]] || falla "010-E01: hay código en la documentación: $codigo_en_docs"

# 010-E03: el despliegue usa los mismos nombres de servicio y de imagen que antes.
for servicio in gestion-del-local listas-de-proveedores; do
  grep -qE "^  ${servicio}:$" docker-compose.yml || falla "010-E03: falta el servicio $servicio en docker-compose.yml"
  grep -qE "image: .*/${servicio}:" docker-compose.yml || falla "010-E03: la imagen de $servicio cambió de nombre"
done

# 010-E04: la tecnología reutilizable no depende del negocio, y una verificación automática lo
# controla en cada subida.
grep -q "la-plataforma-no-depende-del-negocio" microservices/web/.dependency-cruiser.cjs || falla "010-E04: falta la regla de capas de plataforma/"
# El CI corre `pnpm typecheck`, y el de cada paquete corre `pnpm capas`.
grep -q "run: pnpm typecheck" .github/workflows/ci.yml || falla "010-E04: el CI no corre pnpm typecheck"
for paquete in microservices/web microservices/api; do
  grep -q '"typecheck": ".*pnpm capas"' "$paquete/package.json" || falla "010-E04: el typecheck de $paquete no corre el control de capas"
done

# 010-E07: no hay carpeta de librerías compartidas entre servicios.
[[ ! -e libraries ]] || falla "010-E07: volvió la carpeta libraries/"
git ls-files | grep -q '^libraries/' && falla "010-E07: hay archivos en libraries/"

exit $mal
