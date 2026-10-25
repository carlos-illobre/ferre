#!/usr/bin/env bash
#
# Instala en la máquina el servicio de despliegue por aviso de UN ambiente. Cada ambiente
# corre con su propio usuario y su propio Docker rootless (decisión 161): `ferre-produccion`
# instala produccion y `ferre-pruebas` instala pruebas. Sin root, desde una copia del
# repositorio (git clone https://github.com/carlos-illobre/ferre.git). Idempotente.
#
#   bash deployment/oracle-single/maquina/instalar.sh pruebas|produccion
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
ORIGEN=deployment/oracle-single
AMBIENTE=${1:-}
case "$AMBIENTE" in produccion|pruebas) ;; *) echo "uso: instalar.sh pruebas|produccion"; exit 1 ;; esac
[ "$(id -un)" = "ferre-$AMBIENTE" ] || echo "aviso: $AMBIENTE se instala con el usuario ferre-$AMBIENTE, y este es $(id -un)"

[ "$(id -u)" -ne 0 ] || { echo "no correr como root: usar el usuario de Docker rootless"; exit 1; }
docker info >/dev/null 2>&1 || { echo "Docker rootless no responde para $(id -un): revisar DOCKER_HOST o 'docker context use rootless'"; exit 1; }
[ "$(docker info --format '{{.SecurityOptions}}' | grep -c rootless)" -ge 1 ] || echo "aviso: este Docker no es rootless"

echo "▶ scripts en ~/ferre/bin"
mkdir -p ~/ferre/bin ~/ferre/$AMBIENTE
install -m 755 "$ORIGEN/maquina/desplegar.sh" "$ORIGEN/maquina/escuchar.sh" ~/ferre/bin/
[ -f ~/ferre/despliegue.env ] || { cp "$ORIGEN/maquina/despliegue.env.ejemplo" ~/ferre/despliegue.env; echo "  creado ~/ferre/despliegue.env: completar NTFY_AVISOS"; }
[ -f ~/ferre/$AMBIENTE/.env ] || { cp "$ORIGEN/$AMBIENTE/.env.oracle" ~/ferre/$AMBIENTE/.env; chmod 600 ~/ferre/$AMBIENTE/.env; echo "  creado ~/ferre/$AMBIENTE/.env: reemplazar los marcadores <...>"; }

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
  1. Completar ~/ferre/<ambiente>/.env y ~/ferre/despliegue.env.
  2. Que el reverse proxy de la máquina apunte a 127.0.0.1:8081 (producción) y 127.0.0.1:8082 (pruebas) (ver ORACLE.md, "El reverse proxy").
  3. Arrancar el servicio:  systemctl --user start ferre-despliegue && journalctl --user -u ferre-despliegue -f
FIN
