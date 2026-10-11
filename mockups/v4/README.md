# Ferrebress · maqueta navegable v4

Maqueta de la interfaz (estilo de Figma), con datos de mentira en memoria y sin servidor.
Vite + React + TypeScript, independiente del resto del repo (no es parte del workspace pnpm).

- Instalar: `corepack pnpm install --ignore-workspace`
- Levantar: `corepack pnpm run dev` → http://127.0.0.1:5301/ (cada pantalla: `#/vender`, `#/productos`, …)
- Revisar tipos y construir: `corepack pnpm run build`
- Publicar: `./publicar.sh` (construye y copia a `clientes/gestion-del-local-web/public/v4/`)
- Capturar: `python capturar.py vender --estado sin-precio` (ver `python capturar.py -h`)

Para trabajar en una pantalla, leé `GUIA.md`.
