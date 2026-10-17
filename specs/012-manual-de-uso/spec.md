# Feature Specification: Manual de uso

**Feature Branch**: `012-manual-de-uso`

**Created**: 2026-10-16

**Status**: Aprobada

**Maquetas**: Aprobadas (`maquetas/manual-entrar.html`, el capítulo «Entrar», aprobado por Carlos el 2026-10-16)

**Input**: «El tutorial es la página que se abre al presionar "Ver tutorial": tiene que verse como un
manual de instrucciones, con texto explicativo, capturas, y el video actúa como un clip de esa
funcionalidad, es un complemento.» (Carlos, 2026-10-16)

## Clarifications

### Session 2026-10-16

- Q: ¿Se abre también desde adentro de la aplicación? → A: No: solo desde la entrada.
- Q: ¿También en el celular? → A: No, solo en la computadora.
- Q: ¿Qué capítulos? → A: Uno por cada pantalla principal, en este orden: Entrar, Catálogo,
  Vender y, después, cada sección de Más (Cómo va el negocio, Usuarios, Anomalías, Procesos, Mejoras
  y errores, Configuración).
- Q: ¿Misma pestaña o nueva? → A: En la misma pestaña; «Volver a Ferrebress» vuelve a la entrada.
- Los clips y las capturas se arman aparte de las pruebas de punta a punta: esas pruebas no graban
  video ni tienen las pausas del tutorial, para no hacerse más lentas (pedido de Carlos).

## User Scenarios & Testing

### User Story 1 - Aprender a usar Ferrebress antes de entrar (Priority: P2)

Alguien que todavía no usó Ferrebress, en la entrada de la computadora, toca «Ver tutorial» y lee
cómo se hace cada cosa: con texto, pasos numerados, capturas de la aplicación y un clip corto que
lo muestra. Después vuelve a la entrada y entra.

**Why this priority**: Ayuda a empezar sin que nadie explique, pero no frena el mostrador.

**Independent Test**: Desde la entrada de la computadora, «Ver tutorial» abre el capítulo «Entrar»
con sus pasos, sus capturas y su clip; «Volver a Ferrebress» vuelve a la entrada.

**Acceptance Scenarios**:

- **E01** **Given** la entrada de la computadora, **When** se toca «Ver tutorial» (o se lo elige con el teclado), **Then** se abre el manual en la misma pestaña, en el capítulo «Entrar», sin haber entrado a Ferrebress.
- **E02** **Given** el manual abierto, **When** se mira el índice, **Then** figuran los nueve capítulos en orden (Entrar, Catálogo, Vender, Cómo va el negocio, Usuarios, Anomalías, Procesos, Mejoras y errores, Configuración); el que está escrito se puede abrir y los que faltan dicen «pronto» y no se pueden abrir.
- **E03** **Given** el capítulo «Entrar», **When** se lo lee, **Then** tiene, en este orden: una entrada, qué hace falta, cuánto tarda y dónde se hace; el aviso de que el correo tiene que estar autorizado; el clip; los cuatro pasos de entrar con el celular, cada uno con su captura; cada captura del capítulo lleva marcas numeradas en lo que se mira o se toca (en el celular, un recuadro alrededor del botón) y, debajo, su leyenda; el aviso de que quedan vinculados, con su propio clip (al cambiar de pantalla en el celular, la computadora va a la misma sola); las otras formas de entrar; y «Si algo no funciona», con su captura.
- **E04** **Given** los clips, **When** se abre el capítulo, **Then** cada clip está quieto, sin sonido y con sus controles; arranca cuando se lo pide.
- **E05** **Given** el manual, **When** se toca «Volver a Ferrebress» o el botón de volver del navegador, **Then** se vuelve a la entrada.
- **E06** **Given** el manual, **When** se lo recorre solo con el teclado, **Then** se llega a «Volver a Ferrebress», al índice y al clip; cada captura tiene un texto que dice qué muestra.
- **E07** **Given** un celular, **When** se abre la aplicación, **Then** no hay «Ver tutorial» ni manual: es solo de la computadora.
- **E08** **Given** las capturas y el clip, **When** cambia una pantalla de la aplicación, **Then** se vuelven a generar con un comando, con la aplicación de verdad y datos de ejemplo, sin tocar las pruebas de punta a punta, que no graban video.
- **E09** **Given** la aplicación instalada, **When** se baja para usar sin conexión, **Then** las capturas y el clip del manual no se guardan en el dispositivo (no ocupan lugar); el manual necesita internet, como entrar.

### Edge Cases

- Una sesión abierta y la dirección del manual escrita a mano: el manual se ve igual (no muestra
  datos del negocio).
- Una ventana angosta: el índice pasa arriba del texto y las capturas se achican, sin correrse al costado.

## Requirements

### Functional Requirements

- **RF-97**: En la entrada de la computadora, «Ver tutorial» abre el manual de uso en la misma pestaña, sin sesión. El manual tiene un capítulo por pantalla principal (Entrar, Catálogo, Vender y cada sección de Más), cada uno con texto, pasos, capturas de la aplicación y un clip corto como complemento; los que faltan escribir dicen «pronto». Solo en la computadora.

### Non-Functional

- Las capturas y los clips se arman con la aplicación de verdad, con un comando, aparte de las
  pruebas de punta a punta (ADR-004).

## Success Criteria

- Alguien que nunca usó Ferrebress entra a la computadora solo con lo que dice el capítulo «Entrar».
