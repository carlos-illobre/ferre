# Especificaciones de ferre (Ferrebress)

La entrada al proyecto: de qué se trata, qué está hecho, qué falta y dónde está escrito
cada requerimiento. Lo lee quien llega al proyecto, persona o agente, y lo lee el tablero
del portafolio.

## De qué se trata

Aumentar las ventas de una ferretería de barrio. El primer paso es saber qué se vende, qué
hay en stock, cuánta plata hay invertida y cuánto se gana, reemplazando el cuaderno de
ventas y las listas de precios en Excel por un sistema que no le sume trabajo a quien
atiende el mostrador.

Prioridad de corto plazo, en este orden:

1. Facilidad de uso: que se use sin manual, en la laptop y en el celular.
2. Alta disponibilidad: que el mostrador nunca se frene por el sistema.
3. Respaldos: que no se pierda ningún dato.
4. Información: guardarla toda y poder verla.

Los roles, los actores y qué puede cada uno están en
[007-usuarios-y-acceso](007-usuarios-y-acceso/spec.md).

## Cómo está organizado

| Carpeta | Qué tiene |
|---|---|
| [001-base-del-sistema](001-base-del-sistema/) | Lo que vale para todo: arquitectura (`plan.md`), modelo de datos completo (`data-model.md`), cómo se levanta y se prueba (`quickstart.md`) y los requerimientos no funcionales (`spec.md`) |
| `002` a `007` | Una por capacidad, con lo ya construido: `spec.md` (historias, escenarios y requerimientos), `ux.md` (pantallas), `data-model.md`, `contracts/api.md`, `tasks.md` y, donde hubo relevamiento, `research.md` |
| `008` en adelante | Una por funcionalidad nueva, con el flujo de la [constitución](../.specify/memory/constitution.md) |

Las carpetas `001` a `007` son la **línea de base**: lo construido antes de adoptar Spec
Kit, escrito el 2026-10-10 contrastando cada requerimiento con las pruebas y el código. Lo
que esa revisión encontró está en [linea-de-base-hallazgos.md](linea-de-base-hallazgos.md).

Fuera de `specs/`: las decisiones técnicas en [docs/adr](../docs/adr/README.md), las
decisiones de negocio de Carlos en [docs/decisiones-de-negocio.md](../docs/decisiones-de-negocio.md),
los manuales del servidor en [docs/operacion](../docs/operacion/) y el sistema visual en
[docs/sistema-visual.md](../docs/sistema-visual.md).

## Estados

- **Hecho:** construido, con prueba que lo respalda.
- **Hecho en parte:** el estado dice qué parte está y cuál falta.
- **A validar:** construido; falta comprobarlo en uso.
- **Pendiente:** tiene tarea y no está hecho.
- **Nuevo:** todavía no tiene tarea.
- Lo que dice **fuera de esta etapa** o **segunda versión** no cuenta para el avance.

Los `#N` son issues de GitHub. Lo que falta hacer vive ahí; cuando un issue se toma, se le
crea su carpeta.

## Requerimientos funcionales

### Catálogo y precios

Especificación: [002-catalogo-y-precios](002-catalogo-y-precios/spec.md)

| ID | Requerimiento | Estado | Dónde |
|---|---|---|---|
| RF-01 | Cargar la lista de precios de un proveedor subiendo el archivo Excel; el sistema reconoce el proveedor, muestra qué cambia (nuevos, cambiados, dados de baja) y actualiza todo al confirmar. Nada se guarda hasta confirmar y se puede descartar | Hecho en parte (#12, 4 proveedores): los productos que ya no aparecen en la lista solo se cuentan; al confirmar no se dan de baja | [002-catalogo-y-precios](002-catalogo-y-precios/spec.md) |
| RF-01b | Desde la ficha de un producto, bajar el Excel original de la lista de la que salió su costo | Hecho | [002-catalogo-y-precios](002-catalogo-y-precios/spec.md) |
| RF-02 | Cargar listas en PDF | Pendiente (#27) | issues |
| RF-03 | Cargar la lista de cualquier proveedor nuevo sin programar un lector a medida | Pendiente (#22, #28) | issues |
| RF-04 | Recibir las listas solas desde el correo del negocio o la web del proveedor | Pendiente (#25, #26) | issues |
| RF-05 | Cada artículo guarda el código de cada proveedor que lo vende. Se empieza con pocos proveedores y se suman de a poco; entre todos pueden superar los 100.000 artículos | Hecho (#6); el volumen grande está sin probar (RNF-08) | [002-catalogo-y-precios](002-catalogo-y-precios/spec.md) |
| RF-06 | Un mismo artículo vendido por varios proveedores se une en uno solo; se ve quién lo vende y quién es más barato. El sistema sugiere los duplicados, también se unen a mano, y dos productos unidos se pueden volver a separar | Hecho (#29) | [002-catalogo-y-precios](002-catalogo-y-precios/spec.md) |
| RF-07 | Buscar un producto por nombre, código o código de barras, sin saber el proveedor, con respuesta instantánea | Hecho (#14) | [002-catalogo-y-precios](002-catalogo-y-precios/spec.md) |
| RF-08 | Leer el código de barras con la cámara del celular, también para cargarlo en la laptop: el celular se vincula a la laptop leyendo un QR y lo que escanea aparece en la pantalla de la laptop | Hecho (#52) | [002-catalogo-y-precios](002-catalogo-y-precios/spec.md) |
| RF-09 | Sacarle una foto al producto desde el celular y guardarla en su ficha. La foto chica se amplía al tocarla y desde ahí se puede sacar otra para reemplazarla | Hecho (#54) | [002-catalogo-y-precios](002-catalogo-y-precios/spec.md) |
| RF-09b | Encontrar un producto sin código de barras sacándole una foto | Nuevo, segunda versión | issues |
| RF-10 | Precio de venta = costo + margen. El margen se elige con un toque (300 / 200 / 100 / 50 / 25 %) o a mano, y queda guardado por producto. En el catálogo, «a mano» es un porcentaje, no un precio | Hecho (#13) | [002-catalogo-y-precios](002-catalogo-y-precios/spec.md) |
| RF-11 | Costo comparable entre proveedores: descuentos e IVA aplicados igual para todos | Pendiente (#11): el cálculo ya está construido y en uso; falta que Carlos cierre la regla | issues |
| RF-12 | Productos fraccionados (clavos por kilo, cable por metro, líquidos por litro). Lo que se vende por unidad lleva cantidades enteras; lo fraccionado, hasta un decimal | Hecho | [002-catalogo-y-precios](002-catalogo-y-precios/spec.md) |
| RF-13 | Todo número calculado explica de dónde sale | Hecho (#47) | [002-catalogo-y-precios](002-catalogo-y-precios/spec.md) |
| RF-14 | Historial de precios por producto y proveedor | Pendiente (#23) | issues |
| RF-15 | Después de cargar una lista, avisar qué productos hay que remarcar | Pendiente (#24) | issues |
| RF-16 | Ayudar a decidir el margen con datos (costeo por absorción: costos fijos, rotación) en vez de a ojo | Pendiente (#48) | issues |
| RF-17 | Descuentos puntuales de un proveedor que se trasladan al precio de venta mientras duran | Nuevo | issues |
| RF-18 | Buscar proveedores y ver su ficha: datos de contacto, listas cargadas, qué venden | Nuevo | issues |
| RF-19 | Toda venta es múltiplo de $1.000, porque no hay billetes chicos para dar vuelto. El precio de venta se redondea para arriba a $1.000 y cada renglón de la venta también, incluido lo que se vende suelto y el precio a mano | Hecho | [002-catalogo-y-precios](002-catalogo-y-precios/spec.md) |

### Ventas

Especificación: [003-ventas](003-ventas/spec.md)

| ID | Requerimiento | Estado | Dónde |
|---|---|---|---|
| RF-20 | Registrar una venta en el orden del mostrador: buscar, ver precio, cantidad, cobrar | Hecho (#15) | [003-ventas](003-ventas/spec.md) |
| RF-20b | En la venta, el margen de un producto se elige o cambia ahí mismo, y el precio de un renglón se puede poner a mano solo para esa venta | Hecho (#15) | [003-ventas](003-ventas/spec.md) |
| RF-21 | Medios de pago: efectivo, Mercado Pago, tarjeta, cuenta corriente | Hecho (#15) | [003-ventas](003-ventas/spec.md) |
| RF-22 | Vender un producto que no está en ninguna lista (ítem libre) y darlo de alta ahí mismo | Hecho en parte (#17): se vende como ítem libre. Falta darlo de alta ahí mismo | [003-ventas](003-ventas/spec.md) |
| RF-23 | Ver las ventas del día, corregirlas y anularlas. Cada venta muestra sus productos, uno por renglón | Hecho en parte (#16): ver y anular. Falta corregir una venta y ver días anteriores (#56) | [003-ventas](003-ventas/spec.md) |
| RF-24 | Cambio por otro producto: vuelve al stock lo devuelto, sale lo nuevo y se cobra la diferencia | Nuevo | issues |
| RF-24b | Devoluciones con reintegro de plata o saldo a favor, a elección del cliente; plazo a definir | Nuevo, fuera de esta etapa (llega con la venta online) | issues |
| RF-25 | Anotar lo que un cliente pidió y no se vendió, con el motivo (no había, precio) | Hecho en parte: «No llevó» guarda el producto y el precio ofrecido. Falta cargar el motivo y la vista para consultarlo | [003-ventas](003-ventas/spec.md) |
| RF-26 | Pedidos de clientes sin stock: lista de lo que hay que conseguir, para quién y qué día se le prometió | Nuevo | issues |
| RF-27 | Presupuestos: se arman como una venta, no tocan stock, se convierten en venta | Pendiente (#45) | issues |
| RF-28 | Mandar el comprobante de la venta por WhatsApp | Pendiente (#46) | issues |
| RF-29 | Cargar las últimas dos semanas del cuaderno como ventas históricas | Pendiente (#20) | issues |
| RF-30 | Factura electrónica de ARCA | Nuevo, fuera de esta etapa | issues |
| RF-31 | Venta online de los productos de la ferretería, con devoluciones (RF-24b) | Nuevo, fuera de esta etapa | issues |
| RF-32 | Ofrecer el sistema a otras ferreterías con licencia de uso; cada una con su instalación y su base | Nuevo, fuera de esta etapa | issues |

### Clientes

Especificación: [004-clientes](004-clientes/spec.md)

| ID | Requerimiento | Estado | Dónde |
|---|---|---|---|
| RF-40 | Vender a cuenta corriente a un cliente importante y marcar la venta como pagada | Hecho en parte (#15): se vende a cuenta corriente, sin prueba del camino completo. Falta la pantalla para marcarla pagada (#57) | [004-clientes](004-clientes/spec.md) |
| RF-41 | Cuenta corriente completa: saldo, pagos parciales, antigüedad de la deuda, resumen para mandar | Pendiente (#43) | issues |
| RF-42 | Buscar clientes importantes y ver su ficha con lo que compraron y lo que deben | Pendiente (#43) | issues |
| RF-43 | Precio distinto para un cliente importante según la cantidad que compra y lo rápido que paga | Pendiente (#43) | issues |

### Compras y stock

Especificación: [005-compras-y-stock](005-compras-y-stock/spec.md)

| ID | Requerimiento | Estado | Dónde |
|---|---|---|---|
| RF-50 | Registrar cada compra a proveedor con su costo real; suma stock. Con factura, con remito o sin comprobante. Las compras recientes se abren para ver sus renglones y se pueden anular | Hecho (#30) | [005-compras-y-stock](005-compras-y-stock/spec.md) |
| RF-51 | Cargar la factura de compra con una foto, sin tipear los renglones | Pendiente (#55) | issues |
| RF-52 | El stock arranca en cero; lo que ya hay se carga de a poco, por sector. Un conteo interrumpido queda abierto y se retoma | Hecho (#31) | [005-compras-y-stock](005-compras-y-stock/spec.md) |
| RF-53 | Stock actual y cuánta plata hay invertida. El stock de cada producto muestra los movimientos que lo explican y se puede corregir a mano, con el motivo | Hecho (#33) | [005-compras-y-stock](005-compras-y-stock/spec.md) |
| RF-54 | Aviso de stock bajo y sugerencia de qué pedir | Pendiente (#35) | issues |
| RF-55 | Armar el pedido a un proveedor | Pendiente (#36) | issues |
| RF-56 | Lo que se les debe a los proveedores y cuándo vence: se paga por adelantado cuando hay descuento, y si no a 30 o 60 días | Nuevo | issues |
| RF-57 | Etiquetas con código de barras para lo que no lo trae de fábrica | Pendiente (#34) | issues |
| RF-58 | Plan de conteo: qué contar primero según lo que más se vende | Pendiente (#32) | issues |

### Información del negocio

Especificación: [006-informacion-del-negocio](006-informacion-del-negocio/spec.md)

| ID | Requerimiento | Estado | Dónde |
|---|---|---|---|
| RF-60 | Tablero: ventas y ganancia de hoy, semana y mes; comparación con el período anterior | Pendiente (#39) | issues |
| RF-61 | Lo más vendido y lo que no rota | Pendiente (#39) | issues |
| RF-62 | Cierre de caja diario: efectivo contado contra ventas en efectivo | Pendiente (#40) | issues |
| RF-63 | Novedades del día: resumen de lo que pasó, visible en la app y enviado solo a los Administradores | Pendiente (#40); la vista en la app es nueva | issues |
| RF-64 | Gastos fijos y resultado mensual | Pendiente (#44) | issues |
| RF-65 | Gasto semanal en compras, sin papel | Hecho (#30) | [006-informacion-del-negocio](006-informacion-del-negocio/spec.md) |

### Usuarios y acceso

Especificación: [007-usuarios-y-acceso](007-usuarios-y-acceso/spec.md)

| ID | Requerimiento | Estado | Dónde |
|---|---|---|---|
| RF-70 | Solo entran usuarios autorizados, con su cuenta de Google o la huella del celular; sin contraseñas ni QR. Se autoriza a alguien cargando su correo desde la app; quien no está autorizado ve «no autorizado» | Hecho (#41) | [007-usuarios-y-acceso](007-usuarios-y-acceso/spec.md) |
| RF-70b | Vincular el celular a la cuenta para entrar con la huella. La app lo ofrece sola la primera vez que se entra con Google desde un celular, y nunca en la computadora; también se vincula y se quita a mano | Hecho (ADR-011) | [007-usuarios-y-acceso](007-usuarios-y-acceso/spec.md) |
| RF-71 | Quién hizo qué: cada acción queda con su usuario y se puede consultar, de a 10 por página, filtrando por usuario, fecha y tipo de acción | Hecho en parte (#41): consulta paginada. Faltan los filtros en pantalla (#58) | [007-usuarios-y-acceso](007-usuarios-y-acceso/spec.md) |
| RF-72 | Permisos por rol, con los tres roles Administrador, Vendedor y Comprador, combinables; cada pantalla y cada operación exige el rol que corresponde; nunca queda el sistema sin un Administrador | Pendiente (#59) | issues |
| RF-73 | Roles de hoy: dueño, admin (igual al dueño salvo crear, modificar o desactivar dueños) y mostrador (no administra); uno solo por usuario | Hecho (#41) | [007-usuarios-y-acceso](007-usuarios-y-acceso/spec.md) |
| RF-74 | Ver las sesiones abiertas en cada dispositivo y cerrarlas a distancia; cerrar la propia vuelve a la pantalla de entrada | Hecho (#41) | [007-usuarios-y-acceso](007-usuarios-y-acceso/spec.md) |

## Requerimientos no funcionales

Especificación: [001-base-del-sistema](001-base-del-sistema/spec.md). Los que son reglas
generales están además en la [constitución](../.specify/memory/constitution.md).

### Facilidad de uso

| ID | Requerimiento | Estado | Dónde |
|---|---|---|---|
| RNF-01 | Curva de aprendizaje cero: un Vendedor nuevo vende el primer día sin manual | A validar en el piloto (#21) | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-02 | Nunca más lento que el cuaderno y la calculadora: una venta de 3 productos en menos de 20 segundos | A validar (#21) | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-03 | Mínimo esfuerzo manual: no se tipea nada que se pueda sacar de una lista, un código de barras o una foto | Hecho en parte: listas en Excel, escáner y foto de producto. Falta #55 y #25 | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-04 | Celular: la interfaz actual se conserva tal como está, en pantallas de menos de 900 px. Se parece a una app nativa y ninguna pantalla se desplaza hacia el costado | Hecho | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-05 | Computadora: usa todo el ancho de la pantalla, se ve prolija y se maneja con teclado, sin cambiar nada del celular. Es una interfaz propia: tablas, menú completo y atajos de teclado, con la misma paleta y la misma marca que el celular (ADR-014) | A validar por Carlos en la notebook | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-06 | Todo en castellano, con las palabras del mostrador; los errores dicen qué hacer | Hecho | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-07 | Búsqueda y cambio de margen responden en menos de 100 ms | Hecho (#14) | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-08 | La búsqueda sigue siendo instantánea y funciona sin internet con más de 100.000 artículos, en la notebook vieja | Nuevo, sin probar | issues |
| RNF-09 | Lo que tarda muestra su avance; los avisos desaparecen solos al corregir la causa; lo que se puede tocar parece un botón; los paneles plegables arrancan abiertos | Hecho | [001-base-del-sistema](001-base-del-sistema/spec.md) |

### Disponibilidad

| ID | Requerimiento | Estado | Dónde |
|---|---|---|---|
| RNF-10 | Sin internet no se nota: buscar y vender funcionan igual y lo pendiente se manda solo al reconectar | Hecho (#18, #37) | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-11 | Una caída del servidor no frena el mostrador | Hecho | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-12 | Aviso a los Administradores si la API o la base dejan de responder | Pendiente (#19) | issues |
| RNF-13 | Actualizar la versión sin cortar el mostrador ni perder datos | Hecho | [001-base-del-sistema](001-base-del-sistema/spec.md) |

### Respaldos

| ID | Requerimiento | Estado | Dónde |
|---|---|---|---|
| RNF-20 | No se pierde ninguna venta ni ningún cambio: cada uno vive en el dispositivo hasta que el servidor lo confirma, aunque se recargue la página o se corte internet. Las ventas confirmadas quedan además 7 días en el dispositivo | Hecho (#18) | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-21 | Copia de la base cada hora, guardada 30 días | Pendiente (#19) | issues |
| RNF-22 | Copia semanal cifrada fuera de Oracle y de Supabase | Pendiente (#19) | issues |
| RNF-23 | Prueba mensual automática de que la copia se puede restaurar | Pendiente (#19) | issues |

### Información

| ID | Requerimiento | Estado | Dónde |
|---|---|---|---|
| RNF-30 | Nada se borra y los históricos no se pisan: precios, stock y eventos solo suman filas | Hecho en parte: anular y corregir suman filas. Al unir productos duplicados sí se modifican filas del histórico, y los renglones de un conteo se borran | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-31 | Cada venta guarda el costo, el margen y el precio de ese momento | Hecho (#47) | [001-base-del-sistema](001-base-del-sistema/spec.md) |

### Equipo, costo y seguridad

| ID | Requerimiento | Estado | Dónde |
|---|---|---|---|
| RNF-40 | Funciona en la notebook vieja del local (Chrome o Firefox) y en un celular Android, sin instalar nada. En el celular se puede agregar a la pantalla de inicio como una app | Hecho (#42); falta probar en la notebook real | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-41 | El único lector de códigos es la cámara del celular | Hecho (#52) | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-42 | Costo de infraestructura cero hasta que el sistema muestre resultados | Hecho | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-43 | HTTPS siempre; sesiones revocables; ningún dato de proveedores ni secreto en el repositorio, que es público | Hecho | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-44 | En el servidor la app corre con un usuario propio sin privilegios de administrador y no publica puertos a internet | Hecho | [001-base-del-sistema](001-base-del-sistema/spec.md) |

### Arquitectura y forma de trabajo

| ID | Requerimiento | Estado | Dónde |
|---|---|---|---|
| RNF-50 | El servidor está separado de la pantalla: la misma API la consume la web y la podrá consumir una app Android. Los servicios se llaman por lo que resuelven del negocio | Hecho | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-51 | Cada problema con la tecnología que mejor lo resuelve; en caso de duda o empate, TypeScript | Hecho | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-52 | Importa la disponibilidad, no la escala: tres usuarios y unas 200 ventas por día | Hecho | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-53 | Dos ambientes: pruebas, que se actualiza solo con cada cambio, y producción, que se actualiza cuando Carlos lo pide | Hecho | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-54 | El ambiente de pruebas se distingue a simple vista: la barra titila y dice «Ambiente de prueba» | Hecho | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-55 | Pruebas automáticas: las unitarias corren en cada cambio; las de punta a punta cubren los caminos principales y se corren a mano | Hecho | [001-base-del-sistema](001-base-del-sistema/spec.md) |
| RNF-56 | Cada decisión técnica queda escrita con su porqué (un ADR) y la documentación se mantiene al día con el código | Hecho en parte: los 14 ADR existen; varios documentos estaban atrasados respecto del código | [001-base-del-sistema](001-base-del-sistema/spec.md) |

## Casos de uso todavía sin construir

Los casos de uso ya construidos son las historias de usuario de cada `spec.md`. Estos tres
describen funcionalidad pendiente y pasan a su especificación cuando se tome su issue.

### CU-10 Hacer un presupuesto

- **Rol:** Vendedor.
- **Flujo:** lo arma igual que una venta → lo manda por WhatsApp o PDF → si el cliente acepta,
  lo convierte en venta con un toque (#45).
### CU-11 Decidir qué comprar

- **Rol:** Comprador.
- **Flujo:** mira stock bajo y pedidos de clientes → el sistema sugiere cantidades y el
  proveedor más barato → arma el pedido (#35, #36).
### CU-12 Cerrar la caja

- **Rol:** Vendedor.
- **Flujo:** al cerrar, tipea el efectivo contado → el sistema muestra la diferencia → el
  resumen del día les llega solo a los Administradores (#40).

## De dónde vino cada cosa

La documentación anterior a Spec Kit se repartió así el 2026-10-10. Los archivos viejos
están en el historial de git.

| Documento anterior | Dónde quedó |
|---|---|
| `docs/REQUERIMIENTOS.md`, objetivo | Este archivo |
| `docs/REQUERIMIENTOS.md`, actores y roles | `007-usuarios-y-acceso/spec.md` |
| `docs/REQUERIMIENTOS.md`, requerimientos funcionales | Este índice y la `spec.md` de cada capacidad (`002` a `007`) |
| `docs/REQUERIMIENTOS.md`, requerimientos no funcionales | Este índice, `001-base-del-sistema/spec.md` y la constitución |
| `docs/REQUERIMIENTOS.md`, casos de uso | Historias de usuario de cada `spec.md`; los no construidos, acá arriba |
| `docs/REQUERIMIENTOS.md`, decisiones del dueño y preguntas abiertas | `docs/decisiones-de-negocio.md`, y la sección Clarifications de cada `spec.md` |
| `docs/casos-de-prueba-e2e.md` | Escenarios de aceptación de cada `spec.md`; convenciones en `001-base-del-sistema/quickstart.md` |
| `docs/proceso-actual.md` | `research.md` de `003-ventas`, `004-clientes` y `005-compras-y-stock` |
| `docs/proveedores.md` | `002-catalogo-y-precios/research.md` |
| `docs/ARCHITECTURE.md`, `docs/diagrams/` | `001-base-del-sistema/plan.md` |
| `docs/MODELO.md` | `001-base-del-sistema/data-model.md` y el `data-model.md` de cada capacidad |
| `docs/SECURITY.md` | Constitución (principio VII) y `001-base-del-sistema/plan.md` |
| `docs/TESTING.md` | Constitución (principio VI) y `001-base-del-sistema/quickstart.md` |
| `docs/ux.md` | Constitución (principio II) y `docs/sistema-visual.md` |
| `docs/DEPLOYMENT.md`, `docs/google-cloud.md` | `docs/operacion/` |
| `CLAUDE.md`, reglas | Constitución; `CLAUDE.md` quedó como guía corta |
