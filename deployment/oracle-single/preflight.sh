#!/usr/bin/env bash
#
# Verificación previa de la máquina de Oracle. NO MODIFICA NADA: solo informa.
#
#   en la máquina      bash deployment/oracle-single/preflight.sh
#   desde tu máquina   ssh ubuntu@<ip> 'bash -s' < deployment/oracle-single/preflight.sh
#
# La segunda forma no copia nada: sirve antes de clonar. En esa forma `sudo` no puede
# pedir contraseña (stdin lo ocupa el script); en las imágenes Ubuntu de Oracle el usuario
# `ubuntu` tiene sudo sin contraseña. Correrlo ANTES del primer `docker compose up`: con el
# stack arriba, la comprobación de puertos los marca ocupados.
set -uo pipefail

PUERTOS=(80 443)              # los que publica caddy-gateway; nada más escucha en el host
MEMORIA_NECESARIA_MB=3072     # dos ambientes: 2 APIs Node + 2 lectores Python + Caddy, con margen

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

titulo "Docker"
if command -v docker >/dev/null 2>&1; then
    ok "instalado: $(docker --version)"
    docker info >/dev/null 2>&1 && ok "el demonio responde y el usuario puede hablarle" \
        || mal "el usuario no puede hablar con el demonio" "sudo usermod -aG docker \$USER  y volvé a entrar por SSH"
    docker compose version >/dev/null 2>&1 && ok "el plugin compose está" || mal "falta el plugin compose" "instalá docker-compose-plugin"
    docker network inspect caddy-gateway >/dev/null 2>&1 && ok "la red caddy-gateway existe" || aviso "la red caddy-gateway no existe todavía (instalar.sh la crea)"
else
    mal "Docker no está instalado" "ver ORACLE.md, paso 4"
fi

titulo "Los puertos que publica el stack"
for puerto in "${PUERTOS[@]}"; do
    if ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE "[:.]${puerto}\$"; then
        if docker ps --format '{{.Names}} {{.Ports}}' 2>/dev/null | grep -q "caddy-gateway.*:$puerto->"; then ok "el $puerto lo usa caddy-gateway"; else mal "el $puerto lo usa otro proceso" "caddy-gateway necesita 80 y 443: apagá lo que los ocupe (por ejemplo, el nginx de otro proyecto)"; fi
    else
        ok "el $puerto está libre (caddy-gateway todavía no corre)"
    fi
done

titulo "El firewall del host"
# Los puertos publicados por Docker no pasan por INPUT (DNAT → FORWARD → DOCKER). Se mira
# igual porque las imágenes Ubuntu de Oracle traen reglas que descartan tráfico entrante.
if sudo -n iptables -L INPUT -n 2>/dev/null | grep -qE '^(REJECT|DROP)'; then
    aviso "hay reglas REJECT/DROP en INPUT"
    nota "no afectan a los puertos publicados por Docker, pero sí al SSH y a lo que escuche en el host"
    nota "lista completa: sudo iptables -L INPUT -n --line-numbers"
else
    ok "sin reglas de descarte en INPUT, o no se pudo consultar"
fi
command -v ufw >/dev/null 2>&1 && sudo -n ufw status 2>/dev/null | grep -q "Status: active" \
    && { aviso "ufw está activo"; nota "sus reglas van a INPUT y no filtran los puertos de Docker: el firewall efectivo es la Security List de la VCN"; }
nota "lo que decide qué está abierto desde internet es la Security List de la VCN"

titulo "Las carpetas de los ambientes y el servicio de despliegue"
for a in produccion pruebas; do
    if [ -f "$HOME/ferre/$a/.env" ]; then
        grep -q '<' "$HOME/ferre/$a/.env" && aviso "~/ferre/$a/.env todavía tiene marcadores <...> sin reemplazar" || ok "~/ferre/$a/.env existe"
    else
        aviso "falta ~/ferre/$a/.env (instalar.sh lo crea desde la plantilla)"
    fi
done
[ -f "$HOME/ferre/despliegue.env" ] && ! grep -q '<' "$HOME/ferre/despliegue.env" && ok "~/ferre/despliegue.env completo" || aviso "falta completar ~/ferre/despliegue.env (canal de avisos)"
[ -f "$HOME/caddy-gateway/Caddyfile" ] && ! grep -q '<' "$HOME/caddy-gateway/Caddyfile" && ok "~/caddy-gateway/Caddyfile completo" || aviso "falta completar el correo en ~/caddy-gateway/Caddyfile"
systemctl is-enabled ferre-despliegue >/dev/null 2>&1 && ok "servicio ferre-despliegue instalado ($(systemctl is-active ferre-despliegue))" || aviso "el servicio ferre-despliegue no está instalado (instalar.sh)"

printf '\n\033[1m═══════════════════════════════════════\033[0m\n'
if [ "$fallos" -eq 0 ]; then printf "${VERDE}✓ la máquina está lista${NC}\n"; else printf "${ROJO}✗ %s comprobación(es) fallaron${NC}\n" "$fallos"; fi
exit "$fallos"
