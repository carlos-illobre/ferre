# Sesiones de Claude Code en la nube

Las sesiones que programan `ferre` pueden correr en la nube de Anthropic (claude.ai/code,
o **Cloud** en la app de escritorio) en vez de en el servidor. La aplicación sigue en el
servidor: la sesión clona el repositorio, trabaja, sube a `master`, y el cambio llega al
ambiente de pruebas por el camino de siempre (CI, imágenes, aviso por ntfy).

Una sesión en la nube no ve el servidor: ni sus contenedores, ni sus registros, ni lo que
se publica por Tailscale. Para eso hace falta una sesión en el servidor.

No trabajen a la vez una sesión en la nube y una en el servidor: las dos suben a `master`.

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

El mismo script arranca Docker, que viene instalado pero apagado: las pruebas de punta a
punta levantan el stack con Docker Compose, igual que en el CI. Si Docker no arranca, la
sesión lo avisa; no se reemplaza por servicios levantados a mano.

## Las skills de animación

Las skills de animación (`animate`, `animation-performance`, `review-animations`,
`find-animation-opportunities`, `improve-animations`) están copiadas en `.claude/skills/`
porque la nube no tiene las globales del servidor. Son una versión adaptada: ninguna
animación corre en el hilo principal. El detalle está en el `ADAPTATION.md` de cada una;
no se actualizan reinstalando el paquete original.
