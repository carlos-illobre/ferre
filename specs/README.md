# Especificaciones de ferre (Ferrebress)

La entrada al proyecto: de qué se trata y dónde está escrito cada requerimiento. Con lo que
hay en esta carpeta, alguien que nunca vio el código tiene que poder construir de nuevo una
aplicación que cumpla todos los requerimientos, funcionales y no funcionales.

**Acá no se dice si algo está hecho.** Eso depende del código de hoy y vive en
[proyecto/estado.yml](../proyecto/estado.yml), con las pruebas que lo respaldan y los puntos
donde el código se aparta de la regla.

## De qué se trata

Aumentar las ventas de una ferretería de barrio. El primer paso es saber qué se vende, qué
hay en stock, cuánta plata hay invertida y cuánto se gana, reemplazando el cuaderno de
ventas y las listas de precios en Excel por un sistema que no le sume trabajo a quien
atiende el mostrador.

Lo que más importa, en este orden:

1. Facilidad de uso: que se use sin manual, en la laptop y en el celular.
2. Alta disponibilidad: que el mostrador nunca se frene por el sistema.
3. Respaldos: que no se pierda ningún dato.
4. Información: guardarla toda y poder verla.

Los roles, los actores y qué puede cada uno están en
[007-usuarios-y-acceso](007-usuarios-y-acceso/spec.md).

## Cómo está organizado

| Dónde | Qué tiene |
|---|---|
| [La constitución](../.specify/memory/constitution.md) | Lo que no se negocia y el flujo de trabajo |
| [001-base-del-sistema](001-base-del-sistema/) | Lo que vale para todo: los requerimientos no funcionales (`spec.md`), la arquitectura decidida (`plan.md`), el modelo de datos completo (`data-model.md`) y cómo se levanta y se prueba (`quickstart.md`) |
| `002` a `007` | Una por capacidad, con todos sus requerimientos: `spec.md` (historias, escenarios de aceptación y requerimientos), `ux.md` (requerimientos de interfaz, sin atarse a un diseño), `data-model.md` y `contracts/api.md` (el contrato del servidor) y, donde hubo relevamiento, `research.md` |
| `008` en adelante | Una por funcionalidad nueva, con el flujo de la constitución |
| [preguntas-abiertas.md](preguntas-abiertas.md) | Lo que todavía no está decidido. Cada pregunta está marcada en su `spec.md` como `[NEEDS CLARIFICATION]` |

Fuera de `specs/`: las decisiones técnicas en [docs/adr](../docs/adr/README.md), las
decisiones de negocio de Carlos en [docs/decisiones-de-negocio.md](../docs/decisiones-de-negocio.md),
el sistema visual en [docs/sistema-visual.md](../docs/sistema-visual.md), los manuales del
servidor en [docs/operacion](../docs/operacion/) y lo que falta hacer en los
[issues](https://github.com/carlos-illobre/ferre/issues).

## Requerimientos funcionales

### Catálogo y precios

| ID | Requerimiento | Especificación |
|---|---|---|
| RF-01 | Cargar la lista de precios de un proveedor subiendo el archivo Excel; el sistema reconoce el proveedor, muestra qué cambia (nuevos, cambiados, dados de baja) y actualiza todo al confirmar. Nada se guarda hasta confirmar y se puede descartar | [002-catalogo-y-precios](002-catalogo-y-precios/spec.md) |
| RF-01b | Desde la ficha de un producto, bajar el Excel original de la lista de la que salió su costo | [002-catalogo-y-precios](002-catalogo-y-precios/spec.md) |
| RF-02 | Cargar listas en PDF | [002-catalogo-y-precios](002-catalogo-y-precios/spec.md) |
| RF-03 | Cargar la lista de cualquier proveedor nuevo sin programar un lector a medida | [002-catalogo-y-precios](002-catalogo-y-precios/spec.md) |
| RF-04 | Recibir las listas solas desde el correo del negocio o la web del proveedor | [002-catalogo-y-precios](002-catalogo-y-precios/spec.md) |
| RF-05 | Cada artículo guarda el código de cada proveedor que lo vende. Se empieza con pocos proveedores y se suman de a poco; entre todos pueden superar los 100.000 artículos | [002-catalogo-y-precios](002-catalogo-y-precios/spec.md) |
| RF-06 | Un mismo artículo vendido por varios proveedores se une en uno solo; se ve quién lo vende y quién es más barato. El sistema sugiere los duplicados, también se unen a mano, y dos productos unidos se pueden volver a separar | [002-catalogo-y-precios](002-catalogo-y-precios/spec.md) |
| RF-07 | Buscar un producto por nombre, código o código de barras, sin saber el proveedor, con respuesta instantánea | [002-catalogo-y-precios](002-catalogo-y-precios/spec.md) |
| RF-08 | Leer el código de barras con la cámara del celular, también para cargarlo en la laptop: el celular se vincula a la laptop leyendo un QR y lo que escanea aparece en la pantalla de la laptop | [002-catalogo-y-precios](002-catalogo-y-precios/spec.md) |
| RF-09 | Sacarle una foto al producto desde el celular y guardarla en su ficha. La foto chica se amplía al tocarla y desde ahí se puede sacar otra para reemplazarla | [002-catalogo-y-precios](002-catalogo-y-precios/spec.md) |
| RF-09b | Encontrar un producto sin código de barras sacándole una foto | [002-catalogo-y-precios](002-catalogo-y-precios/spec.md) |
| RF-10 | Precio de venta = costo + margen. El margen se elige con un toque (300 / 200 / 100 / 50 / 25 %) o a mano, y queda guardado por producto. En el catálogo, «a mano» es un porcentaje, no un precio | [002-catalogo-y-precios](002-catalogo-y-precios/spec.md) |
| RF-11 | Costo comparable entre proveedores: descuentos e IVA aplicados igual para todos | [002-catalogo-y-precios](002-catalogo-y-precios/spec.md) |
| RF-12 | Productos fraccionados (clavos por kilo, cable por metro, líquidos por litro). Lo que se vende por unidad lleva cantidades enteras; lo fraccionado, hasta un decimal | [002-catalogo-y-precios](002-catalogo-y-precios/spec.md) |
| RF-13 | Todo número calculado explica de dónde sale | [002-catalogo-y-precios](002-catalogo-y-precios/spec.md) |
| RF-14 | Historial de precios por producto y proveedor | [002-catalogo-y-precios](002-catalogo-y-precios/spec.md) |
| RF-15 | Después de cargar una lista, avisar qué productos hay que remarcar | [002-catalogo-y-precios](002-catalogo-y-precios/spec.md) |
| RF-16 | Ayudar a decidir el margen con datos (costeo por absorción: costos fijos, rotación) en vez de a ojo | [002-catalogo-y-precios](002-catalogo-y-precios/spec.md) |
| RF-17 | Descuentos puntuales de un proveedor que se trasladan al precio de venta mientras duran | [002-catalogo-y-precios](002-catalogo-y-precios/spec.md) |
| RF-18 | Buscar proveedores y ver su ficha: datos de contacto, listas cargadas, qué venden | [002-catalogo-y-precios](002-catalogo-y-precios/spec.md) |
| RF-19 | Toda venta es múltiplo de $1.000, porque no hay billetes chicos para dar vuelto. El precio de venta se redondea para arriba a $1.000 y cada renglón de la venta también, incluido lo que se vende suelto y el precio a mano | [002-catalogo-y-precios](002-catalogo-y-precios/spec.md) |

### Ventas

| ID | Requerimiento | Especificación |
|---|---|---|
| RF-20 | Registrar una venta en el orden del mostrador: buscar, ver precio, cantidad, cobrar | [003-ventas](003-ventas/spec.md) |
| RF-20b | En la venta, el margen de un producto se elige o cambia ahí mismo, y el precio de un renglón se puede poner a mano solo para esa venta | [003-ventas](003-ventas/spec.md) |
| RF-21 | Medios de pago: efectivo, Mercado Pago, tarjeta, cuenta corriente | [003-ventas](003-ventas/spec.md) |
| RF-22 | Vender un producto que no está en ninguna lista (ítem libre) y darlo de alta ahí mismo | [003-ventas](003-ventas/spec.md) |
| RF-23 | Ver las ventas del día, corregirlas y anularlas. Cada venta muestra sus productos, uno por renglón | [003-ventas](003-ventas/spec.md) |
| RF-24 | Cambio por otro producto: vuelve al stock lo devuelto, sale lo nuevo y se cobra la diferencia | [003-ventas](003-ventas/spec.md) |
| RF-24b | Devoluciones con reintegro de plata o saldo a favor, a elección del cliente; plazo a definir | [003-ventas](003-ventas/spec.md) |
| RF-25 | Anotar lo que un cliente pidió y no se vendió, con el motivo (no había, precio) | [003-ventas](003-ventas/spec.md) |
| RF-26 | Pedidos de clientes sin stock: lista de lo que hay que conseguir, para quién y qué día se le prometió | [003-ventas](003-ventas/spec.md) |
| RF-27 | Presupuestos: se arman como una venta, no tocan stock, se convierten en venta | [003-ventas](003-ventas/spec.md) |
| RF-28 | Mandar el comprobante de la venta por WhatsApp | [003-ventas](003-ventas/spec.md) |
| RF-29 | Cargar las últimas dos semanas del cuaderno como ventas históricas | [003-ventas](003-ventas/spec.md) |
| RF-30 | Factura electrónica de ARCA | [003-ventas](003-ventas/spec.md) |
| RF-31 | Venta online de los productos de la ferretería, con devoluciones (RF-24b) | [003-ventas](003-ventas/spec.md) |
| RF-32 | Ofrecer el sistema a otras ferreterías con licencia de uso; cada una con su instalación y su base | [003-ventas](003-ventas/spec.md) |

### Clientes

| ID | Requerimiento | Especificación |
|---|---|---|
| RF-40 | Vender a cuenta corriente a un cliente importante y marcar la venta como pagada | [004-clientes](004-clientes/spec.md) |
| RF-41 | Cuenta corriente completa: saldo, pagos parciales, antigüedad de la deuda, resumen para mandar | [004-clientes](004-clientes/spec.md) |
| RF-42 | Buscar clientes importantes y ver su ficha con lo que compraron y lo que deben | [004-clientes](004-clientes/spec.md) |
| RF-43 | Precio distinto para un cliente importante según la cantidad que compra y lo rápido que paga | [004-clientes](004-clientes/spec.md) |

### Compras y stock

| ID | Requerimiento | Especificación |
|---|---|---|
| RF-50 | Registrar cada compra a proveedor con su costo real; suma stock. Con factura, con remito o sin comprobante. Las compras recientes se abren para ver sus renglones y se pueden anular | [005-compras-y-stock](005-compras-y-stock/spec.md) |
| RF-51 | Cargar la factura de compra con una foto, sin tipear los renglones | [005-compras-y-stock](005-compras-y-stock/spec.md) |
| RF-52 | El stock arranca en cero; lo que ya hay se carga de a poco, por sector. Un conteo interrumpido queda abierto y se retoma | [005-compras-y-stock](005-compras-y-stock/spec.md) |
| RF-53 | Stock actual y cuánta plata hay invertida. El stock de cada producto muestra los movimientos que lo explican y se puede corregir a mano, con el motivo | [005-compras-y-stock](005-compras-y-stock/spec.md) |
| RF-54 | Aviso de stock bajo y sugerencia de qué pedir | [005-compras-y-stock](005-compras-y-stock/spec.md) |
| RF-55 | Armar el pedido a un proveedor | [005-compras-y-stock](005-compras-y-stock/spec.md) |
| RF-56 | Lo que se les debe a los proveedores y cuándo vence: se paga por adelantado cuando hay descuento, y si no a 30 o 60 días | [005-compras-y-stock](005-compras-y-stock/spec.md) |
| RF-57 | Etiquetas con código de barras para lo que no lo trae de fábrica | [005-compras-y-stock](005-compras-y-stock/spec.md) |
| RF-58 | Plan de conteo: qué contar primero según lo que más se vende | [005-compras-y-stock](005-compras-y-stock/spec.md) |

### Información del negocio

| ID | Requerimiento | Especificación |
|---|---|---|
| RF-60 | Tablero: ventas y ganancia de hoy, semana y mes; comparación con el período anterior | [006-informacion-del-negocio](006-informacion-del-negocio/spec.md) |
| RF-61 | Lo más vendido y lo que no rota | [006-informacion-del-negocio](006-informacion-del-negocio/spec.md) |
| RF-62 | Cierre de caja diario: efectivo contado contra ventas en efectivo | [006-informacion-del-negocio](006-informacion-del-negocio/spec.md) |
| RF-63 | Novedades del día: resumen de lo que pasó, visible en la app y enviado solo a los Administradores | [006-informacion-del-negocio](006-informacion-del-negocio/spec.md) |
| RF-64 | Gastos fijos y resultado mensual | [006-informacion-del-negocio](006-informacion-del-negocio/spec.md) |
| RF-65 | Gasto semanal en compras, sin papel | [006-informacion-del-negocio](006-informacion-del-negocio/spec.md) |

### Usuarios y acceso

| ID | Requerimiento | Especificación |
|---|---|---|
| RF-70 | Solo entran usuarios autorizados, con su cuenta de Google o la huella del celular; sin contraseñas ni QR. Se autoriza a alguien cargando su correo desde la app; quien no está autorizado ve «no autorizado» | [007-usuarios-y-acceso](007-usuarios-y-acceso/spec.md) |
| RF-70b | Vincular el celular a la cuenta para entrar con la huella. La app lo ofrece sola la primera vez que se entra con Google desde un celular, y nunca en la computadora; también se vincula y se quita a mano | [007-usuarios-y-acceso](007-usuarios-y-acceso/spec.md) |
| RF-71 | Quién hizo qué: cada acción queda con su usuario y se puede consultar, de a 10 por página, filtrando por usuario, fecha y tipo de acción | [007-usuarios-y-acceso](007-usuarios-y-acceso/spec.md) |
| RF-72 | Permisos por rol, con los tres roles Administrador, Vendedor y Comprador, combinables; cada pantalla y cada operación exige el rol que corresponde; nunca queda el sistema sin un Administrador | [007-usuarios-y-acceso](007-usuarios-y-acceso/spec.md) |
| RF-73 | Reemplazado por RF-72. Eran los roles anteriores: dueño, admin y mostrador, uno solo por usuario | [007-usuarios-y-acceso](007-usuarios-y-acceso/spec.md) |
| RF-74 | Ver las sesiones abiertas en cada dispositivo y cerrarlas a distancia; cerrar la propia vuelve a la pantalla de entrada | [007-usuarios-y-acceso](007-usuarios-y-acceso/spec.md) |

## Requerimientos no funcionales

Los que son reglas generales están además en la constitución.

### Facilidad de uso

| ID | Requerimiento | Especificación |
|---|---|---|
| RNF-01 | Curva de aprendizaje cero: un Vendedor nuevo vende el primer día sin manual | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-02 | Nunca más lento que el cuaderno y la calculadora: una venta de 3 productos en menos de 20 segundos | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-03 | Mínimo esfuerzo manual: no se tipea nada que se pueda sacar de una lista, un código de barras o una foto | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-04 | Celular: la interfaz actual se conserva tal como está, en pantallas de menos de 900 px. Se parece a una app nativa y ninguna pantalla se desplaza hacia el costado | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-05 | Computadora: usa todo el ancho de la pantalla, se ve prolija y se maneja con teclado, sin cambiar nada del celular. Es una interfaz propia: tablas, menú completo y atajos de teclado, con la misma paleta y la misma marca que el celular (ADR-014) | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-06 | Todo en castellano, con las palabras del mostrador; los errores dicen qué hacer | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-07 | Búsqueda y cambio de margen responden en menos de 100 ms | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-08 | La búsqueda sigue siendo instantánea y funciona sin internet con más de 100.000 artículos, en la notebook vieja | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-09 | Lo que tarda muestra su avance; los avisos desaparecen solos al corregir la causa; lo que se puede tocar parece un botón; los paneles plegables arrancan abiertos | [001-base-del-sistema](001-base-del-sistema/spec.md) |

### Disponibilidad

| ID | Requerimiento | Especificación |
|---|---|---|
| RNF-10 | Sin internet no se nota: buscar y vender funcionan igual y lo pendiente se manda solo al reconectar | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-11 | Una caída del servidor no frena el mostrador | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-12 | Aviso a los Administradores si la API o la base dejan de responder | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-13 | Actualizar la versión sin cortar el mostrador ni perder datos | [001-base-del-sistema](001-base-del-sistema/spec.md) |

### Respaldos

| ID | Requerimiento | Especificación |
|---|---|---|
| RNF-20 | No se pierde ninguna venta ni ningún cambio: cada uno vive en el dispositivo hasta que el servidor lo confirma, aunque se recargue la página o se corte internet. Las ventas confirmadas quedan además 7 días en el dispositivo | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-21 | Copia de la base cada hora, guardada 30 días | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-22 | Copia semanal cifrada fuera de Oracle y de Supabase | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-23 | Prueba mensual automática de que la copia se puede restaurar | [001-base-del-sistema](001-base-del-sistema/spec.md) |

### Información

| ID | Requerimiento | Especificación |
|---|---|---|
| RNF-30 | Nada se borra y los históricos no se pisan: precios, stock y eventos solo suman filas | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-31 | Cada venta guarda el costo, el margen y el precio de ese momento | [001-base-del-sistema](001-base-del-sistema/spec.md) |

### Equipo, costo y seguridad

| ID | Requerimiento | Especificación |
|---|---|---|
| RNF-40 | Funciona en la notebook vieja del local (Chrome o Firefox) y en un celular Android, sin instalar nada. En el celular se puede agregar a la pantalla de inicio como una app | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-41 | El único lector de códigos es la cámara del celular | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-42 | Costo de infraestructura cero hasta que el sistema muestre resultados | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-43 | HTTPS siempre; sesiones revocables; ningún dato de proveedores ni secreto en el repositorio, que es público | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-44 | En el servidor la app corre con un usuario propio sin privilegios de administrador y no publica puertos a internet | [001-base-del-sistema](001-base-del-sistema/spec.md) |

### Arquitectura y forma de trabajo

| ID | Requerimiento | Especificación |
|---|---|---|
| RNF-50 | El servidor está separado de la pantalla: la misma API la consume la web y la podrá consumir una app Android. Los servicios se llaman por lo que resuelven del negocio | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-51 | Cada problema con la tecnología que mejor lo resuelve; en caso de duda o empate, TypeScript | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-52 | Importa la disponibilidad, no la escala: tres usuarios y unas 200 ventas por día | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-53 | Dos ambientes: pruebas, que se actualiza solo con cada cambio, y producción, que se actualiza cuando Carlos lo pide | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-54 | El ambiente de pruebas se distingue a simple vista: la barra titila y dice «Ambiente de prueba» | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-55 | Pruebas automáticas: las unitarias corren en cada cambio; las de punta a punta cubren los caminos principales y se corren a mano | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-56 | Cada decisión técnica queda escrita con su porqué (un ADR) y la documentación se mantiene al día con el código | [001-base-del-sistema](001-base-del-sistema/spec.md) |

## De dónde vino cada cosa

La documentación anterior a Spec Kit se repartió así el 2026-10-10. Los archivos viejos
están en el historial de git.

| Documento anterior | Dónde quedó |
|---|---|
| Requerimientos: objetivo | Este archivo |
| Requerimientos: actores y roles | `007-usuarios-y-acceso/spec.md` |
| Requerimientos funcionales y casos de uso | Este índice y la `spec.md` de cada capacidad (`002` a `007`) |
| Requerimientos no funcionales | Este índice, `001-base-del-sistema/spec.md` y la constitución |
| El estado de cada requerimiento | `proyecto/estado.yml` |
| Decisiones del dueño y preguntas abiertas | `docs/decisiones-de-negocio.md`, la sección Clarifications de cada `spec.md` y `preguntas-abiertas.md` |
| Casos de prueba de punta a punta | Escenarios de aceptación de cada `spec.md`; las convenciones, en `001-base-del-sistema/quickstart.md` |
| Procedimiento actual del empleado | `research.md` de `003-ventas`, `004-clientes` y `005-compras-y-stock` |
| Relevamiento de proveedores | `002-catalogo-y-precios/research.md` |
| Arquitectura y diagramas | `001-base-del-sistema/plan.md` |
| Modelo de datos | `001-base-del-sistema/data-model.md` y el `data-model.md` de cada capacidad |
| Seguridad | Constitución (principio VII) y `001-base-del-sistema/plan.md` |
| Pruebas | Constitución (principio VI) y `001-base-del-sistema/quickstart.md` |
| Guía de interfaz | Constitución (principio II), `docs/sistema-visual.md` y el `ux.md` de cada capacidad |
| Despliegue y configuración de Google | `docs/operacion/` |
| Reglas para agentes | Constitución; `CLAUDE.md` quedó como guía corta |
