# Revisión independiente: 022, la base de datos en el servidor propio (T012)

Revisor: subagente `revisor`, 2026-10-24. Revisé `spec.md`, `plan.md` (sobre todo «Seguridad»),
`tasks.md`, ADR-025 y ADR-026, y el código y las pruebas de los commits `05d796a..HEAD`
(022-T003 a T011). No hay maquetas: no lleva pantallas.

**Qué corrí:**

- `pnpm test:persistencia` en los dos servicios, contra el `db` del compose: mostrador 79 pruebas
  y Procesos 8, todas pasan, con el 100 % de líneas, ramas, funciones y sentencias.
- Las unitarias de `microservices/api` (proyecto `unitarias`, 244) y de `microservices/web` (610).
  Las de la web fallaron una vez: 1 prueba y un error suelto en `Sistema.test.tsx` (020-E17,
  `c.filas?.map is not a function` en `Configuracion.tsx`). En las tres corridas siguientes
  pasaron todas. Ni ese archivo ni esa pantalla están en el cambio, así que parece una prueba
  inestable que ya estaba, pero no lo comprobé.
- `pnpm capas` limpio. Además, en una copia del paquete fuera del repositorio, le agregué a una
  regla un archivo que importa `pg`, `kysely`, `fs` y `node:fs/promises`. El control lo rechazó
  y nombró el archivo y lo importado (E12 se cumple).
- En la misma copia agregué a `persistencia/` una función que ninguna prueba llama, y la cobertura
  cortó con «does not meet global threshold» (E16 se cumple).
- Construí las imágenes, levanté el stack entero y corrí `tests/integration/base-propia.sh`,
  `migraciones.sh`, `health.sh` y `paridad_env.sh`: pasan las cuatro. También
  `node tests/trazabilidad.mjs` y `node tests/compuerta.mjs revisar`: dan bien.
- Paré el contenedor `db` con el stack levantado, para ver E05 en la práctica (hallazgo 1).

**No corrí** las e2e (se pidió no correrlas). Tampoco pude comprobar que se hayan borrado los
secretos `BASE_PRODUCCION` y `BASE_PRUEBAS` del repositorio en GitHub, ni cómo están los `.env`
de la máquina de Oracle.

Gravedad: **Frena el cierre**, o **Defecto** (se puede anotar en `proyecto/estado.yml` y
seguir).

---

## 1. Escenarios sin cumplir o sin una prueba que los compruebe

### 1.1 E05: con la base caída, el servidor se cae; la salud nunca dice «la base no responde» — Frena el cierre

- **Dónde:** `microservices/api/src/persistencia/pool.ts:7` (el `pg.Pool` no escucha `error`, y
  las conexiones quietas viven 10 minutos) y `microservices/api/src/salud.test.ts:19`.
- **Qué dice la spec:** con la base sin responder, la salud dice que la base no responde y el
  contenedor no figura como sano.
- **Qué hace el código:** paré `db` con el stack levantado. La base corta las conexiones quietas
  del pool («terminating connection due to administrator command», 57P01). El pool emite `error`,
  nadie lo escucha y el proceso de Node se muere. Docker lo reinicia y queda en `esperarLaBase`,
  sin escuchar. Mientras tanto `/health` contestó **502** (lo dio el proxy) las cuatro veces que
  pregunté. Nunca contestó el 503 con `db: "sin-respuesta"`. El contador de reinicios de
  `gestion-del-local` subió una vez por cada caída de la base, incluida la que provoca
  `base-propia.sh` al recrear `db` (E06).
- El monitor sigue avisando, porque un 502 también falla, pero el escenario no se cumple. Además,
  cada reinicio de la base tira el servidor y se pierden los pedidos que estaban en curso.
- **La prueba pasa siempre:** simula que `connect` falla en un pool que no tiene conexiones
  abiertas. Ese no es el caso real. La falta del `on("error")` ya estaba antes de 022, pero E05
  es un escenario nuevo y sale por este camino.
- En Procesos, `crearBase` (`microservices/procesos/servidor/src/persistencia/conexion.ts:6`)
  tampoco escucha `error`. No se cayó en la prueba porque su pool suelta las conexiones quietas
  a los 10 segundos, pero puede caerse igual.

### 1.2 E23 en el servidor: la copia del disco se reconoce por una dirección que ahora es la misma en todos los ambientes — Frena el cierre

- **Dónde:** `microservices/api/src/productos/copia.ts:20` y `:107`.
- **Qué dice la spec:** RNF-64 y E23 dicen que lo guardado con una marca de otra base no se usa,
  y que el servidor arma su copia de nuevo desde la base nueva. `proyecto/estado.yml` (RNF-64)
  lo da por hecho «en el servidor ni en el dispositivo».
- **Qué hace el código:** la copia guardada se reconoce por `servidor:puerto/base` de
  `DATABASE_URL`. Con la base propia esa cadena es `db:5432/mostrador` en pruebas, en producción
  y en cualquier base recreada. El comentario de la línea 18 («una copia de otra base, un volumen
  copiado entre ambientes, no se usa») ya no es cierto.
- `copia.ts:143` calcula el `system_identifier` (`idDeLaBase`), pero solo lo usa para las marcas
  de los dispositivos: no lo guarda en el archivo ni lo compara al leerlo.
- En el paso desde Supabase funciona porque la dirección cambia. Después, una base recreada con el
  volumen de archivos intacto, o una restauración de la etapa 2, se salva solo si la marca guardada
  supera el `xmax` de la base nueva. Es el mismo hueco que dejó anotado la revisión de 018
  (`specs/018-descarga-eficiente/revision.md`, «El archivo de la copia»), que proponía justamente
  guardar el `system_identifier`.
- **Pruebas:** ninguna con 022-E23 prueba la mitad del servidor. `conexion.test.ts:17` solo
  comprueba que el identificador sea un número. Las de `copia.test.ts:105` y `:139` son de 018 y
  prueban la dirección, no el identificador.

### 1.3 E21: una pantalla lee la clave vieja del vínculo — Frena el cierre

- **Dónde:** `microservices/web/src/pantallas/celular/Vender.tsx:140`.
- **Qué dice la spec:** lo de cada ambiente se guarda aparte, en el lugar que nombra la variable
  del ambiente.
- **Qué hace el código:** `puesto.ts:12` ahora guarda el vínculo en `ferre.puesto.<ambiente>`,
  pero `Vender.tsx:140` sigue leyendo `localStorage.getItem("ferre.puesto")`, una clave que ya no
  escribe nadie. Cuando se corta la escucha del puesto, `setPuestoVinculado` queda siempre en
  `false` aunque el vínculo siga vigente. Es una regresión del cambio.
- **Prueba:** la de E21 (`ambiente.test.ts:12`) solo comprueba que `deEsteAmbiente` le agrega el
  sufijo a la clave que recibe. No comprueba que la sesión, el catálogo, la cola y el vínculo
  usen esa función, y por eso no ve este caso.

### 1.4 E19: la prueba cubre una de las cuatro piezas — Defecto

- **Dónde:** `microservices/api/src/config.test.ts`.
- **Qué dice la spec:** si falta una variable, se corta el servidor, Procesos, la web o la base,
  con un mensaje que la nombra.
- **Qué hace el código:** lo hace en las cuatro piezas:
  - el servidor, en `config.ts`;
  - Procesos, con `obligatoria` en `index.ts`;
  - la web, en `vite.config.ts:12`;
  - la base, con los `:?` del compose y de `iniciar.sh`.
- **Qué falta:** solo hay prueba del servidor, y solo de `VERSION`. Nada prueba el corte de la web
  al construir, el de Procesos ni el del compose.
- **De paso:** `vite dev` no exige `VITE_BASE`, que queda en `undefined` y Vite usa `/`. Es un
  valor por omisión, aunque solo en desarrollo.

### 1.5 E02, E07 y E09: pruebas más débiles que el escenario — Defecto

- **E02** (`tests/integration/paridad_env.sh:38-44`): solo mira que el volumen se llame
  `<proyecto>_db-data`. No levanta dos ambientes ni comprueba que lo guardado en uno no se vea en
  el otro.
- **E07** (`persistencia/migrar.test.ts:11`): comprueba que migrar de nuevo no aplica nada. No
  comprueba que la aplicación responda «sin productos ni ventas» con la base vacía.
- **E09** (`tests/integration/base-propia.sh:36-40`): corre contra el stack de siempre, que puede
  tener usuarios, y no comprueba que la base esté vacía. Además, el comando da todos los roles
  siempre que no se le pidan otros, así que la prueba pasa con o sin gente. Tampoco comprueba
  que esa persona «pueda entrar».

### 1.6 E14 sin control automático — Defecto

- **Dónde:** el único rastro es un comentario en `microservices/api/src/pruebas/base-falsa.ts:6`.
- Comparé a mano el diff de las reglas y las rutas. Casi todo es cambiar de dónde importan.
  Encontré estos cambios de comportamiento chicos:
  - `persistencia/eventos.ts:17`: los eventos que antes iban por `registrarEvento` (duplicados,
    listas, acceso, productos, sistema, `crear-usuario`) se fechaban con `now()` de la base y
    ahora con `new Date()` del proceso. Dentro de una transacción ya no comparten la hora, y
    `ultimaUnion` ordena por `fecha`.
  - `acceso/vinculo.ts:18` y `:45`: `diasDeVinculo` ya no recibe el ejecutor y lee la
    configuración fuera de la transacción de `emparejar`.
  - `listas/reglas.ts:20-22`: si falta el archivo al volver a leer una lista, antes se propagaba
    el error del disco y ahora sale «El archivo de esa lista ya no está en el disco». Además, el
    `releer` y `normalizarBusqueda` (`productos/copia.ts`) pasaron de la capa de datos a las
    reglas. Era necesario para que la persistencia no dependa del negocio, pero es mover lógica,
    no solo importarla de otro lado.

### 1.7 Bordes sin prueba — Defecto

- «Dos copias del mismo servicio no aplican la misma migración dos veces»: no hay prueba de dos
  migraciones a la vez. Lo resuelve el candado de Kysely, pero nada lo comprueba.
- «La base se queda sin lugar en el disco»: no hay prueba y no lo pude comprobar.
- E18 usa un uuid inválido (un error de tipo), no la ruptura de una restricción como dice el
  ejemplo del escenario. Comprueba lo mismo (el error llega y no queda nada), así que no lo cuento
  como falla.

### Escenarios que comprobé y se cumplen

- **E01, E03, E04, E06 y E08**: `base-propia.sh` contra el stack real, con E08 también en
  `procesos/.../migrar.test.ts`.
- **E10**: `paridad_env.sh`.
- **E11 y E12**: `pnpm capas`, más la prueba en la copia.
- **E15, E16 y E17**: cobertura y bases de prueba reales.
- **E18**: `transaccion.test.ts`.
- **E20**: `ambiente.test.ts`.
- **E22**: el grep de `paridad_env.sh`, más uno mío más amplio; no apareció nada nuevo.
- **E23 en el dispositivo**: `descarga.test.tsx:80`, `rutas/productos.test.ts:139` y
  `rutas/stock.test.ts:56`.

## 2. Seguridad (sección «Seguridad» del plan)

- **Un usuario por base, que solo abre la suya: se cumple.** `iniciar.sh` le quita `CONNECT` a
  `PUBLIC` en `postgres`, `mostrador` y `procesos`, y los roles no son superusuario ni crean bases
  ni roles. Lo comprobé en `pg_database`/`pg_roles` y con E04. Las claves pasan a `psql` como
  variables entre comillas (`:'clave'`), sin riesgo de inyección.
  - **Defecto menor:** `template1` conserva `CONNECT` para `PUBLIC` (`=c/postgres`), así que
    `mostrador` y `procesos` pueden conectarse a esa base. No es la base de otro servicio y desde
    PostgreSQL 15 no pueden crear nada en `public`, pero «solo puede abrir su base» no es
    literal.
- **Publicada solo en 127.0.0.1: se cumple.** Lo dice `docker-compose.yml` (`db.ports`) y lo
  comprueba `base-propia.sh`. El `pg_hba.conf` de la imagen oficial confía sin clave en el socket
  y en el 127.0.0.1 de adentro del contenedor. Lo que llega desde los otros contenedores, o desde
  la máquina por el puerto publicado, pide clave (scram-sha-256). Está bien, pero no está
  documentado.
- **El administrador solo lo usan el arranque y las pruebas: se cumple.** Lo usan `iniciar.sh`, el
  healthcheck (por el socket), `tests/utest.sh`, la CI y `base-propia.sh`. Los servicios y las e2e
  usan su propio usuario.
- **Las tres claves en el `.env`, que no se sube: se cumple** (`.gitignore:13`). Las plantillas
  traen marcadores y la imagen no lleva claves, porque `iniciar.sh` las lee al arrancar. Los
  secretos de Supabase en GitHub quedan como tarea de Carlos (T147, anotada en `estado.yml`): no
  lo pude comprobar.
- **Quién hizo qué: se cumple, con el matiz de la hora** del punto 1.6: los eventos ahora se
  fechan con el reloj del proceso, no con el de la base.
- **No documentado (Defecto, de operación):** `iniciar.sh` corre una sola vez, con el volumen
  vacío. Si después se cambia una clave en el `.env`, la clave del rol no cambia y el servicio
  deja de conectarse. Ningún documento lo dice ni explica cómo rotar una clave (`ALTER ROLE …`).

## 3. Reglas inventadas o código que existe solo por la base simulada

### 3.1 Líneas de `persistencia/` que solo existen para la base simulada — Defecto

Esto va contra la regla «una línea que no se puede cubrir no se escribe»:

- `persistencia/conexion.ts:14-15`: `numero` saca el valor con un `reduce` que empieza en 0. Su
  propio comentario dice «La base simulada de las pruebas de rutas no devuelve filas: entonces
  vale 0». Contra Postgres, un `count` o un `SUM … COALESCE` siempre devuelve una fila. El caso
  vacío existe solo para la base simulada, y el `reduce` lo esconde de la cobertura de ramas.
  Lo usan `actividad.ts:22`, `administracion.ts:27`, `deposito.ts:9` y `compras.ts:63`.
- `persistencia/conexion.ts:8-10` y el archivo `persistencia/pool.ts` entero: el pool vive
  aparte, detrás de un `{ connect: () => … }`, «para que las pruebas de rutas lo reemplacen por la
  base simulada» (comentario de `pool.ts:4-5`). La indirección venía de antes (`base.ts`), pero
  ahora está dentro de la capa que se pidió sin líneas para la simulación. El plan decía que se
  simularía `persistencia/conexion.js`; en los hechos se simula `persistencia/pool.js`.
- Fuera de la capa: `productos/copia.ts` (`cargarParaPrueba`, con `idDeLaBase = "prueba"`), en
  código que corre en producción.

### 3.2 La forma de las filas se sigue escribiendo a mano — Defecto

- **Qué dice la spec:** E13 y RNF-65 piden que la forma de las tablas «sale de las migraciones,
  no se escribe dos veces». El plan dice «el constructor cuando la consulta es simple».
- **Qué hace el código:** casi todo el SQL que estaba escrito a mano pasó tal cual a plantillas
  `sql<{…}>`, con el tipo de la fila escrito a mano. Plantillas `sql` contra usos del
  constructor:

  | Archivo | `sql` | Constructor |
  |---|---|---|
  | `acceso.ts` | 45 | 0 |
  | `compras.ts` | 21 | 0 |
  | `duplicados.ts` | 25 | 0 |
  | `listas.ts` | 18 | 0 |
  | `pedidos.ts` | 16 | 0 |
  | `administracion.ts` | 18 | 0 |

  Un ejemplo de consulta simple que no usa el constructor:
  `SELECT id, total FROM compra WHERE id = …` (`compras.ts:26`).
- Los ENUM generados en `tablas.ts` (`MedioPago`…) no se usan: `persistencia/ventas.ts:15`,
  `:34`, `:147` y `:161` repiten a mano `"efectivo" | "mercado_pago" | "tarjeta" |
  "cuenta_corriente"`, y `ventas/esquemas.ts:7` repite la lista otra vez. Así, el tipo generado
  no protege esas consultas: si cambia una columna, el compilador no se entera.
- Entiendo que se dejó así para no cambiar cómo las pruebas de rutas reconocen cada consulta
  (E14), pero el plan no lo dice.

### 3.3 Las e2e dan por hecho el ambiente — Defecto

- `tests/e2e/**` escribe `ferre.sesion.desarrollo` e `indexedDB.open("ferre.desarrollo")` fijos,
  pero `tests/e2e.sh:47-49` construye la web con el `AMBIENTE` del `.env`. Con otro valor (por
  ejemplo, el `.env` del servidor para e2e) fallan todas las que siembran la sesión.

### 3.4 Repetición aceptada

`migrar.ts` está casi igual en los dos servicios. Lo pidió la decisión 151 («unas pocas líneas
propias en cada servicio»), así que no lo cuento como defecto.

## 4. Documentación que quedó atrás

- **RNF-67 y E22: «en ningún otro lado» no se cumple para la web — Defecto, que decide Carlos.**
  En pruebas y producción, `VITE_AMBIENTE` está escrito en `.github/workflows/ci.yml:135` y
  `:145`, no en el `.env`. `DEPLOYMENT.md:49` lo anota como excepción («es lo único que vive fuera
  del `.env`»), pero la spec no admite excepciones. Además, el `AMBIENTE=` de los
  `.env.oracle` (línea 5) dice «lo usa la web que se construye con este .env», y en Oracle ninguna
  pieza lo lee: solo lo usa `tests/e2e.sh`. Es una variable que no hace nada y un comentario que
  confunde.
- **Cómo correr y mantener la capa de datos — Defecto.** Solo los comentarios del código explican
  `pnpm test:persistencia`, `BASE_DE_PRUEBAS`, `pnpm tablas` (regenerar `tablas.ts` después de una
  migración) y que `tablas.test.ts` falla si no se regenera. `specs/001-base-del-sistema/quickstart.md`
  no los nombra, y su tabla de verificaciones de integración no tiene `base-propia.sh`.
- **El formato de la marca — Defecto.** Que la marca que va al dispositivo es
  `<system_identifier>.<transacción>`, y que una marca sin punto o de otra base vale como ninguna,
  solo aparece en el plan y, de forma genérica, en la enmienda de ADR-023. No está en
  `specs/018-descarga-eficiente/spec.md` ni en el `data-model.md`.
- **El nombre de la base del dispositivo — Defecto menor.** El plan dice `ferre-<ambiente>`; el
  código y el `data-model.md` usan `ferre.<ambiente>`.
- **Lo que se pierde al actualizar un dispositivo — Defecto.** Con las claves nuevas, al recibir
  esta versión cada dispositivo pierde la sesión (hay que volver a entrar) y deja de ver lo
  guardado en la base `ferre` vieja, incluida una cola de ventas sin enviar. Ningún documento lo
  avisa. No hay datos reales (decisión 151), pero en pruebas Carlos lo va a notar.
- **Claves locales que siguen siendo una sola para todos los ambientes.** `ferre.preferencias`,
  `ferre.dispositivo`, `ferre.manual-dispositivo`, `ferre.menu`, `ferre.panel` y
  `ferre.huella-en-este-dispositivo` no llevan el ambiente. E21 solo nombra sesión, catálogo y
  cola, así que no es una falla, pero el `data-model.md` dice «con claves que llevan el ambiente»
  sin aclarar cuáles. Hoy otro agente no podría saber cuáles van aparte.

## 5. Pantallas

No hay maquetas: la funcionalidad no lleva pantallas. El único cambio visible es el texto de la
versión, que ya no muestra «local» cuando falta: ahora siempre viene de `VITE_VERSION`. No hay
nada que comparar.

---

## Resumen

| # | Hallazgo | Gravedad |
|---|---|---|
| 1.1 | E05: con la base caída, el servidor se cae (pool sin `on("error")`); la prueba no lo ve | Frena el cierre |
| 1.2 | E23 en el servidor: la copia se reconoce por una dirección que ahora es igual en todos los ambientes; el `system_identifier` no se guarda; sin prueba | Frena el cierre |
| 1.3 | `Vender.tsx:140` lee `ferre.puesto` sin el ambiente: regresión del vínculo | Frena el cierre |
| 1.4 | E19 solo probado en el servidor | Defecto |
| 1.5 | E02, E07 y E09 con pruebas más débiles que el escenario | Defecto |
| 1.6 | E14 sin control; hora de los eventos, `diasDeVinculo` fuera de la transacción, mensaje de `releer` | Defecto |
| 1.7 | Migraciones a la vez y disco lleno, sin prueba | Defecto |
| 2 | `template1` abierto a `PUBLIC`; rotar una clave no está documentado | Defecto |
| 3.1 | `numero` y `pool.ts` existen por la base simulada | Defecto |
| 3.2 | Tipos de fila y ENUM escritos a mano en `persistencia/`; el constructor casi no se usa | Defecto |
| 3.3 | Las e2e fijan «desarrollo» | Defecto |
| 4 | `VITE_AMBIENTE` fuera del `.env` y `AMBIENTE` que nadie lee; comandos de la capa de datos, formato de la marca y pérdida al actualizar sin documentar | Defecto (el primero lo decide Carlos) |

---

## Qué se hizo con cada punto (2026-10-24)

| # | Qué se hizo |
|---|---|
| 1.1 | Arreglado. El pool del mostrador y el de Procesos escuchan `error`: una conexión sin uso que la base corta se anota y se descarta, y el servidor sigue y responde 503. Prueba nueva en cada servicio que corta las conexiones sin uso desde la base (`pg_terminate_backend`) y comprueba que el proceso sigue y la base vuelve a responder |
| 1.2 | Arreglado. La copia del catálogo guarda el `system_identifier` de la base y la de otra base no se usa; la dirección de `DATABASE_URL` ya no se mira. La prueba de 018 pasa a 022-E23 y cambia el identificador en vez de la dirección |
| 1.3 | Arreglado. `Vender.tsx` lee el vínculo con la función de `puesto.ts`, que usa la clave del ambiente |
| 1.4 | Anotado como defecto de RNF-67 |
| 1.5 | Anotado como defecto de RNF-63 (E02, E09) y RNF-64 (E07) |
| 1.6 | Arreglados la hora de los eventos (vuelve a ser `now()` de la base, con una prueba de que los de una transacción comparten la hora) y los días del vínculo, que se leen de nuevo dentro de la transacción de `emparejar`. El mensaje de `releer` y lo que pasó a las reglas, anotados como defecto de RNF-65 |
| 1.7 | Anotado como defecto de RNF-63 |
| 2 | `template1` también se cierra a `PUBLIC` y `base-propia.sh` comprueba que ningún servicio abre `postgres` ni `template1`. Que `iniciar.sh` corre una sola vez, cómo cambiar una clave y que la base pide clave desde afuera del contenedor, en `docs/operacion/DEPLOYMENT.md` |
| 3.1 | Anotado como defecto de RNF-65: se va con la base simulada de las pruebas de rutas |
| 3.2 | Los ENUM de `ventas.ts` toman los tipos generados (`MedioPago`, `EstadoDeDocumento`, `TipoDeMovimientoDeDinero`). Pasar las plantillas al constructor, anotado como defecto de RNF-65 |
| 3.3 | Anotado como defecto de RNF-67 |
| 4 | `VITE_AMBIENTE` en la CI: anotado como defecto de RNF-67, lo decide Carlos; el comentario de `AMBIENTE` en las plantillas de la máquina dice ahora que no lo lee ninguna pieza. Los comandos de la capa de datos y `base-propia.sh`, en el `quickstart.md` de 001; el formato de la marca y qué claves del dispositivo llevan el ambiente, en el `data-model.md` de 001; el nombre de la base del dispositivo, corregido en el plan; lo que pierde un dispositivo al actualizar, en `DEPLOYMENT.md` |
| Inestable | El error suelto de `Sistema.test.tsx` también pasaba en `master` y no era al azar: la base simulada de esa prueba devolvía los ajustes para cualquier pedido, también para la lista de celulares de Configuración. Ahora devuelve una lista vacía para lo que no son ajustes |
