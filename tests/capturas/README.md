# Capturas de la interfaz, sin Docker

Para mirar una pantalla (o compararla con su maqueta) no hace falta levantar el stack: una
API de mentira con datos de ejemplo y el cliente web en modo desarrollo alcanzan. Sirve para
diseñar y para revisar; no reemplaza a las pruebas.

```bash
tests/capturas/levantar.sh                      # API de mentira (:8799) y cliente (:5199)
python tests/capturas/capturar.py vender        # captura #/vender de la aplicación principal, en las dos medidas
python tests/capturas/capturar.py stock --celu --py "page.get_by_test_id('stock').first.click()"
tests/capturas/levantar.sh --apagar
```

- **Qué necesita:** Node, las dependencias del repo instaladas y Python con Playwright
  (`pip install playwright && playwright install chromium`). Si ya hay un Chromium instalado
  (en las sesiones en la nube, `/opt/pw-browsers/chromium`), `CHROMIUM=<ruta>` lo usa sin bajar otro.
- **Dónde quedan:** en `tests/capturas/salida/` (no se sube), como `<nombre>-compu.png`
  (1366×768) y `<nombre>-celu.png` (390×844).
- **Qué avisa:** desplazamiento hacia el costado, texto de menos de 14 px, objetivos táctiles
  de menos de 44 px en el celular y errores de consola. Si no avisa nada, dice «bien».
- **Opciones:** `--celu`, `--compu`, `--nombre`, `--sin-sesion`, `--permisos`, `--sin-conexion`, `--entera`
  y `--py "código"` (repetible) para dejar la pantalla en el estado que hace falta;
  `python tests/capturas/capturar.py -h` las explica.
- **La sesión** se simula: no pasa por Google. Por defecto puede todo; con `--permisos` queda solo con los
  que se le pasan, para ver lo que ve cada rol:
  `python tests/capturas/capturar.py vender --permisos ventas.registrar`.

## La API de mentira

Procesos arranca con tres procesos de ejemplo; `PUT /mentira/procesos` con `{ "vacio": true }` deja la
lista vacía, y sin cuerpo la vuelve al inicio.

`api-de-mentira/servidor.mjs` carga todos los `rutas-*.mjs` de su carpeta, en orden
alfabético; si dos definen la misma ruta, gana el último. Cada archivo exporta
`{ "GET /ruta/:id": ({ params, query, body }) => valor | [estado, valor] }`. Los datos son
inventados (correos `@ferre.test`). Para un caso nuevo, agregá un archivo `rutas-<tema>.mjs`
en vez de tocar los que están. Algunas rutas guardan estado en memoria: se reinicia
volviendo a levantar.

La forma de cada respuesta tiene que ser la del servidor real (`specs/00N-*/contracts/api.md`).
Si el servidor cambia, esta API se actualiza en el mismo cambio.

## Direcciones de la aplicación

La computadora y el celular no usan las mismas direcciones:

| Pantalla | Computadora | Celular |
|---|---|---|
| Catálogo | `productos`, `listas`, `duplicados` | `catalogo`, `catalogo/listas`, `catalogo/duplicados` |
| Vender | `vender` | `vender` |
| Depósito | `pedidos`, `compras` (Ingreso), `stock` (Inventario), `contar` (Estanterías) | `deposito/pedidos`, `deposito`, `deposito/stock`, `deposito/contar` |
| Más | `mas`, `resumen`, `usuarios`, `sesiones`, `roles`, `actividad`, `anomalias`, `tickets`, `procesos` | `mas`, `mas/negocio`, `mas/usuarios`, `mas/sesiones`, `mas/roles`, `mas/actividad`, `mas/anomalias`, `mas/tickets`, `mas/procesos` |

`--entera` (página completa) se cuelga en la computadora: ahí conviene bajar con
`--py "page.locator('...').scroll_into_view_if_needed()"`.

## El vínculo

Por omisión no hay celular vinculado. Para ver una pantalla de la computadora con su celular
vinculado (por ejemplo, «Escanear con el celular» en Vender), la captura guarda un identificador
de dispositivo que empiece con `con-celular` y recarga. Del otro lado, un celular con un
identificador que empiece con `celular-vinculado` y un token que empiece con `celular` queda
vinculado a esa computadora, y la API de mentira pasa el espejo entre los dos
(`api-de-mentira/rutas-w-espejo.mjs`; `PUT /mentira/espejo` lo vuelve a empezar):

```bash
python tests/capturas/capturar.py vender --compu \
  --py "page.evaluate('''() => localStorage.setItem('ferre.dispositivo', 'con-celular-1')''')" --py "page.reload()"
```

## El manual de uso

`tutorial/<capítulo>.py` arma las capturas y el clip de un capítulo del manual
(`specs/012-manual-de-uso/`) con la API de mentira y el cliente de acá, al ritmo de una persona,
con el puntero y los toques a la vista. Los deja en `microservices/web/public/manual/<capítulo>/`.
Se vuelve a correr cuando cambia alguna de esas pantallas:

```bash
tests/capturas/levantar.sh
uv run --with playwright==1.56.0 python tests/capturas/tutorial/formas_de_entrar.py   # «Entrar»: una sección por forma de entrar
uv run --with playwright==1.56.0 python tests/capturas/tutorial/espejo.py   # el clip de «quedan vinculados»
uv run --with playwright==1.56.0 python tests/capturas/tutorial/catalogo.py  # «Catálogo»: la pantalla Productos de la computadora
uv run --with playwright==1.56.0 --with pillow python tests/capturas/tutorial/catalogo_celular.py  # «Catálogo» en el celular
```

`catalogo_celular.py` le da al navegador una cámara de mentira con un código de barras EAN-13 de
verdad (lo dibuja él), que el lector de la aplicación lee: así se graban «Buscar escaneando» y
«Cargar el código». Sus marcas van en `manual-catalogo-celular-marcas.json`.

`catalogo.py` deja sus marcas en `manual-catalogo-marcas.json`, al lado de la pantalla del manual, y
con `SOLO_CAPTURAS=1` saca solo las capturas (los clips quedan como están). Para «Buscar
escaneando», `PUT /mentira/escanear` con `{ "codigo": "…" }` le manda a la computadora vinculada ese
código, como si lo hubiera leído el celular (`api-de-mentira/rutas-x-lector.mjs`).

`formas_de_entrar.py` escribe dónde van las marcas numeradas de cada captura (en porcentaje) y su
leyenda en `microservices/web/src/pantallas/compu/base/pantallas/manual-entrar-marcas.json`, que
lee la pantalla del manual: no hay que copiarlas a mano. La cámara del celular es de mentira (un
video con el código de la computadora); como el lector no lo descifra, el recorrido sigue solo
después de mostrarla. La huella no tiene clip: la lee el teléfono.

Va siempre contra la API de mentira (datos inventados): nunca contra un ambiente con datos reales.
Las pruebas de punta a punta no graban video ni usan estos recorridos (ADR-004).
