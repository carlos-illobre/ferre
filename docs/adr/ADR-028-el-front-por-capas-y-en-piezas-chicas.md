# ADR-028: El front, por capas y en piezas chicas

**Estado:** Aceptado
**Fecha:** 2026-10-24
**Enmienda:** la parte de ADR-018 que dice cómo se ordena el front (sus tres capas pasan a seis)
**Especificación:** `specs/024-front-por-capas/`

---

## Contexto

ADR-018 dejó el front en `plataforma/`, `negocio/` y `pantallas/`. Con el rediseño a la v2
(specs/021) el orden se fue perdiendo:

- unos 30 archivos sueltos en la raíz de `src/` y 70 en la de `pantallas/`;
- las piezas visuales dos veces, una por interfaz (`compu/base/ui.tsx` y `celular/componentes/`);
- los íconos en tres juegos (T138);
- reglas calculadas en las pantallas;
- el teclado mezclado en cada componente;
- archivos de 400 a 736 líneas.

La revisión de specs/021 encontró defectos que salen de ahí. Carlos pidió (decisión 155):

- capas separadas: lo gráfico, IndexedDB, las conexiones, el teclado y las pantallas de cada
  interfaz, cada cosa en su carpeta;
- nada repetido y nada grande;
- poca complejidad, una responsabilidad por pieza y el menor acoplamiento.

## Opciones consideradas

1. **Por capas técnicas, con el negocio por capacidad adentro** (la elegida). Cada capa sabe
   menos que la de arriba. Se puede controlar con una herramienta que ya está (`dependency-cruiser`).
2. **Por capacidad arriba de todo** (`ventas/` con sus pantallas, su negocio y su IndexedDB).
   Junta lo que cambia junto, pero mezcla tecnología y negocio en cada carpeta, que es justo lo
   que Carlos pidió separar. También repite la técnica (IndexedDB, conexión) en cada capacidad.
3. **Dejarlo como está y solo partir los archivos grandes.** No resuelve las piezas dobles ni el
   acoplamiento.

Para los estilos:

- **CSS Modules** (el elegido). Es lo que trae Vite sin agregar nada: un `.module.css` al lado de
  cada componente, con nombres que no chocan entre pantallas.
- Tailwind cambiaría la forma de escribir todas las pantallas y la paleta de «Mostrador».
- Los estilos en JavaScript agregan una dependencia y trabajo al dibujar.

## Decisión

### Las seis capas

```
src/
  app/            arranque: elige celular o computadora, monta la sesión y los datos
  teclado/        todo lo que sabe de teclas (ADR-029): el motor, las tablas de qué tecla pide
                  cada acción y lo que va por la forma de la pantalla; solo lo instala app/
  plataforma/     técnica que sirve para cualquier aplicación; nada de la ferretería
    almacenamiento/   IndexedDB en general: abrir una base, guardar y leer
    servidor/ tiempo-real/ sin-conexion/   pedir, escuchar, encolar, en general
    comandos/         acciones con nombre que ofrece lo que está a la vista (ADR-029)
    navegacion/ camara/ imagenes/ busqueda/ animacion/ …
  datos/          cómo habla Ferrebress con el servidor y qué guarda en el dispositivo
    conexion/         la API de Ferrebress, la memoria de lo pedido, el enlace con el otro dispositivo
    almacenamiento/   las bases de IndexedDB de Ferrebress: lo bajado, la cola de envíos, lo guardado, las preferencias
    sesion/           quién entró y su token; avisa cuando la sesión termina
    credenciales/     entrar y vincular con la huella
    vinculo/          el emparejamiento con el otro dispositivo y el enlace por donde se hablan
  ui/             las piezas de «Mostrador» (botón, hoja, aviso, pestañas, lista, buscador,
                  un solo juego de íconos, la paleta); no saben qué es una venta
  negocio/<capacidad>/   las reglas en funciones puras y los hooks que traen y guardan los
                  datos; sin nada visual
  pantallas/
    comun/<capacidad>/    lo que el celular y la computadora dibujan igual
    celular/<capacidad>/  cada pantalla del celular y sus partes
    compu/<capacidad>/    cada pantalla de la computadora y sus partes
```

### Dependencias

Cada capa importa solo de las de abajo:

| Capa | Puede importar de |
|---|---|
| `plataforma/` | nada del proyecto |
| `datos/` | `plataforma/` |
| `ui/` | `ui/` y `plataforma/` |
| `negocio/` | `datos/` y `plataforma/` |
| `pantallas/comun/` | `ui/`, `negocio/` y `plataforma/` |
| `pantallas/celular/` y `pantallas/compu/` | `comun/`, `ui/`, `negocio/` y `plataforma/`; nunca una de la otra |
| `teclado/` | `plataforma/` |
| `app/` | todo |

Además:

- **Puerta de entrada:** de otra carpeta de primer nivel de una capa (`plataforma/comandos/`,
  `datos/conexion/`, `negocio/ventas/`) se usa solo su `index.ts`. Las pruebas pueden entrar
  a lo de adentro, para reemplazarlo.
- **Sin ciclos:** ningún archivo depende, a la larga, de sí mismo.
- **Control automático:** `dependency-cruiser` (`pnpm capas`) lo controla en cada subida.
- **Lo guardado y el servidor, solo por `datos/`:** fuera de `datos/`, `plataforma/` y `app/` no se
  usan `localStorage`, `sessionStorage`, `indexedDB` ni `fetch` (`pnpm limites`). Lo que la
  persona deja así en el aparato (el menú plegado) lo da `useRecordado` del negocio.

### Una responsabilidad por pieza

- **Una pantalla solo dibuja.** Un hook de `negocio/` le da el estado y las acciones (por
  ejemplo `useVenta()`).
- **El teclado está aparte (ADR-029).** Cada pantalla ofrece acciones con nombre y no sabe qué
  tecla las pide; las tablas de `teclado/` lo dicen. Las teclas mismas se rehacen en T147.
- **Una pieza por archivo**, con su `.module.css` al lado; las piezas de una misma pantalla pueden
  compartir el de la pantalla. Lo que cambia entre celular y computadora (tamaños, separaciones) va
  en variables de la paleta, no en una copia de la pieza.

### Límites

Se miden en cada subida:

| Qué | Límite | Herramienta |
|---|---|---|
| Caminos por función | 8 | ESLint `complexity` |
| Bloques anidados | 3 | ESLint `max-depth` |
| Líneas por archivo | unas 150 | ESLint `max-lines` |
| Líneas por componente | 40 | ESLint `max-lines-per-function` |
| Código copiado | ninguno | `jscpd` |

Las pruebas no cuentan para el tamaño.

**Cómo se aplican:**

- Los límites arrancan en lo que hay hoy (lo que no cumple queda en una lista de excepciones).
- Cada etapa saca de la lista lo que ordenó.
- Al terminar, la lista queda vacía.
- La verificación nunca se pone roja por lo de antes; sí por lo nuevo.
- Al mover archivos, la lista de las capas se vuelve a escribir con los caminos nuevos, y nunca
  puede quedar más larga que antes.

## Consecuencias

- Se mueven casi todos los archivos del front: el trabajo va por etapas, capacidad por
  capacidad, cada una con todas las pruebas en verde y sin cambiar nada a la vista.
- **Coordinación:**
  - IndexedDB lo está cambiando specs/022; la conexión entre dispositivos, specs/023.
  - Esas partes se ordenan después de que terminen, o esas funcionalidades las dejan ya en
    `datos/almacenamiento/` y `datos/conexion/` (lo genérico, en `plataforma/`).
- ESLint y `jscpd` entran como dependencias de desarrollo.
- Las hojas de estilo globales quedan solo para la paleta, la letra y lo básico del documento.
- Un `index.ts` carga todo su módulo. Por eso las pruebas reemplazan un módulo por su index
  (que es lo que usa el código), y la preparación común de las pruebas no importa módulos de
  datos ni de negocio antes de que cada prueba ponga sus reemplazos.
- Mover archivos se hace con `microservices/web/scripts/mover.mjs`, que corrige cada import.
- Pasar una hoja global a CSS Modules se hace con `microservices/web/scripts/a-modulo.mjs`: las clases
  de la pantalla pasan al módulo y las demás quedan globales dentro del selector, así cada regla pesa
  lo mismo que antes y nada cambia a la vista; lo que ninguna pantalla usa se poda.
- Las hojas globales de las piezas compartidas (como la de los medios de pago) se cargan al arrancar
  cada interfaz, antes que los módulos de las pantallas.
- Cada etapa se compara con la anterior, pantalla por pantalla y en varios estados, con capturas de
  las dos versiones lado a lado: tiene que dar igual.
- Al partir un marco (el de cada interfaz, que importa todas las pantallas), las pantallas se
  importan en el mismo orden que antes: el orden de las hojas decide cuál gana cuando dos reglas
  pesan lo mismo, y cambiarlo cambió dos tamaños de letra hasta que se corrigió (specs/024, T011).
- Lo que tiene que andar antes de la sesión (el espejo con el otro dispositivo) se arranca donde
  se arrancaba, en la raíz de la interfaz, no en el marco que aparece al entrar.
- Una tecnología con estado propio (la cola sin conexión, la base local) se arma como una clase cuyas
  funciones son flechas: cada una se mide sola y se puede seguir usando suelta.

## Cuándo revisar esta decisión

Si una capa empieza a necesitar algo de la de arriba, o si los límites obligan a partir piezas que
se leen mejor juntas.

## Referencias

- ADR-018 (servicios y capas)
- Decisiones 46, 47, 155
- `specs/021-interfaz-como-v2/revision.md`
