# Sesiones de Claude Code en la nube

Las sesiones que programan `ferre` pueden correr en la nube de Anthropic (claude.ai/code,
o **Cloud** en la app de escritorio) en vez de en el servidor. La aplicación sigue en el
servidor: la sesión clona el repositorio, trabaja, sube a `master`, y el cambio llega al
ambiente de pruebas por el camino de siempre (CI, imágenes, aviso por ntfy).

Una sesión en la nube no ve el servidor: ni sus contenedores, ni sus registros, ni lo que
se publica por Tailscale. Para eso hace falta una sesión en el servidor.

No trabajen a la vez una sesión en la nube y una en el servidor: las dos suben a `master`.

## Dominios que no están en la lista

**Si hace falta un sitio de internet que no está permitido, se le pide permiso a Carlos.**
Vale para cualquier acceso: leer una página o documentación, buscar en la web, bajar un
paquete, una imagen o un archivo, o conectarse a un servicio, con la herramienta que sea
(búsqueda o lectura web, `curl`, `pnpm`, `uv`, `docker`, el navegador de las pruebas). Se
nota porque falla con un error de red (`ENOTFOUND`, «403» o «blocked» del proxy, «host not
allowed», conexión rechazada). Entonces el agente:

1. Frena esa parte del trabajo y no reintenta.
2. Le dice a Carlos, en un mensaje aparte y antes de seguir: el dominio exacto
   (`ejemplo.com`), la dirección que quería abrir, para qué lo necesita, qué hace mientras
   tanto y qué alternativa hay sin ese sitio.
3. Espera su respuesta. Carlos decide si lo agrega a los dominios permitidos del entorno;
   el agente no lo da por permitido ni lo pide dos veces si dijo que no.

Mientras tanto no se busca otro camino para llegar igual (otro espejo, otro servicio, una
copia en caché, bajarlo por otro lado ni copiarlo al repositorio). Si Carlos lo agrega, se
anota en la lista de dominios del entorno (`docs/operacion/sesiones-en-la-nube.md`, «El
entorno `ferre`») con para qué hace falta.

La lista vigente es la de la sección siguiente; cuando Carlos agrega uno, se anota ahí.

## El entorno `ferre`

Se crea una vez, con **Add cloud environment**.

- **Acceso a internet:** personalizado: la lista por defecto (npm, PyPI, GitHub, Docker Hub)
  más `cdn.playwright.dev`, de donde Playwright baja el navegador de las pruebas, y sus dos
  espejos, `playwright.download.prss.microsoft.com` y `playwright.azureedge.net`. Con solo
  Trusted, el script de preparación falla con `ENOTFOUND cdn.playwright.dev`.
  También `ghcr.io` y `pkg-containers.githubusercontent.com`: la imagen de
  `listas-de-proveedores` parte de `ghcr.io/astral-sh/uv`, y sin esos dos no se construye.
- **Variables de entorno:** ninguna. Las pruebas de punta a punta levantan su propia base
  con Docker, dentro de la máquina.
- **Script de preparación:** prepara la máquina, no el proyecto. Corre antes de que exista
  el clon, así que no puede leer el repositorio; por eso fija las versiones a mano.

```bash
#!/bin/bash
set -e
npm install -g pnpm@10.15.0
npx -y playwright@1.63.0 install --with-deps chromium
```

Las dos versiones tienen que coincidir con el repositorio: pnpm con `packageManager` de
`package.json`, Playwright con el de `pnpm-lock.yaml`. Si se actualiza alguna, se cambia
acá y en el entorno.

## Las dependencias del proyecto

Las instala `.claude/scripts/preparar-nube.sh` al empezar cada sesión (un hook
`SessionStart` de `.claude/settings.json`): `pnpm install` y `uv sync`. Fuera de la nube no
hace nada.

**El hook a veces no se dispara** (pasó el 2026-10-15: la sesión arrancó sin dependencias y
con Docker apagado). Por eso el agente lo comprueba antes de la primera prueba: si
`docker info` falla o no existe `node_modules/`, corre `bash .claude/scripts/preparar-nube.sh`
a mano y sigue solo cuando dice «Docker listo.».

El mismo script arranca Docker, que viene instalado pero apagado: las pruebas de punta a
punta levantan el stack con Docker Compose, igual que en el CI. Si Docker no arranca, la
sesión lo avisa; no se reemplaza por servicios levantados a mano.

Después entra a Docker Hub con `DOCKERHUB_USUARIO` y `DOCKERHUB_TOKEN`, dos variables del
entorno que cargó Carlos (un token de acceso de solo lectura, «Public Repo Read-only»). Sin
cuenta, Docker Hub limita las descargas por dirección, y las máquinas de la nube comparten la
salida: las imágenes base (`node`, `python`, `postgres`, `caddy`) fallan con «429 Too Many
Requests». Si las variables no están, la sesión lo avisa y sigue; el token nunca se escribe
en el repositorio ni en la conversación. Las variables nuevas del entorno las ve recién la
sesión siguiente.

## Las skills de animación

Las skills de animación (`animate`, `animation-performance`, `review-animations`,
`find-animation-opportunities`, `improve-animations`) están copiadas en `.claude/skills/`
porque la nube no tiene las globales del servidor. Son una versión adaptada: ninguna
animación corre en el hilo principal. El detalle está en el `ADAPTATION.md` de cada una;
no se actualizan reinstalando el paquete original.

## Construir imágenes en la nube

La máquina de la nube sale a internet por un proxy de Anthropic que inspecciona el
tráfico cifrado. La máquina confía en el certificado de ese proxy, pero un contenedor que se
está construyendo no: por eso `pnpm install` falla dentro de `docker build`.

Para las pruebas de punta a punta, las imágenes se construyen con una **copia temporal** de
cada Dockerfile que agrega ese certificado, con el nombre que espera `docker-compose.yml`:

- La copia va en una carpeta temporal fuera del repositorio, o en una carpeta ignorada por
  git. **Nunca se commitea**, ni el certificado ni el Dockerfile modificado.
- Esas imágenes sirven solo para probar en esa sesión. Las que llegan a producción las
  construye el CI, que no pasa por el proxy, con los Dockerfiles del repositorio.
- Las imágenes que publica el CI no sirven en la nube: son para ARM (el servidor) y la
  máquina de la nube es x86.

Lo hace `.claude/scripts/imagenes-nube.sh`: copia los tres Dockerfiles a una carpeta temporal
con el certificado agregado en la etapa que baja dependencias, crea el `.env` desde
`.env.example` si no hay, y construye con `docker compose build`. Al terminar borra las
copias. Si un Dockerfile cambia su primer `FROM`, el script avisa y hay que actualizarlo.

## Antes de subir: las pruebas de punta a punta

Un cambio de código no se sube sin correr las e2e en Docker, también desde la nube:

```bash
bash .claude/scripts/preparar-nube.sh   # solo si no corrió al empezar
.claude/scripts/imagenes-nube.sh        # cada vez que cambia el código de un servicio
tests/e2e.sh                            # computadora y celular; tarda unos seis minutos
```

El resultado se le dice a Carlos tal cual: cuántas pasaron y cuáles fallaron. Una que falla
se repite sola (`tests/e2e.sh --solo "<nombre>"`) para ver si es del cambio; si es del
cambio, se arregla antes de subir. Un cambio que solo toca documentación no las necesita.

