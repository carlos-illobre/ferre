# ADR-028: El front, por capas y en piezas chicas

**Estado:** Aceptado
**Fecha:** 2026-10-24
**Enmienda:** la parte de ADR-018 que dice cómo se ordena el front (sus tres capas pasan a cinco)
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

### Las cinco capas

```
src/
  app/            arranque: elige celular o computadora, monta la sesión y los datos
  plataforma/     técnica que sirve para cualquier aplicación; nada de la ferretería
    almacenamiento/   IndexedDB: la base local, la cola de envíos, lo guardado, lo bajado
    conexion/         la API, si hay red, el tiempo real, el enlace entre dispositivos
    teclado/          atajos, flechas y foco: lógica, sin dibujar
    navegacion/ camara/ imagenes/ busqueda/ animacion/ formato/ …
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
| `ui/` | `ui/` y `plataforma/` |
| `negocio/` | `plataforma/` |
| `pantallas/comun/` | `ui/`, `negocio/` y `plataforma/` |
| `pantallas/celular/` y `pantallas/compu/` | `comun/`, `ui/`, `negocio/` y `plataforma/`; nunca una de la otra |
| `app/` | todo |

Además:

- **Puerta de entrada:** de otra carpeta de primer nivel de una capa (`plataforma/teclado/`,
  `negocio/ventas/`) se usa solo su `index.ts`.
- **Sin ciclos:** ningún archivo depende, a la larga, de sí mismo.
- **Control automático:** `dependency-cruiser` (`pnpm capas`) lo controla en cada subida.

### Una responsabilidad por pieza

- **Una pantalla solo dibuja.** Un hook de `negocio/` le da el estado y las acciones (por
  ejemplo `useVenta()`).
- **El teclado se declara.** Cada pantalla pasa una tabla de qué tecla hace qué, y
  `plataforma/teclado/` la ejecuta. Se arma con T147 (rehacer las teclas).
- **Una pieza por archivo**, con su `.module.css` al lado. Lo que cambia entre celular y
  computadora (tamaños, separaciones) va en variables de la paleta, no en una copia de la pieza.

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

## Consecuencias

- Se mueven casi todos los archivos del front: el trabajo va por etapas, capacidad por
  capacidad, cada una con todas las pruebas en verde y sin cambiar nada a la vista.
- **Coordinación:**
  - IndexedDB lo está cambiando specs/022; la conexión entre dispositivos, specs/023.
  - Esas partes se ordenan después de que terminen, o esas funcionalidades las dejan ya en
    `plataforma/almacenamiento/` y `plataforma/conexion/`.
- ESLint y `jscpd` entran como dependencias de desarrollo.
- Las hojas de estilo globales quedan solo para la paleta, la letra y lo básico del documento.

## Cuándo revisar esta decisión

Si una capa empieza a necesitar algo de la de arriba, o si los límites obligan a partir piezas que
se leen mejor juntas.

## Referencias

- ADR-018 (servicios y capas)
- Decisiones 46, 47, 155
- `specs/021-interfaz-como-v2/revision.md`
