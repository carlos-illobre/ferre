# Feature Specification: Procesos

**Feature Branch**: `011-procesos`

**Created**: 2026-10-14

**Status**: Aprobada (2026-10-14)

**Maquetas**: Aprobadas (2026-10-14): `maquetas/elegida.html`; `a-`, `b-` y `c-` son las variantes de las que salió

**Input**: «Quiero que agregues a la opción "Más" una pantalla nueva llamada "Procesos". Esta
pantalla la quiero reutilizar en varios otros proyectos, así que tratá de hacerla lo más
independiente posible. En este momento hay una restricción de que solo podemos usar una sola
base de datos para todo Ferrebress; si no tuviésemos esa restricción te pediría un
microservicio separado, pero dada esta restricción usá la misma base de datos. Pero el
código ponelo en una carpeta aparte o separalo de alguna manera que después sea fácil
llevárselo a otro proyecto. Esta pantalla tiene que permitir modelar procesos con BPMN, así
que tiene que tener todas las funcionalidades drag and drop. La idea es usar esa pantalla
para modelar el proceso de venta, el de compra, el de recepción de mercadería y cualquier
otro proceso, para después poder usar esa información para tomar decisiones.»

## Clarifications

### Session 2026-10-14

- Q: ¿Cómo es la pantalla? → A: Carlos eligió entre tres maquetas. En la computadora, el editor clásico: las figuras a la izquierda, el dibujo en el medio y el paso elegido a la derecha, con abajo un panel plegable con los pasos en orden, como tabla. En el celular, dos pestañas: «Pasos», una lista que se ordena arrastrando, y «Diagrama», el dibujo con las figuras en una hoja que sube desde abajo.
- Q: ¿Los paneles de la computadora se pliegan? → A: Los tres: las figuras de la izquierda (quedan solo los íconos), el paso elegido de la derecha y los pasos de abajo. Los tres arrancan cerrados, para que el dibujo tenga todo el lugar.
- Q: ¿Qué datos guarda cada paso? → A: Por ahora, lo que se ve: nombre, tipo, quién lo hace, en qué pantalla de Ferrebress se hace, cómo se hace y con qué sigue. Después se van a ir agregando más.
- Q: ¿Los procesos se conectan con lo que pasa en Ferrebress (medir cuánto tarda una venta real)? → A: Por ahora solo se dibujan. Se van a conectar más adelante.
- Q: ¿Hay borrador y vigente, y se guardan las versiones anteriores? → A: Sí, como en la maqueta.
- Q: ¿Se guarda en un formato estándar? → A: Sí, en BPMN. Al exportar se elige entre una imagen (PNG) y el formato estándar.
- Q: ¿Se puede traer un proceso de otro programa? → A: Sí: al lado de Exportar hay un botón Importar que recibe el formato estándar (BPMN).
- Q: ¿Por qué el código va aparte? → A: Carlos quiere llevar esta pantalla a otros proyectos. Si no hubiera una sola base de datos, sería un servicio aparte; como hay una sola, usa la de Ferrebress, pero sus datos y su código no dependen de los de Ferrebress.

- Q: ¿Qué permisos hay? → A: Dos. «Ver procesos» deja mirarlos. «Dibujar procesos» deja todo lo de ver, más cambiarlos y exportarlos (también crear, marcar vigente, importar y borrar). Sin ninguno de los dos, «Procesos» no aparece en Más.
- Q: ¿Quién los tiene al empezar? → A: El rol Gerente, los dos (propuesta del agente, aceptada).
- Q: ¿Hay botón «Guardar»? → A: No: un proceso se guarda solo a medida que se dibuja, como los demás borradores de la aplicación (propuesta del agente, aceptada).
- Q: ¿Sin conexión? → A: Se pueden mirar los procesos ya abiertos en ese dispositivo, pero no se dibuja: no es trabajo del mostrador y así no hay dos versiones que unir (propuesta del agente, aceptada).
- Q: ¿Borrar pide confirmación? → A: Sí, porque no se puede recuperar (propuesta del agente, aceptada).

## User Scenarios & Testing

### User Story 1 - Dibujar un proceso en la computadora (Priority: P1)

Quien administra el negocio dibuja cómo se hace una tarea (vender en el mostrador, comprar a
un proveedor, recibir mercadería) con la notación BPMN: arrastra figuras desde la izquierda
al dibujo, las une con flechas, las ubica en el carril de quién las hace y completa los datos
de cada paso.

**Why this priority**: Es lo que pidió Carlos: sin dibujar, la pantalla no sirve para nada.

**Independent Test**: Crear «Venta en el mostrador», arrastrar un inicio, tres tareas, una
decisión y dos fines, unirlos, cerrar la pantalla, volver y encontrarlo igual.

**Acceptance Scenarios**:

- **E01** **Given** alguien con «Dibujar procesos» en la computadora, **When** abre Más → Procesos, **Then** ve el último proceso que abrió (o la lista, si nunca abrió uno), con las figuras a la izquierda, el dibujo y los tres paneles plegados.
- **E02** **Given** un proceso abierto, **When** arrastra una figura de la izquierda al dibujo, **Then** el paso aparece donde la soltó, queda elegido y el panel del paso elegido se abre si estaba plegado.
- **E03** **Given** las figuras de la izquierda, **When** se las mira, **Then** están las de BPMN que usa un negocio: inicio, tarea, tarea de una persona, tarea del sistema, decisión, en paralelo, espera, fin, subproceso, carril, documento y nota; cada una con su nombre, o solo con el ícono si el panel está plegado (el nombre aparece al pasar el mouse).
- **E04** **Given** dos pasos en el dibujo, **When** se arrastra desde el borde de uno hasta el otro, **Then** quedan unidos por una flecha; si sale de una decisión, la flecha lleva el nombre de la opción («Sí», «No»).
- **E05** **Given** un paso, **When** se lo arrastra a otro lugar o a otro carril, **Then** se mueve con sus flechas y, si cambió de carril, cambia quién lo hace.
- **E06** **Given** un paso elegido, **When** se le cambia el nombre, el tipo, quién lo hace, la pantalla de Ferrebress donde se hace, cómo se hace o con qué sigue, **Then** el dibujo y la tabla de pasos lo muestran en el acto.
- **E07** **Given** un paso elegido, **When** se aprieta el botón con el tacho o la tecla Supr, **Then** el paso y sus flechas se quitan; Ctrl+Z lo devuelve.
- **E08** **Given** varios cambios hechos, **When** se usa Deshacer (Ctrl+Z) y Rehacer (Ctrl+Y), **Then** se recorren en orden.
- **E09** **Given** un proceso que no entra en la pantalla, **When** se usa la rueda del mouse, los botones − y + o «Ver todo», **Then** el dibujo se aleja, se acerca o se ajusta a la pantalla; arrastrando el fondo, se mueve.
- **E10** **Given** cualquier cambio, **When** se lo hace, **Then** queda guardado sin apretar nada y arriba dice «Guardado».
- **E11** **Given** el panel «Los pasos, en orden», **When** se lo abre (con un clic o Alt+P), **Then** muestra todos los pasos como tabla (paso, tipo, quién lo hace, dónde en Ferrebress, con qué sigue), en el orden del recorrido; cambiar un dato en la tabla lo cambia en el dibujo, y elegir una fila elige el paso.
- **E12** **Given** cualquiera de los tres paneles, **When** se lo pliega o se lo abre, **Then** el dibujo toma o deja ese lugar, y el panel queda así la próxima vez que se abre la pantalla en esa computadora.
- **E13** **Given** solo el teclado, **When** se trabaja en el dibujo, **Then** se puede agregar un paso a continuación del elegido, pasar de un paso a otro con las flechas, editarlo, unirlo y quitarlo sin usar el mouse.
- **E14** **Given** un dibujo con un error de forma (un paso sin flecha que llegue, una decisión con una sola salida, un proceso sin inicio o sin fin), **When** se lo mira, **Then** el paso lleva una marca y al pasar el mouse dice qué le falta; no impide guardar.
- **E15** **Given** un nombre de paso largo, **When** se lo muestra en el dibujo, **Then** se parte en renglones dentro de la figura y no se sale de ella.

### User Story 2 - Los procesos del negocio (Priority: P1)

Quien dibuja procesos los ve todos en una lista, crea uno nuevo, le cambia el nombre, pasa de
uno a otro y borra el que ya no sirve.

**Why this priority**: Sin la lista hay un solo proceso; Carlos quiere uno por cada trabajo.

**Independent Test**: Crear «Compra a un proveedor», cambiarle el nombre, abrir «Venta en el
mostrador» desde la lista, volver, borrar el primero.

**Acceptance Scenarios**:

- **E16** **Given** ningún proceso cargado, **When** se abre Procesos, **Then** la pantalla dice qué es un proceso y ofrece «Proceso nuevo» (con «Dibujar procesos») o explica que todavía no hay ninguno (con «Ver procesos» solo).
- **E17** **Given** «Proceso nuevo», **When** se escribe un nombre, **Then** se crea con un inicio ya puesto, en borrador, y se abre.
- **E18** **Given** un nombre vacío o igual al de otro proceso, **When** se lo quiere guardar, **Then** no se guarda y se dice por qué.
- **E19** **Given** el selector de procesos, **When** se lo abre, **Then** lista todos, con su estado (borrador o vigente) y cuántos pasos tiene, con un buscador; elegir uno lo abre.
- **E20** **Given** un proceso, **When** se lo borra, **Then** la aplicación pregunta antes, porque no se puede recuperar; al confirmar, desaparece con todas sus versiones.

### User Story 3 - Borrador, vigente y versiones (Priority: P2)

El proceso que vale es el vigente. Mientras se lo cambia, el cambio es un borrador; cuando
está listo, se lo marca vigente y la versión anterior queda guardada.

**Why this priority**: Cuida que quien mira un proceso vea el que vale, no uno a medio dibujar.

**Independent Test**: Marcar vigente un proceso, cambiarlo, ver que dice «Borrador», marcarlo
vigente otra vez y encontrar la versión anterior en el historial.

**Acceptance Scenarios**:

- **E21** **Given** un proceso vigente, **When** alguien con «Dibujar procesos» le cambia algo, **Then** el cambio queda en un borrador; quien tiene solo «Ver procesos» sigue viendo el vigente.
- **E22** **Given** un borrador, **When** se lo marca vigente, **Then** pasa a ser el que vale, la versión anterior queda en el historial con su fecha y quién la hizo, y queda registrado en «Quién hizo qué».
- **E23** **Given** el historial de un proceso, **When** se elige una versión anterior, **Then** se la ve sin poder cambiarla, y se la puede copiar al borrador para volver a ella.
- **E24** **Given** un borrador, **When** se lo descarta, **Then** el proceso vuelve a ser el vigente.

### User Story 4 - Trabajar en el celular (Priority: P2)

En el celular, el proceso se arma como una lista de pasos que se ordenan arrastrándolos, o se
mira y se cambia en el dibujo.

**Why this priority**: Toda pantalla se usa completa en el celular y en la computadora
(constitución, principio III); en el celular, una lista se maneja mejor con una mano.

**Independent Test**: En el celular, agregar un paso entre «Cobrar» y «Registrar la venta»,
pasarlo arriba arrastrándolo y verlo en el mismo lugar en la pestaña «Diagrama» y en la
computadora.

**Acceptance Scenarios**:

- **E25** **Given** un proceso abierto en el celular, **When** se lo mira, **Then** hay dos pestañas: «Pasos», elegida al abrir, y «Diagrama».
- **E26** **Given** «Pasos», **When** se lo mira, **Then** cada paso es una tarjeta con su ícono, su nombre y quién lo hace, en el orden del recorrido; después de una decisión, cada opción es una rama con su nombre.
- **E27** **Given** una tarjeta, **When** se la mantiene apretada y se la arrastra, **Then** se mueve a otro lugar del recorrido o a otra rama, y el dibujo se rearma solo.
- **E28** **Given** «Pasos», **When** se toca «Agregar un paso acá» entre dos tarjetas, **Then** se elige el tipo y el nombre y el paso queda en ese lugar.
- **E29** **Given** una tarjeta, **When** se la toca, **Then** se abre una hoja con sus datos para cambiarlos o quitar el paso.
- **E30** **Given** «Diagrama», **When** se lo mira, **Then** se ve el dibujo, que se mueve con un dedo y se acerca con dos, y abajo la hoja «Agregar un paso» con las figuras, que se arrastran al dibujo.
- **E31** **Given** el celular, **When** se lo mira en cualquiera de las dos pestañas, **Then** ninguna parte de la pantalla se desplaza hacia el costado salvo el dibujo mismo.

### User Story 5 - Exportar e importar (Priority: P3)

Un proceso se baja como imagen para mandarlo o imprimirlo, o en formato BPMN estándar para
abrirlo en otro programa. Un BPMN hecho en otro programa se puede traer.

**Why this priority**: Es para compartir; el dibujo sirve sin esto.

**Independent Test**: Exportar «Venta en el mostrador» como PNG y como BPMN, importar ese
BPMN como un proceso nuevo y encontrarlo igual.

**Acceptance Scenarios**:

- **E32** **Given** un proceso abierto por alguien con «Dibujar procesos», **When** se elige Exportar, **Then** se ofrece «Imagen (PNG)», para mandar o imprimir, y «BPMN (estándar)», para abrirlo en otro programa de procesos; en el celular, desde el menú «⋯».
- **E33** **Given** «Imagen (PNG)», **When** se lo elige, **Then** se baja una imagen con el proceso entero, su nombre, su estado y la fecha, legible al imprimirla en una hoja A4.
- **E34** **Given** «BPMN (estándar)», **When** se lo elige, **Then** se baja un archivo BPMN 2.0 que otro programa de BPMN abre con los mismos pasos, flechas, carriles y posiciones.
- **E35** **Given** un archivo BPMN 2.0 de otro programa, **When** se lo trae con el botón Importar, al lado de Exportar (en el celular, desde el menú «⋯»), **Then** queda como un proceso nuevo en borrador; lo que Procesos no sabe mostrar se conserva al volver a exportarlo y se avisa que no se ve.
- **E36** **Given** un archivo que no es BPMN, está dañado o pesa más de 5 MB, **When** se lo quiere importar, **Then** no se importa y se dice por qué.

### User Story 6 - Quién puede qué (Priority: P2)

Hay dos permisos nuevos: «Ver procesos», para mirar, y «Dibujar procesos», que deja todo lo
de ver más cambiar y exportar. Sin ninguno de los dos, la pantalla no existe para esa
persona.

**Acceptance Scenarios**:

- **E37** **Given** un usuario sin «Ver procesos» ni «Dibujar procesos», **When** abre Más en el celular o en la computadora, **Then** «Procesos» no aparece; si entra a su dirección, ve que no tiene permiso y cuáles hacen falta.
- **E38** **Given** un usuario con «Ver procesos» y sin «Dibujar procesos», **When** abre un proceso, **Then** ve el vigente, sus pasos (en la tabla o en «Pasos») y su historial, y puede acercar, alejar y mover la vista; no ve las figuras, Importar, Exportar, Proceso nuevo, los botones de cambiar ni los borradores, y los pasos no se pueden mover ni editar.
- **E39** **Given** un usuario sin «Dibujar procesos», **When** pide al servidor crear, cambiar, marcar vigente, importar o borrar un proceso, o ver un borrador, **Then** el servidor lo rechaza diciendo qué permiso hace falta; sin ninguno de los dos, también rechaza leerlos. Exportar no se le ofrece.
- **E40** **Given** el sistema recién actualizado, **When** se miran los roles, **Then** «Ver procesos» y «Dibujar procesos» figuran en la parte «Negocio» y los tiene el rol Gerente.
- **E45** **Given** un usuario con «Dibujar procesos» y sin «Ver procesos», **When** abre Más, **Then** ve «Procesos» y puede todo: dibujar incluye ver.

### Edge Cases

- **E41** **Given** dos personas cambiando el mismo borrador a la vez, **When** las dos guardan, **Then** la segunda ve que el borrador cambió, se le muestra el de la otra persona y no se pierde lo de ninguna sin avisar.
- **E42** **Given** sin conexión, **When** se abre un proceso que ya se había abierto en ese dispositivo, **Then** se lo ve con un aviso de que sin conexión no se puede cambiar; uno que nunca se abrió dice que hace falta conexión.
- **E43** **Given** un proceso de 200 pasos, **When** se lo abre y se lo mueve, **Then** el dibujo responde sin trabarse en la notebook del local.
- **E44** **Given** un nombre de paso o una explicación con texto que parece código (por ejemplo, `<script>`), **When** se lo muestra en el dibujo, en la tabla o en la imagen, **Then** se ve como texto y no se ejecuta.

## Requirements

### Functional Requirements

- **RF-90**: Pantalla «Procesos» en Más, con los procesos del negocio: crear, cambiar el nombre, buscar, abrir y borrar.
- **RF-91**: Dibujar un proceso con BPMN arrastrando y soltando: figuras, flechas, carriles, deshacer, acercar y alejar. Cada paso guarda nombre, tipo, quién lo hace, en qué pantalla de Ferrebress se hace, cómo se hace y con qué sigue. En la computadora, los pasos también se ven y se cambian como tabla, en un panel plegable.
- **RF-92**: En el celular, el proceso se arma como lista de pasos que se ordenan arrastrando, o en el dibujo.
- **RF-93**: Cada proceso tiene un vigente y un borrador; al marcar vigente el borrador, la versión anterior queda en el historial.
- **RF-94**: Exportar un proceso como imagen PNG o en BPMN 2.0 estándar, e importar un BPMN 2.0 de otro programa.
- **RF-95**: Dos permisos: «Ver procesos» deja mirarlos; «Dibujar procesos» deja además cambiarlos, importarlos y exportarlos. Sin ninguno, «Procesos» no aparece en Más.

### Non-Functional Requirements

- **RNF-61**: Procesos se puede llevar a otro proyecto sin el resto de Ferrebress: su regla, sus datos y sus pantallas están aparte y no usan nada propio de Ferrebress. Lo que necesita de la aplicación que lo usa (la sesión, quién tiene cada permiso, la lista de pantallas que se nombran en un paso, la paleta) se lo da esa aplicación. Usa la misma base de datos que Ferrebress, con sus propias tablas, sin unirlas a las de Ferrebress, para poder pasarlas a una base propia moviéndolas tal cual. Cada proceso se guarda en BPMN 2.0, que es estándar.

### Key Entities

- **Proceso**: un trabajo del negocio con nombre propio («Venta en el mostrador»). Tiene a lo sumo un vigente, a lo sumo un borrador y su historial.
- **Versión**: el dibujo completo de un proceso en un momento, en BPMN 2.0, con quién la hizo y cuándo. Es borrador, vigente o anterior.
- **Paso**: una figura del dibujo. Tiene tipo (los de E03), nombre y, según el tipo, quién lo hace (su carril), en qué pantalla se hace, cómo se hace y con qué sigue.
- **Carril**: quién hace los pasos que están en él (Cliente, Vendedor, Sistema, un proveedor).

## Success Criteria

- **SC-01**: Carlos dibuja «Venta en el mostrador» completo (unos 10 pasos, dos carriles y una decisión) en menos de 15 minutos la primera vez, sin manual.
- **SC-02**: Un BPMN exportado se abre en otro programa de BPMN con los mismos pasos y flechas.
- **SC-03**: Llevar Procesos a otro proyecto no requiere cambiar su regla ni sus pantallas: solo darle la sesión, los permisos, la lista de pantallas y la paleta.

## Out of Scope (por ahora)

- Conectar los pasos con lo que pasa de verdad en Ferrebress (medir tiempos o contar ventas reales por paso): más adelante, a pedido de Carlos.
- Más datos por paso (tiempo, costo, frecuencia, problemas): se agregan después.
- Ejecutar procesos (que el sistema avise a quién le toca el paso siguiente).
- Comentarios sobre un proceso.
