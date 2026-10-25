# Pruebas manuales: entrar a la aplicación

Las tres formas de entrar (RF-70, RF-70b y RF-76) y lo que pasa con la sesión después. Entre
paréntesis, el escenario de `specs/007-usuarios-y-acceso/spec.md` del que sale cada caso
(historia·número; por ejemplo, «4b·2» es el escenario 2 de la historia 4b).

## Qué hay que probar sí o sí a mano

Lo que ninguna prueba automática puede hacer: la pantalla de Google de verdad, el lector de huella
del teléfono y su cámara. Las pruebas automáticas los simulan (Google confirma una cuenta, el lector
lee o no lee el dedo, la cámara «lee» un texto) y prueban qué hace Ferrebress con eso.

- **A2** y **A5**: entrar con una cuenta de Google de verdad, autorizada y no autorizada.
- **B1**: vincular la huella apoyando el dedo de verdad (una vez por modelo de celular).
- **C4**: leer el código de la computadora con la cámara del teléfono, sin abrir Ferrebress.
- **C6**: leer el código sin sesión y entrar con Google.

Todo lo demás tiene prueba automática; a mano vale como repaso con equipos de verdad.

Las pruebas de punta a punta prueban solo lo que una unitaria no puede: que las piezas funcionen
juntas en un navegador de verdad (por ejemplo, que el lector de la cámara lea el código de la
computadora). Lo demás va en unitarias, que son más rápidas (pedido de Carlos del 2026-10-17).

## Qué prueba la máquina

Unitarias (corren en cada subida, en segundos; las de la aplicación en `microservices/web/src/`, las del servidor en `microservices/comercial/src/`) y de punta a punta (`tests/e2e/`, en Docker):

| Casos | Prueba |
|---|---|
| A1, B2, B4, B5, B7, C1, C2, D1 | De punta a punta: `01-login` (celular y computadora) |
| A2, A3, A4, A5 (Google simulado) | Unitarias: `pantallas/entrar-simulado.test.tsx` y, en el servidor, `rutas/entrar-con-google.test.ts` |
| A2, A5 (la credencial de Google) | Servidor: `autenticacion.test.ts`, con credenciales firmadas con una clave de prueba: firma, aplicación, emisor, vencimiento y correo verificado |
| A2, A8 («Conectando tu cuenta de Google») | Unitarias: `celular/ConectandoConGoogle.test.tsx` |
| A6, A7 | Servidor: `rutas/entrar-con-google.test.ts` y `rutas/usuarios.test.ts` |
| B1, B3, B4, B5 (huella simulada) | Unitarias: `pantallas/entrar-simulado.test.tsx` |
| B5b | Servidor: `rutas/credenciales.test.ts` |
| B6, C7 | Servidor: `rutas/credenciales.test.ts` y `rutas/sesiones.test.ts` |
| C5, C6 (la computadora entra sola si el celular entra desde el código; con sesión, pide el toque) | Unitarias: `celular/App.entrar-compu.test.tsx`, la aplicación del celular entera con Google y la huella simulados |
| C3, C5, C8, C9 (cámara simulada) | Unitarias: `celular/EntrarEnLaCompu.test.tsx`; en el servidor, `rutas/sesiones.test.ts` |
| C8, C10 | Unitarias: `compu/base/pantallas/Entrar.test.tsx` |
| C2, C5 (la cámara lee el código) | De punta a punta: `01-login` del celular, con una cámara de mentira que muestra el código real de la computadora |
| C11 | De punta a punta: `17-espejo` |
| D2 | De punta a punta: `08-sin-conexion` |
| D3, D3b | De punta a punta: `12-cerrar-sesion` |
| D4, D5, D6 (los 30 segundos) | Unitarias: `sesion.test.tsx` y `compu/base/pantallas/Entrar.test.tsx`; en el servidor, `rutas/usuarios.test.ts` |
| D7 | Unitarias: `cola.test.ts`; de punta a punta: `19-para-revisar` |

## Antes de empezar

- Una cuenta de Google **autorizada** y otra que **no** esté cargada en Más → Usuarios.
- Un segundo usuario autorizado, para desactivarlo.
- Un celular con lector de huella y una computadora.
- Para los casos de «primera vez» con la huella, quitar antes la del celular (Más → Configuración, «Mis celulares con huella»).

## A. Con Google

| # | Pasos | Qué tiene que pasar |
|---|---|---|
| A1 | Celular sin sesión: abrir la aplicación | Solo ofrece entrar, con Google o con la huella; no hay contraseña (1·1) |
| A2 | Celular: «Continuar con Google» con la cuenta autorizada | Al volver de Google se ve enseguida «Conectando tu cuenta de Google», con sus pasos, hasta que la sesión queda abierta; después, el Catálogo, con su nombre (1·2) |
| A3 | Seguido de A2, en un celular que nunca se vinculó | Ofrece «¿Entrar con la huella?», con aceptar o dejarlo para después (4·1) |
| A4 | Computadora: «Continuar con Google» con la cuenta autorizada | Entra; **no** ofrece vincular la huella (4·5) |
| A5 | Celular o computadora: entrar con la cuenta **no autorizada** | No entra; muestra el correo, dice «No autorizado» y a quién pedirle el alta (1·3) |
| A6 | Desactivar al segundo usuario y entrar con su cuenta | Igual que A5 (1·4) |
| A7 | Reactivarlo y volver a entrar | Entra (2·9) |
| A8 | Celular: «Continuar con Google» y cerrar la ventana de Google sin elegir cuenta | «Conectando tu cuenta de Google» desaparece a los pocos segundos y vuelve la entrada |

## B. Con la huella

| # | Pasos | Qué tiene que pasar |
|---|---|---|
| B1 | En la oferta de A3, aceptar y apoyar el dedo | Lo confirma, y el celular aparece en Más → Configuración, «Mis celulares con huella», con su nombre y la fecha (4·2) |
| B2 | Salir y volver a entrar con Google en ese celular | **No** vuelve a ofrecer la huella (4·3) |
| B3 | Aceptar la oferta pero cancelar la lectura del dedo | Avisa que se puede vincular después, desde Más → Configuración (4·4) |
| B4 | Celular vinculado: «Salir» → «Entrar con la huella» → dedo | Entra sin elegir cuenta ni escribir nada (4·8) |
| B5 | Quitarlo en Más → Configuración, «Mis celulares con huella», salir y probar con la huella | No entra; dice que el celular no está vinculado y que entre con Google (4·9) |
| B5b | Quien tiene «Administrar usuarios», en otro dispositivo: Más → Usuarios, tarjeta de la persona, quitar su celular | Ese celular deja de entrar con la huella (4·11) |
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
| D3b | Quien administra abre su propia tarjeta en Más → Usuarios | La sesión de ese dispositivo no figura (se cierra con «Salir»); las de sus otros dispositivos sí (5·2) |
| D4 | Con la aplicación abierta en el primero, sin tocarlo: desde otro dispositivo, Más → Usuarios, tarjeta de la persona, cerrar esa sesión | En menos de 30 segundos, sin que nadie toque nada, el primero vuelve solo a la entrada con «Hay que iniciar sesión»; si estaba en otra ventana, apenas se vuelve a la aplicación (5·4) |
| D5 | Igual que D4, con el primero en modo avión mientras se cierra | Mientras no tiene conexión sigue trabajando; al volver, en menos de 30 segundos vuelve solo a la entrada (5·4b) |
| D6 | Desactivar a un usuario con la aplicación abierta | En menos de 30 segundos su dispositivo vuelve solo a la entrada, y no vuelve a entrar ni con Google ni con la huella (2·8) |
| D7 | Con la sesión de A en un celular y sin red, cobrar una venta; cerrarle la sesión desde otro dispositivo; volver la red y entrar con B en ese celular | La venta de A no sale a nombre de B. Si A sigue activa, queda en el celular y sale cuando A vuelve a entrar ahí; si a A la desactivaron, queda apartada para que un Administrador decida (5·4d, 014) |

## Lo que no se prueba a mano

- El límite de intentos de entrada (10 por minuto con Google, 20 con la huella): lo cubren las pruebas del servidor.
- El vencimiento a los 90 días sin uso (5·8).
