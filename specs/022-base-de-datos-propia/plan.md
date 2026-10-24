# Plan: La base de datos en el servidor propio, y una capa de datos aparte (022)

## Contexto técnico (cómo está hoy)

- **Base:** PostgreSQL en Supabase, por cadena de conexión (ADR-002). En desarrollo y en la CI,
  el servicio `db` del compose (`postgres:17-alpine`), solo con el perfil `local`. El monitor
  diario consulta las bases de Supabase desde GitHub.
- **Servicios con base:** `gestion-del-local` (el mostrador, en `microservices/api`) y
  `procesos` (en `microservices/procesos/servidor`), que usa la misma base en el esquema
  `procesos` (ADR-019).
- **Acceso a datos en el mostrador:** cada tema tiene su `datos.ts` (17 archivos, unas 1.250
  líneas). Conviven dos formas de consultar: Kysely, con tipos, y SQL a mano con `pg`; por eso
  hay dos funciones de transacción (`enTransaccion` y `enTransaccionPg`) y dos de registrar un
  evento (`registrarEvento` y `anotarEvento`). La forma de las tablas (`tablas.ts`) se escribe a
  mano, repitiendo los `CHECK` de las migraciones. Hay accesos fuera de esa capa:
  `duplicados/reglas.ts` usa el pool, `listas/reglas.ts` lee el disco, `crear-usuario.ts` escribe
  en la base, y la copia del catálogo (`productos/copia.ts`, ADR-023) guarda en el disco y escucha
  `pg_notify`.
- **Archivos:** guardar y leer las fotos de productos, de comprobantes y de tickets está escrito
  tres veces, sobre la carpeta de `CARPETA_LISTAS`.
- **Migraciones:** el mismo corredor propio copiado en el mostrador y en Procesos.
- **Pruebas:** las del servidor no tocan Postgres: una base simulada (`pruebas/base-falsa.ts`)
  reconoce el SQL por expresiones regulares. No hay meta de cobertura (ADR-004).
- **Ambiente en el código:** la web deduce si es pruebas mirando si la versión empieza con
  «produccion»; hay valores por omisión (`?? "local"`, `?? "/"`, `?? "desconocida"`); pruebas y
  producción comparten en el dispositivo el mismo nombre de base local.

## Decisiones (ADR-025 y ADR-026)

**Sin ORM; todo por Kysely (ADR-025).** Se compararon Prisma, Drizzle, TypeORM, MikroORM y
seguir solo con Kysely:

| Opción | A favor | En contra |
|---|---|---|
| Prisma | Esquema declarativo, cliente generado | Su esquema y su motor de migraciones compiten con las migraciones SQL; lo que no expresa (`DISTINCT ON`, sumas, triggers, `pg_notify`) vuelve a SQL a mano: dos formas otra vez; dependencia grande |
| Drizzle | Liviano, SQL visible | El esquema en TypeScript repite las migraciones; reescribir lo que ya está en Kysely sin ganar casi nada |
| TypeORM o MikroORM | Entidades y unidad de trabajo | Decoradores, carga perezosa, estado escondido; contrario a simple, para un dominio que solo agrega filas |
| **Kysely solo (elegida)** | Ya es la mitad del código (ADR-018); consultas con tipos sin esconder el SQL; lo específico de Postgres con su `sql` con parámetros; trae un migrador | Las tablas se siguen creando en SQL, que es lo que se quiere |

- Toda consulta pasa por la instancia de Kysely: el constructor cuando la consulta es simple, la
  plantilla `sql` cuando es propia de Postgres. Desaparecen el uso directo de `pg`,
  `enTransaccionPg` y `registrarEvento`.
- **Migraciones con el `Migrator` de Kysely** (decisión 151): un proveedor de unas diez líneas
  lee los `.sql` de la carpeta y Kysely pone el candado, la transacción y el registro. Lo mismo
  en Procesos, con su registro en su esquema.
- **Tipos generados:** `kysely-codegen` 0.20.0 escribe `tablas.ts` leyendo la base ya migrada.
  Para que las listas cerradas de valores (medio de pago, estado…) salgan como tipos sin
  escribirlas dos veces, una migración nueva las pasa de `CHECK` a tipos `ENUM` de Postgres:
  quedan una sola vez, en la base. Una prueba falla si `tablas.ts` no coincide con lo que
  generan las migraciones.

**Una instancia por ambiente, una base por servicio (ADR-026).** El contenedor de la base es una
pieza más, en `microservices/base-de-datos/` (imagen propia sobre `postgres:17-alpine`, publicada
como las demás), con un script de arranque que crea las bases `mostrador` y `procesos` y un
usuario por base con `CONNECT` solo a la suya. Las bases arrancan vacías (decisión 151).

## Estructura

```text
microservices/
  base-de-datos/        Dockerfile e inicio: bases y usuarios
  api/src/persistencia/ la capa de datos del mostrador
  procesos/servidor/src/persistencia/
```

En cada servicio, `src/persistencia/` es la única carpeta que importa `kysely`, `pg` o
`node:fs`:

```text
src/persistencia/
  conexion.ts       la instancia de Kysely desde DATABASE_URL; si la base responde
  transaccion.ts    enTransaccion y Deshacer, la única forma de abrir una transacción
  migrar.ts         el Migrator de Kysely con el proveedor de .sql
  migraciones/      los .sql de siempre, movidos sin cambiar su contenido
  tablas.ts         generado; no se edita
  archivos.ts       guardar y leer un archivo por carpeta y nombre
  eventos.ts        anotar un evento
  <tema>.ts         lo que era <tema>/datos.ts
  *.test.ts         contra Postgres
```

- Las reglas y las rutas solo cambian de dónde importan (decisión 151). Lo que hoy hacen con la
  base o el disco por su cuenta (`duplicados/reglas.ts`, `listas/reglas.ts`, `crear-usuario.ts`,
  la parte de disco y escucha de `productos/copia.ts`) pasa a funciones de la persistencia que
  hacen exactamente lo mismo.
- `pnpm capas` (dependency-cruiser) prohíbe importar `kysely`, `pg` o `node:fs` fuera de
  `persistencia/`, y que la persistencia importe reglas o rutas.
- Las pruebas de rutas siguen con la base simulada (se reordenan más adelante): solo cambia la
  ruta del `vi.mock`, que pasa a `persistencia/conexion.js`.

## Pruebas y cobertura

- Las pruebas de `src/persistencia/**` corren contra un PostgreSQL 17 real. Antes de correr,
  `vitest` (configuración global) crea una base vacía con nombre al azar usando la cadena de
  `BASE_DE_PRUEBAS` (un usuario que puede crear bases), la migra con `migrar.ts` y la borra al
  terminar. Sin `BASE_DE_PRUEBAS` las pruebas de persistencia fallan diciendo qué falta.
- `@vitest/coverage-v8` 2.1.9 con umbral del 100 % de líneas, ramas, funciones y sentencias
  sobre `src/persistencia/**`; `tablas.ts` solo tiene tipos.
- `tests/utest.sh` levanta el contenedor de la base del compose si no está y pasa
  `BASE_DE_PRUEBAS`. En la CI, PostgreSQL 17 como servicio del job de unitarias.

## Ambientes: todo en el .env

- `AMBIENTE` (`desarrollo`, `pruebas`, `produccion`) en el `.env`, y `VITE_AMBIENTE` al construir
  la web: decide la barra de «Ambiente de prueba» y el nombre de la base local del dispositivo
  (`ferre-<ambiente>`).
- Sin valores por omisión en el servidor ni en la web: `VERSION`, `VITE_VERSION` y `VITE_BASE`
  pasan a obligatorias.
- Variables nuevas: `CLAVE_BASE_ADMIN`, `CLAVE_BASE_MOSTRADOR`, `CLAVE_BASE_PROCESOS` y
  `PUERTO_BASE`. El compose arma `DATABASE_URL` de cada servicio con su clave
  (`postgres://mostrador:${CLAVE_BASE_MOSTRADOR}@db:5432/mostrador`): la clave se escribe una vez.
  Sale `DATABASE_URL` del `.env`.
- `db` deja el perfil `local` y corre en todos los ambientes, publicado solo en
  `127.0.0.1:${PUERTO_BASE}`.

## La marca de otra base (E23)

- El servidor: la copia del catálogo ya guarda de qué base es (servidor, puerto y nombre); con
  la base nueva la dirección cambia y la copia guardada no se usa.
- Los dispositivos: la marca que da el servidor pasa a llevar el identificador de la base
  (`system_identifier` de Postgres). Una marca de otra base se trata como si no hubiera marca.

## Monitor

La base ya no se alcanza desde GitHub: el monitor deja de consultarla. La salud del servidor
vuelve a decir si la base responde (ADR-023 la había sacado para no gastar el plan de
Supabase); el tope de 350 MB se va con el plan gratuito.

## Seguridad

- **Datos que toca:** todos los del negocio, porque cambia dónde viven. No agrega datos nuevos.
  Lo que había en Supabase eran datos de prueba y no se muda.
- **Permisos:** no cambia quién puede qué en la aplicación. En la base, cada servicio tiene su
  usuario, que solo puede abrir su base; el administrador de la instancia solo lo usa el script
  de arranque y las pruebas.
- **Lo que entra de afuera:** nada nuevo. La base se publica solo en la interfaz local de la
  máquina (`127.0.0.1`), nunca a internet (ADR-013).
- **Secretos:** las tres claves de la base van en el `.env` de cada ambiente, que no se sube.
  Las cadenas de Supabase se borran del `.env` y de los secretos del repositorio.
- **Quién hizo qué:** no cambia; los eventos se siguen anotando igual.
- **Riesgo aceptado:** sin copias, perder el disco de la máquina pierde la base, hasta la
  etapa 2. No hay datos reales (decisión 151).

## Lo que cambia en la documentación

- ADR-025 y ADR-026; enmiendas a ADR-002 (la base sale de Supabase), ADR-004 (100 % en la capa
  de datos), ADR-018 (carpeta `persistencia/`), ADR-019 (Procesos en su base) y ADR-023 (la
  salud vuelve a consultar la base).
- Constitución: «Datos» (cada servicio es dueño de su base) y principio VI (100 % en la capa
  de datos).
- `docs/operacion/` (DEPLOYMENT, ORACLE), `001-base-del-sistema` (data-model, quickstart).
