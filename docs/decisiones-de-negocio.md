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
    - Fondo claro. Arriba y al centro, el logotipo y la línea «Tu ferretería, en orden» (desde la decisión 117,
      «Vendé, contá y cobrá desde el mostrador o el depósito.»).
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

64. **En el celular, cada pantalla de Más tiene su «Volver a Más»** (2026-10-12). Sigue vigente en el celular; la computadora no lo tiene (decisión 90).
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
    - Confirmado por Carlos el mismo día: quien tiene «Ver las compras» pero
      no «Ver los números del negocio» abre «Cómo va el negocio» y ve solo las compras; y
      una compra se sigue anulando desde esa lista, con «Registrar ingresos».
    - El resto de las pantallas se revisó con ese criterio. Carlos vio las ocho que
      mezclan procesos y decidió dejarlas como están por ahora.

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

70. **Vincular y desvincular en el celular: en el encabezado, con su leyenda** (2026-10-13).
    Carlos pidió que el botón no esté arriba de la pantalla sino a la derecha del encabezado
    (por ejemplo, a la derecha de «Catálogo»), más chico y con la leyenda debajo del ícono,
    como los botones del menú de abajo.
    - Sin vincular dice «Vincular» y abre la cámara. Vinculado dice «Desvincular», en verde,
      y pregunta antes de desvincular. La franja del espejo del celular queda con «Pausar».
    - En la computadora, Vender ya no tiene «Desvincular» junto a «Escanear con el celular»:
      alcanza con el del menú de la izquierda.

71. **Vinculados, dónde se está parado lo decide la computadora** (2026-10-13).
    Carlos: si en la computadora estoy en Vender, el celular tiene que ir a Vender.
    - Al conectarse los dos (se abre o se recarga cualquiera, o se acaban de vincular), el
      celular va a la pantalla de la computadora, nunca al revés. Antes, la computadora que
      se abría con el celular ya abierto se iba a la pantalla del celular.
    - Después, cada cambio de pantalla hecho en cualquiera de los dos mueve al otro, como
      siempre. El trabajo a medio hacer (una venta, un ingreso, un pedido) se sigue retomando
      del que ya lo tenía.
    - Se corrigió además que, al vincular, una consulta vieja al servidor podía borrar el
      vínculo recién creado.

72. **Vender tiene tres pestañas: Vender, Hoy y Anular** (2026-10-13).
    Carlos, siguiendo el criterio de una pantalla por proceso (decisión 67):
    - **Vender:** armar la venta y cobrar. Ya no muestra las ventas del día.
    - **Hoy:** lo vendido en el día: total, total por medio de pago y cada venta con sus
      productos. No se puede tocar nada. La ve quien tiene «Ver las ventas del día».
    - **Anular:** buscar una venta y anularla. Las de hoy, con «Anular ventas del día»; las
      de otro día, solo con «Anular ventas de cualquier día», que es quien puede elegir el día.
    - Todo lo que anulaba ventas desde otra pantalla se va: «Cómo va el negocio» del celular
      queda con el total del día y sin el detalle de cada venta; el botón «Hoy» de Vender y la
      pantalla suelta «Ventas de hoy» de la computadora pasan a ser estas pestañas.
    - Las pestañas tienen el mismo aspecto que las de Catálogo y Depósito. Cada persona ve
      solo las que puede usar; con una sola, no se dibujan. Vale para celular y computadora.

73. **El vínculo entre el celular y la computadora es de los dispositivos, no de la sesión** (2026-10-13).
    Carlos notó que «Pausar» y «Desvincular» se pisaban, y pidió que el vínculo no se pierda
    al cerrar sesión. Reemplaza de la decisión 58 que el vínculo terminaba al cerrarse una
    sesión, y de las 60 y 70 dónde están los botones.
    - **De quién es:** de ese celular, esa computadora y ese usuario. Al salir de uno o de los
      dos queda dormido; cuando el mismo usuario vuelve a entrar en ese dispositivo, se
      reactiva solo, sin escanear. Si en ese dispositivo entra otra persona, no se le aplica.
    - **Cómo se corta:** con «Desvincular», que está solo en Más (en el celular y en la
      computadora), o cuando un administrador cierra a distancia la sesión de uno de los dos
      dispositivos. Sigue siendo uno a uno: vincular otro reemplaza al anterior.
    - **Cuánto dura:** los días que se configuran en Más → Usuarios y sesiones (30 de
      arranque; lo cambia quien tiene «Administrar sesiones»). El plazo se cuenta desde que
      se vinculó, y se renueva cada vez que se entra a la computadora escaneando su código
      con el celular o se vuelve a vincular. El cambio de días vale para los vínculos nuevos
      y los que se renueven.
    - **Un solo botón en las pantallas:** sin vínculo dice «Vincular»; con vínculo, «Separar»
      para que cada uno trabaje por su lado un rato, y «Juntar» para volver a trabajar en
      espejo. En el celular va a la derecha del encabezado; en la computadora, en el bloque
      del menú. La franja de arriba del celular queda solo con el estado.
    - **Los nombres:** «Separar» y «Juntar» reemplazan a «Pausar» y «Reanudar» (propuesta del
      agente, a confirmar por Carlos). El estado dice «Trabajando juntos» o «Separados: cada
      uno por su lado».

74. **«Desvincular» está en Usuarios y sesiones** (2026-10-13). Carlos lo pidió ahí y no
    suelto en la lista de Más. En Más → Usuarios y sesiones hay un bloque «Vínculo entre
    celular y computadora»: a quien está vinculado le dice con qué y le ofrece «Desvincular»
    (pregunta antes); a quien tiene «Administrar sesiones» le muestra además los días que
    dura. Corrige de la decisión 73 solo el lugar del botón.

75. **Los botones del vínculo se llaman «Desconectar» y «Reconectar»** (2026-10-13). Carlos
    los eligió en lugar de «Separar» y «Juntar», que había propuesto el agente en la decisión
    73. «Desconectar» hace que cada dispositivo trabaje por su lado sin desvincularlos;
    «Reconectar» los vuelve a poner a trabajar juntos. El estado dice «Conectado con la
    computadora» (o «con el celular») y «Desconectados: cada uno por su lado».

76. **En el celular, el estado del vínculo lo dice el botón** (2026-10-13). Carlos pidió sacar
    la leyenda de arriba («Conectado con la computadora») y su círculo.
    - El botón del encabezado lleva borde y cambia de color: verde cuando el celular y la
      computadora están trabajando juntos; gris cuando están desconectados o la computadora
      no está abierta. Sin vínculo es el botón «Vincular», también con borde.
    - En el lugar de la leyenda va el estado de la conexión («Conectado», «Sincronizado hace
      5 min», «Sin conexión · 2 por enviar»), en todas las pantallas del celular. Vender deja
      de mostrarlo por su cuenta.
    - Lo que termina en la computadora («venta cobrada en la computadora») se sigue avisando
      un momento, en esa misma línea.
    - Entre esa línea y el título de la pantalla no queda espacio de más.
    - El botón lleva el ícono a la izquierda y la leyenda a la derecha, no debajo: el lugar
      alcanza. Corrige eso de la decisión 70.

77. **En la computadora, las flechas son solo para el menú, las pestañas y las listas** (2026-10-13).
    Carlos cambió de idea sobre la decisión 61, que hacía recorrer con las flechas todos los
    controles de la pantalla. Reemplaza esa parte de la 61.
    - Con las flechas se recorre el menú de la izquierda, las pestañas de cada pantalla y los
      ítems de las listas. Nada más.
    - A un campo de texto o a un botón se va con Tab.
    - Todos los botones tienen que tener un atajo de teclado. Qué tecla le toca a cada uno
      está por definir con Carlos; siguen los que ya había (F2 cobra, F5 a F8 el medio de pago).

78. **El celular se mueve como una aplicación de iPhone** (2026-10-13). Carlos pidió
    animaciones al navegar y dejó al agente elegir cómo hacerlas.
    - Entrar a una pantalla desde una lista (de Más a una de sus pantallas) la trae desde la
      derecha, mientras la anterior se corre un poco a la izquierda y se apaga; volver hace
      lo contrario.
    - Cambiar de parte en el menú de abajo, o de pestaña dentro de una parte, es un fundido
      corto: en iPhone eso no desliza.
    - El menú de abajo queda quieto mientras cambia la pantalla.
    - Las hojas siguen subiendo desde abajo, ahora con la misma curva que el resto.
    - Duran poco (un tercio de segundo el deslizamiento, menos el fundido) y no se usan si el
      teléfono tiene pedido «reducir movimiento».
    - Decisión del agente: se hacen con lo que trae el navegador (transiciones de vista), sin
      sumar ninguna librería. En un navegador que no las tenga, la pantalla cambia sin animar.

79. **Más tiene «Configuración», y la primera opción son las animaciones** (2026-10-13).
    Carlos pidió la pantalla para ir sumándole cosas.
    - La ve cualquiera con sesión, en el celular y en la computadora.
    - «Animaciones» se habilita o deshabilita con una llave. Es de cada persona en su
      dispositivo, arranca habilitada y vale en el momento.
    - Que la pantalla esté en los dos y que la opción valga también en la computadora lo
      decidió el agente, a pedido de Carlos, por lo más simple y consistente.

80. **Todos los botones de la computadora tienen atajo: Alt y una letra** (2026-10-13).
    Carlos eligió este esquema entre dos que propuso el agente. Con Alt apretado, cada botón
    a la vista muestra una letra, y esa letra lo acciona. La letra sale del nombre del botón.
    No se usan la D, la E ni la F, que el navegador tiene para sí. Completa la decisión 77.

81. **El celular no guarda datos del negocio, salvo que la persona lo habilite** (2026-10-13).
    El celular es del empleado y tiene poco lugar; en el local hay buena conexión.
    - De arranque, el celular guarda solo lo mínimo para mantener la sesión y el vínculo
      (menos de 150 KB, sin contar los archivos de la aplicación). Nada de productos,
      ventas ni listas.
    - Así, si se corta internet no se puede registrar ni guardar nada: la aplicación lo
      dice y explica que hay que habilitar «Trabajar sin conexión» en Configuración.
    - Es una preferencia personal, como todo lo de Configuración. La computadora no cambia.
    - Deshabilitarla borra lo guardado. Si había ventas sin enviar se pierden: Carlos lo
      acepta por ser un caso extremo; la aplicación avisa cuántas y pregunta antes.
    - Con el guardado deshabilitado, la persona elige cómo buscar productos: bajando el
      catálogo a la memoria al abrir, o consultando al servidor en cada búsqueda.

82. **En la computadora hay dos focos: el de escribir y el de las flechas** (2026-10-13).
    Carlos lo fijó al ver que en Depósito la flecha marcaba solo la cantidad y que en Vender,
    sin productos, la marca se perdía. Completa la decisión 77.
    - El cursor de escritura queda en la caja de texto. Las flechas tienen su propia marca.
    - La marca solo recorre el menú, las pestañas y las filas enteras de la lista.
    - Con la lista vacía, la marca no baja: se queda en las pestañas.
    - Funciona igual en todas las pantallas.

83. **La interfaz actual es la definitiva: se borran las versiones viejas y los mockups** (2026-10-13).
    Carlos: las versiones 1 a 4 ya no sirven y la interfaz actual es lo bastante buena para
    quedar. Se borran del repositorio su código, las páginas que las publicaban, los mockups
    y las referencias a ellas en la documentación de trabajo. Reemplaza la decisión 43, que
    las mantenía publicadas para comparar. Las maquetas aprobadas de cada capacidad
    (`specs/…/maquetas/`) se conservan: son parte de la especificación, no versiones viejas.
    Los ADR y las decisiones anteriores no se reescriben: cuentan por qué se llegó acá.

84. **Se reordena el código según la auditoría de arquitectura** (2026-10-13). Carlos aprobó
    el informe y pidió hacer el reordenamiento, con estas respuestas: el lector de planillas
    en Python queda aparte por ahora; para un margen o un precio tipeado, el front muestra la
    vista previa y el servidor confirma; se aceptan las librerías propuestas; y **se frenan
    los cambios de pantallas** mientras se unifica cada proceso. No hay un servicio para el
    celular y otro para la computadora. El plan y sus etapas están en
    `specs/010-reordenamiento-del-codigo/`.

85. **Cada interfaz conserva sus propias piezas de interfaz** (2026-10-14). Se probó usar en el
    celular las piezas de la computadora (botón, hoja, avisos y visor de la cámara) y Carlos
    pidió volver atrás: como hay dos juegos de pantallas a propósito (decisión 46), cada uno
    mantiene sus piezas y su aspecto. Lo compartido entre los dos sigue siendo la paleta, los
    textos, las reglas de negocio (`negocio/`) y la tecnología reutilizable (`plataforma/`).

86. **Al cobrar, el servidor guarda lo que se cobró** (2026-10-14). Carlos: el precio de cada
    renglón es el que se le cobró al cliente, sea el de la lista, un margen elegido en esa
    venta, un precio puesto a mano o el de una venta hecha sin conexión con el costo de ese
    momento. El servidor lo guarda tal cual, con su costo, su margen y su explicación, y
    recalcula el redondeo de cada renglón a $1.000 y el total, que son los que valen. Precisa
    la decisión 84: «el servidor confirma» quiere decir eso, no que vuelva a calcular el precio.

87. **Procesos: una pantalla para dibujar los procesos del negocio con BPMN, que se pueda
    llevar a otros proyectos** (2026-10-14). Carlos la pidió en Más, con arrastrar y soltar,
    para dibujar la venta, la compra, la recepción de mercadería y cualquier otro proceso, y
    usar después esa información para decidir. Va aparte del resto de Ferrebress para poder
    llevarla a otros proyectos; usa la misma base de datos porque hoy hay una sola (si no,
    sería un servicio aparte). Por ahora solo se dibuja y guarda lo que se ve; se conectará
    con lo que pasa en Ferrebress más adelante. Tiene borrador, vigente y versiones; se
    guarda en BPMN 2.0, se exporta como imagen PNG o como BPMN y se importa BPMN. Hay dos
    permisos: «Ver procesos» para mirar y «Dibujar procesos», que suma cambiar, importar y
    exportar; sin ninguno, la opción no aparece en Más. Los dos arrancan en el rol Gerente.
    Pantalla elegida: en la computadora, el editor clásico con los
    tres paneles plegables (arrancan cerrados) y los pasos como tabla abajo; en el celular,
    «Pasos» y «Diagrama». Está en `specs/011-procesos/`.

88. **Usuarios, sesiones, roles y quién hizo qué, en una sola opción de Más con cuatro
    pestañas** (2026-10-14). Carlos: Más tenía ocho opciones y cuatro eran de los usuarios.
    Ahora hay una, «Usuarios» («Quién entra y desde dónde, qué puede hacer y qué hizo»), con
    las pestañas Usuarios, Sesiones, Roles y Quién hizo qué, como en Depósito. Quién hizo qué
    va ahí porque el «quién» es un usuario. Sesiones junta las sesiones abiertas, los
    celulares con huella y el vínculo entre celular y computadora: todo lo que dice desde
    dónde y cómo se entra. Cada uno ve solo las pestañas que su rol le permite. Las pestañas
    no llevan atajo Alt: se recorren con las flechas. Maquetas aprobadas en
    `specs/007-usuarios-y-acceso/maquetas/`.

89. **El servidor valida con Zod y el front sigue con los contratos** (2026-10-14). En el
    reordenamiento (`specs/010-reordenamiento-del-codigo/`, T017), Zod valida en el servidor
    todo lo que llega en cada pedido, y la forma de lo que el front manda sale de esas
    validaciones. El front no usa el cliente tipado de Hono: sigue leyendo la forma de los
    datos de los contratos del servidor (`api/src/contratos/`). Carlos eligió el menor cambio:
    el cliente de Hono obligaba a reescribir las veinte rutas y a que el front revisara el
    código del servidor al compilar. Lo que queda sin controlar al compilar es la dirección y el
    método de cada llamada. Precisa la decisión 84, que había aceptado ese cliente.

90. **Sin «Volver a Más» en la computadora** (2026-10-15). Carlos pidió sacar los botones
    «Volver a Más» porque no hacen falta, y después aclaró que solo en la computadora: ahí se
    vuelve con «Más» del menú de la izquierda, que siempre está a la vista. En el celular el
    botón se queda (decisión 64).

91. **El timer que busca versión nueva corre solo con la app a la vista** (2026-10-16). Carlos
    preguntó si el timer se podía reemplazar por un aviso que mande GitHub al publicar. Se
    compararon las opciones (ADR-020) y eligió quedarse con el timer, sin eventos: se busca al
    abrir, al volver a primer plano, al volver la conexión y cada media hora, pero el timer se
    para mientras la app está oculta. Que la API avise su versión en cada respuesta queda para
    más adelante. Precisa la decisión 54.

92. **Cada dispositivo elige cada cuánto busca versión nueva** (2026-10-16). En Configuración,
    cuatro botones (5 min, 15 min, 1 hora y 24 horas) y una llave, como la de «Animaciones» y al
    costado de la descripción. Prendida, busca; apagada, no busca mientras la aplicación está
    abierta (ni con el timer, ni al volver a ella, ni al volver la conexión) y los botones no se
    muestran. Igual la versión nueva llega al cerrar la aplicación y volver a abrirla, porque
    eso lo hace el navegador. Carlos fijó el mínimo, el máximo, los valores y la
    llave, después de ver un campo para escribir los minutos a mano y una casilla, y preferir
    esto. Arranca en 15 min, con la llave prendida. Precisa la decisión 91.

93. **La entrada de la computadora sigue una imagen de referencia de Carlos** (2026-10-16).
    Carlos no quería el verde liso y pasó una imagen; pidió copiarla lo más fiel posible y
    eligió, entre dos versiones, que el celular dibujado muestre una venta en curso.
    - A la izquierda, el verde con la marca, «EL SISTEMA DEL MOSTRADOR», el título con «de la
      ferretería.» en verde claro, la bajada, las tres cosas que hace y la frase manuscrita «Más
      tiempo para hacer crecer tu negocio» con una flecha.
    - En el medio, una foto desenfocada de estantes y una mesa de madera, entre dos bordes curvos
      (el del verde en forma de sigmoide, el de la derecha en forma de S), y un celular apoyado en
      la mesa que muestra la pantalla real de Vender con dos productos, el cobro y el menú de abajo.
    - A la derecha, sobre fondo claro, la tarjeta para entrar: «Entrá con tu celular», «Es rápido,
      seguro y sin contraseñas.», el código y los dos pasos, «El código se renueva solo cada 5
      minutos. No hay contraseñas.», el botón de Google, quién puede entrar y un pie con «Tus datos
      están protegidos» (solo texto) y el logotipo.
    - Solo en la computadora: la entrada del celular no cambia. Sin «¿Necesitás ayuda?», que
      Carlos sacó.
    - El 2026-10-16 la frase manuscrita se reemplazó por el botón «Ver tutorial», que abre el
      manual de uso (decisión 94).

94. **El manual de uso** (2026-10-16). Lo abre «Ver tutorial», solo desde la entrada de la
    computadora y en la misma pestaña. Un capítulo por pantalla principal: Entrar, Catálogo,
    Vender y cada sección de Más. Cada capítulo explica con texto, pasos y capturas; un clip corto
    muestra lo que se explica, como complemento. Las capturas y los clips se arman con la
    aplicación de verdad, aparte de las pruebas de punta a punta (`specs/012-manual-de-uso/`).

95. **«Cómo va el negocio» en tres secciones, cada una con su permiso de lectura**
    (2026-10-15). Carlos quiere ocultar datos sensibles según el rol. La pantalla se separa en
    Ventas («Ver las ventas del negocio»: lo vendido, por medio de pago y lo que preguntaron y
    no llevaron), Compras («Ver los gastos» para los gastos de la semana y «Ver las compras»
    para las compras recientes) e Inventario («Ver el dinero invertido», que también muestra el
    valor del stock en Depósito). Los números de arriba siguen el permiso de su sección.
    «Ver los números del negocio» desaparece y los roles que lo tenían reciben los tres nuevos.
    El servidor no entrega lo que el permiso no deja ver. Pantalla elegida: pestañas Ventas,
    Compras e Inventario con el submenú arriba, como en Catálogo y Usuarios; los números de
    cada sección van en su pestaña; «Actualizar» con ícono y, en la computadora, sin «Volver
    a Más». Está en `specs/013-secciones-de-negocio/`.

96. **El valor del stock en Depósito, con «Ver el dinero invertido»; los costos y los importes
    de las compras, como estaban** (2026-10-16). Al revisar 013, Carlos decidió:
    - Depósito → Inventario muestra el valor en pesos a quien tiene «Ver el dinero invertido».
      Cambia la decisión 31, que dejaba Inventario solo con cantidades: quien no tiene el
      permiso sigue viendo solo cantidades. La forma, con maqueta (`specs/013-secciones-de-negocio/maquetas/inventario-*`).
    - La sección Inventario de «Cómo va el negocio» no lleva el número arriba: el total ya está
      en su bloque.
    - Los costos de los productos siguen llegando a cualquiera con sesión, como hasta ahora,
      aunque con ellos y las cantidades se pueda calcular el dinero invertido: lo necesitan
      Vender y el cambio de margen sin conexión. Las compras recientes siguen con su importe
      para quien tiene «Ver las compras», aunque sumándolas se saquen los gastos de la semana.

97. **Al desactivar a alguien o cerrarle una sesión a distancia, el dispositivo sale solo**
    (2026-10-17). Carlos pidió que el usuario desactivado salga automáticamente:
    - Con la aplicación abierta y conexión, el dispositivo vuelve a la entrada en menos de 30
      segundos, sin que nadie toque nada; si estaba en otra ventana, apenas vuelve. Sin conexión,
      al recuperarla. Antes salía recién en su próximo pedido al servidor.
    - Vale igual para «Cerrar sesión» a distancia desde Más → Usuarios → Sesiones.
    - Lo que esa persona hizo sin conexión antes de que la desactivaran y no llegó al servidor
      (una venta cobrada, por ejemplo) no se registra solo ni se pierde: queda apartado para que
      un Administrador decida si lo acepta. Responde la pregunta abierta P8 de 007. Cómo se
      aparta y se revisa es una funcionalidad aparte.
    - Mientras esa funcionalidad no exista, lo que quedó sin mandar sigue guardado en el
      dispositivo, a nombre de quien lo hizo: si entra otra persona, no se manda con su sesión;
      sale solo si vuelve a entrar esa misma persona (reactivada, o con la sesión cerrada a
      distancia y abierta de nuevo).
    - Carlos aprobó la regla escrita el 2026-10-17.

98. **Buscar usuarios por correo o nombre, y filtrarlos por rol** (2026-10-17). En Más →
    Usuarios, en el celular y en la computadora, un buscador «Correo o nombre» con sugerencias
    mientras se escribe y una lista desplegable «Rol» (Carlos prefirió la lista a las pastillas).
    En el celular, debajo de «Autorizar otro correo de Google», y se saca la cabecera «Usuarios
    autorizados» con cuántos son, porque ocupaba lugar; en la computadora, arriba de la tabla.
    Maquetas aprobadas el 2026-10-17 (007-T033, `specs/007-usuarios-y-acceso/ux.md`).

99. **Configuración tiene lo que cada persona decide para sí; Sesiones, lo que administra otro**
    (2026-10-17). Carlos pidió pasar a Configuración lo que es propio del usuario y de su
    dispositivo, sin opciones repetidas:
    - A Más → Configuración, en el celular y en la computadora: los celulares con huella propios
      (vincular este, quitar uno) y el vínculo entre celular y computadora (con qué dispositivo,
      «Desvincular»).
    - Queda en Más → Usuarios, pestaña Sesiones, solo para «Administrar sesiones»: las sesiones
      abiertas de todos y cerrarlas, los celulares con huella de las demás personas y quitarlos,
      y cuántos días dura el vínculo. Es la respuesta a un celular perdido.
    - Nada figura en los dos lugares: la sesión del propio dispositivo sale de la lista (se cierra
      con «Salir»), los celulares propios no figuran en Sesiones y los días del vínculo no figuran
      en Configuración.
    - Quien no tiene ninguna pestaña de Usuarios no ve «Usuarios» en Más (antes estaba siempre,
      porque Sesiones la veía cualquiera; cambia la decisión 88).
    - Carlos aprobó la regla escrita el 2026-10-17. RF-70b, RF-74 y RF-77 en 007; RF-106 en 009.

100. **Sin pestaña Sesiones: las sesiones y los celulares de cada persona, en su tarjeta de
     Usuarios** (2026-10-17). Carlos pidió sacar la pestaña Sesiones e incorporarla a Usuarios;
     ajusta la decisión 99 y la 88:
     - Más → Usuarios queda con tres pestañas: Usuarios, Roles y Quién hizo qué.
     - En la tarjeta de cada persona (en la computadora, en su fila), una línea plegada dice
       cuánto tiene («2 sesiones abiertas · 1 celular con huella ›») y despliega sus sesiones,
       con «Cerrar», y sus celulares con huella, con «Quitar». En la propia no figuran la sesión
       de ese dispositivo (se cierra con «Salir») ni los celulares propios (están en Configuración).
     - Cuántos días dura el vínculo entre celular y computadora, al final de la pestaña Usuarios.
     - «Administrar sesiones» se une a «Administrar usuarios», que pasa a incluir cerrar sesiones,
       quitar celulares de otros y fijar los días del vínculo. Un rol que tenía «Administrar
       sesiones» sin «Administrar usuarios» pierde eso: nadie gana permisos que no tenía.
     - Carlos lo aprobó el 2026-10-17.

101. **Lo apartado se revisa en Anomalías** (2026-10-17). Al especificar 014, Carlos decidió:
    - Lo que una persona desactivada dejó sin mandar sube al servidor apartado y se revisa
      desde cualquier dispositivo, no solo en el que quedó.
    - Se revisa en Más → Anomalías, con el submenú de pestañas de las otras pantallas: primero
      «Para revisar», con la cantidad a la derecha del nombre, y después «Anotadas».
    - Lo decide quien tiene «Administrar usuarios»; con ese permiso, Anomalías aparece en Más.
    - Lo aceptado queda a nombre de quien lo hizo; el registro dice quién lo aceptó.

102. **Usuarios en el celular: tarjetas plegadas, filtros por rol y estado, y orden** (2026-10-17).
     Sobre una referencia suya, Carlos pidió que la lista muestre lo principal de cada persona y
     el detalle se abra de a una: la tarjeta plegada tiene el nombre, el estado, el correo y los
     roles que entran en una línea; abierta, las pestañas Información (siempre la primera al
     abrir: el correo, «Se unió el…» y «Desactivar»), Roles (con «Cambiar roles») y Sesiones.
     Cambia la decisión 98: vuelve cuántos son, siempre a la vista; la lista «Rol» se reemplaza
     por «Filtros», con varios roles a la vez (queda quien tiene cualquiera) y el estado (activos
     o inactivos); y se puede ordenar por correo o por estado. El buscador dice «Email». Las
     reglas de filtrar y ordenar valen igual en la computadora. Maquetas aprobadas el 2026-10-17
     (007-T044, `specs/007-usuarios-y-acceso/ux.md`).

103. **Catálogo para vender** (2026-10-17). Sobre una imagen de referencia del Catálogo, Carlos
     eligió que entren el stock de cada producto, filtrar por disponibilidad y por marca,
     «Agregar» a la venta desde el Catálogo, las pestañas más altas y el buscador que dice qué
     busca; no entran categorías, «Avisar», un menú por producto, ordenar ni el «+» en el
     margen. «Stock bajo» espera al stock mínimo (RF-54): hasta entonces, la cantidad y «Sin
     stock». Después de «Agregar» se sigue en el Catálogo, con un aviso breve, y el menú muestra
     en Vender cuántos productos lleva la venta (`specs/015-catalogo-para-vender/`).

104. **Botones secundarios de 36 px en el celular** (2026-10-17). Al aprobar la maqueta del
     Catálogo, Carlos pidió «Agregar» más bajo y fijó la regla: las acciones principales, las
     pestañas y los campos miden al menos 44 px de alto para tocar con el dedo; los botones
     secundarios, como «Agregar» en cada producto, al menos 36 px (`docs/sistema-visual.md`).

105. **Los títulos de sección del celular, en negrita y sin mayúsculas** (2026-10-17). Al
     aprobar la maqueta de Listas, Carlos pidió que los títulos de sección («Últimas cargas»,
     «Proveedores») vayan como en su referencia: más grandes, en negrita, con mayúscula solo al
     principio y sin la rayita amarilla; y que sea así en todas las pantallas del celular, no
     solo en Listas (002-T003, `specs/002-catalogo-y-precios/ux.md`).

106. **Lo que Carlos contestó de la revisión del Catálogo para vender** (2026-10-17):
     - Cerrar la sesión («Salir», o que el servidor la cierre) vacía la venta a medio armar, para
       que quien entre después en el mismo dispositivo no la encuentre (ADR-022).
     - El renglón «N productos con filtros · Sacar filtros» arriba de la lista se queda, con menos
       espacio arriba y abajo.
     - Las unidades se abrevian «un.» en toda la aplicación, como ya hacía Vender (el Catálogo y
       Depósito decían «u.»).
     - Las pestañas de 44 px valen para todas las pestañas del celular.
     - «Producto, código o marca» cortado en un celular angosto se acepta, como en la maqueta.

107. **Ficha del producto renovada** (2026-10-17). Sobre una imagen de referencia, Carlos
     eligió que entren el encabezado con la foto grande, la etiqueta de stock, el código de barras
     con copiar y escanear al lado, «Código actualizado» con la última lectura, el proveedor en uso
     primero, «Así se calcula» plegable, el archivo de origen con sus datos y «Agregar a la venta».
     No entran «Guardar cambios», el lápiz del precio, la categoría ni «Activo». La «última
     lectura» es la última vez que se cargó o se cambió el código del producto; escanearlo para
     buscar o vender no la cambia (`specs/016-ficha-del-producto/`).

108. **Colores por significado** (2026-10-17). Al mirar una referencia de «Ventas de hoy», Carlos
     cambió la regla de «ninguna pantalla usa colores propios»: si un color tiene sentido para
     un elemento puntual (los medios de pago, por ejemplo), se usa, y siempre el mismo, en
     todas las pantallas donde aparece ese elemento. Lo que sigue prohibido es una pantalla
     entera, un fondo o un panel con colores propios. Los colores van en la paleta compartida
     (`specs/001-base-del-sistema/ux.md`, `docs/sistema-visual.md`).

109. **El manual de uso, por dispositivo, y su capítulo «Catálogo»** (2026-10-17). Carlos aprobó
     las maquetas `specs/012-manual-de-uso/maquetas/manual-dispositivo.html` y `manual-catalogo.html`.
     - «Inicio del manual» se reemplaza por «¿Dónde lo usás?»: Computadora o Celular. El manual
       muestra solo las instrucciones, capturas y clips del dispositivo elegido, en todos sus
       capítulos; abre en Computadora y se acuerda de la elección en esa computadora.
     - «Entrar con el celular» va con la computadora: es una forma de entrar a la computadora,
       aunque tenga pasos en el teléfono. En Celular, un aviso lleva a elegir Computadora.
     - Un capítulo que todavía no está escrito para el dispositivo elegido dice «pronto».
     - El capítulo 2 se llama «Catálogo: los productos» y explica la pantalla Productos; Listas y
       Duplicados se suman después al mismo capítulo.

110. **Anular una venta pide confirmar, con un motivo opcional de una lista** (2026-10-17). Al
     aprobar la maqueta de Anular en el celular, Carlos decidió: «Anular» abre una hoja para
     confirmar, con la venta, el aviso de que no se puede deshacer y el motivo, que se elige de
     una lista desplegable que empieza en «Sin motivo» («Se arrepintió», «Error al cobrar»,
     «Producto equivocado», «Devolución», «Cobrada dos veces»), con un comentario opcional. Se
     guarda el motivo elegido y el comentario («Devolución: la mecha vino fallada»). Responde la
     pregunta 4 de Ventas del día (RF-23). Igual en el celular y en la computadora (003-T005).

111. **Ventas de hoy renovada** (2026-10-17). Sobre una imagen de referencia, Carlos eligió que
     entren la comparación con ayer, el gráfico por hora, cada medio de pago con su color y
     cuántas ventas, ventas realizadas, productos vendidos y ticket promedio, cada venta en un
     renglón corto que se abre, y «Cambiar fecha». No entran el número de venta, el «Tip»,
     «Ver todas» ni imprimir. Hoy se compara con lo vendido ayer hasta la misma hora; un día
     anterior, entero contra el suyo. Las ventas de otros días las ve cualquiera con «Ver las
     ventas del día» (`specs/017-ventas-de-hoy/`).
112. **Lo que la computadora le pide al celular emparejado le aparece en el momento**
     (2026-10-18). Antes el celular preguntaba cada 3 segundos y el aviso «La computadora
     quiere escanear» o «La computadora pide una foto» tardaba hasta ese tiempo. Ahora el
     servidor se lo avisa por la conexión del espejo, que el celular ya tiene abierta; la
     pregunta cada 3 segundos queda solo para cuando esa conexión se cortó
     (`specs/002-catalogo-y-precios/`, escenario 18d).
113. **Las maquetas del director de arte se navegan en el ambiente de pruebas, en /v2, /v3 y /v4**
     (2026-10-19). Para decidir qué tomar de las propuestas (`docs/propuestas-de-diseno/`),
     Carlos quiere recorrerlas, no mirar capturas: /v2 es la evolución de cada pantalla, /v3 la
     reinvención y /v4 la audaz; /v1 muestra la aplicación de hoy en la misma pantalla, para
     comparar (Carlos, 2026-10-19). Con los enlaces y los botones que abren pantallas, diálogos o
     agregan elementos ficticios funcionando. Se decide pantalla por pantalla. Es una excepción
     temporal a la decisión 83: las maquetas se borran solo cuando Carlos lo pida; mientras
     tanto no se modifican ni se borran, aunque una pantalla ya esté elegida y programada,
     porque puede cambiar de idea (2026-10-19). No llevan datos reales, así que se pueden abrir sin entrar; la aplicación
     instalada no las guarda ni las descarga. Antes de pasar a producción con las maquetas
     adentro, se le avisa a Carlos.
114. **Las maquetas no llevan pruebas** (2026-10-19). Las maquetas existen para no gastar tiempo en
     desarrollo; si no hay desarrollo, no hay nada que probar. Un cambio solo en las maquetas se
     sube sin pruebas unitarias ni de punta a punta, y los agentes que las arman o les agregan
     botones no escriben pruebas con Playwright ni comparan capturas: alcanza con abrirlas una vez
     y mirar que no haya errores en la consola. Las pruebas siguen valiendo para lo que toca la
     aplicación de verdad.
115. **El lenguaje «Mostrador» es el oficial** (2026-10-19). Carlos aprobó la paleta y todo lo
     que define el lenguaje visual que armó el director de arte para las propuestas: colores con
     su trabajo (papel cálido, pino para el lugar, naranja para la única acción principal, ámbar,
     rojo y verde solo en piezas chicas, un color fijo por medio de pago), Manrope, íconos Lucide,
     el molde de renglón y dato, botones, pastillas, espaciado, relieve, movimiento y el marco de
     la aplicación. Queda en `docs/lenguaje-mostrador/` y lo toma por defecto toda pantalla nueva
     o rediseñada. El director de arte puede proponer algo superador; si lo es, lo decide Carlos.
     Reemplaza la paleta anterior (coral, tinta y niebla) y los colores de los medios de pago de
     la decisión 108, que pasan a ser los de esa guía; la regla de la 108 (un color por
     significado, siempre el mismo) sigue.
116. **El marco del ambiente de prueba no cambia con el rediseño** (2026-10-19). Elija Carlos la
     versión que elija de cada pantalla, el marco magenta que aparece y desaparece y el cartel
     «Ambiente de prueba · nada de esto es real» (decisión 33) quedan exactamente como están hoy.
     No forman parte del lenguaje «Mostrador» ni se adaptan a él, y solo aparecen en el ambiente
     de pruebas: producción no lleva nada.
117. **Entrada del celular: queda la de hoy, con otra frase** (2026-10-19). De las propuestas del
     director de arte, Carlos eligió para la entrada del celular la versión de hoy (v1). Solo
     cambia la línea bajo el logotipo (decisión 55): de «Tu ferretería, en orden» pasa a «Vendé,
     contá y cobrá desde el mostrador o el depósito.»
118. **Entrada de la computadora: la v1 con la tarjeta de la v2** (2026-10-19). De las propuestas,
     Carlos eligió para la entrada de la computadora la de hoy, con la tarjeta de la derecha como la
     de la v2 y ajustes suyos: sin «compu»; el isotipo de Ferrebress en el centro del QR, sin
     esquinas de color; los pasos con círculos verdes llenos; «Cambia en m:ss · y sirve una vez»
     del ancho del QR; la «o» de siempre; la nota de siempre sin recuadro; el pie «Tus datos están
     protegidos» (ahí va a ir el sello de protección de datos personales). Arriba, «Computadora del
     mostrador» (fijo: el navegador no deja saber el nombre de la computadora) y el estado de la conexión con el servidor, que funciona de verdad: verde si
     contesta, gris mientras pregunta, ámbar si no; sin conexión el QR se ve apagado. Abajo, tres
     características técnicas: una vez dentro resiste cortes de internet (sin internet no se entra), busca productos por código de barras y maneja
     la computadora desde el celular. Detalle en `specs/007-usuarios-y-acceso/ux.md`.
119. **Vender en el celular: la v2 con tres cosas de la v3** (2026-10-19). De las propuestas del
     director de arte, Carlos eligió para Vender en el celular la v2 («Mostrador») con, de la v3: el
     medio de pago en una pastilla que abre la lista de los cuatro (con los íconos de hoy; arranca y
     vuelve a Efectivo, decisión 37); cobrar deslizando el botón hasta el final; y «Escanear» abre la
     cámara arriba y empuja la venta hacia abajo, que se sigue viendo. Además: «No llevó» al lado de
     «Vaciar»; la unidad en una lista a la derecha de la cantidad (el renglón pierde el tacho: «−»
     con 1 lo quita, con Deshacer); un (?) en el precio que abre cómo se calculó, porque en la v1 no
     se notaba; el aviso de stock que no alcanza; el código que no está en el catálogo, que se asocia
     a un producto; «Usar como lector de la computadora» desde «En espejo»; el cliente opcional al
     lado del medio, con cualquier medio de pago (de la v2 de la computadora); la venta vacía y la
     venta registrada de la v2 (reemplazan las de 003-T003 y 003-T004), con el caso sin conexión.
     Maqueta `specs/003-ventas/maquetas/celular-vender-v2-con-v3.png`. Por ahora solo el celular: la
     computadora se ve después.
120. **Ventas de hoy y Anular, una sola pestaña en el celular** (2026-10-19). En el celular, Vender
     queda con dos pestañas, «Vender» y «Ventas de hoy» (cambia la decisión 72, que tenía tres). Se
     anula desde «Ventas de hoy», como en la v2 del director de arte: tocar una venta abre su hoja y
     ahí está «Anular», que pide confirmar con el motivo en una lista desplegable y el comentario
     (decisión 110). El director de arte agregó un buscador por producto, importe o cliente. Las ventas
     de otro día se anulan con el permiso «Anular ventas de cualquier día», como antes. «Corregir» y
     «Cambio» de la maqueta no se hacen todavía (003, historias 9 y 11). Maqueta
     `specs/003-ventas/maquetas/celular-ventas-de-hoy-v2.png`. La computadora sigue con sus tres
     pestañas hasta que se vea.
121. **La navegación con el teclado se mantiene en todas las versiones** (2026-10-19). Carlos: «muy
     importante, hay que mantener siempre lo especificado sobre la navegación con el teclado en
     todas las versiones». Toda pantalla nueva o rediseñada, y toda propuesta del director de arte
     que se elija, conserva lo que la especificación dice del teclado: en la computadora todo se
     opera con el teclado y el mouse nunca es la única forma (RNF-05), con las teclas de cada
     pantalla (Enter, flechas, F2, F5 a F8, Esc, Alt+número y las demás) a la vista. Un gesto nuevo
     (arrastrar, deslizar) se suma; nunca reemplaza al teclado.
122. **El menú de la computadora: el de «Mostrador», que se achica** (2026-10-19). En todas las
     pantallas de la computadora, el menú de la izquierda es el del lenguaje «Mostrador» con el
     logotipo de la v1 y un botón (y Ctrl+B) que lo achica a solo íconos, como la v3 del director
     de arte; recuerda cómo se dejó. Siguen Alt+número y las letras al apretar Alt. La barra de
     arriba de la v4 («Ir a… Ctrl K») queda para más adelante. Para Vender en la computadora,
     Carlos descartó de las propuestas: «Ganás en esta venta», escribir la cantidad en la búsqueda
     («3 mecha 8», fuente de errores), elegir el margen con las teclas 1 a 5 (confunde), la ayuda
     de teclas en «?» (ya está con Alt) y todo lo de la v4 salvo el aviso «El celular está
     escaneando». Pedidos y presupuestos no entran en esta versión.
123. **Vender en el celular: ajustes sobre lo programado** (2026-10-19). Probándolo, Carlos pidió que
     quede como la v2: vuelve el tacho de cada renglón (cambia lo dicho en la decisión 119), el
     aviso de «Vaciaste la venta» sale abajo, el fondo es el gris cálido de «Mostrador» (sin los
     tonos verdes), el botón de cobrar apagado es el de la v2, y el precio no se sale de la tarjeta.
124. **Corregir y cambiar una venta** (2026-10-19). Carlos respondió las preguntas abiertas 5, 6, 10
     y 11: con el permiso, se corrige cualquier venta de cualquier día; al corregir se puede
     cambiar todo (cantidades, precios, renglones, medio de pago, cliente) y cada cambio queda en
     Actividad para auditarlo; para un cambio de producto hay que encontrar la venta original y lo
     devuelto se toma al precio que se pagó; si lo nuevo vale menos, se devuelve el dinero (cambia
     «no hay devoluciones de dinero» de RF-24). En la interfaz van en la hoja de cada venta de
     «Ventas de hoy», como en la v2 del director de arte. Queda abierto si hay un plazo para los cambios.
125. **Vender en la computadora: correcciones sobre lo programado** (2026-10-19). Probándolo,
     Carlos pidió: el panel de la derecha, oculto, deja una pestaña en el borde para volver a
     abrirlo (además de F1); cada renglón no tiene menú «⋯»: el tacho lo quita y el precio a mano
     tiene su botón a la vista, «Precio a mano», que habilita la caja (la explicación del precio ya
     está en el panel «De dónde sale»); con un cliente elegido, el botón muestra sus iniciales en
     vez del ícono de persona y ocupa todo el ancho que queda en la barra; y el total va dentro del
     botón «Cobrar $X» (en la computadora cambia lo dicho en la decisión 37; el celular sigue igual).
     En la barra, los medios van con su nombre corto («M. Pago», «Cta. cte.») y el largo al pasar el
     mouse, porque los cuatro con su tecla no entran con el nombre largo.
126. **La computadora como la v2: el menú, las pestañas, Vender** (2026-10-19). Probándolo, Carlos
     pidió que se parezca más a la v2 del director de arte (la maqueta aprobada
     `specs/001-base-del-sistema/maquetas/compu-menu-mostrador.png`): el menú de la izquierda sin los
     Alt+número a la vista (salen al apretar Alt), sin el texto de ayuda del teclado, con el celular
     en espejo en un recuadro verde, la conexión en una pastilla y el usuario con sus iniciales, su
     nombre y su rol; de la v1 queda solo «Salir». Las pestañas de cada parte, como texto subrayado.
     En Vender: «Escanear con el celular» es el botón verde oscuro de la v2, del alto de la
     búsqueda; el desplegable de la búsqueda es el de la v2 (foto, nombre con marca y proveedor, el
     stock en su pastilla, el precio, y abajo las teclas y cuántos encontró); cada renglón se parece
     al de la v2 (la cantidad en una sola pastilla con − y + y la unidad, sin rayas; el margen en un
     selector segmentado sin el «%» en cada uno; la fila de abajo en una línea con «Precio a mano» a
     la derecha; la cuenta del costo y del precio, en «De dónde sale»). Se saca «Lo último que se
     vendió» («no es útil»; cambia la decisión 38: ya no está en ningún lado). «No llevó» y «Vaciar»
     solo se muestran con productos en la venta, en la computadora y en el celular. La línea de teclas
     («← → cajón, ↑ ↓ eligen una venta…») se saca de «Ventas de hoy» («no hace falta»); la de
     Vender queda, con el aspecto de la v2. Las teclas
     a la vista llevan el aspecto de la maqueta (la letra de siempre, fondo blanco y borde suave), y
     el botón que achica el menú usa el ícono de la maqueta (el panel con la flecha).
     Después, mirando la v2, Carlos eligió también su bloque del usuario: las iniciales, el nombre y
     el rol abren un menú con el nombre y el rol arriba y «Cerrar sesión» (reemplaza al «Salir» de
     la v1); el celular en espejo lleva el ícono del celular. «Mis datos», que también está en la
     v2, no va (decisión 128). Y el margen, del tamaño de la v2; si la
     tarjeta es angosta, «Precio a mano» queda en su lápiz (con el nombre al pasar el mouse).
127. **El renglón de Vender en la computadora, exactamente como la v2** (2026-10-20). Carlos marcó la
     tarjeta de la v2 como la que va: la foto, el nombre con marca, proveedor y stock; el tacho a la
     izquierda de la cantidad (como en el celular, cambia lo de la decisión 125 que lo ponía a la
     derecha); la cantidad en una pastilla; el total del renglón con «3 × $7.000» debajo, sin «?»;
     y abajo, alineados con el nombre, «Costo», «Margen» (300 a 25, un solo «%») y «Precio», el
     precio por unidad. El precio aparece una sola vez: «a mano» va al lado del precio por unidad
     y lo cambia por la caja (con una × para volver al margen). «Falta 1 precio» va arriba, al lado
     de cuántos productos tiene la venta, y no en la barra del cobro, que queda con los medios, el
     cliente y «Cobrar».
     «No llevó» y «Vaciar» van sin borde, con su ícono; la tecla de «No llevó» pasa a ser F4 (en la línea
     de teclas, no en el botón): Esc se usa para cerrar el desplegable de la
     búsqueda. El foco de un renglón es su borde verde sobre la tarjeta blanca (como la maqueta); el
     fondo ámbar es solo del renglón sin precio, que muestra «Precio a mano» en lugar del precio. Un
     producto sin movimientos de stock dice «sin stock», en la búsqueda y en la tarjeta. Entre
     tarjeta y tarjeta se ve el fondo gris cálido, y la zona de la pantalla no muestra el borde del
     foco. La línea de teclas de Vender queda (Enter, ↑ ↓, + −, Supr, F1).
     «Precio a mano» es un botón sin borde con el lápiz, al lado del precio por unidad; abre una
     ventana como la maqueta (el producto, la caja con «$», «Cancelar» y «Poner el precio», Enter).
     Puesto, el lugar del precio muestra «✎ A mano $34.434» (el margen queda sin elegir; tocarlo
     vuelve a abrir la ventana, y elegir un margen vuelve al precio del margen). La ventana dice, como
     la maqueta, que si no es múltiplo de $1.000 se avisa pero se cobra igual (RF-19; ver decisión 128). El
     margen no cambia al pasar el mouse. Lo que llega del celular (como lector o en espejo) se marca
     «Llegó del celular» unos segundos. Los nombres de los productos ya no van en mayúsculas: las
     listas los traen así y se muestran como frase («Prensa sargento tipo F 120x400mm /
     (Workpro)»), con las siglas (HSS, PVC, LED) y los códigos cortos en mayúsculas, en Vender del
     celular y de la computadora. En pantallas de hasta 1400 px el panel de la derecha se angosta.
     «De dónde sale» va en filas como la maqueta: cada paso con su importe a la derecha y una línea
     punteada entre ellas (costo con proveedor y fecha de la lista, + margen, + IVA, el precio para
     arriba a $1.000, × la cantidad y, si hace falta, para arriba a $1.000 el renglón), y el total
     del renglón grande abajo. El botón para ocultar el panel usa el ícono de la maqueta. La boleta termina en el borde dentado del ticket, como la maqueta. En la computadora, y solo ahí, al entrar a
     Vender (por el menú, la pestaña, Alt+número o con las flechas) el cursor queda en la búsqueda:
     cambia, para Vender, la regla de dejar la marca en la pestaña (decisión 82).
128. **El precio a mano se cobra tal cual; sin «Mis datos»** (2026-10-20). Carlos: «quiero que se cobre
     tal cual». Era la regla desde la decisión 16 (RF-19: el precio puesto a mano, también el del
     ítem libre, no se redondea y, si no es múltiplo de $1.000, la venta lo avisa sin impedir
     cobrar), pero el código lo redondeaba, en el dispositivo y en el servidor: se corrigió en los
     dos (un renglón que llega sin margen aplicado es de precio a mano). En la boleta no va el nombre
     de quien vende. El menú del usuario no lleva «Mis datos» (T133).
129. **El catálogo vive en el servidor; sin internet se registran ventas, no se busca** (2026-10-20).
     Tras el aviso de Supabase (pasó el tope del plan gratuito), Carlos: «que descargue solo lo
     que necesita, siempre paginado»; los márgenes se traen recién al buscar, solo los de esa
     búsqueda; lo que cambia poco (productos, listas) se guarda en el servidor y lo que varía
     (ventas) se lee de la base; «cuando no hay internet se pierde la capacidad de búsqueda, lo
     que se conserva es la capacidad de registrar ventas». El chequeo de salud no consulta la
     base y no hacen falta los registros de la base. Cambia el principio IV de la constitución,
     RNF-10 y RNF-11, y reemplaza RF-84 y RF-85 (specs/018, ADR-023).
130. **Las flechas nunca sacan el cursor de la caja de texto** (2026-10-20). Carlos: «son dos focos
     distintos, el foco del cursor y el foco del teclado son independientes». En la computadora,
     ↑ desde la primera fila saca la marca de la lista; si el cursor está en una caja de texto (la
     búsqueda), se queda ahí y no pasa a la pestaña. A las pestañas y al menú se llega con ← (con la
     búsqueda vacía) o sin el cursor en una caja. Vale en todas las pantallas (decisión 82).
131. **Vuelven los cuatro últimos productos vendidos a la venta vacía** (2026-10-20). Carlos marcó
     cómo queda Vender sin productos en la computadora: el recuadro gris con el carrito, «La venta
     está vacía» y cómo empezar, y debajo «Lo último que se vendió», cuatro tarjetas en fila con la
     foto, el nombre y el precio, que agregan el producto con un clic. Cambia lo de la decisión 126
     (que la había sacado). Salen de las ventas guardadas en este dispositivo y de las de hoy; con
     el catálogo en el servidor (018), los productos de esas tarjetas se tendrán que traer de ahí.
132. **Sin aviso de «no es múltiplo de $1.000»; el tacho a la derecha del precio** (2026-10-20).
     Carlos: el cartel que aclara que el precio a mano no es múltiplo de $1.000 no hace falta; se
     saca en el celular y en la computadora (cambia RF-19 y la decisión 16: se cobra tal cual, sin
     aviso). En el renglón de la computadora el tacho va a la derecha del precio (cambia lo de la
     decisión 127), y el desplegable de la unidad tiene el estilo de la pantalla.
133. **Los últimos productos vendidos, del servidor; el panel hasta abajo; ← no saca el cursor**
     (2026-10-20). Carlos: en la venta vacía, los productos de las últimas cuatro ventas, y «De dónde
     sale» hasta abajo. Los da el servidor con una consulta corta (`GET /ventas/ultimos-productos`),
     que puede pedir quien vende aunque no pueda ver las ventas; sin conexión salen de las ventas
     guardadas en el dispositivo. El panel de la derecha llega hasta la barra del cobro. «No llevó»
     lleva su F4 al lado del botón y no en la línea de teclas («no hace falta que esté dos veces»).
     Y, como en la decisión 130, ← tampoco saca el cursor de una caja de texto: con el cursor en un
     campo, ← y → son del campo; al menú se llega desde la pestaña, con Alt + número o con
     Mayúsculas+Tab. El aviso de «Quitaste…» y «Vaciaste…» es el de la maqueta: verde oscuro, con el tacho y
     «Deshacer», sin la ×; se va solo.
134. **Vender en la computadora con las animaciones de la maqueta** (2026-10-20). Carlos pidió las de
     la maqueta elegida, sobre todo al buscar y al agregar. Con los tiempos y curvas del lenguaje
     «Mostrador»: el desplegable de la búsqueda asoma; lo que se suma (un renglón nuevo, uno al que le
     subió la cantidad o lo que trae el celular) entra con un rebote y un borde verde que se apaga
     solo; lo que se quita, y todo al vaciar, sube y se desvanece; los demás renglones se deslizan a
     su lugar; el total, el subtotal y la cuenta de productos ruedan al cambiar; la cuenta del menú
     salta al sumar; el renglón sin precio se sacude al intentar cobrar; el aviso y la venta vacía
     suben al aparecer, y los botones se hunden un poco al apretarlos. Solo se mueve transform y
     opacity, y nada se mueve para quien pidió menos movimiento en su sistema.
135. **Corregir y cambiar una venta: las reglas** (2026-10-20). Carlos respondió para la T132: el
     cambio se acepta hasta 15 días después de la venta; corregir y cambiar piden el mismo permiso
     que anular; si el total sube, la diferencia se cobra en el momento con el medio que se elija;
     si baja, se devuelve en efectivo o baja la deuda de cuenta corriente; lo que vuelve se pregunta
     si está fallado; una venta anulada no se corrige ni se cambia; si el cliente no sabe cuándo
     compró, se busca por producto en los últimos días. Las pantallas, como la v2 (en la computadora,
     la venta a la derecha con «Corregir» E, «Cambio» C y «Anular»; «Registrar un cambio» Alt+C; en el
     celular, la hoja de la venta). Especificación en `specs/019-corregir-y-cambiar/`. «Ventas de hoy»
     en la computadora pasa a ser la v2 («El día y la venta»), sin sumarle nada de las otras.
136. **Los datos para trabajar sin conexión se bajan a mano; «Trabajar sin conexión» también en la
     computadora** (2026-10-20). Carlos: Configuración queda como está; se agrega un botón que, solo
     cuando se lo toca, baja lo que usan quien vende y quien compra (no lo del administrador:
     Procesos, «Cómo va el negocio»); la vez siguiente trae solo lo nuevo, con la marca que da el
     servidor; lo bajado se usa solo sin conexión; «Cómo buscar productos» queda como está por el
     momento. «Trabajar sin conexión» va también en la computadora (arranca habilitada, como
     trabaja hoy). Aprobó la maqueta (specs/018, historia 5).

