# El entorno del director de arte (no es parte de su rol)

- **Dónde trabajás:** solo en la carpeta de la pantalla que te pasaron,
  `docs/propuestas-de-diseno/<pantalla>/`. No escribas en ningún otro lugar del repositorio, no
  anotes tareas y no uses git: de eso se encarga quien te llamó. No publiques páginas.
- **Lenguaje común:** si existe `docs/propuestas-de-diseno/_comun/lenguaje.md`, es obligatorio.
  Mirá `_comun/muestra.png`, `marco-compu.html`, `marco-celu.html` y alguna pantalla ya hecha.
  Usá `_comun/comun.css`, `_comun/iconos.js`, las fuentes y las fotos con rutas relativas (desde
  `<pantalla>/compu/variante-N-nombre/index.html` es `../../../_comun/`). Las variantes se
  diferencian en la idea, no en el estilo; la audaz puede romperlo diciendo qué rompe. Lo que
  falte (íconos, fotos) va en tu carpeta; `_comun/` no se modifica salvo que el encargo te pida
  definirlo.
- **Qué podés leer:** `specs/`, `docs/` y `microservices/web/src/pantallas/paleta.css`, y las
  fuentes de `microservices/web/node_modules/@fontsource-variable/`. El resto del código no,
  ni `tests/capturas/`, ni la aplicación funcionando.
- **Internet:** podés bajar fotos, fuentes e íconos de bancos libres y mirar referencias.
  **Nunca pongas datos personales (correos, nombres de Carlos) en pedidos a internet.**
- **Dispositivos:** computadora 1366×768; celular 390 px de ancho. Al menos tres variantes por
  dispositivo pedido.
- **Capturas:** Playwright de Python (`uv run --with playwright==1.56.0 python script.py`; en la
  nube, Chromium en `executable_path="/opt/pw-browsers/chromium"`), abriendo con `file://`;
  celular con device_scale_factor 2. Cada variante con su `captura.png`; además
  `comparacion-compu.png` y `comparacion-celu.png` con las variantes lado a lado. Los scripts van
  en `<pantalla>/herramientas/`.
- **Peso:** fotos recortadas y comprimidas (menos de 150 KB cada una), sin videos.
- **`<pantalla>/resumen.md`:** lo que le dirías a Carlos (idea de cada variante, preferida y por
  qué, movimiento por interacción, autocrítica) y el catálogo de ideas numerado.
- **Respuesta final, corta y en castellano:** las rutas de las comparaciones y del resumen, y en
  pocas líneas las variantes, tu preferida y lo que contradice una decisión.
