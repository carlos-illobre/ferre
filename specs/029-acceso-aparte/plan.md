# Plan: Acceso en su propio servicio (029)

## Contexto técnico (cómo está hoy, después de 028)

- Comercial tiene todo lo de quién es cada uno: entrar (Google, huella, la entrada con el
  celular), las sesiones, usuarios, roles y permisos, las huellas, vincular el celular con la
  computadora, la conexión entre dispositivos (el canal de cada dispositivo, ADR-030), lo apartado
  (014) y los ajustes del sistema (cuánto recuerda la sesión, cuántos días dura el vínculo). Son
  módulos que no dependen del resto del negocio: `acceso/`, `administracion/`, `apartados/`,
  `sistema/`, `avisos/`, sus rutas, contratos y datos, y el comando para crear la primera persona.
- La puerta (026) le pregunta a Comercial (`GET /sesiones/quien`) quién es la persona para Procesos,
  Auditoría y Tickets; a Comercial le pasa el pedido con el `Authorization` y Comercial busca la
  sesión por su cuenta.
- Lo que Comercial muestra con nombres de personas sale de unir con su tabla de usuarios: quién
  envió y quién cerró un pedido, y quién dejó una anomalía. Los eventos de auditoría toman el nombre
  de la misma tabla (027). Muchas tablas tienen columnas que apuntan a usuarios (quién vendió,
  cargó una lista, contó, corrigió…), con su clave foránea.
- Aceptar lo apartado repite el pedido original contra la misma aplicación, con la identidad de
  quien lo hizo; antes, revisa que sus productos no se hayan unido ni dado de baja.

## Decisiones

**Acceso es un servicio** (`microservices/acceso`, Node con Hono, puerto 8097) con su base `acceso`.
Se arma moviendo los módulos de Comercial tal como están (las mismas reglas, rutas, respuestas y
pruebas) y su propia capa de datos al 100 % contra PostgreSQL. Su base arranca nueva (Carlos): la
primera migración crea las tablas, los cinco roles de arranque y los ajustes; la primera persona se
crea con el comando de siempre, ahora en el contenedor de Acceso (E09). Todos vuelven a entrar.

**Qué atiende Acceso** (las mismas rutas de hoy, así la web no cambia): `/sesiones`, `/usuarios`,
`/roles`, `/permisos`, `/credenciales`, `/puestos`, `/canal`, `/apartados` y `/sistema`. Lleva
`GOOGLE_CLIENT_ID` y `ORIGEN_WEB` (las huellas validan el origen), sale de Comercial.

**La puerta:**

- Reparte esas rutas a Acceso **sin preguntar antes**: Acceso las atiende con o sin sesión (entrar,
  la entrada con código, el canal) y busca la sesión él mismo, como hacía Comercial.
- Todo lo demás (Comercial, Procesos, Auditoría, Tickets) pasa por `forward_auth` a
  `acceso:8097/sesiones/quien`, que devuelve `X-Usuario-Id`, `X-Usuario-Nombre` y `X-Permisos`
  (E02). La puerta borra esas cabeceras del navegador antes de todo (026). Una sesión cerrada o una
  persona desactivada da 401 en ese mismo pedido (E03).
- Si Acceso no responde, la puerta corta la conexión: la aplicación lo trata como sin conexión y
  sigue vendiendo con lo que tiene (E05). Procesos y Auditoría, que dicen con palabras que no
  responden, pueden mostrar ese mensaje en vez de cortar: es lo mismo para la persona.
- El canal (ADR-030) queda abierto mientras se usa: la puerta lo pasa en el momento
  (`flush_interval -1`).

**Comercial recibe a la persona hecha:** `exigirSesion` lee las tres cabeceras de la puerta (con el
token entre servicios) y ya no busca sesiones; `exigirPermiso` mira `X-Permisos`. Conserva la lista
de sus permisos (`permisos.ts`) solo para decir cuál falta. Sale todo lo demás de acceso: rutas,
reglas, datos, contratos, el comando, Google y el límite de intentos.

**El nombre del momento** (E10, Carlos): `pedido` suma `enviado_por_nombre` y
`cerrado_por_nombre`, y `anomalia` suma `usuario_nombre`, que se llenan al escribir con el nombre
que trae el pedido; la migración los completa con los nombres de hoy antes de borrar los usuarios.
Las columnas que apuntan a personas quedan como identificadores sin clave foránea. Los eventos de
auditoría toman el nombre de quien hace el pedido (`identidad.ts`, guardado por pedido con
`AsyncLocalStorage`), sin consultar a nadie.

**Lo apartado** vive en Acceso (E07): sube con el token de la sesión cerrada, se revisa y se decide
ahí. Aceptar repite el pedido original **directo al servicio que lo atiende** (hoy, Comercial:
`DESTINO_APARTADOS`), por la red interna, con el token entre servicios, las cabeceras de quien lo
hizo y `X-Apartado: 1`. Comercial, ante un pedido apartado, revisa antes que sus productos no se
hayan unido ni dado de baja (la regla de 014-E08 se queda donde están los productos) y contesta 409
con el mismo motivo de hoy.

**Los eventos de Acceso** van por el kit de auditoría, con las palabras que tenían en Comercial
(entradas y salidas, usuarios, roles, huellas, vínculos, ajustes, lo apartado) (E08).

**Lo que viaja a cuestas** (la versión, decisión 157) lo agregan Comercial y Acceso: los dos corren
la misma versión de imagen.

**Compose y CI:** servicio `acceso` sin puertos, `CLAVE_BASE_ACCESO` en el `.env` (y en `db`),
`AUDITORIA_URL`, `DESTINO_APARTADOS=http://comercial:8080`, la imagen en la CI y en
`imagenes-nube.sh`. La puerta no espera a Acceso para arrancar.

**Cómo se sube sin romper pruebas:** primero el servicio solo (sin conectar); el corte (compose,
puerta, Comercial sin acceso, web) va junto, después de que `CLAVE_BASE_ACCESO` esté en los `.env`
de la máquina.

## Pruebas

- Acceso: las pruebas de Comercial de entrar, sesiones, usuarios, roles, huellas, vínculo, canal,
  apartados y ajustes, mudadas; su capa de datos al 100 %; `/sesiones/quien` con las tres
  cabeceras; aceptar lo apartado repite el pedido en el destino con la identidad de quien lo hizo.
- Comercial: con las cabeceras de la puerta (sin sesiones); el nombre del momento en pedidos,
  anomalías y eventos; lo apartado con productos unidos se rechaza; no quedan tablas de personas
  (E11).
- Integración: `puerta.sh` y `autenticacion.sh` contra Acceso; `acceso.sh`: entrar, cerrar a
  distancia corta en el mismo pedido, Acceso caído corta la conexión, la primera persona con el
  comando, las tablas en la base de Acceso y no en la de Comercial.
- e2e: las de siempre, sembrando las sesiones en la base de Acceso (SC-001).

## Seguridad

- **Datos que toca:** correos, nombres, sesiones (hash del token), claves públicas de las huellas,
  roles y permisos. Viven solo en la base de Acceso; los demás servicios guardan, como mucho, el
  identificador y el nombre del momento junto con lo que se hizo.
- **Permisos:** los mismos de hoy. Acceso los exige en sus rutas; la puerta se los pasa a los demás
  en `X-Permisos`, que el navegador no puede poner (la puerta lo borra).
- **Lo que entra de afuera:** las rutas de entrar siguen con su límite de intentos por dirección
  (la puerta pasa `X-Forwarded-For`); las validaciones con Zod, como hoy.
- **Secretos:** `CLAVE_BASE_ACCESO` nueva; `GOOGLE_CLIENT_ID` pasa de Comercial a Acceso; el token
  entre servicios ya existe.
- **Quién hizo qué:** cada acción de Acceso va a Auditoría. Repetir lo apartado lleva la identidad de
  quien lo hizo y lo anota así el servicio que lo aplica.
- **Riesgo:** con el token entre servicios, cualquiera en la red interna puede decirle a un servicio
  quién es. Es lo mismo que hoy con Procesos; separar un token por servicio es T168.
