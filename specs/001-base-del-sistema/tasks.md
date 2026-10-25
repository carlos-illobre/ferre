# Tasks: Base del sistema

El registro del trabajo hecho sobre esta capacidad: arreglos, ajustes, cambios de interfaz
y cambios de regla, uno debajo del otro. Cada tarea se anota **antes de empezarla** y se
nombra `001-TXXX`. La forma y los tamaños están en la constitución («El registro de
tareas»). Las funcionalidades nuevas tienen su propia carpeta.

    - [ ] T001 [ajuste] Qué se pidió, en palabras de Carlos

## Tareas

- [x] T001 [ajuste] En la computadora, con las flechas solo se recorre el menú, las pestañas y los ítems de las listas; a los campos y botones se va con Tab
- [x] T002 [ajuste] En el celular, la navegación se anima como en una aplicación de iPhone
- [x] T003 [ajuste] En la computadora, las flechas solo seleccionan la pestaña; se abre con Enter, igual que el menú de la izquierda
- [x] T004 [regla] En la computadora, todos los botones tienen atajo: con Alt apretado cada uno muestra una letra, y esa letra lo acciona
- [x] T005 [ajuste] En la computadora, la flecha para abajo saltea la caja de búsqueda y va directo a los ítems de la lista
- [x] T006 [ajuste] En la computadora, en Más las flechas recorren las opciones como si fueran pestañas
- [x] T007 [regla] En la computadora, las flechas tienen su propia marca (menú, pestañas y filas enteras) y el cursor de escritura queda en la caja de texto; con la lista vacía la marca se queda en las pestañas; igual en todas las pantallas
- [x] T008 [arreglo] En el celular las animaciones al navegar no aparecen y cambiar de pantalla tarda casi tres segundos
- [x] T009 [ajuste] Teclado de la computadora: Enter en el menú deja la marca en la primera pestaña; un clic en una pestaña deja la marca en ella; solo se marcan filas que hacen algo con Enter; en Catálogo ↑ desde la primera fila vuelve a las pestañas; en Más se ve el borde del foco
- [x] T010 [arreglo] En el celular, el botón de volver de Android no cierra la foto de un producto abierta en grande
- [x] T011 [ajuste] Borrar las versiones viejas de la interfaz (1 a 4), sus mockups y toda referencia a ellas: la interfaz actual es la definitiva
- [x] T012 [arreglo] En la computadora, al abrir una parte con Enter la marca a veces no queda en la pestaña; y en Catálogo, Enter apretado enseguida después de escribir abre un producto que no es el buscado
- [x] T013 [ajuste] HTML semántico en el celular: los listados son listas (`ul`/`li`) y los títulos de cada sección son encabezados, sin cambiar cómo se ven
- [x] T014 [ajuste] Las sesiones en la nube entran a Docker Hub al arrancar, con DOCKERHUB_USUARIO y DOCKERHUB_TOKEN del entorno, para que las pruebas de punta a punta no choquen con el límite de descargas sin cuenta
- [x] T015 [ajuste] En la computadora, en Más ↓ va a la opción de abajo y ↑ a la de arriba, como en la grilla que se ve; → y ← siguen a la siguiente y a la anterior (pedido de Carlos del 2026-10-15)
- [x] T016 [interfaz] En la computadora, la acción de la pantalla va a la derecha de las pestañas, en la misma fila: Vender, Anular, Estanterías, Roles y Pedidos; Duplicados no (pedido de Carlos del 2026-10-15)
- [x] T017 [ajuste] «Rol nuevo» lleva su ícono, el «+» de «Sector nuevo» (pedido de Carlos del 2026-10-15)
- [x] T018 [ajuste] «Pedido nuevo» lleva el ícono «+» en vez del «+» escrito en el texto (pedido de Carlos del 2026-10-15)
- [x] T019 [arreglo] En Roles de la computadora, «Rol nuevo» queda alineado con el borde derecho del contenido, que es angosto, y no con el de la ventana (avisó Carlos el 2026-10-15)
- [x] T020 [ajuste] Sin «Volver a Más» en ninguna pantalla, ni en el celular ni en la computadora (decisión 90)
- [x] T021 [ajuste] «Volver a Más» vuelve al celular; solo la computadora queda sin él (Carlos lo aclaró el 2026-10-15, decisión 90)
- [x] T022 [regla] El timer que busca versión nueva corre solo con la app a la vista; el análisis de cómo enterarse queda en el ADR-020 (decisión 91)
- [x] T023 [ajuste] Las pruebas de punta a punta no graban video: los clips del manual se arman aparte (ADR-004, pedido de Carlos del 2026-10-16)
- [x] T024 [arreglo] La búsqueda que aparece tarde (Inventario, cuando llega el stock) no le saca al menú ni a las pestañas el foco que la persona puso con las flechas (decisión 82; la prueba «sin mouse» de vender falló 1 de 5 el 2026-10-17)
- [x] T025 [ajuste] En el celular, con una hoja abierta (la ficha de un producto, los filtros, cualquier otra) la pantalla de atrás no se desplaza (pedido de Carlos del 2026-10-17)
- [x] T026 [regla] Colores por significado: un color que tiene sentido para un elemento puntual (los medios de pago) se usa, siempre el mismo, en todas las pantallas donde aparece ese elemento; ninguna pantalla entera con colores propios (Carlos, 2026-10-17)
- [x] T027 [arreglo] Vender y Catálogo, al terminar de bajar el catálogo, no le sacan al menú ni a las pestañas el foco que la persona puso con las flechas (decisión 82; lo mismo que T024)
- [x] T028 [arreglo] La prueba del celular «C5 la cámara del celular lee el código…» comprueba que el escáner se abrió sin depender de verlo a tiempo: con la máquina cargada lee el código y se cierra antes de que la prueba mire (proyecto T128)
- [x] T029 [arreglo] Las pruebas de punta a punta cierran las ventanas que abren además de la suya (otra computadora, otro celular): seguían abiertas y trabajando hasta el final de la tanda y la hacían más lenta (proyecto T129)
- [x] T030 [ajuste] El entorno de las sesiones en la nube pasa a tener acceso completo a internet (Carlos, 2026-10-19), anotado en la documentación de operación
- [x] T031 [agente] Propuestas de diseño de todas las pantallas, en computadora y celular, hechas por el director de arte y guardadas en `docs/propuestas-de-diseno/` para que Carlos las revise; lo que rechaza se borra (Carlos, 2026-10-19)
- [x] T032 [ajuste] El prompt del director de arte se guarda como la skill `/director-de-arte`, que corre solo cuando Carlos la pide (Carlos, 2026-10-19)
- [x] T033 [ajuste] Las maquetas del director de arte se pueden navegar en el ambiente de pruebas, en /v2, /v3 y /v4, sin que la aplicación instalada las guarde (decisión 113)
- [x] T034 [regla] El lenguaje «Mostrador» es el oficial: lo toma por defecto toda pantalla nueva o rediseñada, salvo que el director de arte proponga algo superador y Carlos lo elija (decisión 115)
- [x] T035 [regla] El marco y el cartel del ambiente de prueba quedan como están con cualquier rediseño y solo en pruebas (decisión 116)
- [x] T036 [cambio de regla] La navegación con el teclado se mantiene en todas las versiones: un gesto nuevo se suma y no la reemplaza (decisión 121)
- [x] T037 [interfaz] Computadora: el menú de la izquierda de «Mostrador», con el logotipo de la v1 y un botón (y Ctrl+B) que lo achica a íconos, en todas las pantallas (decisión 122; maqueta `maquetas/compu-menu-mostrador.png`, aprobada por Carlos el 2026-10-19)
- [x] T038 [arreglo] Computadora: el menú de la izquierda y las pestañas como la v2 de la maqueta aprobada (`maquetas/compu-menu-mostrador.png`): sin los Alt+número a la vista (salen con Alt), sin el texto de ayuda, el celular en espejo en recuadro verde, la conexión en pastilla, el usuario con sus iniciales y su rol, y «Salir» de la v1; las pestañas, texto subrayado
- [x] T039 [arreglo] Las flechas nunca sacan el cursor de la caja de texto: ↑ desde la primera fila con el cursor en la búsqueda solo saca la marca (decisiones 82 y 130)
- [x] T040 [regla] Monitor externo: una tarea programada en GitHub que una vez por día mira la salud de los dos ambientes, consulta sus bases y avisa si alguna pasa los 350 MB; el aviso es el correo de GitHub (RNF-12, historia 6) (T091)
- [x] T041 [arreglo] Dos focos: con el cursor en una caja de texto, las flechas mueven la marca del teclado por el menú y las pestañas sin sacar el cursor (decisión 137)
- [x] T042 [ajuste] Con el menú lateral plegado, el puntito de conexión queda centrado
- [x] T043 [ajuste] Los neutros de la paleta compartida, los grises cálidos de «Mostrador» (sin fondos verdosos); las hojas del celular blancas con «×»; el día elegido del calendario centrado (decisión 143)
- [x] T044 [ajuste] Celular: el botón del vínculo con la computadora nunca es gris: verde en espejo y blanco con el borde verde desconectado (decisión 143)
- [x] T045 [ajuste] Cuenta corriente en rojo en toda la aplicación, con su fondo suave (decisión 144)
- [x] T046 [regla] Toda cantidad va con su unidad, en el celular y en la computadora (decisión 144)
- [x] T047 [arreglo] La letra de los importes del celular («Archivo Narrow») no cargaba: su hoja la buscaba en una carpeta que no existe (desde el 2026-10-17)
- [x] T048 [ajuste] Los logs de cada contenedor no pasan de 10 MB: dos archivos de 5 MB que rotan (decisión 161)
- [ ] T049 [ajuste] Un usuario de Linux por ambiente en la máquina, cada uno con su Docker: la instalación es por ambiente y la guía lo explica (decisión 161)
