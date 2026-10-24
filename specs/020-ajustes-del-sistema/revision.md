# Revisión independiente: 020 Ajustes del sistema (T010, paso 7)

**Revisor:** subagente `revisor`, 2026-10-24. **Qué se revisó:** el árbol de trabajo sin confirmar
(`git status`: 32 archivos cambiados y 11 nuevos) contra `spec.md`, `plan.md` (sección «Seguridad»),
`ux.md`, `tasks.md` y las maquetas aprobadas. No se tocó código.

**Qué se corrió:** `tests/utest.sh`: api 246/246, procesos 24+58, web 605/606. La que falla
(`plataforma/busqueda/busqueda.test.ts`, «es rápida con 50.000 productos», 140 ms contra 100) no es
de este cambio: sola pasa (9/9); es una prueba de tiempo. `node tests/trazabilidad.mjs`: coincide.
`tsc --noEmit` en api y web: sin errores. Las e2e no se corrieron (lo pidió quien lanzó la revisión).
Pantallas: se compararon las capturas de `tests/capturas/salida/sistema-*.png` y
`mas-con-sistema-*.png` (hechas a las 03:32, después del último cambio del código, 03:22) con las
maquetas; no se sacaron capturas nuevas.

---

## Frena el cierre

### F1. Una sesión puede quedar recordada con lo viejo después de un cambio de acceso (carrera)

- **Dónde:** `microservices/api/src/acceso/sesiones.ts:71-87` (`buscarSesion`) junto con
  `microservices/api/src/administracion/reglas.ts:120-129` (`yOlvidarSesiones`) y
  `sesiones.ts:101-104` (`revocarSesion`).
- **Qué dice la especificación:** E03 y RF-133: lo que cambia una sesión o sus permisos desde la
  aplicación vale en el pedido siguiente. Plan, «Seguridad»: desactivar, cerrar sesiones, cambiar roles
  o permisos y salir «valen en el pedido siguiente»; «Complexity Tracking»: olvidar todo «nunca deja
  pasar algo viejo».
- **Qué hace el código:** `buscarSesion`, cuando no la tiene recordada, hace la consulta a la base
  (`await db.query`) y **después** la guarda en `recordadas`. `olvidarSesiones()` se llama recién
  cuando la transacción del cambio ya confirmó. Si un pedido de esa persona empezó su consulta antes
  de la confirmación y termina después de `olvidarSesiones()`, la consulta trae la fila vieja (en
  READ COMMITTED ve lo de antes), `recordadas.clear()` ya pasó y la fila vieja se guarda por el
  tiempo entero (hasta 10 minutos): una persona desactivada, una sesión cerrada a distancia o unos
  permisos quitados siguen valiendo ese rato. La ventana es la duración de una consulta a la base
  (con la base lejos, decenas de milisegundos), y se da justo cuando la persona está usando la
  aplicación, que es cuando más importa cortarla.
- **Gravedad:** frena el cierre: es la garantía central de la sección «Seguridad». Se arregla con
  poco, por ejemplo con un contador de «generación» que `olvidarSesiones()` incrementa y que
  `buscarSesion` compara antes de guardar: no guarda si cambió mientras consultaba.
- **Prueba:** ninguna prueba cubre la concurrencia (`sesion-recordada.test.ts` hace los pedidos uno
  detrás de otro).

### F2. Regla de «quien administra» más dura que la escrita, y la documentación de 007 no la dice

- **Dónde:** `microservices/api/src/permisos.ts:35-37` (`PARA_ADMINISTRAR` con los tres permisos),
  `microservices/api/src/administracion/datos.ts:13-19` (`quienesAdministran`: los tres a la vez) y
  `administracion/reglas.ts:22-26`, 51-56 y 105-118.
- **Qué dice la especificación:** 020, «Edge Cases»: «nunca puede quedar el sistema sin quien tenga
  "Administrar el sistema", igual que con "Administrar usuarios"». No dice que tenga que ser **la
  misma persona** con los tres permisos, ni que la regla «nadie se quita a sí mismo los permisos de
  administrar» abarque ahora «Administrar el sistema». El plan sí lo insinúa («nunca puede quedar
  ningún usuario activo que los tenga todos»), pero la regla de negocio (007 RF-75, `spec.md:430`;
  007 `data-model.md:30-32`; 007 escenarios 7 y 8 de la historia de roles, `spec.md:170-171`) sigue
  diciendo «usuarios y roles».
- **Qué hace el código:** «administra» quiere decir tener los tres permisos juntos. Consecuencias
  que nadie escribió:
  - Quien tiene «Administrar usuarios» y «Administrar roles» pero no «Administrar el sistema» ya no
    puede cambiar los permisos de **ningún** rol (`cambiarRol` siempre mira al que lo hace,
    `tocaAlActor = true`) ni cambiarse el nombre a sí mismo: recibe «No podés quitarte a vos mismo los
    permisos de administrar», que no describe lo que pasó.
  - Quitarle «Administrar el sistema» al rol propio se rechaza aunque haya otro que lo tenga.
  Hoy no se nota porque la migración 0030 le da el permiso a todos los roles con «Administrar
  usuarios»; aparece en cuanto alguien arme un rol sin él.
- **Gravedad:** frena el cierre por la regla del proyecto («ningún cambio queda solo en el código»):
  hay que decidir con Carlos si la regla es «una persona con los tres» (y escribirlo en 007 RF-75,
  data-model y escenarios 7-8, y en 020 «Edge Cases») o «alguien con cada uno» (y cambiar el código).
- **Prueba:** ninguna prueba nombra la regla del permiso nuevo: `usuarios.test.ts` y `roles.test.ts`
  programan la respuesta de `quienesAdministran`, así que pasarían igual sin `admin.sistema` en
  `PARA_ADMINISTRAR`. Tampoco hay prueba de la migración 0030.

### F3. La documentación de 007 quedó atrás sobre dónde se fijan los días del vínculo

- **Dónde:** `specs/007-usuarios-y-acceso/spec.md:427` (RF-77: «Dura los días configurados al final
  de Más → Usuarios (…; lo cambia quien tiene "Administrar usuarios"…)») y
  `specs/007-usuarios-y-acceso/ux.md:222-224` («está solo al final de Más → Usuarios, en un recuadro…,
  para quien tiene "Administrar usuarios"») y `ux.md:251` (la pestaña Usuarios: «al final, cuántos
  días dura el vínculo»).
- **Qué hace el código:** los días salieron de Usuarios (celular y computadora) y están en Más →
  Sistema con «Administrar el sistema». El escenario 15 de 007 y la tabla de permisos sí se
  actualizaron; estos tres lugares no.
- **Gravedad:** frena el cierre (T008 dice hecho «Documentación de 007 (permiso, días del vínculo,
  rutas)»): otro agente que lea 007 volvería a poner los días al final de Usuarios. Es solo texto.

---

## Defectos que se pueden anotar

### D1. Cambiar el tiempo de la sesión no olvida lo ya recordado

- **Dónde:** `microservices/api/src/sistema/reglas.ts:18-31` y `sistema/ajustes.ts:28-35`.
- **Spec:** E16: un tiempo cambiado lo usa el servidor «como mucho» en un minuto.
- **Código:** las sesiones ya recordadas conservan su `hasta` viejo: de 10 minutos a «No» (o a 30 s),
  lo recordado sigue hasta 10 minutos. Lo nuevo vale para lo que se recuerda desde ese momento.
  Bastaría con llamar a `olvidarSesiones()` al cambiar `sesion_segundos`. La prueba 020-E16
  (`sistema.test.ts`) solo mira `segundosDeSesion()`.

### D2. Escenarios con prueba incompleta o sin prueba que los nombre

| Escenario | Estado |
|---|---|
| E01, E02, E04, E05, E06 | Bien: `sesion-recordada.test.ts` los nombra y los comprueba (E04 de verdad: la sesión vencida sigue en memoria y se rechaza). |
| E03 | Parcial. La prueba cubre desactivar, cambiar el nombre de un rol, cerrar a distancia y salir, y solo comprueba que la sesión **se vuelve a buscar**, no que el pedido siguiente se rechace o traiga los permisos nuevos. No prueba cambiar los roles de una persona, cambiar los permisos de un rol (el caso que nombra el escenario) ni borrar un rol. El código lo hace igual (mismo envoltorio `yOlvidarSesiones`). |
| E07 | Bien (`PedidosDeLaCompu.test.tsx`, 6 preguntas en 5 minutos). |
| E08 | Sin prueba que nombre 020-E08; lo cubre `002-E18d` en el mismo archivo. |
| E09 | Parcial: 020-E09 prueba «vuelve la conexión»; «vuelve a la aplicación» (visibilitychange) no tiene prueba propia. El código lo hace (`PedidosDeLaCompu.tsx:41`). |
| E10 | Sin prueba que lo nombre (se deduce de E07). |
| E11 | 020-E11 prueba «aplicación oculta»; «sin emparejar» lo cubre una prueba sin nombre de escenario. |
| E12 | Bien en la pantalla (`Sistema.test.tsx`). La prueba renombrada en `celular/Negocio.test.tsx` como «020-E12» en realidad prueba que los días ya no están en Usuarios. |
| E13 | Servidor bien (`sistema.test.ts`, `roles.test.ts`). En el cliente la prueba solo mira que la entrada de Más pide `admin.sistema`, no que no se muestre a quien no lo tiene (lo hace el filtro general de Más, que tiene sus propias pruebas). |
| E14, E15 | Bien en servidor y pantalla. |
| E16 | Cliente bien (020-E16 en `PedidosDeLaCompu.test.tsx`); no hay prueba de que `sesion.tsx` pase `ajustes` de `/sesiones/actual` a `ponerAjustes` en el control de cada 30 s. Servidor: ver D1. |
| E17 | Bien. |
| E18 | Bien en el servidor; en el cliente, el valor de arranque de 60 s se usa en E07 sin nombrarlo. |

### D3. «Quién hizo qué» muestra el cambio de ajustes en crudo

- **Dónde:** `microservices/web/src/pantallas/compu/base/pantallas/Actividad.tsx:17-55` (`QUE`) y
  `84-110` (`detalleDe`).
- **Spec:** E14: queda en «Quién hizo qué» con quién, el valor anterior y el nuevo.
- **Código:** se registra bien (`sistema.ajustes_cambiados` con `antes` y `despues`), pero la pantalla
  no tiene nombre ni detalle para ese tipo: se ve «sistema ajustes cambiados», sin línea de detalle,
  y en el detalle completo «Antes: sesion segundos 60». Tampoco está en el filtro por tipo. No lo
  pude comprobar en pantalla, solo leyendo el código.

### D4. Los días se guardan 700 ms después del último − o +

- **Dónde:** `microservices/web/src/pantallas/Sistema.tsx:12` y `paso()` (líneas ~93-99).
- **Spec/ux:** «Los días se guardan al tocar − o + y al dejar el número escrito».
- **Código:** espera 700 ms y guarda una sola vez varios toques seguidos. Es razonable, pero no está
  escrito: anotarlo en el `ux.md`.

### D5. Guardar los tres a la vez no es atómico

- **Dónde:** `microservices/api/src/sistema/reglas.ts:18-31`.
- **Código:** guarda los tiempos y después los días, sin transacción. Si fallan los días, los tiempos
  ya quedaron guardados y en memoria y no se registra el evento. La pantalla siempre manda un campo por
  vez, así que solo pasa con otro cliente.

### D6. Lo recordado no se limpia si no se vuelve a usar

- **Dónde:** `microservices/api/src/acceso/sesiones.ts:58-60`.
- **Código:** una entrada vencida solo se borra cuando llega otro pedido con ese token o con un
  `olvidarSesiones()`. La memoria crece con las sesiones que dejaron de usarse hasta el próximo cambio
  de acceso. Es poco (una por sesión), pero no tiene límite.

### D7. El color de los días fuera de rango

- **Dónde:** `microservices/web/src/pantallas/configuracion.css` (`.cfg-numero.cfg-mal`, `.cfg-error`).
- **ux/maqueta:** «el número en rojo» (`maquetas/*-sistema-error.png`, borde y texto rojos).
- **Código:** usa `--p-naranja-texto-fuerte` (#a52e08), un rojo anaranjado. Se ve parecido; no lo
  comparé en una captura del estado de error.

---

## Por punto de la revisión

1. **Escenarios:** el código hace los dieciocho, con la salvedad de F1 (E03) y D1 (E16 en el
   servidor). Las pruebas: ver D2.
2. **Seguridad (plan):**
   - Datos que toca / solo en memoria con el hash como llave: hecho (`sesiones.ts:58-59`).
   - Permisos: `GET` y `PUT /sistema/ajustes` piden `admin.sistema` con 403 y el nombre del permiso
     (`rutas/sistema.ts:10`, probado); `PUT /puestos/configuracion` pasó a `admin.sistema`
     (`rutas/puestos.ts:36`, probado). Nada local en el dispositivo: hecho.
   - «Lo que no puede empeorar»: se olvida todo en `revocarSesion` (salir y cerrar a distancia) y
     después de `cambiarUsuario`, `cambiarRol` y `borrarRol` si salieron bien. Revisé los demás
     caminos que escriben `sesion`, `usuario`, `usuario_rol` y `rol_permiso`: `crearRol` y `autorizar`
     no afectan sesiones existentes; quitar un celular con huella, emparejar y `anotarDispositivo` no
     tocan lo que la sesión recordada guarda; `crear-usuario.ts` es un comando a mano (entra en el
     «cambio hecho en la base»). La sesión vencida nunca pasa (E04, probado). **Falla la carrera de
     F1.**
   - Qué entra desde afuera: tramos fijos y días enteros de 1 a 365 con Zod; lo demás 400 (probado,
     también un número como texto y el objeto vacío).
   - Que no quede sin administrar: hecho, pero más estricto que lo escrito y sin prueba real (F2).
   - Registro: hecho en el servidor; se ve mal en la pantalla (D3).
   - Un solo proceso por ambiente: es un supuesto de la spec; no comprobé la configuración del
     despliegue.
3. **Reglas inventadas:** F2 (una persona con los tres permisos, y «quitarse a sí mismo» extendido al
   permiso nuevo); D4 (espera de 700 ms). En el cliente, `ponerAjustes` ignora valores no positivos:
   protección razonable, no cambia ninguna regla.
4. **Documentación que quedó atrás:** F3 (007 RF-77 y `ux.md`), F2 (007 RF-75, `data-model.md`,
   escenarios 7-8), D4. Lo demás de 007 (`contracts/api.md`, `data-model.md` de `configuracion`, tabla
   de permisos, escenario 15) y `proyecto/estado.yml` está al día.
5. **Pantallas:** Sistema en computadora y celular, y la entrada en Más del celular, coinciden con las
   maquetas aprobadas (renglones, orden, tramos, textos largos y cortos, nota, «Volver a Más»). Los
   textos de las dos interfaces salen de `TEXTOS.sistema` y los tramos del servidor, así que el celular
   y la computadora tienen las mismas reglas; el celular omite «llega en menos de un minuto» en la
   nota, igual que su maqueta. Los estados guardado, error y sin conexión los comparé con las maquetas
   leyendo el código y las pruebas, no en capturas; D7 es la única diferencia que vi. La entrada en Más
   de la computadora no la comparé con `maquetas/compu-mas.png`.

## Correcciones (2026-10-24, después de la revisión)

- **F1, la carrera:** cada olvido suma a un contador; una búsqueda que empezó antes de un olvido
  no guarda lo que trajo. Prueba: «una búsqueda que empezó antes de un cambio no guarda lo que trajo».
- **F2, quién administra:** vuelve a la regla de la spec. Tiene que quedar alguien con «Administrar
  usuarios» y «Administrar roles», como antes, y aparte alguien con «Administrar el sistema»; no
  hace falta que sea la misma persona, y «nadie se quita a sí mismo» vale solo para los dos de
  siempre. Escrito en 007 (RF-75, escenario 7, data-model). Prueba nueva en `roles.test.ts`.
- **F3:** RF-77 y `ux.md` de 007 ponen los días del vínculo en Más → Sistema.
- **D1:** cambiar el tiempo de la sesión olvida lo recordado. En la prueba de E03.
- **D2:** E03 suma cambiar los permisos de un rol, borrar un rol, cambiar el tiempo y que una
  persona desactivada no pase; E08 y E10 nombrados; E09 con «vuelve a la aplicación»; E16 con la
  prueba en `sesion.test.tsx`.
- **D3:** «Quién hizo qué» en la computadora lo llama «Cambio en los ajustes del sistema», con su
  línea (de cuánto a cuánto) y su filtro. Prueba en `Actividad.test.tsx`. El celular muestra todos
  los tipos de evento en crudo desde antes; no es de este cambio.
- **D4 y D7:** escritos en el `ux.md` (los 700 ms y el color de error de la paleta, que no tiene rojo).
- **D5:** anotado como defecto en `proyecto/estado.yml`.
- **D6:** lo vencido se barre cuando lo recordado llega a 500 sesiones.
- **La migración 0030:** en la base de las e2e, el rol que tiene «Administrar usuarios» (Administrador) recibió «Administrar el sistema».
