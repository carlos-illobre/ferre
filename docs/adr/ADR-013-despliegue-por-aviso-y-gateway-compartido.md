# ADR-013: La máquina se despliega sola al recibir un aviso; Caddy compartido como única puerta de entrada

**Estado:** Aceptado
**Fecha:** 2026-09-13

---

## Contexto

La máquina de Oracle tiene criterios de seguridad estrictos: SSH solo por Tailscale, con
clave, y nada expuesto que no haga falta. El ADR-012 preveía que GitHub entrara por SSH
para desplegar; no es viable ni deseable. Además la máquina va a alojar más proyectos
web en el futuro, y hoy ya había otro proxy ocupando el 80 y el 443. Los despliegues a
producción van a ser poco frecuentes (uno al mes, aproximadamente), y el dueño no quiere
timers consultando permanentemente.

## Opciones consideradas

### 1. SSH desde el runner con Tailscale
Mantiene el 22 cerrado a internet, pero mete en GitHub un cliente OAuth de Tailscale y
una clave SSH con acceso a la máquina, y hace que un runner ejecute comandos adentro.

### 2. Runner propio de GitHub Actions en la máquina
Sin puertos ni claves, pero el agente ejecuta código del workflow en la máquina con
acceso a Docker; en un repositorio público hay que blindar que un PR externo lo use.

### 3. Timer que consulta GitHub cada pocos minutos
Sin nada entrante, pero consulta todo el día para un despliegue mensual. Descartado por
el dueño.

### 4. Aviso por ntfy y verificación en la máquina (elegida)
GitHub publica un "fijate" en un canal de ntfy al terminar de publicar las imágenes. Un
servicio en la máquina mantiene una conexión saliente a ese canal y, por cada aviso,
consulta a GitHub qué commit tiene cada rama, comprueba que la imagen exista en GHCR, y
despliega. Nada externo ejecuta nada en la máquina; el aviso no lleva información.

## Decisión

- **Despliegue:** `deployment/oracle-single/maquina/desplegar.sh` corre en la máquina
  como `ubuntu`, disparado por `escuchar.sh` (servicio systemd `ferre-despliegue`, una
  conexión saliente a ntfy), por el arranque de la máquina, o a mano. Por SHA; verifica
  la salud por los healthchecks del compose; si falla, vuelve al SHA anterior; toma un
  lock para no solaparse. El compose lo baja del commit que despliega.
- **CI:** el job `avisar` publica en `NTFY_AVISOS` (variable del repositorio, no
  secreto) después del job de imágenes. Sin la variable, avisa y no falla.
- **El canal es público:** el nombre aleatorio filtra ruido, no protege. La seguridad
  está en que la máquina solo despliega lo que dicen las ramas del repositorio y las
  imágenes por SHA de GHCR, que ya son públicos.
- **Gateway compartido:** `~/caddy-gateway` es un proyecto de compose propio con un
  `Caddyfile` que importa `sitios/*.caddy`. Cada proyecto se conecta a la red externa
  `caddy-gateway` y deja su archivo de sitios. El despliegue de ferre genera
  `sitios/ferre.caddy` a partir del `SITIO` de cada ambiente y recarga Caddy en
  caliente. El Caddy del compose de ferre queda solo para desarrollo (perfil `gateway`).
- **Nada nuevo escucha en la máquina:** solo caddy-gateway publica 80 y 443. Sin puerto
  22 a internet, sin claves SSH ni OAuth en GitHub.

## Consecuencias

### Positivas
- Cero secretos con acceso a la máquina fuera de ella.
- Un aviso perdido se recupera al arrancar o con un comando.
- Sumar un proyecto web es un archivo en `sitios/` y una recarga.

### Negativas
- Dependencia de ntfy.sh para la inmediatez (no para la corrección): si ntfy no está,
  el despliegue espera al próximo arranque o a un disparo manual. Se puede mover a un
  ntfy propio detrás de caddy-gateway sin cambiar el script.
- El estado de "qué está desplegado" vive en la máquina (`IMAGEN_TAG`), no en GitHub;
  revertir moviendo la rama es lo que mantiene al repositorio contando la verdad.

### Lo que no cambia
Ramas `master` = pruebas y `produccion` = producción; imágenes por SHA en un runner ARM;
Pages con dos carpetas (ADR-012).

## Cuándo revisar esta decisión

- Si aparece un segundo proyecto que también se despliegue por aviso: generalizar el
  servicio de escucha para varios repositorios.
- Si ntfy.sh cambia sus condiciones: levantar ntfy propio detrás de caddy-gateway.

## Referencias

ADR-006, ADR-012. `deployment/oracle-single/ORACLE.md`.

---

## Enmienda (2026-09-13, misma fecha)

El reverse proxy compartido **sale de este repositorio**: lo administra la máquina para
todas sus aplicaciones, por decisión del dueño. Ferre solo cumple un contrato: se conecta
a la red externa de Docker del proxy (`caddy-gateway`, configurable con `RED_GATEWAY`)
con los alias `gestion-del-local-produccion` y `gestion-del-local-pruebas`, puerto 8080,
y no publica puertos. Además, todo lo de ferre corre como un usuario sin privilegios con
Docker rootless: el servicio de despliegue es una unidad de usuario de systemd y ningún
paso usa sudo. El contrato está en `deployment/oracle-single/ORACLE.md`, "El reverse
proxy". Lo demás del ADR sigue vigente.

---

## Enmienda 2 (2026-09-13, misma fecha): puertos locales en vez de red compartida

Cada aplicación de la máquina va a tener su propio usuario y su propio Docker rootless,
y una red de Docker no se comparte entre demonios distintos. Por eso el contrato con el
reverse proxy deja de ser una red externa y pasa a ser **puertos de la interfaz local**:
cada API se publica en `127.0.0.1:PUERTO_API` (8081 producción, 8082 pruebas) y el proxy,
que es un servicio de la máquina fuera de Docker, apunta ahí. Ferre no necesita red
`caddy-gateway` ni alias por ambiente; desaparecen `AMBIENTE` y `RED_GATEWAY`.
