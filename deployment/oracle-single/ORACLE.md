# Poner ferre online en la máquina de Oracle, paso a paso

Una sola máquina (Ampere ARM, 2 núcleos, 12 GB) corre los dos ambientes, **pruebas** y
**producción**, cada uno con su base en un contenedor de la máquina (ADR-026). El cliente web vive en GitHub Pages.
Nadie entra a la máquina para desplegar: GitHub publica un aviso y la máquina, que lo
escucha, verifica contra el repositorio y se actualiza sola (ADR-013). **Cada ambiente
corre con su propio usuario**, sin privilegios y con su propio Docker rootless:
**`ferre-produccion`** y **`ferre-pruebas`** (decisión 161). Así un error en pruebas (un
`docker compose down -v` o un `prune` en la carpeta equivocada) no puede tocar producción: son
dos Docker distintos, con sus imágenes, volúmenes y redes. Sin root, sin sudo, sin grupo
`docker`.

Los pasos 1 a 3, 6, 7, 9 y 10 se hacen **una vez con cada usuario**, cada uno con su ambiente.

**Pasar un ambiente que ya corre de un usuario a otro:** primero detener el servicio de
despliegue del usuario viejo (`systemctl --user stop ferre-despliegue`). Si sigue escuchando,
un aviso que llega en el medio vuelve a levantar el ambiente mientras se lo baja. Después
bajarlo (`docker compose down -v` en la carpeta de ese ambiente, comprobando que terminó sin
error antes de seguir), borrar su carpeta y volver a arrancar el servicio del usuario viejo si
le queda otro ambiente. Recién entonces arrancar el del usuario nuevo: el puerto local lo
puede usar uno solo.

El reverse proxy de la máquina **no es parte de este proyecto**: lo administra la
máquina para todas sus aplicaciones. Ferre solo cumple un contrato con él (ver "El
reverse proxy").

Los pasos en la máquina los puede hacer el Claude que corre ahí; cada uno dice qué tiene
que verse si salió bien.

## Antes de empezar

- Los usuarios `ferre-produccion` y `ferre-pruebas`, sin sudo, cada uno con **Docker
  rootless** instalado (`dockerd-rootless-setuptool.sh install` y `docker context use
  rootless`, con sus rangos en `/etc/subuid` y `/etc/subgid`), y **linger** habilitado por
  un administrador, para que sus servicios sigan corriendo sin sesión abierta:
  `sudo loginctl enable-linger ferre-produccion ferre-pruebas`. Crear los usuarios y el
  linger es lo único que necesita root, una vez.
- No hace falta abrir puertos ni cargar claves en GitHub: ferre solo escucha en la
  interfaz local y el despliegue no entra a la máquina.

## 1. Clonar el repositorio

Con cada usuario:

```bash
git clone https://github.com/carlos-illobre/ferre.git ~/ferre-repo
```

Es solo para los scripts de instalación; el despliegue no usa esta copia.

## 2. Verificar sin tocar nada

```bash
bash ~/ferre-repo/deployment/oracle-single/preflight.sh pruebas      # como ferre-pruebas
bash ~/ferre-repo/deployment/oracle-single/preflight.sh produccion   # como ferre-produccion
```

Dice qué falta y cómo resolverlo. Repetilo después de cada paso hasta que quede en verde.

## 3. Instalar el servicio de despliegue

```bash
bash ~/ferre-repo/deployment/oracle-single/maquina/instalar.sh pruebas      # como ferre-pruebas
bash ~/ferre-repo/deployment/oracle-single/maquina/instalar.sh produccion   # como ferre-produccion
```

Sin sudo. En el usuario que lo corre, crea `~/ferre/bin/` con los scripts, la carpeta de su
ambiente (`~/ferre/pruebas` o `~/ferre/produccion`) con su `.env` a partir de la plantilla, `~/ferre/despliegue.env`, y el servicio de
usuario `ferre-despliegue` en systemd (registrado, todavía apagado). Se puede volver a
correr: no pisa lo que ya está completado.

## 4. El dominio

Dos nombres de DuckDNS, creados en la misma cuenta, apuntando a la IP pública de la
máquina:

| Nombre | Para |
|---|---|
| `ferre-api.duckdns.org` | API de producción |
| `ferre-api-pruebas.duckdns.org` | API de pruebas |

Comprobar:

```bash
dig +short ferre-api.duckdns.org
```

**Bien:** devuelve la IP de la máquina.

## 5. Las bases

No hay nada que crear afuera: cada ambiente levanta su propio contenedor de PostgreSQL (`db`),
que la primera vez crea la base del mostrador y la de Procesos, con un usuario cada una
(ADR-026). Solo hacen falta tres claves por ambiente, para el paso 6: `openssl rand -hex 24`
cada una, distintas en pruebas y en producción.

## 6. Completar la configuración

Dos archivos en cada usuario, reemplazando todos los marcadores `<...>`:

| Archivo | Qué va |
|---|---|
| `~/ferre/produccion/.env` (de `ferre-produccion`) | ID de Google ([docs/operacion/google-cloud.md](../../docs/operacion/google-cloud.md)), las claves de la base (`CLAVE_BASE_ADMIN`, `CLAVE_BASE_MOSTRADOR`, `CLAVE_BASE_PROCESOS`, `CLAVE_BASE_AUDITORIA`, `CLAVE_BASE_TICKETS`), un token de servicio |
| `~/ferre/pruebas/.env` (de `ferre-pruebas`) | lo mismo para pruebas, con **otras** claves y **otro** token |
| `~/ferre/despliegue.env` (en los dos) | el canal de avisos (paso 7), el mismo en los dos: cada uno despliega solo su ambiente |

Token de servicio, uno por ambiente: `openssl rand -hex 32`. `IMAGEN_TAG` se deja como
está: lo escribe el despliegue.

**Bien:** el preflight ya no avisa de marcadores sin reemplazar.

## 7. El canal de avisos

Un nombre de canal de ntfy que solo sirve para que GitHub le diga a la máquina "fijate".
No es un secreto: un aviso falso solo provoca una verificación contra GitHub que no hace
nada. El nombre ya está cargado en GitHub como variable `NTFY_AVISOS`; el mismo va en
`NTFY_AVISOS=` de `~/ferre/despliegue.env`. Si el ntfy fuera propio, también `NTFY_URL`.

En GitHub ya están cargadas las variables `API_URL` (`https://ferre-api.duckdns.org`) y
`API_URL_PRUEBAS` (`https://ferre-api-pruebas.duckdns.org`). `GOOGLE_CLIENT_ID` no va en GitHub:
la aplicación se lo pide a la API, que lo lee del `.env` de cada ambiente (007-T043).

## 8. El reverse proxy: el contrato

El reverse proxy de la máquina lo administra quien administra la máquina, para todas
las aplicaciones. Ferre necesita de él exactamente esto:

1. Ferre publica cada API **solo en la interfaz local** de la máquina, nunca hacia
   internet: producción en `127.0.0.1:8081` y pruebas en `127.0.0.1:8082` (`PUERTO_API`
   en el `.env` de cada ambiente; si hay que cambiarlos, avisar al proxy). Lo que se publica
   ahí es la puerta del servidor, que reparte cada pedido a su servicio (ADR-031).
2. El proxy enruta por nombre de dominio hacia esos puertos, con HTTPS y certificado
   válido, porque el cliente web está en otro origen y el navegador no acepta una API
   sin TLS:

| Dominio | Destino |
|---|---|
| `ferre-api.duckdns.org` | `http://127.0.0.1:8081` |
| `ferre-api-pruebas.duckdns.org` | `http://127.0.0.1:8082` |

No hace falta que el proxy y ferre compartan usuario, Docker ni red; tampoco los dos
ambientes entre sí.

## 9. Arrancar el servicio de despliegue

```bash
systemctl --user start ferre-despliegue
journalctl --user -u ferre-despliegue -f
```

Con cada usuario. Al arrancar hace una verificación: consulta la rama de su ambiente, baja
sus imágenes, lo levanta y comprueba que quede sano; el ambiente que no tiene `.env` en ese
usuario lo saltea. Después queda escuchando.

**Bien:** el journal termina en `pruebas corriendo <sha>` (o `produccion corriendo <sha>`) y
`escuchando ...`. Con el reverse proxy configurado,
`curl https://ferre-api-pruebas.duckdns.org/health` devuelve `{"ok":true,...}`. Si un
ambiente no queda sano, el journal muestra sus logs y vuelve a la versión anterior si
la había.

## 10. El primer usuario

Una vez por ambiente, con su usuario:

```bash
cd ~/ferre/produccion && docker compose exec comercial node dist/crear-usuario.js tu@gmail.com "Tu nombre"   # ferre-produccion
cd ~/ferre/pruebas && docker compose exec comercial node dist/crear-usuario.js tu@gmail.com "Tu nombre"      # ferre-pruebas
```

Después se entra con Google y se da de alta al empleado desde la app (roles: `dueño`, `admin`, `mostrador`):

- Producción: `https://carlos-illobre.github.io/ferre/`
- Pruebas: `https://carlos-illobre.github.io/ferre/pruebas/`

## 11. Pasar algo a producción

```bash
git push origin master:produccion
```

CI construye, publica y avisa; la máquina despliega producción sola. La rama
`produccion` es un puntero a "lo que está vivo": no se trabaja sobre ella.

## 12. Volver atrás

En la máquina, como `ferre-produccion`, con el SHA que el journal mostró como "antes":

```bash
~/ferre/bin/desplegar.sh produccion <sha-anterior>
```

O moviendo la rama al commit anterior (`git push --force origin <sha>:produccion`), que
además deja el repositorio contando la verdad. La reversión **no** revierte los datos: si
una versión migró el esquema, volver la imagen no vuelve la base.

## 13. Actualizar los scripts de la máquina

Los scripts de `~/ferre/bin` y la unidad de systemd se copian al instalar; el despliegue
por aviso no los actualiza. Cuando cambien en el repositorio, con cada usuario y su ambiente:

```bash
cd ~/ferre-repo && git pull && bash deployment/oracle-single/maquina/instalar.sh <ambiente>
systemctl --user restart ferre-despliegue
```

## 14. Operación de todos los días

Cada comando, con el usuario del ambiente que se mira (`sudo -iu ferre-produccion` o
`sudo -iu ferre-pruebas` desde una cuenta con sudo). Los ejemplos son de producción.

```bash
# qué corre y con qué versión (IMAGEN_TAG es el SHA)
cd ~/ferre/produccion && docker compose ps && grep IMAGEN_TAG .env

# el servicio de despliegue y su historial
systemctl --user status ferre-despliegue
journalctl --user -u ferre-despliegue --since today

# forzar una verificación sin esperar un aviso
~/ferre/bin/desplegar.sh

# logs de un servicio
cd ~/ferre/produccion && docker compose logs -f --tail 100 comercial

# recursos y disco
docker stats --no-stream
df -h / && docker system df

# apagar pruebas cuando no se use (producción sigue), como ferre-pruebas
cd ~/ferre/pruebas && docker compose down
```

## Qué se pierde si se pierde cada volumen

| Volumen | Qué guarda | Si se pierde |
|---|---|---|
| `ferre-<ambiente>_db-data` | la base del mostrador y la de Procesos | se pierde todo: hasta la etapa de copias (T140, antes de usar producción) no hay copias (`docs/operacion/DEPLOYMENT.md`, «Respaldo y recuperación») |
| `ferre-<ambiente>_listas-data` | los Excel originales de cada lista cargada, las fotos y la copia del catálogo | no se pueden reprocesar listas viejas ni ver las fotos; los precios aplicados están en la base |

## Los límites del plan gratuito que importan

- Oracle puede apagar una instancia que considere ociosa. El monitor externo (issue #19)
  la mantiene con actividad y avisa si deja de responder.
- No hay garantía de servicio: si la máquina cae, el mostrador sigue vendiendo desde la
  PWA y el dueño pierde visibilidad hasta levantarla en otra (ADR-002).
