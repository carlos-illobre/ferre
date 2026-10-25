# Plan: Una sola puerta para la web, y el servicio del mostrador se llama Comercial (026)

## Contexto técnico (cómo está hoy)

- El servidor del mostrador está en `microservices/api`, se llama `gestion-del-local` en el
  compose y en su imagen, y su base es `mostrador`. Se publica en `127.0.0.1:PUERTO_API`, donde
  lo alcanza el reverse proxy de la máquina.
- Comercial atiende el CORS de todo el servidor (Hono `cors`, solo `ORIGEN_WEB`) y reenvía
  `/procesos/*` a Procesos (`procesos/reglas.ts`, `rutas/procesos.ts`): exige la sesión y un
  permiso de Procesos, le pasa `X-Token-Servicio`, `X-Usuario-Id`, `X-Usuario-Nombre` y
  `X-Puede` (`ver,dibujar`), y anota en su tabla de eventos lo que salió bien en Procesos
  (con la regla del borrador: el primero y uno cada media hora por persona y proceso).
- Procesos (`microservices/procesos/servidor`) no sabe de sesiones: exige el token entre
  servicios y lee quién es y qué puede de esas cabeceras.
- En desarrollo, el perfil `gateway` levanta un Caddy que sirve `http://localhost` y pasa todo
  a `gestion-del-local`.
- El despliegue de la máquina ya lee los servicios y las imágenes del compose de cada versión
  (001-T051): un servicio nuevo o renombrado se despliega sin reinstalar el script.

## Decisión (ADR-031)

**La puerta es un Caddy con su configuración, en su propia imagen.** Se compararon tres caminos:

| Opción | A favor | En contra |
|---|---|---|
| Comercial sigue de puerta | Nada nuevo | Comercial conoce a todos los servicios; cada servicio nuevo lo toca |
| Una puerta programada (Node) | Control total | Código propio para algo resuelto; hay que probarlo y mantenerlo |
| **Caddy configurado (elegida)** | Ya está en el proyecto; reparte por ruta y tiene `forward_auth` para preguntar quién es; liviano | La configuración también se prueba (con el stack levantado) |

- **Imagen propia** (`microservices/puerta/`: `Dockerfile` sobre `caddy:2-alpine` con el
  `Caddyfile` adentro), publicada en GHCR como las demás: en la máquina solo está el compose,
  no los archivos del repositorio.
- **`forward_auth`**: antes de pasar un pedido a un servicio que no sabe de sesiones, la puerta
  le pregunta a quien sabe (hoy Comercial, en `GET /sesiones/quien`; desde 029, Acceso) y copia
  `X-Usuario-Id`, `X-Usuario-Nombre` y `X-Permisos` de la respuesta. Si no hay sesión, devuelve
  la respuesta de Comercial (401 con su mensaje) sin pasar el pedido.
- **Las cabeceras de identidad las pone solo la puerta:** borra las que manda el navegador con
  esos nombres (`X-Usuario-Id`, `X-Usuario-Nombre`, `X-Permisos`, `X-Token-Servicio`) antes de
  todo, y agrega el token entre servicios a cada pedido que pasa.
- **CORS en la puerta**, para todos los servicios: responde la consulta previa del navegador
  (`OPTIONS`) y agrega `Access-Control-Allow-Origin` solo para `ORIGEN_WEB`, con las mismas
  cabeceras permitidas y expuestas que hoy (`Authorization`, `Content-Type`, `X-Temas`,
  `X-Canal`; expuesta `X-Avisos`). Comercial deja de hacerlo: dos orígenes en la misma
  respuesta el navegador los rechaza.
- **Procesos lee los permisos con sus nombres configurados:** en vez de `X-Puede` con sus
  palabras, recibe `X-Permisos` (la lista de permisos de la persona) y su `.env` dice qué
  permiso es «ver» y cuál «dibujar» (`PERMISO_VER`, `PERMISO_DIBUJAR`; como no cambian entre
  ambientes, van escritas en el compose y no en el `.env`). Sigue sin saber nada de
  Ferrebress (RNF-61) y la puerta no traduce nada.
- **La salud de la puerta** está en `/puerta/salud`, para el control del contenedor.
- **Quién llama de verdad:** la puerta confía en el `X-Forwarded-For` que pone el reverse proxy de
  la máquina (`trusted_proxies private_ranges`), así Comercial sigue viendo la dirección de quien
  llama para limitar los intentos de entrar.
- **Un servicio caído:** si es Procesos, la puerta lo dice con palabras; si es Comercial, corta la
  conexión, y la aplicación lo toma como sin conexión (sigue con lo que tiene en el dispositivo).
- **Versión fija de Caddy** (`2.11.7`): el orden en que aplica las directivas no puede cambiar solo.
- **Los servicios atienden solo a la puerta:** Comercial exige el token entre servicios en
  todo menos `/health` (que usa el control de salud del contenedor), como ya hace Procesos.
  Ninguno publica puertos; la puerta se publica en `127.0.0.1:PUERTO_API`.

## Estructura

```text
microservices/
  puerta/      Dockerfile y Caddyfile (nuevo)
  comercial/   lo que era api/ (renombrado con git mv; el contenido no cambia)
  procesos/    anota sus eventos; lee X-Permisos
```

- Renombre: `git mv microservices/api microservices/comercial`; el paquete, el servicio del
  compose y la imagen pasan a `comercial`; la ruta `@servidor/*` de la web, el workspace, la CI,
  los scripts de pruebas y la documentación siguen el nombre nuevo. La base sigue siendo
  `mostrador`.
- Comercial: sale el reenvío a Procesos (`procesos/reglas.ts`, `rutas/procesos.ts`,
  `PROCESOS_URL`) y el CORS; entra `GET /sesiones/quien` y la exigencia del token entre
  servicios.
- Procesos: una tabla `evento` en su base y `anotarEvento(trx, …)` en su capa de datos; el
  almacén recibe el evento en cada cambio y lo escribe en la misma transacción; la regla del
  borrador (el primero y uno cada media hora) pasa a sus reglas. El almacén en memoria hace lo
  mismo para sus pruebas.
- Compose: servicio `puerta` (depende de que `comercial` y `procesos` estén sanos, con su
  control de salud), `comercial` y `procesos` sin puertos; el Caddy de desarrollo pasa a
  apuntar a la puerta.

## Pruebas

- Unitarias de Comercial: `/sesiones/quien` (con y sin sesión, cabeceras), el token entre
  servicios (rechaza sin él, deja pasar `/health`). El ayudante de las pruebas de rutas manda el
  token.
- Unitarias y de persistencia de Procesos: cada evento (E10–E12), la regla del borrador, que
  una acción fallida no anota y que lee `X-Permisos` con los nombres del `.env`; 100 % en su
  capa de datos.
- Integración (`tests/integration/puerta.sh`, con el stack): E01–E09 contra la puerta real:
  reparto por ruta, `forward_auth`, cabeceras falsas del navegador borradas, CORS, ruta
  inexistente, servicios no publicados, Procesos sin token, Procesos caído.
- Las e2e no cambian: pasan por la puerta (SC-001).

## Seguridad

- **Datos que toca:** ninguno nuevo. Las cabeceras de identidad (número, nombre y permisos de
  la persona) viajan solo por la red interna.
- **Permisos:** no cambia quién puede qué. Comercial sigue exigiendo sus permisos; Procesos los
  suyos, leídos de `X-Permisos`.
- **Lo que entra de afuera:** todo entra por la puerta. Riesgo principal: que el navegador mande
  cabeceras de identidad falsas; la puerta las borra antes de cualquier otra cosa y solo pone
  las que devuelve `/sesiones/quien`. Una prueba de integración lo comprueba. Los tamaños
  máximos siguen: 6 MB para Procesos en la puerta, los de Comercial en Comercial.
- **Secretos:** el token entre servicios (`TOKEN_SERVICIO`, ya en el `.env`) pasa también a la
  puerta. Ninguno nuevo.
- **Quién hizo qué:** lo de Comercial sigue igual. Lo de Procesos lo anota Procesos en su base,
  con quién lo hizo; hasta 027 no se ve en «Quién hizo qué» (decisión 165).
- **Exposición:** solo la puerta se publica, en la interfaz local de la máquina (ADR-013); los
  servicios rechazan pedidos sin el token aunque alguien llegara a la red interna.
