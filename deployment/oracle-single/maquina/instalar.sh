#!/usr/bin/env bash
#
# Instala en la máquina el gateway compartido y el servicio de despliegue por aviso.
# Idempotente: se puede volver a correr. Se ejecuta EN la máquina, como ubuntu, desde una
# copia del repositorio (git clone https://github.com/carlos-illobre/ferre.git).
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
ORIGEN=deployment/oracle-single
[ "$(id -un)" = ubuntu ] || { echo "correr como ubuntu"; exit 1; }

echo "▶ scripts en ~/ferre/bin"
mkdir -p ~/ferre/bin ~/ferre/produccion ~/ferre/pruebas
install -m 755 "$ORIGEN/maquina/desplegar.sh" "$ORIGEN/maquina/escuchar.sh" ~/ferre/bin/
[ -f ~/ferre/despliegue.env ] || { cp "$ORIGEN/maquina/despliegue.env.ejemplo" ~/ferre/despliegue.env; echo "  creado ~/ferre/despliegue.env: completar NTFY_AVISOS"; }
for amb in produccion pruebas; do
    [ -f ~/ferre/$amb/.env ] || { cp "$ORIGEN/$amb/.env.oracle" ~/ferre/$amb/.env; echo "  creado ~/ferre/$amb/.env: reemplazar los marcadores <...>"; }
done

echo "▶ caddy-gateway en ~/caddy-gateway"
mkdir -p ~/caddy-gateway/sitios
cp "$ORIGEN/caddy-gateway/docker-compose.yml" ~/caddy-gateway/
[ -f ~/caddy-gateway/Caddyfile ] || { cp "$ORIGEN/caddy-gateway/Caddyfile" ~/caddy-gateway/; echo "  creado ~/caddy-gateway/Caddyfile: poner el correo para Let's Encrypt"; }
cp "$ORIGEN/caddy-gateway/sitios/ejemplo-de-otro-proyecto.caddy.ejemplo" ~/caddy-gateway/sitios/
docker network inspect caddy-gateway >/dev/null 2>&1 || docker network create caddy-gateway >/dev/null

echo "▶ servicio systemd ferre-despliegue"
sudo install -m 644 "$ORIGEN/maquina/ferre-despliegue.service" /etc/systemd/system/ferre-despliegue.service
sudo systemctl daemon-reload
sudo systemctl enable ferre-despliegue.service >/dev/null

cat <<'FIN'

Listo. Falta, en este orden:
  1. Completar ~/ferre/produccion/.env, ~/ferre/pruebas/.env, ~/ferre/despliegue.env y el correo en ~/caddy-gateway/Caddyfile.
  2. Levantar el gateway:      cd ~/caddy-gateway && docker compose up -d
  3. Arrancar el servicio:     sudo systemctl start ferre-despliegue && journalctl -u ferre-despliegue -f
FIN
