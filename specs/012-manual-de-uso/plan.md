# Plan: Manual de uso

## Qué se construye

Una pantalla más de la aplicación de la computadora, `#/manual`, que se ve sin sesión (como la de
vincular el celular). La abre «Ver tutorial» de la entrada, en la misma pestaña. Copia la maqueta
aprobada (`maquetas/manual-entrar.html`): barra de arriba, índice a la izquierda y la hoja del
capítulo.

- **El contenido** va en el código de la pantalla, un capítulo por componente; los capítulos que
  faltan son una lista con su nombre y «pronto». No hay servidor ni datos guardados: el manual no
  cambia por negocio.
- **Las capturas y el clip** los arma `tests/capturas/tutorial/<capítulo>.py` con la API de mentira
  y el cliente de `tests/capturas/`, y los deja en `microservices/web/public/manual/<capítulo>/`.
  Se vuelven a generar cuando cambia una pantalla. El clip va en MP4 (H.264), que reproduce
  cualquier navegador.
- **Sin conexión:** `public/manual/` queda afuera del precache del service worker, para no ocupar
  lugar en cada dispositivo (E09).
- **Las pruebas de punta a punta** no graban video (`video: "off"`, ADR-004): los recorridos del
  manual son otros.

## Seguridad

- El manual se ve sin sesión, pero no muestra ni pide datos del negocio: sus capturas son de la API
  de mentira, con datos inventados (correos `@ferre.test`). Las capturas nunca se sacan de un
  ambiente con datos reales.
- No agrega rutas al servidor ni permisos.
- Los archivos del manual son estáticos, servidos con la aplicación; el clip no tiene sonido.

## Pruebas

- Unitaria de la pantalla: índice, capítulo, clip quieto y «Volver» (E02 a E06).
- Unitaria de la entrada: «Ver tutorial» va al manual (E01).
- El recorrido de punta a punta de la entrada de la computadora toca «Ver tutorial» y vuelve (E01, E05).
- E08 y E09 se revisan en la configuración (precache y pruebas sin video).
