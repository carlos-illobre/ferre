# Tasks: Usuarios y acceso

El registro del trabajo hecho sobre esta capacidad: arreglos, ajustes, cambios de interfaz
y cambios de regla, uno debajo del otro. Cada tarea se anota **antes de empezarla** y se
nombra `007-TXXX`. La forma y los tamaños están en la constitución («El registro de
tareas»). Las funcionalidades nuevas tienen su propia carpeta.

    - [ ] T001 [ajuste] Qué se pidió, en palabras de Carlos

## Tareas

- [x] T001 [ajuste] «Desvincular» va dentro de Usuarios y sesiones, no suelto en la lista de Más
- [x] T002 [ajuste] En lugar de «Separar» y «Juntar», los botones dicen «Desconectar» y «Reconectar»
- [x] T003 [ajuste] En el celular, el estado del vínculo lo dice el color del botón (verde o gris) y no una leyenda arriba; en ese lugar va «Sincronizado hace…», siempre a la vista, sin dejar espacio de más sobre el título
- [x] T004 [ajuste] El botón Desconectar/Reconectar lleva borde, para que resalte, y el ícono va a la izquierda con la leyenda a la derecha
- [x] T005 [ajuste] En la computadora, el botón Desconectar/Reconectar lleva su ícono, como en el celular
- [x] T006 [ajuste] En la computadora, «Autorizar a alguien» aprovecha el ancho: nombre, correo y el botón en una línea, y los roles debajo, repartidos en columnas
- [x] T007 [arreglo] Vinculados, ir a Depósito y enseguida a Más desde el celular hace que el celular vuelva solo a Depósito un segundo después
- [x] T008 [interfaz] En Más, Usuarios y sesiones, Roles y Quién hizo qué se juntan en una sola opción, «Usuarios», con cuatro pestañas como Depósito: Usuarios, Sesiones, Roles y Quién hizo qué
- [x] T009 [interfaz] Al entrar en la computadora con el celular, el celular ya no muestra la pantalla «Listo: la computadora ya entró»: sigue a su pantalla de siempre con un aviso breve; la pantalla queda solo para cuando la computadora no entró (pedido de Carlos del 2026-10-15)
- [x] T010 [interfaz] La entrada de la computadora copia la imagen de referencia de Carlos: verde con la marca, foto con un celular que muestra una venta, y la tarjeta sobre fondo claro (decisión 93); el celular no cambia
- [x] T011 [interfaz] La entrada de la computadora se parece más a la referencia de Carlos y su kit de capas: un celular con espesor y marco metálico, el botón de Google a todo el ancho de la tarjeta, los tres puntos cortados como en la referencia y el verde con su degradé (decisión 93)
- [x] T012 [interfaz] La entrada de la computadora se arma con las capas que pasó Carlos: sus formas del fondo, la foto del local y el celular, con la pantalla real de la venta puesta en perspectiva (decisión 93)
- [x] T013 [interfaz] El celular de la entrada de la computadora es el que pasó Carlos con la venta ya puesta, sin su fondo, que se ve más nítido (decisión 93)
- [x] T014 [ajuste] En la entrada de la computadora, la separación entre el logotipo, el antetítulo, el título, la bajada y las tres cosas que hace, y el tamaño de sus íconos, siguen la imagen de referencia de Carlos (decisión 93)
- [x] T015 [interfaz] En monitores más anchos que 16:9, la entrada de la computadora no se estira: queda centrada y a los costados siguen el verde y el fondo claro (Carlos eligió la opción 1 el 2026-10-16)
- [x] T016 [ajuste] El verde de la entrada de la computadora es la imagen que pasó Carlos el 2026-10-16, sin su logo: tres tonos en curva en las esquinas y el centro más oscuro
- [x] T017 [interfaz] En la entrada de la computadora, el botón «Ver tutorial» (naranja, ancho, con ícono) va debajo de las tres cosas que hace, en lugar de la frase manuscrita; por ahora no lleva a ningún lado (Carlos, 2026-10-16)
- [x] T018 [ajuste] Pruebas manuales de las tres formas de entrar (Google, huella y el código de la computadora), en docs/pruebas-manuales/ (pedido de Carlos del 2026-10-17)
- [x] T019 [interfaz] Descartada por Carlos el 2026-10-16: probar el botón de Google del celular sobre un fondo azul del tamaño de los otros. Con el fondo, el texto del botón quedaba chico en proporción; queda como estaba
- [x] T020 [arreglo] Al entrar a la computadora con el código QR del celular, la computadora quedaba en «Conectando con el celular…» y no se espejaba hasta recargar: el espejo salía antes que la sesión, el servidor lo rechazaba y no se volvía a intentar
- [x] T021 [interfaz] Al volver de Google con la cuenta confirmada, en el celular se ve «Conectando tu cuenta de Google» con dos pasos (Google verificó, abriendo tu sesión), el camino Google → Ferrebress → el local y la onda de la entrada, en lugar de la entrada, hasta que la sesión queda abierta (maqueta `maquetas/celular-conectando-con-google.png`, aprobada por Carlos el 2026-10-17)
- [x] T022 [arreglo] Pruebas unitarias para los casos de entrar que no tenían prueba automática, con Google, la huella y la cámara simulados (pedido de Carlos del 2026-10-17)
- [x] T023 [arreglo] Al volver de Google se veía la entrada un instante antes de «Conectando tu cuenta de Google»: Google avisa la cuenta un momento después de cerrar su ventana; ahora la pantalla sale apenas se vuelve a la página
- [x] T024 [ajuste] En la entrada de la computadora, el celular sube hasta quedar centrado en el alto: el mismo espacio arriba que abajo
- [x] T025 [ajuste] En la entrada de la computadora, el celular baja a mitad de camino entre como estaba y centrado: no casi toca el borde de abajo y sigue apoyado en la mesa
- [x] T026 [ajuste] En la entrada de la computadora, el celular vuelve abajo, como estaba antes de T024: así parece apoyado en la mesa
- [x] T027 [interfaz] En la entrada de la computadora, debajo de la tarjeta, tres sellos («Seguro y confiable», «Siempre actualizado», «Desde cualquier dispositivo») y un escudo en el aviso de quién puede entrar. Salió de la referencia de Carlos del 2026-10-17 (`maquetas/entrar-compu-referencia-detalles.webp`); de las variantes A, B y C (`maquetas/entrar-compu-detalles-*.png`) eligió solo esto, sin nada más de la referencia (maqueta `maquetas/entrar-compu-sellos.png`, aprobada por Carlos el 2026-10-17)
- [x] T028 [interfaz] Descartada por Carlos el 2026-10-17: llenar el verde libre de arriba de la entrada de la computadora, entre el logotipo y la foto. Vio tres maquetas (el paso a paso, un aviso de venta cobrada y una llave en línea: `maquetas/entrar-compu-verde-*.png`) y prefirió dejarlo vacío
- [x] T029 [arreglo] Después de un intento con Google que el servidor rechaza (correo sin autorizar), el botón de Google quedaba más claro: se vuelve a dibujar como lo dibuja Google
- [x] T030 [arreglo] En la computadora, después de un intento con Google que el servidor rechaza, el botón de Google también quedaba más claro: se lo vuelve a dibujar, como en el celular (T029)
- [x] T031 [regla] Al desactivar a un usuario o cerrarle una sesión a distancia, su dispositivo con la aplicación abierta vuelve solo a la entrada en menos de 30 segundos, sin esperar a su próximo pedido; y lo que dejó sin mandar no sale a nombre de otra persona que entre después en el dispositivo (decisión 97, aprobada por Carlos el 2026-10-17)
- [x] T032 [interfaz] En el celular, Más → Usuarios con otro aspecto, sobre el modelo que pasó Carlos: la cabecera «Usuarios autorizados» con cuántos son, cada persona en su tarjeta con sus iniciales, su estado, sus roles con ícono y «Cambiar roles», y «Autorizar otro correo de Google» arriba, debajo de la cabecera (maqueta `maquetas/celular-usuarios.png`, aprobada por Carlos el 2026-10-17; el modelo, `maquetas/celular-usuarios-referencia-de-carlos.png`)
- [x] T033 [interfaz] Más → Usuarios, en el celular y en la computadora: buscar por correo o nombre con sugerencias mientras se escribe, y una lista desplegable «Rol» para ver solo quienes lo tienen, con cuántos quedan. En el celular va debajo de «Autorizar otro correo de Google»; en la computadora, arriba de la tabla (maquetas `maquetas/celular-usuarios-filtro.png` y `maquetas/compu-usuarios-filtro.png`, aprobadas por Carlos el 2026-10-17). En el celular se saca la cabecera «Usuarios autorizados» con cuántos son, que ocupaba lugar
- [x] T034 [ajuste] En el celular, Más → Usuarios: «Cambiar roles», «Desactivar»/«Reactivar» y las pastillas de los roles se confundían con el fondo; «Cambiar roles» va en verde lleno con letra blanca, «Desactivar»/«Reactivar» en blanco con borde de color y las pastillas en blanco con borde marcado (pedido de Carlos del 2026-10-17, con captura)
- [x] T035 [ajuste] La Historia 5 de `ux.md` todavía decía que el dispositivo al que le cierran la sesión sale «en su próxima operación»: se corrige a lo de la decisión 97 (menos de 30 segundos)
- [x] T036 [regla] Lo que cada persona decide para sí (sus celulares con huella y su vínculo entre celular y computadora) pasa de Más → Usuarios → Sesiones a Más → Configuración; Sesiones queda para «Administrar sesiones», sin la sesión del propio dispositivo ni los celulares propios (decisión 99, aprobada por Carlos el 2026-10-17)
- [x] T037 [regla] Se saca la pestaña Sesiones: las sesiones y los celulares con huella de cada persona van en su tarjeta de Usuarios, los días del vínculo al final de Usuarios, y «Administrar sesiones» se une a «Administrar usuarios» (decisión 100, aprobada por Carlos el 2026-10-17)
