# Feature Specification: Usuarios y acceso

**Feature Branch**: `007-usuarios-y-acceso`

**Created**: 2026-10-10

**Status**: Baseline

**Input**: Línea de base: lo construido antes de adoptar Spec Kit (docs/REQUERIMIENTOS.md, secciones 2 y 3.6)

## Clarifications

### Session 2026-10-09

- Q: ¿Cómo se dan los permisos? → A: Por rol: Administrador, Vendedor y Comprador, combinables en un mismo usuario. Los actores (Dueño, Empleado, Cliente, Proveedor) son las personas reales y se usan solo donde el rol no alcanza para describir el proceso (decisión 8; RF-72, issue #59, todavía sin construir).
- Q: ¿Se sigue entrando en la computadora leyendo un QR con el celular? → A: No, se quita: se entra con Google o con la huella (decisión 10; RF-70).
- Q: «Quién hizo qué» figuraba «Hecho», ¿lo está? → A: No del todo: pasa a «Hecho en parte». Está la consulta de a 10 por página; filtrar por usuario, fecha y tipo de acción es el issue #58 (decisión 12; RF-71).

## User Scenarios & Testing *(mandatory)*

En las historias se nombra el rol de la sección 2 del documento. Hasta que se construya
RF-72, **Administrador** es quien hoy tiene el rol «dueño» o «admin», y **Vendedor** y
**Comprador** son quien hoy tiene el rol «mostrador» (ver «Actores y roles»).

### User Story 1 - Entrar solo si estás autorizado (Priority: P1)

Cualquier usuario (Administrador, Vendedor o Comprador) abre la app y entra con su cuenta
de Google, sin contraseña. Si su correo no fue autorizado, no entra y la pantalla se lo
dice. Una vez adentro, el dispositivo recuerda la sesión y no vuelve a pedir nada.

**Why this priority**: sin esto no se puede usar nada más, y es lo que impide que un
extraño vea costos, márgenes y ventas.

**Independent Test**: abrir la app sin sesión y ver la pantalla de entrada; abrirla con
una sesión válida guardada y ver que entra directo con el nombre y el rol arriba.

**Acceptance Scenarios**:

1. **Given** un dispositivo sin sesión guardada, **When** se abre la app, **Then** se ve «Entrá con tu cuenta de Google.» y no hay ningún botón para entrar con un código QR.
   - Prueba: tests/e2e/celular/01-login.spec.ts, tests/e2e/escritorio/01-login.spec.ts
2. **Given** un dispositivo con una sesión válida guardada, **When** se abre la app, **Then** entra directo, sin pasar por Google, y muestra el nombre del usuario y su rol («Dueño E2E · dueño»).
   - Prueba: tests/e2e/celular/01-login.spec.ts, tests/e2e/escritorio/01-login.spec.ts
3. **Given** un correo de Google autorizado y activo, **When** el usuario toca el botón de Google y Google confirma la cuenta, **Then** se abre una sesión en ese dispositivo y queda anotado el inicio de sesión con el medio «google».
   - Prueba: ninguna (el botón de Google no se puede automatizar; el comportamiento está en microservices/gestion-del-local/src/rutas/sesiones.ts)
4. **Given** un correo de Google que nadie autorizó, o el de un usuario desactivado, **When** entra con Google, **Then** no se abre sesión y la pantalla de entrada muestra «<correo> no está autorizado. Pedile al dueño que te dé de alta.».
   - Prueba: ninguna (mismo motivo; mensaje en microservices/gestion-del-local/src/rutas/sesiones.ts, se muestra en la pantalla de entrada de cada interfaz)
5. **Given** un pedido de entrada sin la credencial de Google, o con una que Google no reconoce, **When** llega a la API, **Then** responde 400 o 401 respectivamente y no abre sesión.
   - Prueba: tests/integration/autenticacion.sh
6. **Given** una llamada a la API sin token o con un token que no corresponde a una sesión vigente, **When** pide cualquier dato, **Then** la API responde 401 «Hay que iniciar sesión».
   - Prueba: tests/integration/autenticacion.sh, microservices/gestion-del-local/src/rutas/credenciales.test.ts
7. **Given** las rutas del viejo login por QR (`/sesiones/vinculaciones`), **When** alguien las llama, **Then** la API responde 404: ya no existen.
   - Prueba: microservices/gestion-del-local/src/rutas/sesiones.test.ts
8. **Given** un dispositivo con sesión guardada y sin internet, **When** se recarga la app, **Then** abre igual y deja buscar productos, sin volver a la pantalla de entrada.
   - Prueba: tests/e2e/celular/08-sin-conexion.spec.ts, tests/e2e/escritorio/08-sin-conexion.spec.ts

---

### User Story 2 - Autorizar a alguien y administrar los usuarios (Priority: P1)

El Administrador ve quién puede entrar, autoriza a alguien cargando su nombre y su correo
de Google con un rol, le cambia el rol y lo desactiva o reactiva. El Administrador con rol
«admin» hace lo mismo, salvo sobre los usuarios «dueño».

**Why this priority**: autorizar un correo es la única forma de que alguien más entre, y
desactivarlo es la forma de dar de baja a un empleado.

**Independent Test**: con un usuario «admin» y otro «dueño» cargados, entrar como admin,
autorizar un mostrador nuevo y comprobar que la fila del dueño no se puede tocar ni desde
la pantalla ni llamando a la API.

**Acceptance Scenarios**:

1. **Given** un Administrador con sesión, **When** abre Negocio (celular) o Administración (computadora), **Then** ve la lista de usuarios autorizados con su propio correo.
   - Prueba: tests/e2e/celular/01-login.spec.ts, tests/e2e/escritorio/01-login.spec.ts
2. **Given** un Administrador en esa pantalla, **When** carga nombre, correo de Google y rol y toca «Autorizar», **Then** el usuario nuevo aparece en la lista.
   - Prueba: tests/e2e/celular/13-admin.spec.ts, tests/e2e/escritorio/13-admin.spec.ts, tests/integration/autenticacion.sh
3. **Given** un alta hecha por un Administrador, **When** se consulta el registro de eventos, **Then** hay un evento «usuario.creado» con el usuario que la hizo.
   - Prueba: tests/integration/autenticacion.sh
4. **Given** un correo que ya está cargado, **When** se lo intenta autorizar de nuevo, **Then** la API responde 409 y no lo duplica.
   - Prueba: tests/integration/autenticacion.sh
5. **Given** un alta con un correo sin arroba, **When** llega a la API, **Then** responde 400.
   - Prueba: microservices/gestion-del-local/src/rutas/usuarios.test.ts
6. **Given** un usuario con rol «mostrador», **When** pide la lista de usuarios, **Then** la API responde 403.
   - Prueba: microservices/gestion-del-local/src/rutas/usuarios.test.ts, tests/integration/autenticacion.sh
7. **Given** un Administrador con rol «admin», **When** abre el alta de usuarios, **Then** el selector de rol no ofrece «dueño», y puede autorizar un «mostrador» o un «admin».
   - Prueba: tests/e2e/celular/13-admin.spec.ts, tests/e2e/escritorio/13-admin.spec.ts, microservices/gestion-del-local/src/rutas/usuarios.test.ts, clientes/gestion-del-local-web/src/pantallas/Negocio.test.tsx
8. **Given** un Administrador con rol «admin» y un usuario «dueño» en la lista, **When** mira la fila del dueño, **Then** su selector de rol está deshabilitado y en lugar del botón dice «solo el dueño».
   - Prueba: tests/e2e/celular/13-admin.spec.ts, tests/e2e/escritorio/13-admin.spec.ts, clientes/gestion-del-local-web/src/pantallas/Negocio.test.tsx, clientes/gestion-del-local-web/src/escritorio/pantallas/Administracion.test.tsx
9. **Given** un Administrador con rol «admin», **When** llama directo a la API para crear un dueño, desactivar a un dueño o darle el rol de dueño a otro, **Then** las tres responden 403 y nada cambia en la base.
   - Prueba: tests/e2e/celular/13-admin.spec.ts, tests/e2e/escritorio/13-admin.spec.ts, microservices/gestion-del-local/src/rutas/usuarios.test.ts
10. **Given** un Administrador con rol «admin», **When** le cambia el rol a un «mostrador» por «admin», **Then** el cambio se guarda.
    - Prueba: microservices/gestion-del-local/src/rutas/usuarios.test.ts
11. **Given** un Administrador (dueño o admin), **When** intenta desactivarse o cambiarse el rol a sí mismo, **Then** la API responde 400 «No podés desactivarte ni cambiarte el rol a vos mismo».
    - Prueba: microservices/gestion-del-local/src/rutas/usuarios.test.ts
12. **Given** un usuario con sesiones abiertas, **When** un Administrador lo desactiva, **Then** se le cierran todas las sesiones.
    - Prueba: microservices/gestion-del-local/src/rutas/usuarios.test.ts
13. **Given** un usuario desactivado, **When** un Administrador toca «Reactivar», **Then** vuelve a quedar activo y puede entrar de nuevo.
    - Prueba: ninguna (botón en clientes/gestion-del-local-web/src/pantallas/Negocio.tsx y escritorio/pantallas/Administracion.tsx; ruta en microservices/gestion-del-local/src/rutas/usuarios.ts)

---

### User Story 3 - Entrar con la huella del celular (Priority: P2)

Cualquier usuario vincula su celular a su cuenta una vez y desde entonces entra con la
huella, sin Google. La app se lo ofrece sola la primera vez que entra con Google desde un
celular; también se vincula y se quita a mano.

**Why this priority**: es más rápido que Google en el mostrador, pero Google alcanza para
entrar; por eso va después.

**Independent Test**: con un autenticador virtual (huella simulada), aceptar la oferta,
salir, entrar con la huella, quitar el celular y comprobar que la huella ya no entra.

**Acceptance Scenarios**:

1. **Given** un celular con huella que acaba de entrar con Google y al que nunca se le ofreció, **When** se abre la app, **Then** sube una hoja «¿Entrar con la huella?»; al tocar «Sí, usar la huella» dice «Listo» y el celular aparece en «Mis celulares con huella».
   - Prueba: tests/e2e/celular/01-login.spec.ts, clientes/gestion-del-local-web/src/componentes/OfrecerHuella.test.tsx
2. **Given** un celular al que ya se le ofreció (aceptó o tocó «Ahora no»), **When** se vuelve a abrir la app, **Then** no se le ofrece de nuevo.
   - Prueba: tests/e2e/celular/01-login.spec.ts, clientes/gestion-del-local-web/src/componentes/OfrecerHuella.test.tsx
3. **Given** una computadora que acaba de entrar con Google, aunque tenga huella, **When** se abre la app, **Then** la oferta no aparece.
   - Prueba: tests/e2e/escritorio/01-login.spec.ts, clientes/gestion-del-local-web/src/componentes/OfrecerHuella.test.tsx
4. **Given** un celular que no acaba de entrar con Google, o que no tiene huella, **When** se abre la app, **Then** la oferta no aparece.
   - Prueba: clientes/gestion-del-local-web/src/componentes/OfrecerHuella.test.tsx
5. **Given** la oferta en pantalla, **When** el usuario acepta y el teléfono no lee la huella, **Then** la hoja avisa que se puede vincular después desde Negocio y la oferta no queda marcada como hecha.
   - Prueba: clientes/gestion-del-local-web/src/componentes/OfrecerHuella.test.tsx
6. **Given** un usuario con sesión en un dispositivo con huella, **When** toca «Vincular este celular con mi huella» y le pone un nombre, **Then** ve «"Celular E2E" entra con la huella desde ahora», el celular queda en su lista y en la base hay una credencial activa con solo la clave pública.
   - Prueba: tests/e2e/celular/01-login.spec.ts, tests/e2e/escritorio/01-login.spec.ts, microservices/gestion-del-local/src/rutas/credenciales.test.ts
7. **Given** un celular vinculado y sin sesión, **When** el usuario toca «Entrar con la huella», **Then** entra sin Google y queda anotado un inicio de sesión con el medio «huella».
   - Prueba: tests/e2e/celular/01-login.spec.ts, tests/e2e/escritorio/01-login.spec.ts, microservices/gestion-del-local/src/rutas/credenciales.test.ts
8. **Given** un celular vinculado, **When** el usuario lo quita desde su lista y después intenta entrar con la huella, **Then** no entra y la pantalla dice que el celular «no está vinculado».
   - Prueba: tests/e2e/celular/01-login.spec.ts, tests/e2e/escritorio/01-login.spec.ts, microservices/gestion-del-local/src/rutas/credenciales.test.ts
9. **Given** un pedido de vinculación o de entrada con huella, **When** se reusa el mismo desafío, se manda uno que no existe o uno pedido por otro usuario, **Then** la API responde 400 y no vincula ni abre sesión.
   - Prueba: microservices/gestion-del-local/src/rutas/credenciales.test.ts
10. **Given** un celular vinculado a un usuario desactivado, o una firma que no verifica, **When** intenta entrar con la huella, **Then** la API responde 403 o 401 respectivamente.
    - Prueba: microservices/gestion-del-local/src/rutas/credenciales.test.ts
11. **Given** varios usuarios con celulares vinculados, **When** cada uno abre su lista, **Then** ve solo los suyos; quitar el de otro solo lo puede hacer un Administrador.
    - Prueba: microservices/gestion-del-local/src/rutas/credenciales.test.ts

---

### User Story 4 - Ver las sesiones abiertas y cerrarlas (Priority: P2)

El Administrador ve en qué dispositivos hay sesiones abiertas y cierra cualquiera a
distancia. Cualquier usuario sale de la suya con «Salir».

**Why this priority**: es la respuesta a un celular perdido o a una computadora que quedó
abierta; no hace falta para el día a día.

**Independent Test**: con un usuario con dos sesiones («esta computadora» y «otro
celular»), cerrar la otra y ver que desaparece; cerrar la propia y ver la pantalla de
entrada.

**Acceptance Scenarios**:

1. **Given** un Administrador con dos sesiones abiertas, **When** toca «Cerrar» en la fila del otro dispositivo, **Then** esa fila desaparece, la propia sigue y en la base esa sesión queda revocada.
   - Prueba: tests/e2e/celular/12-cerrar-sesion.spec.ts, tests/e2e/escritorio/12-cerrar-sesion.spec.ts
2. **Given** la lista de sesiones, **When** el Administrador la mira, **Then** la suya dice «esta sesión» y su botón «Cerrar» tiene otro color que los demás (coral en el celular; rojo contra azul en la computadora).
   - Prueba: tests/e2e/celular/12-cerrar-sesion.spec.ts, tests/e2e/escritorio/12-cerrar-sesion.spec.ts, clientes/gestion-del-local-web/src/pantallas/Negocio.test.tsx, clientes/gestion-del-local-web/src/escritorio/pantallas/Administracion.test.tsx
3. **Given** un Administrador en la lista de sesiones, **When** toca «Cerrar» en la suya, **Then** vuelve a la pantalla de entrada, el token ya no está en el dispositivo y recargar no vuelve a entrar.
   - Prueba: tests/e2e/celular/12-cerrar-sesion.spec.ts, tests/e2e/escritorio/12-cerrar-sesion.spec.ts
4. **Given** un usuario con sesión, **When** toca «Salir», **Then** vuelve a la pantalla de entrada y en la base la sesión queda revocada; ese token ya no sirve (401).
   - Prueba: tests/e2e/celular/12-cerrar-sesion.spec.ts, tests/e2e/escritorio/12-cerrar-sesion.spec.ts, tests/integration/autenticacion.sh
5. **Given** un usuario con rol «mostrador», **When** pide la lista de sesiones o intenta cerrar la de otro, **Then** la API responde 403.
   - Prueba: ninguna (lo exige microservices/gestion-del-local/src/rutas/sesiones.ts)
6. **Given** una sesión abierta, **When** pasan 90 días sin usarla, **Then** vence; cada uso la extiende otros 90 días (como mucho una vez por hora).
   - Prueba: ninguna (microservices/gestion-del-local/src/sesiones.ts)
7. **Given** un dispositivo cuya sesión se cerró a distancia, **When** hace su próxima llamada a la API y recibe 401, **Then** borra el token y vuelve solo a la pantalla de entrada.
   - Prueba: ninguna (clientes/gestion-del-local-web/src/api.ts y sesion.tsx)

---

### User Story 5 - Saber quién hizo qué (Priority: P3)

El Administrador abre el registro de acciones (CU-13) y lo recorre de a 10 por página:
cuándo, quién, qué y el detalle.

**Why this priority**: sirve para revisar después; no frena el mostrador.

**Independent Test**: con 24 acciones registradas, abrir «Quién hizo qué» y ver «Página 1
de 3 · 24 acciones», avanzar y retroceder.

**Acceptance Scenarios**:

1. **Given** un Administrador y 24 acciones registradas, **When** abre «Quién hizo qué», **Then** ve las 10 más recientes, «Página 1 de 3 · 24 acciones», el detalle de cada una cortado a 120 caracteres y «← Anteriores» deshabilitado.
   - Prueba: clientes/gestion-del-local-web/src/pantallas/Negocio.test.tsx, clientes/gestion-del-local-web/src/escritorio/pantallas/Administracion.test.tsx, microservices/gestion-del-local/src/rutas/auditoria.test.ts
2. **Given** el registro abierto, **When** el Administrador toca «Siguientes →» y «← Anteriores», **Then** cambia de página y en la última «Siguientes →» queda deshabilitado.
   - Prueba: clientes/gestion-del-local-web/src/pantallas/Negocio.test.tsx, clientes/gestion-del-local-web/src/escritorio/pantallas/Administracion.test.tsx
3. **Given** un pedido del registro con un número de página que no es un número, **When** llega a la API, **Then** devuelve la primera página.
   - Prueba: microservices/gestion-del-local/src/rutas/auditoria.test.ts
4. **Given** un usuario con rol «mostrador», **When** pide el registro, **Then** la API responde 403; un «admin» lo ve.
   - Prueba: microservices/gestion-del-local/src/rutas/auditoria.test.ts, tests/integration/autenticacion.sh
5. **Given** una acción de esta capacidad (autorizar un usuario, vincular un celular, entrar con la huella), **When** se hace, **Then** queda un evento con su tipo y el usuario que la hizo.
   - Prueba: tests/integration/autenticacion.sh, microservices/gestion-del-local/src/rutas/credenciales.test.ts, tests/e2e/celular/01-login.spec.ts

---

### Edge Cases

- **Dos dueños.** Nadie puede desactivarse ni cambiarse el rol a sí mismo, pero un dueño sí puede desactivar o bajar de rol a otro dueño. No hay control de «último dueño»: la garantía de que nunca falte un Administrador es parte de RF-72 y no está construida.
- **Admin y sesiones de un dueño.** El admin no puede tocar el usuario de un dueño, pero sí cerrarle una sesión o quitarle un celular vinculado: esas rutas solo piden que administre.
- **Usuario desactivado con celular vinculado.** La credencial no se revoca al desactivarlo, pero la huella no lo deja entrar (403) mientras esté desactivado.
- **Demasiados intentos.** Entrar con Google admite 10 intentos por minuto y entrar con la huella 20, por dirección IP; pasado eso la API responde 429 «Demasiados intentos; esperá un minuto». Sin prueba.
- **Desafío de huella.** Vale 5 minutos y un solo uso, y vive en la memoria del proceso: si la API se reinicia en el medio, hay que tocar de nuevo.
- **Sin conexión.** Una sesión guardada se da por válida aunque el servidor no responda; si al reconectar el servidor contesta 401, la app vuelve a la pantalla de entrada.
- **Tableta o celular acostado.** La interfaz se elige por el ancho de la pantalla (900 px) y la oferta de huella por el tipo de dispositivo (Android, iPhone o iPad). La oferta solo está puesta en la interfaz de celular, así que un iPad ancho entra a la de computadora y no la ve.
- **Mostrador en la computadora.** «Mis celulares con huella» está dentro de Administración, que en la computadora solo ve quien administra: un usuario «mostrador» no tiene desde dónde vincular ni quitar su huella en esa interfaz. En el celular la ve cualquiera, en Negocio.
- **Primer usuario.** El primer dueño se crea con un comando en el servidor (`crear-usuario`); ese evento queda sin usuario y en el registro figura como «sistema».
- **Dominio.** La huella queda atada al dominio del cliente web: si cambia, hay que vincular los celulares de nuevo.

## Requirements *(mandatory)*

### Actores y roles

**Lo que dice el documento (sección 2).** Roles y actores son cosas distintas.

| Rol | Qué puede hacer según el documento |
|---|---|
| Administrador | Todo lo de administrar: crear usuarios, asignar roles, cerrar sesiones, ver quién hizo qué, ver cómo va el negocio |
| Vendedor | Vender y registrar las ventas |
| Comprador | Recibir la mercadería y registrarla |

Son tres y un usuario puede tener varios. El documento dice que hoy el único empleado
tiene los tres.

| Actor | Quién es | Usa el sistema |
|---|---|---|
| Dueño | Administra la ferretería a distancia y decide precios, márgenes y prioridades | Sí, con el rol Administrador |
| Empleado | Atiende el local | Sí, con los roles que se le asignen |
| Cliente | Quien compra; unos 20 son importantes, con cuenta corriente | No, no tiene rol |
| Proveedor | Unos 50; mandan listas de precios | No, no tiene rol |

**Lo que hay construido.** Los roles Administrador, Vendedor y Comprador no existen en el
código: son RF-72 (issue #59, abierto). Rigen los roles de RF-73, y cada usuario tiene
**uno solo** (columna `usuario.rol`), así que nadie puede tener «los tres roles» como dice
la sección 2.

| Rol de hoy | Equivale a | Qué le deja hacer el código |
|---|---|---|
| dueño | Administrador | Todo |
| admin | Administrador | Lo mismo que el dueño, salvo crear usuarios dueño, modificar o desactivar a un dueño y dar ese rol |
| mostrador | Vendedor y Comprador juntos | Todo lo que no figura abajo como «solo quien administra» |

Qué exige la API en cada grupo de rutas (`microservices/gestion-del-local/src/rutas/`):

| Rutas | Exige |
|---|---|
| `POST /sesiones/google`, `POST /credenciales/login/opciones`, `POST /credenciales/login`, `GET /health`, `GET /fotos/…` | Nada (son la puerta de entrada; las tres primeras con límite de intentos) |
| `/usuarios/*`, `GET /sesiones`, `DELETE /sesiones/:id`, `GET /auditoria` | Sesión y rol dueño o admin |
| `/equivalencias/*` (duplicados), `POST /proveedores`, `PATCH /proveedores/:id` | Sesión y rol dueño o admin (capacidades de catálogo y listas) |
| `GET` y `DELETE /sesiones/actual`, `/credenciales` (las propias), `/puestos/*` | Sesión, cualquier rol |
| `/ventas`, `/productos`, `/listas`, `/compras`, `/stock`, `/sectores`, `/conteos`, `/clientes`, `/consultas`, `GET /proveedores` | Sesión, cualquier rol |

Diferencias entre la sección 2 y el código:

- **Vender y comprar no se distinguen.** Cualquier usuario con sesión vende, registra compras, cuenta stock, carga y aplica listas y elige márgenes. No hay nada que separe al Vendedor del Comprador.
- **«Ver cómo va el negocio» no es solo del Administrador.** Las ventas del día y los gastos de la semana (`GET /ventas`, `GET /compras/semana`) las puede pedir cualquier rol, y la pantalla Negocio del celular las muestra a todos. Lo único que se le esconde al mostrador es el botón «Hoy» de Vender en el celular, y eso lo decide la pantalla, no la API.
- **Lo que solo ve quien administra en las pantallas:** usuarios, sesiones y quién hizo qué; en la computadora, además, las entradas de menú «Duplicados» y «Administración» y el alta de proveedor en Listas.

Preguntas abiertas de la sección 9 que tocan esta capacidad:

- [NEEDS CLARIFICATION: qué rol puede cargar listas de precios, elegir márgenes, contar stock, unir duplicados, ver costos, ver las ventas del día y anular ventas (RF-72, #59). Hoy lo hace cualquiera con sesión, salvo unir duplicados, que exige administrar. Los casos de uso ponen listas, conteo y pedidos en el Comprador como propuesta sin confirmar.]
- [NEEDS CLARIFICATION: el dueño habló de cinco actores y nombró cuatro (Dueño, Empleado, Cliente, Proveedor); falta saber cuál es el quinto o si son cuatro.]

### Functional Requirements

- **RF-70**: Solo entran usuarios autorizados, con su cuenta de Google o con la huella del celular; no hay contraseñas ni códigos QR. Se autoriza a alguien cargando su correo de Google desde la app; quien no está autorizado ve que no lo está. Construido entero. Sin prueba automática quedan la entrada correcta con Google y el mensaje «no está autorizado» (escenarios 3 y 4 de la historia 1): el botón de Google no se puede automatizar.
- **RF-70b**: Un usuario vincula su celular a su cuenta para entrar con la huella, sin Google. La app lo ofrece sola la primera vez que se entra con Google desde un celular, una sola vez por dispositivo, y nunca en la computadora; también se vincula y se quita a mano desde Negocio (celular) o Administración (computadora). Construido entero.
- **RF-71** (la parte hecha): cada acción registrada queda con el usuario que la hizo, y quien administra la consulta de a 10 por página, de la más reciente a la más vieja, con el total de acciones. **No está hecho** filtrar por usuario, fecha y tipo de acción en las pantallas (issue #58).
- **RF-73**: Hasta que llegue RF-72 hay tres roles y cada usuario tiene uno solo: «dueño» (todo), «admin» (igual al dueño, salvo crear, modificar o desactivar usuarios dueño, o dar ese rol) y «mostrador» (vende, compra, cuenta y carga listas, pero no administra usuarios, sesiones, quién hizo qué, proveedores ni duplicados). Nadie puede desactivarse ni cambiarse el rol a sí mismo. Desactivar a un usuario le cierra las sesiones.
- **RF-74**: Quien administra ve las sesiones abiertas, con el usuario, el dispositivo y el último uso, y cierra cualquiera a distancia. Cerrar la propia, o tocar «Salir», vuelve a la pantalla de entrada.

### Key Entities *(include if feature involves data)*

- **Usuario**: quién puede entrar. Correo de Google (único), nombre, un rol (dueño, admin o mostrador) y si está activo. No se borra: se desactiva.
- **Sesión**: un dispositivo en el que un usuario está adentro. Guarda el dispositivo, el último uso, cuándo vence y si se cerró. Del token solo se guarda una huella digital (hash), así una copia de la base no sirve para entrar.
- **Credencial**: un celular vinculado para entrar con la huella. Pertenece a un usuario; guarda la clave pública, un contador que detecta copias, el nombre del celular y si se quitó.
- **Evento**: una acción registrada: qué pasó, cuándo, quién la hizo y el detalle. Solo recibe filas nuevas.
- **Vinculación**: el viejo código de un solo uso para entrar en la computadora leyendo un QR. En desuso desde el 2026-10-09; la tabla queda vacía de filas nuevas.

El detalle está en [data-model.md](data-model.md).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Nadie cuyo correo no esté autorizado y activo puede ver ni cambiar un dato: toda llamada sin sesión vigente recibe 401.
- **SC-002**: Ningún usuario tiene que recordar una contraseña: las únicas formas de entrar son Google y la huella.
- **SC-003**: En un celular vinculado se entra con un solo toque («Entrar con la huella») más la huella, sin elegir cuenta ni escribir nada.
- **SC-004**: Una sesión cerrada a distancia deja de servir en la llamada siguiente de ese dispositivo.
- **SC-005**: El registro de acciones nunca muestra más de 10 por página y siempre dice cuántas hay en total.
- **SC-006**: Un usuario con rol «mostrador» no puede, ni desde la pantalla ni llamando a la API, autorizar usuarios, cerrar sesiones de otros ni ver quién hizo qué.

## Assumptions

- Dueño y empleado tienen cuenta de Google. Google tiene que estar disponible para el primer ingreso de cada dispositivo; los dispositivos que ya entraron, y los que tienen la huella vinculada, no dependen de él.
- Las sesiones duran 90 días y se renuevan con el uso; el token vive en el dispositivo. Quien tenga el navegador desbloqueado opera como ese usuario; la respuesta es cerrar la sesión a distancia (docs/SECURITY.md).
- Las pruebas de punta a punta siembran la sesión en la base en lugar de pasar por Google, y simulan la huella con el autenticador virtual de Chromium.
- El QR que vincula el celular como lector de códigos de la computadora (`puesto`, RF-08, issue #52) no es una forma de entrar y pertenece a la capacidad de catálogo; acá solo figura porque exige sesión.
- La API ya acepta filtrar el registro por usuario, tipo y fecha (`GET /auditoria?usuario=&tipo=&desde=&hasta=`), sin prueba y sin pantalla que lo use. No se cuenta como hecho: RF-71 sigue «Hecho en parte» hasta el issue #58.
- Cuando se construya RF-72 (#59), los roles dueño, admin y mostrador se reemplazan por Administrador, Vendedor y Comprador, y esta especificación se actualiza.
