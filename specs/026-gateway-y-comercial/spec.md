# Feature Specification: Una sola puerta para la web, y el servicio del mostrador se llama Comercial

**Feature Branch**: `026-gateway-y-comercial`

**Created**: 2026-10-25

**Status**: Borrador, para aprobar

**Maquetas**: No lleva pantallas

**Input**: Carlos, el 2026-10-25, al dividir la aplicación en servicios por funcionalidad
(decisiones 164 a 166). Es la etapa 2 del plan (`proyecto/tasks.md`, T154). Hoy el servidor
del mostrador hace dos trabajos: el suyo y el de puerta para Procesos (le reenvía los pedidos,
valida la sesión y anota en «Quién hizo qué» lo que se hace en Procesos). Con más servicios en
camino (Auditoría, Tickets, Acceso), esa puerta va a un servicio propio, y el servidor del
mostrador pasa a llamarse por lo que hace: **Comercial**, la mercadería y la plata del local.

## Clarifications

### Session 2026-10-25

- Q: ¿Por qué un servicio aparte como puerta y no que cada servicio tenga su dirección? → A: Con una dirección por servicio la web tendría que conocerlas todas, y con el mostrador haciendo de puerta el mostrador tiene que conocer a todos. Una puerta propia que solo reparte deja a la web y a cada servicio sin saber cuántos servicios hay atrás (decisión 164).
- Q: ¿La puerta se programa o se configura? → A: Se configura, con un servidor web probado (decisión 164); no lleva reglas del negocio ni datos.
- Q: ¿Cambia algo para quien usa la aplicación? → A: No: la web sigue hablando con una sola dirección, con las mismas rutas.
- Q: ¿Qué pasa con lo que se hace en Procesos y hoy anota el mostrador en «Quién hizo qué»? → A: Procesos lo anota en su propia base. Mientras no esté Auditoría (etapa 3), «Quién hizo qué» no muestra lo de Procesos (decisión 165).
- Q: ¿Hay que hacer algo en la máquina? → A: Sí, una vez: volver a instalar los scripts de despliegue de cada usuario, porque cambian el nombre y la imagen del servicio. Carlos lo hace con un agente en la máquina.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - La web entra por una sola puerta (Priority: P1)

Todo lo que la aplicación le pide al servidor entra por una puerta que solo reparte: según la
ruta, el pedido va al servicio que corresponde. La puerta pregunta quién es la persona antes de
dejar pasar un pedido a un servicio que no sabe de sesiones, y le pasa quién es y qué puede.

**Why this priority**: es lo que permite sumar servicios sin tocar la web ni el mostrador.

**Independent Test**: con el ambiente levantado, usar la aplicación entera (vender, Procesos,
«Quién hizo qué») y ver que todo funciona por la misma dirección de siempre.

**Acceptance Scenarios**:

1. **E01** **Given** la aplicación, **When** pide cualquier cosa de Comercial (vender, el catálogo, entrar), **Then** el pedido pasa por la puerta y llega a Comercial, con la misma respuesta que antes.
2. **E02** **Given** una persona con sesión y permiso para ver Procesos, **When** la aplicación pide algo de Procesos, **Then** la puerta pregunta quién es, y el pedido llega a Procesos con quién es y qué puede en Procesos.
3. **E03** **Given** un pedido a Procesos sin sesión, o con la sesión cerrada, **When** llega a la puerta, **Then** la puerta lo rechaza sin pasarlo a Procesos, con el mismo aviso que da hoy el servidor.
4. **E04** **Given** un pedido a una ruta que ningún servicio atiende, **When** llega a la puerta, **Then** responde que no existe.
5. **E05** **Given** la puerta, **When** se consulta su salud, **Then** dice que anda; y el ambiente no figura como sano mientras la puerta no lo esté.
6. **E06** **Given** desde internet, **When** alguien intenta llegar directo a Comercial o a Procesos sin pasar por la puerta, **Then** no llega: solo la puerta se publica en la máquina.
7. **E07** **Given** un pedido que llega a Procesos sin pasar por la puerta (desde otro contenedor, sin el token entre servicios), **When** Procesos lo recibe, **Then** lo rechaza.
8. **E08** **Given** Procesos sin responder, **When** la aplicación le pide algo, **Then** la puerta contesta que Procesos no responde ahora, como hoy, y el resto de la aplicación sigue andando.
9. **E09** **Given** el origen de la web, **When** el navegador pregunta si puede llamar (CORS), **Then** la puerta responde por todos los servicios: solo el origen de la web puede llamar.

---

### User Story 2 - Procesos anota lo suyo (Priority: P1)

Lo que se hace en Procesos (crear, renombrar, borrar, cambiar el vigente, guardar el borrador)
lo anota Procesos en su propia base, con quién lo hizo, con las mismas reglas que hoy (el
borrador, uno cada media hora por persona y proceso).

**Why this priority**: sin esto, la puerta haría perder lo que hoy anota el mostrador.

**Independent Test**: hacer cada acción de Procesos y ver su evento en la base de Procesos.

**Acceptance Scenarios**:

1. **E10** **Given** una persona que crea, importa, renombra, borra o cambia el vigente de un proceso, **When** sale bien, **Then** Procesos anota el evento con su tipo de siempre, quién lo hizo y el nombre del proceso (también el del borrado).
2. **E11** **Given** alguien que guarda el borrador seguido, **When** guarda, **Then** se anota el primero y, si sigue, uno cada media hora, por persona y proceso.
3. **E12** **Given** una acción de Procesos que falla, **When** termina, **Then** no se anota nada.
4. **E13** **Given** Procesos llevado a otro proyecto, **When** anota sus eventos, **Then** no usa nada propio de Ferrebress (RNF-61).

---

### User Story 3 - El servidor del mostrador se llama Comercial (Priority: P2)

El servicio que hoy se llama `api` en la carpeta y `gestion-del-local` en el despliegue se
llama **comercial** en todos lados: carpeta, servicio, imagen y documentación.

**Why this priority**: tres nombres para lo mismo confunden a quien lee el código o opera la máquina.

**Independent Test**: buscar los nombres viejos en el repositorio y no encontrarlos fuera de la historia.

**Acceptance Scenarios**:

1. **E14** **Given** el repositorio, **When** se busca el servicio del mostrador, **Then** su carpeta, su servicio, su imagen y la documentación lo llaman `comercial`, y la base sigue siendo la del mostrador.
2. **E15** **Given** la máquina de cada ambiente con los scripts reinstalados, **When** llega una versión nueva, **Then** despliega `comercial`, la puerta, Procesos, las listas y la base, y queda sana.

---

### Edge Cases

- **Un archivo grande (una lista, una foto):** pasa por la puerta con el mismo tope de tamaño que hoy acepta el servidor.
- **La conexión que queda abierta (el canal de avisos y el enlace entre dispositivos):** la puerta la mantiene abierta sin cortarla por tiempo.
- **Comercial sin responder:** la puerta contesta que el servidor no responde; la web lo trata como hoy, como sin conexión.
- **Lo que viaja a cuestas en cada respuesta (la versión, decisión 157):** lo siguen mandando las respuestas de Comercial; las de Procesos no lo necesitan.

## Requirements *(mandatory)*

### Non-Functional Requirements

- **RNF-72**: La aplicación habla con el servidor por una sola puerta, que reparte cada pedido al servicio que lo atiende según su ruta y, para los servicios que no saben de sesiones, pregunta antes quién es la persona y le pasa quién es y qué puede. La puerta no tiene reglas del negocio ni datos; sumar un servicio cambia solo su configuración. Solo la puerta se publica en la máquina; los servicios aceptan pedidos solo de la puerta o de otro servicio, con el token entre servicios. Cambia RNF-50 en lo que dice de quién llama a quién.
- **RNF-73**: Cada servicio se llama igual en todos lados (carpeta, servicio, imagen y documentación) y por lo que hace: el del mostrador es **Comercial**.

### Key Entities

- **Puerta (gateway)**: el único punto de entrada del servidor; reparte por ruta y pregunta quién es la persona.
- **Comercial**: el servicio de la mercadería y la plata del local (hoy el mostrador).
- **Evento de Procesos**: lo que se hizo en Procesos, con quién, guardado en la base de Procesos.

## Success Criteria *(mandatory)*

- **SC-001**: La aplicación funciona igual que antes, por la misma dirección: las pruebas de punta a punta pasan sin cambios en la web.
- **SC-002**: Comercial no tiene código para reenviar pedidos a otro servicio.
- **SC-003**: Desde afuera de la red interna, el único servicio alcanzable es la puerta.

## Assumptions

- La puerta corre en el mismo compose y la misma máquina; su costo de memoria es chico.
- Mientras Acceso no esté separado (etapa 5), quien sabe de sesiones es Comercial: la puerta le pregunta a Comercial.
- La base del mostrador no cambia de nombre: renombrarla obligaría a recrear las bases de los dos ambientes.

## Out of Scope (por ahora)

- Auditoría y «Quién hizo qué» con todos los servicios juntos (etapa 3, 027).
- Separar Tickets (etapa 4, 028) y Acceso (etapa 5, 029).
- Límites de pedidos por minuto en la puerta.
