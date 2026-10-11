# Guía de la v4 (app real, en `/v4/`)

La interfaz sale de la maqueta aprobada (`mockups/v4/`, publicada en `/v4-maqueta/`); la lógica, de `src/v2/pantallas/`.
Lo compartido se usa tal cual desde `src/` (`api`, `catalogo`, `cola`, `almacen`, `sesion`, `unidades`, `puesto`…). La v4 no importa nada de `src/v2/`.

## Estructura
```
v4/index.html → src/v4/main.tsx            entrada (fuentes, tokens.css, base.css, service worker)   NO TOCAR
src/v4/App.tsx                             sesión + una pantalla por dirección                       NO TOCAR
src/v4/Estructura.tsx                      menú lateral, pestañas, menú del usuario                  NO TOCAR
src/v4/rutas.ts                            ir, enlace, useRuta, useParametro, cambiarParametro, useEsCelular, PRINCIPALES, DE_MAS   NO TOCAR
src/v4/conexion.ts · formato.ts · dispositivo.ts · usuario.ts · pruebas.tsx                           NO TOCAR
src/v4/piezas/                             piezas compartidas (se importan de "../piezas")           NO TOCAR
src/v4/estilos/tokens.css · base.css       variables · estructura y piezas                           NO TOCAR
src/v4/pantallas/<Pantalla>.tsx + <Pantalla>.test.tsx + src/v4/estilos/<pantalla>.css   ← lo tuyo, y solo lo tuyo
```
Terminadas (referencia de nivel, no tocar): `Entrar`, `OfrecerHuella`, `VincularCelular`, `Mas` y **`Vender`** (leé `Vender.tsx` y `Vender.test.tsx` antes de empezar).
Si te falta algo de un archivo que no se toca (un ícono, una pieza, un formato), resolvelo en tu pantalla y avisalo en tu informe.

## Quién toca qué
| | Pantallas (`pantallas/X.tsx` + `X.test.tsx`) | Hojas (`estilos/`) | Lógica de la v2 |
|---|---|---|---|
| A | `VentasDelDia`, `Productos`, `Listas` | `ventas.css`, `productos.css`, `listas.css` | `VentasDeHoy`, `Productos`, `Listas` |
| B | `Recibir`, `Stock`, `Contar`, `Duplicados` | `recibir.css`, `stock.css`, `contar.css`, `duplicados.css` | `Compras`, `Stock`, `Contar`, `Duplicados`, `deposito-comun` |
| C | `Negocio`, `Usuarios`, `Actividad` | `negocio.css`, `usuarios.css`, `actividad.css` | `Resumen`, `Usuarios`, `Actividad`, `negocio-comun` |

Cada pantalla ya está enrutada y exporta su componente **con nombre y sin props** (`export function Stock()`): no cambies el nombre del archivo ni el de la exportación.
Su hoja de estilos ya es la de la maqueta, copiada: solo hay que conectarla (y sumarle al final lo que la realidad pida).
Lo que varias pantallas tuyas compartan va en un archivo tuyo (`pantallas/comun-a.ts`, `comun-b.ts`, `comun-c.ts`), no en uno ajeno.

## Enrutado
`#/vender`, `#/ventas`, `#/productos`, `#/recibir`, `#/mas`, `#/listas`, `#/duplicados`, `#/stock`, `#/contar`, `#/negocio`, `#/usuarios`, `#/actividad` y `#/vincular-celular?codigo=…`.
`ir("stock", { producto: id })` navega; `enlace("stock")` da el `href`; `useParametro("producto")` lee; `cambiarParametro("dia", "2026-10-09")` cambia sin sumar historial.
Al cambiar de dirección la pantalla se desmonta: lo que tiene que durar entre pantallas va en una variable del módulo (como la venta en curso de `Vender.tsx`).
`useEsCelular()` es `true` hasta 700 px, el mismo corte que las hojas de estilo (`@media (max-width: 700px)`).

## Piezas (`import { … } from "../piezas"`)
Misma firma que en la maqueta (su `GUIA.md` las explica una por una), con estas diferencias:
- **No existen** `EstadosDeMaqueta`, `useEstadoDeMaqueta` ni la prop `estados` de `Pagina`: los estados salen de la carga, de `useConexion()` y de las respuestas.
- **`testId`** (nuevo, optativo) en `Pagina` (va en `<main>`), `BarraDeAccion`, `Hoja`, `Confirmar`, `Aviso`, `Vacio`, `Cargando`, `ErrorDeCarga`, `Pastilla`, `Renglon` (con `alTocar` va en el botón), `Buscador`, `Cantidad`, `Qr`. `Boton` y `Campo` aceptan `data-testid` directo, como todo atributo.
- `Pagina({ titulo, ancho?, volver?, className?, testId? })`. El encabezado muestra la conexión real (`data-testid="conexion"`) y el avatar con el usuario de la sesión.
- `Campo` y `Buscador` reciben `ref` con `forwardRef` (React 18); se usan igual: `<Buscador ref={caja} … />`.
- `Buscador` trae `data-testid="busqueda"` (cambialo con `testId`) y su botón de escanear, `escanear`.
- `Cantidad`: `data-testid="cantidad"`; sin `decimal`, lo que venga después de una coma o un punto se descarta («2,7» es 2).
- `Segmentos({ …, testId? })`: cada opción lleva `<testId>-<clave>`. `Margenes`: cada botón lleva `margen-<n>`.
- `Confirmar({ …, ocupado?, testId? })`: `ocupado` deshabilita el botón rojo mientras se envía; el botón rojo lleva `confirmar-si`.
- `Explicado`: sin pasos es solo el número (no se puede tocar); lleva `explicacion` y su hoja `hoja-explicacion`.
- `Escaner({ abierto, alCerrar, alLeer, seguido?, ultimo? })`: cámara real. Se cierra sola al leer, salvo con `seguido` (muestra `ultimo`). No hay `ejemplos`. Sin cámara, queda «O escribí el código» (`codigo-manual`).
- `Qr({ texto, lado?, etiqueta?, testId? })` reemplaza a `QrDeMaqueta`: un QR real del texto.
- `FotoDeProducto({ producto: { foto_url?, descripcion }, tam? })`: la foto real (`urlDeFoto`); sin foto o si no carga, el marcador con la cámara. Ya no hay dibujos ni tono.
- `Iniciales` y `Figura` igual; el `tono` ya no viene en los datos: `tonoDe(clave)` da siempre el mismo para la misma clave (`tono={tonoDe(proveedor.id)}`).
- `Exito` lleva `exito` y su botón `cerrar-exito`; `ErrorDeCarga`, `error-de-carga` y `reintentar`; `Cargando`, `progreso`.
- `avisar(texto, { detalle?, tipo?, accion? })` igual; el aviso lleva `data-testid="mensaje"` y dura `DURACION_DEL_AVISO` (6 s). Si navegás, llamá a `ir()` antes.
- Sin cambios: `Boton`, `Icono` (sin el ícono `maqueta`), `Tarjeta`, `Lista`, `TituloDeSeccion`, `Hoja`, `Aviso`, `Vacio`, `Cargando`, `leerPesos`, `clases`.

## Conexión, usuario y formato
- `useConexion()` (`../conexion`) → `{ enLinea, porEnviar }`: uno solo para toda la app; reintenta la cola al volver internet y cada minuto. No escuches `online`/`offline` por tu cuenta ni dibujes el estado: ya está en el encabezado.
- Lo del mostrador se guarda con `enviarOEncolar(tipo, metodo, ruta, cuerpo)` (`../../cola`): devuelve `{ encolado }` y tira `ErrorApi` si el servidor lo rechaza. Lo que necesita conexión lo dice antes (`!enLinea` → `Aviso` y botón deshabilitado).
- `useUsuario()` (`../usuario`) → `{ nombre, correo, rol: "Administrador", salir } | null`. Para el id o la sesión actual, `useSesion()` de `../../sesion` (en las pruebas hay que simularlo). El rol se muestra siempre «Administrador».
- `../formato`: `pesos(4000)` "$4.000" (acepta número, texto de la API o `null` → «—») · `pesosConCentavos(1649.14)` "$1.649,14" · `numero(2.5)` "2,5" · `cantidad(2.5, "kg")` "2,5 kilos" · `nombreDeUnidad("kg", 2)` · `porUnidad("kg")` "el kilo" · `vaConDecimal(unidad)` · `unidadValida` · `hora(fecha)` · `dia(fecha)` · `fecha("2026-10-09")` · `haceCuanto(fecha)` · `porcentaje` · `iniciales` · `MEDIOS_DE_PAGO`, `nombreDelMedio("mercado_pago")` · `MARGENES`.
- Las unidades son las de la API (`"unidad" | "kg" | "m" | "l"`, `../../unidades`) y los medios de pago también (`efectivo`, `mercado_pago`, `tarjeta`, `cuenta_corriente`).
- El precio de venta y sus pasos salen de `@ferre/calculo-de-precios` (`precioDeVenta`, `subtotalDeRenglon`, `margenReal`); el producto de la API es `Producto` de `../../pantallas/Productos`.

## Levantar, capturar y comparar con la maqueta
`S` = el scratchpad del encargo. Ya corren la API de mentira (8799) y el Vite del cliente (5199). Si no:
```
(cd $S/mock && nohup node servidor.mjs 8799 > $S/mock.log 2>&1 &)
cd clientes/gestion-del-local-web && VITE_API_URL=http://localhost:8799 VITE_GOOGLE_CLIENT_ID=captura corepack pnpm exec vite --port 5199 --strictPort
```
Rutas o casos que falten en el mock: en un archivo nuevo `$S/mock/rutas-v4-<vos>.mjs`, y reiniciarlo (ver el encargo).
```
python $S/captura-v4.py stock                                   # 1366×768 y 390×844 → $S/v4-app/stock-compu.png y -celu.png
python $S/captura-v4.py stock --celu --nombre stock-corregir --py 'page.get_by_test_id("corregir").first.click()'
python $S/captura-v4.py ventas --sin-conexion --nombre ventas-sin-conexion     # corta la red después de cargar
python $S/captura-v4.py productos --entera                      # --sin-sesion para la entrada; --py se puede repetir
python $S/hoja-v4.py $S/v4-app/_comparar.png 680 $S/v4/stock-compu.png stock-compu.png   # maqueta y app, lado a lado
```
Avisa: desplazamiento hacia el costado, textos de menos de 14 px, toques de menos de 44 px (en el celular) y errores de consola. Tiene que decir «bien» (un 4xx que provocaste a propósito aparece como error de consola: es esperable).
Las capturas de la maqueta ya están en `$S/v4/<ruta>[-estado]-compu|celu.png`; para sacar otras: `cd mockups/v4 && corepack pnpm run dev` (5301) y `python capturar.py …`.
Abrí las dos y comparalas: misma disposición, tamaños, colores y textos. Lo que la API no tiene se saca limpio y se anota en el informe.

## Pruebas (vitest + testing-library; el patrón está en `pantallas/Vender.test.tsx`)
```tsx
const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../../api", async (original) => ({ ...(await original<typeof import("../../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
const enviarOEncolar = vi.hoisted(() => vi.fn(async () => ({ encolado: false })));
vi.mock("../../cola", () => ({ enviarOEncolar: (...a: unknown[]) => enviarOEncolar(...a), enviarPendientes: vi.fn(async () => 0), pendientes: vi.fn(async () => []), alCambiarLaCola: () => () => undefined }));
import { dibujar } from "../pruebas";            // después de los vi.mock
apiFalsa.mockImplementation(async (ruta: string) => (ruta.startsWith("/stock") ? { productos: [] } : []));
dibujar(<Stock />, "stock");                      // la dibuja en #/stock, con usuario y con los avisos de avisar() a la vista
```
- El mock de `../../cola` tiene que traer siempre `pendientes` y `alCambiarLaCola` (los usa el encabezado). Un error del servidor: `new ErrorApi(409, "…")`; sin red: `new TypeError("Failed to fetch")`.
- Si usás `useCatalogo`, simulalo con `catalogoFalso` y `producto` de `../../pruebas/catalogo-falso` (como `Vender.test.tsx`).
- Sin conexión: `vi.spyOn(navigator, "onLine", "get").mockReturnValue(false)` antes de `dibujar`, o `window.dispatchEvent(new Event("offline"))`.
- En jsdom `useEsCelular()` da `false` (computadora) y las hojas se abren sin `showModal`: su contenido está en el documento solo mientras están abiertas.
- Correr: `corepack pnpm exec vitest run src/v4/pantallas/Stock.test.tsx` · tipos: `corepack pnpm exec tsc --noEmit` (TypeScript estricto, sin `any`).

## `data-testid`
- Conservá los de la v2 en los elementos equivalentes (buscalos en `src/v2/pantallas/<la tuya>.tsx`): las pruebas de punta a punta se van a portar.
- Ya puestos por la base: `ambiente`, `conexion`, `usuario`, `menu-usuario`, `salir`, `avatar`, `salir-celular`, `menu-<camino>`, `pestana-<camino>`, `mas-<camino>`, `volver`, `mensaje`.
- Los nuevos: en minúscula y con guiones, por lo que son (`anular`, `hoja-anular`, `motivo`), no por cómo se ven; en listas, el mismo en cada fila (`venta`, `item`) y se busca adentro con `within`.
- Las hojas llevan `hoja-<qué>`; los avisos de error, `error-<qué>`.

## Reglas (las de la maqueta, que siguen valiendo)
1. Clases con el prefijo de tu pantalla (`.stock__cifras`). No redefinas clases de `base.css` de forma global.
2. Colores, letras, radios y espacios solo por variables de `tokens.css`. Sin estilos en línea salvo valores dinámicos.
3. En el celular nada se va al costado (`minmax(0, 1fr)`); nada por debajo de `--letra-detalle`; todo lo que se toca mide `--toque` o más.
4. Un solo `Boton variante="principal"` por pantalla; el rojo es solo el de `Confirmar`, y solo para lo irrecuperable. Sin `window.alert/confirm/prompt`.
5. Lo fijo no tapa: `BarraDeAccion` o `position: sticky`. Errores en el lugar (`Aviso` o el `error` de `Campo`), diciendo qué hacer.
6. Importes de venta con `pesos`, costos con `pesosConCentavos`; lo que se pueda explicar, con `Explicado`.
7. Código y comentarios en castellano, pocos comentarios y que digan el porqué. No uses git ni instales dependencias.
