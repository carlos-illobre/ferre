# Auditoría de arquitectura del código

Hecha el 2026-10-13 a pedido de Carlos, después de dos días de cambios seguidos. Es un
informe: **no se cambió nada del código**. Mira el código como lo miraría un arquitecto de
aplicaciones, con foco en simplicidad, reutilización, separación de responsabilidades y
rendimiento.

De dónde sale: de medir el repositorio (líneas, dependencias entre archivos, repeticiones) y
de lo que se vio al arreglar los defectos de estos dos días. No se midió rendimiento en un
teléfono ni con los 11.000 productos reales.

## En una página

1. **El origen de la mayoría de los defectos es que casi todo está hecho dos veces**: una vez
   para el celular y otra para la computadora, cada una con sus datos, sus reglas y sus
   llamadas al servidor. Un arreglo en un lado no llega al otro.
2. **No conviene un microservicio para celular y otro para computadora.** Agravaría justo ese
   problema. Conviene un solo front con una capa de negocio única y dos juegos de pantallas
   finos encima.
3. **La lógica de negocio y la tecnología están mezcladas** en los mismos archivos. Hay piezas
   técnicas que ya son reutilizables casi como están (teclado, navegación, botón de volver,
   atajos) y otras atadas al negocio sin necesidad (guardado local, cola de envíos, espejo).
4. **El cálculo de precios hoy se hace en el navegador, no en el servidor.** La carpeta
   `libraries/` existe por eso. Para eliminarla hay que mover el cálculo al servidor, que es
   lo que Carlos quiere; es posible y se detalla abajo.
5. **Las carpetas se pueden ordenar** como pide Carlos (todo el código bajo `microservices/`)
   sin riesgo, porque es mover, no reescribir.
6. **Hay cuatro librerías que reemplazarían código propio** que hoy es fuente de errores:
   manejo de datos del servidor, validación con tipos compartidos, navegación y consultas a
   la base.

Se propone hacerlo en cinco etapas chicas, cada una con la aplicación funcionando al final.

## Lo medido

| Zona | Líneas (sin pruebas) |
|---|---|
| Front, total | 12.489 |
| · pantallas de la computadora | 5.976 |
| · pantallas del celular | 3.247 |
| · lo común y lo compartido | 3.266 |
| Hojas de estilo | 2.584 |
| Servidor principal (Node) | 3.082 |
| Servicio de listas de proveedores (Python) | 805 |
| Librería de cálculo de precios | 139 |
| Pruebas unitarias | 4.033 |
| Pruebas de punta a punta | 3.776 |

Señales de desorden:

- **Tipos repetidos.** El «renglón» (de venta, de ingreso, de pedido) está definido 8 veces;
  «proveedor», 5; «usuario», «resumen», «borrador» y «datos», 3 o 4 cada uno.
- **Pantallas que hacen de todo.** Vender de la computadora: 607 líneas, 22 estados y 11
  efectos en un solo componente. Depósito del celular: 567 líneas, 38 estados, 11 efectos y
  11 llamadas al servidor.
- **Las mismas llamadas al servidor escritas en los dos lados**: ventas, compras, stock,
  conteos, usuarios, sesiones, duplicados y listas.
- **Reglas del servidor escritas dentro de las rutas**, con el SQL a mano: 15 consultas en el
  archivo del vínculo, 15 en el de listas, 11 en el de conteos.

## 1. Estructura de carpetas

Hoy el código está repartido en la raíz, mezclado con la documentación:

```
clientes/gestion-del-local-web     el front
microservices/comercial    el servidor
microservices/listas-de-proveedores  lector de planillas (Python)
libraries/calculo-de-precios       librería compartida
tests/  infrastructure/  deployment/   pruebas y despliegue
docs/  specs/  proyecto/            documentación
```

Propuesta, con todo el código bajo `microservices/`:

```
microservices/
  web/          el front (hoy clientes/gestion-del-local-web)
  api/          el servidor (hoy microservices/comercial)
  listas/       el lector de planillas (ver nota)
docs/  specs/  proyecto/            documentación, sin código
tests/  deployment/                 pruebas de punta a punta y despliegue
```

- Desaparecen `clientes/` y `libraries/`.
- `infrastructure/` (solo tiene el proxy) pasa a `deployment/`.
- **Nota sobre el lector de planillas:** es un segundo servicio de servidor, en Python.
  Carlos pide «en principio» uno de servidor y uno de front. Pasarlo a Node obligaría a
  reescribir la lectura de Excel de cada proveedor, que hoy anda. Recomendación: dejarlo como
  servicio aparte por ahora y decidirlo cuando haya que tocarlo.

Riesgo bajo: es mover carpetas y ajustar rutas en la compilación, el despliegue y las pruebas.

## 2. ¿Un microservicio para celular y otro para computadora?

**No conviene.** Razones:

- Comparten el mismo negocio, los mismos datos, la misma sesión y trabajan en espejo. Separarlos
  obligaría a duplicar la capa de negocio o a crear una librería compartida, que es lo que se
  quiere evitar.
- El problema de hoy es que hay demasiado duplicado, no demasiado junto.
- Se publican juntos, como una sola aplicación instalable. Dos servicios serían dos
  despliegues, dos versiones que pueden desfasarse y el doble de configuración.
- El peso ya está resuelto: cada interfaz se descarga por separado, y el teléfono no baja las
  pantallas de la computadora.

Lo que sí conviene: **un solo front con tres capas.**

```
web/src/
  plataforma/   tecnología reutilizable en cualquier proyecto (ver punto 4)
  negocio/      una carpeta por proceso: ventas, compras, catalogo, deposito, usuarios…
                tipos, llamadas al servidor y reglas, UNA sola vez
  pantallas/
    celular/    solo cómo se ve y se toca en el teléfono
    compu/      solo cómo se ve y se usa con teclado
```

Las pantallas dejan de pedir datos y de decidir reglas: las reciben de `negocio/`. Las que hoy
ya son una sola para los dos (Roles, Mejoras y errores, Configuración, Pedidos) muestran que
funciona: son las que menos defectos dieron.

## 3. Cálculo de precios y la carpeta `libraries/`

Hoy la librería la usa sobre todo **el front**: calcula el precio de venta, el margen real, el
subtotal, los cinco márgenes y, además, hace la búsqueda de productos. El servidor solo usa de
ella el subtotal del renglón, para verificar lo que manda el front.

O sea: **el precio se calcula en el navegador.** El servidor manda costo, IVA y margen, y cada
pantalla hace la cuenta.

Para que el cálculo esté solo en el servidor y la librería desaparezca:

- El servidor devuelve, con cada producto, **el precio ya calculado y su explicación**, y el
  precio para cada uno de los cinco márgenes (son cinco números por producto).
- Al cobrar, el servidor recalcula y es el que manda, como hoy.
- La búsqueda no es cálculo de precios: pasa a `plataforma/` como buscador genérico.

Lo que hay que decidir, porque cambia algo visible:

- **«Precio a mano» y «otro margen» tipeado:** hoy la pantalla muestra al instante el margen
  que resulta. Con el cálculo en el servidor hay dos caminos: una consulta al servidor por
  cada cambio (medio segundo de espera), o dejar en el front una sola fórmula para la vista
  previa y que el servidor confirme. La segunda es más simple de usar, pero deja una cuenta en
  el front.
- **Trabajar sin conexión:** si el teléfono o la computadora venden sin red, necesitan el
  precio guardado. Con los precios precalculados alcanza para los cinco márgenes; un margen
  tipeado sin conexión necesitaría la fórmula.

Recomendación: mover el cálculo al servidor, mandar los precios precalculados y dejar en el
front únicamente la vista previa del margen tipeado, marcada como tal. Así la librería
compartida se elimina.

## 4. Separar la lógica de negocio de la tecnología

Objetivo de Carlos: que todo lo que sirva para otra aplicación (cámara, flechas, etc.) esté en
archivos que se puedan copiar a otro proyecto, sin depender del negocio.

**Ya son reutilizables casi como están** (no importan nada del negocio):

| Qué hace | Hoy está en | Observación |
|---|---|---|
| Reparto de teclas entre pantalla y aplicación | `teclas.ts` | Listo |
| Marca de las flechas sobre filas | `compu/flechas.ts` | Conoce nombres de clases de esta app; hay que pasárselos como configuración |
| Atajos con Alt y una letra | `compu/atajos.ts` | Ídem |
| Botón de volver que cierra lo de arriba | `celular/componentes/volver.ts` | Listo; está en la carpeta del celular sin ser del celular |
| Lector de códigos con la cámara | `celular/componentes/Escaner.tsx` | Listo; mezcla la cámara con el dibujo del visor |
| Navegación por direcciones, con animación | `rutas.ts` | Tiene adentro los nombres de las pantallas de esta app |
| Preferencias del dispositivo | `preferencias.ts` | Mecanismo genérico con las claves de esta app adentro |

**Técnicos, pero atados al negocio sin necesidad:**

| Qué hace | Problema | Cómo desatarlo |
|---|---|---|
| Base local del navegador (`almacen.ts`) | Pregunta él mismo si el celular tiene el guardado habilitado, y trae fijos los nombres «catálogo», «ventas», «cola» | Recibe desde afuera la lista de almacenes y una función «¿puedo guardar?» |
| Cola de envíos sin conexión (`cola.ts`) | Llama directo a la API de esta app y sabe qué es «un cambio de producto» | Recibe una función «enviar» y una regla opcional para fundir cambios |
| Canal en tiempo real del espejo (`espejo.ts`) | Mezcla el transporte (conectarse, reconectar, presencia) con qué se espeja (venta, ingreso, pedido) | Un canal genérico de «documentos compartidos» y, aparte, la lista de lo que esta app comparte |
| Llamadas al servidor (`api.ts`) | Trae adentro la sesión y un aviso propio de la app | Cliente HTTP genérico más un módulo de sesión |
| Catálogo (`catalogo.ts`, 279 líneas) | Junta cuatro cosas: guardar, bajar por tandas, buscar y reglas de producto | Una estrategia de origen de datos (guardado, memoria o servidor) elegida en un solo lugar; hoy esa pregunta está repartida en seis pantallas |
| Piezas de interfaz (`compu/base/ui.tsx`, 465 líneas) | Botón, hoja, aviso, tabla: genéricas, pero viven dentro de la computadora y el celular tiene las suyas | Un solo juego de piezas en `plataforma/ui/` |

**Cómo se sostiene en el tiempo:** una regla automática en la verificación de cada subida que
prohíba a `plataforma/` importar de `negocio/` o de `pantallas/`. Sin eso, la separación se
pierde en semanas.

## 5. Patrones que simplificarían el código

- **Una máquina de estados por proceso.** La venta, el ingreso y el conteo tienen pasos claros
  (vacío → con renglones → cobrando → registrado). Hoy son 20 a 40 estados sueltos por
  pantalla que se pueden contradecir. Un reductor por proceso, en `negocio/`, usado por las
  dos interfaces, elimina esas contradicciones y se prueba sin pantalla.
- **Repositorio.** Un único lugar por tema que sabe hablar con el servidor
  (`ventas.registrar()`, `compras.anular()`). Hoy cada pantalla arma su pedido.
- **Estrategia.** Para «de dónde salen los productos» y «dónde se guarda»: se elige una vez al
  arrancar, y las pantallas no preguntan más.
- **En el servidor, tres capas:** la ruta solo traduce HTTP; un caso de uso tiene la regla; un
  repositorio tiene el SQL. Hoy está todo en la ruta, y por eso reglas como «un vínculo nuevo
  reemplaza al anterior» están escritas en dos archivos.

## 6. Librerías que reemplazarían código propio

| Librería | Qué reemplaza | Qué resuelve |
|---|---|---|
| **TanStack Query** | Buena parte de `catalogo.ts` y `cola.ts`, y los pedidos sueltos de cada pantalla | Caché, reintentos, **cancelar el pedido al cambiar de pantalla**, envíos pendientes guardados. Varios defectos de estos días son de esto |
| **Zod**, con el cliente tipado de Hono | Los tipos repetidos (el «renglón» ocho veces) y las validaciones a mano del servidor | El servidor declara la forma de cada dato una vez y el front la recibe al compilar. No es una librería compartida: es un tipo que viaja en la compilación |
| **React Router** | `rutas.ts` y el mapa de pantallas de cada interfaz | Navegación, direcciones y transiciones de vista ya resueltas. El defecto de las animaciones trabadas salió de hacerlo a mano |
| **Kysely** (servidor) | El SQL escrito como texto en las rutas | Consultas con tipos: un nombre de columna mal escrito no compila |
| **dependency-cruiser** | Nada; es un control | Hace cumplir «plataforma no importa negocio» |

Lo que **no** se recomienda: un framework de interfaz completo ni una librería de animación.
La regla de animar solo con CSS se mantiene.

## 7. Rendimiento

Sin medir en un dispositivo real; son observaciones del código.

- **El catálogo entero viaja y vive en memoria** (11.000 productos) y el índice de búsqueda se
  arma en el teléfono. La búsqueda en el servidor ya existe; con precios precalculados puede
  ser la forma normal en el celular.
- **La consulta de productos del servidor** recalcula el proveedor vigente y la lista de
  proveedores por cada producto, cada vez. Conviene guardar el «precio vigente» ya resuelto y
  actualizarlo cuando se aplica una lista o un ingreso.
- **Las listas largas se dibujan enteras** hasta un tope. Con listas virtuales se dibuja solo
  lo visible.
- **El estado del espejo vive en la memoria de un solo proceso.** Alcanza para un local; no
  permite dos copias del servidor.
- **Hojas de estilo:** 2.584 líneas con capas que se pisan (la paleta nueva sobre los estilos
  de las versiones viejas, que ya se borraron). Es peso y es fuente de sorpresas visuales.

## 8. Pruebas

- Las de punta a punta **comparten la base entre archivos**. Hoy una prueba falló por datos
  que dejó otra, y otra tapó durante días un defecto real (Enter en Catálogo abría el producto
  equivocado). Conviene que cada archivo arranque con sus datos y los limpie.
- Con la capa de negocio única, la mayoría de las reglas se prueba sin pantalla: más rápido y
  una sola vez, en lugar de una por interfaz.

## Plan por etapas

Cada etapa termina con todo funcionando y desplegable. Las estimaciones son gruesas.

| Etapa | Qué | Riesgo | Tamaño |
|---|---|---|---|
| 1 | Reordenar carpetas: todo el código bajo `microservices/` | Bajo | 1 día |
| 2 | Crear `plataforma/` y mover lo técnico, desatándolo del negocio; activar el control automático | Bajo a medio | 3 a 4 días |
| 3 | Capa de negocio única en el front, proceso por proceso (empezar por Vender), con TanStack Query y los tipos del servidor | Medio | 2 a 3 semanas |
| 4 | Cálculo de precios en el servidor, precios precalculados y fin de `libraries/` | Medio | 1 semana |
| 5 | Servidor en tres capas, con Kysely, tema por tema | Medio | 1 a 2 semanas |

Orden recomendado: 1, 2, 3, 4, 5. Las etapas 3 y 5 se pueden intercalar. Conviene frenar los
pedidos de pantallas nuevas mientras dura la etapa 3 de cada proceso, o lo nuevo vuelve a
escribirse dos veces.

## Decisiones que necesita Carlos

1. ¿El lector de planillas en Python queda como servicio aparte, o se reescribe dentro del
   servidor principal?
2. Para «precio a mano» y «otro margen»: ¿vista previa calculada en el front y confirmada por
   el servidor, o una consulta al servidor en cada cambio?
3. ¿Se aceptan las cuatro librerías propuestas?
4. ¿Se frenan los cambios de pantallas mientras se hace la etapa 3?
