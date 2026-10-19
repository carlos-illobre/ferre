# Lenguaje visual de Ferrebress: «Mostrador» (oficial)

**Es el lenguaje oficial de Ferrebress** (decisión 115, Carlos, 2026-10-19): la paleta, la
tipografía, los íconos, las piezas, el movimiento y el marco de esta guía son los que toma **por
defecto cualquier pantalla nueva o rediseñada**, en la computadora y en el celular. Solo se cambia
si el director de arte (`/director-de-arte`) propone algo superador y Carlos decide que lo es; en
ese caso se cambia acá, con el número de la decisión.

En esta carpeta: `comun.css` (las variables y las piezas, la fuente de verdad de los valores),
`muestra.png` (todo aplicado) y `marco-compu.png` / `marco-celu.png` (el marco de la
aplicación). Las maquetas de las propuestas, con los íconos, las fuentes y las fotos, están en
`microservices/web/public/maquetas/_comun/` mientras duren (decisión 113).

La aplicación de hoy todavía usa la paleta anterior (`docs/sistema-visual.md`, «Paleta»): pasa a
este lenguaje pantalla por pantalla, a medida que se programan las propuestas elegidas.

---

Guía corta para quien diseñe cualquier pantalla. Mirá primero `muestra.png` (todo esto aplicado) y
partí de `marco-compu.html` o `marco-celu.html`.

**La idea en una línea:** papel cálido y tarjetas blancas; pino dice «dónde estoy», naranja dice
«esto es lo que sigue»; ámbar, rojo y verde son señales chicas, nunca fondos.

## Cómo enlazarlo

```html
<link rel="stylesheet" href="../../_comun/comun.css">   <!-- variables, piezas, marco y la fuente -->
<script src="../../_comun/iconos.js"></script>           <!-- <i class="i" data-i="scan-barcode"></i> -->
<img src="../../_comun/fotos/martillo.webp">              <!-- fotos de producto ya recortadas -->
```

Ajustá la cantidad de `../` a tu profundidad (Vender está un nivel más abajo: `../../../_comun/`).
No copies colores sueltos: usá siempre `var(--nombre)`.

## Paleta (cada color tiene un trabajo)

| Uso | Variable | Valor | Cuándo |
|---|---|---|---|
| Fondo de la app | `--fondo` | #F4F2EC | Siempre. Nunca un fondo de color ni oscuro de base |
| Rellenos | `--hundido` / `--hundido-2` | #ECE9E1 / #E3DFD5 | Azulejo de la foto, segmentos, campo de solo lectura |
| Tarjetas | `--superficie` | #FFFFFF | Tarjetas, renglones, hojas, campos |
| Bordes | `--borde` / `--borde-fuerte` | #E6E2D8 / #CEC8BA | Tarjeta / campo y botón común |
| Texto | `--tinta` / `--texto-2` / `--texto-3` | #1A1D1B / #545955 / #6B706B | Principal / detalle / lo menos importante |
| **Marca, lugar** | `--pino` (+ `-2`, `-suave`, `-texto`) | #12382F | Menú y pestaña elegidos, chip elegido, botón oscuro (escanear), foco |
| **Acción** | `--accion` (+ `-fuerte`, `-suave`, `-texto`) | #E8541C | **Una sola acción principal por pantalla** (Cobrar, Confirmar). Insignias de cantidad. Parte activa del menú del celular |
| **Urgente** | `--urgente` (+ `-suave`, `-texto`) | #F0A20F | Mirá esto pronto, no frena: sin precio, stock bajo, por enviar, no es múltiplo de $1.000 |
| **Error** | `--error` (+ `-suave`, `-texto`) | #D7372A | Está mal o frena: stock negativo, rechazo, anulada, borrar |
| **Logro** | `--logro` (+ `-suave`, `-texto`) | #1E9E62 | Salió bien o hay: con stock, en línea, en espejo, venta registrada |
| Medios de pago | `--efectivo` `--mp` `--tarjeta` `--cuenta` (+ `-suave`) | #23845A #0A72C2 #6A4BD1 #9A5B2E | Solo para el medio de pago, siempre el mismo (decisión 108) |

Reglas: el color fuerte va en piezas chicas (pastilla, insignia, un botón, el número de un dato).
Texto sobre un `-suave` va en su `-texto`. Una pantalla, un panel o un fondo nunca llevan color
propio. Lo oscuro (pino lleno o negro) solo cuando la tarea lo pide: la cámara, una tostada, el
botón de escanear.

## Tipografía

**Manrope** (la de la aplicación), variable, en `_comun/fuentes/`. Una sola familia. Números
tabulares (ya activados en `body`). El «$» va chico con `<span class="peso">$</span>`.

| Clase | Tamaño / peso | Para |
|---|---|---|
| `.t-total` | 48 / 800 | El número que manda en la pantalla (el total a cobrar) |
| `.t-numero` | 32 / 800 | Números de resumen |
| `.t-titulo` | 28 / 800 | Título de pantalla |
| `.t-seccion` | 20 / 750 | Título de sección (sin mayúsculas, decisión 105) |
| `.t-renglon` | 16 / 700 | Nombre de producto, título de renglón |
| `.t-cuerpo` | 16 / 500 | Texto que explica |
| `.t-detalle` | 14 / 500, `--texto-2` | Marca, código, proveedor, explicaciones cortas |
| `.t-etiqueta` | 14 / 650, `--texto-2` | Rótulo arriba de un número |

**Nada de menos de 14 px.** Mayúsculas solo al principio. Celular: mismos tamaños; los textos se
resumen (decisión 47), no se achican.

## Íconos

**Lucide** (ISC), trazo 2, esquinas redondeadas. 96 en `_comun/iconos/` y todos dentro de
`iconos.js`. Tamaños: `.i` 20 (compu), `.i-l` 24 (celu y menú), `.i-s` 16 (dentro de botones
chicos y pastillas), `.i-xl` 32. Siempre del color del texto que acompañan. Los de cada parte:
Vender `shopping-cart`, Catálogo `tags`, Depósito `package`, Negocio `chart-column`, Más `menu`
(celu) / `ellipsis` (compu). Si falta uno, bajalo de `unpkg.com/lucide-static@0.460.0/icons/` a
`_comun/iconos/` y corré `python3 herramientas/iconos.py _comun` desde `maquetas/` (o agregalo a mano en `iconos.js`).

## El molde: renglón, dato y resumen

- **Renglón** (`.renglon`): foto o ícono 56 px sobre `--hundido` · título (16/700) y detalle
  (14, «Marca · Código · Est. A-03-12») · **el número que importa en su caja** (`.dato`, teñida por
  su significado: `logro`, `urgente`, `error`) · la acción (botón chico) · la flecha. Siempre en
  ese orden; entre renglones, 8 px.
- **Foto** (`.foto`): producto recortado, centrado, con sombra propia, sobre el azulejo hundido.
  Todas iguales: nunca una foto con su fondo original. Sin foto: `.foto-icono` con el ícono.
- **Resumen** (`.resumen`): ícono en círculo + etiqueta + número 24/800 (+ `.barra` de avance).
  Neutro en blanco; con significado, el fondo `-suave` entero (como «Sin stock» en la
  referencia). Van arriba de todo, en una fila.
- **Orden de una pantalla:** resumen (números) → una visualización chica (barras, avance) →
  filtros → la lista.

## Botones

| Clase | Aspecto | Cuándo |
|---|---|---|
| `.btn.btn-accion` | Naranja lleno, sombra naranja | La acción principal, una por pantalla |
| `.btn.btn-oscuro` | Pino lleno | La herramienta fuerte: escanear, abrir la cámara |
| `.btn` | Blanco, borde, sombra 1 | Acciones comunes |
| `.btn.btn-suave` | Hundido, sin borde | Terciarias, dentro de tarjetas |
| `.btn.btn-fantasma` | Solo texto | Vaciar, No llevó, Cancelar |
| `.btn.btn-peligro` | Rojo suave | Anular, quitar |

Altos: **44** (normal, mínimo táctil), **56** (`.grande`, la acción principal), **36**
(`.chico`, secundarios; decisión 104). Radio 12. En la computadora cada botón muestra su tecla con
`.kbd` (Alt + letra, F2 cobrar, F5–F8 medios; decisión 80).

## Pastillas, chips y segmentos

- `.pastilla` (28 px, redonda, 14/650): estado de algo. Variantes `logro`, `urgente`, `error`,
  `pino`, `accion`, `contorno`; con `.punto` delante para un estado vivo («En línea»).
- `.insignia`: número naranja chico (renglones de la venta en el menú).
- `.chip` (40 px): filtros de una lista; el elegido, pino lleno con su número «Todos (18)».
- `.segmentos`: elegir uno de pocos (margen, unidad, pestañas del celular); el elegido, blanco
  con sombra 1.
- `.cantidad`: − n + con la unidad («un.», «kg»).

## Espaciado, radios y relieve

- Múltiplos de 4: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 (`--e1`…`--e12`). Entre tarjetas 8;
  dentro de una tarjeta 12–16; entre bloques 20–24; margen de pantalla 16 (celu) y 32 (compu).
- Radios: 8 (foto chica, tecla) · 12 (botón, campo, foto) · 16 (tarjeta) · 24 (hoja) · redondo
  (pastilla, chip).
- Relieve, solo tres: `--sombra-1` tarjetas y renglones (con borde de 1 px); `--sombra-2` paneles
  que mandan (el panel de cobro) y botón oscuro; `--sombra-3` lo que flota (hojas, menús,
  sugerencias, tostadas). Nada de bordes gruesos ni de sombras de color, salvo `--sombra-accion`.

## Movimiento

Curvas y tiempos en variables: `--curva` (entra), `--curva-salida`, `--rebote` (lo que se suma);
`--t-micro` 120 ms (apretar), `--t` 200 ms (aparecer), `--t-nav` 320 ms (pantallas y hojas).
Solo `transform` y `opacity`. Con «reducir movimiento» o Animaciones apagadas, nada se mueve.

- Apretar: el botón baja a 97 % y vuelve (120 ms).
- Algo nuevo en una lista: entra desde 8 px abajo con fundido y rebote corto; su borde se pinta
  de `--logro` 1 s y se apaga. En el celular, vibra 10 ms.
- Un número que cambia (total, stock): los dígitos ruedan hacia arriba si sube, hacia abajo si
  baja (200 ms).
- Hojas: suben desde abajo (320 ms, `--curva`); el fondo se oscurece a 30 %.
- Navegar en el celular: como iPhone (decisión 78): entrar desliza desde la derecha, cambiar de
  parte o de pestaña es un fundido corto; el menú de abajo no se mueve.
- Éxito: el tilde se dibuja (300 ms), vibración doble 10-40-10 ms, y la pantalla queda lista para
  lo siguiente.

## El marco de la aplicación

Cinco partes, en el mismo orden en los dos dispositivos:

| Parte | Pestañas (sus pantallas) |
|---|---|
| **Vender** | Vender · Ventas de hoy |
| **Catálogo** | Productos (con su ficha) · Listas de precios · Duplicados |
| **Depósito** | Stock · Compras · Contar |
| **Negocio** | Resumen · Usuarios · Quién hizo qué |
| **Más** | Anomalías · Procesos · Mejoras y errores · Configuración (lista de tarjetas, no pestañas) |

Entrar va fuera del marco, a pantalla completa. Cada parte abre en su primera pestaña.

**Computadora (1366 × 768)** — `marco-compu.html`
- Lateral blanco de 232 px (`.lateral`): marca, las cinco partes (44 px, ícono + nombre). La
  elegida va en `--pino-suave` con una raya naranja a la izquierda; Vender lleva la insignia con
  los renglones de la venta en curso; Más, una pastilla ámbar si hay anomalías.
- Al pie del lateral: el espejo con el celular (`.vinculo`, verde si están juntos), la conexión
  («En línea · todo enviado» / ámbar «Sin conexión · 2 por enviar») y la persona.
- Plegable a 72 px de íconos (`.app.plegado`, Ctrl B) para pantallas que piden ancho.
- Contenido: cabecera (título 28 + acciones a la derecha, la principal en naranja) y debajo las
  pestañas subrayadas en pino. Área útil ≈ 1.070 × 600 px.
- Teclado: ← va al lateral, ↑ ↓ lo recorren, → entra a las pestañas; Alt muestra las letras.

**Celular (390 × 844)** — `marco-celu.html`
- Arriba: título grande (28), a la derecha el botón del espejo (`.btn-vinculo`: verde «En
  espejo», gris «Desconectado», contorno «Vincular»); debajo, una línea con la conexión.
- Pestañas como segmentos de 44 px (`.celu-pestanas`).
- La acción principal, fija abajo en `.barra-accion` (blanca translúcida), justo arriba del menú.
- Menú de abajo (`.nav-inferior`, 76 px): las cinco partes; la elegida en naranja con su raya
  arriba (como en las referencias de Carlos); insignia en Vender.
- La cámara y los modos de una sola tarea (escanear, contar) pueden tapar el marco a pantalla
  completa, con una × arriba a la izquierda para volver.

## Datos y textos

Nombres reales y largos («Mecha acero rápido HSS 8 mm», «Tarugos nylon S8 con tope × 100»),
marcas y proveedores argentinos, «un.» para unidades, punto de miles, sin centavos (con centavos
solo en las explicaciones). Los importes de venta son múltiplos de $1.000, salvo el precio a mano.
Castellano rioplatense: «escaneá», «elegí», «tocá».

## Fotos disponibles (`_comun/fotos/`, 512 × 512, fondo transparente)

cinta-metrica · clavos · lampara · llave-combinada · martillo · mecha · pinza · pintura ·
puntas · tarugos · tornillos. Salen de Pexels (licencia libre; fotos 19658254, 190101, 7140253,
210881, 4919430, 17368635, 6349399, 13606561, 20874129, 3926785, 3926784), recortadas con rembg.
Para sumar una: bajala, recortala igual (sin fondo, centrada, 40 px de aire) y ponela en esta
carpeta para que la usen todos.

## Herramientas (`_comun/herramientas/`)

- `iconos.py`: rearma `iconos.js` con los SVG de `iconos/`.
- `recortar.py`: el recorte de fotos (rembg, modelo `isnet-general-use` o `birefnet-general-lite`).
- `capturar.py`: captura con Playwright (`compu` 1366 × 768, `celu` 390 × 844 a escala 2, `pagina` entera):
  `uv run --with playwright==1.56.0 python capturar.py celu /ruta/index.html /ruta/captura.png`.
