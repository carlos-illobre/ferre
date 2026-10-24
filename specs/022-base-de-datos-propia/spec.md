# Feature Specification: La base de datos en el servidor propio, y una capa de datos aparte

**Feature Branch**: `022-base-de-datos-propia`

**Created**: 2026-10-24

**Status**: Borrador: falta que Carlos conteste las preguntas marcadas y la apruebe

**Maquetas**: No lleva pantallas

**Input**: Carlos, el 2026-10-24, al rediseñar el almacenamiento de datos. Se hace por etapas;
esta es la primera y la más simple: una sola instancia de PostgreSQL en un contenedor del
servidor de Oracle, sin copias de seguridad todavía. El trabajo sin conexión queda como está,
para no hacerlo dos veces. De paso: todo lo que guarda o lee datos queda en una capa propia,
que se distingue en la estructura del código; se analiza si conviene un ORM, con el acento en
la calidad y la simpleza del código y sin código repetido; la capa de datos tiene pruebas
unitarias que cubren el 100 % de sus líneas («si una línea no puede ser cubierta por una
prueba, no se escribe»); y todo lo que cambia entre ambientes está en el archivo de variables
de entorno, porque el código que se prueba y el que corre en producción tienen que ser
idénticos.

Las etapas siguientes (copias, separación de más servicios, réplica) están en el plan
(`proyecto/tasks.md`), cada una con su carpeta cuando se empiece.

Hay apuro: el 18/10 Supabase avisó que la organización pasó el tope del plan gratuito y desde
el 18/11 puede restringir la base (ADR-023).

## Clarifications

### Session 2026-10-24

[NEEDS CLARIFICATION: RNF-62 (de `018-descarga-eficiente`) pide que los dos ambientes usen menos de la mitad del plan gratuito de Supabase en datos que salen de la base y en registros. Sin Supabase ese tope ya no existe. ¿Se retira, o se reemplaza por un tope del tráfico que sale del servidor hacia los dispositivos, que es el recurso que hay que cuidar?]

- Q: ¿Dónde vive la base? → A: En la máquina de Oracle, en un contenedor de PostgreSQL, uno por ambiente. Supabase deja de usarse (decisión 150).
- Q: ¿Una base para todo o una por servicio? → A: Una instancia y, adentro, una base por servicio, cada una con su usuario, que no puede entrar a las de los otros. En esta etapa, dos: la del mostrador y la de Procesos (decisión 150).
- Q: ¿Se quita el trabajo sin conexión en esta etapa? → A: No: queda como está (decisión 150).
- Q: ¿Copias de seguridad en esta etapa? → A: No: llegan en la etapa 2 (decisión 150).
- Q: ¿Cuánta cobertura de pruebas? → A: El 100 % de las líneas de la capa de datos; una línea que no se puede cubrir no se escribe (decisión 150). Cambia la regla general, que no tenía meta de cobertura.
- Q: ¿Qué puede ser distinto entre ambientes? → A: Solo lo que dice el archivo de variables de entorno; el código es el mismo (decisión 150).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - La base corre en el servidor propio (Priority: P1)

El sistema guarda sus datos en una base que corre en la misma máquina que el servidor, sin
depender de un servicio gratuito de afuera que se pausa o tiene tope de tamaño.

**Why this priority**: es la base de todas las etapas que siguen y saca la dependencia de un
plan gratuito que pausa la base y no trae copias.

**Independent Test**: levantar un ambiente desde cero con su archivo de variables de entorno
y comprobar que la aplicación vende, guarda y vuelve a leer, sin ningún servicio de base de
afuera.

**Acceptance Scenarios**:

1. **E01** **Given** un ambiente levantado desde cero, **When** arranca, **Then** la base corre en un contenedor de la misma máquina, se crean la base del mostrador y la de Procesos con su usuario cada una, y el esquema de cada una queda al día antes de atender.
2. **E02** **Given** el ambiente de pruebas y el de producción en la misma máquina, **When** los dos corren, **Then** cada uno tiene su propia instancia de base, y lo que se guarda en uno no se ve en el otro.
3. **E03** **Given** la base corriendo, **When** alguien intenta conectarse a ella desde internet, **Then** no llega: la base solo se alcanza desde la red interna del ambiente.
4. **E04** **Given** el usuario de la base de Procesos, **When** intenta abrir la base del mostrador (o al revés), **Then** la base lo rechaza.
5. **E05** **Given** la base sin responder, **When** se consulta la salud del servidor, **Then** dice que la base no responde, y el contenedor del servidor no figura como sano.
6. **E06** **Given** el contenedor de la base recreado (por una versión nueva o un reinicio de la máquina), **When** vuelve a arrancar, **Then** los datos siguen ahí: viven en un volumen, no en el contenedor.

---

### User Story 2 - Mudar los datos sin perder nada (Priority: P1)

Los datos que hoy están en Supabase pasan a la base nueva sin perder ni cambiar nada, y el
mostrador sigue vendiendo mientras tanto.

**Why this priority**: sin esto la base nueva arranca vacía.

**Independent Test**: mudar una copia de la base actual a una base nueva vacía y comparar
tabla por tabla la cantidad de filas, y el total facturado.

**Acceptance Scenarios**:

1. **E07** **Given** la base de Supabase con datos, **When** se muda a la base nueva, **Then** cada tabla tiene la misma cantidad de filas, y la cantidad de ventas y el total facturado coinciden; si algo no coincide, la mudanza se informa como fallida y la aplicación sigue usando la base anterior.
2. **E08** **Given** las tablas de Procesos, que hoy están en un esquema propio de la base compartida, **When** se mudan, **Then** quedan en la base de Procesos y la del mostrador no las tiene.
3. **E09** **Given** el mostrador vendiendo durante la mudanza, **When** el servidor deja de responder un rato, **Then** las ventas quedan en el dispositivo y se mandan solas cuando el servidor vuelve, una sola vez cada una.
4. **E10** **Given** la mudanza terminada, **When** se revisa la configuración de los ambientes, **Then** ninguno apunta a Supabase.
5. **E23** **Given** la copia del catálogo que el servidor guarda en su disco y los datos que un dispositivo bajó a mano para trabajar sin conexión, los dos con la marca de la base anterior, **When** el servidor arranca con la base nueva, **Then** el servidor arma su copia de nuevo desde la base nueva, y el dispositivo, la próxima vez que baje, baja todo y no solo lo que cambió: una marca de la base anterior no sirve en la nueva.

[NEEDS CLARIFICATION: en esta etapa no hay copias de seguridad: si se rompe el disco de la máquina o Oracle la reclama, se pierde todo lo que haya en la base. ¿Producción se muda en esta etapa, o en esta etapa se muda solo pruebas y producción sigue en Supabase hasta que estén las copias de la etapa 2? Y, si producción se muda ahora, ¿Supabase se conserva sin uso, como copia de lo que había el día de la mudanza, hasta la etapa 2?]

---

### User Story 3 - Los datos se guardan y se leen por un solo lugar (Priority: P1)

Todo lo que guarda o lee datos (la base y los archivos que el servidor guarda, como las fotos y
las listas) está en una capa propia de cada servicio, que se reconoce en la estructura del
código. Las reglas del negocio y las rutas no hablan con la base ni con el disco: le piden a
esa capa.

**Why this priority**: es lo que permite cambiar dónde se guarda algo (las etapas que siguen
mueven los archivos y separan servicios) tocando un solo lugar.

**Independent Test**: un control automático que corre en cada subida falla si algo fuera de la
capa de datos usa la base o el disco.

**Acceptance Scenarios**:

1. **E11** **Given** el código de un servicio con base, **When** se lo mira, **Then** todo el acceso a datos está en una sola carpeta de ese servicio, separada de las rutas y de las reglas.
2. **E12** **Given** una regla del negocio o una ruta que importa la biblioteca de la base o lee o escribe un archivo directamente, **When** se sube el cambio, **Then** el control de capas lo rechaza y dice qué archivo y qué importó.
3. **E13** **Given** la capa de datos, **When** se busca código repetido, **Then** hay una sola forma de abrir una transacción, una sola de consultar, una sola de aplicar las migraciones y una sola de guardar y leer un archivo; la forma de las tablas que usa el código no se escribe a mano aparte de las migraciones, sale de ellas.
4. **E14** **Given** las pruebas de las rutas y de las reglas, **When** corren, **Then** no reconocen consultas por su texto: reemplazan la capa de datos por una de prueba con la misma interfaz.

[NEEDS CLARIFICATION: el mostrador y Procesos aplican sus migraciones con el mismo código, copiado en los dos, y cuando se separen Tickets y las listas habrá cuatro copias. Las tres salidas: (a) una biblioteca interna compartida por los servicios, sin repetición, pero va contra la decisión 84 («no hay librerías compartidas entre servicios») y Procesos y Tickets dejan de poder llevarse solos a otro proyecto; (b) usar en todos los servicios una biblioteca de afuera que ya hace las migraciones, y cada uno queda con unas pocas líneas propias; (c) aceptar la copia, que es chica. ¿Cuál?]

---

### User Story 4 - La capa de datos, probada entera (Priority: P1)

Cada línea de la capa de datos se ejecuta en alguna prueba, contra el mismo motor de base que
usa producción, y una subida que deja una línea sin probar no pasa.

**Why this priority**: es el lugar donde un error pierde o corrompe datos.

**Independent Test**: correr las pruebas de la capa de datos y ver el 100 % de líneas, ramas y
funciones cubiertas; agregar una línea sin prueba y ver que la subida se frena.

**Acceptance Scenarios**:

1. **E15** **Given** la capa de datos de cada servicio, **When** corren sus pruebas, **Then** cubren el 100 % de sus líneas, de sus ramas y de sus funciones.
2. **E16** **Given** un cambio que agrega a la capa de datos una línea que ninguna prueba ejecuta, **When** se lo quiere subir, **Then** las pruebas fallan y dicen qué línea quedó sin cubrir.
3. **E17** **Given** las pruebas de la capa de datos, **When** corren, **Then** usan una base PostgreSQL de la misma versión que producción, vacía al empezar, con las migraciones aplicadas por el mismo código que en producción; ninguna prueba de esta capa simula la base.
4. **E18** **Given** una consulta que falla en la base (por ejemplo, un dato que rompe una restricción), **When** corre su prueba, **Then** se comprueba que el error llega a quien llamó y que la transacción no dejó nada a medias.

[NEEDS CLARIFICATION: «si una línea no puede ser cubierta por una prueba, no se escribe» ¿vale solo para la capa de datos o para todo el código? Si vale para todo, el 100 % de cobertura pasa a ser regla de todo el sistema y hay que llevar el resto del código a ese nivel, que es bastante más trabajo que esta etapa.]

---

### User Story 5 - Entre ambientes solo cambia la configuración (Priority: P1)

Lo que distingue a pruebas de producción (y de una máquina de desarrollo) está en el archivo
de variables de entorno. El código no pregunta en qué ambiente está por otro camino ni tiene
valores por omisión que tapen una variable que falta.

**Why this priority**: así lo que se prueba es exactamente lo que corre en producción.

**Independent Test**: construir y levantar dos ambientes con el mismo código y distinto archivo
de variables, y ver que solo cambia lo que ese archivo dice.

**Acceptance Scenarios**:

1. **E19** **Given** una variable que falta en el archivo de variables de entorno, **When** se construye o arranca cualquier pieza (servidor, Procesos, la web, la base), **Then** se corta con un mensaje que nombra la variable; no hay ningún valor por omisión.
2. **E20** **Given** el ambiente de pruebas, **When** la aplicación decide si mostrar «Ambiente de prueba», **Then** lo decide por la variable que nombra el ambiente, no por la versión ni por la dirección.
3. **E21** **Given** un dispositivo que abre pruebas y producción, **When** guarda datos para trabajar sin conexión, **Then** cada ambiente guarda en su propio lugar del dispositivo, nombrado según esa variable: la sesión, el catálogo y la cola de uno no se mezclan con los del otro.
4. **E22** **Given** el código de una pieza, **When** se lo revisa, **Then** no tiene direcciones, puertos, nombres de base ni nombres de ambiente escritos adentro: todo eso sale del archivo de variables de entorno, y la lista de variables es la misma en todos los ambientes (cambian solo los valores).

---

### Edge Cases

- **Dos servicios arrancan a la vez y los dos quieren migrar:** cada uno migra su propia base; dos copias del mismo servicio no aplican la misma migración dos veces.
- **Una migración falla a la mitad:** no queda nada aplicado de esa migración y el servicio no arranca.
- **La base se queda sin lugar en el disco:** la escritura falla con un error claro y el mostrador sigue vendiendo con lo que tiene en el dispositivo.
- **La base todavía arranca cuando arranca el servidor:** el servidor espera a que la base responda antes de migrar y atender.

## Requirements *(mandatory)*

### Non-Functional Requirements

- **RNF-63**: La base de datos es PostgreSQL y corre en un contenedor de la máquina del servidor, una instancia por ambiente, con sus datos en un volumen. Adentro hay una base por servicio, cada una con su usuario, que no puede abrir las de los otros. La base no se alcanza desde internet. Reemplaza lo que la decisión técnica de la base (ADR-002) decía de Supabase y de que la máquina no guarda datos; las copias de seguridad llegan en la etapa 2.
- **RNF-64**: Los datos se mudan de la base anterior a la nueva sin perder ni cambiar nada: se comparan las filas de cada tabla y el total facturado, y si no coinciden la mudanza no se da por hecha. El mostrador sigue vendiendo durante la mudanza.
- **RNF-65**: En cada servicio, todo lo que guarda o lee datos (base y archivos) está en una capa propia, separada de las rutas y de las reglas del negocio, y un control automático en cada subida impide que otra capa use la base o el disco. Dentro de esa capa no hay código repetido: una sola forma de consultar, de abrir una transacción, de migrar y de guardar un archivo, y la forma de las tablas sale de las migraciones, no se escribe dos veces.
- **RNF-66**: Las pruebas de la capa de datos corren contra PostgreSQL de la misma versión que producción y cubren el 100 % de sus líneas, ramas y funciones; una subida que baja de ese número no pasa. Una línea de esa capa que no se puede cubrir con una prueba no se escribe. Cambia, para esta capa, la regla de las pruebas (RNF-55), que no tenía meta de cobertura.
- **RNF-67**: Todo lo que cambia entre ambientes está en el archivo de variables de entorno y en ningún otro lado: el código que se prueba es el mismo que corre en producción. Ninguna pieza tiene valores por omisión para esas variables ni deduce el ambiente de otra cosa (la versión, la dirección). Lo que cada ambiente guarda en el dispositivo va aparte, nombrado según el ambiente.

### Key Entities

- **Instancia de base**: el PostgreSQL de un ambiente, en un contenedor, con sus datos en un volumen.
- **Base de un servicio**: la base de datos de un servicio dentro de la instancia, con su usuario y sus migraciones.
- **Capa de datos**: la parte de cada servicio que guarda y lee datos; la única que conoce la base y el disco.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ningún ambiente usa una base de afuera; los dos corren con su base en la máquina.
- **SC-002**: La mudanza termina con las mismas filas en cada tabla y el mismo total facturado.
- **SC-003**: La capa de datos de cada servicio tiene el 100 % de cobertura, y el control de capas no encuentra ningún acceso a la base o al disco fuera de ella.
- **SC-004**: Entre el código que corre en pruebas y el que corre en producción no hay ninguna diferencia; solo cambia el archivo de variables de entorno.

## Assumptions

- La máquina de Oracle tiene lugar y memoria para dos instancias de PostgreSQL (una por ambiente); la base del negocio es chica.
- El trabajo sin conexión del mostrador no cambia en esta etapa: es lo que cubre los cortes de la mudanza.
- Tickets, las listas y los usuarios siguen en la base del mostrador; se separan en etapas siguientes.

## Out of Scope (por ahora)

- Copias de seguridad, restauración y avisos (etapas 2 y 4).
- Separar Tickets, las listas de proveedores y los usuarios en servicios con base propia (etapas 2, 4 y posterior a la 5).
- Mover los archivos (fotos, listas) a un almacenamiento de afuera (etapa 4).
- Réplica de la base y archivos para análisis (etapa 6).
