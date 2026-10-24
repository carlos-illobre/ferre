# Plan: Ajustes del sistema

**Spec**: [spec.md](spec.md) (aprobada el 2026-10-23) · **Maquetas**: variante A con sus estados,
aprobada el 2026-10-24 ([ux.md](ux.md)) · **Decisiones**: 146 y 147. No lleva ADR: no cambia la
arquitectura; guarda tres valores en la tabla de ajustes que ya existe.

## Summary

- **Los ajustes** viven en la tabla `configuracion (clave, valor)`, que ya guarda los días del
  vínculo. Dos claves nuevas: `sesion.recordar_segundos` (0, 30, 60, 300 o 600; 60 de arranque) y
  `celular.pregunta_segundos` (5, 30, 60, 300 o 600; 60 de arranque). El servidor los lee al
  arrancar y los tiene en memoria; al guardarlos los cambia en la base y en la memoria a la vez.
  Si no se pueden leer, valen los de arranque.
- **La sesión recordada (RF-133).** El servidor guarda en memoria, por el hash del token, la
  sesión con la persona y sus permisos, cuándo vence, cuándo se usó por última vez y hasta cuándo
  vale lo recordado. Con el tiempo en 0 no guarda nada. Lo recordado:
  - no pasa si la sesión venció (E04), aunque siga en memoria;
  - renueva el vencimiento en la base como hoy, una vez por hora, con el último uso que recuerda (E06);
  - se olvida entero cuando la aplicación cierra o revoca una sesión, cambia a una persona
    (activa, nombre, roles), cambia o borra un rol (E03). Son cambios raros: olvidar todo es lo
    simple y siempre correcto.
  Un token que no existe no se guarda (E05). Un único proceso por ambiente (supuesto de la spec).
- **El celular emparejado (RF-134).** El aviso ya le llega por el flujo del espejo. La pregunta de
  respaldo usa el tiempo de `celular.pregunta_segundos`; además pregunta al volver a la aplicación
  y al volver la conexión (`online`). El celular conoce el tiempo por la respuesta de
  `GET /sesiones/actual`, que ya pide cada 30 segundos: se agrega `ajustes.celular_segundos` (E16).
- **Más → Sistema (RF-135).** Una pantalla compartida por el celular y la computadora (los textos
  largos y cortos en `textos`), con su entrada en Más solo para quien tiene «Administrar el
  sistema». Los días del vínculo salen de Usuarios y van acá.
- **El permiso** «Administrar el sistema» (`admin.sistema`), en la parte Administración. Una
  migración se lo da a los roles que tienen «Administrar usuarios». Se suma a la lista de los
  permisos de administrar: nunca puede quedar ningún usuario activo que los tenga todos.
- **Rutas:**
  - `GET /sistema/ajustes`, con «Administrar el sistema»: `{ sesion_segundos, celular_segundos, vinculo_dias }`.
  - `PUT /sistema/ajustes`, con ese permiso: uno o más de esos campos; cada uno tiene que ser uno
    de sus tramos (los días, entero de 1 a 365); si no, 400 con los valores que puede tener. Deja
    el evento `sistema.ajustes_cambiados` con lo de antes y lo nuevo.
  - `PUT /puestos/configuracion` (las aplicaciones de la versión anterior) pasa a pedir «Administrar
    el sistema»; `GET /puestos/configuracion` sigue igual.
  - `GET /sesiones/actual` agrega `ajustes: { celular_segundos }`.

## Technical Context

- Servidor (`microservices/api`): un tema nuevo, `sistema/` (ajustes en memoria, `datos.ts`,
  `reglas.ts`), su ruta y el recuerdo de sesiones en el tema de acceso.
- Cliente (`microservices/web`): la pantalla, sus entradas en Más (celular y computadora), la
  pregunta del celular emparejado y la sesión actual.

## Constitution Check

- Una funcionalidad nueva con los siete pasos: spec y maqueta aprobadas por Carlos.
- La regla de cada ajuste está una vez en el servidor (los tramos); el cliente los muestra.
- Celular y computadora con las mismas reglas y textos (decisión 47).

## Seguridad

- **Datos que toca:** tres valores técnicos, sin datos personales. La sesión recordada vive solo en
  la memoria del proceso (nunca en disco), con el hash del token como llave, como en la base.
- **Permisos:** leer y cambiar los ajustes pide «Administrar el sistema»; sin él, 403 con el nombre
  del permiso. Nadie lo cambia para su dispositivo: no hay preferencia local.
- **Lo que no puede empeorar:** desactivar a alguien, cerrarle las sesiones, cambiarle los roles o
  los permisos y salir valen en el pedido siguiente (se olvida lo recordado). Una sesión vencida
  nunca pasa. El peor caso, un cambio hecho a mano en la base, tarda como mucho 10 minutos.
- **Qué entra desde afuera:** solo los tramos fijos y los días de 1 a 365; cualquier otra cosa, 400.
- **Que no quede sin administrar:** el permiso nuevo entra en el control que ya impide quedarse sin
  quien administre.
- **Registro:** cada cambio de ajustes queda en «Quién hizo qué», con quién, antes y después.

## Project Structure

### Documentation (this feature)

`spec.md`, `plan.md`, `ux.md`, `tasks.md`, `maquetas/`, `checklists/`.

### Otras capacidades que cambian

- 007: el permiso nuevo, los días del vínculo en Más → Sistema y las rutas (`contracts/api.md`).
- 001: el tiempo de respaldo del celular emparejado, si lo nombra.

## Complexity Tracking

- **Olvidar todas las sesiones recordadas ante cualquier cambio de acceso** en vez de la sesión
  puntual: más simple y nunca deja pasar algo viejo; el costo es una consulta por sesión la vez
  siguiente, y esos cambios son de vez en cuando.
- **Las pruebas de punta a punta corren con la sesión en «No recordar».** Cambian la base a mano
  (crean y borran sesiones, sacan permisos), el caso que la spec acepta que tarde hasta el tiempo de
  la sesión. La sesión recordada la prueban las pruebas del servidor.
