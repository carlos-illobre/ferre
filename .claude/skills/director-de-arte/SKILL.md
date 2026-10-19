---
name: director-de-arte
description: Director de arte de interfaces. Imagina sin límites cómo podría verse una pantalla (al menos tres variantes por dispositivo y un catálogo de ideas). Solo cuando Carlos lo pide escribiendo /director-de-arte.
disable-model-invocation: true
---

# Director de arte

**Regla para todo agente que arme o toque maquetas: sin pruebas** (decisión 114). Ni pruebas
unitarias, ni de punta a punta, ni scripts de Playwright que recorran los botones, ni comparación
de capturas píxel a píxel. Se abre cada maqueta una vez y se mira que la consola no tenga errores.
Quien lance a un agente de maquetas le copia esta regla en el encargo.

**Solo corre cuando Carlos lo pide con `/director-de-arte`** en esta sesión. No forma parte de
los siete pasos de la constitución ni reemplaza a `/ux`: produce propuestas, no decisiones. Lo
que Carlos tome de ellas pasa por el flujo de siempre.

Argumentos: la pantalla o las pantallas, y el dispositivo (`compu`, `celu` o los dos; si no lo
dice, los dos). Ejemplo: `/director-de-arte depósito > stock, celu`.

## Cómo se corre

1. **Un subagente por pantalla** (herramienta Agent, `general-purpose`, en segundo plano), con
   este mensaje: «Leé y seguí `.claude/skills/director-de-arte/prompt.md` (tu rol) y
   `.claude/skills/director-de-arte/encargo.md` (el entorno)», más la entrada: la pantalla, la
   carpeta donde va (`microservices/web/public/maquetas/<pantalla>/`), el dispositivo, las carpetas de
   `specs/` que la especifican y qué hace la pantalla en una línea. Va como subagente a
   propósito: no tiene que ver el código ni la conversación, para que el diseño de hoy no lo
   sesgue. Esta es la única excepción a «sin subagentes» además del revisor.
2. **Varias pantallas a la vez:** si todavía no hay lenguaje común
   (`microservices/web/public/maquetas/_comun/lenguaje.md`), primero una sola pantalla con el encargo
   extra de definirlo; recién después las demás, en paralelo.
3. **Al terminar cada una**, antes de subir:
   - que no haya datos personales de Carlos (su correo) ni rutas absolutas en los archivos;
   - que se abra sola (rutas relativas a `_comun/`) y tenga `comparacion-compu.png`,
     `comparacion-celu.png` y `resumen.md`;
   - sumarla a la tabla de `microservices/web/public/maquetas/README.md`, commit con la tarea del
     pedido y push a `master`.
4. **A Carlos:** las comparaciones con `SendUserFile` y, por pantalla, la idea de cada variante,
   la preferida del agente y lo que contradice una decisión o queda fuera de la especificación.

## Hacer navegable una variante

Cuando Carlos pide «hacé navegable la variante X de tal pantalla» (o las tres, si duda), un
subagente sigue `.claude/skills/director-de-arte/navegable.md` sobre esa carpeta. Al terminar, la
pantalla se suma a `maquetas/navegables.json` y se sube; un cambio solo en maquetas no lleva
pruebas (decisión 114). Se ven en el ambiente de pruebas en `/v2`, `/v3` y `/v4` (decisión 113).

Lo que Carlos rechaza se borra de `microservices/web/public/maquetas/` y se sube.
