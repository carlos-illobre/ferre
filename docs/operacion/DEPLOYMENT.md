# Despliegue

## Desarrollo local

```bash
cp .env.example .env
docker compose up -d --build --wait
```

El perfil de Caddy viene de `COMPOSE_PROFILES` en el `.env`; no hace falta pasarlo por línea de
comandos. La base (`db`) corre en todos los ambientes, con una base y un usuario por servicio
([ADR-026](../adr/ADR-026-una-base-por-servicio-en-la-maquina.md)); el compose arma la cadena de
cada servicio con las claves del `.env`. La API queda en http://localhost vía Caddy. El cliente
web se sirve aparte, como en producción (ADR-010), con las variables de su ambiente, sin valores
por omisión:

```bash
VITE_API_URL=http://localhost VITE_AMBIENTE=desarrollo VITE_VERSION=local pnpm --filter gestion-del-local-web dev
```

Un volumen de datos de antes de la base propia (con el usuario `ferre`) no sirve: se borra con
`docker compose down -v` y la base arranca vacía.

`ORIGEN_WEB` del `.env` tiene que coincidir con el origen desde el que se abre el
cliente (`http://localhost:4173` para `vite preview`; `http://localhost:5173` para `dev`).

## Pruebas y producción: una máquina en Oracle Cloud

Guía completa en [deployment/oracle-single/ORACLE.md](../../deployment/oracle-single/ORACLE.md).

- `master` es pruebas, `produccion` es producción ([ADR-012](../adr/ADR-012-ambientes-de-prueba-y-produccion.md)).
  En cada push CI construye, publica y avisa; la máquina despliega sola su ambiente
  ([ADR-013](../adr/ADR-013-despliegue-por-aviso-y-gateway-compartido.md)). Pasar a
  producción: `git push origin master:produccion`.
- Máquina Always Free (Ampere, arm64): dos proyectos de compose, uno por ambiente, con `db`,
  `gestion-del-local`, `listas-de-proveedores` y `procesos`. Cada ambiente corre con su propio
  usuario y su propio Docker rootless (`ferre-produccion` y `ferre-pruebas`, decisión 161), para
  que un error en uno no pueda tocar el otro. Publicados solo en `127.0.0.1` (8081 y 8082), detrás del
  reverse proxy de la máquina, que no es parte de este proyecto (contrato en la guía).
- Base de datos: el contenedor `db` de cada ambiente, con sus datos en un volumen y publicado
  solo en `127.0.0.1` (5433 producción, 5434 pruebas)
  ([ADR-026](../adr/ADR-026-una-base-por-servicio-en-la-maquina.md)). Supabase ya no se usa.
- **Las claves de la base** (`CLAVE_BASE_ADMIN`, `CLAVE_BASE_MOSTRADOR`, `CLAVE_BASE_PROCESOS`) se
  leen una sola vez: cuando `db` arranca con el volumen vacío y crea las bases y sus usuarios.
  Cambiar después una clave en el `.env` no cambia la del usuario, y el servicio deja de
  conectarse. Para cambiar una clave, o reponerlas todas, ver «Si se pierde el `.env`».
- Desde afuera del contenedor, la base pide clave siempre; adentro, por el socket, el
  administrador entra sin clave (lo usa el control de salud del contenedor).
- **Logs:** los de cada contenedor no pasan de 10 MB (dos archivos de 5 MB que rotan), porque el
  disco es uno solo para los dos ambientes. Pruebas y producción no tienen topes de memoria ni
  de procesador: se usan en horarios distintos (decisión 161).
- Imágenes publicadas por CI en GHCR, etiquetadas por SHA corto
  ([ADR-007](../adr/ADR-007-imagenes-en-ci-y-ghcr.md)).
- Configuración de la aplicación en la máquina: `~/ferre/produccion/.env` y
  `~/ferre/pruebas/.env`, a partir de las plantillas `deployment/oracle-single/<ambiente>/.env.oracle`.
  Nunca se versionan.
- **Cliente web en GitHub Pages:** un sitio, dos carpetas: la raíz es `produccion` y
  `/pruebas/` es `master`. CI lo construye con las variables de repositorio `API_URL` y
  `API_URL_PRUEBAS`, y el ambiente (`VITE_AMBIENTE`) y la versión de cada build. Es lo único que
  vive fuera del `.env`: depende de GitHub Pages, que construye la web, y no de la máquina
  (decisión 162). El identificador de Google no va:
  la aplicación se lo pide al servidor de su ambiente (007-T043).
  Cada carpeta tiene una sola aplicación, que abre en su raíz.
- **Sin acceso entrante:** GitHub no entra a la máquina. El job `avisar` publica en el
  canal `NTFY_AVISOS` y el servicio `ferre-despliegue` de la máquina hace el resto.
- TLS: Caddy emite y renueva solo ([ADR-006](../adr/ADR-006-caddy.md)). Puertos 80 y 443
  abiertos en la Security List de la VCN, que es el firewall efectivo.

El script de despliegue, el preflight y la guía paso a paso se generan en el issue #19.

## Al pasar a la base propia (specs/022)

Con la versión que trae la base propia, cada dispositivo guarda lo suyo aparte por ambiente
(RNF-67). Al recibirla, cada computadora y cada celular **pierden la sesión** (hay que volver a
entrar), bajan el catálogo de nuevo y dejan de ver lo que tenían guardado antes, incluida una
cola de ventas sin enviar: conviene que no quede ninguna pendiente antes de actualizar. El
vínculo entre celular y computadora se hace de nuevo. Pasa una sola vez.

## Si se pierde el `.env`, o hay que cambiar una clave de la base

Los datos no se pierden: están en el volumen del ambiente, no dependen de las claves. Sin las
claves, los servicios no pueden conectarse a la base hasta que se les pongan otras. Adentro
del contenedor `db`, el administrador entra sin clave por el socket, así que las claves se
reponen desde la máquina, en la carpeta del ambiente:

1. Rehacer el `.env` desde su plantilla (`deployment/oracle-single/<ambiente>/.env.oracle`), con
   claves nuevas en las tres `CLAVE_BASE_*` (`openssl rand -hex 24`). Para cambiar una sola,
   alcanza con cambiarla en el `.env`.
2. Ponerle a cada usuario de la base la clave que dice el `.env`:

   ```bash
   cd ~/ferre/<ambiente>
   for par in mostrador:CLAVE_BASE_MOSTRADOR procesos:CLAVE_BASE_PROCESOS postgres:CLAVE_BASE_ADMIN; do
     rol=${par%%:*}; clave=$(grep "^${par#*:}=" .env | cut -d= -f2-)
     echo "ALTER ROLE $rol PASSWORD :'clave';" | docker compose exec -T db psql -U postgres -q -v clave="$clave"
   done
   ```

3. Reiniciar los servicios para que tomen las claves: `docker compose up -d --force-recreate`.
4. Comprobar que la salud diga `"db":"ok"`: `curl -s http://127.0.0.1:<PUERTO_API>/health`.

Lo que sí pierde los datos es perder el disco de la máquina o borrar el volumen
(`docker compose down -v`): hasta la etapa 2 no hay copias (ver «Respaldo y recuperación»).

## Primer usuario

El login es con Google ([docs/operacion/google-cloud.md](google-cloud.md)). El primer dueño se
crea desde el contenedor; los siguientes usuarios, desde la app:

```bash
docker compose exec gestion-del-local node dist/crear-usuario.js correo@gmail.com "Nombre"
```

## Monitor

Una tarea programada en GitHub (`.github/workflows/monitor.yml`, RNF-12, T091) mira los dos
ambientes una vez por día, a las 08:47 de Buenos Aires: que el servidor conteste en `/health` y
diga que anda, lo que incluye que su base responda (specs/022, E05). Si algo falla, la tarea queda
en rojo y GitHub manda un correo. También se corre a mano: Actions → Monitor → «Run workflow».
La base vive en la máquina y no se alcanza desde internet: el monitor no la consulta directo.

**Lo que tiene que hacer Carlos una sola vez:**

1. **Que el correo le llegue a él.** GitHub avisa de una tarea programada que falla a quien
   cambió por última vez su horario. En GitHub, editar `.github/workflows/monitor.yml` y mover un
   minuto el horario (`47 11` → `46 11`), con el botón «Commit changes». Y en Settings →
   Notifications → System → Actions, que esté «Email».
2. **Probarlo.** Actions → Monitor → «Run workflow»: los dos ambientes en verde.

## Respaldo y recuperación

**Todavía no hay copias de la base** (etapa 1 del almacenamiento, decisión 150): si se pierde el
disco de la máquina, se pierde la base. Llegan por etapas (`proyecto/tasks.md`, «Almacenamiento de
datos»): la copia por noche fuera de Oracle en la etapa 2; la copia continua, la prueba de
restauración y los avisos en la etapa 4; la copia semanal en otro proveedor en la etapa 5.

Ante pérdida de la máquina: crear otra, copiar el `.env`, `docker compose pull && up`. La base
arranca vacía hasta que haya copias. El mostrador sigue vendiendo desde la PWA mientras tanto.

## Reversión

En la máquina:

```bash
~/ferre/bin/desplegar.sh produccion <sha-anterior>
```

O moviendo la rama `produccion` al commit anterior, que además deja el repositorio
contando la verdad.
