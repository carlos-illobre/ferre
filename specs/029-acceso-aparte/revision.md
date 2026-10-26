# Revisión: Acceso en su propio servicio (029)

Revisor independiente (paso 7), 2026-10-26. Leí `spec.md`, `plan.md` (con «Seguridad»), `tasks.md`
y los commits c24fe1d (T003), 46a4dbf (T004), fdd26e6 (T005), c24a9a0 (T006) y 8f43c49 (T007). No
lleva maquetas. No toqué el código.

**Lo que comprobé yo mismo:** leí el código y las pruebas. Corrí `node tests/trazabilidad.mjs`, que
pasa. Probé la migración 0034 en una base descartable (`revision_029`, ya borrada): le apliqué de
0001 a 0033, cargué personas, pedidos y anomalías y después le apliqué la 0034. **No volví a correr**
las unitarias, la integración ni las e2e: tomo los resultados que me pasaron (unitarias todas,
integración 13/13, e2e 74+4 con 04-vender corregida y pasando sola). Ninguna de esas corridas la vi
yo, y el arreglo de 04-vender no lo pude ubicar en un commit aparte (el árbol de trabajo está
limpio).

## Resumen

Una observación frena el cierre, o por lo menos el pase a producción: la 0034 borra lo apartado que
esté pendiente y nadie lo decidió ni lo escribió (punto 1). Lo demás son defectos que se pueden
anotar. La seguridad está hecha como dice el plan. Cada escenario E01–E11 tiene código que lo
cumple, y casi todos tienen una prueba que lo comprueba de verdad.

---

## Ordenado por gravedad

### 1. La migración 0034 borra lo apartado pendiente y los ajustes del sistema, y eso no está escrito en ninguna parte (frena el cierre o el pase a producción)

- **Dónde:** `microservices/comercial/src/persistencia/migraciones/0034_personas_a_acceso.sql:29`
  (`DROP TABLE cambio_apartado, …`) y `:31` (`DELETE FROM configuracion WHERE clave IN
  ('vinculo.dias', 'celular.pregunta_segundos', 'sesion.recordar_segundos')`).
- **Qué dice la especificación:** que la base de Acceso arranca nueva y todos vuelven a entrar (la
  respuesta de Carlos habla de **las personas**). El caso de borde dice que los ajustes «van con
  Acceso». Nada dice que lo apartado que espera una decisión se pierda.
- **Qué hace el código:** lo apartado que nadie aceptó ni descartó todavía (ventas, ajustes de stock
  y conteos de alguien a quien desactivaron) se borra sin copiarse a Acceso. Los ajustes que haya
  puesto quien administra (cuánto se recuerda la sesión, cuántos días dura el vínculo) vuelven a los
  de arranque. `docs/operacion/DEPLOYMENT.md` («Al pasar Acceso a su servicio») nombra las personas,
  los roles, las sesiones y las huellas, pero ni lo apartado ni los ajustes.
- **Por qué importa:** lo apartado pendiente son ventas cobradas que todavía no se registraron. Al
  desplegar en producción se pierden sin aviso y no hay vuelta atrás.
- **Qué falta:** que Carlos decida (copiarlo a Acceso, o decidir todo lo pendiente antes de
  desplegar) y que quede escrito como paso del despliegue en `DEPLOYMENT.md`. Con los ajustes
  alcanza con escribirlo.

### 2. Al revisar lo apartado no aparece el nombre de un producto que se unió con otro o se dio de baja (defecto; arreglo)

- **Dónde:** `microservices/acceso/src/apartados/reglas.ts:41-49`, que llama a `GET /productos?ids=`
  de Comercial. Esa ruta sale de la copia del catálogo, que solo tiene los productos vigentes
  (`microservices/comercial/src/productos/copia.ts:172`, `vigentes.filter`, y
  `persistencia/productos.ts:53`, `WHERE p.activo AND p.reemplazado_por IS NULL`).
- **Qué dice la especificación:** 029-E07 dice «quien administra lo acepta o descarta como hoy».
  Antes, la lista sacaba el nombre de una unión con la tabla `producto`, sin filtrar por activo.
- **Qué hace el código:** un cambio apartado que apunta a un producto unido o dado de baja se lista
  con `producto: null`. Justo en esos casos quien administra necesita el nombre, porque son los que
  después Comercial rechaza (014-E08).
- **La prueba:** `microservices/acceso/src/rutas/apartados.test.ts:90` prueba con una
  respuesta de mentira de Comercial que trae el producto, así que no puede ver el problema.

### 3. La migración 0034 no tiene prueba que compruebe que completa el nombre del momento (defecto: falta prueba)

- **Dónde:** el nombre de quien hizo cada cosa se completa en
  `0034_personas_a_acceso.sql:4-8`. No hay ninguna prueba que use `enviado_por_nombre`,
  `cerrado_por_nombre` o `usuario_nombre` sobre datos que ya estaban
  (`persistencia/migrar.test.ts` solo prueba el mecanismo de migrar).
- **Lo que comprobé a mano** en la base descartable: los pedidos y las anomalías que ya estaban
  quedan con el nombre del momento (Ana y Beto, cada uno en su columna). Las claves foráneas a
  `usuario` y `sesion` de las tablas que quedan se sacan todas (no queda ninguna). Las tablas de
  personas desaparecen y no se pierde ningún dato de venta, pedido o anomalía. La migración
  funciona. Lo que falta es la prueba que lo cuide.
- Sobre `DROP TABLE codigo_escaneado`: no es una regla inventada. Esa tabla tiene una clave foránea a
  `puesto`, que impide borrar `puesto`, y el comentario lo explica.

### 4. La puerta no borra la cabecera `X-Apartado` del navegador (defecto menor)

- **Dónde:** `microservices/puerta/Caddyfile:18-21` borra `X-Usuario-Id`, `X-Usuario-Nombre`,
  `X-Permisos` y `X-Token-Servicio`, pero no `X-Apartado`. La lee
  `microservices/comercial/src/apartados/reglas.ts:94`.
- **Qué dice el plan:** que `X-Apartado: 1` es la marca que pone Acceso cuando repite lo apartado.
- **Qué hace:** cualquiera que no sea un navegador puede mandarla por la puerta. El CORS no la
  permite, así que un navegador no puede. El único efecto es que Comercial haga **una revisión más**
  (productos unidos o dados de baja) y quizá conteste 409. No da más permisos ni se saltea nada.
  Conviene borrarla en la puerta igual que las demás, para que la marca la ponga solo Acceso.

### 5. Ninguna prueba manda cabeceras de identidad falsas a Comercial a través de la puerta (defecto: falta prueba)

- **Dónde:** las pruebas con cabeceras falsas de `tests/integration/puerta.sh:50-52` van a
  `/procesos`. Comercial es el servicio que **ahora** confía en esas cabeceras (029), y no hay una
  igual contra Comercial (por ejemplo `/anomalias` con `X-Permisos: negocio.anomalias` falso y una
  sesión sin ese permiso).
- **Por qué es menor:** el borrado está al principio del sitio y vale para todas las rutas, y
  `forward_auth` es la misma configuración que en Procesos. Leyendo el Caddyfile, Comercial está
  protegido. Lo que falta es la prueba que lo demuestre.

### 6. Escenarios con prueba que no los nombra, o con un caso que falta (defecto: falta prueba)

- **029-E06** (el lector, la foto y la pausa entre el celular y la computadora, ahora desde
  Acceso): ninguna prueba nombra 029-E06. Lo cubren las e2e de siempre (`10-escaner`,
  `15-foto-con-celular`, `17-espejo`), que según me dijeron pasaron. No las corrí.
- **029-E03, «cerrada a distancia»:** está probado cerrar la sesión propia
  (`tests/integration/autenticacion.sh:53-56`) y desactivar a alguien (`acceso.sh:60-61`). Cerrar la
  sesión **de otro** (`DELETE /sesiones/:id`) y que Comercial la rechace en el pedido siguiente no
  está probado contra el stack. El camino del código es el mismo (`revocarSesion` y
  `olvidarSesiones`), así que el riesgo es bajo.
- **029-E10:** lo cubren `rutas/pedidos.test.ts`, `rutas/ventas.test.ts`,
  `autenticacion.test.ts:30` y `tests/integration/acceso.sh:53`, que prueba de verdad un cambio de
  nombre entre dos ventas. Está bien probado. Las pruebas de pedidos y anomalías no lo nombran.
- **029-E11:** se comprueba en la base (`acceso.sh:66-67`). Ninguna prueba mira el código. Revisé a
  mano y en Comercial no quedan tablas, consultas ni dependencias de personas, sesiones o roles
  (`tablas.ts` solo tiene columnas `usuario_id` y `usuario_nombre`). Queda la lista de permisos,
  que el plan permite (punto 9).

### 7. Con Acceso andando pero sin su base, o con Acceso caído, la persona no ve lo que dice E05 (defecto menor, no documentado)

- **Acceso sin base:** `/sesiones/quien` lanza un error y contesta 500
  (`microservices/acceso/src/app.ts:44-47`). La puerta pasa ese 500, con CORS, en vez de cortar la
  conexión. La aplicación muestra «Algo falló en el servidor» y no lo trata como sin conexión. No
  comprobé qué hace la aplicación con un 500 en cada pantalla.
- **Acceso caído:** `/health` pasa directo a Comercial (`Caddyfile:125-130`), y la pantalla de
  estado (`microservices/web/src/negocio/sistema/estado-del-servidor.ts:10`) dice «Servidor ok»
  mientras todos los demás pedidos se cortan.
- Ninguno de los dos casos está en el plan ni en ADR-031.

### 8. Aceptar lo apartado puede quedar «sin respuesta» aunque Comercial ya lo haya aplicado (defecto menor)

- **Dónde:** `microservices/acceso/src/apartados/reglas.ts:87-101`. El pedido a Comercial va dentro
  de la transacción de Acceso y espera hasta 30 s. Si Comercial lo aplica pero la respuesta no llega
  (se corta o vence el tiempo), lo apartado queda pendiente con el error «no respondió», y quien
  administra puede volver a aceptarlo.
- **Qué pasa al repetir:** una venta no se duplica, porque Comercial la reconoce por su id
  (`ventas/reglas.ts:36-37`). Un conteo (PUT) y un cambio de producto (PATCH) se pueden repetir sin
  efecto. Un ajuste de stock con `cantidad_real` deja otro movimiento de diferencia cero, si es que
  deja alguno; eso no lo comprobé. Antes la repetición era dentro del mismo proceso y este caso no
  existía.

### 9. Código muerto o duplicado (se puede anotar)

- `microservices/acceso/src/autenticacion.ts:78-82`: `exigirSesion` todavía acepta una
  `sesionInterna` en `c.env`. Era la forma vieja de repetir lo apartado dentro del mismo proceso
  (ADR-021) y Acceso ya no la usa. Desde la red no se puede llenar, así que no es un riesgo, pero
  sobra.
- `microservices/acceso/public/` (`index.html` y `assets/index--d_6Uqig.js`): es una copia exacta
  de `microservices/comercial/public/` que nada sirve.
- `microservices/acceso/src/permisos.ts` y `microservices/comercial/src/permisos.ts` son idénticos
  y ninguna prueba los mantiene iguales. La lista de Comercial incluye los permisos de administrar,
  que Comercial ya no exige. En vez de sacarlos, la prueba se cambió para darlos por usados
  (`microservices/comercial/src/rutas/roles.test.ts`, el conjunto `usados`). Si mañana cambia un
  nombre en Acceso, Comercial lo dice mal en el 403 sin que falle nada.
- Comercial se queda con la tabla `configuracion` vacía (y su tipo en `persistencia/tablas.ts:368`),
  sin ningún uso.

---

## Los cinco puntos del pedido

### 1. Escenarios

| Escenario | ¿El código lo cumple? | Prueba |
|---|---|---|
| E01 | Sí: las rutas de entrar están en Acceso y la puerta se las reparte (`Caddyfile:46-52`) | Rutas de Acceso mudadas (`sesiones`, `credenciales`, `entrar-con-google`); `puerta.sh:37`; `acceso.sh:44`; e2e `01-login` |
| E02 | Sí: `forward_auth` a `acceso:8097/sesiones/quien` para Comercial, Procesos, Auditoría y Tickets; Comercial lee las cabeceras y no llama a Acceso | `comercial/src/autenticacion.test.ts:14,22`; `acceso.sh:49-50` |
| E03 | Sí: Acceso responde en cada pedido y olvida lo recordado al cambiar algo | `autenticacion.sh:53-56`; `acceso.sh:60-61` (falta cerrar la sesión de otro: punto 6) |
| E04 | Sí, con las reglas mudadas tal cual | Rutas de `usuarios` y `roles` en Acceso; `acceso.sh:51,57` |
| E05 | Sí con Acceso caído (`handle_errors`, `abort`); no con Acceso sin base (punto 7) | `acceso.sh:73-81` |
| E06 | Sí: el canal está en Acceso y la puerta lo pasa en el momento (`flush_interval -1`) | Ninguna lo nombra; las e2e de siempre (punto 6) |
| E07 | Sí: se repite en `DESTINO_APARTADOS` con el token, la identidad y `X-Apartado`; Comercial rechaza los productos unidos | `acceso/src/rutas/apartados.test.ts:112,147`; `comercial/src/rutas/apartados-repetidos.test.ts`; e2e `19-para-revisar` (falla el nombre en la lista: punto 2) |
| E08 | Sí: bandeja propia con `servicio: "acceso"` | `acceso.sh:62`; `autenticacion.sh:46`; `eventos/en-palabras.test.ts` de Acceso. Entrar, salir y vincular, solo con unitarias |
| E09 | Sí: `crear-usuario.ts` en Acceso, con todos los roles | `acceso.sh:41`; `base-propia.sh` |
| E10 | Sí: `nombreDe()` con la identidad de cada pedido; columnas nuevas; la migración completa lo viejo | Ver punto 6; la migración, sin prueba (punto 3) |
| E11 | Sí en la base y en el código | `acceso.sh:66-67`; el código lo revisé a mano (punto 6) |

### 2. Seguridad (el plan, punto por punto)

- **Datos solo en Acceso:** cumplido. Comercial guarda el identificador y el nombre del momento.
- **Permisos y `X-Permisos` que el navegador no puede poner:** cumplido. La puerta borra las cuatro
  cabeceras al principio del sitio (`Caddyfile:18-21`), antes de cualquier `handle`. Falta la
  prueba contra Comercial (punto 5) y borrar `X-Apartado` (punto 4).
- **Token entre servicios:** cumplido. Acceso y Comercial lo exigen en todo menos `/health`
  (`acceso/src/app.ts:32`, `comercial/src/app.ts:40`). Se compara byte a byte. Probado en
  `puerta.sh` (026-E07 y `/sesiones/quien` sin token) y en `acceso.sh:71`.
- **Rutas sin sesión o con sesión de más:** de Comercial, antes atendían sin sesión solo `/health` y
  `/fotos/*`. El arreglo de T006 las deja pasar directo (`Caddyfile:125-130`) y está probado en
  `puerta.sh`. Revisé todas las rutas de Comercial: las demás ya exigían sesión, así que la puerta
  no bloquea ninguna que antes estuviera abierta. Las de Acceso pasan sin `forward_auth` y cada una
  exige su sesión como antes. `/sesiones/quien` se puede llamar desde afuera, pero solo devuelve los
  datos de la propia sesión; también pasaba antes.
- **Lo que entra de afuera:** el límite de intentos sigue en Acceso con `X-Forwarded-For`
  (`trusted_proxies`), y Zod igual que antes. Las rutas de lo apartado siguen atadas a sus
  expresiones (`acceso/src/apartados/esquemas.ts:6-12`), así que lo apartado no puede apuntar a
  otra ruta ni a otra dirección.
- **Secretos:** `CLAVE_BASE_ACCESO` está en el compose, en el `db`, en `.env.example` y en las
  plantillas de Oracle. `GOOGLE_CLIENT_ID` y `ORIGEN_WEB` salieron de Comercial.
- **Quién hizo qué:** cumplido (E08). Lo apartado repetido lo anota Comercial a nombre de quien lo
  hizo, y la decisión la anota Acceso a nombre de quien aceptó.
- **Riesgo del token compartido:** está como dice el plan (T168).

### 3. Reglas inventadas

No encontré reglas de negocio nuevas. Lo que el código hace sin que la documentación lo diga son
efectos de la migración (punto 1) y los casos del punto 7. `DROP TABLE codigo_escaneado` está
justificado (punto 3).

### 4. Documentación que quedó atrás

- Lo apartado y los ajustes que se pierden al desplegar no están en `DEPLOYMENT.md` (punto 1).
- Acceso sin base y la salud que dice «ok» con Acceso caído (punto 7) no están en el plan ni en
  ADR-031.
- Lo demás está al día: las enmiendas de ADR-021 y ADR-031, `DEPLOYMENT.md`, `ORACLE.md`,
  `quickstart.md` y `proyecto/estado.yml`, y `trazabilidad.mjs` pasa.

### 5. Pantallas

No lleva maquetas. Los cambios en la web son solo las importaciones de los contratos
(`@servidor/…` pasa a `@acceso/…`); no hay diferencias visibles. SC-001 (las e2e sin cambios en las
pantallas): en las e2e solo cambió dónde se siembran los datos, no lo que comprueban. Que pasen lo
sé por lo que me dijeron, no lo vi correr.

## Qué se hizo

1. Lo apartado pendiente y los ajustes que se pierden: escrito en `DEPLOYMENT.md` («Al pasar
   Acceso a su servicio»: decidir todo lo apartado y anotar los ajustes antes de desplegar, con las
   consultas para mirarlo) y anotado para Carlos (T174). Copiarlo a Acceso no tiene sentido: las
   personas no se migran (Carlos) y lo apartado apunta a ellas.
2. El nombre del producto unido o dado de baja al revisar lo apartado: T169.
3. La prueba de la migración 0034: T170.
4. La puerta borra `X-Apartado` del navegador.
5. `puerta.sh` manda cabeceras de identidad falsas a Comercial: sin sesión, 401; con sesión sin el
   permiso, 403.
6. E06 queda cubierto por las e2e de siempre (espejo, conexión, foto con el celular); E03 a
   distancia, por la e2e de cerrar la sesión de otro dispositivo; E11 en la base y a mano en el
   código. Sin cambios.
7. Acceso sin base y la salud con Acceso caído: T171.
8. Aceptar lo apartado que vence a los 30 s: T172.
9. Se sacó la rama `sesionInterna` y la carpeta `public/` de Acceso; los permisos en un solo lugar y
   la tabla `configuracion` de Comercial: T173.
