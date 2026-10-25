# Plan: Avisos sin consultas

**Spec**: [spec.md](spec.md) · **Decisión**: 160 · **ADR**: ADR-030 (se escribe con este paso)


## La idea en una línea

Una **central de avisos** en cada dispositivo (Mediator) a la que se le declaran **esperas**
(Observer) y que se entera por tres **fuentes** intercambiables (Strategy): lo que viaja **a
cuestas** en las respuestas, un **canal** abierto con el servidor y los avisos del **navegador**.
Los **indicadores** de conexión son observadores más de la misma central. Del lado del servidor,
un **tablero de canales** sabe quién espera cada tema y le avisa.

## Dónde vive

En el módulo `microservices/conexion/` (RNF-68: sin dependencias, 100 % de cobertura, comentado,
sin código repetido, poca complejidad). Ferrebress solo declara sus casos y autoriza los temas.

```
microservices/conexion/src/
  comun/avisos.ts          (ya está) el observador mínimo: escuchar / avisar
  comun/temas.ts           NUEVO la forma de un aviso {tema, datos} y de lo que viaja a cuestas
  servidor/canales.ts      NUEVO el tablero: un canal SSE por dispositivo, con sus temas,
                                 el latido, los límites y avisar(tema, datos)
  servidor/central.ts      CAMBIA la sala del vínculo pasa a ser un tema del tablero
                                 (presencia = quién del otro lado escucha el tema)
  servidor/a-cuestas.ts    NUEVO lo permanente: arma la cabecera X-Avisos de cada respuesta
                                 con los proveedores registrados (la versión, y lo que venga)
  navegador/flujo.ts       (ya está) escuchar un flujo SSE con fetch; se reutiliza tal cual
  navegador/canal.ts       NUEVO el único canal del dispositivo: abre el flujo con los temas
                                 que hay, se cierra sin temas o con la aplicación oculta
  navegador/central.ts     NUEVO la central: vigilar(espera), aCuestas(respuesta), falló(),
                                 y reparte cada aviso a sus esperas
  navegador/indicador.ts   NUEVO un indicador: un reductor puro de lo que pasa a un estado
  navegador/enlace.ts      CAMBIA usa el canal de la central en vez de su propio camino;
                                 armada la directa, suelta el tema del servidor
  navegador/servidor.ts    CAMBIA queda solo el envío por POST (el flujo lo pone el canal)
```

## Cómo se usa (lo que ve quien programe un caso nuevo)

```ts
// Dispositivo, temporario: abre el canal mientras dure y lo suelta al dejarlo.
const dejar = central.vigilar({ tema: `entrada:${id}`, temporario: true, alAviso: (d) => entrar(d) });

// Dispositivo, permanente: nunca abre el canal; le llega a cuestas o por un canal ya abierto.
central.vigilar({ tema: "version", alAviso: () => registro.update() });

// Dispositivo, indicador: mira lo que ya pasa.
const enLinea = crearIndicador(central);

// Servidor: avisar a quien espere ese tema (si nadie espera, no pasa nada).
canales.avisar(`entrada:${id}`, { token, usuario });

// Servidor: algo que viaja en cada respuesta.
aCuestas.agregar("version", () => config.version);
```

Una espera permanente se dispara solo cuando el valor de su tema **cambia** respecto del último
visto (la primera vez queda como referencia). Una temporaria, con cada aviso.

## El canal (temporario)

- Una sola conexión `GET /canal` por dispositivo con los temas como parámetro y la sesión (o el
  secreto del código QR) en las cabeceras. Si los temas cambian, se reconecta (un pedido chico,
  solo cuando cambia una pantalla).
- Al abrir, el servidor manda el **estado** de cada tema (E06): por ejemplo, si la entrada ya se
  aprobó. Ningún caso depende de recibir cada aviso.
- Se cierra cuando no quedan esperas temporarias o con la aplicación oculta (`visibilitychange`);
  se abre al volver si alguna lo necesita.
- El latido (25 s) lo pone el servidor, que también libera los canales muertos.
- Mandar al otro lado del vínculo: `POST /canal/<tema>` con la tanda, como hoy.

## Los casos de Ferrebress

| Caso | Declaración | El servidor avisa cuando |
|---|---|---|
| Entrada con QR | temporaria `entrada:<id>` (con el secreto del código) | el celular aprueba |
| Vincular el celular | temporaria `puesto:<id>` | el celular lee el código |
| Vínculo por el servidor | temporaria `vinculo:<sala>`, solo mientras no hay directa | el otro manda una tanda; entra o se va |
| Versión nueva | permanente `version` → buscar la versión | cambia la versión (a cuestas) |
| Sesión cerrada | permanente `sesion` → salir | se cierra (por el canal, si está abierto; si no, el 401 del próximo pedido, como hoy) |
| «En línea» de la entrada | indicador | — |
| «En línea · todo enviado» | indicador | — |
| Mandar lo pendiente | observador del indicador: al pasar a «en línea» | — |

Se sacan: las preguntas cada 2 s de los dos QR, `useResponde` con su pregunta cada 30 s, el
reintento cada 60 s de lo pendiente, la búsqueda de versión y el control de la sesión al volver
a la aplicación y al volver la red, y `/puestos/:id/enlace` (lo reemplaza `/canal`). La cabecera
`X-Version` pasa a ser `X-Avisos`.

## El indicador

Un reductor puro: de lo último que pasó sale el estado.

| Pasó | Estado |
|---|---|
| el canal se abrió / una respuesta llegó | en línea |
| el canal se cortó / un pedido falló por la red / el navegador dice `offline` | sin conexión |
| se está abriendo el canal / el navegador dice `online` | conectando, hasta lo próximo |

## Pruebas

- Módulo: cada pieza nueva con su prueba, al 100 %; los casos genéricos E27 a E29 con un caso
  inventado (no de Ferrebress).
- Aplicación: una prueba por escenario; E08 y E20 cuentan pedidos con relojes falsos (ninguno, y
  ningún temporizador armado).
- Punta a punta: E01, E02, E12, E21 a E24; E03 y SC-001 cuentan los pedidos del navegador
  mientras el QR está en pantalla.

## Seguridad

- **Quién escucha qué** (E30, E31): el módulo no conoce sesiones; Ferrebress autoriza cada tema
  antes de abrir el canal. `entrada:<id>` exige el secreto del código (en una cabecera, no en la
  dirección, para que no quede en los registros). `puesto:<id>` y `vinculo:<sala>` exigen la sesión
  dueña de ese vínculo. `sesion` es la del propio canal. Un tema no autorizado rechaza todo el
  canal (403).
- **La sesión nueva** viaja solo por el canal de quien tiene el secreto, igual que hoy en la
  respuesta a la pregunta.
- **Cierre** (E32): al cerrarse o vencer la sesión del canal, el servidor lo cierra (como hoy las
  salas, con el temporizador del vencimiento que ya existe en el servidor).
- **Saturación** (E33): un canal por dispositivo (el nuevo reemplaza al anterior del mismo
  dispositivo), un tope de canales por sesión y uno total; el latido libera los muertos. Las
  tandas conservan los límites de 023 (64 KB por mensaje, 1 MB por tanda).
- **Lo que llega** (E34): cada aviso se valida por su forma antes de entregarlo; uno que no la
  tiene se descarta.
- **A cuestas**: solo lleva datos públicos para quien hace el pedido (la versión); nada de otra
  persona.
