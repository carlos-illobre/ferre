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
50. **Permisos fijos y roles armados por el negocio** (2026-10-11). Reemplaza lo que las
    decisiones 8, 15 y 18 decían sobre roles.
    - Carlos describió cinco funciones: quien vende, quien encarga las compras, quien recibe
      la mercadería, quien administra usuarios y roles, y quien ve los números del negocio y
      toma las decisiones. Un usuario puede tener más de una.
    - Lo fijo son los **permisos** (quince, agrupados por parte de la aplicación). Un **rol**
      es un grupo de permisos con un nombre, y **se arma desde una pantalla**. Después se
      asigna a los usuarios.
    - El sistema arranca con cinco roles: **Vendedor, Comprador, Recepción, Administrador y
      Gerente**. La lista de permisos y qué trae cada rol está en la especificación de
      usuarios y acceso (RF-72 y RF-75).
    - El catálogo y los precios: cargar listas y unir duplicados es del Comprador; fijar el
      margen de un producto es del Gerente; quien vende puede cambiar el margen solo dentro
      de una venta. Contar estanterías y corregir el stock es de Recepción.
    - El día del cambio todos los usuarios que ya existen reciben los cinco roles.
    - Nunca queda el sistema sin una persona que pueda administrar usuarios y roles.
    - La pantalla de pedidos a proveedores, que es el trabajo propio del Comprador, se hace
      a continuación (RF-55).

51. **El código de barras se carga desde la ficha del producto** (2026-10-11). Carlos notó
    que no había dónde escanear el código de un producto en particular: solo se asociaba
    de rebote, al escanear en una venta un código desconocido. Pidió un botón para hacerlo
    y poder después buscar el producto escaneando.
    - En la ficha de cada producto se ve su código y un botón para escanearlo; en la
      computadora se tipea o se escanea con el celular vinculado.
    - Se puede buscar escaneando también en el catálogo y en el inventario del celular, y en
      los productos de la computadora con el celular vinculado.
    - Dos productos pueden tener el mismo código (el mismo artículo de dos proveedores): se
      guarda y se avisa, para unirlos como duplicados.
    - Lo puede hacer cualquier usuario con sesión (RF-08).

52. **Cómo son los pedidos a proveedores** (2026-10-11). Carlos pidió la pantalla de pedidos
    apenas terminados los roles, y contestó lo que la especificación tenía sin decidir:
    - **No hay aprobación:** quien puede encargar compras arma el pedido y lo manda.
    - **El proveedor recibe código, descripción y cantidad, sin costos.** El costo estimado
      se ve en la pantalla y no viaja en el mensaje.
    - **Un pedido enviado se puede cancelar, y uno que llegó incompleto se puede cerrar.**
    - **Primera tanda:** se manda como texto, por WhatsApp o copiándolo, y se arma desde
      cero. Correo, PDF y armarlo desde la sugerencia de «qué pedir» quedan para después.
    - Permiso nuevo, **«Encargar compras»**, que de arranque trae el rol Comprador. Con él
      los permisos pasan a ser dieciséis.
    - De las dos maquetas, Carlos eligió la **B**: la pantalla es solo el pedido y «Revisar y
      mandar» abre el mensaje para el proveedor.

53. **Tres permisos más: ver costos y anular ventas por día** (2026-10-11). Carlos contestó
    las dos preguntas que habían quedado abiertas al hacer los roles (decisión 50):
    - **«Ver costos»** es un permiso aparte. Sin él se ven los precios de venta y los
      márgenes, pero no lo que cobra cada proveedor ni cómo se llega al precio. De arranque
      lo traen Gerente, Comprador y Recepción (que carga costos al ingresar mercadería); el
      Vendedor no. Qué roles lo traen lo elegí yo: se cambia desde la pantalla Roles.
    - **Anular ventas son dos permisos:** «Anular ventas del día» (las de hoy) y «Anular
      ventas de cualquier día». El permiso que ya existía pasa a ser el del día, así que
      quien lo tenía sigue anulando las de hoy. El de cualquier día lo trae el Gerente.
    - Con esto los permisos son dieciocho.

54. **La app instalada se actualiza sin que haya que hacer nada** (2026-10-12). Carlos tenía
    la app instalada en el celular y seguía viendo la versión anterior después de cada
    cambio: el celular la deja abierta en segundo plano y solo buscaba versión nueva al
    cargarse.
    - Busca una versión nueva al abrirse, **cada vez que vuelve a primer plano** y cada
      media hora.
    - Si la encuentra recién abierta, se actualiza sola. Si ya se estaba usando, **avisa
      «Hay una versión nueva» con un botón «Actualizar ahora»** y no se recarga sola, para
      no perder una venta a medio armar.

55. **La entrada del celular sigue la disposición de una referencia de Carlos** (2026-10-12).
    Pasó una imagen y dijo que le interesaban la disposición y la posición de los elementos,
    con el logotipo y la paleta de siempre. Reemplaza la entrada mínima de la decisión 47.
    - Fondo claro. Arriba y al centro, el logotipo y la línea «Tu ferretería, en orden».
    - Las dos formas de entrar como tarjetas: primero Google, una «o», y la huella con
      «Rápido y seguro». Debajo, «Sin contraseñas. Entrá de forma simple y segura.»
    - Tres cosas que hace la aplicación, con su ícono: vendé más rápido, controlá tu stock,
      hacé crecer tu negocio.
    - Un pie con la onda de la marca, sin texto: al verla, Carlos pidió quitar la frase,
      «Hecho en Argentina» y la bandera.
    - El botón de la huella va naranja, como en la computadora.
    - En el logotipo, la F queda más pegada a «errebress» (vale para toda la aplicación).
    - El aviso de sin conexión va arriba a la derecha, solo cuando no hay conexión.
    - La entrada de la computadora no cambia.

56. **En el celular, cada parte del menú abre siempre en su primera pestaña, y al entrar se
    abre el Catálogo** (2026-10-12). A Carlos le molestaba volver a la pantalla desde la que
    había salido.
    - Al entrar, con Google o con la huella, se abre el Catálogo. La excepción es llegar
      leyendo un código QR (vincular el celular, mandar una foto), que sigue con eso.
    - Catálogo abre en Productos y Depósito en Pedidos; si la persona no puede usar la
      primera pestaña, en la primera que sí puede. Las demás pestañas se eligen arriba.

57. **A la computadora se entra con el celular, leyendo un código** (2026-10-12). Carlos pidió
    rediseñar la comunicación entre el celular y la computadora con la menor cantidad de
    pasos, empezando por la entrada: hoy «Entrar con la huella» en la computadora abre un
    diálogo de Windows que pide Bluetooth y cuatro pasos.
    - La entrada de la computadora muestra sola un código QR. Se lo lee con el celular, se
      pone la huella, y la computadora entra. Dos gestos, sin tipear.
    - **Sin paso de confirmar:** lo eligió Carlos. La huella después de leer el código es la
      confirmación. El código vence a los 5 minutos y sirve una sola vez.
    - Revierte la decisión del 2026-10-09 que había quitado la entrada por código: entonces
      era un botón más; ahora es la forma principal de entrar en la computadora.
    - La computadora ofrece «Entrar con la huella» solo si esa computadora fue vinculada.
    - Es el primer paso de un rediseño mayor: que un solo emparejamiento celular–computadora
      sirva también para escanear y para mandar fotos. Eso se especifica aparte.

58. **Un solo emparejamiento entre el celular y la computadora, que nace al entrar**
    (2026-10-12). Segundo paso del rediseño que pidió Carlos: que no haya que leer un código
    para cada cosa.
    - El celular que deja entrar a una computadora (decisión 57) queda emparejado con ella.
      Con las dos sesiones ya abiertas, se emparejan leyendo el código de Vender, como antes.
    - El emparejamiento sirve para todo: lo que el celular escanea le llega a la computadora,
      y cuando la computadora pide una foto (una factura, un producto, la captura de un
      ticket) al celular le aparece un aviso con «Sacar la foto». El código QR de la foto
      sigue en pantalla, por si el celular no está a mano.
    - **Dura 30 días** (eran 12 horas), o hasta que alguno de los dos lo suelte o cierre su
      sesión. La duración la elegí yo: Carlos no la fijó.
    - Una computadora tiene un celular emparejado a la vez, y un celular una computadora: el
      emparejamiento nuevo reemplaza al anterior.
    - En el celular, un interruptor en Vender apaga el envío de lo escaneado, para vender
      desde el celular sin que los productos aparezcan también en la venta de la computadora.
    - Un código que la computadora no recibió en 2 minutos ya no se le entrega, y la ficha de
      un producto solo toma lo que se escanea desde que empezó a esperar.

59. **El celular emparejado hace de lector cuando la computadora se lo pide** (2026-10-12).
    Carlos probó el emparejamiento y no encontró cómo buscar un producto en la computadora
    leyéndolo con el celular: había que saber que se hacía desde Vender del celular.
    - En Vender de la computadora, con el celular emparejado, «Escanear con el celular» se lo
      pide. Al celular le aparece «La computadora quiere escanear» con «Abrir el lector».
    - El lector es un modo aparte: la cámara queda abierta, lo que lee va solo a la
      computadora y no a una venta del celular.
    - Vender del celular vuelve a ser solo la venta del celular: lo que se escanea ahí ya no
      viaja a la computadora. Reemplaza el interruptor de la decisión 58.

60. **El celular y la computadora emparejados trabajan en espejo** (2026-10-12). Carlos: la
    computadora es la herramienta oficial y el celular un apoyo, por la portabilidad y la
    cámara. Con uno solo abierto, se trabaja desde ese. Con los dos abiertos y emparejados,
    van juntos.
    - **Se espeja el trabajo y la parte en la que están**, no la pantalla entera: la venta en
      curso (renglones, cantidad, unidad, margen, precio a mano, medio de pago, cliente) y la
      navegación, en las dos direcciones. Carlos había pedido espejo de todo; al ver los
      problemas (el celular dejaría de servir de cámara, la búsqueda letra por letra) eligió
      esto. El ingreso de mercadería y el pedido a proveedor se sumaron en la segunda tanda,
      el mismo día.
    - **«Pausar» además de «Desvincular».** Pausar los separa un rato; al reanudar manda la
      computadora.
    - **Solo se emparejan dos sesiones del mismo usuario.**
    - **Cada emparejamiento tiene su espejo:** lo que hace una persona con su celular impacta
      solo en su computadora, no en la de otra.
    - La «fuente de verdad» no es la computadora sino el trabajo en curso que guarda el
      servidor: si solo estaba abierto el celular y después se abre la computadora, la
      computadora se suma a lo del celular. La computadora manda cuando hay que desempatar
      (al reanudar, o si los dos arrancan a la vez).
    - Al cobrar, registrar un ingreso o mandar un pedido, se hace una vez, desde donde se
      tocó, el trabajo se vacía en los dos y el otro lo dice un momento.
    - Una venta o un ingreso a medio cargar no se pierde por ir a otra parte: al volver, los
      dos lo retoman como lo habían dejado.

61. **En la computadora todo se hace con el teclado; el mouse es un complemento**
    (2026-10-12). Carlos, probando el menú con las flechas, encontró tres fallas y pidió la
    regla general: que con las flechas y Enter se puedan ejecutar todas las operaciones.
    - Las tres fallas: con el foco en el menú, ↑ ↓ movían también la lista de productos;
      bajando desde Más no se llegaba a Desvincular ni a Salir; y con → no se entraba a las
      pestañas (Productos, Listas, Duplicados).
    - La regla: ↑ ↓ recorren los controles de la pantalla, Enter acciona, ← va al menú, →
      entra a las pestañas o sigue, Esc cierra. Las teclas significan lo mismo en todas las
      pantallas (la tabla está en los requerimientos de interfaz de la base del sistema).
    - Donde las flechas ya tenían otro uso (elegir un resultado, sumar a una cantidad, cambiar
      un selector), ese uso se mantiene y se sigue con la tecla de al lado.

62. **Desde la entrada del celular se escanea el código de la computadora** (2026-10-12).
    Carlos pidió un botón en la entrada del celular para leer el código que muestra la
    entrada de la computadora, sin tener que salir a la cámara del teléfono.
    - El botón «Escanear el código de la computadora» abre la cámara dentro de Ferrebress.
      Al leer el código queda la misma entrada de siempre, que avisa que la computadora
      entra también.
    - Reconoce solo los códigos que Ferrebress muestra para el celular (entrar a la
      computadora, vincularla, mandarle una foto); cualquier otro lo dice.
    - En la computadora, el botón de Google pasa a tener borde, sombra y el tamaño de los
      demás botones: casi no se notaba que era un botón.
    - El mismo día Carlos pidió cambiar el borde sólido por una sombra difusa, para que
      el botón parezca sobresalir de la tarjeta.


63. **El celular se vincula con la computadora sin salir de Ferrebress** (2026-10-12).
    Carlos avisó que, con la app abierta, vincular pedía salir a la cámara del teléfono y
    eso abría otra copia en el navegador.
    - En el celular, en Más, hay «Vincular con la computadora» mientras no esté vinculado:
      abre la cámara dentro de Ferrebress y lee el código que muestra la computadora.
    - Las instrucciones de la computadora nombran primero ese camino; la cámara del
      teléfono sigue sirviendo.

64. **En el celular, cada pantalla de Más tiene su «Volver a Más»** (2026-10-12).
    Carlos pidió que, al entrar a una opción de Más (por ejemplo Roles), haya un botón para
    volver al menú de Más. Va arriba a la izquierda, en todas las pantallas de Más, también
    en la que avisa que falta un permiso. En la computadora no hace falta: el menú está
    siempre a la vista.

65. **Escanear el código de la computadora desde la entrada pide la huella enseguida** (2026-10-13).
    Carlos pidió que el botón de escanear de la entrada del celular no deje la entrada a
    medio camino: leído el código, pide la huella; si es correcta, el celular entra, la
    computadora entra y quedan vinculados, sin otro toque.
    - Vale cuando ese celular ya tiene la huella vinculada. Si no, queda la entrada de
      siempre, con el aviso de que la computadora entra también, para entrar con Google.
    - Si la huella no se lee, lo dice y queda el botón para probar de nuevo.

66. **En el celular, vincular con la computadora está en todas las pantallas** (2026-10-13).
    Carlos pidió que el botón no esté solo en Más: en cada pantalla, arriba a la derecha.
    - Sin vincular: el botón «Vincular», que abre la cámara dentro de Ferrebress.
    - Vinculado: ese botón no aparece; arriba queda la franja del espejo, con «Desvincular»
      (y «Pausar»), que ya estaba en todas las pantallas.

67. **Una pantalla por proceso: las compras recientes salen del ingreso** (2026-10-13).
    Carlos fijó el criterio: cada pantalla tiene solo lo que hace falta para un proceso
    (vender, recibir mercadería, armar un pedido, buscar un producto para decir un precio,
    dar de alta un usuario, armar roles, analizar el negocio), y cada proceso tiene su
    pantalla.
    - Las compras recientes no ayudan a recibir mercadería: pasan a «Cómo va el negocio».
      El ingreso queda solo con el proveedor, el comprobante y los renglones.
    - Interpretación del agente, a confirmar con Carlos: quien tiene «Ver las compras» pero
      no «Ver los números del negocio» abre «Cómo va el negocio» y ve solo las compras; y
      una compra se sigue anulando desde esa lista, con «Registrar ingresos».
    - El resto de las pantallas se revisó con ese criterio y lo encontrado se le pasó a
      Carlos para decidir; no se cambió nada más.

68. **El orden de Depósito: Inventario, Ingreso, Estanterías, Pedidos** (2026-10-13).
    Lo pidió Carlos. Como cada parte abre en su primera pestaña (decisión 56), Depósito
    abre ahora en Inventario. Vale para el celular y la computadora.

69. **El botón de Google es el original: azul y redondeado** (2026-10-13).
    Carlos vio las tres variantes que ofrece Google y eligió la azul con puntas redondeadas,
    en el celular y en la computadora. Que el azul no sea de nuestra paleta es a propósito:
    marca que ese botón es de un servicio externo.
    - Se va el botón propio con el de Google invisible encima, y la base con sombra de la
      computadora: el botón queda tal como lo dibuja Google, sin estilos nuestros.
    - Reemplaza lo que decían del botón de Google las decisiones 55 y 62.
