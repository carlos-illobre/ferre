#!/usr/bin/env bash
#
# Desinstala ferre de la máquina de Oracle: los dos ambientes, sus datos y sus usuarios (T175).
# Ferre se da de baja; no hay datos válidos ni se usa en producción (Carlos, 2026-10-27).
# Lo corre un administrador de la máquina, con sudo, desde cualquier carpeta:
#
#   bash desinstalar.sh            # muestra lo que va a borrar y pide escribir «borrar»
#
# Del reverse proxy de la máquina solo saca el sitio de ferre (/etc/caddy/sitios/ferre.caddy) y
# lo recarga; el resto del proxy no se toca. Sin vuelta atrás: los volúmenes se borran.
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

# Lo que corre como cada usuario, con su propio systemd y su propio Docker. El script va por la
# entrada estándar (bash -s): `sudo -i` rompe los comandos de varias líneas.
como() { # usuario < script
    local uid casa; uid=$(id -u "$1"); casa=$(getent passwd "$1" | cut -d: -f6)
    sudo -u "$1" env HOME="$casa" XDG_RUNTIME_DIR="/run/user/$uid" \
        DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$uid/bus" \
        DOCKER_HOST="unix:///run/user/$uid/docker.sock" PATH="$casa/bin:/usr/local/bin:/usr/bin:/bin" \
        bash -s
}

for u in "${existentes[@]}"; do
    paso "$u"
    # Primero el servicio: si sigue escuchando, un aviso vuelve a levantar el ambiente.
    como "$u" <<'FIN'
set -euo pipefail
cd ~
unidad=~/.config/systemd/user/ferre-despliegue.service
if systemctl --user list-unit-files ferre-despliegue.service </dev/null | grep -q ferre-despliegue; then
    systemctl --user disable --now ferre-despliegue.service </dev/null
fi
rm -f "$unidad"
systemctl --user daemon-reload </dev/null
if systemctl --user is-active --quiet ferre-despliegue.service </dev/null; then
    echo "el servicio sigue activo" >&2; exit 1
fi
[ ! -e "$unidad" ]
FIN
    ok "servicio de despliegue detenido y borrado"

    como "$u" <<'FIN'
set -euo pipefail
cd ~
docker info >/dev/null </dev/null
for d in ~/ferre/produccion ~/ferre/pruebas; do
    if [ -f "$d/docker-compose.yml" ]; then
        (cd "$d" && docker compose down -v --remove-orphans </dev/null)
    fi
done
docker ps -aq </dev/null | xargs -r docker rm -f >/dev/null
docker system prune -af --volumes </dev/null >/dev/null
[ -z "$(docker ps -aq </dev/null)" ] && [ -z "$(docker volume ls -q </dev/null)" ]
FIN
    ok "contenedores, imágenes, redes y volúmenes borrados"

    como "$u" <<'FIN'
set -euo pipefail
cd ~
if command -v dockerd-rootless-setuptool.sh >/dev/null; then
    dockerd-rootless-setuptool.sh uninstall -f </dev/null >/dev/null
else
    echo "    no está dockerd-rootless-setuptool.sh: su carpeta se borra con el usuario"
fi
FIN
    ok "Docker rootless desinstalado"

    sudo loginctl disable-linger "$u"
    sudo loginctl terminate-user "$u" 2>/dev/null || true   # falla si no tenía sesión: no importa
    sudo pkill -KILL -u "$u" || true                        # falla si no quedaba ningún proceso
    # Quedan archivos de los contenedores con dueños de /etc/subuid: root los borra igual.
    sudo userdel -r "$u"
    sudo sed -i "/^$u:/d" /etc/subuid /etc/subgid
    ok "usuario, su carpeta y sus rangos de subuid/subgid borrados"
done

paso "El reverse proxy de la máquina"
if [ -f /etc/caddy/sitios/ferre.caddy ]; then
    sudo rm /etc/caddy/sitios/ferre.caddy
    sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null && sudo systemctl reload caddy
    ok "sitio de ferre borrado y Caddy recargado"
else
    ok "no había sitio de ferre"
fi

paso "Comprobación"
for u in "${USUARIOS[@]}"; do
    ! id "$u" >/dev/null 2>&1 && ok "$u ya no existe" || echo "  ✗ $u sigue existiendo"
done
escuchando=$(ss -ltn)
if grep -qE '127\.0\.0\.1:(8081|8082|5433|5434) ' <<<"$escuchando"; then
    echo "  ✗ algo sigue escuchando en 8081, 8082, 5433 o 5434"
else
    ok "nada escucha en 8081, 8082, 5433 ni 5434"
fi

cat <<'FIN'

Listo. Queda a mano:
  1. /etc/caddy/sitios/README.md: sacar la fila de ferre de la tabla.
  2. DuckDNS: borrar ferre-api y ferre-api-pruebas, si no se van a usar.
  3. GitHub (opcional): las imágenes de ferre en GHCR y el canal de ntfy de sus avisos.
FIN
