# ADR-011: Entrar con Google, sesiones opacas revocables, login de la laptop por QR, auditoría por usuario

**Estado:** Aceptado
**Fecha:** 2026-09-13

---

## Contexto

Solo usuarios autorizados pueden entrar. El dueño no quiere contraseñas: son inseguras
y se olvidan. Dueño y empleado tienen Gmail. El cliente web vive en GitHub Pages y la
API en Oracle (orígenes distintos, ADR-010). El empleado usa la laptop para ver precios
y el celular para escanear; nada se instala en ninguno. Cada acción tiene que quedar
registrada con quién la hizo.

## Opciones consideradas

### 1. Usuario y contraseña
Descartado por pedido del dueño.

### 2. Enlace mágico por correo
Sin contraseña, pero obliga a mandar correos desde nuestro servidor y a esperar que
llegue en cada login. En un mostrador con microcortes es una fricción diaria.

### 3. Passkeys (huella, Windows Hello)
Lo más seguro y cómodo, pero la laptop antigua puede no tener el hardware. Queda como
segundo método a futuro.

### 4. Supabase Auth
Resuelve todo, pero ata la identidad a Supabase, cuando el ADR-002 lo usa solo como
PostgreSQL común para poder irse con un volcado.

### 5. Entrar con Google, más login por QR desde el celular (elegida)

## Decisión

- **Identidad:** el botón de Google (Google Identity Services) devuelve un token firmado
  que la API verifica contra las claves públicas de Google. Solo se acepta si el correo
  está en la tabla `usuario` y activo. Autorizar a alguien es agregar su Gmail.
- **Sesión:** token opaco aleatorio de 256 bits, guardado hasheado en `sesion`. 90 días
  renovables con el uso, revocables por el dueño o por cierre de sesión. Viaja en la
  cabecera `Authorization`, no en cookie, por los dos orígenes. Vive en el dispositivo.
- **Sin conexión:** el cliente da por válida la sesión guardada; si al reconectar la API
  responde 401, vuelve al login.
- **Login por QR:** la laptop pide un código de un solo uso (2 minutos) y lo muestra como
  QR con un enlace; la cámara del celular lo abre; el celular, ya autenticado, aprueba; la
  laptop retira su sesión una sola vez. Como WhatsApp Web. El código es el secreto: solo
  lo ve quien tiene la pantalla delante.
- **Roles:** `dueño` (todo) y `mostrador`. Un usuario no puede desactivarse ni quitarse
  el rol de dueño a sí mismo.
- **Auditoría:** todo evento de dominio lleva `usuario_id`; el dueño lo ve filtrado por
  usuario, tipo y fecha.
- **Primer dueño:** comando en el contenedor (`crear-usuario`). Después, desde la app.
- Límite de intentos por IP en los puntos de entrada sin sesión.

## Consecuencias

### Positivas
- Nada que recordar ni que resetear. Dar de baja al empleado es desactivar un correo.
- Revocación inmediata de cualquier sesión.
- Entrar en la laptop lleva un gesto con el celular.

### Negativas
- Dependencia de Google para el primer login de cada dispositivo. Con Google caído no se
  puede entrar en un dispositivo nuevo; los ya logueados siguen.
- El token vive en `localStorage` del dispositivo; quien tenga acceso físico al
  navegador desbloqueado opera como ese usuario. Mitigación: revocar desde la app.
- El token aprobado por QR espera en memoria del proceso hasta que la laptop lo retira;
  un reinicio en esos segundos obliga a generar otro QR.

### Lo que no cambia
El token de servicio entre `gestion-del-local` y `listas-de-proveedores` sigue aparte.

## Cuándo revisar esta decisión

- Cuando haya hardware con biometría: agregar passkeys como segundo método.
- Si aparece un tercer cliente (Android): el mismo flujo de Google sirve; revisar el
  almacenamiento del token.

## Referencias

ADR-002, ADR-003, ADR-010. Issue #41. `docs/google-cloud.md`.

---

## Enmienda (2026-09-14): entrar con la huella del celular (passkeys)

El QR sirve para meter la laptop desde un celular ya entrado, pero el celular mismo
solo podía entrar con Google. El dueño pidió que el celular entre con la huella, sin
Gmail. Se usan **passkeys (WebAuthn)** con `@simplewebauthn`:

- **Vincular:** en Administración, ya entrado, "Vincular este celular con mi huella". El
  teléfono crea un par de claves (clave descubrible, verificación del usuario
  obligatoria); la API guarda solo la pública en `credencial`, con el nombre del
  dispositivo. Se listan y se quitan desde ahí; el dueño o el admin pueden quitar el de
  cualquiera (celular perdido).
- **Entrar:** "Entrar con la huella" en el login. La API emite un desafío de un solo
  uso (5 minutos, en memoria del proceso), el teléfono lo firma con la huella, la API
  verifica firma, origen y contador, y abre la sesión de 90 días de siempre. Queda
  auditado con medio `huella`.
- **Atado al dominio del cliente web** (`ORIGEN_WEB`): cambiar de dominio obliga a
  volver a vincular los celulares. Exige HTTPS (o `localhost`).
- **Oferta al primer login (solo en el celular, enmienda 2026-09-15):** la primera vez que alguien entra con Google desde un
  celular con huella, la app ofrece vincularlo ("¿Entrar con la huella?"), como las
  apps de los bancos. Se ofrece una sola vez por dispositivo, acepte o no.
- Google sigue siendo la puerta de entrada del primer login y de la laptop sin huella.

## Enmienda (2026-09-14): rol admin

Se agrega el rol `admin`, con los permisos del dueño (usuarios, sesiones, auditoría,
proveedores, duplicados) salvo sobre los dueños: no puede crearlos, cambiarles el rol,
desactivarlos ni dar el rol de dueño. Sirve para delegar la administración diaria sin
ceder el control de quién manda.
