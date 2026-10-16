# ADR-020: Cómo se entera la app de que hay una versión nueva

**Estado:** Aceptado
**Fecha:** 2026-10-16
**Precisa:** la decisión 54 (`docs/decisiones-de-negocio.md`)

---

## Contexto

Las pantallas viven en GitHub Pages y abren sin conexión gracias a un service worker
(`vite-plugin-pwa`, en modo «prompt»). Cada publicación trae un service worker distinto; para
saber si hay una versión nueva, el navegador baja el publicado (unos 3 KB, 1,3 KB comprimido)
y lo compara con el que tiene. Si cambió, baja la versión entera (unos 2 MB sin comprimir) y
la deja esperando.

Qué se hace con una versión encontrada no cambia (decisión 54): si la app se abrió hace menos
de 15 segundos, se aplica sola; si ya se estaba usando, aparece «Hay una versión nueva» con
«Actualizar ahora», para no perder una venta a medio armar. Si la app se cierra del todo, la
versión que esperaba se instala sola y la próxima vez abre directo con ella.

Hasta acá la app buscaba al abrirse, al volver a primer plano, al volver la conexión y cada
media hora con un timer que corría aunque la app estuviera oculta. Carlos preguntó si el timer
se podía reemplazar por un evento que mande GitHub cuando publica. El 2026-10-16 se compararon
las opciones; esto deja el análisis y lo elegido.

### Lo que ya había para hacerlo con eventos

- La API ya mantiene conexiones de eventos abiertas (Server-Sent Events) para el vínculo entre
  el celular y la computadora: una para el espejo y otra para los códigos escaneados, con un
  latido cada 25 segundos para que el proxy no las corte. Solo las abren los dispositivos
  vinculados; un dispositivo sin vincular no tiene ninguna conexión abierta.
- El pipeline de GitHub ya publica un aviso en ntfy en cada push, que escucha la máquina de
  Oracle para desplegarse (ADR-013).
- La API conoce su versión (`/health`) y cada pantalla la suya (`VITE_VERSION`).

## Las opciones

Ordenadas de menor a mayor consumo. Lo que cuesta bajar la versión nueva es igual en todas;
cambia lo que cuesta enterarse.

| # | Mecanismo | Consumo por dispositivo | Carga en nuestro servidor | Cuándo se entera |
|---|---|---|---|---|
| 1 | Al abrir | 1 búsqueda por apertura (~2 KB) | ninguna | al abrir |
| 2 | Al volver a primer plano y al volver la conexión | 1 búsqueda cada vez | ninguna | al volver a la app |
| 3 | Notificación push del navegador | casi nada: usa el canal de notificaciones del sistema | un envío por dispositivo en cada publicación | segundos, aun con la app cerrada |
| 4 | Timer, solo con la app a la vista | ~4 KB/h, nada mientras está oculta | ninguna (lo absorbe GitHub Pages) | lo que diga el timer |
| 5 | Timer, siempre | ~4 KB/h, también en segundo plano | ninguna | lo que diga el timer |
| 6 | La API manda su versión en cada respuesta | nada aparte: viaja en lo que la app ya pide | ninguna | en el próximo pedido a la API |
| 7 | La app escucha ntfy | conexión abierta con latido, ~20 KB/h | ninguna, pero depende de un servicio externo | segundos, con la app abierta |
| 8 | Evento desde nuestra API | conexión abierta con latido, ~20 KB/h | una conexión abierta por dispositivo | segundos, con la app abierta |

Notas de cada una:

- **3 (push):** la más cara de armar. Claves VAPID, guardar en el servidor a quién avisar, que
  cada persona acepte «permitir notificaciones», y en iPhone solo con la app instalada en la
  pantalla de inicio.
- **6 (versión en las respuestas):** la API agrega su versión en una cabecera; si no coincide
  con la de la pantalla, se busca. Hay que limitar la búsqueda (una cada pocos minutos mientras
  no coincidan), porque la API puede salir antes que Pages. Un dispositivo quieto no le habla a
  la API, así que no se entera hasta que alguien lo usa.
- **7 (ntfy):** el nombre del canal quedaría a la vista en el código de la app; cualquiera
  podría mandar avisos falsos. Tendría que ser un canal distinto del que despliega la máquina.
- **8 (evento de la API):** el pipeline, cuando Pages termina de publicar, avisa a la API con
  un secreto y la API lo reenvía por un canal de eventos propio (no el del espejo, que existe
  solo con el vínculo). Reusa la pieza de conectar y reconectar de
  `plataforma/tiempo-real/`.

En cualquier opción con evento, el aviso tiene que salir después de que Pages terminó de
publicar: si sale antes, la búsqueda no encuentra nada y no vuelve a buscar.

### Cuánto aguanta la opción 8

Una conexión quieta ocupa del orden de decenas de KB en el servidor (mil conexiones, 50 a
100 MB de los 12 GB de la máquina), y mil latidos cada 25 segundos son unos 40 mensajes por
segundo: el servidor aguanta del orden de miles. Los límites aparecen antes en otro lado:

- El Caddy compartido de la máquina (ADR-013), que puede tener un tope de conexiones.
- El límite de archivos abiertos del proceso: cada conexión ocupa uno.
- El navegador: con HTTP/1.1 abre como mucho 6 conexiones por servidor. Una computadora
  vinculada en Vender ya tiene 2; con una tercera, dos pestañas abiertas llegan al tope y los
  pedidos a la API quedan esperando. Con HTTP/2 no pasa.

### Un local y muchos locales

| | Timer (4 o 5) | Evento de la API (8) |
|---|---|---|
| **Un local, ~15 dispositivos** | Nada en el servidor; se entera en hasta 30 min | 15 conexiones; se entera en segundos |
| **100 locales, ~1500 dispositivos** | Nada en el servidor; unos 4 GB por mes en Pages | 1500 conexiones abiertas, ~60 latidos por segundo y unos 22 GB por mes desde la máquina. Cada despliegue de la API corta todas y se reconectan juntas; con más de un servidor hay que repartir el aviso entre ellos |

El timer es más liviano en los dos casos y escala sin tocar la máquina; el evento solo gana en
rapidez.

### Cómo se usa cada dispositivo

- **El celular** entra y sale de la app todo el tiempo: con 1 y 2 se entera casi siempre al
  volver.
- **La computadora del mostrador** suele tener la app siempre a la vista: 2 casi nunca se
  dispara, y sin timer ni evento se queda con la versión que tenía al abrirla, a veces días.
  Eso también alarga el tiempo en que una pantalla vieja le habla a una API nueva.

## Decisión

Elegido por Carlos el 2026-10-16: **1 + 2 + 4**.

- Se busca al abrir, al volver a primer plano, al volver la conexión y con un timer que corre
  **solo mientras la app está a la vista**: se para al ocultarse y arranca de nuevo al volver,
  que además busca en el momento.
- El timer arranca en 30 minutos. Cada dispositivo puede elegir otro tiempo en Configuración
  (`specs/009-configuracion/`).
- Lo que pasa con la versión encontrada no cambia (decisión 54).

## Alternativas descartadas

- **Evento desde nuestra API (8).** Rápida, pero suma conexiones abiertas, reconexiones en cada
  despliegue y repartir el aviso si un día hay más de un servidor. No se justifica mientras el
  timer alcance. Si hiciera falta, la pieza de reconectar ya existe.
- **Versión en las respuestas de la API (6).** Barata y buena para la computadora en uso; Carlos
  la dejó para más adelante («no hace falta por ahora»). Es la primera a sumar si el timer no
  alcanza.
- **ntfy desde la app (7).** Dependencia externa y un canal a la vista de cualquiera.
- **Push (3).** Mucho armado y un permiso para cada persona, para un beneficio (enterarse con
  la app cerrada) que no hace falta: al abrir ya se actualiza sola.
- **Timer siempre (5)**, lo que había. Gasta en segundo plano sin ganar nada: al volver a primer
  plano ya se busca.

## Consecuencias

- Una app oculta no gasta nada en buscar versiones.
- Con la app a la vista, la versión nueva aparece a más tardar en lo que diga el timer; quien
  quiera enterarse antes lo baja en Configuración, gastando un poco más de datos (contra
  GitHub Pages, no contra nuestra máquina).
- La máquina no suma carga ni conexiones por esto, con uno o con muchos locales.
