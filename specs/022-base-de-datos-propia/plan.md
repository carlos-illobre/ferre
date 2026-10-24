# Plan: La base de datos en el servidor propio, y una capa de datos aparte (022)

**Estado**: borrador. Se termina cuando Carlos conteste las tres preguntas de la `spec.md`; lo
que depende de cada respuesta está marcado.

## Contexto técnico (cómo está hoy)

- **Base:** PostgreSQL en Supabase, por cadena de conexión (ADR-002). En desarrollo y en la CI,
  el servicio `db` del compose (`postgres:17-alpine`), solo con el perfil `local`.
- **Servicios con base:** `gestion-del-local` (el mostrador) y `procesos`, que usa la misma base
  en el esquema `procesos` (ADR-019). `listas-de-proveedores` no tiene base.
- **Acceso a datos en el mostrador:** cada tema tiene su `datos.ts` (17 archivos, unas 1.250
  líneas). Hay accesos fuera de esa capa: `duplicados/reglas.ts` usa el pool, `listas/reglas.ts`
  lee el disco y la copia del catálogo en el servidor (`productos/copia.ts`, ADR-023) guarda en
  el disco y escucha `pg_notify`; todo eso pasa a la capa de datos. Conviven dos formas de consultar: Kysely, con tipos (ventas, clientes, catálogo,
  apartados, tickets…), y SQL a mano con `pg` (listas, duplicados, compras, pedidos,
  administración, parte de acceso y de conteos). Por eso hay dos funciones de transacción
  (`enTransaccion` y `enTransaccionPg`) y la forma de las tablas (`tablas.ts`) se escribe a
  mano, aparte de las migraciones.
- **Archivos:** las fotos de productos, de comprobantes y de tickets se guardan con el mismo
  código repetido tres veces (crear la carpeta, escribir, leer), en el volumen de las listas.
- **Migraciones:** el mismo corredor copiado en el mostrador y en Procesos (cambian el candado
  y el nombre de la tabla de registro).
- **Pruebas:** las del servidor no tocan Postgres: una base simulada reconoce el SQL por
  expresiones regulares. Procesos tiene un segundo almacén en memoria que repite las reglas de
  unicidad de la base. Ninguna de las dos prueba la base de verdad. No hay meta de cobertura
  (ADR-004).
- **Ambiente en el código:** la web deduce si es pruebas mirando si la versión empieza con
  «produccion»; hay valores por omisión (`?? "local"`, `?? "/"`, `?? "desconocida"`); pruebas y
  producción comparten en el dispositivo la misma base local y las mismas claves.

## ¿ORM o no?

| Opción | A favor | En contra |
|---|---|---|
| **Prisma** | Esquema declarativo, cliente generado, migraciones propias | Su propio lenguaje de esquema y su motor de migraciones compiten con las migraciones SQL que ya hay; lo que no sabe expresar (`DISTINCT ON`, sumas de movimientos, triggers de la etapa 5) vuelve a SQL a mano, o sea dos formas otra vez; una dependencia grande |
| **Drizzle** | Liviano, tipos desde un esquema en TypeScript, SQL visible | El esquema en TypeScript repite lo que dicen las migraciones, o pasa a generarlas él; reescribir lo que hoy está en Kysely sin ganar casi nada |
| **TypeORM o MikroORM** | Entidades con relaciones y unidad de trabajo | Clases con decoradores, carga perezosa, estado escondido: lo contrario de simple, para un dominio que solo agrega filas |
| **Solo Kysely (elegida)** | Ya es la mitad del código y la eligió ADR-018; arma consultas con tipos sin esconder el SQL; lo específico de Postgres entra con su `sql` con parámetros, sin salir de la herramienta | No crea las tablas: las migraciones siguen en SQL, que es lo que se quiere |

**Recomendación: no usar un ORM.** El dominio es de documentos y movimientos que solo suman
filas, con totales y sumas por fecha: un ORM está pensado para objetos con relaciones que se
cargan y se modifican, y acá estorba. La simpleza se logra al revés: **una sola herramienta**.

- Todo el acceso pasa a Kysely; desaparece el SQL a mano con `pg` y con él la segunda función
  de transacción.
- La forma de las tablas **se genera de la base** (`kysely-codegen`) después de migrar, en vez
  de escribirse a mano: se escribe una vez, en la migración. Una prueba falla si el archivo
  generado no coincide con lo que dejan las migraciones.
- Procesos también pasa a Kysely, y su almacén en memoria desaparece: sus reglas se prueban
  con un doble simple y su capa de datos contra Postgres.

Va como ADR nuevo (ADR-025), con este cuadro.

## Estructura: la capa de datos

En cada servicio con base, una carpeta `src/persistencia/`, la única que importa `kysely`,
`pg` o `node:fs`:

```text
src/persistencia/
  conexion.ts        la base, desde DATABASE_URL; responde si la base contesta
  transaccion.ts     la única forma de abrir una transacción
  migrar.ts          aplica migraciones/ en orden, una sola vez, con candado
  migraciones/       los .sql (se mueven sin cambiar su contenido)
  tablas.ts          generado de la base: no se edita
  archivos.ts        guardar y leer un archivo, para fotos, comprobantes y listas
  <tema>.ts          lo que hoy es <tema>/datos.ts: ventas, clientes, compras…
  *.test.ts          una prueba por archivo, contra Postgres
```

- Las rutas llaman a las reglas; las reglas llaman a la persistencia; la persistencia no
  importa reglas ni rutas. Lo controla `pnpm capas` (dependency-cruiser): fuera de
  `persistencia/` no se puede importar `kysely`, `pg` ni `node:fs`.
- Las pruebas de reglas y rutas reemplazan el módulo de persistencia con `vi.mock`; la base
  simulada que reconoce SQL por su texto se borra.
- **El corredor de migraciones** depende de la pregunta de la spec: (a) biblioteca interna
  compartida, (b) el `Migrator` de Kysely con un proveedor que lee los `.sql`, que deja en cada
  servicio unas diez líneas, o (c) la copia actual. La recomendación es la (b): Kysely ya pone el
  candado, la transacción y el registro, y no hace falta una biblioteca propia compartida. La
  tabla de registro cambia de nombre; la mudanza de la base la completa con lo ya aplicado.

## Pruebas y cobertura

- `@vitest/coverage-v8` con umbral del 100 % de líneas, ramas y funciones sobre
  `src/persistencia/**` (sin contar `tablas.ts`, que es generado y solo tiene tipos). El umbral
  corta la subida.
- Las pruebas de la capa de datos corren contra el `postgres:17-alpine` del compose: misma
  versión que producción, base vacía al empezar, migraciones aplicadas por `migrar.ts`. La
  cadena de conexión sale de `DATABASE_URL` como en cualquier ambiente. En la CI, el mismo
  contenedor como servicio del workflow. Cambia que las unitarias del servidor necesitan una
  base levantada (hoy corren sin nada); `tests/utest.sh` la levanta si no está.
- Si la respuesta a la pregunta de la cobertura es «todo el código», el umbral se extiende al
  resto del código en una etapa propia.

## Ambientes: todo en el .env

- Variable nueva `AMBIENTE` (`desarrollo`, `pruebas`, `produccion`) en el `.env`, y para la web
  `VITE_AMBIENTE` al construir: decide la barra de «Ambiente de prueba» y el nombre de lo que
  se guarda en el dispositivo (`ferre-<ambiente>`).
- Fuera los valores por omisión: `VITE_BASE`, `VITE_VERSION`, `VERSION` pasan a obligatorias.
- `DATABASE_URL` por servicio: `DATABASE_URL` del mostrador y la suya en Procesos.
- El servicio `db` deja el perfil `local` y corre en todos los ambientes; el script de arranque
  de la base crea las bases y los usuarios con las contraseñas del `.env`.
- `tests/integration/paridad_env.sh` sigue comprobando que la lista de variables sea la misma en
  todos los ambientes.

## Mudanza

La marca con la que el servidor y los dispositivos piden «lo que cambió» es el `xmin` de la
base (ADR-023): no vale en otra base. Al arrancar con la base nueva, el servidor descarta la
copia del catálogo guardada en el disco, y la marca que llega de un dispositivo y es de la base
anterior se trata como si no hubiera marca (baja todo). Para reconocerla, la marca lleva el
identificador de la base (`system_identifier` de Postgres).

Un script de una sola vez, en `deployment/`: `pg_dump` de Supabase, `pg_restore` en la base del
mostrador, el esquema `procesos` a la base de Procesos, y la comparación de filas por tabla y del
total facturado. Si no coincide, sale con error y el `.env` no se cambia. Qué ambientes se
mudan en esta etapa depende de la pregunta de la spec.

## Seguridad

- **Datos que toca:** todos los del negocio (ventas, costos, clientes con cuenta corriente,
  usuarios y sesiones), porque muda la base entera. No agrega datos nuevos.
- **Permisos:** no cambia quién puede qué en la aplicación. En la base, cada servicio tiene su
  usuario, que solo abre su base; el usuario administrador de la instancia solo lo usa el
  script de arranque.
- **Lo que entra de afuera:** nada nuevo. La base no publica puertos a internet: solo la
  alcanza la red interna del compose (ADR-013).
- **Secretos:** las contraseñas de la base (la del administrador y la de cada servicio) van en
  el `.env` de cada ambiente, que no se sube; la cadena de Supabase se borra del `.env` después
  de la mudanza.
- **Quién hizo qué:** no cambia; el registro de eventos se muda con la base.
- **Riesgo que se acepta en esta etapa:** sin copias, perder el disco de la máquina pierde la
  base (lo cubre la etapa 2; ver la pregunta de la spec sobre producción).

## Lo que cambia en la documentación

- ADR-025 (no ORM, solo Kysely, tipos generados), ADR-026 (una base por servicio en una
  instancia en la máquina), enmienda a ADR-002, ADR-004, ADR-018 y ADR-019.
- Constitución: «Datos» (cada servicio es el único dueño de su base) y el principio VI (100 %
  en la capa de datos).
- `docs/operacion/` (DEPLOYMENT, la base), `001-base-del-sistema` (RNF-11, RNF-21, data-model).
