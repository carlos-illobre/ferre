# Procesos

Un módulo para dibujar con BPMN los procesos de un negocio (vender, comprar, recibir
mercadería…), con borrador, vigente y versiones, importar y exportar. Está hecho para
llevarlo a otro proyecto: no usa nada de Ferrebress. Por qué está armado así:
[ADR-019](../../docs/adr/ADR-019-procesos-como-modulo-que-se-lleva.md). Qué hace:
[specs/011-procesos](../../specs/011-procesos/spec.md).

| Carpeta | Paquete | Qué es |
|---|---|---|
| `servidor/` | `procesos-servidor` | El servicio (Hono, Node 22, Postgres). Su contenedor se llama `procesos` |
| `web/` | `procesos-web` | Las pantallas de computadora y celular, como componente de React |

## Qué le tiene que dar la aplicación que lo usa

### Al servicio

- **Variables:** `DATABASE_URL` (Postgres 13 o más nuevo), `TOKEN_SERVICIO` y `PORT`. Al
  arrancar crea el esquema `procesos` y aplica sus migraciones (`servidor/migraciones/`),
  con su propia tabla de registro (`procesos.migracion`). No toca nada fuera de ese esquema.
- **Quién llama.** El servicio no tiene sesiones: confía en la aplicación, que tiene que
  ponerse adelante y reenviarle cada pedido de `/procesos/…` con estas cabeceras:

| Cabecera | Valor |
|---|---|
| `X-Token-Servicio` | El mismo `TOKEN_SERVICIO`. Sin él, 401 |
| `X-Usuario-Id` | El identificador de quien llama |
| `X-Usuario-Nombre` | Su nombre, con `encodeURIComponent` |
| `X-Puede` | `ver`, `dibujar` o `ver,dibujar`. `dibujar` incluye ver |

  El servicio no se publica: solo lo alcanza la aplicación, por la red interna.
  En Ferrebress lo hace `microservices/comercial/src/rutas/procesos.ts`, que además anota cada
  cambio en su registro de eventos.

### A las pantallas

```tsx
import { Procesos } from "procesos-web";
import "procesos-web/estilos.css";

<Procesos
  interfaz="compu"                         // o "celu"
  pedir={(ruta, init) => miCliente(ruta, init)} // ruta empieza con /procesos; devuelve el JSON o tira un error con .estado y .datos
  puede={{ ver: true, dibujar: true }}
  pantallas={["Vender → Cobrar", "Inventario"]} // las pantallas propias que se pueden nombrar en un paso
  guardarLocal={localStorage}             // opcional: dónde guardar lo último abierto para mirarlo sin conexión
/>
```

- **React 18** lo pone la aplicación. `bpmn-js` viene con el paquete; conviene cargar el
  componente aparte (`lazy`), porque pesa cerca de 1 MB.
- **La paleta** se cambia con variables de CSS (`--procesos-accion`, `--procesos-tinta`,
  `--procesos-fondo`… están todas al principio de `web/src/estilos.css`).
- **La licencia de bpmn.io** pide dejar visible su logo en el dibujo.

## Cómo se lleva a otro proyecto

1. Copiar `microservices/procesos/` entero.
2. Sumar los dos paquetes al workspace (o publicarlos) y el contenedor del servicio al
   despliegue, con las tres variables.
3. En el servidor de la aplicación, la ruta que reenvía `/procesos/…` con las cabeceras de
   arriba, y los dos permisos (ver y dibujar) con los nombres que use ese proyecto.
4. En el front, el componente donde haga falta.

Si el otro proyecto tiene su propia base, se copia el esquema `procesos` entero
(`pg_dump --schema=procesos`).

## Pruebas

`pnpm test` en cada paquete. El servicio se prueba contra los datos en memoria
(`servidor/src/memoria.ts`), que también sirven para levantarlo sin base.
