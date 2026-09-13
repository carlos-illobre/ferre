#!/usr/bin/env bash
#
# Verificación previa de la máquina de Oracle. NO MODIFICA NADA: solo informa. Se corre
# como el usuario sin privilegios que va a correr ferre (Docker rootless), en la máquina:
#
#   bash deployment/oracle-single/preflight.sh
set -uo pipefail

# La API de cada ambiente se publica solo en 127.0.0.1 (8081 producción, 8082 pruebas);
# el reverse proxy de la máquina la alcanza ahí.
MEMORIA_NECESARIA_MB=2048     # dos ambientes: 2 APIs Node + 2 lectores Python, con margen

VERDE='\033[0;32m'; ROJO='\033[0;31m'; AMARILLO='\033[0;33m'; NC='\033[0m'
fallos=0
ok()    { printf "  ${VERDE}✓${NC} %s\n" "$1"; }
mal()   { printf "  ${ROJO}✗${NC} %s\n" "$1"; printf "      %s\n" "$2"; fallos=$((fallos+1)); }
aviso() { printf "  ${AMARILLO}!${NC} %s\n" "$1"; }
nota()  { printf "      %s\n" "$1"; }
titulo(){ printf "\n\033[1m▶ %s\033[0m\n" "$1"; }

printf '\033[1m═══ Verificación previa de la máquina ═══\033[0m\n'

titulo "La máquina"
arq=$(uname -m)
if [ "$arq" = aarch64 ]; then
    ok "arquitectura aarch64 (Ampere): las imágenes de CI se construyen para arm64"
else
    mal "arquitectura $arq" "CI publica imágenes arm64 (job 'imagenes' en runner ARM). Para esta máquina hay que cambiar el runner a amd64."
fi
disponible=$(awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo)
if [ "$disponible" -ge "$MEMORIA_NECESARIA_MB" ]; then
    ok "memoria disponible: ${disponible} MB (hacen falta ${MEMORIA_NECESARIA_MB})"
else
    mal "memoria disponible: ${disponible} MB, hacen falta ${MEMORIA_NECESARIA_MB}" "cerrá lo que sobre o apagá el ambiente de pruebas cuando no se use"
fi
libre_gb=$(( $(df -k / | awk 'NR==2 {print $4}') / 1024 / 1024 ))
if [ "$libre_gb" -ge 10 ]; then ok "espacio libre en /: ${libre_gb} GB"; else mal "espacio libre en /: ${libre_gb} GB" "liberá con: docker image prune -af --filter until=24h"; fi

titulo "El usuario y Docker rootless"
[ "$(id -u)" -ne 0 ] && ok "corriendo como $(id -un), no root" || mal "corriendo como root" "usar el usuario sin privilegios dueño del Docker rootless"
id -nG | grep -qw sudo && aviso "$(id -un) tiene sudo: ferre no lo necesita" || ok "$(id -un) no tiene sudo"
id -nG | grep -qw docker && aviso "$(id -un) está en el grupo docker (equivale a root): con rootless no hace falta" || ok "$(id -un) no está en el grupo docker"
if command -v docker >/dev/null 2>&1; then
    ok "instalado: $(docker --version)"
    if docker info >/dev/null 2>&1; then
        docker info --format '{{.SecurityOptions}}' | grep -q rootless && ok "el demonio es rootless y responde" || aviso "el demonio responde pero NO es rootless"
    else
        mal "Docker no responde para este usuario" "instalar rootless: dockerd-rootless-setuptool.sh install, y 'docker context use rootless'"
    fi
    docker compose version >/dev/null 2>&1 && ok "el plugin compose está" || mal "falta el plugin compose" "instalar docker-compose-plugin para este usuario"
else
    mal "Docker no está instalado para este usuario" "ver ORACLE.md, 'Antes de empezar'"
fi
[ "$(loginctl show-user "$(id -un)" -p Linger --value 2>/dev/null)" = yes ] && ok "linger activo: los servicios de usuario siguen sin sesión" || aviso "sin linger: un administrador debe correr  sudo loginctl enable-linger $(id -un)"

titulo "Los puertos locales de la API"
for puerto in 8081 8082; do
    if ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE "^127\.0\.0\.1:${puerto}$"; then
        ok "127.0.0.1:$puerto en uso (si ferre ya corre, es esperable)"
    elif ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE "[:.]${puerto}$"; then
        mal "el $puerto lo usa otro proceso" "elegir otro PUERTO_API en el .env del ambiente y avisar al reverse proxy"
    else
        ok "el $puerto está libre"
    fi
done

titulo "Las carpetas de los ambientes y el servicio de despliegue"
for a in produccion pruebas; do
    if [ -f "$HOME/ferre/$a/.env" ]; then
        grep -q '<' "$HOME/ferre/$a/.env" && aviso "~/ferre/$a/.env todavía tiene marcadores <...> sin reemplazar" || ok "~/ferre/$a/.env existe"
    else
        aviso "falta ~/ferre/$a/.env (instalar.sh lo crea desde la plantilla)"
    fi
done
[ -f "$HOME/ferre/despliegue.env" ] && ! grep -q '<' "$HOME/ferre/despliegue.env" && ok "~/ferre/despliegue.env completo" || aviso "falta completar ~/ferre/despliegue.env (canal de avisos)"
systemctl --user is-enabled ferre-despliegue >/dev/null 2>&1 && ok "servicio de usuario ferre-despliegue instalado ($(systemctl --user is-active ferre-despliegue))" || aviso "el servicio ferre-despliegue no está instalado (instalar.sh)"

printf '\n\033[1m═══════════════════════════════════════\033[0m\n'
if [ "$fallos" -eq 0 ]; then printf "${VERDE}✓ la máquina está lista${NC}\n"; else printf "${ROJO}✗ %s comprobación(es) fallaron${NC}\n" "$fallos"; fi
exit "$fallos"
