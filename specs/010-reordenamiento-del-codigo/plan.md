# Plan: Reordenamiento del código

El diagnóstico, las mediciones y las razones están en
[docs/auditoria-de-arquitectura.md](../../docs/auditoria-de-arquitectura.md), que Carlos
aprobó. Acá va cómo se ejecuta.

## Etapas

| Etapa | Qué | Cómo se comprueba |
|---|---|---|
| 1 | Todo el código bajo `microservices/`: `web` (el front), `api` (el servidor), `listas` (el lector de planillas). El proxy pasa a `deployment/`. | Compila, pasan las pruebas, se despliega igual |
| 2 | En el front, carpeta `plataforma/` con la tecnología reutilizable, sin dependencias del negocio. Control automático de esa regla en la verificación de cada subida. | El control automático; las pruebas de siempre |
| 3 | En el front, carpeta `negocio/`, proceso por proceso, empezando por vender. Datos del servidor con TanStack Query; tipos que llegan del servidor. Las pantallas quedan en `pantallas/celular` y `pantallas/compu`. | Las pruebas del proceso, que pasan a probar la regla una sola vez |
| 4 | El servidor calcula el precio y manda los precios precalculados. Se elimina `libraries/`. | Pruebas del cálculo en el servidor; el front sin la librería |
| 5 | Servidor en tres capas (ruta, regla, datos), tema por tema, con consultas con tipos. | Las pruebas del servidor |

## Reglas de la ejecución

- **Cada etapa es una o más subidas chicas, cada una con todo funcionando.** Nada de una
  subida gigante.
- **Mover y cambiar no van en la misma subida:** primero se mueve un archivo tal cual, después
  se lo cambia. Así se ve qué cambió.
- **Los nombres de los servicios, de las imágenes y de los paquetes no cambian en la etapa 1:**
  el despliegue de la máquina los usa. Cambian solo las carpetas.
- **Cada etapa terminada pasa todas las pruebas** que pasaban antes, unitarias y de punta a
  punta (era el escenario E02).
- **Las pruebas no se debilitan para que pasen.** Si una prueba hay que tocarla, es porque
  cambió dónde vive algo, no qué se comprueba.
- **Cada etapa se puede volver atrás** con el despliegue de siempre: ninguna cambia datos
  guardados de un modo que no se pueda deshacer (era el escenario E08).
- **Mientras se unifica un proceso no se cambian sus pantallas:** lo que Carlos pida se anota
  para después (decisión 84; era el escenario E09).
- La decisión de arquitectura queda en un ADR nuevo.

## Seguridad

- El reordenamiento no agrega accesos ni cambia permisos: las mismas rutas piden la misma
  sesión y los mismos permisos.
- **Tipos que llegan del servidor al front:** viajan solo al compilar; no se publica código
  del servidor ni nombres de tablas en el front.
- **Precios en el servidor (etapa 4):** el servidor calcula el precio de cada producto. Al
  cobrar guarda lo que se cobró en cada renglón, tal como se le cobró al cliente (un precio a
  mano, un margen de esa venta o una venta hecha sin conexión con el costo de ese momento), y
  recalcula el redondeo de cada renglón y el total, que son los que mandan (decisión 86). El
  costo sigue saliendo solo para quien tiene «Ver costos».
- **Consultas con tipos (etapa 5):** los valores siguen yendo como parámetros, nunca pegados
  al texto de la consulta.
- **Librerías nuevas:** se fijan en una versión exacta y pasan por la verificación de cada subida.
- El control automático de dependencias (etapa 2) evita además que una pieza técnica lea la
  sesión o datos del negocio sin que se note.

## Pruebas

Cada etapa se cierra con las unitarias y las de punta a punta completas, desde una base limpia.
