# Pruebas manuales: entrar a la aplicación

Las tres formas de entrar (RF-70, RF-70b y RF-76) y lo que pasa con la sesión después. Entre
paréntesis, el escenario de `specs/007-usuarios-y-acceso/spec.md` del que sale cada caso
(historia·número; por ejemplo, «4b·2» es el escenario 2 de la historia 4b).

Las que más valen son las que no tienen prueba automática (`proyecto/estado.yml`): A2, A5, A7,
C5, C6, D4 y D5, y todo el recorrido con un celular y una computadora de verdad.

## Antes de empezar

- Una cuenta de Google **autorizada** y otra que **no** esté cargada en Más → Usuarios.
- Un segundo usuario autorizado, para desactivarlo.
- Un celular con lector de huella y una computadora.
- Para los casos de «primera vez» con la huella, quitar antes la del celular (Más → Usuarios → Sesiones).

## A. Con Google

| # | Pasos | Qué tiene que pasar |
|---|---|---|
| A1 | Celular sin sesión: abrir la aplicación | Solo ofrece entrar, con Google o con la huella; no hay contraseña (1·1) |
| A2 | Celular: «Continuar con Google» con la cuenta autorizada | Entra y muestra el nombre (1·2) |
| A3 | Seguido de A2, en un celular que nunca se vinculó | Ofrece «¿Entrar con la huella?», con aceptar o dejarlo para después (4·1) |
| A4 | Computadora: «Continuar con Google» con la cuenta autorizada | Entra; **no** ofrece vincular la huella (4·5) |
| A5 | Celular o computadora: entrar con la cuenta **no autorizada** | No entra; muestra el correo, dice «No autorizado» y a quién pedirle el alta (1·3) |
| A6 | Desactivar al segundo usuario y entrar con su cuenta | Igual que A5 (1·4) |
| A7 | Reactivarlo y volver a entrar | Entra (2·9) |

## B. Con la huella

| # | Pasos | Qué tiene que pasar |
|---|---|---|
| B1 | En la oferta de A3, aceptar y apoyar el dedo | Lo confirma, y el celular aparece en Más → Usuarios → Sesiones con su nombre y la fecha (4·2) |
| B2 | Salir y volver a entrar con Google en ese celular | **No** vuelve a ofrecer la huella (4·3) |
| B3 | Aceptar la oferta pero cancelar la lectura del dedo | Avisa que se puede vincular después y dónde (4·4) |
| B4 | Celular vinculado: «Salir» → «Entrar con la huella» → dedo | Entra sin elegir cuenta ni escribir nada (4·8) |
| B5 | Quitar ese celular de la lista y probar con la huella | No entra; dice que el celular no está vinculado y que entre con Google (4·9) |
| B6 | Vincular la huella del segundo usuario, desactivarlo y probar | No entra (4·12) |
| B7 | Computadora nunca vinculada: mirar la entrada | **No** ofrece «Entrar con la huella» (4b·10) |

## C. Con el celular, leyendo el código de la computadora

| # | Pasos | Qué tiene que pasar |
|---|---|---|
| C1 | Computadora sin sesión: abrir la aplicación | El código aparece solo, con los dos pasos escritos y «Continuar con Google» debajo (4b·1) |
| C2 | Celular **con sesión**: «Escanear el código de la computadora» y leerlo | Pregunta «¿Entrar en la computadora?»; al tocar «Entrar en la computadora», la computadora entra sola con el mismo usuario y el celular avisa «Listo: la computadora entró como …» (4b·4) |
| C3 | Igual que C2, pero «Ahora no» | La computadora no entra y el celular sigue donde estaba |
| C4 | Celular con sesión: leer el código con la **cámara del teléfono**, sin abrir Ferrebress | Abre Ferrebress con la misma pregunta de C2; abrir el enlace no alcanza, hace falta el toque (4b·4) |
| C5 | Celular **sin sesión y con la huella vinculada**: desde su entrada, escanear | Pide la huella enseguida, sin otro toque; entran los dos (4b·2, decisión 65) |
| C6 | Celular **sin sesión y sin huella**: leer el código y entrar con Google | Entran los dos; después le ofrece vincular la huella (4b·3) |
| C7 | Leer el código con la cuenta no autorizada o con el usuario desactivado | No entra ni el celular ni la computadora (4b·7) |
| C8 | Dejar el código sin leer más de 5 minutos | La computadora lo cambia sola; una foto del viejo ya no sirve (4b·5) |
| C9 | Con un código ya usado en C2, leerlo con otro celular | No sirve: dice que hay que leer el que la computadora muestra ahora (4b·6) |
| C10 | Computadora sin internet: abrir la entrada | No hay código: dice que entrar necesita internet (4b·9) |
| C11 | Después de C2, cambiar de pantalla en el celular | La computadora va sola a la misma: quedaron vinculados (4c) |

## D. La sesión, después de entrar

| # | Pasos | Qué tiene que pasar |
|---|---|---|
| D1 | Con sesión, cerrar la aplicación y volver a abrirla | Entra directo, sin Google ni huella (1·6) |
| D2 | Con sesión y en modo avión, abrir la aplicación | Abre igual y deja buscar y vender (1·8) |
| D3 | «Salir» | Vuelve a la entrada; al abrir de nuevo, no entra solo (5·6) |
| D4 | Desde otro dispositivo, Más → Usuarios → Sesiones: cerrar la sesión del primero | El primero, en su próximo movimiento, vuelve solo a la entrada (5·4) |
| D5 | Igual que D4, con el primero en modo avión mientras se cierra | Al volver la conexión, vuelve solo a la entrada (1·9) |
| D6 | Desactivar a un usuario con sesión abierta | Se le cierra la sesión y no vuelve a entrar ni con Google ni con la huella (2·8) |

## Lo que no se prueba a mano

- El límite de intentos de entrada (10 por minuto con Google, 20 con la huella): lo cubren las pruebas del servidor.
- El vencimiento a los 90 días sin uso (5·8).
