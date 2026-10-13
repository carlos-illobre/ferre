# Revisión: Configuración (009)

Revisión independiente hecha el 2026-10-13, sobre los commits `987054c` (T001), `bd7f6a7`
(T002) y `f81a3a8` (T003). Se leyeron `spec.md`, `plan.md`, `tasks.md` y la maqueta; la
carpeta no tiene `ux.md`. Se corrieron las unitarias de la carpeta (17 del cliente y 10 del
servidor: pasan) y `tests/trazabilidad.mjs` (pasa). **No se corrieron las pruebas de punta a
punta ni se miró la aplicación en un navegador**: lo que depende de eso está marcado como no
comprobado.

Lo que ya figura en `proyecto/estado.yml` (RF-80, RF-81, RF-82, «defectos») no se repite.
Las rutas de código son relativas a `clientes/gestion-del-local-web/src/` salvo que digan
otra cosa.

Gravedad: **frena** = conviene resolverlo o que Carlos lo decida antes de cerrar;
**defecto** = se puede anotar en `proyecto/estado.yml` y cerrar.

## 1. Escenarios sin cumplir

1. **Buscando en el servidor, el celular deja de recibir la venta y el ingreso en espejo.
   Frena.**
   - Dónde: `catalogo.ts:186` (`completo: !enServidor`), `principal/celular/Vender.tsx:118`
     y `principal/celular/Deposito.tsx:197` (`useEspejar(…, catalogo !== null && catalogoCompleto !== false)`).
   - La especificación: E08 («todo funciona igual») y E17 (el mismo resultado que con el
     catálogo bajado). La venta y el ingreso en espejo son la decisión 60.
   - El código: con «Buscar en el servidor» el catálogo nunca queda «completo», y esa es la
     condición para aplicar lo que llega de la computadora. Lo que la computadora arma queda
     retenido para siempre (`espejo.ts:165`); el celular sí sigue avisando lo suyo. Aunque
     se aplicara, los productos del espejo se reconocen contra el catálogo en memoria, que
     en este modo no los tiene.
   - Sin prueba que lo cubra. No figura en `estado.yml`.

2. **E18: un código leído sin red se informa como «ningún producto tiene ese código».
   Frena.**
   - Dónde: `catalogo.ts:82` (`traerPorCodigo` convierte cualquier falla en «no hay»);
     lo usan `principal/celular/Catalogo.tsx:65-68`, `principal/celular/Vender.tsx:159`,
     `principal/celular/Deposito.tsx:237` y `:443`, `principal/Pedidos.tsx:190`.
   - La especificación: «si no hay conexión, lo dice».
   - El código: si la consulta falla (sin red, servidor caído, sesión vencida), Catálogo
     dice «Ningún producto tiene el código… abrilo y tocá Escanear el código para
     cargárselo», Vender ofrece asociar el código a otro producto, e Ingreso y Contar dicen
     «no está en el catálogo». Además de no cumplir E18, invita a cargarle a un producto un
     código que ya es de otro.

3. **E18: una búsqueda por texto que falla no dice nada. Defecto.**
   - Dónde: `catalogo.ts:74` (el `catch` solo permite reintentar),
     `principal/celular/Catalogo.tsx:113`.
   - El código: lo único que avisa es el indicador general de arriba, que depende de que el
     teléfono se sepa sin red. Si el teléfono cree tener red y el servidor no contesta, la
     pantalla muestra «Nada con "…". Probá con menos palabras», igual que si el producto no
     existiera. Ese mismo cartel se ve también mientras la consulta está en curso, junto a
     «Buscando en el servidor…».

4. **E18 no tiene una prueba que lo compruebe. Defecto.**
   - Dónde: `buscar-en-el-servidor.test.tsx:59-88` (el caso «E17 y E18»).
   - Solo comprueba que al final `buscandoEnElServidor` es falso; nunca que fue verdadero
     durante la consulta (la variable `enCurso` la pone la propia prueba: pasa siempre), ni
     que el cartel «Buscando en el servidor…» aparece, ni el caso sin conexión. La de punta
     a punta tampoco lo mira.

5. **E17: buscar escribiendo un código con guion, punto o barra no encuentra el producto.
   Defecto.**
   - Dónde: `microservices/gestion-del-local/src/rutas/productos.ts:28` y `:43-52`, contra
     `libraries/calculo-de-precios/src/busqueda.ts:13`.
   - La especificación: el mismo resultado que con el catálogo bajado.
   - El código: la búsqueda de la aplicación conserva `/ . , -` dentro de la palabra; la del
     servidor los convierte en separadores. Un código «AB-123» escrito en el buscador se
     encuentra con el catálogo bajado (código exacto) y no en el servidor, que pide que
     «123» sea por sí solo el comienzo de una palabra o de un código. Al revés, medidas como
     «1/2» traen de más en el servidor, y con el tope de 60 (que sí figura en `estado.yml`)
     pueden dejar afuera el producto buscado. Escanear no tiene este problema: usa el
     filtro exacto. Leído en el código, no ejecutado contra una base.

6. **E17: una sola letra o cifra no se busca en el servidor. Defecto.**
   - Dónde: `catalogo.ts:69` (`clave.length < 2`).
   - Con el catálogo bajado, «6» encuentra productos; buscando en el servidor solo se ve lo
     que ya había en memoria. Además es una regla que ningún documento pide (ver punto 3).

7. **E12: los tickets sin enviar no se cuentan ni se avisan. Defecto.**
   - Dónde: `principal/Configuracion.tsx:36` (cuenta solo la cola de cambios);
     los tickets esperan aparte (`principal/tickets.ts:16` y `:32`).
   - La especificación: avisar cuántos cambios se van a perder; su tabla nombra «ventas,
     ingresos, tickets con sus fotos».
   - El código: con solo tickets esperando, la pregunta es la genérica («Se va a borrar…
     el catálogo y lo demás») y los tickets se pierden sin que se diga.

8. **E04: con «reducir movimiento» en el teléfono, las hojas y los avisos del celular se
   siguen animando. Defecto.**
   - Dónde: `principal/celular/estilos.css:67` (solo apaga el deslizamiento entre
     pantallas); `principal/Configuracion.tsx:64` (el cartel).
   - La especificación: «no hay animaciones aunque la opción esté habilitada».
   - El código: en el celular, la hoja que sube, el aviso, el tilde del éxito y los
     renglones que aparecen no consultan esa preferencia del sistema (en la computadora sí,
     `principal/compu/base/estilos/base.css:363`). La pantalla dice «no se anima igual», que
     no es del todo cierto. La prueba de E04 comprueba solo el texto.

9. **E09: el ingreso y el pedido no dicen que se habilita en Configuración. Defecto, o
   corregir la especificación.**
   - Dónde: `principal/celular/Deposito.tsx:272` («Registrar una compra necesita
     internet»), `principal/Pedidos.tsx:163`.
   - La especificación nombra «una venta, un ingreso, un pedido, un conteo o un ticket».
   - El código: el ingreso y el pedido nunca pasaron por la cola, tampoco con el guardado
     habilitado, así que su mensaje es el de siempre. Decir «habilitalo en Configuración»
     ahí sería falso: lo que está de más es la lista de E09. La prueba de E09 cubre solo la
     venta.

10. **E05: en un navegador que no deja guardar, «Trabajar sin conexión» y «Cómo buscar
    productos» no se pueden cambiar. Defecto.**
    - Dónde: `principal/Configuracion.tsx:29` (recarga la página), `:44` y `:84`.
    - El código: esas dos opciones recargan la aplicación al cambiar; si la preferencia no
      se pudo guardar, la recarga la devuelve a su valor de arranque. No da error, pero el
      cambio no vale. E05 está escrito para las animaciones, donde sí se cumple.

11. **E08: la medición de 150 KB de la unitaria pasa siempre. Menor.**
    - Dónde: `guardado.test.tsx:40-41`. Mide el `localStorage` de la prueba, que está
      vacío. La de punta a punta (`tests/e2e/celular/08-sin-conexion.spec.ts`) sí lo mide en
      un navegador de verdad; no la corrí.

E01, E02, E03, E06, E07, E10, E11, E13, E14, E15 y E16: el código los cumple y su prueba
los comprueba. De E02 y E06, la parte «en la computadora» y «ve Configuración en Más sin
permisos» está solo en las de punta a punta, que no corrí.

## 2. Seguridad

Los cinco puntos del plan están hechos como dicen, con dos observaciones y una desactualización:

12. **Qué es «un celular» puede borrar los datos de una computadora, sin preguntar. Frena
    (o lo decide Carlos).**
    - Dónde: `guardado.ts:7-9` (menos de 900 px de ancho), `almacen.ts:55`
      (`respetarElGuardado`), `principal/main.tsx:17` y `:37` (recarga al cruzar el ancho).
    - La especificación: E13, «la computadora sigue guardando como siempre»; la pregunta
      previa de E12.
    - El código: una ventana de computadora angosta (media pantalla en una notebook de
      1366 px mide 683) pasa a ser «celular»: se recarga y, con la preferencia en su valor
      de arranque, borra toda la base, también ventas o cambios sin enviar, sin el aviso de
      E12. Al revés, un teléfono grande acostado (926 a 932 px) pasa a ser «computadora» y
      guarda el catálogo aunque la persona no lo haya habilitado; al enderezarlo se borra.
      El criterio del ancho está en el plan; esta consecuencia no está en ningún lado.
      Además el plan dice «el ancho de la ventana al abrir» y el código lo mira en cada
      consulta.

13. **Un identificador mal formado puede dar un error 500. Menor.**
    - Dónde: `microservices/gestion-del-local/src/rutas/productos.ts:58`.
    - El filtro acepta cualquier texto de 36 caracteres hechos de dígitos hexadecimales y
      guiones (por ejemplo, 36 guiones) y lo manda como `uuid`. Va como parámetro, así que
      no hay inyección; la base lo rechazaría y la consulta fallaría. No lo ejecuté contra
      una base.

14. **Con la base abierta en otra pestaña, el borrado queda pendiente. Menor.**
    - Dónde: `almacen.ts:46-49` (da por terminado el borrado también si quedó bloqueado).
    - La otra pestaña conserva la preferencia vieja en memoria y sigue usando la base hasta
      que se cierre. En un teléfono es raro.

15. **El plan dice que la funcionalidad «no llama al servidor»** (`plan.md:42`): quedó de
    la primera tarea. Hoy hay tres filtros nuevos en la consulta de productos; el punto
    anterior de la misma sección sí los cubre y están hechos como dice (piden sesión, van
    como parámetros; `productos.test.ts` lo comprueba).

## 3. Reglas inventadas

16. **Los números RF-80 y RF-81 ya eran de Mejoras y errores. Frena.**
    - Dónde: `specs/README.md:138-139` y `:151-152`; `proyecto/estado.yml:670` y `:680`
      contra `:734` y `:744`; `specs/008-mejoras-y-errores/spec.md:64-65`;
      `principal/tickets.ts:13` sigue llamando RF-80 a los tickets.
    - Dos requerimientos distintos comparten cada número. En `estado.yml` la clave está
      repetida: quien lo lea se queda con una sola (normalmente la última, la de los
      tickets), así que el tablero no ve el estado ni los defectos de Configuración para
      esos dos números. `tests/trazabilidad.mjs` no lo detecta.

17. **Comportamientos que ningún documento pide. Defecto (documentar o quitar).**
    - Cambiar «Trabajar sin conexión» o «Cómo buscar productos» recarga la aplicación
      (`principal/Configuracion.tsx:29`).
    - La búsqueda en el servidor espera 300 ms sin teclas, pide desde 2 caracteres y no
      repite una consulta ya hecha en la sesión (`catalogo.ts:67-75`); los identificadores
      se piden de a 150 (`catalogo.ts:89`).
    - Buscando en el servidor, al abrir se bajan igual los primeros 60 productos
      (`catalogo.ts:145`).
    - Sin red y sin guardado, el indicador de arriba dice «Sin conexión · no se puede
      registrar nada» (`principal/celular/componentes/EstadoDeConexion.tsx:36`).
    - Un «no llevó» sin red y sin guardado se pierde en silencio y la pantalla dice lo de
      siempre (`principal/celular/Vender.tsx:286`).

## 4. Documentación que quedó atrás

18. **La carpeta describe solo la primera tarea. Defecto.**
    - `spec.md:106`: la entidad dice «Hoy: `animaciones`»; faltan las otras dos.
    - `spec.md:115`: «el guardado para trabajar sin conexión… se sumará con su propia
      especificación», y ya está en esta.
    - `spec.md`: RF-82 está escrito antes que RF-81; el título de la historia 1 dice «en el
      celular» y E02 vale en los dos.
    - `plan.md:47`: «Pruebas: una por escenario (E01 a E06)»; son E01 a E18.
    - `tasks.md:3`: la descripción nombra solo las animaciones.
    - No hay `ux.md`, y ningún documento dice los textos de las dos opciones nuevas ni la
      pregunta de confirmación.
    - Lo del punto 17 no se puede reconstruir desde la documentación.

## 5. Pantallas

19. **La maqueta aprobada muestra solo «Animaciones». Frena según la regla del proyecto
    (lo decide Carlos).**
    - Dónde: `specs/009-configuracion/maquetas/celular-configuracion.html`;
      `principal/Configuracion.tsx:66-91`.
    - La llave «Trabajar sin conexión», las dos tarjetas de «Cómo buscar productos» y la
      pregunta de confirmación (un `confirm` del navegador, no una hoja de la aplicación)
      no tienen maqueta. La `spec.md` dice «Maquetas: Aprobadas», pero lo aprobado es la
      pantalla de la primera tarea. Tampoco hay maqueta de la computadora.

20. **Diferencias con la maqueta. Menor.**
    - La llave apagada es más oscura en el código (`principal/configuracion.css:9`,
      `#7c9085`) que en la maqueta (`#b8c2bc`).
    - El resto (tipografías, radios, textos, la nota de abajo) coincide leyendo los
      estilos. **No lo comprobé en pantalla**, ni si el «‹ Volver a Más» de la maqueta se
      ve igual.
