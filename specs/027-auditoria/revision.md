# Revisión de 027: Auditoría (paso 7)

Revisor independiente, 2026-10-26. Leí `spec.md`, `plan.md` (con «Seguridad») y `tasks.md`, y
los commits 3813a22, d9c5685, b2789cc (solo `asegurar.sh` y el compose), c6559f5, 8815c6d,
b8b237c, ea3a0fd y 31a6cdf. No hay `ux.md` propio ni maquetas: la spec dice «no lleva pantallas».

**Aviso sobre el árbol de trabajo.** Mientras revisaba aparecieron cambios sin commit en
`microservices/comercial/src/eventos/anotar.ts` y `anotar.test.ts` (`contenidoQueEntra`, que
recorta el contenido de más de 16 KB). Los reviso en el punto S3 por separado: **no están en
ningún commit**, así que lo que está subido sigue con el problema.

Lo que corrí yo: `vitest run src/eventos/` de Comercial (9 pasan, con el árbol de trabajo tal
como está). Contra el stack local que estaba levantado probé que la puerta no publica
`/v1/eventos`, ni siquiera con `..`, `%2e%2e` o `%2f` (todas dan 404; `/auditoria/x` sin sesión da
401). Lo demás lo saqué de leer el código; donde no lo pude comprobar, lo digo.

Gravedad: **Frena** = frena el cierre; **Defecto** = se puede cerrar anotándolo en
`proyecto/estado.yml`.

---

## 1. Escenarios

| Esc. | ¿El código lo hace? | Prueba que lo nombra | Nota |
|---|---|---|---|
| E01 | Sí | `auditoria/src/rutas.test.ts:61`, e2e `escritorio/04-vender.spec.ts:147` | Ninguna prueba muestra Comercial **y** Procesos en la misma lista (ver 1.1). El rojo de la anulación no se comprueba en ninguna prueba que lo nombre |
| E02 | Sí | `auditoria/src/persistencia/eventos.test.ts:37`, `rutas.test.ts:61,73` | Bien |
| E03 | Sí | `rutas.test.ts:84`, `tests/integration/auditoria.sh:64-65` | Bien |
| E04 | Sí, con el contenedor parado | `Actividad.test.tsx:31` (los dos lados), `auditoria.sh:41` | «Un ambiente sin Auditoría» no se puede armar desde el `.env` (ver 1.2) |
| E05 | En parte | `auditoria-kit/src/bandeja.test.ts:51`, `comercial/.../eventos.test.ts:16` | ~25 acciones de Comercial anotan fuera de su transacción (ver 1.3) |
| E06 | Sí | `bandeja.test.ts:71`, `auditoria.sh:36-45` | Bien. Ver S4 por los reintentos que se acumulan |
| E07 | Sí | `bandeja.test.ts:71`, `rutas.test.ts:29`, `eventos.test.ts:18`, `auditoria.sh:52` | Bien |
| E08 | Sí | `bandeja.test.ts:84` | Bien |
| E09 | Sí en el kit; no se puede configurar como dice la spec | `bandeja.test.ts:39` | Ver 1.2 |
| E10 | Sí | `bandeja.test.ts:96` | Se borra solo cuando el mandador corre (aviso o arranque), no «al pasar el tiempo». Alcanza en la práctica |
| E11 | Sí | `bandeja.test.ts:96`, `auditoria.sh:46` | Bien |
| E12 | Sí | `contrato.test.ts:11`, `rutas.test.ts:21`, `Actividad.test.tsx:21`, `auditoria.sh:48-54` | Bien |
| E13 | Sí, en Auditoría | `contrato.test.ts:19`, `rutas.test.ts:36`, `auditoria.sh:57` | Lo que hace el kit cuando le llega un 400 pierde eventos (ver S2) |
| E14 | Sí | `rutas.test.ts:48`, `auditoria.sh:60-61` | Bien; ver S6 |
| E15 | En parte | Ninguna (es un documento) | Al contrato le faltan cosas (ver 4.3) |

### 1.1 E01 / SC-001: nadie prueba las dos fuentes en la misma lista — Defecto (bajo)

`tests/integration/puerta.sh` comprueba que el evento de Procesos llega a `auditoria.evento`, y
la e2e de vender mira solo lo de Comercial. Ninguna prueba muestra una venta y un proceso juntos
en «Quién hizo qué», ordenados, que es lo que piden E01 y SC-001. El código lo hace (una sola
tabla, `ORDER BY fecha DESC, id DESC`), pero falta la prueba.

### 1.2 E09 / E04: la dirección de Auditoría no está en el `.env`, y la puerta depende de Auditoría — **Frena**

- `docker-compose.yml:87` y `:136` fijan `AUDITORIA_URL: http://auditoria:8095` en el compose,
  sin leerla del `.env`; `.env.example` no la tiene. La spec (aclaraciones y E09) y el contrato
  (`docs/auditoria/contrato-v1.md`, «Mandar es opcional») dicen que se apaga dejándola vacía **en
  el `.env`**. Hoy, para apagarla en un ambiente hay que editar el compose.
- `docker-compose.yml:53`: la puerta tiene `depends_on: auditoria: condition: service_healthy`.
  Si Auditoría no arranca o no queda sana en un despliegue (una migración que falla, la base
  `auditoria` que no aparece, una clave mal puesta), `docker compose up` no levanta la puerta y
  **no anda nada**: ni vender. Eso choca con RNF-74 («ninguno depende de Auditoría para
  funcionar») y con la prioridad de la US2 («el mostrador no puede dejar de vender por la
  auditoría»). La prueba E06 no lo detecta porque para Auditoría con la puerta ya levantada. Caddy
  resuelve el destino en cada pedido (con Auditoría parada devuelve el 502 con palabras), así que
  esa dependencia no hace falta.

### 1.3 E05: muchas acciones anotan fuera de su transacción — Defecto (medio; viene de antes)

E05 dice que el evento queda «en la misma transacción». En Comercial unas 25 llamadas usan
`anotarEvento(base, …)` después de que la acción ya se guardó, no dentro de ella: por ejemplo
`deposito/reglas.ts:51` (ajuste de stock), `productos/reglas.ts:109,122`, `listas/reglas.ts:69,145`,
`acceso/reglas.ts` (entradas, salidas, vínculos), `tickets/reglas.ts`, `catalogo/reglas.ts`,
`clientes/reglas.ts:15`, `sistema/reglas.ts:29` y `ventas/reglas.ts:96` (cobro de cuenta
corriente). Pasan dos cosas:
- Si el proceso se cae entre la acción y el evento, la acción queda guardada y el evento se pierde.
- Si `anotar` tira error (ver S3), la acción ya está guardada y la persona recibe un 500. Con una
  lista cargada, por ejemplo, la vuelve a subir.

Esto ya pasaba con la tabla `evento`, pero ahora la spec lo promete y `estado.yml` marca RNF-74
como «Hecho».

---

## 2. Seguridad (plan, sección «Seguridad»)

### S1. «El usuario de la base de Auditoría solo inserta y lee eventos» — **Frena**

`microservices/base-de-datos/asegurar.sh:25` crea la base con `OWNER` igual al usuario del
servicio, y Auditoría corre sus migraciones con ese mismo usuario
(`auditoria/src/index.ts:16`, `migrar.ts`). Ese usuario es dueño del esquema y de la tabla
`auditoria.evento`. El disparador `evento_solo_suma` (`0001_eventos.sql:28-29`) frena `UPDATE` y
`DELETE`, pero:
- no frena `TRUNCATE` (es un disparador por fila);
- el dueño puede sacar el disparador (`DROP TRIGGER` o `ALTER TABLE … DISABLE TRIGGER`), o borrar
  la tabla.

Lo que el plan promete en Seguridad («su usuario de base no puede cambiar ni borrar», «solo
inserta y lee») no está hecho, y el comentario de la migración («ni siquiera desde la base»)
afirma algo que no es cierto. Hace falta un usuario aparte para migrar, o permisos solo de
`INSERT`/`SELECT` para el que usa el servicio. Si no, que el plan diga lo que de verdad se
garantiza.

### S2. «No se pierde ningún evento»: un lote rechazado se aparta entero y no se reintenta nunca — Defecto (alto)

`auditoria-kit/src/bandeja.ts:86-90`: si Auditoría responde 400, el kit marca `rechazo` en
**todo** el lote (hasta 100 eventos) y no los vuelve a mandar nunca. Como Auditoría rechaza el lote
entero por un solo evento malo (E13), los otros 99, que estaban bien, nunca llegan. Solo queda un
`console.error`. Además, las filas con `rechazo` nunca se borran (el `DELETE` mira solo
`entregado_en`), y eso no lo dice ninguna regla (ver 3).

Es raro que pase, porque el kit valida con el mismo código antes de anotar. Pero pasa si
Auditoría y el servicio corren versiones distintas del contrato (un servicio en otro lenguaje, o
un despliegue a medias), o si lo que guarda `jsonb` y se vuelve a leer no da lo mismo. El
contrato dice lo contrario: «se corrige y se vuelve a mandar». Lo que habría que hacer: mandar
de a uno el lote rechazado, para apartar solo el malo, y no perder ninguno.

### S3. El límite de 16 KB (y los demás del contrato) puede hacer fallar la acción — **Frena** (lo que está subido)

`bandeja.ts:69-70`: `anotar` tira error si el evento no cumple el contrato, y como corre dentro
de la transacción de la acción, **la acción se deshace**. Lo que mandan los eventos de Comercial
y que no tiene tope:

- **`venta.corregida`** (`ventas/reglas.ts:196`): `antes` y `despues` llevan la lista completa
  de renglones con su `descripcion` (el esquema `correccionDeVenta` no limita ni cuántos renglones
  ni el largo de la descripción). Son unos 100 bytes más la descripción por renglón, y dos veces:
  con descripciones de 60 letras pasa de 16 KB desde unos 50 renglones, y con 120 letras desde unos
  37. **Corregir esa venta falla con 500.** Es una acción del mostrador que deja de andar por la
  auditoría.
- `venta.cambio` (`ventas/reglas.ts:268`): las listas `vuelve` y `se_lleva`, con su descripción.
- `stock.ajustado`, `venta.anulada`, `compra.anulada`: el `motivo` no tiene tope en sus esquemas.
  En el detalle se recorta a 300 letras, pero en el contenido va entero.
- **`quien.nombre` de 1 a 120** (`contrato.ts:40`): `usuario.nombre` no tiene tope
  (`administracion/esquemas.ts:18,26`; la columna es `text`). Una persona con un nombre de más de
  120 letras **no puede hacer nada** que se anote, ni entrar (`sesion.iniciada`). En Procesos pasa
  lo mismo con `X-Usuario-Nombre`.
- **`dispositivo` hasta 120** (`contrato.ts:41`): `dispositivo_id` es `z.string()` sin tope
  (`ventas/esquemas.ts:24,47,68`). La web manda un uuid, pero un cliente que mande otra cosa hace
  fallar la venta.

**Lo que está sin commit** (`anotar.ts`, `contenidoQueEntra`) resuelve solo el contenido: deja
las listas como «N elementos» o, si aun así no entra, `{ recortado: true }`. Observaciones:
1. No está en ningún commit ni con su tarea.
2. Es una regla nueva que no está escrita en el plan, en el contrato ni en la spec (ver 3).
3. Con `{ recortado: true }` se pierde todo el contenido, también `id` y `motivo`. La web usa
   `contenido.motivo` (`AccionElegida.tsx`) y `contenido.total` (`registro.ts`), y las pruebas
   buscan por `contenido->>'id'`. Conviene que lo recortado conserve al menos los datos simples.
4. No cubre `quien.nombre` ni `dispositivo`.

La decisión de fondo, que el plan no escribe, es qué pasa cuando un evento no cumple el
contrato: hoy la acción falla. Con RNF-74 («ninguno depende de Auditoría para funcionar») lo
coherente es que el servicio ajuste el evento a los límites (recortar, truncar) y que nunca deshaga
la acción por eso.

### S4. Reintentos que se acumulan con Auditoría caída — Defecto (medio)

`bandeja.ts:97-104`: cada aviso de la base (una venta) que encuentra Auditoría caída programa su
propio reintento, y cada reintento que falla programa otro. Con Auditoría caída un día y 500
acciones, hay 500 cadenas de reintento a la vez, cada una con una transacción y un intento de
conexión cada 60 s (unos 8 por segundo). Al volver Auditoría se terminan, pero mientras tanto
cargan a Comercial y a su base. La espera creciente, además, se comparte entre todas. Debería
haber un solo reintento programado.

### S5. La entrega sin tiempo máximo y el lote que traba la cola — Defecto (bajo)

- `bandeja.ts:30`: `fetch` sin `signal` ni tiempo máximo, con las filas bloqueadas
  (`FOR UPDATE`) mientras dura. Si Auditoría acepta la conexión y no responde, el mandador queda
  esperando lo que tarde `fetch` en cortar por su cuenta (minutos), sin mandar nada. No lo pude
  medir.
- Un 413 (`rutas.ts`, límite de 2 MB) o un 5xx que se repite siempre con el mismo lote cuentan
  como «fallo» y se reintentan para siempre. Como el lote se elige por `anotado_en`, traba todo lo
  que viene después. Con los límites del contrato, 100 eventos pueden pasar los 2 MB solo en casos
  extremos (contenido de 16 KB más títulos, detalles y referencias al máximo con caracteres
  multibyte). Para Comercial no pasa.

### S6. Token y cabeceras — sin problemas que frenen; dos notas — Defecto (bajo)

- Bien: la puerta borra `X-Usuario-Id`, `X-Usuario-Nombre`, `X-Permisos` y `X-Token-Servicio` del
  navegador (`Caddyfile:17-20`), los reportes piden token y `X-Permisos` con
  `PERMISO_REPORTES=negocio.actividad` (`rutas.ts`), `/v1/eventos` pide el token antes de leer el
  cuerpo y la puerta no lo publica (lo probé con `..` y sus variantes codificadas: 404). La
  validación usa el mismo código en el kit y en Auditoría, y el SQL va con parámetros (Kysely y
  `sql`…`` con valores). El `LIKE` del filtro por tipo escapa `%` y `_`.
- La puerta y los servicios usan **el mismo token**. Auditoría no distingue un pedido de la puerta
  de uno de un servicio. Que la web no pueda mandar eventos depende solo de que Caddy no enrute
  `/v1/eventos` (hoy no lo hace). Y cualquier servicio con el token puede leer todos los reportes
  poniendo `X-Permisos` a mano. Está bien para hoy; conviene anotarlo para cuando haya servicios
  de afuera.
- `rutas.ts:9`: `igual` compara el largo en caracteres y después `timingSafeEqual` sobre bytes.
  Un token con caracteres que no son ASCII y el mismo largo en caracteres hace que
  `timingSafeEqual` tire error: el pedido da 500 en vez de 401. No filtra nada.

### S7. El control de salud de la base deja de mirar la base — Defecto (medio)

`asegurar.sh:13`: después de la primera vez que sale bien, el control de salud sale con 0 sin
preguntarle nada a PostgreSQL (`[ -f "$HECHO" ] && exit 0`). Antes era `pg_isready` en cada
control. Si PostgreSQL se cuelga o se cae, el contenedor sigue «sano». Además
`/tmp/bases-aseguradas` sobrevive a un `docker restart` (solo se borra si se recrea el
contenedor), así que después de reiniciar figura sano antes de aceptar conexiones. El plan dice
«corre también en el control de salud», no que lo reemplace.

### Secretos

`CLAVE_BASE_AUDITORIA` está en `.env.example`, en los dos `.env.oracle`, en `ORACLE.md` y en el
compose con `:?falta`. Bien.

---

## 3. Reglas inventadas (el código las hace y ninguna regla escrita las pide)

| Dónde | Qué hace | Gravedad |
|---|---|---|
| `bandeja.ts:69-70` | Un evento que no cumple el contrato deshace la acción («es un error del servicio», `bandeja.test.ts:64`) | Defecto (alto); ver S3 |
| `bandeja.ts:86-90` y la columna `rechazo` | Lo rechazado se aparta con un motivo fijo, no se reintenta y no se borra nunca | Defecto (alto); ver S2 |
| `anotar.ts` (sin commit), `contenidoQueEntra` | Lo que pasa de 16 KB se recorta: listas como «N elementos», o `{ recortado: true }` | Defecto; hay que escribirlo en el plan y en el contrato |
| `procesos/servidor/src/reglas.ts` (`importancia: tipo === "proceso.borrado" ? "anulacion"`) | Borrar un proceso se muestra en rojo, como una anulación | Defecto (bajo); que lo confirme Carlos o que se escriba |
| `web/.../comun/negocio/que-fue.ts:9-14` | Una tabla de íconos por **grupo** con los nombres de los grupos de Comercial y Procesos. El plan dice «ícono por importancia» y que salen las tablas por tipo. Está en `007/ux.md`, pero la web sigue conociendo a los servicios por su nombre de grupo | Defecto (bajo) |
| `en-palabras.ts:173-179` | Un tipo sin título usa el tipo con espacios («venta otra cosa»), y un prefijo desconocido va al grupo «Otras» | Defecto (bajo); no está escrito |
| `registro.ts` (`importeYDetalle`) | Lee `contenido.total` de cualquier servicio para ponerlo en el título del celular | Defecto (bajo): un servicio nuevo con `total` en su contenido lo vería como pesos |

---

## 4. Documentación que quedó atrás

### 4.1 `plan.md`
- Dice `bandejaDeAuditoria({ base, url, token, servicio })`; el código recibe
  `{ base, conexion, servicio, auditoria, token, entregar?, esperaMaximaMs? }`. Defecto (bajo).
- No dice qué pasa con un evento que no cumple al anotar (deshace la acción), ni con un lote
  rechazado (`rechazo`), ni el recorte de 16 KB. Otro agente no los reconstruiría. Defecto (medio).
- «Ícono por importancia» no coincide con el código ni con `007/ux.md` (ícono por grupo; la
  importancia da solo el color, salvo la anulación, que lleva «ban»). Defecto (bajo).
- No dice que la puerta depende de Auditoría en el compose (lo que habría que sacar, ver 1.2).

### 4.2 `asegurar.sh` y el control de salud
- Que el control de salud deja de mirar PostgreSQL después de la primera vez (S7) solo está en el
  comentario del script, no en el plan ni en `docs/operacion/`. Defecto (bajo).

### 4.3 `docs/auditoria/contrato-v1.md` (E15)
Para que un servicio en otro lenguaje lo cumpla le falta:
- El formato exacto de `tipo`: el código pide `^[a-z_]+\.[a-z_.]+$` (minúsculas sin acentos,
  guion bajo y punto; ni números ni guiones). El documento dice solo «`cosa.accion`, 3 a 80».
- Que `fecha` «con zona» no se controla (se acepta cualquier cosa que lea `Date.parse`).
- Cómo se reintenta: el kit espera de 1 s hasta 60 s, duplicando. El documento dice «más tarde».
- La respuesta 413 (lote de más de 2 MB) y qué hacer con ella.
- Que `contenido` se mide en bytes de su JSON en UTF-8.

Defecto (medio): E15 pide «cómo se entrega y cómo se reintenta».

### 4.4 `proyecto/estado.yml`
RF-146 y RNF-74 figuran como «Hecho» con `defectos: []`. Con lo de arriba tendrían que llevar
anotados al menos 1.2, 1.3, S1, S2, S3 y S4 (o volver a «Hecho en parte» hasta que se arreglen los
que frenan). `RF-71` sigue diciendo que «Faltan los filtros en pantalla (#58)»; no comprobé si eso
sigue siendo cierto.

### 4.5 Lo que no pude comprobar
- Si los nombres del filtro «Qué» de antes (`TIPOS`, que se borró) son los mismos que los grupos
  de ahora (`GRUPOS` de `en-palabras.ts`). No comparé lista por lista.
- El tiempo máximo real de `fetch` en Node 22 cuando Auditoría no responde (S5).
- Si `docker compose up` con Auditoría que no queda sana deja abajo la puerta en el servidor real.
  Lo deduzco de `depends_on … service_healthy`; no lo ejecuté.

---

## 5. Pantallas

No hay maquetas: la spec dice «“Quién hizo qué” se ve igual». Hay diferencias visibles que
Carlos no vio. Están anotadas después en `specs/007-usuarios-y-acceso/ux.md` («Con Auditoría»),
pero sin maqueta ni aprobación:

- **Ya no se muestra el correo** de quien lo hizo (`HojaDelEvento.tsx`,
  `HojaDelEventoDelCelular.tsx`, el `title` de `TablaDelRegistro.tsx`).
- **Hay una fila nueva «Desde»** con `e.dispositivo`. En Comercial el dispositivo es el uuid que
  arma la web (`datos/vinculo/puesto.ts:22`), así que se lee algo como
  «Desde 3f2a…-…», que no le dice nada al dueño. El contrato lo describe como «Desde dónde».
- **El color de las iniciales** sale ahora del id de la persona y no del correo
  (`clave={e.quien?.id ?? "sistema"}`): cada persona puede cambiar de color con respecto a antes.
- **El filtro «Qué»** lista los grupos que devuelve Auditoría en vez de la lista fija de antes. En
  la computadora, lo elegido en «Qué pasó» aparece como una opción deshabilitada.

Gravedad: Defecto. Es un **cambio de interfaz** según CLAUDE.md, así que Carlos lo tiene que ver;
lo de «Desde» con el uuid conviene arreglarlo antes de mostrárselo.

---

## Resumen

**Frenan el cierre:**
1. **1.2**: la puerta depende de que Auditoría esté sana (`docker-compose.yml:53`), y
   `AUDITORIA_URL` no se apaga desde el `.env` (`:87`, `:136`).
2. **S1**: el usuario de la base de Auditoría es el dueño; puede vaciar la tabla con `TRUNCATE` o
   sacar el disparador. No cumple lo que dice el plan en Seguridad.
3. **S3**: un evento que no cumple el contrato deshace la acción. Con lo subido, corregir una venta
   de muchos renglones falla. El arreglo del contenido está sin commit y sin documentar, y los
   nombres de más de 120 letras y `dispositivo_id` largos siguen haciendo fallar la acción.

**Defectos para anotar:** S2 (el lote rechazado se pierde entero), 1.3 (anotar fuera de la
transacción), S4 (los reintentos se acumulan), S7 (el control de salud de la base), S5, S6, 1.1,
4.1 a 4.4, las reglas inventadas del punto 3 y las diferencias de pantalla del punto 5.

---

## Qué se hizo con cada punto (2026-10-26)

| Punto | Qué se hizo |
|---|---|
| 1.1 E01 | `auditoria.sh` crea un proceso después de la venta y comprueba que los dos salen en la misma lista, el proceso primero |
| 1.2 E09/E04 (frenaba) | La puerta ya no espera a Auditoría. `AUDITORIA_URL` va en el `.env` (plantillas y paridad); vacía, la apaga. `auditoria.sh` prueba que la puerta arranca y Comercial atiende sin Auditoría, y que con la variable vacía se vende sin anotar nada |
| 1.3 E05 | Se anota como defecto de RNF-74 y queda la tarea T167: mover esas ~25 llamadas a su transacción es un cambio de cada regla, fuera del alcance del cierre |
| S1 (frenaba) | La base también frena `TRUNCATE`. El plan y la migración dicen lo que de verdad se garantiza: ninguna consulta cambia, borra ni vacía; el dueño podría sacar los frenos cambiando el esquema. El usuario aparte para migrar queda en T166 y como defecto |
| S2 | Un lote rechazado se manda de a uno: solo queda aparte el malo. Escrito en el plan y en el contrato; los apartados no se borran solos, a propósito |
| S3 (frenaba) | El kit ya no deshace la acción: un evento que no cumple queda en la bandeja con el motivo y no se manda. Comercial corta antes de anotar el nombre, el dispositivo, el título y el detalle, y achica el contenido grande conservando los datos sueltos (`id`, `total`, `motivo`) con `recortado: true`. Con pruebas; escrito en el plan y el contrato |
| S4 | Con un reintento esperando, los avisos nuevos no suman otro. Con prueba |
| S5 | La entrega corta a los 10 s; el 413 cuenta como rechazo y se manda de a uno. Con prueba |
| S6 | El token se compara por bytes (en Auditoría y en Comercial): uno con letras no ASCII da 401. El token compartido queda en T168 y como defecto |
| S7 | `asegurar.sh` mira siempre que PostgreSQL responda; lo que no repite es crear bases y usuarios |
| 3 | Escritas en el plan: borrar un proceso es anulación (ya era rojo en la web), el ícono por grupo con uno de siempre para un grupo desconocido, el grupo «Otras» y el título a partir del tipo. `importeYDetalle` queda: el celular mostraba el total igual que antes |
| 4.1–4.3 | Plan y contrato al día (firma del kit, rechazos, recorte, formato de `tipo`, reintentos, 413) |
| 4.4 | RNF-74 pasa a «Hecho en parte» con sus tres defectos |
| 5 | Sale la fila «Desde» (era el uuid). El correo, el color de las iniciales y el filtro «Qué» se le muestran a Carlos con capturas |
