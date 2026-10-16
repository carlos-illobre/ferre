# Feature Specification: Manual de uso

**Feature Branch**: `012-manual-de-uso`

**Created**: 2026-10-16

**Status**: Borrador

**Maquetas**: A aprobar (`maquetas/manual-entrar.html`, el capítulo «Entrar» como ejemplo)

**Input**: «El tutorial es la página que se abre al presionar "Ver tutorial": tiene que verse como un
manual de instrucciones, con texto explicativo, capturas, y el video actúa como un clip de esa
funcionalidad, es un complemento.» (Carlos, 2026-10-16)

## Lo que se sabe

- «Ver tutorial», en la entrada de la computadora, abre el manual (hoy no lleva a ningún lado).
- El manual es una página con capítulos, uno por parte de la aplicación. Cada capítulo explica con
  texto, pasos numerados y capturas de la aplicación; un clip corto muestra la parte que se explica.
- Las capturas y los clips se arman solos con la aplicación de verdad (con datos de ejemplo), para
  que no queden viejos cuando cambia una pantalla: se vuelven a generar con un comando.
- El primer capítulo es «Entrar». Los demás (Vender, Catálogo y precios, Depósito, Más) figuran como
  «pronto».

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
