# Requerimientos de interfaz: Procesos

Maqueta aprobada por Carlos el 2026-10-14: [maquetas/elegida.html](maquetas/elegida.html).
Las variantes `a-`, `b-` y `c-` son las tres de las que salió: computadora de la A con la tabla
de la C, y celular de la B con el dibujo de la A en «Diagrama».

## Dónde está

- En Más, como «Procesos», con la explicación «Cómo se hace cada cosa en el negocio, dibujado
  paso a paso». Aparece solo con «Ver procesos» o «Dibujar procesos».

## Cómo se ve: la v2 (Carlos, 2026-10-24, decisión 148)

Procesos se ve como la v2 del director de arte (variante 1 de las maquetas de Procesos: «El
tablero de dibujo» en la computadora y «Diagrama y hoja» en el celular), con el lenguaje
«Mostrador». Hace lo mismo que antes; lo que sigue manda sobre la disposición de las historias.

- **Computadora, arriba:** el ícono del proceso en una baldosa verde suave; encima del nombre, la
  miga «Más › Procesos» y «✓ Guardado» (o «Guardando…», «Sin conexión: no se guardó»); el nombre
  grande con su flecha, que abre la lista de procesos; el estado en una pastilla con su punto
  (verde vigente, ámbar con borrador); a la derecha deshacer y rehacer, una raya, Importar,
  Exportar, «Nuevo» y, con un borrador, «Marcar vigente» en naranja con su tecla, Alt+V. Sin
  borrador, «Nuevo» es la acción en naranja.
- **Las figuras,** a la izquierda, en una columna de baldosas blancas en cuatro grupos separados por
  una raya (inicio, fin y espera; las tres tareas; las dos decisiones; el resto); al pasar el
  mouse, el nombre en un globo oscuro (la tarea, con su tecla Insert). Arriba, el botón del panel
  muestra los nombres.
- **El dibujo,** sobre el papel punteado, de lado a lado; los carriles blancos, los pasos blancos
  con el borde gris, las flechas grises y el elegido en naranja con un halo. Abajo a la derecha,
  en una tarjeta blanca: alejar, el tamaño, acercar y «Ver todo». El logo de bpmn.io, a su
  izquierda.
- **El paso elegido,** a la derecha en blanco: «Paso elegido» con Alt+E y el botón para plegarlo; la
  baldosa del tipo en naranja suave con el nombre y «Paso 5 de 10 · carril Vendedor»; los datos
  en campos blancos redondeados; y al pie «Quitar el paso» en rojo suave, con Supr.
- **Abajo, de lado a lado:** «Los pasos, en orden» con el resumen («10 pasos · 3 carriles · 2
  decisiones»), la pastilla ámbar «1 paso con aviso» si alguno tiene un error de forma, Alt+P y la
  flecha para abrir la tabla.
- **Celular, dentro de un proceso:** ‹ para volver, el nombre, deshacer y «…»; debajo, el estado en
  su pastilla y «✓ Guardado»; los segmentos «Diagrama» y «Pasos»; el dibujo de lado a lado sobre el
  papel punteado con acercar, alejar y «Ver todo» apilados en una tarjeta blanca arriba a la
  derecha; y la hoja blanca «Agregar un paso» con las doce figuras en baldosas grises con nombres
  cortos (Subproc., Docum.) y «Arrastrá un paso al dibujo.» al pie.
- **Lo que la v2 muestra y todavía no hay** (E02 de 021): el mapa chico del dibujo abajo a la
  izquierda, el aviso del error de forma flotando junto al paso («Ninguna flecha llega a este
  paso») con su insignia ámbar, el nombre de cada carril de costado con su ícono y en una pastilla
  en el celular, y los íconos de persona y de sistema dentro de los pasos con el estilo de la v2: el
  dibujo los muestra como los dibuja bpmn-js. El logo de bpmn.io se queda como es (su licencia no
  deja cambiarlo), en vez de la pastilla «hecho con bpmn.io».

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
- **Elegir un paso en el dibujo abre su panel** si estaba plegado, para ver sus datos sin un clic más; el paso elegido se marca con el naranja de la aplicación, en el celular también (decisión de Carlos del 2026-10-14, al comparar con la maqueta).
- **El paso elegido** muestra nombre, tipo, quién lo hace, pantalla de Ferrebress donde se
  hace, cómo se hace y con qué sigue, y el botón con el tacho para quitarlo.
- **Teclado:** Ctrl+Z y Ctrl+Y deshacen y rehacen; Supr quita lo elegido; las flechas pasan de
  un paso a otro; Alt+P abre y cierra los pasos en orden; Alt+F, las figuras; Alt+E, el paso
  elegido; Insert agrega una tarea a continuación del paso elegido; Enter va al nombre del
  paso elegido.
- **Si se corta la conexión mientras se dibuja,** el dibujo queda para mirar, con el último cambio a la vista y el aviso «Sin conexión: no se guardó»; ese cambio se manda solo cuando vuelve la conexión, y ahí se puede seguir dibujando.
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

- **Textos mínimos** (sistema visual, «Textos»): en el celular, rótulos y avisos de pocas palabras; las explicaciones largas son de la computadora (pedido de Carlos del 2026-10-14).

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
- Debajo de «Agregar un paso», una sola línea: «Arrastrá un paso al dibujo.» Tocar una figura también la agrega, después del paso elegido, pero la frase no lo dice (pedido de Carlos del 2026-10-14).
- El botón de volver del celular, adentro de un proceso, vuelve a la lista de procesos (con algo abierto encima, primero cierra eso); desde la lista, vuelve a Más (pedido de Carlos del 2026-10-14).
- La hoja de un paso usa el estilo de los formularios del celular: título grande, una tarjeta blanca con un renglón por dato (el rótulo a la izquierda, el valor a la derecha, sin recuadros) y abajo los botones anchos, «Agregar un paso después» con el color del botón principal; arriba a la derecha, un botón chico con una cruz la cierra (pedidos de Carlos del 2026-10-14).
- Los botoncitos que aparecen junto al paso elegido quedan siempre por debajo de los botones de acercar y alejar y de las hojas (pedido de Carlos del 2026-10-14).
- Todo se alcanza con una mano; nada se corre hacia el costado salvo el dibujo.

## Exportar e importar (historia 5)

- Exportar ofrece «Imagen (PNG)», para mandar o imprimir, y «BPMN (estándar)», para abrirlo en
  otro programa de procesos. Importar abre el selector de archivos del dispositivo.
- Si el archivo importado trae cosas que acá no se ven, se avisa al terminar de importar, contando cuántas de cada clase: elementos de BPMN que Procesos no maneja, pasos sin lugar en el dibujo y datos del programa de donde viene; y que no se pierden, porque salen igual al exportarlo en BPMN. En el celular, en una línea: «Hay N partes del archivo que no se ven acá; se conservan al exportarlo.»
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
