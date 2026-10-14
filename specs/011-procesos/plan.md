# Plan: Procesos

## Qué se construye

Un módulo aparte, con su servicio y sus pantallas, para dibujar en BPMN los procesos del
negocio (RF-90 a RF-95), que se pueda llevar a otro proyecto (RNF-61). Las decisiones de
arquitectura están en [ADR-019](../../docs/adr/ADR-019-procesos-como-modulo-que-se-lleva.md):
servicio propio, esquema propio en la misma base, `bpmn-js` y pantallas como paquete de React.

## Dónde vive

```text
microservices/procesos/
├── README.md        cómo se lleva a otro proyecto y qué le tiene que dar la aplicación
├── servidor/        paquete procesos-servidor: el servicio (contenedor «procesos»)
│   ├── migraciones/ SQL numerado, en el esquema «procesos»
│   └── src/         rutas.ts (traduce) · reglas.ts (la regla) · datos.ts (Postgres) · memoria.ts (para pruebas) · bpmn.ts (leer y validar BPMN)
└── web/             paquete procesos-web: el componente de React
    └── src/         modelo/ (pasos, validación, tabla; sin React ni bpmn-js) · editor/ (bpmn-js) · compu/ · celu/
```

Ninguno de los dos importa nada de fuera de su carpeta: `pnpm capas` lo controla en cada subida.

## El servicio

- **Hono sobre Node,** como el servidor de Ferrebress, en el puerto 8090, solo en la red
  interna del compose. Variables: `DATABASE_URL`, `TOKEN_SERVICIO`, `PORT`. Nada nuevo en el
  `.env`.
- **Quién llama:** cada pedido trae `X-Token-Servicio` y las cabeceras `X-Usuario-Id`,
  `X-Usuario-Nombre` (codificada) y `X-Puede` (`ver`, `dibujar`, o los dos separados por
  coma). Sin el token correcto, 401; sin `ver` ni `dibujar`, 403. `dibujar` incluye `ver`.
- **Rutas** (las que cambian algo piden `dibujar`):

| Pedido | Qué hace |
|---|---|
| `GET /procesos` | La lista: nombre, estado (vigente, borrador o los dos) y cuántos pasos tiene. Con solo `ver`, solo los que tienen vigente, y sin borradores |
| `POST /procesos` | Crea uno con un nombre; con `bpmn`, lo importa (E35). Queda en borrador |
| `GET /procesos/:id` | El vigente y, con `dibujar`, el borrador, cada uno con su BPMN y su número de revisión |
| `PATCH /procesos/:id` | Cambia el nombre |
| `DELETE /procesos/:id` | Lo borra con todas sus versiones |
| `PUT /procesos/:id/borrador` | Guarda el borrador. Trae la revisión sobre la que se dibujó: si otro guardó antes, 409 con el borrador actual (E41) |
| `DELETE /procesos/:id/borrador` | Descarta el borrador |
| `POST /procesos/:id/vigente` | El borrador pasa a vigente y el vigente anterior, al historial |
| `GET /procesos/:id/versiones` y `GET /procesos/:id/versiones/:version` | El historial y una versión anterior |

- **El BPMN se valida en el servidor** con `bpmn-moddle`: hasta 5 MB, XML bien formado, raíz
  `bpmn:definitions` de BPMN 2.0 y al menos un proceso. El servidor cuenta los pasos desde ahí.
  Lo que no es BPMN se rechaza con un 422 que dice por qué (E36).
- **Las migraciones** las corre el servicio al arrancar, como el servidor de Ferrebress, en su
  propia tabla `procesos.migracion` y con su propio candado.

## Los datos

Esquema `procesos`, sin referencias a tablas de Ferrebress:

- `proceso`: identificador, nombre (único sin importar mayúsculas), cuándo y quién lo creó.
- `version`: a qué proceso pertenece (se borra con él), estado (`borrador`, `vigente`,
  `anterior`), el BPMN, cuántos pasos tiene, quién la hizo (identificador y nombre, copiados:
  no hay usuarios en el módulo), cuándo se creó, cuándo se cambió y la revisión. A lo sumo un
  borrador y un vigente por proceso, con índices únicos parciales.

Quién hizo qué se guarda en el módulo (autor de cada versión) y, además, el servidor de
Ferrebress anota cada cambio en su registro de eventos (E22).

## Ferrebress lo conecta

- **Permisos** `procesos.ver` y `procesos.dibujar`, en la parte «Negocio», con una migración
  que se los da al rol Gerente (E40).
- **Una ruta de paso** `/procesos/*` en el servidor de Ferrebress: exige sesión y alguno de los
  dos permisos, y reenvía el pedido a `PROCESOS_URL` (fija en el compose, como la de listas)
  con el token y las cabeceras de quién llama. No tiene regla de procesos: solo traduce la
  sesión. Si el cambio salió bien, lo anota en el registro de eventos.
- **En la aplicación:** «Procesos» en Más pide alguno de los dos permisos (E37). La pantalla le
  pasa al componente cómo pedir (el cliente de siempre, con la sesión), qué puede quien la
  usa, la interfaz, la lista de pantallas de Ferrebress que se pueden nombrar en un paso y la
  paleta. El componente se carga aparte (con `bpmn-js` adentro), solo al entrar a Procesos.
- **Sin conexión (E42):** el componente recibe de la aplicación dónde guardar lo último que se
  abrió. En la computadora y en el celular con «Trabajar sin conexión» habilitado, la
  aplicación le da el guardado del navegador; si no, no le da ninguno y el módulo no guarda nada.

## Las pantallas

- **Computadora:** el `Modeler` de `bpmn-js`, sin su paleta propia: la de la izquierda es
  nuestra (con nombres, o solo íconos al plegarla) y empieza el arrastre con la API de
  `bpmn-js`. El panel del paso elegido y la tabla de pasos cambian el dibujo con los comandos
  de `bpmn-js`, así Deshacer los cubre. Los tres paneles recuerdan si estaban abiertos.
- **Qué guarda cada paso:** el nombre en el propio BPMN; «cómo se hace» como su
  documentación; «quién lo hace» es el carril donde está; «en qué pantalla de Ferrebress» va
  en un atributo de extensión del módulo (`procesos:pantalla`), que otros programas ignoran y
  conservan.
- **Tipos de paso:** inicio, tarea, tarea de una persona, tarea del sistema, decisión, en
  paralelo, espera (con temporizador), fin, subproceso, carril (agrega un participante con
  carriles), documento y nota: los elementos BPMN de siempre.
- **Guardado:** cada cambio arma el BPMN y lo manda al borrador medio segundo después del
  último, uno a la vez. Arriba dice «Guardando…», «Guardado» o «Sin conexión: no se guardó».
- **Errores de forma (E14):** se revisan en el navegador después de cada cambio y se marcan con
  una señal sobre el paso.
- **Celular, «Pasos»:** el recorrido se lee del dibujo (desde el inicio, con una rama por cada
  salida de una decisión). Mover, agregar y quitar un paso se hace con los mismos comandos de
  `bpmn-js` sobre el dibujo (reconectar las flechas y hacer lugar), así «Diagrama», la
  computadora y Deshacer ven lo mismo. Un proceso con caminos que vuelven atrás no se puede
  mostrar como lista: «Pasos» lo dice y manda a «Diagrama».
- **Celular, «Diagrama»:** el mismo `Modeler`, con la hoja de figuras abajo; se arrastra con el
  dedo desde la hoja.
- **Exportar:** la imagen PNG se arma en el navegador desde el SVG del dibujo, con el nombre,
  el estado y la fecha arriba; el BPMN es el que guarda el dibujo.

## Seguridad

- **Qué datos toca:** cómo trabaja el negocio, y el nombre y el identificador de quien hizo
  cada versión. No toca precios, clientes ni ventas. Nada de eso sale del servidor del negocio
  salvo hacia quien tiene permiso.
- **Quién puede qué:** `procesos.ver` mira; `procesos.dibujar` hace todo. Lo controla dos
  veces: el servidor de Ferrebress (sin ninguno de los dos, ni siquiera reenvía) y el servicio
  (cada ruta que cambia pide `dibujar`; las demás, `ver`). Con solo `ver`, el servicio no
  manda borradores ni procesos sin vigente. Exportar no es un pedido al servidor: quien solo
  puede ver recibe el BPMN vigente para dibujarlo, así que la pantalla oculta Exportar pero
  no impide que alguien con conocimientos guarde lo que ya ve.
- **Qué entra desde afuera y cómo se valida:** nombres (texto de 1 a 120 caracteres, sin
  saltos de línea) y archivos BPMN (hasta 5 MB, leídos con `bpmn-moddle`, que no resuelve
  entidades externas). Los textos se muestran como texto: React y el SVG de `bpmn-js` no
  ejecutan lo que traen (E44). Todo valor va a la base como parámetro.
- **Secretos:** solo `TOKEN_SERVICIO` (el mismo que usa listas) y `DATABASE_URL`, en el `.env`.
  El servicio no publica puertos: solo lo alcanza el servidor de Ferrebress por la red interna.
  Las cabeceras de quién llama solo valen con el token: no se pueden fabricar desde el navegador.
- **Qué queda registrado:** el autor y la fecha de cada versión en el módulo, y cada cambio
  (crear, cambiar, marcar vigente, importar, borrar) en «Quién hizo qué» de Ferrebress.

## Pruebas

Una por escenario (E01 a E45), que lo nombra (`011-E07`):

- **Servicio:** la regla contra los datos en memoria (permisos, versiones, revisión, validación
  de BPMN) y la traducción de las rutas con pedidos de verdad a la app de Hono.
- **Modelo del front:** sin navegador, con BPMN de ejemplo: el recorrido para «Pasos» y la
  tabla, los errores de forma, los cambios de la lista.
- **Pantallas:** con jsdom, lo que se ve según los permisos y los paneles. `bpmn-js` necesita
  medir el SVG, que jsdom no hace: el arrastre, el zoom y el teclado del dibujo se prueban en
  las de punta a punta, en el celular y en la computadora.
- **Ferrebress:** la ruta de paso (sin sesión, sin permiso, con permiso, cabeceras) y que Más
  muestre u oculte «Procesos».

## Riesgos

- **`bpmn-js` en el celular:** el arrastre con el dedo existe pero no es su fuerte; por eso
  «Pasos» es la forma principal en el celular. Si «Diagrama» no anda bien en el teléfono de
  pruebas, se avisa a Carlos con capturas antes de cerrar.
- **Peso:** cerca de 1 MB más, solo para quien entra a Procesos.
- **La licencia de bpmn.io** exige su logo en el dibujo (ADR-019).
