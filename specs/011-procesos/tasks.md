# Tasks: Procesos

Funcionalidad nueva: el módulo Procesos, aparte de Ferrebress para poder llevarlo a otro
proyecto (ADR-019). Especificación y maqueta aprobadas por Carlos el 2026-10-14.

## Tareas

- [x] T001 El módulo: dos paquetes en `microservices/procesos/` (servidor y web), en el workspace, con su control de capas y su README
- [x] T002 El servicio: esquema y migraciones, datos, regla, rutas y validación de BPMN, con sus pruebas (depende de T001)
- [x] T003 El contenedor «procesos»: imagen, compose y CI (depende de T002)
- [x] T004 Ferrebress lo conecta: permisos `procesos.ver` y `procesos.dibujar` con el rol Gerente, la ruta de paso con el registro de eventos y «Procesos» en Más (depende de T002)
- [x] T005 El modelo del front, sin pantallas: el recorrido para «Pasos» y la tabla, los errores de forma y los cambios de la lista (depende de T001)
- [x] T006 La computadora: editor con `bpmn-js`, los tres paneles, el paso elegido, la tabla, los procesos, borrador y vigente, historial, importar y exportar (depende de T004, T005)
- [x] T007 El celular: «Pasos» y «Diagrama», con la hoja de figuras y el menú «⋯» (depende de T006)
- [x] T008 Sin conexión y dos personas a la vez: mirar lo ya abierto y no perder un borrador ajeno (depende de T006)
- [x] T009 Pruebas de punta a punta de dibujar, en el celular y en la computadora (depende de T007)
- [x] T010 Una prueba por escenario (E01 a E45), anotadas en `proyecto/estado.yml` (depende de T009)
- [x] T011 Comparar con la maqueta aprobada con capturas de computadora y de celular, y mostrarle a Carlos las diferencias (depende de T007)
- [x] T012 La revisión independiente: `revision.md`, con lo que encontró y qué se hizo con cada punto (depende de T010, T011)
- [x] T014 [ajuste] Con el panel de figuras abierto, cada figura va en un renglón con el ícono a la izquierda y el nombre a la derecha, sin barra de desplazamiento; los menús tapan el dibujo; el logo de bpmn.io sin atajo (pedidos de Carlos del 2026-10-14)
- [x] T015 [interfaz] En el celular, primero la pestaña «Diagrama», que es la que se abre, y después «Pasos»; las doce figuras del mismo tamaño y con nombres cortos (pedidos de Carlos del 2026-10-14)
- [x] T016 [interfaz] En el celular, «Agregar un paso» se pliega y se despliega; el logo de bpmn.io flota abajo a la derecha, encima de la hoja, y la acompaña al abrirse y cerrarse (pedido de Carlos del 2026-10-14)
- [x] T017 [ajuste] En el celular, el logo de bpmn.io flota abajo a la derecha en vez de a la izquierda (pedido de Carlos del 2026-10-14)
- [x] T018 [ajuste] En el celular, la explicación de «Agregar un paso» en un solo renglón (pedido de Carlos del 2026-10-14)
- [x] T019 [arreglo] En el celular, el botón de volver cierra el menú «⋯» y las hojas y ventanas de Procesos en vez de volver a Más (regla de 001, ux.md, «El botón de volver del celular»)
- [x] T020 [ajuste] En el celular, la explicación de «Agregar un paso» dice qué se arrastra (pedido de Carlos del 2026-10-14)
- [x] T021 [interfaz] En el celular, el botón de volver desde un proceso vuelve a la lista de procesos, no a Más; la explicación de «Agregar un paso» queda «Arrastrá un paso al dibujo.» (pedidos de Carlos del 2026-10-14)
- [x] T022 [ajuste] Los textos del celular, mínimos; los que explican quedan en la computadora (pedido de Carlos del 2026-10-14)
- [x] T023 [arreglo] En el celular, mantener apretado un paso del diagrama y arrastrarlo lo mueve (011-E05 y E30 con el dedo; avisó Carlos el 2026-10-14)
- [x] T024 [ajuste] En el celular, la hoja del paso sigue el estilo de los formularios de la aplicación: tarjeta blanca con un renglón por dato, botones anchos y una cruz para cerrarla; los botoncitos del paso elegido quedan por debajo de los botones y las hojas (pedido de Carlos del 2026-10-14)
- [x] T025 [ajuste] El paso elegido se marca con el naranja de la aplicación, como en la maqueta; elegir un paso en la computadora abre su panel si estaba plegado (T011; decisión de Carlos del 2026-10-14)
- [x] T026 [regla] E01: quien nunca abrió un proceso en ese dispositivo ve el primero de la lista (revisión; decisión de Carlos del 2026-10-14)
- [x] T027 [arreglo] E35: al importar, avisar lo que Procesos no muestra y comprobar que sale igual al exportar (revisión)
- [x] T028 [arreglo] Seguridad, «Qué queda registrado»: cambiar el borrador se anota en «Quién hizo qué», y el borrado lleva el nombre del proceso (revisión)
- [x] T029 [arreglo] Si se corta la conexión con un proceso abierto, se deja de dibujar hasta que vuelva, sin perder el último cambio (aclaración «Sin conexión», E42; revisión)
- [x] T030 [ajuste] En el celular, «Agregar un paso después» de la hoja del paso va con el color del botón principal (pedido de Carlos del 2026-10-14)
- [x] T031 [arreglo] Tocar un proceso mientras se abre solo el último (E01) muestra el que se tocó: la respuesta que llega tarde no lo pisa ni vuelve a «Diagrama» (la prueba del botón de volver del celular fallaba por esto con la suite completa)
- [x] T032 [arreglo] E43 mide en el navegador si el dibujo se traba al moverlo, no el tiempo que tarda la prueba en mandar el mouse (fallaba con la máquina cargada: 1010 ms contra 1000)
- [x] T033 [arreglo] La prueba del botón de volver del celular espera a que el menú «⋯» anote su paso en el historial antes de volver (seguía fallando con la suite completa: volvía a la lista)
- [x] T013 Actualizar `proyecto/estado.yml`, escribir el `resumen.md` de la capacidad y marcar T115 del plan (depende de T012)
