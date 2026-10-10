# Decisiones de negocio

Lo que Carlos decidió sobre qué tiene que hacer el sistema, por fecha, y lo que sigue
abierto. Es el par de los [ADR](adr/README.md), que guardan las decisiones técnicas. Cada
decisión está además en la sección Clarifications de la especificación que toca
(`specs/`). Una decisión nueva se agrega acá con su fecha; las anteriores no se reescriben.

Vino de `specs/README.md` (secciones 6 a 9) el 2026-10-10. Donde el texto dice
«sección 7» o «sección 9», se refiere a los títulos de este mismo archivo.

## Fuera de esta etapa

- Factura electrónica de ARCA (RF-30).
- Devoluciones con reintegro o saldo a favor (RF-24b).
- Buscar un producto por foto (RF-09b): segunda versión.
- Permisos finos por rol (RF-72).
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
   se usan solo donde el rol no alcanza para describir el proceso (sección 2, RF-72).
9. **Dos interfaces.** La de celular queda como está. La de computadora vuelve al layout de
   tablas anterior al rediseño, con la paleta y la marca del celular (RNF-05, ADR-014).
10. **Entrar leyendo un QR.** Se quita: se entra con Google o con la huella (RF-70).
11. **Otras ferreterías.** Cada una con su instalación y su base de datos propias (RF-32).
12. **Lo que estaba marcado «Hecho» y no lo estaba del todo** pasa a «Hecho en parte» con su
    issue: corregir ventas (#56), marcar pagada una cuenta corriente (#57) y filtrar quién
    hizo qué (#58).

## Revisión del 2026-10-09

Se comparó este documento con todo lo que el dueño pidió durante el desarrollo (2026-09-13
al 2026-09-15). Lo que faltaba se agregó:

- **Requerimientos nuevos en el documento, ya construidos:** RF-01b, RF-20b, RF-70b, RF-73,
  RF-74, RNF-09, RNF-44 y la sección 4.6 (RNF-50 a RNF-56).
- **Requerimiento que faltaba y sigue pendiente:** RF-43, precio distinto para clientes
  importantes según cantidad y velocidad de pago (relato del 2026-09-13; está en el alcance
  de #43).
- **Detalle sumado a requerimientos que ya estaban:** RF-01, RF-06, RF-08, RF-09, RF-10,
  RF-12, RF-16, RF-23, RF-50, RF-52, RF-53, RF-70, RF-71, RNF-04, RNF-06, RNF-20, RNF-40,
  RNF-43.
- **Sección 6:** se sumó RF-32, que estaba marcado fuera de esta etapa pero no figuraba.

No se cambió ningún estado ni se quitó nada.

## Preguntas abiertas

Las contradicciones encontradas el 2026-10-09 quedaron resueltas (sección 7). Sigue abierto
esto; el agente que toque uno de estos puntos pregunta antes de avanzar.

1. **Qué rol puede qué (RF-72, #59).** Están definidos administrar (Administrador), vender
   (Vendedor) y recibir mercadería (Comprador). Falta decidir quién puede: cargar listas de
   precios, elegir márgenes, contar stock, unir duplicados, ver costos, ver las ventas del día
   y anular ventas. Los casos de uso de la sección 5 ponen listas, conteo y pedidos en el
   Comprador como propuesta, sin confirmar.
2. **El quinto actor.** El dueño habló de cinco actores y nombró cuatro: Dueño, Empleado,
   Cliente y Proveedor. Falta saber cuál es el quinto, o si son cuatro.
3. **Precio a mano que no es múltiplo de $1.000.** Hoy se redondea para arriba como todo lo
   demás: $1.500 tipeado a mano se cobra $2.000, y la pantalla lo explica. Si el precio a
   mano tiene que respetarse tal cual, RF-19 necesita esa excepción.
