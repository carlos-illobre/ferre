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
  comun/temas.ts           la forma de lo que viaja: temas pedidos, eventos, a cuestas, rechazos
  servidor/canales.ts      los canales: uno SSE por dispositivo, con sus temas, presencia por lado,
                           estado al abrir, tandas del vínculo, cierre de un tema o de un grupo,
                           latido y topes (reemplaza a la central de ADR-027)
  servidor/a-cuestas.ts    lo permanente de cada respuesta (cabecera X-Avisos)
  navegador/flujo.ts       (ya está) escuchar un flujo SSE con fetch; reconecta con espera creciente
  navegador/entorno.ts     la vista (visibilitychange) y la red (online/offline) del navegador
  navegador/canal.ts       el único canal del dispositivo: abre con los temas que hay, se cierra
                           sin temas o con la página oculta, suelta los temas rechazados
  navegador/central.ts     la central: vigilar(espera), respondio(cabecera), fallo(), mandar()
  navegador/indicador.ts   un indicador: una tabla de qué estado sale de cada suceso
  navegador/servidor.ts    el camino por el servidor del enlace: el tema del vínculo y el POST
  navegador/enlace.ts      usa el camino de arriba; suelta el tema al oír al otro por la directa
```

## Cómo se usa (lo que ve quien programe un caso nuevo)

```ts
// Dispositivo, temporario: abre el canal mientras dure y lo suelta al dejarlo.
const dejar = central.vigilar({ tema: `entrada:${id}`, temporario: true, alAviso: (d) => entrar(d) });

// Dispositivo, permanente: nunca abre el canal; le llega a cuestas o por un canal ya abierto.
central.vigilar({ tema: "version", aCuestas: true, alAviso: () => registro.update() });

// Dispositivo, indicador: mira lo que ya pasa.
const enLinea = crearIndicador(central);

// Servidor: avisar a quien espere ese tema (si nadie espera, no pasa nada).
canales.avisar(`entrada:${id}`, { token, usuario });

// Servidor: algo que viaja en cada respuesta.
aCuestas.agregar("version", () => config.version);
```

Una espera permanente se dispara solo cuando el valor de su tema **cambia** respecto del último
visto (la primera vez queda como referencia). Una temporaria, con cada aviso. Una permanente que
se sabe solo a cuestas (`aCuestas: true`, la versión) no se pide como tema: el servidor la cuenta
igual al abrir el canal. Si el servidor no da un tema permanente, la espera sigue (a cuestas) y el
canal se abre sin él; si no da uno temporario, esa espera termina.

## El canal (temporario)

- Una sola conexión `GET /canal` por dispositivo (por pestaña: cabecera `X-Canal`) con los temas
  en la cabecera `X-Temas` y la sesión en `Authorization` (o, en la entrada, el secreto del código
  dentro del tema pedido). Si los temas cambian, se reconecta (un pedido chico, solo cuando cambia
  una pantalla); antes de volver a abrir avisa que se cerró, para que quien esperaba algo con el
  de antes (la directa a medio armar) empiece de nuevo.
- Si se corta, vuelve a conectar a los 3 s, y si sigue sin poder, cada vez el doble hasta un
  minuto (un servidor caído o lleno no recibe un pedido cada 3 s).
- Al abrir, el servidor manda el **estado** de cada tema (E06): por ejemplo, si la entrada ya se
  aprobó. Ningún caso depende de recibir cada aviso.
- Se cierra cuando no quedan esperas temporarias o con la aplicación oculta (`visibilitychange`);
  se abre al volver si alguna lo necesita.
- El latido (25 s) lo pone el servidor, que también libera los canales muertos.
- Mandar al otro lado del vínculo: `POST /canal/<tema>` con la tanda, como hoy.

## Los casos de Ferrebress

| Caso | Declaración | El servidor avisa cuando |
|---|---|---|
| Entrada con QR | temporaria `entrada:<id>` (con el secreto del código); al aviso, retira la sesión con `POST /sesiones/vinculaciones/:id/estado`, una vez | el celular aprueba |
| Vincular el celular | temporaria `puesto:<id>` | el celular lee el código |
| Vínculo por el servidor | temporaria `vinculo:<sala>`, hasta que llega algo del otro por la directa | el otro manda una tanda; entra o se va |
| Versión nueva | permanente `version` → buscar la versión | cambia la versión (a cuestas) |
| Sesión cerrada | permanente `sesion:<id>` → salir | se cierra (por el canal, si está abierto; si no, el 401 del próximo pedido, como hoy) |
| «En línea» de la entrada | indicador | — |
| «En línea · todo enviado» | indicador | — |
| Mandar lo pendiente | al abrir, al pasar el indicador a «en línea» y, si quedó algo, con la próxima respuesta pasado un minuto | — |

Se sacan: las preguntas cada 2 s de los dos QR, `useResponde` con su pregunta cada 30 s, el
reintento cada 60 s de lo pendiente, la búsqueda de versión y el control de la sesión al volver
a la aplicación y al volver la red, y `/puestos/:id/enlace` (lo reemplaza `/canal`). La cabecera
`X-Version` pasa a ser `X-Avisos`.

## El indicador

Un reductor puro: de lo último que pasó sale el estado.

| Pasó | Estado |
|---|---|
| el canal se abrió / una respuesta llegó / el navegador dice `online` | en línea |
| el canal se cortó / un pedido no llegó por la red (no uno cancelado) / el navegador dice `offline` | sin conexión |
| se está abriendo el canal | conectando |

## Pruebas

- Módulo: cada pieza nueva con su prueba, al 100 %; los casos genéricos E27 a E29 con un caso
  inventado (no de Ferrebress).
- Aplicación: una prueba por escenario; E08 y E20 cuentan pedidos con relojes falsos (ninguno, y
  ningún temporizador armado).
- Punta a punta: E01, E02, E12, E21 a E24; E03 y SC-001 cuentan los pedidos del navegador
  mientras el QR está en pantalla.

## Seguridad

- **Quién escucha qué** (E30, E31): el módulo no conoce sesiones; Ferrebress autoriza cada tema
  antes de abrir el canal. `entrada:<id>` exige el secreto del código (en la cabecera `X-Temas`,
  no en la dirección, para que no quede en los registros). `puesto:<id>` y `vinculo:<sala>` exigen
  la sesión dueña de ese vínculo. `sesion:<id>` es la del propio canal. Si algún tema no se da, el
  canal no se abre y la respuesta dice cuáles; el dispositivo los suelta y pide el resto.
- **La sesión nueva** no viaja por el canal: el canal solo dice «listo» y la computadora la retira
  con el secreto, como antes, una sola vez.
- **Cierre** (E32): al cerrar una sesión a distancia o al desactivar a la persona, el servidor
  avisa por su tema y cierra los canales de esa sesión; al salir, solo los cierra.
- **Saturación** (E33): un canal por pestaña (el nuevo reemplaza al anterior), del grupo de su
  sesión o, sin sesión, de su código de entrada; tope de 10 canales por grupo y 1000 en total;
  hasta 10 temas por canal; hasta 120 aperturas por minuto por dirección; el latido libera los
  muertos. Las tandas conservan los límites de 023 (64 KB por mensaje, 1 MB por tanda).
- **Lo que llega** (E34): cada aviso se valida por su forma antes de entregarlo; uno que no la
  tiene se descarta.
- **A cuestas**: solo lleva datos públicos para quien hace el pedido (la versión); nada de otra
  persona.
