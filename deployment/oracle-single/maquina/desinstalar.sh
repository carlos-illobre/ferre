#!/usr/bin/env bash
#
# Desinstala ferre de la máquina de Oracle: los dos ambientes, sus datos y sus usuarios (T175).
# Ferre se da de baja; no hay datos válidos ni se usa en producción (Carlos, 2026-10-27).
# Lo corre un administrador de la máquina, con sudo, desde cualquier carpeta:
#
#   bash desinstalar.sh            # muestra lo que va a borrar y pide escribir «borrar»
#
# No toca el reverse proxy de la máquina (no es parte de ferre, ver ORACLE.md): al final dice
# qué rutas sacarle. Sin vuelta atrás: los volúmenes se borran.
set -euo pipefail

USUARIOS=(ferre-produccion ferre-pruebas)

ok()   { printf '  \033[0;32m✓\033[0m %s\n' "$1"; }
paso() { printf '\n\033[1m▶ %s\033[0m\n' "$1"; }

[ "$(id -u)" -ne 0 ] || { echo "correr con un usuario administrador, no como root (usa sudo adentro)"; exit 1; }
sudo -v

existentes=()
for u in "${USUARIOS[@]}"; do id "$u" >/dev/null 2>&1 && existentes+=("$u"); done
[ ${#existentes[@]} -gt 0 ] || { echo "No hay usuarios de ferre en esta máquina: nada que desinstalar."; exit 0; }

paso "Se va a borrar, sin vuelta atrás"
for u in "${existentes[@]}"; do
    echo "  $u: su servicio ferre-despliegue, sus contenedores, imágenes y volúmenes, su Docker rootless y su carpeta $(getent passwd "$u" | cut -d: -f6)"
done
read -r -p "Escribí «borrar» para seguir: " respuesta
[ "$respuesta" = borrar ] || { echo "Cancelado."; exit 1; }

# Lo que corre como cada usuario, con su propio systemd y su propio Docker.
como() { # usuario comando
    local uid; uid=$(id -u "$1")
    sudo -iu "$1" env XDG_RUNTIME_DIR="/run/user/$uid" DOCKER_HOST="unix:///run/user/$uid/docker.sock" bash -c "$2"
}

for u in "${existentes[@]}"; do
    paso "$u"
    # Primero el servicio: si sigue escuchando, un aviso vuelve a levantar el ambiente.
    como "$u" 'systemctl --user disable --now ferre-despliegue.service 2>/dev/null || true
               rm -f ~/.config/systemd/user/ferre-despliegue.service
               systemctl --user daemon-reload 2>/dev/null || true'
    ok "servicio de despliegue detenido y borrado"

    como "$u" 'for d in ~/ferre/produccion ~/ferre/pruebas; do
                   [ -f "$d/docker-compose.yml" ] && (cd "$d" && docker compose down -v --remove-orphans) || true
               done
               docker info >/dev/null 2>&1 && docker system prune -af --volumes >/dev/null || true'
    ok "contenedores, imágenes, redes y volúmenes borrados"

    como "$u" 'command -v dockerd-rootless-setuptool.sh >/dev/null && dockerd-rootless-setuptool.sh uninstall -f >/dev/null 2>&1 || true
               rootlesskit rm -rf ~/.local/share/docker 2>/dev/null || true'
    ok "Docker rootless desinstalado"

    sudo loginctl disable-linger "$u" 2>/dev/null || true
    sudo loginctl terminate-user "$u" 2>/dev/null || true
    sudo pkill -KILL -u "$u" 2>/dev/null || true
    sudo userdel -r "$u" 2>/dev/null || sudo userdel "$u"
    sudo sed -i "/^$u:/d" /etc/subuid /etc/subgid
    ok "usuario, su carpeta y sus rangos de subuid/subgid borrados"
done

paso "Comprobación"
for u in "${USUARIOS[@]}"; do
    ! id "$u" >/dev/null 2>&1 && ok "$u ya no existe" || echo "  ✗ $u sigue existiendo"
done
! ss -ltn | grep -qE '127\.0\.0\.1:(8081|8082) ' && ok "nada escucha en 8081 ni en 8082" || echo "  ✗ algo sigue escuchando en 8081 u 8082"

cat <<'FIN'

Listo. Fuera de esta máquina, a mano:
  1. El reverse proxy de la máquina: sacar las rutas de ferre-api.duckdns.org (8081) y
     ferre-api-pruebas.duckdns.org (8082).
  2. DuckDNS: borrar ferre-api y ferre-api-pruebas, si no se van a usar.
  3. GitHub (opcional): las imágenes de ferre en GHCR y el canal de ntfy de sus avisos.
FIN
