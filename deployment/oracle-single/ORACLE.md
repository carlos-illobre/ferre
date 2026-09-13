# Poner ferre online en la máquina de Oracle, paso a paso

Una sola máquina (Ampere ARM, 2 núcleos, 12 GB) corre los dos ambientes, **pruebas** y
**producción**, cada uno con su base en Supabase. El cliente web vive en GitHub Pages.
Nadie entra a la máquina para desplegar: GitHub publica un aviso y la máquina, que lo
escucha, verifica contra el repositorio y se actualiza sola (ADR-013). Todo lo de ferre
corre como el usuario **`ferre`**, sin privilegios y con Docker rootless: sin root, sin
sudo, sin grupo `docker`.

El reverse proxy de la máquina **no es parte de este proyecto**: lo administra la
máquina para todas sus aplicaciones. Ferre solo cumple un contrato con él (ver "El
reverse proxy").

Los pasos en la máquina los puede hacer el Claude que corre ahí; cada uno dice qué tiene
que verse si salió bien.

## Antes de empezar

- El usuario `ferre`, sin sudo, con **Docker rootless** instalado y
  `docker context use rootless`, y **linger** habilitado por un administrador, para que
  sus servicios sigan corriendo sin sesión abierta: `sudo loginctl enable-linger ferre`.
  Es lo único que necesita root, una vez.
- No hace falta abrir puertos ni cargar claves en GitHub: ferre solo escucha en la
  interfaz local y el despliegue no entra a la máquina.

## 1. Clonar el repositorio

Como `ferre`:

```bash
git clone https://github.com/carlos-illobre/ferre.git ~/ferre-repo
```

Es solo para los scripts de instalación; el despliegue no usa esta copia.

## 2. Verificar sin tocar nada

```bash
bash ~/ferre-repo/deployment/oracle-single/preflight.sh
```

Dice qué falta y cómo resolverlo. Repetilo después de cada paso hasta que quede en verde.

## 3. Instalar el servicio de despliegue

```bash
bash ~/ferre-repo/deployment/oracle-single/maquina/instalar.sh
```

Sin sudo. Crea `~/ferre/bin/` con los scripts, `~/ferre/produccion` y `~/ferre/pruebas`
con sus `.env` a partir de las plantillas, `~/ferre/despliegue.env`, y el servicio de
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

## 5. Las dos bases en Supabase

1. En [supabase.com](https://supabase.com/), crear **dos proyectos** en la región
   **South America (São Paulo)**: `ferre-produccion` y `ferre-pruebas`.
2. En cada uno: **Connect** → **Session pooler**, copiar la cadena `postgres://...` y
   reemplazar `[YOUR-PASSWORD]`. **No usar la conexión directa:** es solo IPv6 y la
   máquina sale por IPv4.

## 6. Completar la configuración

Tres archivos, reemplazando todos los marcadores `<...>`:

| Archivo | Qué va |
|---|---|
| `~/ferre/produccion/.env` | ID de Google ([docs/google-cloud.md](../../docs/google-cloud.md)), cadena de Supabase de producción, un token de servicio |
| `~/ferre/pruebas/.env` | lo mismo para pruebas, con su base y **otro** token |
| `~/ferre/despliegue.env` | el canal de avisos (paso 7) |

Token de servicio, uno por ambiente: `openssl rand -hex 32`. `IMAGEN_TAG` se deja como
está: lo escribe el despliegue.

**Bien:** el preflight ya no avisa de marcadores sin reemplazar.

## 7. El canal de avisos

Un nombre de canal de ntfy que solo sirve para que GitHub le diga a la máquina "fijate".
No es un secreto: un aviso falso solo provoca una verificación contra GitHub que no hace
nada. El nombre ya está cargado en GitHub como variable `NTFY_AVISOS`; el mismo va en
`NTFY_AVISOS=` de `~/ferre/despliegue.env`. Si el ntfy fuera propio, también `NTFY_URL`.

En GitHub ya están cargadas las variables `API_URL` (`https://ferre-api.duckdns.org`) y
`API_URL_PRUEBAS` (`https://ferre-api-pruebas.duckdns.org`). Falta `GOOGLE_CLIENT_ID`.

## 8. El reverse proxy: el contrato

El reverse proxy de la máquina lo administra quien administra la máquina, para todas
las aplicaciones. Ferre necesita de él exactamente esto:

1. Ferre publica cada API **solo en la interfaz local** de la máquina, nunca hacia
   internet: producción en `127.0.0.1:8081` y pruebas en `127.0.0.1:8082` (`PUERTO_API`
   en el `.env` de cada ambiente; si hay que cambiarlos, avisar al proxy).
2. El proxy enruta por nombre de dominio hacia esos puertos, con HTTPS y certificado
   válido, porque el cliente web está en otro origen y el navegador no acepta una API
   sin TLS:

| Dominio | Destino |
|---|---|
| `ferre-api.duckdns.org` | `http://127.0.0.1:8081` |
| `ferre-api-pruebas.duckdns.org` | `http://127.0.0.1:8082` |

No hace falta que el proxy y ferre compartan usuario, Docker ni red.

## 9. Arrancar el servicio de despliegue

```bash
systemctl --user start ferre-despliegue
journalctl --user -u ferre-despliegue -f
```

Al arrancar hace una verificación: consulta las ramas, baja las imágenes de pruebas y de
producción, levanta cada ambiente y comprueba que quede sano. Después queda escuchando.

**Bien:** el journal termina en `pruebas corriendo <sha>`, `produccion corriendo <sha>` y
`escuchando ...`. Con el reverse proxy configurado,
`curl https://ferre-api-pruebas.duckdns.org/health` devuelve `{"ok":true,...}`. Si un
ambiente no queda sano, el journal muestra sus logs y vuelve a la versión anterior si
la había.

## 10. El primer usuario

Una vez por ambiente:

```bash
cd ~/ferre/produccion && docker compose exec gestion-del-local node dist/crear-usuario.js tu@gmail.com "Tu nombre" dueño
cd ~/ferre/pruebas && docker compose exec gestion-del-local node dist/crear-usuario.js tu@gmail.com "Tu nombre" dueño
```

Después se entra con Google y se da de alta al empleado desde la app:

- Producción: `https://carlos-illobre.github.io/ferre/`
- Pruebas: `https://carlos-illobre.github.io/ferre/pruebas/`

## 11. Pasar algo a producción

```bash
git push origin master:produccion
```

CI construye, publica y avisa; la máquina despliega producción sola. La rama
`produccion` es un puntero a "lo que está vivo": no se trabaja sobre ella.

## 12. Volver atrás

En la máquina, con el SHA que el journal mostró como "antes":

```bash
~/ferre/bin/desplegar.sh produccion <sha-anterior>
```

O moviendo la rama al commit anterior (`git push --force origin <sha>:produccion`), que
además deja el repositorio contando la verdad. La reversión **no** revierte los datos: si
una versión migró el esquema, volver la imagen no vuelve la base.

## 13. Actualizar los scripts de la máquina

Los scripts de `~/ferre/bin` y la unidad de systemd se copian al instalar; el despliegue
por aviso no los actualiza. Cuando cambien en el repositorio:

```bash
cd ~/ferre-repo && git pull && bash deployment/oracle-single/maquina/instalar.sh
systemctl --user restart ferre-despliegue
```

## 14. Operación de todos los días

```bash
# qué corre y con qué versión (IMAGEN_TAG es el SHA)
cd ~/ferre/produccion && docker compose ps && grep IMAGEN_TAG .env

# el servicio de despliegue y su historial
systemctl --user status ferre-despliegue
journalctl --user -u ferre-despliegue --since today

# forzar una verificación sin esperar un aviso
~/ferre/bin/desplegar.sh

# logs de un servicio
cd ~/ferre/produccion && docker compose logs -f --tail 100 gestion-del-local

# recursos y disco
docker stats --no-stream
df -h / && docker system df

# apagar pruebas cuando no se use (producción sigue)
cd ~/ferre/pruebas && docker compose down
```

## Qué se pierde si se pierde cada volumen

| Volumen | Qué guarda | Si se pierde |
|---|---|---|
| `ferre-<ambiente>_listas-data` | los Excel originales de cada lista cargada | no se pueden reprocesar listas viejas; los precios aplicados están en la base |

La base de datos no está en la máquina: está en Supabase, con el respaldo del ADR-002.

## Los límites del plan gratuito que importan

- Oracle puede apagar una instancia que considere ociosa. El monitor externo (issue #19)
  la mantiene con actividad y avisa si deja de responder.
- No hay garantía de servicio: si la máquina cae, el mostrador sigue vendiendo desde la
  PWA y el dueño pierde visibilidad hasta levantarla en otra (ADR-002).
