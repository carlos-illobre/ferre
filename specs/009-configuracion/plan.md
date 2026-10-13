# Plan: Configuración

## Qué se construye

Una pantalla «Configuración» dentro de Más, con una lista de preferencias. La primera,
«Animaciones», es una llave de sí o no.

## Cómo

- **Dónde se guarda:** en el dispositivo, junto a lo demás que el navegador guarda de la
  aplicación, con una clave que no se borra al salir de la sesión. No hay nada nuevo en el
  servidor ni en la base de datos.
- **Cómo se aplica:** la navegación animada ya consulta si puede animar antes de cada cambio de
  pantalla (decisión 78); pasa a consultar también esta preferencia. Para las hojas y demás
  movimientos, la raíz de la página lleva una marca cuando las animaciones están deshabilitadas
  y la hoja de estilos las apaga con esa marca.
- **Las dos interfaces:** la pantalla es una sola, compartida por el celular y la computadora,
  como Roles y Mejoras y errores. Cada preferencia dice en qué interfaz aparece.
- **Sin dependencias nuevas.** No hace falta un ADR: no hay ninguna decisión técnica que no
  esté ya tomada.

## Trabajar sin conexión en el celular (RF-84, RF-85)

- **Una sola llave para todo el guardado.** Todo lo que la aplicación guarda del negocio pasa
  por una misma base del navegador. Con la opción deshabilitada en un celular, esa base no se
  abre: cada parte de la aplicación ya sabe seguir sin ella (el catálogo se queda en memoria, y
  lo que se registra se manda directo al servidor en vez de pasar por la cola). Al
  deshabilitar, la base se borra entera.
- **Qué es un celular:** el aparato (un teléfono o una tableta con Android o iOS), no el ancho de
  la ventana. Una computadora con la ventana angosta muestra la interfaz del celular pero sigue
  guardando: achicar la ventana no puede borrarle nada.
- **Sin conexión y sin guardado:** el envío directo falla, y el mensaje dice que no se registró
  y que para trabajar así hay que habilitarlo en Configuración.
- **Cambiar el guardado o la forma de buscar vuelve a abrir la aplicación,** para que arranque
  guardando todo, o sin guardar nada, o sin bajar el catálogo.
- **Buscar en el servidor, en detalle:** la aplicación baja igual los primeros 60 productos, para
  que la lista no esté vacía; consulta al servidor cuando la persona deja de escribir (0,3
  segundos) y con al menos 2 caracteres; no repite una búsqueda ya hecha; y pide los productos
  por identificador de a 150. Si la consulta de un código falla, dice que no hay conexión: no
  dice que el producto no existe.
- **Buscar en el servidor:** el servidor suma a su consulta de productos tres filtros (por
  texto, por código y por una lista de identificadores). La aplicación guarda en memoria solo
  lo que fue trayendo; buscar o escanear consulta primero ahí y después al servidor.

## Seguridad

- Las preferencias no guardan datos del negocio ni de personas: solo sí o no, y una opción, por dispositivo.
- Deshabilitar el guardado borra del teléfono los datos del negocio: es lo que se busca en un teléfono que no es de la empresa.
- Los filtros nuevos de la consulta de productos piden la misma sesión que la consulta de siempre y no muestran nada que esa consulta no mostrara; los valores van como parámetros, nunca pegados al texto de la consulta.
- Las preferencias no piden permisos ni se guardan en el servidor. Lo único nuevo que se le pide al servidor son los filtros de la consulta de productos.
- La preferencia se lee con cuidado: un valor que no sea el esperado se toma como el de arranque.

## Pruebas

Una por escenario de la especificación (E01 a E18): unitarias de la pantalla y de la
preferencia, y un paso en las pruebas de punta a punta del celular para E02 y E03.
