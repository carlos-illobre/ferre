# Feature Specification: Ajustes del sistema

**Feature Branch**: `020-ajustes-del-sistema`

**Created**: 2026-10-23

**Status**: Borrador, para que la apruebe Carlos

**Input**: Carlos, el 2026-10-23, para que la base no pase los 30 MB diarios de datos que salen
(specs/018, RNF-62): «sí, agregalo, pero quiero que esos tiempos puedan ser configurables desde
una pantalla de administración por un usuario administrador, y que esos valores sean los mismos
para todos los dispositivos, o sea que el usuario no pueda configurarlo para su propio
dispositivo, sino que el administrador lo decide para todos».

**Lo que pasa hoy** (medido en el código el 2026-10-23):

- Cada pedido a la aplicación primero le pregunta a la base quién es la persona, si su sesión
  sigue vigente y qué permisos tiene. Se repite en cada búsqueda, cada venta y cada pantalla,
  aunque sea la misma persona un segundo después.
- El celular emparejado con la computadora pregunta cada 3 segundos, mientras la aplicación está
  a la vista, si la computadora le pidió una foto o que haga de lector. El aviso ya le llega al
  instante por la conexión que tienen abierta los dos: la pregunta es solo un respaldo por si
  esa conexión se cortó. Con la aplicación abierta 8 horas son unas 10.000 preguntas por día,
  cada una con dos consultas a la base.
- El único ajuste que vale para todos los dispositivos es cuántos días dura el vínculo entre el
  celular y la computadora; está al final de Más → Usuarios y lo fija quien administra usuarios.

## Clarifications

### Session 2026-10-23

- Q: ¿Quién decide los tiempos? → A: Quien administra, uno solo para todos los dispositivos; nadie lo cambia para el suyo.
- Q: ¿Dónde se fijan? → A: En una pestaña nueva de Más, «Sistema», junto a Usuarios y Roles, con los dos tiempos y los días del vínculo.
- Q: ¿Quién puede cambiarlos? → A: Quien tenga un permiso nuevo, «Administrar el sistema», que se asigna a un rol en Roles.
- Q: ¿Entre qué valores se elige cuánto recuerda la sesión el servidor? → A: De 0 a 10 minutos; arranca en 1 minuto. Con 0 no la recuerda, como hoy.
- Q: ¿Entre qué valores se elige cada cuánto pregunta el celular emparejado? → A: De 5 segundos a 10 minutos; arranca en 1 minuto.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Que el servidor no le pregunte a la base por la sesión en cada pedido (Priority: P1)

El servidor recuerda por un rato quién es cada sesión y qué puede hacer, y en ese rato no se lo
vuelve a preguntar a la base. Lo que se cambia desde la aplicación vale en el momento.

**Why this priority**: Es la consulta que más se repite: va en cada pedido.

**Independent Test**: Con el tiempo en 1 minuto, hacer diez búsquedas seguidas y ver que la
sesión se buscó en la base una vez; desactivar a la persona desde Usuarios y ver que su
siguiente pedido ya no pasa.

**Acceptance Scenarios**:

1. **E01** **Given** el tiempo de la sesión en 1 minuto, **When** una persona hace varios pedidos dentro de ese minuto, **Then** su sesión se busca en la base una sola vez; pasado el minuto, se busca de nuevo en el pedido siguiente.
2. **E02** **Given** el tiempo en 0, **When** una persona hace un pedido, **Then** la sesión se busca en la base cada vez, como hoy.
3. **E03** **Given** una sesión recordada, **When** desde la aplicación se desactiva a esa persona, se le cierran las sesiones, se le cambian los roles, se cambian los permisos de uno de sus roles o la persona sale, **Then** su pedido siguiente ya responde con lo nuevo (rechazado o con los permisos nuevos), sin esperar al tiempo.
4. **E04** **Given** una sesión recordada que vence (pasa su fecha de fin) dentro del tiempo, **When** llega un pedido después del vencimiento, **Then** se rechaza: recordarla nunca la estira.
5. **E05** **Given** un token que no corresponde a ninguna sesión, **When** llega un pedido con él, **Then** se rechaza, y se vuelve a buscar en la base cada vez: lo que no existe no se recuerda.
6. **E06** **Given** una sesión que sigue en uso, **When** pasa el tiempo en que se renueva su vencimiento (como hoy), **Then** se renueva igual: recordarla no hace que venza mientras se usa.

### User Story 2 - Que el celular emparejado no pregunte a cada rato (Priority: P1)

El celular emparejado se entera de lo que le pide la computadora por la conexión que tienen
abierta los dos. La pregunta de respaldo pasa a hacerse cada el tiempo que fija quien
administra.

**Why this priority**: Es la otra consulta que se repite sin parar mientras la aplicación está abierta.

**Independent Test**: Con el tiempo en 1 minuto, dejar el celular emparejado a la vista 5
minutos sin hacer nada: pregunta unas 5 veces, no 100. Pedirle una foto desde la computadora:
el aviso aparece en el momento.

**Acceptance Scenarios**:

1. **E07** **Given** el celular emparejado, a la vista y con el tiempo en 1 minuto, **When** pasan 5 minutos sin pedidos, **Then** pregunta como mucho 6 veces (una al empezar y una por minuto).
2. **E08** **Given** el celular emparejado, **When** la computadora le pide una foto o que haga de lector, **Then** el aviso aparece en el momento, sin esperar a la pregunta de respaldo.
3. **E09** **Given** el celular emparejado, **When** vuelve a la aplicación (estaba en otra) o vuelve la conexión, **Then** pregunta en ese momento, por si se perdió un aviso.
4. **E10** **Given** la conexión entre los dos cortada, **When** la computadora pide una foto, **Then** el aviso aparece en el celular a más tardar en el tiempo fijado.
5. **E11** **Given** el celular sin emparejar, o con la aplicación oculta, **When** pasa el tiempo, **Then** no pregunta, como hoy.

### User Story 3 - Fijar los tiempos para todos, desde Más → Sistema (Priority: P2)

Quien tiene «Administrar el sistema» abre Más → Sistema, en el celular o en la computadora, y
fija los dos tiempos y los días del vínculo. Valen para todos los dispositivos; nadie los cambia
para el suyo.

**Why this priority**: Carlos quiere poder ajustarlos sin pedir un cambio de código.

**Independent Test**: Cambiar el tiempo del celular a 2 minutos en la computadora y ver que el
celular emparejado, sin tocar nada, pasa a preguntar cada 2 minutos.

**Acceptance Scenarios**:

1. **E12** **Given** quien tiene «Administrar el sistema», **When** abre Más, **Then** está la pestaña «Sistema» con tres renglones: «Cuánto recuerda la sesión el servidor», «Cada cuánto pregunta el celular emparejado» y «Cuántos días dura el vínculo», cada uno con su valor y una línea que dice qué cambia.
2. **E13** **Given** quien no tiene ese permiso, **When** abre Más, **Then** la pestaña no está; si pide los ajustes o intenta cambiarlos igual, el servidor lo rechaza diciendo qué permiso hace falta.
3. **E14** **Given** la pestaña abierta, **When** se elige un valor y se guarda, **Then** queda guardado para todos y registrado en «Quién hizo qué» con quién lo cambió, el valor anterior y el nuevo.
4. **E15** **Given** un valor fuera de rango (la sesión, de 0 a 10 minutos; el celular, de 5 segundos a 10 minutos; el vínculo, de 1 a 365 días), **When** se intenta guardar, **Then** no se guarda y dice entre qué valores puede ir; lo mismo si llega así al servidor por otro camino.
5. **E16** **Given** un tiempo cambiado, **When** pasa como mucho un minuto, **Then** lo usan el servidor y todos los dispositivos abiertos, sin que nadie vuelva a entrar.
6. **E17** **Given** cualquier persona, **When** abre su Configuración, **Then** no hay ningún renglón para cambiar estos tiempos en su dispositivo.
7. **E18** **Given** nadie cambió nada, **When** se usa la aplicación, **Then** la sesión se recuerda 1 minuto, el celular pregunta cada 1 minuto y el vínculo dura los días que dura hoy.

### Edge Cases

- **Al actualizarse**, los roles que hoy tienen «Administrar usuarios» reciben también
  «Administrar el sistema», así nadie pierde la posibilidad de fijar los días del vínculo, que
  hoy tiene.
- **Nunca puede quedar el sistema sin quien tenga «Administrar el sistema»**, igual que con
  «Administrar usuarios»: un cambio de roles o de permisos que lo deje sin nadie se rechaza.
- **Los días del vínculo** se mudan de Más → Usuarios a Más → Sistema, con la misma regla.
  Quien tiene «Administrar usuarios» pero no «Administrar el sistema» deja de verlos.
- **Un cambio hecho directamente en la base** (no desde la aplicación) tarda hasta el tiempo de
  la sesión en valer para una sesión recordada.
- **Si no se puede leer el ajuste**, se usa el valor de arranque, como hoy con los días del
  vínculo.
- **Dos personas que guardan a la vez:** queda lo último que se guardó.

## Requirements *(mandatory)*

### Functional Requirements

- **RF-133**: El servidor recuerda cada sesión válida, con la persona y sus permisos, durante el
  tiempo que fija quien administra (de 0 a 10 minutos; 1 de arranque; 0 es no recordarla), y en
  ese tiempo no la vuelve a buscar en la base. Lo que cambia una sesión o sus permisos desde la
  aplicación vale en el pedido siguiente; una sesión vencida nunca pasa; lo que no es una sesión
  no se recuerda.
- **RF-134**: El celular emparejado se entera de los pedidos de la computadora en el momento, por
  la conexión entre los dos. Además pregunta al empezar, al volver a la aplicación, al volver la
  conexión y cada el tiempo que fija quien administra (de 5 segundos a 10 minutos; 1 minuto de
  arranque).
- **RF-135**: Los ajustes que valen para todos los dispositivos (los dos tiempos de RF-133 y
  RF-134, y los días del vínculo, specs/007) se fijan en Más → Sistema, en el celular y en la
  computadora, solo con el permiso «Administrar el sistema». Cada cambio queda en «Quién hizo
  qué». Ninguna persona los cambia para su propio dispositivo.

### Key Entities

- **Ajuste del sistema**: un valor con nombre que vale para todos los dispositivos: el tiempo que
  se recuerda la sesión, cada cuánto pregunta el celular emparejado y los días del vínculo.
  Se guarda en el servidor.
- **Permiso «Administrar el sistema»**: en la parte «Administración», junto a «Administrar
  usuarios» y «Administrar roles».

## Success Criteria *(mandatory)*

- **SC-001**: Con los valores de arranque, una persona que trabaja una hora seguida hace que su
  sesión se busque en la base unas 60 veces, no una vez por pedido.
- **SC-002**: Un celular emparejado a la vista 8 horas pregunta unas 480 veces por día (hoy, unas 9.600).
- **SC-003**: Con el uso de hoy, los datos que salen de la base quedan por debajo de 30 MB por día
  en cada ambiente (RNF-62, que pide menos de 2,5 GB por mes entre los dos).
- **SC-004**: Desactivar a alguien desde la aplicación le corta el acceso en su pedido siguiente.

## Assumptions

- Cada ambiente tiene un solo proceso del servidor (como asume specs/018): lo que se cambia desde
  la aplicación pasa por él, y por eso puede olvidar en el momento la sesión que cambió. Si algún
  día hay dos, un cambio tarda hasta el tiempo de la sesión en llegar al otro.
- Los dispositivos ya preguntan cada 30 segundos si su sesión sigue: por esa misma pregunta se
  enteran del tiempo nuevo del celular.
- Los textos de cada renglón dicen qué se gana y qué se pierde (por ejemplo: «Más tiempo, menos
  consultas a la base. Un cambio hecho directamente en la base tarda hasta este tiempo en valer.»);
  los define la maqueta.
