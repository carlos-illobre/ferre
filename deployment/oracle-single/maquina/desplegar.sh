#!/usr/bin/env bash
#
# Despliegue desde la MÁQUINA (ADR-013): la máquina decide qué correr consultando a
# GitHub, sin que nadie entre a ella. Lo dispara el aviso de ntfy (escuchar.sh), el
# arranque de la máquina, o una persona a mano por SSH:
#
#   ~/ferre/bin/desplegar.sh                      # los dos ambientes, a lo último de cada rama
#   ~/ferre/bin/desplegar.sh produccion           # solo producción
#   ~/ferre/bin/desplegar.sh produccion <sha>     # un commit concreto, o volver atrás
#
# Fuente de la verdad: la rama master (→ pruebas) y la rama produccion (→ produccion) del
# repositorio, y las imágenes por SHA en GHCR. Un aviso falso solo provoca esta consulta.
# Corre como un usuario sin privilegios con Docker rootless; no usa sudo.
set -euo pipefail

REPO=carlos-illobre/ferre
BASE="${FERRE_BASE:-$HOME/ferre}"
# Los servicios salen del compose de cada versión (`docker compose config --services`), no de
# una lista escrita acá: una versión que agrega o renombra un servicio se despliega sin
# reinstalar este script.

ok()    { printf '  \033[0;32m✓\033[0m %s\n' "$1"; }
info()  { printf '    %s\n' "$1"; }
paso()  { printf '\n\033[1m▶ %s\033[0m\n' "$1"; }
fallo() { printf '\n\033[0;31m✗ %s\033[0m\n' "$1" >&2; }

# Aviso opcional del resultado (ntfy). NTFY_RESULTADOS vacío = solo el journal.
avisar() {
    [ -n "${NTFY_RESULTADOS:-}" ] || return 0
    curl -s -o /dev/null -H "Title: ferre $1" -d "$2" "${NTFY_URL:-https://ntfy.sh}/$NTFY_RESULTADOS" || true
}

# Toma un lock: dos avisos seguidos no pueden desplegar a la vez.
exec 9>"$BASE/.desplegar.lock"
flock -w 600 9 || { fallo "otro despliegue lleva más de 10 minutos"; exit 1; }

rama_de() { case "$1" in pruebas) echo master ;; produccion) echo produccion ;; *) return 1 ;; esac; }

servicios() { (cd "$BASE/$1" && docker compose config --services); }

sano() { # ambiente
    local dir="$BASE/$1"
    for servicio in $(servicios "$1"); do
        local listo=no
        for _ in $(seq 1 30); do
            # Sano: con control de salud, "healthy"; sin él, corriendo.
            case "$(cd "$dir" && docker compose ps --format '{{.Health}}/{{.State}}' "$servicio" 2>/dev/null)" in
                healthy/*|/running) listo=si; break ;;
            esac
            sleep 4
        done
        [ "$listo" = si ] || { (cd "$dir" && docker compose logs --tail 40 "$servicio") || true; return 1; }
    done
}

fijar_tag() { sed -i '/^IMAGEN_TAG=/d' "$BASE/$1/.env" && printf 'IMAGEN_TAG=%s\n' "$2" >> "$BASE/$1/.env"; }

# Lo que corre DE VERDAD: la etiqueta de las imágenes de los contenedores, no lo que diga el
# .env, y solo si todos están sanos y con la misma etiqueta. Si el .env quedó con un SHA que
# nunca levantó, acá se ve vacío y se vuelve a intentar en vez de creer que "ya está corriendo".
version_corriendo() { # ambiente
    local filas etiquetas
    filas=$(cd "$BASE/$1" && docker compose ps --format '{{.Image}} {{.Health}}' 2>/dev/null | grep "ghcr.io/$REPO/" || true)
    [ -n "$filas" ] || return 0
    printf '%s\n' "$filas" | awk '$2 != "healthy" { mal = 1 } END { exit mal }' || return 0
    etiquetas=$(printf '%s\n' "$filas" | awk '{ n = split($1, p, ":"); print p[n] }' | sort -u)
    [ "$(printf '%s\n' "$etiquetas" | wc -l)" -eq 1 ] && echo "$etiquetas"
}

# El compose de un commit, a su carpeta. Volver a una versión anterior baja también su compose:
# los servicios y sus imágenes pueden haber cambiado de nombre.
bajar_compose() { # ambiente sha
    curl -sf "https://raw.githubusercontent.com/$REPO/$2/docker-compose.yml" -o "$BASE/$1/docker-compose.yml.nuevo" \
        && mv "$BASE/$1/docker-compose.yml.nuevo" "$BASE/$1/docker-compose.yml"
}

# Las imágenes de un SHA tienen que estar todas: si CI todavía no las publicó, el próximo aviso lo resuelve.
imagenes_publicadas() { # ambiente sha
    local imagen
    for imagen in $(cd "$BASE/$1" && IMAGEN_TAG="$2" docker compose config --images); do
        docker manifest inspect "$imagen" >/dev/null 2>&1 || return 1
    done
}

desplegar() { # ambiente [sha]
    local amb=$1 rama dir sha actual
    rama=$(rama_de "$amb") || { fallo "ambiente desconocido: $amb"; return 1; }
    dir="$BASE/$amb"
    paso "$amb (rama $rama)"
    [ -f "$dir/.env" ] || { info "sin $dir/.env: ambiente no configurado, se saltea"; return 0; }

    if [ -n "${2:-}" ]; then
        sha=${2:0:7}; info "SHA pedido a mano: $sha"
    else
        sha=$(git ls-remote "https://github.com/$REPO.git" "refs/heads/$rama" | cut -c1-7)
        [ -n "$sha" ] || { fallo "no pude consultar la rama $rama en GitHub"; return 1; }
        info "último de $rama en GitHub: $sha"
    fi
    actual=$(version_corriendo "$amb")
    if [ "$actual" = "$sha" ]; then ok "ya está corriendo $sha, nada que hacer"; return 0; fi
    [ -n "$actual" ] && info "corriendo ahora: $actual" || info "no hay ningún contenedor sano corriendo"

    cp "$dir/docker-compose.yml" "$dir/docker-compose.yml.anterior" 2>/dev/null || true
    bajar_compose "$amb" "$sha" || { fallo "no pude bajar el compose del commit $sha"; return 1; }
    if ! imagenes_publicadas "$amb" "$sha"; then
        info "las imágenes de $sha todavía no están todas en GHCR; se reintenta con el próximo aviso"
        mv "$dir/docker-compose.yml.anterior" "$dir/docker-compose.yml" 2>/dev/null || true
        return 0
    fi

    fijar_tag "$amb" "$sha"
    (cd "$dir" && docker compose pull --quiet && docker compose up -d --remove-orphans) \
        || { fallo "no se pudo levantar $sha"; }
    if sano "$amb"; then
        ok "$amb corriendo $sha"
        avisar "$amb desplegado" "$sha sano (antes: ${actual:-ninguno})"
    else
        fallo "$amb con $sha no quedó sano"
        if [ -n "$actual" ]; then
            info "volviendo a $actual"
            bajar_compose "$amb" "$actual" || mv "$dir/docker-compose.yml.anterior" "$dir/docker-compose.yml" 2>/dev/null || true
            fijar_tag "$amb" "$actual"
            (cd "$dir" && docker compose up -d --remove-orphans) || true
            sano "$amb" && ok "$amb de vuelta en $actual" || fallo "$amb tampoco quedó sano en $actual"
            avisar "$amb FALLÓ" "$sha no quedó sano; volví a $actual"
        else
            # Sin versión anterior no queda nada arriba; el .env no debe fingir que sí.
            fijar_tag "$amb" "<sha>"
            avisar "$amb FALLÓ" "$sha no quedó sano y no había versión anterior"
        fi
        return 1
    fi
}

resultado=0
if [ $# -gt 0 ]; then
    desplegar "$1" "${2:-}" || resultado=1
else
    for amb in pruebas produccion; do desplegar "$amb" || resultado=1; done
fi
paso "Liberando disco"
# -a es lo que hace el trabajo: las imágenes etiquetadas por SHA nunca están "colgadas".
info "$(docker image prune -af --filter until=24h | tail -1)"
df -h / | awk 'NR==2 {print "    libre en /: " $4 " de " $2}'
exit $resultado
