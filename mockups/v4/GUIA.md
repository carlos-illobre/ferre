# Guía de la maqueta v4 (base común)

## Carpetas
```
src/App.tsx                 rutas (#/camino → pantalla)            NO TOCAR
src/ruta.ts                 ir, enlace, useRuta, useParametro, cambiarParametro, useEsCelular   NO TOCAR
src/datos.ts                tipos, datos de ejemplo, formato, precio   NO TOCAR
src/almacen.ts              lo que dura entre pantallas              NO TOCAR
src/estructura/             menú, pestañas, destinos, conexión       NO TOCAR
src/piezas/                 piezas compartidas (se importan de "../piezas")   NO TOCAR
src/estilos/tokens.css      variables · base.css: estructura y piezas          NO TOCAR
src/pantallas/<Pantalla>.tsx + src/estilos/<pantalla>.css   ← lo tuyo, y solo lo tuyo
```
Pantallas y hojas: Vender/vender, VentasDelDia/ventas, Productos/productos, Recibir/recibir, Listas/listas,
Duplicados/duplicados, Stock/stock, Contar/contar, Negocio/negocio, Usuarios/usuarios, Actividad/actividad.
Terminadas (referencia de nivel, no tocar): Entrar, Mas y **Vender** (leé `Vender.tsx` y `vender.css` antes de empezar).
Si te falta algo de un archivo que no se toca (un ícono, un dato, una pieza), resolvelo en tu pantalla y avisalo en tu informe.

## Levantar y capturar
El servidor ya corre en http://127.0.0.1:5301/ (si no: `corepack pnpm run dev`). Tipos: `corepack pnpm exec tsc --noEmit`.
```
python capturar.py stock                              # 1366×768 y 390×844, estado normal
python capturar.py stock --estado vacio --celu        # un estado; --compu para la otra medida
python capturar.py ventas --clic "Anular" --nombre confirmar   # toca antes (repetible); --escribir "mecha"; --entera
```
Guarda en `$S/v4/<ruta>[-estado][-nombre]-celu|compu.png` y avisa: desborde al costado, letra < 14 px,
toques < 44 px y errores de consola. Tiene que decir «bien». No uses `pkill -f`.

## Piezas (`import { … } from "../piezas"`)
- `Pagina({ titulo, ancho?: "normal"|"angosto"|"completo", estados?, volver?, children })` — encabezado + contenido. Las pantallas de «Más» traen «Volver a Más» solas; para un paso interno: `volver={{ texto: "Volver a los sectores", alTocar }}`.
- `BarraDeAccion({ children })` — la acción pegada abajo sin tapar (último hijo): `<BarraDeAccion><Boton variante="principal" ancho>Registrar</Boton></BarraDeAccion>`
- `Boton({ variante?: "principal"|"secundario"|"peligro"|"texto", tam?: "chico"|"normal"|"grande", icono?, iconoFinal?, ancho?, …button })` — `<Boton tam="chico" onClick={…}>Anular</Boton>`. Sin `children` y con `aria-label` es un botón de ícono.
- `Icono({ nombre, tam?, grosor? })` — vender ventas productos recibir menu listas duplicados stock contar negocio usuarios actividad buscar escanear camara huella mas menos cerrar tilde flecha flecha-izquierda flecha-abajo flecha-arriba subir bajar basura deshacer editar unir separar filtro calendario salir usuario celular computadora reloj plata etiqueta codigo-de-barras qr candado alerta informacion error conexion sin-conexion guardado google.
- `Tarjeta({ variante?: "blanca"|"verde"|"plana", como?, className })` — `verde` es el bloque fuerte de Figma.
- `Lista` + `Renglon({ titulo, detalle?, inicio?, fin?, alTocar?, apagado? })` — `<Lista><Renglon titulo="Marta" detalle="marta@gmail.com" fin={<Boton tam="chico">Desactivar</Boton>} /></Lista>`; con `alTocar` todo el renglón es botón con flecha.
- `TituloDeSeccion({ titulo, detalle?, children })` — `<TituloDeSeccion titulo="Proveedores">4 listas</TituloDeSeccion>`
- `Pastilla({ tipo?: "bien"|"alerta"|"error"|"info"|"neutro", icono? })` — `<Pastilla tipo="error">Anulada</Pastilla>`
- `FotoDeProducto({ producto, tam?: "chica"|"mediana"|"grande" })` — la foto (en la maqueta, un dibujo según `producto.foto`); sin foto, marcador con cámara.
- `Iniciales({ nombre, tono?, forma?: "redonda"|"cuadrada", tam? })` · `Figura({ icono, tono?, tam? })` — tonos: naranja azul amarillo negro verde violeta (+ `marca`, `avatar` en Iniciales).
- `Campo({ etiqueta, error?, ayuda?, prefijo?, sufijo?, …input })` — `<Campo etiqueta="Costo" prefijo="$" inputMode="decimal" value={v} onChange={…} error={e} />`; `leerPesos("4.000")` → 4000.
- `Buscador({ valor, alCambiar, etiqueta, placeholder?, alEscanear?, alTeclear?, autoFocus?, ref? })`
- `Cantidad({ valor, alCambiar, etiqueta, decimal?, minimo?, paso?, tam?: "normal"|"grande" })` — `<Cantidad valor={n} alCambiar={setN} decimal={vaConDecimal(p.unidad)} etiqueta="Cantidad de …" />`
- `Segmentos({ opciones: {clave,nombre}[], elegido, alElegir, etiqueta, forma?: "fila"|"grilla" })` · `Margenes({ elegido, alElegir, etiqueta? })` (300/200/100/50/25 %).
- `Hoja({ abierta, alCerrar, titulo, pie?, children })` — `<dialog>`: abajo en celular, centrada en computadora. Una hoja cuenta como pantalla propia (puede tener su botón principal). Al abrirse enfoca lo que tenga `autoFocus`; si no, el primer campo; si no hay campos, la hoja (nunca la cruz).
- `Confirmar({ abierta, titulo, confirmar, alConfirmar, alCancelar, cancelar?, children })` — solo para lo irrecuperable.
- `Explicado({ valor, pasos, titulo?, className? })` — `<Explicado className="cifra" valor={pesos(c.valor)} pasos={c.pasos} titulo={p.nombre} />` con `c = precioDe(p)`. Vale dentro de un `<p>`; con `className="cifra"` sale en Space Grotesk.
- `Escaner({ abierto, alCerrar, alLeer, ejemplos?: {codigo,nombre}[] })` · `QrDeMaqueta({ lado? })`
- `Aviso({ tipo?: "error"|"alerta"|"info"|"bien", titulo?, accion?: {texto, alTocar}, children })` — mensaje en el lugar.
- `avisar(texto, { detalle?, tipo?, accion? })` — el aviso flotante de Figma, se va solo y al cambiar de pantalla: `avisar("Venta anulada")`. Si además navegás, llamá a `ir()` antes.
- `Vacio({ icono, titulo, accion?, principal?, children })` (`principal` = botón naranja, cuando el vacío es toda la pantalla) · `Cargando({ texto, detalle?, avance? })` · `ErrorDeCarga({ titulo?, alReintentar, children })`
- `Exito({ titulo, importe?, detalle?, tipo?: "bien"|"pendiente", boton, alSeguir })` — pantalla completa de «listo».
- `clases("a", cond && "b")` junta clases. Clases sueltas de base.css: `cifra` (importes en Space Grotesk), `detalle` (texto secundario), `solo-lectores`.

## Estados de maqueta
```tsx
const ESTADOS: EstadoDeMaqueta[] = [{ clave: "normal", nombre: "Normal" }, { clave: "vacio", nombre: "Sin ventas" }, { clave: "sin-conexion", nombre: "Sin conexión" }];
const estado = useEstadoDeMaqueta();              // "normal" si no hay nada elegido; viaja en #/ventas?estado=vacio
<Pagina titulo="Ventas del día" estados={ESTADOS}>…
```
La primera clave es siempre `normal`. `sin-conexion` (o cualquier clave que termine en `-sin-conexion`) pone solo el
encabezado en «Sin conexión · N cambios por enviar»: no lo dibujes vos; `useConexion()` (de `../estructura/conexion`) te dice `enLinea`.
Para cambiar de estado desde el código: `cambiarParametro("estado", "vacio")` (o `null`). Declaralos para lo que no se alcanza
tocando: vacío, cargando, error, sin conexión y variantes. El control lo dibuja `Pagina` (centro del encabezado en computadora;
dentro de la franja «Ambiente de prueba» en el celular); no lo muevas ni lo copies.

## Datos y almacén
- `datos.ts`: `pesos(4000)` "$4.000" · `pesosConCentavos(1649.14)` "$1.649,14" · `cantidad(2.5,"kilo")` "2,5 kilos" · `numero` · `hora(date)` · `dia(date)` · `porUnidad` · `vaConDecimal` · `iniciales` · `precioDeVenta(costo, margen)` y `precioDe(producto)` → `{ valor, pasos } | null` · `subtotalDe` · `buscarProductos(lista, texto)` · `buscarPorNombre` · `usuarioDe/proveedorDe/clienteDe(id)` · `totalDeCompra(compra)` (el único lugar donde se calcula lo que costó una compra) · `MEDIOS_DE_PAGO`, `nombreDelMedio`, `MARGENES`, `YO`, `TOTAL_DE_PRODUCTOS`, `CODIGO_DESCONOCIDO`.
- `almacen.ts`: `const ventas = useAlmacen((a) => a.ventas)` — el selector devuelve un pedazo existente, nunca un objeto nuevo (`.filter` va después, afuera). Partes: `productos clientes proveedores usuarios sesiones sectores venta ventas compras movimientos actividad noLlevaron porEnviar`.
- Acciones: `anularVenta(id, motivo)` · `cambiarProducto(id, cambios)` · `moverStock(id, cambio, que)` · `registrarCompra(proveedorId, renglones)` · `anularCompra(id)` · `totalesDe(ventas)` · `nuevoId("x")` y las de la venta en curso (`agregarAVenta`, `cobrarVenta`, …).
- Datos que son de todos: `Proveedor` trae `diasDeLaLista`, `conIva` y `descuento` (leelos del almacén; `proveedorActual(id)` fuera de un componente); `Consulta` («No llevó») trae `precio`; `USUARIOS` incluye a Ramiro, desactivado.
- Para todo lo demás: `cambiarAlmacen((a) => ({ ...a, usuarios: a.usuarios.map(…) }))`. Lo que solo vive en tu pantalla va en `useState`.
- Una venta cobrada en Vender ya aparece en `ventas`, descuenta `productos[].stock` y suma un `movimiento`.

## Variables CSS (tokens.css)
- Color: `--verde --verde-2 --verde-3 --sobre-verde --sobre-verde-2 · --naranja --naranja-fuerte --naranja-texto --naranja-suave --naranja-borde · --amarillo --amarillo-suave --amarillo-borde --amarillo-texto · --fondo --superficie --superficie-2 --borde --borde-fuerte --texto --texto-2 --texto-apagado --apagado-fondo --apagado-texto · --bien|alerta|peligro|info` con `-texto -suave -borde` · `--tono-<tono>` y `--tono-<tono>-fondo`.
- Letra: `--letra-detalle` (14, el mínimo) `--letra-chica` (15) `--letra` (16; 17 en celular) `--letra-grande` (18) `--titulo-3` (18) `--titulo-2` (22) `--titulo-1` (26) `--cifra` (32) `--cifra-grande` (52) · `--fuente --fuente-titulos` · `--peso-normal|medio|fuerte|boton`.
- Espacio: `--e-1` 4 · `--e-2` 8 · `--e-3` 12 · `--e-4` 16 · `--e-5` 20 · `--e-6` 24 · `--e-8` 32 · `--e-10` 40 · `--e-12` 48 · `--margen-pagina`.
- Radio: `--radio-chico` 8 · `--radio` 10 · `--radio-tarjeta` 12 · `--radio-grande` 14 · `--radio-redondo`.
- Tamaño: `--toque` 44 · `--alto-boton` 48 · `--alto-boton-grande` 56 · `--alto-campo` · `--alto-encabezado` · `--alto-pestanas` (0 en computadora) · `--grosor-borde`.
- Capas: `--capa-encabezado` 5 · `--capa-barra-fija` 10 · `--capa-pestanas` 30 · `--capa-flotante` 50. Movimiento: `--rapido --suave`.

## Contraste (WCAG)
`python contraste.py [pantalla]` recorre lo que se dibuja y avisa lo que no llega (4,5:1 texto; 3:1 texto grande, íconos y bordes de controles). Tiene que decir «Todo cumple». Los colores se cambian solo en tokens.css.

| Par | Colores | Razón |
|---|---|---|
| Texto / texto de detalle sobre blanco | `--texto` #18201e · `--texto-2` #4a5451 | 16,6 · 7,8 |
| Texto de detalle sobre el fondo y sobre `--superficie-2` | `--texto-2` sobre #f5f6f2 · #f2f5f0 | 7,2 · 7,1 |
| Botón principal (blanco sobre naranja) / al pasar el cursor | `--naranja` #d83f0e · `--naranja-fuerte` #b9350a | 4,5 · 5,9 |
| Naranja como texto: sobre blanco / fondo / opción elegida | `--naranja-texto` #c2370b | 5,5 · 5,0 · 4,9 |
| Botón rojo de `Confirmar` / pastilla «Anulada» | `--peligro` #d63c29 · `--peligro-texto` sobre `--peligro-suave` | 4,6 · 5,2 |
| Pastilla de alerta y «Ambiente de prueba» / aviso de alerta | `--amarillo-texto` #6b5000 sobre sus fondos suaves | 6,9 · 7,2 |
| Pastillas «bien» / información | `--bien-texto` · `--info-texto` sobre sus fondos suaves | 5,5 · 5,8 |
| Sobre el verde: texto / secundario / secundario en cajas | `--sobre-verde` · `--sobre-verde-2` sobre `--verde` · `--verde-2` | 13,9 · 7,9 · 6,1 |
| Placeholder / botón deshabilitado | `--texto-apagado` #66706d · `--apagado-texto` sobre `--apagado-fondo` | 5,1 · 5,3 |
| Borde de campos y botones: sobre blanco / sobre el fondo | `--borde-fuerte` #7c9085 | 3,4 · 3,1 |
| Foco de teclado: sobre blanco / fondo / verde | `--foco` #1463d6 · `--foco-sobre-verde` #ffd65c | 5,5 · 5,1 · 9,9 |

Lo que se toca lleva `--borde-fuerte` (no `--borde`, que es para tarjetas y separadores). Lo deshabilitado va con `--apagado-fondo` y `--apagado-texto`, nunca con `opacity`.

## Reglas de estilo
1. Clases con el prefijo de tu pantalla: `.stock__cifras`, `.stock__renglon--negativo`. No redefinas clases de base.css de forma global; si hace falta ajustar una pieza, que sea dentro de una clase tuya (`.stock__cifras .tarjeta`).
2. Nada de valores sueltos: colores, letras, radios y espacios salen de las variables. Solo se aceptan medidas propias de una grilla (anchos de columna, altos de figura).
3. Corte de celular: `@media (max-width: 700px)`; en JS, `useEsCelular()`. En celular nada se va al costado: grillas con `minmax(0, 1fr)`.
4. Nada por debajo de `--letra-detalle`; todo lo que se toca mide `--toque` o más y es `button`/`a` (usá `Boton`).
5. Un solo `Boton variante="principal"` por pantalla. «Anular», «Cerrar», «Separar», «Desactivar»: `Boton` secundario `tam="chico"`; el rojo es solo el de `Confirmar`.
6. Sin sombras en tarjetas (borde de 1 px). Sombra solo en lo que flota. Sin emojis, sin MAYÚSCULAS, sin «→» en los textos.
7. Lo fijo no tapa: usá `BarraDeAccion` (o `position: sticky`), no `position: fixed`.
8. Importes de venta con `pesos`, costos con `pesosConCentavos`; lo que se pueda explicar, con `Explicado`.
9. Errores en el lugar con `Aviso` o el `error` de `Campo`, diciendo qué hacer. Confirmación solo para lo irrecuperable.
10. Las pantallas provisorias tienen el aspecto de Figma ya portado: completá recorridos y estados sin perderlo; sacá lo que sobre.
