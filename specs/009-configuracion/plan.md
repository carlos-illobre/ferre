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

## Trabajar sin conexión en el celular (RF-81, RF-82)

- **Una sola llave para todo el guardado.** Todo lo que la aplicación guarda del negocio pasa
  por una misma base del navegador. Con la opción deshabilitada en un celular, esa base no se
  abre: cada parte de la aplicación ya sabe seguir sin ella (el catálogo se queda en memoria, y
  lo que se registra se manda directo al servidor en vez de pasar por la cola). Al
  deshabilitar, la base se borra entera.
- **Qué es un celular:** el mismo criterio con el que la aplicación elige su interfaz (el ancho
  de la ventana al abrir).
- **Sin conexión y sin guardado:** el envío directo falla, y el mensaje dice que no se registró
  y que para trabajar así hay que habilitarlo en Configuración.
- **Buscar en el servidor:** el servidor suma a su consulta de productos tres filtros (por
  texto, por código y por una lista de identificadores). La aplicación guarda en memoria solo
  lo que fue trayendo; buscar o escanear consulta primero ahí y después al servidor.

## Seguridad

- Las preferencias no guardan datos del negocio ni de personas: solo sí o no, y una opción, por dispositivo.
- Deshabilitar el guardado borra del teléfono los datos del negocio: es lo que se busca en un teléfono que no es de la empresa.
- Los filtros nuevos de la consulta de productos piden la misma sesión que la consulta de siempre y no muestran nada que esa consulta no mostrara; los valores van como parámetros, nunca pegados al texto de la consulta.
- No pide permisos y no llama al servidor, así que no abre ningún acceso nuevo.
- La preferencia se lee con cuidado: un valor que no sea el esperado se toma como el de arranque.

## Pruebas

Una por escenario de la especificación (E01 a E06): unitarias de la pantalla y de la
preferencia, y un paso en las pruebas de punta a punta del celular para E02 y E03.
