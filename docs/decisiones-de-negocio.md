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
