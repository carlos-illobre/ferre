# ADR-008: pnpm para TypeScript y uv para Python

**Estado:** Aceptado
**Fecha:** 2026-09-13

---

## Contexto

El servicio `mostrador` tiene tres paquetes (API, PWA y `precios` compartido) que deben
resolverse entre sí. El servicio `importador` es Python.

## Opciones consideradas

### 1. npm y pip con requirements.txt
Vienen con el runtime. npm soporta workspaces pero es más lento y ocupa más disco; pip
no genera un lockfile reproducible sin herramientas extra.

### 2. pnpm y uv (elegida)
pnpm resuelve el workspace con enlaces y un solo almacén de dependencias. uv genera un
`uv.lock` reproducible y resuelve en segundos.

## Decisión

pnpm 10 fijado con `packageManager` en cada `package.json`; uv con `uv.lock` versionado.
Los Dockerfiles instalan con `--frozen-lockfile` y `--frozen`.

## Consecuencias

### Positivas
- Instalaciones reproducibles en CI, en la máquina de Oracle y en la laptop de desarrollo.

### Negativas
- Dos herramientas más que conocer. Ambas de un solo binario.

### Lo que no cambia
Nada: es la primera decisión sobre tooling.

## Cuándo revisar esta decisión

- Si alguna deja de mantenerse o el lockfile genera fricción en CI.

## Referencias

ADR-001.
