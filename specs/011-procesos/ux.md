# Requerimientos de interfaz: Procesos

Maqueta aprobada por Carlos el 2026-10-14: [maquetas/elegida.html](maquetas/elegida.html).
Las variantes `a-`, `b-` y `c-` son las tres de las que salió: computadora de la A con la tabla
de la C, y celular de la B con el dibujo de la A en «Diagrama».

## Dónde está

- En Más, como «Procesos», con la explicación «Cómo se hace cada cosa en el negocio, dibujado
  paso a paso». Aparece solo con «Ver procesos» o «Dibujar procesos».

## Dibujar en la computadora (historia 1)

- **A la vista, en este orden:** arriba, qué proceso está abierto (y desde ahí, los demás), su
  estado, si está guardado, deshacer y rehacer, Importar, Exportar y Proceso nuevo; abajo, el
  dibujo ocupando todo lo que dejan los paneles.
- **Los menús desplegables tapan todo,** también el dibujo y su botonera. El logo de bpmn.io queda a la vista (lo pide su licencia), pero no es parte de la pantalla: no lleva atajo de teclado ni recibe el foco (pedidos de Carlos del 2026-10-14).
- **Las figuras, con el panel abierto,** van una por renglón: el ícono a la izquierda y el nombre a la derecha, todas a la vista sin desplazarse (pedido de Carlos del 2026-10-14).
- **Tres paneles que se pliegan y arrancan plegados:** las figuras a la izquierda (plegado,
  solo los íconos, que se siguen pudiendo arrastrar), el paso elegido a la derecha (plegado,
  muestra su nombre) y «Los pasos, en orden» abajo. Cada uno recuerda cómo quedó en esa
  computadora.
- **El paso elegido** muestra nombre, tipo, quién lo hace, pantalla de Ferrebress donde se
  hace, cómo se hace y con qué sigue, y el botón con el tacho para quitarlo.
- **Teclado:** Ctrl+Z y Ctrl+Y deshacen y rehacen; Supr quita lo elegido; las flechas pasan de
  un paso a otro; Alt+P abre y cierra los pasos en orden; Alt+F, las figuras; Alt+E, el paso
  elegido; Insert agrega una tarea a continuación del paso elegido; Enter va al nombre del
  paso elegido.
- **Estado vacío:** sin procesos, una frase que dice qué es un proceso y el botón «Proceso
  nuevo» (o, sin permiso para dibujar, que todavía no hay ninguno).
- **Textos:** «Guardado», «Guardando…», «Sin conexión: no se guardó»; el error de forma dice
  qué le falta al paso («Ninguna flecha llega a este paso», «Una decisión necesita al menos dos
  salidas», «Falta el inicio», «Falta el fin»).

## Los procesos (historia 2)

- El selector de arriba lista todos los procesos con su estado y su cantidad de pasos, con un
  buscador; tiene «Cambiar el nombre» y «Borrar el proceso» para el abierto.
- Borrar es lo único que pregunta antes, y dice que no se puede recuperar.

## Borrador y vigente (historia 3)

- El estado se lee al lado del nombre: «Vigente», «Borrador» o «Vigente, con cambios en
  borrador».
- Con un borrador abierto: «Marcar vigente» (el botón principal mientras haya borrador) y
  «Descartar el borrador». El historial se abre desde el selector y muestra cada versión con
  su fecha y quién la hizo; una versión anterior se ve sin poder cambiarla, con «Copiar al
  borrador».

## Celular (historia 4)

- Arriba: volver, el nombre del proceso, deshacer y el menú «⋯» (Importar, Exportar, Marcar
  vigente, Cambiar el nombre, Borrar, Historial).
- Dos pestañas con ícono: primero «Diagrama» (elegida al abrir) y después «Pasos» (pedido de Carlos del 2026-10-14).
- «Pasos»: una tarjeta por paso con el asa para arrastrar, el ícono del tipo, el nombre y quién
  lo hace; las ramas de una decisión, con su nombre, corridas a la derecha; «Agregar un paso
  acá» entre tarjetas; tocar una tarjeta abre una hoja con sus datos.
- «Diagrama»: el dibujo, con los botones de acercar, alejar y ver todo, y la hoja «Agregar un
  paso» abajo, con las doce figuras, todas del mismo tamaño y con nombres cortos («Persona»,
  «Sistema», «Paralelo»); el nombre completo queda para los lectores de pantalla (pedido de
  Carlos del 2026-10-14).
- La hoja «Agregar un paso» se pliega y se despliega tocando su título (arranca abierta); plegada deja a la vista solo el título, para ver más dibujo. El logo de bpmn.io flota abajo a la derecha del dibujo, justo encima de la hoja, y se mueve con ella (pedido de Carlos del 2026-10-14).
- Debajo de «Agregar un paso», una sola línea: «Arrastrá un paso al dibujo o tocalo.» (tocarla la pone después del paso elegido; pedido de Carlos del 2026-10-14).
- Todo se alcanza con una mano; nada se corre hacia el costado salvo el dibujo.

## Exportar e importar (historia 5)

- Exportar ofrece «Imagen (PNG)», para mandar o imprimir, y «BPMN (estándar)», para abrirlo en
  otro programa de procesos. Importar abre el selector de archivos del dispositivo.
- Si el archivo no sirve, se dice por qué en el lugar: «No es un archivo BPMN», «El archivo
  está dañado», «Pesa más de 5 MB».

## Quién puede qué (historia 6)

- Con solo «Ver procesos» no aparecen las figuras, Importar, Exportar, Proceso nuevo, los
  botones de cambiar ni los borradores; los pasos se ven pero no se mueven.

## Chequeo contra los principios de interfaz de la constitución

- II, el cuaderno y la calculadora: no es trabajo del mostrador; nada obligatorio salvo el
  nombre del proceso.
- III, celular y computadora: las dos interfaces, con las mismas reglas y los mismos textos.
- IV, sin internet: se mira lo ya abierto; se avisa que no se guarda.
- V, nada se borra: las versiones anteriores quedan; borrar un proceso es lo único que pierde
  algo, y pregunta antes.
- IX, castellano y palabras del negocio: «paso», «carril», «decisión», «vigente», «borrador»;
  los nombres de BPMN en inglés no aparecen.
