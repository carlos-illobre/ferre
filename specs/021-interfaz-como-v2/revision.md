# Revisión: la aplicación como la v2 (021)

**Revisor:** subagente `revisor` (paso 7, T011) · **Fecha:** 2026-10-24 · **Alcance:** los commits
`(021-T0xx)` (de `05d7e64` a `b03126a`), contra `spec.md`, `plan.md` y `tasks.md`; para E04,
contra las `spec.md`/`ux.md` de 001, 002, 005, 006, 007, 009, 011, 012, 014 y
`docs/decisiones-de-negocio.md`.

**Cómo se revisó:** se leyó el diff de cada pantalla, se compararon los botones, las teclas y los
permisos de antes y de ahora archivo por archivo, se corrió `pnpm capas` en `microservices/web` (sin
violaciones) y se miraron las pantallas con la API de mentira (`tests/capturas/levantar.sh`) y un
Playwright de Node (el Python de `tests/capturas/` no está instalado en este entorno): capturas en
1366×768 y 390×844, la medida de `capturar.py` en el celular, las letras que muestra Alt en cada
pantalla y lo que hace Alt + letra. No se corrieron las e2e ni las unitarias (ya corrieron). No se
tocó código, pruebas ni maquetas.

**Gravedad:** **Frena el cierre**: incumple un escenario de la spec o una decisión de Carlos de
un modo que se nota al usar la aplicación. **Defecto**: se puede anotar y arreglar después.

---

## Resumen

| # | Gravedad | Qué |
|---|---|---|
| 1 | Frena | Las teclas Alt + letra nuevas de la v2 las roba el reparto automático de letras (decisión 80): Alt R, Alt N, Alt P, Alt A y Alt O hacen otra cosa |
| 2 | Frena | Alt D, Alt E y Alt F, que la decisión 80 prohíbe, se agregaron en Listas, Contar, Stock y Mejoras y errores |
| 3 | Frena | Quien tiene solo «Encargar compras» perdió los Pedidos: Compras le muestra el Ingreso, que no puede usar |
| 4 | Frena | En el celular, la tarjeta de una persona junta sus sesiones por nombre de aparato: dos sesiones en «computadora · Chrome» se ven como una y la segunda no se puede cerrar |
| 5 | Frena | E06: en el celular hay textos de 11 a 13 px y el botón nuevo «Roles y permisos» mide 12 px y 28 px de alto |
| 6 | Defecto | Quien solo registra ingresos ya no ve los pedidos por llegar (005, escenario 16), aunque la decisión 149 lo manda directo al Ingreso |
| 7 | Defecto | Más pantallas que quedaron con el menú viejo: el manual (Alt + 1 = Catálogo, «Más → Usuarios»), el aviso de la entrada y la lista de pantallas de Procesos |
| 8 | Defecto | La paleta de las pantallas de Más (`mas-v2.css`) es otra: otro verde, otro naranja y otro azul de Mercado Pago (decisiones 46, 47 y 108) |
| 9 | Defecto | E02: lugares sin datos que igual afirman algo (la pastilla «Sin acceso», «Para revisar» con otra cuenta, «Vencido» en rojo) y botones apagados que en el celular no dicen por qué |
| 10 | Defecto | E05: textos de Configuración y de Mejoras y errores escritos a mano en cada interfaz, y distintos entre sí |
| 11 | Defecto | Capas: «Para revisar» del Stock y el período de «Quién hizo qué» calculados en las pantallas, no en `negocio/` |
| 12 | Defecto | Documentación que quedó atrás: 001 `ux.md` se contradice, `tests/capturas/README.md` tiene las direcciones viejas, `tasks.md` da por hecha la unificación de íconos |
| 13 | Defecto | Ninguna prueba nombra E01 a E06 |
| 14 | Defecto | Detalles: Contar en el celular abre un conteo para leerlo, un botón «escaneando» que no escanea, la tecla A/D sin confirmar en Para revisar |

---

## 1. Escenarios de la spec

### E04: nada que antes se podía hacer se pierde

**1. Las teclas Alt + letra de la v2 hacen otra cosa.** Frena el cierre.

- **Dónde:** `microservices/web/src/plataforma/teclado/atajos.ts:37-91` (el reparto automático,
  decisión 80) contra las teclas propias de las pantallas nuevas:
  `compu/base/pantallas/Usuarios.tsx:109-120` (Alt R, Alt N),
  `compu/ComprasRecientes.tsx:41-42` (Alt N, Alt P),
  `compu/base/pantallas/Configuracion.tsx:29-32` (Alt A, Alt B, Alt O, Alt U).
- **Qué dice la documentación:** 007 `ux.md` («Roles y permisos» Alt R, «Autorizar a alguien»
  Alt N), 005 `ux.md` («Armar pedido» Alt P, «Registrar compra» Alt N), 009 `ux.md` (Alt A,
  Alt B, Alt O, Alt U). Las pantallas muestran esas teclas en el botón.
- **Qué hace el código:** con Alt apretado, `useAtajos` reparte letras entre los botones a la vista
  y escucha en la fase de captura: si la letra es de otro botón, lo aprieta y corta el evento, así
  que el manejador de la pantalla nunca se entera. Los botones con `aria-keyshortcuts` no reciben
  letra, pero su letra **queda libre para otro**. Solo «Subir lista» (Listas) la reserva con
  `data-atajo`. Comprobado en la aplicación con la API de mentira:
  - Usuarios: Alt R abre el panel «Filtros» (el botón «Rol» tomó la R); Alt N elige a una persona
    de la lista (la N le tocó a un renglón).
  - Compras: Alt N no hace nada visible; Alt P abre el menú de la cuenta (la P es de «cuenta»).
    Al apretar Alt, «Armar pedido» muestra la A y «Registrar compra» la R, al lado del «Alt P» y
    el «Alt N» que tienen escritos.
  - Configuración: Alt A lleva a Más (la A le tocó al «Más» del menú) en vez de cambiar las
    animaciones; Alt O le toca a «24 horas».
  - Contar (Alt C) y Duplicados (Alt B, U, S) andan, pero por casualidad: el reparto les dio a
    esos mismos botones su letra.
- **Por qué importa:** la pantalla promete una tecla que hace otra cosa, y en Compras abre el menú
  de la cuenta. Ninguna prueba aprieta estas teclas (`grep` de `altKey: true` y `Alt+` en
  `tests/e2e` y en las unitarias), por eso las e2e pasan.

**2. Se usan Alt D, Alt E y Alt F, que la decisión 80 prohíbe.** Frena el cierre.

- **Dónde:** `compu/base/pantallas/Listas.tsx:372` (Alt D descarta la lista),
  `compu/base/pantallas/Contar.tsx:249` (Alt E escanear con el celular),
  `compu/Inventario.tsx:150` (botón «Etiquetas» con «Alt E» escrito, sin manejador),
  `compu/base/pantallas/Tickets.tsx:78` (Alt F elegir archivos).
- **Qué dice la documentación:** decisión 80 y 001 `ux.md:376`: «No se usan la D, la E ni la F:
  en Windows el navegador las tiene para cosas propias». La plataforma las tiene reservadas
  (`atajos.ts:6`). Las `ux.md` de 002, 005 y 008 escritas en esta funcionalidad las documentan
  igual, sin decir que cambian la decisión 80.
- **Por qué importa:** contradice una decisión de Carlos sin que él la cambie. Si el navegador se
  queda con la tecla (no se pudo comprobar en Windows desde acá), «Descartar» de Listas y
  «Escanear con el celular» de Contar quedan sin tecla. En Stock, «Alt E» está escrito en un botón
  apagado que no tiene ninguna tecla atada.

**3. Quien tiene solo «Encargar compras» perdió los Pedidos.** Frena el cierre.

- **Dónde:** `compu/App.tsx:476` y `celular/Deposito.tsx:53`.
- **Antes:** la pestaña «Pedidos» pedía `deposito.pedidos` o `deposito.ingresos`; con solo
  «Encargar compras» se veía y se armaban pedidos (005, RF-55; RF-72).
- **Ahora:** la pestaña «Compras» se ve con ese permiso, pero sin `negocio.gastos` ni
  `deposito.compras` muestra `<Ingreso />`, que pide «Registrar ingresos» (el servidor lo
  rechaza). Del Ingreso no hay forma de llegar a Pedidos: «Armar pedido» y Alt P están solo en las
  compras recientes. Se llega escribiendo `#/pedidos` a mano.
- **Por qué importa:** con un rol armado así (los roles se editan, RF-75) la persona pierde lo
  único que podía hacer en Depósito. El plan («Seguridad») escribe exactamente esta regla («quien
  no ve las compras recientes entra directo al Ingreso»), así que el hueco viene del plan. Los
  roles de arranque no lo sufren: Comprador y Recepción tienen «Ver las compras».

**4. En el celular, las sesiones de una persona se agrupan por nombre de aparato.** Frena el cierre.

- **Dónde:** `celular/TarjetaDeUsuario.tsx:184-212` (`AccesoDeUsuario`).
- **Antes:** un renglón por sesión (`sesiones.map`, `key={s.id}`) y uno por celular con huella,
  cada uno con su «Cerrar» o «Quitar» (decisión 100; 007 `ux.md`).
- **Ahora:** arma la lista con los nombres distintos de aparato (`new Set(...)`) y para cada
  nombre toma la primera sesión (`sesiones.find`) y el primer celular (`celulares.find`). Dos
  sesiones en «computadora · Chrome», o dos celulares sin nombre («Celular»), se ven como uno y la
  segunda no se puede cerrar ni quitar desde el celular. La cuenta de la pestaña «Acceso (N)» sí las
  cuenta todas, así que el número y la lista no coinciden. La computadora (la ficha de
  `compu/base/pantallas/Usuarios.tsx:241-260`) sigue con un renglón por sesión.
- **Por qué importa:** cerrar la sesión de alguien a distancia es la herramienta de seguridad de
  RF-72 y la decisión 100, y el nombre de aparato se repite mucho («computadora · Chrome»). Además,
  el ícono se elige adivinando por el nombre (`/celular|android|iphone|samsung|moto/`), una regla
  que no está escrita.

Lo demás que se miró en E04 está igual que antes: Listas (historial, estado de proveedores,
«Mostrar más filas», ↑ ↓ Inicio Fin), Duplicados, Stock (corregir, movimientos, valor por producto
con su permiso, ordenar, escanear en el celular), Compras recientes (desplegar y anular con su
permiso), Contar (cerrar con y sin poner en cero), Usuarios en la computadora (ordenar, filtrar,
sesiones y celulares en la ficha), Quién hizo qué (filtros por persona, fecha y tipo, de a 10, con
el total; el filtro por prefijo `stock.` lo acepta el servidor, `actividad/datos.ts:10`),
Anomalías (aceptar y descartar solo con «Administrar usuarios», sin conexión apagado), Mejoras y
errores (idea o error, fotos, foto con el celular, resolver y reabrir), Configuración (las cuatro
preferencias, bajar datos, mis celulares, desvincular), Procesos (sin teclas perdidas). Lo ya
arreglado (permisos de Compras, la hora de «Bajados el…», el foco en las secciones del Resumen, ↑ en
Stock) se ve bien en el código actual.

### E06: el celular, sin desplazamiento y sin textos de menos de 14 px

**5. Hay textos de menos de 14 px.** Frena el cierre (es el escenario tal cual).

- **Medido** con la función de `tests/capturas/capturar.py` en 390×844, en Listas, Duplicados,
  Stock, Compras, Contar, Resumen, Usuarios, Quién hizo qué, Anomalías, Para revisar, Procesos,
  Mejoras y errores y Configuración. Ninguna se desplaza hacia el costado. En todas:
  - El menú de abajo (Vender, Catálogo, Depósito, Negocio, Más) en **11 px**
    (`celular/estilos.css:505`) y «En línea · todo enviado» en 13 px. Es el marco, que T007 revisó
    contra la v2: estaba así antes, pero E06 no hace excepción.
  - Usuarios: el botón nuevo «Roles y permisos» (`celular/Usuarios.tsx:28-32`, `.boton.chico`) en
    **12 px y 28 px de alto**: menos de 14 px y menos de los 36 px de la decisión 104. Es de esta
    funcionalidad (T007).
  - Anomalías: la cuenta de la pestaña («3 pendientes») en 13,8 px.
  - Resumen: el pie («Vendedor, Comprador…», «Salir») en 13 px; «Salir» de 34 px de alto.
  - Configuración: las tres llaves de 32 px de alto (menos de 36).
- **Por qué importa:** E06 es un escenario de la spec y el lenguaje «Mostrador» lo dice igual
  («Nada de menos de 14 px»).

### E02: lugares vacíos con «—», sin datos inventados

**9. Lugares sin datos que igual afirman algo.** Defecto.

- **«Sin acceso» siempre** (`compu/base/pantallas/Anomalias.tsx:89`,
  `celular/pantallas/Anomalias.tsx:43`): la pastilla roja va en cada persona de «Para revisar»
  sin mirar su estado. 014 prevé que la reactiven antes de revisar; entonces la pantalla dice algo
  falso. Haría falta el estado actual de la persona o sacar la pastilla.
- **«Para revisar» del Stock** (`compu/Inventario.tsx:198`, `celular/Stock.tsx:84`): con el rótulo
  de la v2 muestra un número real que cuenta otra cosa (solo los en cero y negativos; la v2 suma los
  bajo el mínimo y los que espera un cliente). Está anotado en `tasks.md`, pero E02 pide «—», no un
  número con otro significado.
- **«Vencido» en rojo** (`compu/ComprasRecientes.tsx:67`; también «Se les debe» en rojo en
  `celular/ComprasRecientes.tsx:57`): la tarjeta va con fondo de error aunque el dato es «—». Un
  rojo de alarma sobre algo que no se sabe.
- **Botones apagados que en el celular no dicen por qué:** «Resultado», «Semana» y «Mes»
  (`celular/ComoVaElNegocio.tsx:53, 81-82`) lo dicen solo en `title`, que en un celular no se ve;
  «Sin código —» (`celular/Stock.tsx:86`) no tiene ni eso. En la computadora el `title` alcanza.
- **«Alt E» en «Etiquetas»** (`compu/Inventario.tsx:150`): un botón apagado que muestra una tecla.
- **En la computadora, Configuración no tiene el lugar de «23,4 MB»** (`compu/base/pantallas/
  Configuracion.tsx`, `DatosSinConexion`): `tasks.md` lo da por vacío, pero el lugar no está; en el
  celular sí está, con «—».

### E05 y decisiones 46 y 47: lo mismo en las dos interfaces y una sola paleta

**8. La paleta de Más es otra.** Defecto.

- **Dónde:** `pantallas/mas-v2.css:5-17` define `--v-*` con los valores de la maqueta; la usan
  Anomalías, Mejoras y errores, Configuración y Procesos en las dos interfaces.
- **Qué dice la documentación:** CLAUDE.md y decisión 47: «la paleta es una sola (`paleta.css`)»;
  decisión 108: un medio de pago, siempre del mismo color.
- **Qué hace el código:** el verde oscuro es `#12382F` en Más y `--p-verde: #17312b` en el resto;
  el naranja de acción, `#E8541C` contra `--p-naranja: #d83f0e`; y Mercado Pago, `--v-mp: #0A72C2`
  en «Para revisar» (`compu/base/estilos/anomalias-v2.css:37`) contra `--p-medio-mp: #0a6aa8` de
  `medios.css`. Entre el celular y la computadora coinciden (las dos usan `mas-v2.css`), pero entre
  pantallas no. Vender ya tenía su propia copia (`--m-*`), de antes de esta funcionalidad.
- **Por qué importa:** Carlos rechaza una pantalla con colores distintos al resto (CLAUDE.md).
  `paleta.css` y el lenguaje «Mostrador» (`docs/lenguaje-mostrador/comun.css`) tienen valores
  distintos, y hay que elegir uno.

**10. Textos escritos a mano en cada interfaz, y distintos.** Defecto.

- `celular/pantallas/Configuracion.tsx:73` dice «Este dispositivo no tiene lector de huella o
  desbloqueo compatible.»; la computadora no dice nada en ese caso y, en cambio, muestra «Para sumar
  un celular…», que el celular no muestra. Los textos de «Datos para trabajar sin conexión» están
  copiados en `compu/base/pantallas/Configuracion.tsx:117-121` y en
  `celular/pantallas/Configuracion.tsx:114-118`, fuera de `textos.ts`.
- `textos.ts:598`: `conHuellaDesde` es «Con huella desde el» en la computadora y «Vinculado el» en
  el celular. No dicen lo mismo y «vinculado» se confunde con el vínculo con la computadora.
  `trabajandoJuntos`: «Trabajando juntos» contra «En espejo».
- Mejoras y errores: los ejemplos de la caja («Ej.: al cobrar con tarjeta…» contra «Ej.: al
  cobrar…»), los avisos de envío y los vacíos están escritos dos veces
  (`compu/base/pantallas/Tickets.tsx:62-70, 100-101`, `celular/pantallas/Tickets.tsx:44-52, 72-73`).
- En el celular, cada sesión dice «Hace 2 h» con una función propia (`celular/TarjetaDeUsuario.tsx:179`);
  en la computadora, «usada hace 2 h» con otra.
- **Por qué importa:** la decisión 47 pide que un cambio de texto se haga en un solo lugar; así,
  el próximo cambio se hace en un lado y no en el otro.

### E01 y E03: el diseño de la v2 y las excepciones de Carlos

Se compararon en 1366×768 Usuarios y Compras con su v2 (variante 1): la disposición, las piezas,
los íconos y las teclas a la vista coinciden. Las diferencias son las de E02 (anotadas en
`tasks.md`) y dos más: en Compras, las barras de la semana van de domingo a sábado («D L M M J V S»,
porque siguen la semana del servidor) y la v2 de lunes a domingo; y el «3» de Más en el menú de la v2
no está. No se pudo comparar pantalla por pantalla todas las demás con sus maquetas en las dos
medidas: **E01 y SC-01 no se pueden dar por comprobados en esta revisión**. Las excepciones de E03
(cobro deslizable, pastillas de medio, menú que se achica, panel y boleta de Vender) están en
pantallas que esta funcionalidad no tocó: no hay diferencia que revisar.

---

## 2. Seguridad (plan.md, «Seguridad»)

- **«Cada pantalla y cada pestaña siguen pidiendo los mismos permisos.»** Cumple en Negocio
  (Resumen con los de sus secciones, Usuarios con `admin.usuarios` o `admin.roles`, Quién hizo qué
  con `negocio.actividad`), Más, Anomalías y Configuración, en las dos interfaces (`compu/App.tsx:97-120`,
  `celular/App.tsx:60-68`). Los datos nuevos se piden con su permiso
  (`useComprasRecientes(activo)`, `useGastosDeLaSemana(activo)`, `usePedidosPorLlegar(encarga ||
  anula)`). No cumple para Pedidos: ver el punto 3.
- **«Quien no ve las compras recientes entra directo al Ingreso.»** Está hecho como dice, y por eso
  rompe el caso de solo «Encargar compras» (punto 3) y el de solo «Registrar ingresos» (punto 6).
- **«Usuarios se ve con "Administrar usuarios" o "Administrar roles"; con solo el segundo, muestra
  los roles.»** Cumple en la computadora (`compu/App.tsx:480`) y en el celular
  (`celular/Usuarios.tsx`, destino `mas/roles`).
- **«No se agregan datos nuevos a la vista ni se guardan en el dispositivo.»** No se encontró nada
  nuevo guardado. Pedidos por llegar se trae de `/pedidos`, que ya existía y pide su permiso en el
  servidor.

**6. Quien solo registra ingresos ya no ve los pedidos por llegar.** Defecto (lo tiene que decidir Carlos).

- **Dónde:** el mismo `compu/App.tsx:476` y `celular/Deposito.tsx:53`.
- **Qué dice la documentación:** 005, escenario 16: «quien registra ingresos sí ve los pedidos
  pendientes de llegar, para ingresar la mercadería desde ellos». La decisión 149: «Quien solo
  recibe mercadería entra a Compras directo al Ingreso».
- **Qué hace el código:** con solo `deposito.ingresos`, Compras abre el Ingreso, y el Ingreso no
  muestra ni enlaza los pedidos por llegar. Recepción no lo sufre, porque tiene «Ver las compras».
- **Por qué importa:** las dos reglas escritas chocan. O se agrega «Por llegar» al Ingreso, o
  Carlos cambia el escenario 16.

---

## 3. Reglas inventadas

- **«Para revisar» del Stock = en cero o negativo** (punto 9), calculado aparte en
  `compu/Inventario.tsx:69-82` y `celular/Stock.tsx:42-53`. Es una definición nueva que solo
  está en el `ux.md` como «lo que falta».
- **El ícono de cada aparato según el nombre** (`celular/TarjetaDeUsuario.tsx:192`).
- **Aceptar o descartar con una sola tecla** (A, D) en Para revisar de la computadora
  (`compu/base/pantallas/Anomalias.tsx:64-65`): está en 014 `ux.md`, pero descartar no se deshace,
  no pide confirmación y la selección salta sola a la siguiente, así que una A de más acepta otra
  venta. Defecto chico; vale preguntarle a Carlos.
- **Contar en el celular abre un conteo para mostrar cuántos faltan** (`celular/Deposito.tsx:198`):
  llama a `abrirConteo` (un `POST /conteos`) al entrar. Si el conteo se cerró entre la lista y ese
  pedido, abre uno nuevo y deja «conteo.abierto» en el registro solo por mirar la pantalla. Defecto.
- **«Registrar la compra escaneando»** (`celular/ComprasRecientes.tsx:113`): lleva al Ingreso sin
  abrir la cámara. El nombre promete algo que el botón no hace. Defecto chico.

## 4. Capas (ADR-018)

`pnpm capas` en `microservices/web`: sin violaciones. Lo nuevo de negocio está en `src/negocio/`
(`anomalias.ts`, `apartados.ts`, `compras.ts`, `ventas/tablero.ts`). Quedaron en las pantallas:

**11.** Defecto:
- La cuenta y el filtro de «Para revisar» del Stock, repetidos en las dos interfaces (ver arriba).
- Qué es «Hoy», «Ayer», «Esta semana» y «Desde… hasta» en Quién hizo qué (`diasDelPeriodo`,
  `inicioDelDia`) y qué tipos cuentan en «Qué pasó» (`CATEGORIAS`), en
  `pantallas/actividad-en-palabras.ts`. Lo usan las dos interfaces, pero es la regla de un filtro
  del registro (RF-71), no la forma de mostrarlo.
- Las cuentas de sectores de Contar (`compu/base/pantallas/Contar.tsx:69-71` y
  `celular/Deposito.tsx:219`), repetidas.
- Además, Quién hizo qué en la computadora pide al servidor el total de cada una de las seis
  categorías y el general en cada cambio de filtro (`compu/base/pantallas/Actividad.tsx:41-42`,
  con `useActividad` dentro de un `map`): siete pedidos más por filtro.

## 5. Documentación que quedó atrás

**7. Lo que todavía nombra el menú viejo.** Defecto.

- **El manual** (fuera del rediseño por su aspecto, no por su contenido):
  `compu/base/pantallas/manual/Catalogo.tsx:57` dice «Catálogo … (o apretá Alt + 1)». Ahora Alt + 1
  es Vender y Catálogo es Alt + 3 (comprobado al apretar Alt). Dice «Más → Usuarios» en
  `Catalogo.tsx:232`, `CatalogoCelular.tsx:220` y `Entrar.tsx:43, 57`. 012 `ux.md:89` repite el
  Alt + 1. Todos los números de Alt cambiaron: Vender 1, Catálogo 3, Depósito 6, Negocio 9,
  Usuarios 0, y Quién hizo qué se quedó sin número.
- **La entrada:** `compu/base/pantallas/Entrar.tsx:44`, el aviso de correo no autorizado, manda a
  «Más → Usuarios».
- **Procesos:** `pantallas/Procesos.tsx:16-21`, las pantallas que se pueden nombrar en un paso, «en
  el orden del menú», siguen siendo «Depósito → Ingreso / Inventario / Estanterías / Pedidos», «Más
  → Cómo va el negocio», «Más → Usuarios → Quién hizo qué». Falta «Depósito → Compras», «Negocio →
  …» y «Más → Configuración / Sistema».

**12. Documentos que se contradicen o dicen otra cosa que el código.** Defecto.

- `specs/001-base-del-sistema/ux.md:62-66` describe el marco nuevo, pero el mismo archivo sigue
  diciendo en `:385-387` «Depósito en Inventario; el orden de Depósito es Inventario, Ingreso,
  Estanterías, Pedidos» y en `:394-397` «Depósito: Inventario, Ingreso, Estanterías, Pedidos. Más
  no tiene pestañas». Otro agente no sabría cuál vale. Lo mismo `docs/decisiones-de-negocio.md`
  (decisiones 67/68) sin una nota de que la 149 las cambia, más allá de lo que dice la 149.
- `tests/capturas/README.md`, tabla «Direcciones de la aplicación»: dice que `compras` es el
  Ingreso y que `resumen`, `usuarios` y `actividad` están en Más. Ahora `compras` es el escritorio
  de compras, el Ingreso es `ingreso` y esas tres son de Negocio.
- `specs/021-interfaz-como-v2/tasks.md`: T007 y T010 están marcadas `[x]` y las dos dicen
  «unificar los íconos de la v2», pero `IconoDeLaV2.tsx`, `IconoDeDeposito.tsx` e
  `iconos-de-negocio.tsx` siguen separados; quedó como T138 en `proyecto/tasks.md`. Hay que
  corregir las tareas o la nota.
- `celular/App.tsx:162` dice «la app abre en lo primero del menú», pero abre en Catálogo (decisión
  56), y lo primero del menú ahora es Vender. El comportamiento sigue la decisión 56; el comentario
  está desactualizado.

## 6. Pruebas

**13. Ninguna prueba nombra E01 a E06 de 021.** Defecto.

- `grep "021-E0"` en `tests/` y en `microservices/web/src`: nada. Las e2e se pusieron al día con
  comentarios «como la v2 (021)», sin perder lo que comprobaban de antes (se miraron las de
  roles, stock y espejo: los cambios siguen la pantalla nueva, no aflojan nada). Pero E04 (teclas),
  E05 y E06 no tienen prueba propia, y los puntos 1, 2, 4 y 5 pasaron por eso.

## 7. Pantallas

Ver E01 más arriba: Usuarios y Compras en la computadora coinciden con su v2, salvo E02 y lo
anotado. El resto no se comparó en detalle (las capturas de la aplicación quedaron en el scratchpad
de la sesión, no en el repositorio).

---

## Lo que no se pudo comprobar

- Si Chrome en Windows deja que la página use Alt D, Alt E y Alt F (punto 2): no hay Windows acá.
- E01 y SC-01 pantalla por pantalla, en las dos medidas, contra las doce v2.
- Las pantallas con el celular vinculado (Alt O y Alt U de Configuración con vínculo, «Con el
  celular» en Stock y Contar): la API de mentira arranca sin vínculo.
- Las unitarias y las e2e: no se corrieron, por pedido.
