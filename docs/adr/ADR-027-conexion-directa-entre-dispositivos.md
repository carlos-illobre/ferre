# ADR-027: El celular y la computadora se hablan directo, con el servidor de respaldo

**Estado:** Aceptado
**Fecha:** 2026-10-24
**Especificación:** `specs/023-conexion-entre-dispositivos/`
**Reemplaza:** el espejo y los códigos por flujos de eventos del servidor (ADR-020, «Lo que ya
había para hacerlo con eventos»), el pedido de foto con código QR y sus preguntas cada 2 segundos
(ADR-016), y la pregunta de respaldo del celular emparejado (specs/020, RF-134).
**Enmienda a:** ADR-018 (librerías compartidas), como ADR-019.

---

## Contexto

Todo lo que viaja entre el celular y la computadora emparejados (cada código escaneado, cada
cambio de la venta en espejo, «la computadora te pide una foto») va hoy del dispositivo al
servidor y del servidor al otro, aunque estén en el mismo wifi. Cada dispositivo emparejado
mantiene dos flujos de eventos abiertos con el servidor; el servidor guarda en memoria lo último
del espejo y en la base los códigos que esperan; el celular pregunta cada cierto tiempo si la
computadora le pidió algo, y la computadora pregunta cada 2 segundos si llegó la foto. Sin
internet, los dos dejan de hablarse.

Carlos eligió (decisión 152) la conexión directa entre los dos, con el servidor de respaldo
cuando los dispositivos o la red no la permiten, sin volver a probarla sola; un indicador en los
dos; y que todo viva en un módulo propio, sin dependencias, para llevarlo a otros proyectos.

## Alternativas

1. **Todo por el servidor, con WebSocket.** Una sola conexión por dispositivo en vez de dos. Cada
   mensaje sigue yendo a la nube y volviendo, y depende de internet. El servidor de Node no trae
   WebSocket: haría falta una biblioteca (el módulo no puede tener dependencias) o escribir el
   protocolo a mano.
2. **Directa con WebRTC, con un servidor TURN propio de respaldo.** Respaldo transparente para
   WebRTC, pero abre puertos en la máquina (RNF-44) y es un servicio más que operar.
3. **Directa con WebRTC; presentación y respaldo por el servidor con un flujo de eventos y
   pedidos comunes (elegida).** La presentación de los dos y el respaldo usan lo que ya trae el
   navegador y el servidor: un flujo de eventos (server-sent events) para recibir y un pedido
   `POST` para mandar. Sin bibliotecas y sin puertos nuevos.
4. **Bluetooth o USB desde el navegador.** El navegador no deja que el celular se comporte como
   un periférico.

## Decisión

### El módulo

`microservices/conexion/` es un paquete del workspace (`conexion-entre-dispositivos`), sin
dependencias, con tres partes:

| Parte | Qué es |
|---|---|
| `comun/` | Lo que usan las dos puntas: los avisos (patrón observer) y la forma de los mensajes |
| `navegador/` | El enlace de un dispositivo con el otro: presentación, conexión directa, respaldo, entrega confiable y estado |
| `servidor/` | La central: presenta a los dos lados de cada sala y pasa los mensajes del respaldo, sin guardarlos |

No conoce sesiones, usuarios, ventas ni pantallas. La aplicación le dice qué sala usar, qué lado
arma la conexión directa y cómo pedirle al servidor (la dirección y las cabeceras); el servidor de
la aplicación comprueba la sesión y el emparejamiento y recién ahí le pasa el pedido a la central.
Todo lo que el módulo toca de afuera (`fetch`, `RTCPeerConnection`, el reloj, los temporizadores,
dónde recordar) se le pasa al crearlo, con lo del navegador por omisión: así se prueba entero sin
navegador.

Se publica compilado (`dist/`, que arma el `prepare` del paquete al instalar y el `build` en la
imagen del servidor), como cualquier paquete que otro proyecto pudiera instalar.

### Cómo se conectan

1. Cada lado abre un flujo de eventos con su sala (`GET`) y manda por `POST`. La central le avisa
   a cada uno si el otro lado está escuchando, y le pasa lo que el otro manda.
2. Cuando los dos están, el lado que arma (la computadora) ofrece la conexión directa: WebRTC con
   un canal de datos ordenado y confiable, **sin servidores STUN ni TURN**: solo los candidatos de
   la red local. La oferta, la respuesta y los candidatos van por la central.
3. Si a los 5 segundos el canal no abrió, o si un navegador no tiene WebRTC (enseguida), ese lado
   lo anota en el dispositivo con el motivo («red» o «navegador»), se lo dice al otro por la
   central, y los dos siguen por el servidor. **No se vuelve a probar solo:** la vez siguiente que
   se encuentran, el que lo tiene anotado se lo recuerda al otro y van directo al respaldo. Solo
   «Probar conexión directa» lo borra y prueba una vez.
4. Si la directa andaba y se corta, siguen por el servidor; la próxima vez que se encuentran se
   vuelve a armar la directa, porque ya se sabe que en esa red anda (spec, E23).

### Entrega confiable, por cualquiera de los dos caminos

Cada mensaje lleva su número. El que manda lo guarda hasta que el otro confirma; el que recibe lo
entrega una sola vez y en orden (lo adelantado espera, lo repetido se descarta y se vuelve a
confirmar). Cada vez que se abre un camino (la directa, o el servidor con los dos presentes) los
dos se saludan: el saludo dice desde qué número tiene pendiente cada uno y hasta cuál recibió del
otro, y el que manda reenvía lo que falta por el camino nuevo. Cada página lleva su «época» (un
número al azar al abrirse): si el otro recargó, sabe desde dónde empezar. Lo grande (una foto) se
parte en mensajes de 16 KB, que viajan seguidos y se arman al llegar. Por el servidor, lo que se
junta mientras hay un `POST` en camino va en el siguiente, en orden. La demora que muestra el
indicador es la de la última confirmación: no hay latidos ni preguntas para medirla.

### En Ferrebress

- La ruta `/puestos/:id/enlace` (`GET` escucha, `POST` manda) pide sesión y que el dispositivo
  sea un lado de ese emparejamiento; después le pasa el pedido a la central. Desvincular, cerrar
  una sesión a distancia o vencer el vínculo cierra la sala, y la central se lo dice a los dos.
- Lo que hoy viaja por el espejo, los códigos y los avisos pasa a ser mensajes del enlace. El
  servidor deja de guardar el espejo en memoria y los códigos en la base.
- La foto se le pide solo al celular emparejado (decisión 152) y llega por el enlace. Se sacan el
  pedido de foto con código QR y sus rutas.
- Se saca la pregunta de respaldo del celular emparejado y su ajuste en Más → Sistema (RF-134):
  ya no hay nada que preguntar.

### Reglas de código del módulo (RNF-68)

Solo para `microservices/conexion/`: cada pieza hace una cosa, con pocos caminos; nada repetido;
un comentario en cada pieza que dice qué hace; y la cobertura de sus pruebas unitarias es del
100 % de líneas, ramas, funciones y sentencias, que su `vitest` exige y hace fallar si baja. Su
`pnpm capas` controla que no importe nada de fuera de la carpeta.

## Consecuencias

- Con la directa, ningún mensaje pasa por el servidor; con el servidor, los mensajes pasan y no
  se guardan. Ninguno de los dos caminos consulta la base, salvo la comprobación de la sesión y
  del emparejamiento en cada pedido, que ya existía.
- Lo que no se pudo entregar vive en la memoria de la página: si se cierra, se pierde (como la
  venta en curso, ADR-022). Hoy los códigos esperaban en la base.
- Con la directa armada, si se corta internet y sigue el wifi, el lector y el espejo siguen. Sin
  internet no se puede armar una conexión nueva.
- Cada dispositivo emparejado tiene un solo flujo abierto con el servidor (hoy, dos), con un
  latido cada 25 segundos que no toca la base.
- Si algún día hay más de un proceso del servidor, la central tiene que pasar los mensajes entre
  procesos (como hoy el espejo).
- Las aplicaciones de la versión anterior pierden el espejo hasta que se actualizan (se
  actualizan solas al abrirse, decisión 54); el vínculo no se pierde, porque vive en el servidor.

## Cuándo revisar esta decisión

- Si en el local la directa casi nunca se puede (el indicador lo muestra): el respaldo alcanza y
  la directa sobra.
- Si hace falta avisar al celular con la aplicación cerrada (segunda etapa): notificaciones push.
