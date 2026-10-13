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

## Seguridad

- No guarda datos del negocio ni de personas: solo un sí o no por dispositivo.
- No pide permisos y no llama al servidor, así que no abre ningún acceso nuevo.
- La preferencia se lee con cuidado: un valor que no sea el esperado se toma como el de arranque.

## Pruebas

Una por escenario de la especificación (E01 a E06): unitarias de la pantalla y de la
preferencia, y un paso en las pruebas de punta a punta del celular para E02 y E03.
