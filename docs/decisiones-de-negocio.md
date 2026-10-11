# Decisiones de negocio

Lo que Carlos decidió sobre qué tiene que hacer el sistema, por fecha. Es el par de los
[ADR](adr/README.md), que guardan las decisiones técnicas. Cada decisión está además en la
sección Clarifications de la especificación que toca (`specs/`). Una decisión nueva se
agrega acá con su fecha; las anteriores no se reescriben: si una cambia, se agrega la nueva
y se anota a cuál reemplaza.

Acá no se dice qué está hecho: eso está en `proyecto/estado.yml`. Lo que todavía no está
decidido está en [specs/preguntas-abiertas.md](../specs/preguntas-abiertas.md).

## Alcance: qué queda para una etapa posterior

- Factura electrónica de ARCA (RF-30).
- Devoluciones con reintegro o saldo a favor (RF-24b).
- Buscar un producto por foto (RF-09b): segunda versión.
- Venta online (RF-31): la arquitectura deja la puerta abierta (ADR-003), pero no se construye acá.
  Es un negocio aparte del proyecto Tienda online.
- Licenciar el sistema a otras ferreterías (RF-32).

## Decisiones del dueño

### Decisiones del 2026-10-08

1. **Buscar por foto.** En la primera versión alcanza con escanear el código de barras y
   fotografiar facturas. Encontrar un producto sin código por su foto va en la segunda (RF-09b).
2. **Devoluciones.** En esta versión no hay; sí hay cambios por otro producto (RF-24). Las
   devoluciones llegan con la venta online: reintegro o saldo a favor, según elija el
   cliente. El plazo se define entonces.
3. **Pedidos de clientes sin stock.** No se toma seña: se le dice al cliente qué día va a
   estar y se lo espera. Es el procedimiento actual y se quiere mejorar (RF-26).
4. **Pago a proveedores.** Por adelantado cuando hay descuento; si no, a 30 o 60 días (RF-56).
5. **Redondeo.** Siempre para arriba a múltiplos de $1.000, para no lidiar con vueltos (RF-19).
6. **Tamaño del catálogo.** Entre todos los proveedores puede superar los 100.000 artículos.
   Se empieza con pocos proveedores y se agregan de a poco (RF-05, RNF-08).

### Decisiones del 2026-10-09

7. **Vuelto.** No hay billetes chicos: toda venta tiene que ser múltiplo de $1.000. Además
   del precio, se redondea para arriba cada renglón de la venta (RF-19).
8. **Roles y actores.** Los permisos se dan por rol: Administrador, Vendedor y Comprador,
   combinables. Los actores (Dueño, Empleado, Cliente, Proveedor) son las personas reales y
   se usan solo donde el rol no alcanza para describir el proceso (RF-72).
9. **Dos interfaces.** La de celular queda como está. La de computadora vuelve al layout de
   tablas anterior al rediseño, con la paleta y la marca del celular (RNF-05, ADR-014).
10. **Entrar leyendo un QR.** Se quita: se entra con Google o con la huella (RF-70).
11. **Otras ferreterías.** Cada una con su instalación y su base de datos propias (RF-32).
12. **Tres funciones que son parte de sus requerimientos, no agregados:** corregir una
    venta y ver las de días anteriores (RF-23), marcar como pagada una venta a cuenta
    corriente desde la aplicación (RF-40) y filtrar quién hizo qué por usuario, fecha y
    tipo de acción (RF-71).

### Decisiones del 2026-10-10

13. **Toda la interfaz se rehace.** Carlos va a rediseñar la interfaz completa, celular y
    computadora, más adelante. Hasta entonces el código de las pantallas queda como está.
    Reemplaza la parte de la decisión 9 que decía que la interfaz de celular «queda como
    está». Qué reglas de la interfaz de hoy valen para el rediseño es una pregunta abierta.
14. **Actores.** Son cuatro: Dueño, Empleado, Cliente y Proveedor.
15. **Permisos, por ahora.** Cargar listas de precios, elegir márgenes, contar stock, unir
    duplicados, ver costos, ver las ventas del día y anular ventas son del Administrador.
    Más adelante se reparten mejor, con más roles; por ahora no importa (RF-72).
16. **Precio a mano.** Un precio puesto a mano en una venta se respeta tal cual, aunque no
    sea múltiplo de $1.000, y la venta muestra un aviso que lo dice. Reemplaza la parte de
    la decisión 7 que redondeaba también el precio a mano (RF-19, RF-20b).
17. **Etapa de los pendientes nuevos.** Corregir ventas (#56) y marcar pagada una cuenta
    corriente (#57) van en el MVP; filtrar quién hizo qué (#58) y los roles nuevos (#59),
    en Administración remota.
18. **Roles, en la primera versión.** Todos los usuarios son Administrador y el
    Administrador puede hacer todo. Está decidido que van a existir distintos roles, pero
    los otros no se usan por ahora; cuáles son y qué puede cada uno se define más adelante,
    cuando se analicen en profundidad. Reemplaza el reparto de la decisión 15 y deja en
    suspenso lo que la decisión 8 decía de Vendedor y Comprador (RF-72).
19. **El rediseño no está atado a la interfaz de hoy.** Que sean dos interfaces separadas
    que se eligen a los 900 px, las cuatro pestañas, las tarjetas, las tablas, el menú, la
    paleta, la tipografía y la marca son cómo está hecho hoy, no una regla. Lo que ata son
    los requerimientos de uso (RNF-01 a RNF-09) y los requerimientos de interfaz de cada
    capacidad. Reemplaza lo que quedaba de la decisión 9.
20. **Sin ramas.** Todo se sube directo a la rama de pruebas; no hay ramas ni pull
    requests. Confirma lo pedido el 2026-09-13 y corrige la constitución.
21. **La maqueta del celular se sube al repositorio,** como antecedente para el rediseño.
22. **Prioridad.** Ahora la prioridad es la interfaz: el rediseño de UI y UX.
23. **La notebook del local tiene Windows 11** (RNF-40).
24. **El `.env` lleva solo variables de entorno.** Lo que cambia de un ambiente a otro va
    en el `.env`; cualquier otra configuración, que no depende del ambiente, va en un
    archivo aparte (RNF-43, ADR-009).

### Decisiones del 2026-10-11

25. **Las pruebas de la interfaz quedan en pausa** hasta que Carlos elija cuál de las
    versiones publicadas (v1, v2 o v4) es la definitiva: no tiene sentido mantenerlas al
    día para una versión que puede descartarse. No corren las pruebas de las pantallas ni
    las de punta a punta; los archivos se conservan. Siguen corriendo las del servidor, las
    de la librería de precios, las de las listas de proveedores y las de la lógica del
    cliente que no es pantalla. Al elegir la versión, se reactivan las suyas y se portan
    las de punta a punta.
26. **Cada versión de la interfaz en su carpeta.** La original pasa a `/v1/`. La raíz abre
    la versión elegida en cada momento (desde la decisión 27, la 5); la lista de todas está
    en `versiones.html`.
27. **Qué gustó de cada versión, y la versión 5 que lo junta.** En el celular, la facilidad
    de uso de la versión 1; en la computadora, la de la versión 2, sobre todo el teclado y
    Alt + número para abrir cada pantalla; de la versión 4, el menú «Más» para lo que se usa
    poco; del diseño de Figma, que la venta nueva muestre lo último que se vendió y lo que
    más se vende en vez de quedar vacía. En el celular la búsqueda no toma el foco sola,
    porque abre el teclado; en la computadora sí. La paleta la eligió el agente (verde
    oscuro, naranja de acción y amarillo para destacar). La versión 5 está en `/v5/` y es
    la que abre la raíz.
28. **La versión 5 es la elegida** (2026-10-11). Ajustes pedidos al elegirla:
    - **Un solo menú, igual en el celular y en la computadora:** Catálogo, Vender, Depósito
      y Más, en ese orden, porque se busca más de lo que se vende y se vende más de lo que
      se compra. Catálogo tiene las pestañas Productos, Listas y Duplicados; Depósito tiene
      Ingreso, Stock y Contar, en ese orden; Más guarda Cómo va el negocio, Usuarios y
      sesiones, y Quién hizo qué. La app abre en lo primero del menú.
    - Lo que está elegido se tiene que seguir leyendo con el mouse encima.
    - La primera vez en un dispositivo el catálogo no se espera entero: se ve una primera
      tanda enseguida y el resto baja atrás.
    - En la entrada del celular los botones van en el centro de la pantalla, y el de Google
      tiene la misma forma que los demás.
    - El mueble donde va la mercadería se llama «estantería» en toda la aplicación y en toda
      la documentación.
29. **El logo es la F-tornillo** (2026-10-11): una F de cortes en diagonal, con las puntas
    apenas suavizadas y un poco inclinada, cuyo tronco termina en la rosca y la punta de un
    tornillo, con el brazo corto en naranja. Va dentro de un triángulo con la punta hacia
    abajo que sigue el contorno de la F a la misma distancia en los tres lados: arriba
    horizontal, a la izquierda paralelo al tronco (se probaron antes un hexágono, un triángulo
    parejo y una escuadra). Carlos la eligió entre varias
    propuestas por ser la que menos se parece a otra marca; falta buscarla en el registro de
    marcas (INPI) antes de darla por definitiva. Los archivos están en la carpeta `public`
    del cliente web (`logo-ferrebress.svg`, `icono-v5.svg` y los íconos de la app instalada).
30. **Mejoras y errores** (2026-10-11): dentro de Más hay una pantalla para avisar de un
    error o proponer una mejora, con texto y fotos o capturas. Los tickets quedan en la
    misma aplicación (no en un servicio de afuera), todos los usuarios ven todos, tienen dos
    estados (abierto y resuelto, con una nota opcional, y se pueden reabrir), y sin conexión
    se guardan en el dispositivo y se envían solos al volver (RF-80 y RF-81).
31. **Inventario sin dinero** (2026-10-11): la pantalla «Stock» pasa a llamarse
    «Inventario» y solo muestra cantidades. La va a manejar un comprador, que no tiene que
    ver sumas de dinero: el total invertido y lo invertido por proveedor se ven en «Cómo va
    el negocio». En toda la aplicación y la documentación se dice «dinero», no «plata».
32. **El número de factura no se tipea** (2026-10-11): al ingresar mercadería se sube la
    foto de la factura o del remito, y el número, o cualquier otro dato, se lee tocando la
    foto. En la computadora un botón deja que la foto la saque el celular del mismo usuario
    y aparezca sola. Que el sistema lea la foto y precargue el ingreso (RF-51) queda para
    más adelante, hasta decidir con qué se lee sin romper el costo de $0.
33. **El ambiente de prueba no se puede confundir con producción** (2026-10-11): toda la
    pantalla lleva un marco magenta que aparece y desaparece y un cartel fijo arriba que
    dice «Ambiente de prueba · nada de esto es real», también en la pantalla de entrada.
    Es para que nadie registre una venta real en pruebas. Producción no lleva nada de eso.
34. **Los gastos de la semana se ven solo en «Cómo va el negocio»** (2026-10-11): se
    sacaron del ingreso de mercadería, donde alcanza con las compras recientes.
35. **Vender en el celular: atajos y venta bien separados** (2026-10-11): lo último que se
    vendió son atajos de búsqueda, así que va pegado debajo de la búsqueda como cuatro
    cuadrados con la foto y un nombre corto, sin precio. Lo que ya está en la venta va
    aparte, bajo el título «En esta venta». Las dos partes usan las mismas tarjetas blancas
    y los mismos títulos de sección que el resto de la app (se probó con amarillo y una
    franja naranja, y desentonaba). En la computadora siguen siendo cuatro tarjetas.
36. **Colores del celular** (2026-10-11): las pantallas del celular eran blanco sobre gris
    muy claro y no se distinguían los botones ni las secciones. Ahora el fondo es un verde
    grisáceo más marcado; todo lo que se toca lleva borde o color; y cada color dice una
    cosa: verde oscuro para dónde se está (pestaña elegida) y los títulos, naranja para la
    acción principal y la parte actual del menú, amarillo para atajos, avisos y la barra de
    cobro, y blanco con borde para los botones comunes y los campos.
37. **Cobro: Efectivo viene elegido y el total va fuera del botón** (2026-10-11): en Vender,
    en el celular y en la computadora, el medio de pago arranca en Efectivo (así se nota que
    los medios se tocan) y vuelve a Efectivo después de cada venta. El total se muestra
    grande, fuera del botón «Cobrar», que solo dice «Cobrar».
38. **Vender en el celular, sin atajos y con el cobro compacto** (2026-10-11): reemplaza a la
    35 en el celular. «Lo último que se vendió» se sacó del celular porque ocupa mucho lugar
    y se toca por error; en la computadora sigue. El panel de cobro tiene dos renglones: los
    medios de pago con ícono y nombre chico debajo (como el menú de abajo), y debajo «No
    llevó», el total y «Cobrar».
39. **La pestaña «Contar» se llama «Estanterías»** (2026-10-11), en el celular y en la
    computadora. Depósito queda con Ingreso, Inventario y Estanterías.
40. **Flechas entre el menú y la pantalla, en la computadora** (2026-10-11): la flecha
    izquierda lleva el foco al menú lateral; arriba y abajo lo recorren; la flecha derecha
    (o Enter) abre lo elegido y vuelve a la pantalla, donde arriba y abajo siguen eligiendo
    sus renglones. Mientras se escribe, la izquierda mueve el cursor y solo salta al menú
    con la caja vacía o con el cursor al principio.
41. **La foto de la factura llega a la computadora con un código QR** (2026-10-11): corrige
    la 32. En el ingreso de la computadora, «Sacar la foto con el celular» muestra un código
    QR; el celular lo escanea, se abre la cámara, saca la foto y la foto aparece sola en la
    computadora. Es el mismo mecanismo que se usa para vincular el celular.
42. **El código QR sirve para cualquier foto desde la computadora** (2026-10-11): amplía la
    41. En todos los lugares de la computadora donde se pide una foto (la factura de un
    ingreso, la foto de un producto, la captura de un ticket) hay un botón «Sacar la foto
    con el celular» que usa el mismo código QR. Elegir un archivo sigue estando.
43. **Vuelven las pruebas, solo para la versión elegida** (2026-10-11): termina la pausa de
    la decisión 25. Se prueba únicamente la versión 5, que es la que abre la raíz. Las otras
    versiones siguen publicadas en su carpeta, pero no tienen pruebas. Cómo está armada la
    versión 5 y dónde vive cada cosa está en el ADR-015. Las de punta a punta también
    quedaron adaptadas a la versión 5 y corren una vez por semana y a pedido.
44. **Vender sin stock no deja el stock negativo, y queda una anomalía** (2026-10-11): si el
    stock está en cero la venta se registra igual y el stock sigue en cero (esa unidad ya no
    hay que inventariarla). En «Más» hay una pantalla nueva, «Anomalías», que es un registro
    con fecha, producto y usuario de cada inconsistencia entre el sistema y la realidad; la
    venta sin stock anota una. Las alertas sobre anomalías quedan para más adelante (RF-59).
45. **La entrada dice lo mismo en el celular y en la computadora** (2026-10-11): mismo
    título, misma explicación, los mismos tres puntos, «Entrar», la misma aclaración de que
    no hay contraseñas y la misma nota sobre quién puede entrar. Cambia solo la disposición.
    Es una sola aplicación y se tiene que notar desde la primera pantalla.
46. **La versión 5 es «la principal»; las versiones 1 a 4 son históricas** (2026-10-11): la
    que se llamó «versión 5» pasa a nombrarse la principal, o la raíz, y cuando Carlos no
    aclara de qué versión habla, habla de esa. Las versiones 1 a 4 se conservan solo para
    poder ver su maquetado: no van a producción, no se usan y no reciben ninguna
    funcionalidad nueva. La principal sigue teniendo dos juegos de pantallas, celular y
    computadora, en archivos separados: Carlos acepta ese costo porque unificarlas arriesga
    la usabilidad de alguna de las dos. Lo que sí se unifica es lo que no cambia la
    disposición (textos, reglas, cálculos), para que no haya diferencias entre una y otra.
47. **Celular y computadora: mismas reglas, mismos colores, textos que dicen lo mismo**
    (2026-10-11). Sobre la aplicación principal:
    - **Las reglas son idénticas** en las dos interfaces. Lo que una exige, lo exige la otra
      (por ejemplo, el motivo al corregir un stock es obligatorio en las dos, y lo exige
      también el servidor).
    - **Los textos dicen lo mismo.** En la computadora explican, casi como documentación de
      uso; en el celular pueden ir resumidos si no entran. Lo que no puede pasar es que digan
      cosas distintas (como pasaba en la entrada, que en una hablaba del cuaderno y en la
      otra de precios).
    - **Las ventanas de confirmación pueden ser distintas:** en el celular una ventana
      emergente molesta más que en la computadora.
    - **La paleta de colores es una sola.**
    - **La entrada del celular es mínima:** nombre, logo, una línea que dice qué hace la
      aplicación y los botones para entrar. La de la computadora puede explicar más.
    - **La aplicación abre en la raíz** y deja de llamarse «versión 5». Las versiones 1 a 4
      se publican bajo `historico/`, con un cartel que dice que no se usan. Las direcciones
      viejas (`/v5/`, `/v1/`, …) llevan solas a las nuevas.
48. **El logotipo: el isotipo hace de «F» en la palabra Ferrebress** (2026-10-11). El
    isotipo (la F-tornillo en su marco, decisión 29) no se toca. El logotipo lo pone como
    primera letra y sigue con «errebress» en la tipografía de la marca, inclinada igual que
    la F y pegada a su diagonal. Se usa donde antes iban el isotipo y el nombre al lado: el
    menú de la computadora y las dos entradas. El ícono de la app y la pestaña del navegador
    siguen siendo el isotipo solo. Todo sale de `tests/capturas/logo.py`.
49. **Mismos nombres en las dos interfaces** (2026-10-11), en aplicación de la 47: la
    pantalla se llama «Cómo va el negocio» también en la computadora (decía «Resumen»); la
    lista de quienes pueden entrar se llama «Usuarios autorizados» en las dos; y los roles se
    muestran con el mismo nombre en las dos: Administrador principal, Administrador y
    Vendedor y comprador (el celular mostraba dueño, admin y mostrador, que son los nombres
    internos). Esos tres nombres de rol todavía no los confirmó Carlos.
