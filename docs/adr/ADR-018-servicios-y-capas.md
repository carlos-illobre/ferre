# ADR-018: El código se organiza en servicios y en capas

**Estado:** aceptado · **Fecha:** 2026-10-13

## Contexto

Después de dos días de cambios seguidos, la auditoría de arquitectura
([docs/auditoria-de-arquitectura.md](../auditoria-de-arquitectura.md)) encontró que la mayoría
de los defectos venían de tres cosas: casi todo estaba hecho dos veces (una para el celular y
otra para la computadora), la tecnología estaba mezclada con el negocio, y el código estaba
repartido en la raíz, entre la documentación. Carlos aprobó el informe (decisión 84).

## Decisión

1. **Todo el código vive bajo `microservices/`:** `web` (el front), `api` (el servidor) y
   `listas` (el lector de planillas, en Python, que por ahora queda aparte). La documentación
   (`docs/`, `specs/`, `proyecto/`) no tiene código. El despliegue está en `deployment/`.
2. **Un solo front**, no uno para el celular y otro para la computadora. Adentro, tres capas:
   `plataforma/` (tecnología reutilizable, sin dependencias del negocio), `negocio/` (cada
   regla una sola vez) y `pantallas/` (celular y computadora, que solo muestran). Una
   verificación automática impide que `plataforma/` dependa del negocio.
3. **No hay librerías compartidas entre servicios.** Lo que el front necesita saber de la
   forma de los datos lo recibe del servidor al compilar. El cálculo de precios vive en el
   servidor; el front solo muestra la vista previa de un margen o precio tipeado.
4. **El servidor en tres capas:** la ruta traduce el pedido, un caso de uso tiene la regla y
   un repositorio tiene el acceso a los datos.
5. **Librerías que reemplazan código propio:** TanStack Query, Zod con el cliente tipado de
   Hono, React Router y Kysely.

Se hace por etapas (`specs/010-reordenamiento-del-codigo/`). Los nombres de los servicios, de
las imágenes y de los paquetes no cambian con las carpetas: el despliegue los usa.

## Cómo se aplica en el front

- **Los datos del servidor se piden con TanStack Query**, con una sola memoria para toda la
  aplicación (`src/consultas.ts`). Cada tema tiene su consulta en `negocio/` (las que solo
  traen una ruta usan `negocio/del-servidor.ts`) y las pantallas la usan; dos pantallas que piden lo mismo comparten la respuesta. Lo que cambia un dato
  (cobrar, anular) avisa, y lo que esté en pantalla se vuelve a pedir. No se reintenta ni se
  espera a «estar en línea»: sin conexión, la pantalla lo dice enseguida.
- **La forma de las respuestas la escribe el servidor**, en `microservices/api/src/contratos/`,
  un archivo por tema y solo con tipos. El servidor arma su respuesta con ese tipo y el front
  lo lee como `@servidor/<tema>`; como son solo tipos, al compilar desaparecen y al navegador
  no llega nada del servidor. Mientras el servidor no esté en tres capas (etapa 5), se escribe
  a mano el contrato de cada tema que se va unificando.

## Cómo se aplica en el servidor

Cada tema tiene su carpeta en `microservices/api/src/` (ventas, clientes, compras, pedidos,
conteos, deposito, catalogo, productos, listas, duplicados, administracion, acceso, tickets,
anomalias, actividad):

- **La ruta** (`src/rutas/<tema>.ts`) solo traduce: lee el pedido, llama a la regla y elige el
  código de respuesta. No tiene SQL ni reglas.
- **Las reglas** (`src/<tema>/reglas.ts`): qué se valida, qué se calcula, qué se anota en el
  registro de eventos, y la transacción que lo agrupa.
- **Los datos** (`src/<tema>/datos.ts`): cada lectura y escritura, con Kysely (`src/base.ts`).
  Las tablas tienen tipos en `src/tablas.ts`: un nombre de columna mal escrito no compila. Los
  valores siempre van como parámetros.
- Donde la consulta es larga o tiene partes opcionales (el catálogo, las listas que se insertan
  por lotes, unir y separar duplicados, sesiones y vínculo con sus `UPDATE … RETURNING`) el SQL
  se escribe a mano, con el tipo de lo que devuelve y los valores como parámetros: con la
  plantilla `sql` de Kysely o con el cliente de Postgres. Las transacciones se abren con
  `enTransaccion` (Kysely) o `enTransaccionPg`; para devolver una respuesta deshaciendo lo
  hecho se tira `Deshacer`. `anotarEvento` es el registro de eventos con Kysely.
- **Control automático:** `pnpm capas` en el servidor (parte de `typecheck`, corre en cada
  subida) no deja que una ruta importe la base ni una capa de datos, ni que los datos dependan
  de las reglas o de las rutas.

## Consecuencias

- Mientras dure la unificación de cada proceso no se cambian sus pantallas.
- Reemplaza la parte de [ADR-010](ADR-010-servicios-clientes-y-librerias.md) que justificaba `libraries/`; esa
  carpeta se eliminó en la etapa 4. El cálculo del precio está en el servidor
  (`microservices/api/src/precios.ts`); el front tiene la misma cuenta solo para la vista previa
  de un margen o un precio tipeado y para vender sin conexión
  (`microservices/web/src/negocio/precios/vista-previa.ts`), y una prueba del front falla si
  las dos cuentas dejan de ser idénticas. La búsqueda es tecnología genérica y está en
  `microservices/web/src/plataforma/busqueda/`.
- [ADR-014](ADR-014-dos-interfaces-celular-y-escritorio.md) sigue valiendo en que hay dos
  juegos de pantallas; deja de valer que cada uno tenga sus propios datos y reglas.
