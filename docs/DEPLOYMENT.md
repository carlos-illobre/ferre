# Despliegue

## Desarrollo local

```bash
cp .env.example .env
docker network create caddy-gateway
docker compose up -d --build --wait
```

Los perfiles (base local, Caddy) vienen de `COMPOSE_PROFILES` en el `.env`; no hace
falta pasarlos por línea de comandos.

El perfil `local` levanta un PostgreSQL en el compose; `DATABASE_URL` del `.env.example`
ya apunta ahí. La API queda en http://localhost vía Caddy. El cliente web se sirve
aparte, como en producción (ADR-010):

```bash
VITE_API_URL=http://localhost pnpm --filter gestion-del-local-web dev
```

`ORIGEN_WEB` del `.env` tiene que coincidir con el origen desde el que se abre el
cliente (`http://localhost:4173` para `vite preview`; `http://localhost:5173` para `dev`).

## Pruebas y producción: una máquina en Oracle Cloud

Guía completa en [deployment/oracle-single/ORACLE.md](../deployment/oracle-single/ORACLE.md).

- `master` es pruebas, `produccion` es producción ([ADR-012](adr/ADR-012-ambientes-de-prueba-y-produccion.md)).
  En cada push CI construye, publica y avisa; la máquina despliega sola su ambiente
  ([ADR-013](adr/ADR-013-despliegue-por-aviso-y-gateway-compartido.md)). Pasar a
  producción: `git push origin master:produccion`.
- Máquina Always Free (Ampere, arm64), sin estado: dos proyectos de compose, uno por
  ambiente, con `gestion-del-local` y `listas-de-proveedores`, detrás del Caddy
  compartido `~/caddy-gateway`, que sirve a todos los proyectos de la máquina.
- Base de datos en Supabase ([ADR-002](adr/ADR-002-base-de-datos-respaldo-y-disponibilidad.md)).
- Imágenes publicadas por CI en GHCR, etiquetadas por SHA corto
  ([ADR-007](adr/ADR-007-imagenes-en-ci-y-ghcr.md)).
- Configuración de la aplicación en la máquina: `~/ferre/produccion/.env` y
  `~/ferre/pruebas/.env`, a partir de las plantillas `deployment/oracle-single/<ambiente>/.env.oracle`.
  Nunca se versionan.
- **Cliente web en GitHub Pages:** un sitio, dos carpetas: la raíz es `produccion` y
  `/pruebas/` es `master`. CI lo construye con las variables de repositorio `API_URL`,
  `API_URL_PRUEBAS` y `GOOGLE_CLIENT_ID`. Es lo único que vive fuera del `.env`.
- **Sin acceso entrante:** GitHub no entra a la máquina. El job `avisar` publica en el
  canal `NTFY_AVISOS` y el servicio `ferre-despliegue` de la máquina hace el resto.
- TLS: Caddy emite y renueva solo ([ADR-006](adr/ADR-006-caddy.md)). Puertos 80 y 443
  abiertos en la Security List de la VCN, que es el firewall efectivo.

El script de despliegue, el preflight y la guía paso a paso se generan en el issue #19.

## Primer usuario

El login es con Google ([docs/google-cloud.md](google-cloud.md)). El primer dueño se
crea desde el contenedor; los siguientes usuarios, desde la app:

```bash
docker compose exec gestion-del-local node dist/crear-usuario.js correo@gmail.com "Nombre" dueño
```

## Respaldo y recuperación

- Volcado horario de la base a Oracle Object Storage, retención 30 días.
- Copia semanal cifrada fuera de Oracle y de Supabase.
- Prueba mensual automática de restauración.
- Ante pérdida de la máquina: crear otra, copiar el `.env`, `docker compose pull && up`.
  Objetivo: menos de 30 minutos. El mostrador sigue vendiendo desde la PWA mientras tanto.

## Reversión

En la máquina:

```bash
~/ferre/bin/desplegar.sh produccion <sha-anterior>
```

O moviendo la rama `produccion` al commit anterior, que además deja el repositorio
contando la verdad.
