# Plan: Conexión entre dispositivos

**Spec**: [spec.md](spec.md) (aprobada el 2026-10-24) · **Maquetas**: el indicador, en
`maquetas/` · **Decisión**: 152 · **ADR**:
[ADR-027](../../docs/adr/ADR-027-conexion-directa-entre-dispositivos.md).

## Summary

Un módulo propio, `microservices/conexion/` (paquete `conexion-entre-dispositivos`), con el enlace
del navegador y la central del servidor (ADR-027). Ferrebress lo usa para todo lo que viaja entre
el celular y la computadora emparejados, y se sacan los caminos de hoy.

### El módulo

**`comun/`**

- `avisos.ts`: `crearAvisos<T>()`, el patrón observer que usan todas las piezas: `escuchar(fn)`
  devuelve cómo dejar de escuchar; `avisar(valor)` llama a todos.
- `mensajes.ts`: la forma de lo que viaja (el saludo, el dato con su número, la confirmación, la
  señal de la conexión directa, «sin directa», «probar») y `leer(texto)`, que descarta lo que no
  tiene esa forma.

**`navegador/`** (cada pieza recibe lo que usa de afuera; nada global)

- `flujo.ts`: escucha un flujo de eventos con `fetch` (para mandar las cabeceras), entrega cada
  evento y se reconecta solo a los 3 segundos si se corta. Avisa si conectó, si se cortó y si el
  servidor lo rechazó (401, 403 o 404: no insiste).
- `servidor.ts`: el camino por el servidor. Escucha la sala con `flujo.ts` y manda por `POST`, de
  a un pedido por vez: lo que se junta mientras hay uno en camino va en el siguiente, en orden.
  Si un `POST` falla, reconecta el flujo (y con eso los dos se vuelven a saludar).
- `directa.ts`: arma la conexión directa con WebRTC, sin servidores STUN ni TURN. El que arma crea
  la oferta y el canal; el otro responde. Las señales van por el servidor. Da el canal abierto, o
  el motivo si no se pudo: «navegador» enseguida si no hay `RTCPeerConnection`, «red» a los 5
  segundos sin canal.
- `confiable.ts`: la entrega una sola vez y en orden sobre cualquier camino: números, épocas,
  saludo, confirmaciones, reenvío al abrirse un camino, partes de 16 KB y la demora de la última
  confirmación. No sabe qué camino usa: recibe una función para mandar.
- `memoria.ts`: recuerda por sala que la directa no se pudo (motivo y cuándo), en lo que le den
  (en Ferrebress, `localStorage`); sin nada, en memoria.
- `enlace.ts`: `crearEnlace(opciones)` junta todo y es lo único que usa la aplicación:
  `mandar(dato)` (devuelve una promesa que se cumple cuando el otro lo confirma), `alRecibir`,
  `alCambiar` y `estado()`, `probarDirecta()`, `alCerrarse` (la central cerró la sala) y
  `cerrar()`. El estado: `conexion` («sin-conexion», «conectando», «solo», «directa»,
  «servidor»), `motivo`, `desde`, `demoraMs` y `probadaEn`.

**`servidor/`**

- `central.ts`: `crearCentral()`. Cada sala tiene sus oyentes por lado. `escuchar(sala, lado)`
  devuelve una `Response` estándar con el flujo de eventos (latido cada 25 segundos, como
  comentario) y le avisa a cada lado si el otro está; `recibir(sala, lado, cuerpo)` valida la
  tanda (una lista de textos, cada uno hasta 64 KB y en total hasta 1 MB) y se la pasa al otro
  lado, sin guardarla; `cerrar(sala)` les avisa a todos y los suelta. Usa solo la API estándar
  de la web (`Response`, `ReadableStream`), que trae Node: sirve con cualquier servidor.

Las pruebas unitarias del módulo usan dobles de `fetch`, del flujo, de `RTCPeerConnection`, del
reloj y de los temporizadores; su `vitest.config.ts` exige el 100 % de cobertura (líneas, ramas,
funciones, sentencias) con `@vitest/coverage-v8`. `pnpm capas` (dependency-cruiser) controla que no
importe nada de afuera de `microservices/conexion/`, y que `servidor/` no importe `navegador/`
ni al revés. Se compila a `dist/` con `tsc` (`prepare` y `build`).

### En el servidor de Ferrebress

- **Una ruta nueva** en `puestos`: `GET /puestos/:id/enlace` y `POST /puestos/:id/enlace`. Piden
  sesión (`exigirSesion`) y que el dispositivo sea un lado de ese emparejamiento (`ladoEnElPuesto`,
  que ya existe); si no, 404. Después llaman a la central con el lado («computadora» o «celular»).
- **Cerrar la sala:** al desvincular (`DELETE /puestos/:id`), al cerrar a distancia la sesión de
  uno de los dos lados y al desactivar a la persona.
- **Se sacan:** `acceso/espejo.ts` (el espejo en memoria, los oyentes de códigos y el pedido de
  lector), `acceso/fotos.ts` y la ruta `pedidos-de-foto`; de `puestos`, las rutas `/:id/espejo`,
  `/:id/eventos`, `/:id/codigos`, `/:id/codigos/:codigoId/recibido`, `/:id/lector` y `/avisos`;
  sus reglas y datos (`mandarCodigo`, `abrirFlujoDeCodigos`, `codigoRecibido`,
  `computadorasDelCelular` si queda sin uso) y sus contratos. La tabla de códigos escaneados queda
  sin uso (no se borra: el esquema cambia solo con migraciones nuevas, y no hace falta).
- **El ajuste del celular** (RF-134): sale de `GET`/`PUT /sistema/ajustes`, de
  `GET /sesiones/actual` y de «Quién hizo qué» en palabras para lo nuevo (lo viejo se sigue
  leyendo). La clave en la tabla de ajustes queda sin uso.

### En la aplicación web

- **`enlace.ts`** (nuevo, junto a `espejo.ts`): un solo enlace por aplicación, para el
  emparejamiento que tenga este dispositivo (`puesto.ts`). La computadora arma la directa.
  Recuerda en `localStorage` («ferre.enlace.<sala>»). Los mensajes de Ferrebress son
  `{ tipo, ... }`: `codigo`, `pedir-lector`, `pedir-foto`, `foto`, `espejo` (un cambio), `estado`
  (lo que tiene cada lado al encontrarse), `pausa` y `aviso`. Si la central cierra la sala, se
  borra el emparejamiento de este lado, como hoy al desvincular.
- **`espejo.ts`** conserva lo que usan las pantallas (`useEspejo`, `useEspejar`, `avisarAlEspejo`,
  `contarAlEspejo`, `pausarEspejo`, `alAvisoDelEspejo`, `alPedidoDeLaCompu`) y cambia por dentro:
  - «conectado» es que el enlace no está «sin conexión» ni «conectando»; «el otro presente», que
    está «directa» o «servidor».
  - Al encontrarse, cada lado le manda al otro lo que tiene (la parte, cada trabajo en curso y si
    está en pausa), que antes guardaba el servidor. Las reglas de quién sigue a quién no cambian:
    la parte es siempre la de la computadora (decisión 71); de cada trabajo en curso, el que lo
    tiene se lo pasa al que no lo tiene (el que acaba de abrir viene vacío); si los dos tienen uno
    distinto, manda la computadora. Si uno está en pausa, quedan en pausa.
  - Los cambios se mandan solo con el otro presente: si no está, se cuentan al encontrarse.
- **`puesto.ts`**: `enviarCodigoAlPuesto`, `pedirLector` y `escucharPuesto` pasan por el enlace.
  Un código que se manda con la computadora cerrada espera en el celular y llega al abrirla.
- **Foto:** `PedirFotoAlCelular` le manda `pedir-foto` al celular emparejado y espera `foto`, que
  llega como un archivo, sin código QR. Sin celular emparejado (E24) dice que se puede elegir un
  archivo o vincular el celular. En el celular, `PedidosDeLaCompu` muestra los pedidos que llegan
  por el enlace (sin preguntar) y `FotoParaLaCompu` saca la foto y la manda por el enlace.
- **El indicador** es `EspejoEstado`, que ya tiene el punto: toma los estados del enlace y el de la
  pausa, con un color por estado, y al tocarlo abre el detalle con «Probar conexión directa». Va
  en los dos, donde está hoy, según la maqueta.
- **Se sacan:** `plataforma/tiempo-real/` (el flujo pasa al módulo), la pregunta de respaldo del
  celular, el renglón «Cada cuánto pregunta el celular emparejado» de Más → Sistema y la ruta
  `#/foto` con código del pedido sin emparejar.

## Technical Context

- Paquete nuevo: `microservices/conexion/` (TypeScript, sin dependencias de ejecución; de
  desarrollo, `typescript`, `vitest`, `@vitest/coverage-v8` y `dependency-cruiser`).
- `pnpm-workspace.yaml` lo suma; `gestion-del-local` y `gestion-del-local-web` lo usan
  (`workspace:*`). La imagen del servidor copia la carpeta antes de instalar y la compila con el
  `build` de las dependencias (`pnpm --filter gestion-del-local... build`).
- Pruebas de punta a punta: dos ventanas del mismo Chromium. Para que la directa se pueda armar
  entre ellas, el navegador de las pruebas corre sin ocultar las direcciones locales
  (`--disable-features=WebRtcHideLocalIpsWithMdns`); para el respaldo, una ventana sin
  `RTCPeerConnection` (E07) y otra con uno que nunca conecta (E06).

## Constitution Check

- Siete pasos: spec aprobada; la maqueta del indicador, antes de programarlo.
- Reglas del negocio una sola vez: quién se empareja y las reglas del espejo siguen en el
  servidor y en `negocio/`; el módulo no conoce el negocio (ADR-018, como ADR-019).
- Celular y computadora: el mismo módulo, los mismos mensajes y el mismo indicador, con los
  textos en `textos.ts` (decisión 47).
- Principio VI: la meta de cobertura es solo del módulo (RNF-68, decisión 152).
- Principio VIII («nada para después»): llevarlo a otros proyectos es un pedido de Carlos.

## Seguridad

- **Datos que toca:** lo que ya viaja entre los dos dispositivos de una persona (códigos, la venta
  en curso, la foto de un comprobante). Con la directa no pasa por el servidor; con el respaldo, el
  servidor lo pasa sin guardarlo ni leerlo. Lo recordado en el dispositivo es solo si la directa se
  pudo, el motivo y la hora.
- **Quién puede:** solo los dos dispositivos de un mismo emparejamiento, que ya exige dos sesiones
  del mismo usuario (RF-77). Cada pedido a `/puestos/:id/enlace` pasa por la sesión y por
  `ladoEnElPuesto`; un dispositivo de otro emparejamiento recibe 404 y no puede escuchar ni mandar.
  La central no conoce sesiones: confía en que la aplicación solo le pasa lo autorizado.
- **Cuando deja de valer:** desvincular, vencer el vínculo, cerrar a distancia una de las dos
  sesiones o desactivar a la persona cierra la sala: los flujos abiertos se cortan en el momento y
  el enlace del otro lado lo dice. Un flujo con una sesión que se cerró por otro camino deja de
  recibir al reconectar (pide la sesión de nuevo).
- **La conexión directa:** WebRTC va cifrada siempre (DTLS). La oferta y la respuesta, que llevan
  la huella del cifrado de cada lado, viajan solo por la ruta autorizada: nadie de afuera puede
  meterse en el medio sin pasar por la sesión. Sin servidores STUN ni TURN: no se le habla a
  ningún tercero y no se abre ningún puerto en la máquina (RNF-44).
- **Qué entra desde afuera:** la central acepta solo una lista de textos, cada uno hasta 64 KB y
  hasta 1 MB por pedido (400 o 413 si no); no los interpreta. El enlace descarta lo que no tiene la
  forma de sus mensajes; la aplicación valida lo que recibe como cualquier dato de afuera (un
  código es un texto; una foto, una imagen de hasta lo que hoy se acepta).
- **Secretos:** ninguno nuevo.
- **Registro:** no cambia: vincular y desvincular ya quedan en «Quién hizo qué»; los mensajes no
  se registran, como hoy.

## Project Structure

### Documentation (this feature)

`spec.md`, `plan.md`, `tasks.md`, `maquetas/`, `checklists/`, `revision.md` al final.

### Source Code

```text
microservices/conexion/
├── README.md               # cómo llevarlo a otro proyecto
├── package.json · tsconfig.json · tsconfig.build.json · vitest.config.ts · .dependency-cruiser.cjs
└── src/
    ├── comun/      avisos.ts · mensajes.ts
    ├── navegador/  flujo.ts · servidor.ts · directa.ts · confiable.ts · memoria.ts · enlace.ts · index.ts
    └── servidor/   central.ts · index.ts
```

### Otras capacidades que cambian (al cerrar)

- 002 (RF-08, RF-09) y 005 (RF-50): la foto se pide al celular emparejado; los códigos que
  esperan, en el celular.
- 007 (RF-77): por dónde viaja el espejo y el indicador; las rutas en `contracts/api.md`.
- 020 (RF-134, RF-135): sin la pregunta de respaldo ni su ajuste.
- 001: ADR-016 y ADR-020 con su enmienda que apunta a ADR-027.

## Complexity Tracking

- **Flujo de eventos y `POST` en vez de WebSocket** para el respaldo: el servidor de Node no trae
  WebSocket y el módulo no puede tener dependencias. Un `POST` por tanda alcanza para lo que se
  manda (códigos, cambios de la venta, una foto partida).
- **Sin reintentos con temporizador:** lo pendiente se reenvía al abrirse un camino (cada saludo).
  Un `POST` que falla reconecta el flujo, y eso produce el saludo.
- **Sin coalescer mensajes en la cola:** el espejo no manda con el otro ausente, así que lo que
  espera es poco (códigos, pedidos).
