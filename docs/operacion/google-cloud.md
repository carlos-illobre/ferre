# Configurar Google Cloud para entrar con la cuenta de Google

Guía paso a paso para el dueño. Se hace una sola vez y tarda unos diez minutos. Sirve
para dos cosas: que el dueño y el empleado entren al sistema con su Gmail sin contraseña
(issue #41), y más adelante para que el sistema lea las listas de precios que llegan a la
casilla del negocio (issue #25).

Todo lo que se crea acá es gratuito. No hace falta cargar tarjeta.

## 1. Crear el proyecto

1. Entrar a [console.cloud.google.com](https://console.cloud.google.com/) con la cuenta
   de Google del negocio (la que recibe las listas de precios). Conviene esa y no una
   personal, para que el proyecto quede con el negocio.
2. Arriba a la izquierda, junto al logo, tocar el selector de proyectos y luego
   **Proyecto nuevo**.
3. Nombre: `ferre`. Organización: dejar "Sin organización". **Crear**.
4. Esperar el aviso de que el proyecto se creó y seleccionarlo en el mismo selector.

**Cómo saber que salió bien:** el nombre `ferre` aparece arriba, junto al logo.

## 2. Pantalla de consentimiento

Es lo que Google muestra la primera vez que alguien entra con su cuenta.

1. Menú ☰ → **APIs y servicios** → **Pantalla de consentimiento de OAuth** (en versiones
   nuevas de la consola se llama **Google Auth Platform** → **Branding**).
2. Si pregunta el tipo de usuario, elegir **Externo**. "Interno" solo existe para
   empresas con Google Workspace.
3. Completar:
   - Nombre de la aplicación: `ferre`
   - Correo de asistencia: el del negocio
   - Datos de contacto del desarrollador: el del negocio
4. Guardar. No hace falta agregar logotipo ni dominios todavía.
5. En **Público** (o **Audience**) dejar la aplicación en estado **Prueba** y agregar
   como **usuarios de prueba** los Gmail del dueño y del empleado. En este estado solo
   esas cuentas pueden entrar, que es exactamente lo que queremos. No hace falta pedir
   la verificación de Google.

**Cómo saber que salió bien:** la pantalla muestra estado "Prueba" y los dos correos en
la lista de usuarios de prueba.

## 3. Crear el cliente OAuth

Es la credencial que identifica al sistema ante Google.

1. Menú ☰ → **APIs y servicios** → **Credenciales** → **Crear credenciales** →
   **ID de cliente de OAuth**.
2. Tipo de aplicación: **Aplicación web**. Nombre: `ferre cliente web`.
3. **Orígenes de JavaScript autorizados**, tocar **Agregar URI** por cada uno:
   - `https://carlos-illobre.github.io` (el cliente web en GitHub Pages)
   - `http://localhost:4173` y `http://localhost:5173` (desarrollo)
   - Si más adelante hay dominio propio para el cliente, agregarlo acá.
4. **URI de redireccionamiento autorizados**: dejar vacío. El sistema usa el botón de
   Google que devuelve el token directamente, sin redirección.
5. **Crear**. Aparece una ventana con el **ID de cliente**, algo como
   `123456789-abc.apps.googleusercontent.com`. Copiarlo. El **secreto** no se usa para
   el login; no hace falta guardarlo.

**Cómo saber que salió bien:** en Credenciales aparece `ferre cliente web` con su ID.

## 4. Cargar el ID en el sistema

El ID de cliente **no es secreto**: va en el cliente web y en la API.

- En el `.env` de producción (`deployment/oracle-single/.env`) y en el `.env` local:
  `GOOGLE_CLIENT_ID=<el id copiado>`.
- En GitHub: Settings → Secrets and variables → Actions → **Variables** →
  `GOOGLE_CLIENT_ID` con el mismo valor. CI lo usa al construir el cliente web.

Después de eso, levantar de nuevo el servicio (`docker compose up -d`). El primer
usuario dueño se registra con el comando que documenta el issue #41; los siguientes se
dan de alta desde la app.

## 5. Más adelante: leer la casilla del negocio (issue #25)

Cuando toque automatizar la lectura de listas por mail:

1. Menú ☰ → **APIs y servicios** → **Biblioteca** → buscar **Gmail API** → **Habilitar**.
2. En la pantalla de consentimiento, agregar el permiso (scope)
   `https://www.googleapis.com/auth/gmail.readonly`, que es **solo lectura**.
3. Crear un segundo cliente OAuth de tipo **Aplicación web** con la URI de
   redireccionamiento que indique el issue #25, porque la lectura del correo sí necesita
   redirección y un secreto, que va al `.env` del servicio `listas-de-proveedores`.

## Si algo falla

- **"Acceso bloqueado: esta app no está verificada":** la cuenta que intenta entrar no
  está en usuarios de prueba (paso 2.5), o la app pasó a "Producción". Volver a "Prueba".
- **"origin_mismatch" o "El origen de JavaScript no está autorizado":** falta la URL
  exacta en el paso 3.3. Tiene que coincidir letra por letra, incluido `https` y sin
  barra final.
- **El botón de Google no aparece:** el cliente web se construyó sin `GOOGLE_CLIENT_ID`.
  Revisar la variable en GitHub y volver a publicar.
