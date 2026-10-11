# Capturas de la interfaz, sin Docker

Para mirar una pantalla (o compararla con su maqueta) no hace falta levantar el stack: una
API de mentira con datos de ejemplo y el cliente web en modo desarrollo alcanzan. Sirve para
diseñar y para revisar; no reemplaza a las pruebas.

```bash
tests/capturas/levantar.sh                      # API de mentira (:8799) y cliente (:5199)
python tests/capturas/capturar.py vender        # captura #/vender de la v4, en las dos medidas
python tests/capturas/capturar.py stock --celu --py "page.get_by_test_id('stock').first.click()"
BASE=http://localhost:5199/v1/ python tests/capturas/capturar.py productos   # otra versión
tests/capturas/levantar.sh --apagar
```

- **Qué necesita:** Node, las dependencias del repo instaladas y Python con Playwright
  (`pip install playwright && playwright install chromium`).
- **Dónde quedan:** en `tests/capturas/salida/` (no se sube), como `<nombre>-compu.png`
  (1366×768) y `<nombre>-celu.png` (390×844).
- **Qué avisa:** desplazamiento hacia el costado, texto de menos de 14 px, objetivos táctiles
  de menos de 44 px en el celular y errores de consola. Si no avisa nada, dice «bien».
- **Opciones:** `--celu`, `--compu`, `--nombre`, `--sin-sesion`, `--sin-conexion`, `--entera`
  y `--py "código"` (repetible) para dejar la pantalla en el estado que hace falta;
  `python tests/capturas/capturar.py -h` las explica.
- **La sesión** se simula: no pasa por Google.

## La API de mentira

`api-de-mentira/servidor.mjs` carga todos los `rutas-*.mjs` de su carpeta, en orden
alfabético; si dos definen la misma ruta, gana el último. Cada archivo exporta
`{ "GET /ruta/:id": ({ params, query, body }) => valor | [estado, valor] }`. Los datos son
inventados (correos `@ferre.test`). Para un caso nuevo, agregá un archivo `rutas-<tema>.mjs`
en vez de tocar los que están. Algunas rutas guardan estado en memoria: se reinicia
volviendo a levantar.

La forma de cada respuesta tiene que ser la del servidor real (`specs/00N-*/contracts/api.md`).
Si el servidor cambia, esta API se actualiza en el mismo cambio.
