# Poner ferre online en la máquina de Oracle, paso a paso

Una sola máquina (Ampere ARM, 2 núcleos, 12 GB) corre los dos ambientes, **pruebas** y
**producción**, cada uno con su base en Supabase. El cliente web vive en GitHub Pages.
Nadie entra a la máquina para desplegar: GitHub publica un aviso y la máquina, que lo
escucha, verifica contra el repositorio y se actualiza sola (ADR-013). Después de esta
guía, cada push a `master` actualiza pruebas y cada push a `produccion` actualiza
producción.

Los pasos en la máquina los puede hacer el Claude que corre ahí; cada uno dice qué
tiene que verse si salió bien. Ningún paso abre puertos nuevos ni instala nada fuera de
Docker, que ya está.

## Antes de empezar: lo que ya no hace falta

- **No instalar Docker:** ya está (paquete `docker.io` de Ubuntu, con compose v2). El
  script oficial lo pisaría.
- **No abrir el puerto 22 a internet ni cargar claves SSH en GitHub:** el despliegue no
  entra a la máquina.
- **Sí hay que apagar lo que use los puertos 80 y 443** antes de levantar el gateway.
  Hoy los usa el nginx de citypass; cuando se desinstale, quedan libres.

## 1. Clonar el repositorio en la máquina

Como `ubuntu`:

```bash
git clone https://github.com/carlos-illobre/ferre.git ~/ferre-repo
```

Es solo para tener los scripts de instalación; el despliegue no usa esta copia.

## 2. Verificar la máquina sin tocar nada

```bash
bash ~/ferre-repo/deployment/oracle-single/preflight.sh
```

Dice qué falta y cómo resolverlo. Repetilo después de cada paso hasta que quede en verde.

## 3. Instalar el gateway y el servicio de despliegue

```bash
bash ~/ferre-repo/deployment/oracle-single/maquina/instalar.sh
```

Crea `~/caddy-gateway/` (el Caddy compartido de la máquina, ver abajo), `~/ferre/bin/`
con los scripts, las carpetas `~/ferre/produccion` y `~/ferre/pruebas` con sus `.env` a
partir de las plantillas, `~/ferre/despliegue.env`, la red de Docker `caddy-gateway`, y
el servicio `ferre-despliegue` en systemd (instalado pero todavía apagado). Se puede
volver a correr: no pisa lo que ya está completado.

## 4. El dominio

Dos nombres que apunten a la IP pública de la máquina, con registros A:

| Nombre | Para |
|---|---|
| `api.<tu-dominio>` | API de producción |
| `api-pruebas.<tu-dominio>` | API de pruebas |

Sin dominio propio, un dominio dinámico gratuito (DuckDNS) sirve igual. Comprobar antes
de seguir, desde cualquier máquina:

```bash
dig +short api.<tu-dominio>
```

**Bien:** devuelve la IP de la máquina. Hasta que resuelva, Caddy no puede emitir el
certificado, y cada intento fallido consume uno de los pocos que Let's Encrypt permite
por hora.

## 5. Las dos bases en Supabase

1. En [supabase.com](https://supabase.com/), crear **dos proyectos** en la región
   **South America (São Paulo)**: `ferre-produccion` y `ferre-pruebas`.
2. En cada uno: **Connect** → **Session pooler**, copiar la cadena `postgres://...` y
   reemplazar `[YOUR-PASSWORD]`. **No usar la conexión directa:** es solo IPv6 y la
   máquina sale por IPv4.

## 6. Completar la configuración en la máquina

Cuatro archivos, reemplazando todos los marcadores `<...>`:

| Archivo | Qué va |
|---|---|
| `~/ferre/produccion/.env` | dominio de producción, ID de Google ([docs/google-cloud.md](../../docs/google-cloud.md)), cadena de Supabase de producción, un token de servicio |
| `~/ferre/pruebas/.env` | lo mismo para pruebas, con su dominio, su base y **otro** token |
| `~/ferre/despliegue.env` | el canal de avisos (paso 7) |
| `~/caddy-gateway/Caddyfile` | un correo, para los avisos de Let's Encrypt |

Token de servicio, uno por ambiente:

```bash
openssl rand -hex 32
```

`IMAGEN_TAG` se deja como está: lo escribe el despliegue.

**Bien:** el preflight ya no avisa de marcadores sin reemplazar.

## 7. El canal de avisos

Un nombre de canal de ntfy, aleatorio, que solo sirve para que GitHub le diga a la
máquina "fijate". No es un secreto: un aviso falso solo provoca una verificación contra
GitHub que no hace nada. Generar uno:

```bash
echo "ferre-despliegues-$(openssl rand -hex 6)"
```

Ese mismo nombre va en dos lugares:

- En la máquina: `NTFY_AVISOS=` de `~/ferre/despliegue.env`.
- En GitHub: **Settings → Secrets and variables → Actions → Variables** →
  `NTFY_AVISOS`. Si el ntfy fuera propio, también `NTFY_URL`.

Además, en las mismas Variables de GitHub: `API_URL` (`https://api.<tu-dominio>`),
`API_URL_PRUEBAS` (`https://api-pruebas.<tu-dominio>`) y `GOOGLE_CLIENT_ID`.

## 8. Levantar el gateway

Con el 80 y el 443 libres:

```bash
cd ~/caddy-gateway && docker compose up -d
```

**Bien:** `docker compose ps` lo muestra `Up`. Todavía no sirve ningún sitio: el
archivo de ferre lo escribe el primer despliegue.

## 9. Arrancar el servicio de despliegue

```bash
sudo systemctl start ferre-despliegue
journalctl -u ferre-despliegue -f
```

Al arrancar hace una verificación: consulta las ramas, baja las imágenes de pruebas y
de producción, levanta cada ambiente, comprueba que quede sano, escribe los dos sitios
en `~/caddy-gateway/sitios/ferre.caddy` y recarga Caddy. Después queda escuchando.

**Bien:** el journal termina en `pruebas corriendo <sha>`, `produccion corriendo <sha>`,
`caddy-gateway recargado` y `escuchando ...`. Desde afuera,
`curl https://api-pruebas.<tu-dominio>/health` devuelve `{"ok":true,...}` con el
candado en verde. Si un ambiente no queda sano, el journal muestra sus logs y vuelve a
la versión anterior si la había.

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

Cuando lo que está en pruebas convence:

```bash
git push origin master:produccion
```

CI construye, publica y avisa; la máquina despliega producción sola. La rama
`produccion` es un puntero a "lo que está vivo": no se trabaja sobre ella.

## 12. Volver atrás

Producción se vuelve al commit anterior con el mismo script, en la máquina, con el SHA
que el journal mostró como "antes":

```bash
~/ferre/bin/desplegar.sh produccion <sha-anterior>
```

O moviendo la rama al commit anterior (`git push --force origin <sha>:produccion`), que
además deja el repositorio contando la verdad. Lo que la reversión **no** revierte: los
datos. Si una versión migró el esquema, volver la imagen no vuelve la base.

## 13. Operación de todos los días

```bash
# qué corre y con qué versión (IMAGEN_TAG es el SHA)
cd ~/ferre/produccion && docker compose ps && grep IMAGEN_TAG .env

# el servicio de despliegue y su historial
systemctl status ferre-despliegue
journalctl -u ferre-despliegue --since today

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

## caddy-gateway: cómo sumar otro proyecto

`~/caddy-gateway` es la única puerta de entrada de la máquina, para ferre y para lo que
venga. El `Caddyfile` no se toca: importa todo lo que haya en `sitios/`.

1. El compose del proyecto nuevo se conecta a la red externa `caddy-gateway`
   (`networks: { caddy-gateway: { external: true } }` y el servicio en esa red).
2. Copiar `sitios/ejemplo-de-otro-proyecto.caddy.ejemplo` a `sitios/<proyecto>.caddy`,
   poner el dominio y el nombre del contenedor.
3. Recargar: `cd ~/caddy-gateway && docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile`.

Caddy emite el certificado solo para el dominio nuevo. Ferre no se entera.

## Qué se pierde si se pierde cada volumen

| Volumen | Qué guarda | Si se pierde |
|---|---|---|
| `caddy-gateway_caddy-data` | certificados y estado de Let's Encrypt de todos los proyectos | Caddy vuelve a emitir; solo duele si se agota el cupo de intentos |
| `ferre-<ambiente>_listas-data` | los Excel originales de cada lista cargada | no se pueden reprocesar listas viejas; los precios aplicados están en la base |

La base de datos no está en la máquina: está en Supabase, con el respaldo del ADR-002.

## Los límites del plan gratuito que importan

- Oracle puede apagar una instancia que considere ociosa. El monitor externo (issue #19)
  la mantiene con actividad y avisa si deja de responder.
- No hay garantía de servicio: si la máquina cae, el mostrador sigue vendiendo desde la
  PWA y el dueño pierde visibilidad hasta levantarla en otra (ADR-002).
