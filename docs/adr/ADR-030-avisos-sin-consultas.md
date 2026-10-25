# ADR-030: Avisos sin consultas

**Estado**: Aceptado (2026-10-25) · **Spec**: specs/025 · **Decisión**: 160

## Contexto

La aplicación se enteraba de lo que pasaba del otro lado preguntando a ritmo fijo: cada 2 s los
dos códigos QR, cada 30 s el cartel «En línea» de la entrada, cada 60 s lo pendiente. Lo
permanente (versión nueva, sesión cerrada) preguntaba al volver a la aplicación y al volver la
red. Cada dispositivo vinculado tenía una conexión abierta todo el día, aunque hablara directo.
Carlos pidió minimizar el consumo de datos y no saturar el servidor, y una pieza que se extienda
declarando casos nuevos.

## Decisión

Una **central de avisos** en el dispositivo (Mediator) a la que se le declaran **esperas**
(Observer), alimentada por **fuentes** intercambiables (Strategy):

- **A cuestas**: el servidor agrega lo permanente a cada respuesta, en la cabecera `X-Avisos`
  (JSON). Cero pedidos propios. La espera se dispara solo cuando el valor cambia.
- **Canal**: una sola conexión SSE por dispositivo, abierta solo mientras haya una espera
  temporaria y la aplicación esté a la vista. Al abrir, el servidor manda el estado de cada tema
  y lo que va a cuestas. El latido (25 s) es del servidor y libera los canales muertos.
- **Navegador**: `online`, `offline` y `visibilitychange`, que no gastan nada.

Los **indicadores** son reductores puros de lo que pasa por la central. Lo pendiente se manda
cuando el indicador pasa a «en línea». El **vínculo** es una espera temporaria más del canal,
con presencia por lado; armada la directa, suelta el tema y el canal se cierra si nadie más lo
usa.

Del lado del servidor, los **canales** (que reemplazan a la central de ADR-027) saben qué
dispositivo espera cada tema, con un tope por grupo (la sesión) y uno total. El módulo no
conoce sesiones: la aplicación autoriza cada tema antes de abrir.

Todo vive en `microservices/conexion/` con las reglas de RNF-68.

## Alternativas descartadas

- **Pedido colgado (long polling)**: deja igual una conexión abierta y cada vuelta lleva
  cabeceras completas; gasta más que el latido.
- **Notificaciones push**: no dejan conexiones en el servidor, pero piden permiso a cada persona,
  obligan a mostrar una notificación y dependen de servicios de afuera; quedan para la segunda
  etapa (decisión 152).
- **Preguntar más espaciado**: gasta menos, pero sigue gastando sin que pase nada.
- **Un canal por caso**: más conexiones y latidos; el canal único los comparte.

## Consecuencias

- Una aplicación sin código QR en pantalla y sin vínculo por el servidor no gasta datos sin uso.
- Lo permanente llega con el próximo pedido: una aplicación quieta no se entera hasta que se la
  usa. El indicador sin canal dice lo último que se supo.
- Cambiar los temas del canal lo reconecta (un pedido chico, solo al cambiar de pantalla).
- `/puestos/:id/enlace` y la cabecera `X-Version` se reemplazan por `/canal` y `X-Avisos`; las
  aplicaciones de la versión anterior se actualizan solas al abrirse (decisión 54).
