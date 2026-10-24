# Feature Specification: La base de datos en el servidor propio, y una capa de datos aparte

**Feature Branch**: `022-base-de-datos-propia`

**Created**: 2026-10-24

**Status**: Aprobada (Carlos, 2026-10-24, con sus respuestas a las cuatro preguntas)

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

- Q: ¿Dónde vive la base? → A: En la máquina de Oracle, en un contenedor de PostgreSQL, uno por ambiente. Supabase deja de usarse (decisión 150).
- Q: ¿Una base para todo o una por servicio? → A: Una instancia y, adentro, una base por servicio, cada una con su usuario, que no puede entrar a las de los otros. En esta etapa, dos: la del mostrador y la de Procesos (decisión 150).
- Q: ¿Se quita el trabajo sin conexión en esta etapa? → A: No: queda como está (decisión 150).
- Q: ¿Copias de seguridad en esta etapa? → A: No: llegan en la etapa 2 (decisión 150).
- Q: ¿Cuánta cobertura de pruebas? → A: El 100 % de las líneas de la capa de datos; una línea que no se puede cubrir no se escribe (decisión 150). Cambia la regla general, que no tenía meta de cobertura.
- Q: ¿Qué puede ser distinto entre ambientes? → A: Solo lo que dice el archivo de variables de entorno; el código es el mismo (decisión 150).
- Q: Sin copias en esta etapa, ¿se muda producción ya? → A: Todavía no hay nada real en producción: se hace lo más fácil. Las bases nuevas arrancan vacías en los dos ambientes y no se muda nada desde Supabase, que no aporta valor y se quita (decisión 151).
- Q: El código que aplica las migraciones está copiado en cada servicio: ¿biblioteca compartida, una de afuera o la copia? → A: La que ya trae la biblioteca de consultas, con unas pocas líneas propias en cada servicio (decisión 151).
- Q: «Si una línea no puede ser cubierta, no se escribe», ¿vale para todo el código? → A: Solo para la capa de datos (decisión 151).
- Q: ¿Qué pasa con el tope de consumo del plan gratuito de la base (RNF-62)? → A: Si Supabase no aporta valor, no se usa; sin Supabase ese tope no existe y RNF-62 se retira (decisión 151).
- Q: ¿Hasta dónde llega el reordenamiento del código? → A: Solo la capa de datos. Las reglas y las rutas cambian únicamente lo necesario para llamarla (de dónde importan); el resto se reordena más adelante, de a poco (decisión 151).
- Q: ¿Dónde va cada pieza del servidor? → A: Cada servicio del servidor tiene su propia carpeta dentro de la de servicios; la base de datos, que pasa a ser una pieza más, también (decisión 151).

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

### User Story 2 - Las bases nuevas arrancan vacías (Priority: P1)

Como no hay nada real en producción, no se muda nada: cada ambiente arranca con sus bases
vacías y con el esquema al día, y la primera persona se da de alta con el comando de siempre.
Lo que el servidor y los dispositivos tenían guardado de la base anterior no se mezcla con la
nueva.

**Why this priority**: es el camino más corto a dejar Supabase, que pasó el tope del plan
gratuito.

**Independent Test**: levantar un ambiente con la base vacía, dar de alta a la primera persona,
entrar y cargar una lista.

**Acceptance Scenarios**:

1. **E07** **Given** un ambiente con la base nueva vacía, **When** arranca, **Then** el esquema del mostrador y el de Procesos quedan al día y la aplicación responde, sin productos ni ventas.
2. **E08** **Given** la base de Procesos nueva, **When** se mira dónde están sus tablas, **Then** están en su base, y la del mostrador no tiene ninguna tabla de Procesos.
3. **E09** **Given** la base vacía, **When** se da de alta a la primera persona con el comando del servidor, **Then** recibe todos los roles y puede entrar.
4. **E10** **Given** los dos ambientes con la base nueva, **When** se revisa su configuración, **Then** ninguno apunta a Supabase ni tiene ninguna variable que la nombre.
5. **E23** **Given** la copia del catálogo que el servidor guarda en su disco y los datos que un dispositivo bajó a mano para trabajar sin conexión, los dos con la marca de la base anterior, **When** el servidor arranca con la base nueva, **Then** el servidor arma su copia de nuevo desde la base nueva, y el dispositivo, la próxima vez que baja, baja todo y no solo lo que cambió: una marca de otra base no sirve.

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
4. **E14** **Given** las reglas y las rutas, **When** se compara el código antes y después de esta etapa, **Then** su lógica es la misma: cambió de dónde llaman a la capa de datos, y sus pruebas cambiaron solo en cómo reconocen cada consulta (el texto y el orden de sus parámetros) y en de dónde simulan la base.


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
- **RNF-64**: Las bases nuevas arrancan vacías y con el esquema al día; no se muda nada de la base anterior, que no tenía datos reales, y deja de usarse. Lo que el servidor o un dispositivo guardaron con una marca de otra base no se usa en la nueva. Retira RNF-62, el tope de consumo del plan gratuito de la base anterior.
- **RNF-65**: En cada servicio, todo lo que guarda o lee datos (base y archivos) está en una capa propia, separada de las rutas y de las reglas del negocio; cada servicio del servidor, y la base, tienen su carpeta propia dentro de la de servicios; y un control automático en cada subida impide que otra capa use la base o el disco. Dentro de esa capa no hay código repetido: una sola forma de consultar, de abrir una transacción, de migrar y de guardar un archivo, y la forma de las tablas sale de las migraciones, no se escribe dos veces.
- **RNF-66**: Las pruebas de la capa de datos corren contra PostgreSQL de la misma versión que producción y cubren el 100 % de sus líneas, ramas y funciones; una subida que baja de ese número no pasa. Una línea de esa capa que no se puede cubrir con una prueba no se escribe. Cambia, para esta capa, la regla de las pruebas (RNF-55), que no tenía meta de cobertura.
- **RNF-67**: Todo lo que cambia entre ambientes está en el archivo de variables de entorno y en ningún otro lado: el código que se prueba es el mismo que corre en producción. Ninguna pieza tiene valores por omisión para esas variables ni deduce el ambiente de otra cosa (la versión, la dirección). Lo que cada ambiente guarda en el dispositivo va aparte, nombrado según el ambiente.

### Key Entities

- **Instancia de base**: el PostgreSQL de un ambiente, en un contenedor, con sus datos en un volumen.
- **Base de un servicio**: la base de datos de un servicio dentro de la instancia, con su usuario y sus migraciones.
- **Capa de datos**: la parte de cada servicio que guarda y lee datos; la única que conoce la base y el disco.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ningún ambiente usa una base de afuera; los dos corren con su base en la máquina.
- **SC-002**: Un ambiente nuevo arranca con las bases vacías y deja entrar a la primera persona dada de alta con el comando.
- **SC-003**: La capa de datos de cada servicio tiene el 100 % de cobertura, y el control de capas no encuentra ningún acceso a la base o al disco fuera de ella.
- **SC-004**: Entre el código que corre en pruebas y el que corre en producción no hay ninguna diferencia; solo cambia el archivo de variables de entorno.

## Assumptions

- La máquina de Oracle tiene lugar y memoria para dos instancias de PostgreSQL (una por ambiente); la base del negocio es chica.
- El trabajo sin conexión del mostrador no cambia en esta etapa.
- Lo que haya en las bases de Supabase (datos de prueba) se pierde: Carlos lo acepta.
- Tickets, las listas y los usuarios siguen en la base del mostrador; se separan en etapas siguientes.

## Out of Scope (por ahora)

- Reordenar las reglas, las rutas, sus pruebas y la web: solo se tocan para llamar a la capa de datos o para leer las variables de entorno.

- Copias de seguridad, restauración y avisos (etapas 2 y 4).
- Separar Tickets, las listas de proveedores y los usuarios en servicios con base propia (etapas 2, 4 y posterior a la 5).
- Mover los archivos (fotos, listas) a un almacenamiento de afuera (etapa 4).
- Réplica de la base y archivos para análisis (etapa 6).
