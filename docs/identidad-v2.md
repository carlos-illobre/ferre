# Identidad y sistema visual de Ferrebress v2

Propuesta del 2026-10-10 para el rediseño completo de la interfaz (decisiones 13, 19 y 22 de
[decisiones-de-negocio.md](decisiones-de-negocio.md)). Está construida y publicada en `/v2/`,
al lado de la interfaz actual, para que Carlos la revise. **No reemplaza nada hasta que la
apruebe.** Las reglas de uso que respeta están en
[specs/001-base-del-sistema/ux.md](../specs/001-base-del-sistema/ux.md); los valores exactos,
en `clientes/gestion-del-local-web/src/v2/estilos/tokens.css`.

## De dónde sale

De lo que Carlos dijo de cada versión: de la primera le gustaron los estilos (azul marino y
amarillo de las maquetas de `mockups/`) y la usabilidad en la computadora (tablas densas,
edición en la fila, teclado); del rediseño le gustó el celular (una cosa por vez, tarjetas,
hojas que suben, todo al pulgar). La v2 junta las dos mitades que funcionaron bajo una sola
identidad, con aspecto de tablero: menú lateral oscuro, tarjetas blancas, indicadores con
ícono y estados en pastillas de color.

## Idea

Una ferretería de barrio se reconoce por dos cosas: el azul de trabajo y el amarillo de la
cinta métrica y las etiquetas de precio. Ferrebress usa el azul marino para todo lo que
ordena (menú, cobro, selección) y **un solo color de acción, el ámbar**, para lo que hay que
apretar: en cada pantalla hay un único botón ámbar, y es el paso que sigue.

## Marca

- **Nombre:** Ferrebress, siempre con mayúscula inicial.
- **Símbolo:** una tuerca hexagonal ámbar con la F calada en azul marino. Funciona a 16 px
  (pestaña del navegador) y como ícono de la app en el celular.
- **Logotipo:** el símbolo y el nombre en Archivo ancha (112 %), peso 800.
- **No se hace:** degradados, sombras o contornos sobre el símbolo; el nombre en otro color
  que no sea blanco (sobre marino) o tinta (sobre claro).

## Paleta

| Nombre | Valor | Para qué |
|---|---|---|
| Marino | `#14294b` | Menú lateral, barra del celular, barra de cobro, botón elegido |
| Tinta | `#0f1e36` | Texto |
| Ámbar | `#ffb81c` | La acción principal de cada pantalla, la pantalla activa del menú, el total |
| Azul | `#1d4f9c` | Foco del teclado, fila elegida, el «?» de los números que se explican |
| Fondo | `#eef1f6` | Detrás de las tarjetas |
| Superficie | `#ffffff` | Tarjetas, tablas, hojas |
| Verde / rojo | `#0f6b45` / `#b3301a` | Baja de precio y «al día» / suba, falta y anulado |

El ámbar claro (`#fff3d1`) marca lo que falta sin frenar (un renglón sin precio); el rojo
claro, lo que sí frena. Todo el texto cumple contraste AA; el texto común supera 7:1.

## Tipografía

Una sola familia, **Archivo** (variable, incluida en la app: no depende de internet), usada en
tres anchos:

- **Angosta (78 %), peso 700: los importes.** Se leen de lejos y entran más cifras por columna.
  Siempre con cifras tabulares.
- **Normal (100 %): todo lo que se lee.** Base de 16 px en la computadora y 17 px en el celular;
  el texto de detalle, 14 y 15 px.
- **Ancha (112 %), peso 800: solo la marca.**

## Formas y movimiento

- Controles con radio de 8 px; tarjetas, 12 px; hojas, 20 px; pastillas, redondas.
- Sombras suaves y de un solo tono; sin degradados ni brillos.
- Íconos de trazo de 2 px, sin relleno, siempre junto a su texto (salvo cerrar, quitar y
  escanear, que llevan nombre para lectores de pantalla).
- El movimiento solo responde a una acción (abrir una hoja, plegar un panel, cobrar), dura
  entre 120 y 220 ms, mueve solo posición y opacidad, y se apaga si el dispositivo pide
  menos movimiento.

## Estructura

Una sola interfaz que se acomoda al ancho, sin recargar la página:

| | Celular (menos de 900 px) | Computadora (900 px o más) |
|---|---|---|
| Navegación | Cuatro pestañas abajo (Vender, Catálogo, Depósito, Negocio) y, dentro de cada una, sus pantallas arriba | Menú lateral con las once pantallas agrupadas; Alt + número las abre |
| Listas | Tarjetas, una por elemento, enteras en el ancho | Tablas a todo el ancho, con edición en la fila |
| Lo que se abre encima | Hoja que sube desde abajo | Ventana centrada |
| Acción principal | Fija abajo, al alcance del pulgar | Con su tecla a la vista |

## Piezas

Están en `clientes/gestion-del-local-web/src/v2/ui.tsx` y `estilos/base.css`: botón, buscador,
los cinco márgenes, cantidad con unidad, número que se explica («?» en un círculo), pastilla,
indicador, aviso en el lugar, aviso que se va solo, estado vacío, barra de avance, panel
plegable, hoja, pantalla de éxito, foto que se amplía y estado de la conexión. Las pantallas
arman con estas piezas y no definen colores ni medidas propias.

## Qué queda por decidir

- Si la v2 se aprueba, reemplaza a las dos interfaces actuales y ADR-014 se reemplaza por el
  ADR que documente «una interfaz que se acomoda».
- El nombre y el ícono con que la app se instala en el celular siguen siendo los actuales
  hasta entonces.
