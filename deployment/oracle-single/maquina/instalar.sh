#!/usr/bin/env bash
#
# Instala en la máquina el servicio de despliegue por aviso. Sin root: se corre como el
# usuario `ferre`, que tiene Docker rootless, desde una copia del repositorio
# (git clone https://github.com/carlos-illobre/ferre.git). Idempotente.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
ORIGEN=deployment/oracle-single

[ "$(id -u)" -ne 0 ] || { echo "no correr como root: usar el usuario de Docker rootless"; exit 1; }
docker info >/dev/null 2>&1 || { echo "Docker rootless no responde para $(id -un): revisar DOCKER_HOST o 'docker context use rootless'"; exit 1; }
[ "$(docker info --format '{{.SecurityOptions}}' | grep -c rootless)" -ge 1 ] || echo "aviso: este Docker no es rootless"

echo "▶ scripts en ~/ferre/bin"
mkdir -p ~/ferre/bin ~/ferre/produccion ~/ferre/pruebas
install -m 755 "$ORIGEN/maquina/desplegar.sh" "$ORIGEN/maquina/escuchar.sh" ~/ferre/bin/
[ -f ~/ferre/despliegue.env ] || { cp "$ORIGEN/maquina/despliegue.env.ejemplo" ~/ferre/despliegue.env; echo "  creado ~/ferre/despliegue.env: completar NTFY_AVISOS"; }
for amb in produccion pruebas; do
    [ -f ~/ferre/$amb/.env ] || { cp "$ORIGEN/$amb/.env.oracle" ~/ferre/$amb/.env; echo "  creado ~/ferre/$amb/.env: reemplazar los marcadores <...>"; }
done

echo "▶ servicio de usuario systemd ferre-despliegue"
mkdir -p ~/.config/systemd/user
sed -e "s#__HOME__#$HOME#g" -e "s#__XDG_RUNTIME_DIR__#${XDG_RUNTIME_DIR:-/run/user/$(id -u)}#g" \
    "$ORIGEN/maquina/ferre-despliegue.service" > ~/.config/systemd/user/ferre-despliegue.service
systemctl --user daemon-reload
systemctl --user enable ferre-despliegue.service >/dev/null

if [ "$(loginctl show-user "$(id -un)" -p Linger --value 2>/dev/null)" != "yes" ]; then
    echo "  aviso: el usuario no tiene 'linger'; sin eso el servicio se apaga al cerrar la sesión."
    echo "         un administrador tiene que correr una vez:  sudo loginctl enable-linger $(id -un)"
fi

cat <<'FIN'

Listo. Falta, en este orden:
  1. Completar ~/ferre/produccion/.env, ~/ferre/pruebas/.env y ~/ferre/despliegue.env.
  2. Que el reverse proxy de la máquina apunte a 127.0.0.1:8081 y 127.0.0.1:8082 (ver ORACLE.md, "El reverse proxy").
  3. Arrancar el servicio:  systemctl --user start ferre-despliegue && journalctl --user -u ferre-despliegue -f
FIN
