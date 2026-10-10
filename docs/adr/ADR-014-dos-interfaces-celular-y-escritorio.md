# ADR-014: Dos interfaces sobre la misma app, una para el celular y otra para la computadora

**Estado:** Aceptado
**Fecha:** 2026-10-09

---

## Contexto

El rediseño del 2026-09-14 (`mockups/Ferre iOS.html`) dejó una sola interfaz para todo. En
el celular quedó, en palabras del dueño, perfecta. En la computadora perdió usabilidad:
espacio desaprovechado, y grillas y búsquedas más difíciles de usar que antes. El intento
de ensancharla con CSS (commit `6333c1f`) no conformó.

La interfaz anterior al rediseño tenía el problema inverso: tablas anchas, menú completo y
atajos de teclado, muy cómoda en la notebook e inusable en el celular.

El dueño pidió (2026-10-09) que el celular conserve el layout actual, que la computadora
recupere el layout original, y que las dos compartan paleta y marca.

## Opciones consideradas

### 1. Una sola interfaz que se adapta por CSS
Es lo que había. Una tarjeta pensada para el pulgar no se convierte en una fila de tabla
pensada para el teclado cambiando estilos: cambian el marcado, la navegación (cuatro
pestañas contra ocho opciones de menú) y dónde vive cada cosa (ficha en una hoja contra
edición en la fila). Ya se probó y no alcanzó.

### 2. Dos direcciones distintas, una por interfaz
El dueño la ofreció para revisar cada versión por separado. Obliga a publicar dos sitios,
a que cada persona recuerde cuál abrir, y a una unificación posterior.

### 3. Dos árboles de pantallas en el mismo cliente, elegidos por el ancho de la pantalla (elegida)

## Decisión

El cliente web tiene dos interfaces que comparten todo lo que no es pantalla:

| | Celular | Computadora |
|---|---|---|
| Dónde vive | `src/App.tsx`, `src/pantallas/`, `src/componentes/`, `src/estilos.css` | `src/escritorio/` (su `App.tsx`, sus pantallas, sus componentes, su `estilos.css`) |
| Cuándo se carga | Pantalla de menos de 900 px de ancho | 900 px o más |
| Navegación | Cuatro pestañas abajo | Menú completo arriba |
| Listas | Tarjetas; el detalle en una hoja | Tablas a todo el ancho; se edita en la fila |
| Teclado | No aplica | Flechas, Enter, Esc, F2, F5 a F8, Shift+1 a Shift+5 |

- **Se elige al abrir** (`src/vista.ts`, `src/main.tsx`): cada interfaz se importa de forma
  dinámica y trae solo sus pantallas y sus estilos, así las clases de una no pisan las de la
  otra. Si la ventana cruza los 900 px, la página se recarga.
- **Es la misma dirección.** No hay nada que unificar después: cada dispositivo abre lo suyo.
- **Lo compartido no se duplica:** API, cola de cambios, catálogo local, sesión, huella,
  escáner, unidades, formato y la librería de precios. Una regla de negocio se escribe una vez.
- **Misma paleta y misma marca:** tinta, niebla y coral, importes en Archivo Narrow, logo
  «fe». Las reglas están en `docs/sistema-visual.md`.
- **Las pruebas siguen a las interfaces:** unitarias al lado de cada pantalla; los E2E en
  `tests/e2e/escritorio/` y `tests/e2e/celular/`, cada uno con su tamaño de ventana.

## Consecuencias

**Positivas**
- Cada interfaz se ajusta sin riesgo de romper la otra: un cambio de escritorio no carga ni
  una línea en el celular.
- El celular queda exactamente como está (comprobado con capturas antes y después).
- La computadora recupera las tablas y el teclado.

**Negativas / costos**
- **Toda función nueva con pantalla se hace dos veces**, una por interfaz, con su prueba.
  Es el costo principal y es deliberado.
- Dos juegos de E2E: tardan lo mismo porque corren en paralelo, pero hay que mantener ambos.
- Una tablet o una ventana angosta en la computadora ven la interfaz de celular; es lo
  esperado.

## Cuándo revisar esta decisión

- Si el costo de hacer cada pantalla dos veces frena el avance: evaluar qué pantallas de
  administración pueden quedar solo en una interfaz.
- Si aparece la app Android nativa (RNF-50): la interfaz de celular de la web pasa a ser
  la de respaldo.
