# ADR-010: Servicios, clientes y librerías separados; nombres por responsabilidad de negocio; cliente web en GitHub Pages

**Estado:** Aceptado
**Fecha:** 2026-09-13

---

## Contexto

El andamiaje inicial juntaba la API y la PWA en `microservices/mostrador`, con la API
sirviendo el cliente compilado. El dueño pidió: que el backend pueda ser consumido por
varias vistas (web hoy, Android mañana); evaluar GitHub Pages para el cliente web; y que
los nombres digan qué parte del negocio resuelve cada pieza, no su rol técnico
("backend", "web", "importador" suenan a otra cosa).

## Opciones consideradas

### 1. Mantener API y cliente juntos
Un solo deployable, cero CORS. Descartado: cada vista nueva obligaría a meterla en la
misma imagen, y el cliente caería junto con la máquina de Oracle.

### 2. Separar, con la librería compartida publicada como paquete versionado
Cada carpeta 100 % autocontenida (invariante 7 de la skill). Descartado por ahora: con
dos personas, publicar y subir versión de `calculo-de-precios` en cada cambio es
ceremonia sin revisor que la justifique.

### 3. Separar, con un workspace de pnpm en la raíz (elegida)
Servicios, clientes y librerías en carpetas propias; un solo workspace enlaza las
librerías; cada servicio se empaqueta solo con lo suyo con `pnpm deploy`.

### 4. Cliente web servido por Caddy en Oracle
Descartado: si la máquina cae, el cliente no abre y el modo offline no puede ni arrancar.
En GitHub Pages el cliente abre siempre.

## Decisión

Estructura y nombres:

| Carpeta | Responsabilidad de negocio |
|---|---|
| `microservices/gestion-del-local` | Todo lo que pasa dentro del local: catálogo y precios, ventas, cuenta corriente, compras, stock. Dueño de la base y de las migraciones |
| `microservices/listas-de-proveedores` | Recibir listas de proveedores por cualquier canal y convertirlas en precios |
| `clientes/gestion-del-local-web` | La pantalla del empleado y del dueño. Publicada en GitHub Pages |
| `libraries/calculo-de-precios` | Costo neto, margen y precio, siempre con su explicación |

Regla de nombres: los servicios por la parte del negocio; los clientes por el servicio
que muestran más la plataforma (`gestion-del-local-android` mañana); nada de "backend",
"api", "web", "app".

Mecánica:
- `pnpm-workspace.yaml` en la raíz. El Dockerfile de un servicio TypeScript usa la raíz
  como contexto, copia solo su carpeta y las librerías que necesita, y empaqueta con
  `pnpm deploy --filter <servicio>`. Excepción deliberada al "contexto limitado a su
  carpeta" de la skill, a cambio de compartir código sin publicar paquetes.
- El cliente web se construye con `VITE_API_URL` (origen de la API) y `VITE_BASE` (ruta
  bajo GitHub Pages). Falta de `VITE_API_URL` corta el build. CI lo publica en Pages en
  cada push a `master`; `API_URL` es una variable del repositorio.
- La API habilita CORS solo para `ORIGEN_WEB` (del `.env`). La sesión viaja en cabecera,
  no en cookie, porque cliente y API están en orígenes distintos.
- Caddy sirve solo la API.

## Consecuencias

### Positivas
- El cliente abre aunque Oracle esté caído; el modo offline funciona siempre.
- Android consume la misma API sin tocar el servicio.
- Publicar el cliente no toca el servidor.

### Negativas
- Dos orígenes: CORS, y el token no puede ser una cookie `HttpOnly`. Se acepta: el
  token vive en IndexedDB del dispositivo del negocio.
- Dos variables de build del cliente fuera del `.env` del compose. Documentado en
  `DEPLOYMENT.md`; la paridad del `.env` no las cubre.
- Los E2E levantan el cliente aparte (`vite preview`) además del compose.

### Lo que no cambia
Un solo compose; el `.env` sigue siendo la única fuente para los servicios.

## Cuándo revisar esta decisión

- Si aparece un tercer consumidor de `calculo-de-precios` fuera del repo: publicar el
  paquete (opción 2).
- Si GitHub Pages cambia condiciones o hace falta un dominio con TLS propio: mover el
  cliente a Cloudflare Pages o a Caddy.

## Referencias

ADR-001, ADR-003, ADR-007. Issue #51.
