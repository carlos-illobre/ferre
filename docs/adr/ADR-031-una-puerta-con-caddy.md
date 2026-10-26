# ADR-031: Una sola puerta para la web, con Caddy configurado

**Estado**: Aceptado (2026-10-25) · **Spec**: specs/026 · **Decisión**: 164

## Contexto

La aplicación hablaba con un solo servidor, el del mostrador, que además hacía de puerta para
Procesos: le reenviaba los pedidos, validaba la sesión y anotaba lo que se hacía ahí. Con la
división en servicios por funcionalidad (decisión 164) vienen Auditoría, Tickets y Acceso. Si
cada uno tuviera su dirección, la web tendría que conocerlas todas; si el mostrador siguiera de
puerta, tendría que conocer a todos los servicios y cada uno nuevo lo tocaría.

## Decisión

Una puerta propia, que solo reparte, hecha con **Caddy configurado** en su propia imagen
(`microservices/puerta/`), no programada:

- Reparte por ruta: cada servicio atiende un prefijo; lo demás va a Comercial.
- Para los servicios que no saben de sesiones, pregunta antes quién es la persona
  (`forward_auth` contra el servicio que sabe de sesiones: Comercial hasta specs/029, después
  Acceso) y le pasa `X-Usuario-Id`, `X-Usuario-Nombre` y `X-Permisos`.
- Borra las cabeceras de identidad que mande el navegador y agrega el token entre servicios.
- Atiende el CORS de todos los servicios.
- Es lo único que se publica en la máquina (`127.0.0.1:PUERTO_API`); los servicios exigen el
  token entre servicios.

Se descartaron: que Comercial siga de puerta (lo acopla a todos) y una puerta programada en
Node (código propio para algo que Caddy resuelve).

## Consecuencias

- Sumar un servicio es agregar su ruta en el `Caddyfile`; ni la web ni Comercial cambian.
- Un paso más por pedido, dentro de la máquina: no se nota.
- Si la puerta se cae, se cae todo el servidor; la vigila el control de salud del compose
  como a los demás, y el despliegue no da por sano un ambiente sin ella.
- La configuración no tiene pruebas unitarias: se prueba con el stack levantado
  (`tests/integration/puerta.sh`).
- Procesos recibe los permisos de la persona y su configuración le dice cuáles son los suyos:
  sigue sin saber nada de Ferrebress (RNF-61).

## Enmienda (specs/029): la puerta le pregunta a Acceso

Con Acceso en su servicio, la puerta reparte a Acceso las rutas de entrar, las sesiones, los
usuarios, los roles, las huellas, el vínculo, el canal, lo apartado y los ajustes, **sin preguntar
antes**: Acceso las atiende con o sin sesión y busca la sesión él mismo. Todo lo demás, Comercial
incluido, pasa por `forward_auth` a `acceso:8097/sesiones/quien`, y cada servicio recibe la persona
hecha en `X-Usuario-Id`, `X-Usuario-Nombre` y `X-Permisos`. Si Acceso no responde, la puerta corta
la conexión a Comercial, a Tickets y a lo de Acceso (la aplicación sigue sin conexión); Procesos y
Auditoría lo dicen con palabras, como antes. La puerta no espera a Acceso para arrancar. Lo que
Comercial atiende sin sesión (`/health`, que miran el monitor y la aplicación, y `/fotos/*`, que el
navegador pide sin el token) pasa directo, sin preguntar.
