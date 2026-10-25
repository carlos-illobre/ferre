# Conexión entre dispositivos y avisos sin consultas

Un módulo sin dependencias para dos cosas que no tienen que ver con el negocio:

- **Avisos sin consultas** ([ADR-030](../../docs/adr/ADR-030-avisos-sin-consultas.md)): que un
  dispositivo se entere de lo que pasa del otro lado sin preguntar a ritmo fijo. Lo permanente
  (una versión nueva) viaja a cuestas en las respuestas; lo temporario (un código QR en pantalla)
  llega en el momento por un canal abierto solo mientras hace falta. Los indicadores de conexión
  salen de lo mismo.
- **Conexión entre dispositivos** ([ADR-027](../../docs/adr/ADR-027-conexion-directa-entre-dispositivos.md)):
  dos dispositivos de una misma persona se mandan mensajes **directo** cuando la red lo deja
  (WebRTC, sin STUN ni TURN) y **por el servidor** cuando no, una sola vez y en orden.

No sabe nada del negocio ni de las sesiones: la aplicación decide quién puede escuchar cada tema.

## Un caso nuevo

Esperar algo del otro lado es declararlo en el navegador y avisarlo en el servidor. Nada de
conexiones, latidos ni reintentos:

```ts
// Navegador: temporaria (abre el canal mientras dure) o permanente (nunca lo abre).
const dejar = central.vigilar({ tema: `pedido:${id}`, temporaria: true, alAviso: (datos) => mostrar(datos) });
// Servidor: a quien espere ese tema; si nadie, no pasa nada.
canales.avisar(`pedido:${id}`, { confirmado: true });
// Servidor: algo permanente que viaja en cada respuesta.
aCuestas.agregar("version", () => VERSION);
```

## En el servidor

```ts
import { crearACuestas, crearCanales, leerTemas, rechazar, CABECERA_DE_TEMAS } from "conexion-entre-dispositivos/servidor";

const aCuestas = crearACuestas();
const canales = crearCanales({ aCuestas: aCuestas.valores });
// En cada respuesta, lo que va a cuestas:
app.use("*", async (c, next) => { await next(); c.header(...aCuestas.cabecera()); });
// GET: abre el canal del dispositivo con los temas de la cabecera X-Temas (antes, autorizar cada uno).
app.get("/canal", (c) => {
  const temas = leerTemas(c.req.header(CABECERA_DE_TEMAS));
  // …si alguno no se da: return rechazar(403, ["tema"]);
  return canales.abrir(idDelDispositivo, grupo, temas.map((p) => ({ tema: p.t, lado, inicial })));
});
// POST: una tanda del vínculo (lista JSON de textos) para el otro lado.
app.post("/canal/:tema", async (c) => new Response(null, { status: canales.recibir(tema, lado, await c.req.text()) }));
// Cuando un tema deja de valer, o se cierra una sesión:
canales.cerrarTema(tema);
canales.cerrarGrupo(grupo);
```

Usa solo `Response` y `ReadableStream` estándar: sirve con Hono, con `fetch` de Deno o Bun, o con
cualquier servidor que devuelva un `Response`. El latido (25 s) es del servidor y solo existe
mientras hay canales abiertos; hay un tope de canales por grupo y en total.

## En el navegador

```ts
import { crearCentral, crearEnlace, crearIndicador, CABECERA_A_CUESTAS } from "conexion-entre-dispositivos/navegador";

const central = crearCentral({ url: "https://api.ejemplo/canal", cabeceras: () => ({ Authorization: `Bearer ${token}` }) });
// En cada respuesta de la API (y en cada pedido que no llegó):
central.respondio(respuesta.headers.get(CABECERA_A_CUESTAS));
central.fallo();
// Un indicador de conexión: en-linea | conectando | sin-conexion, sin preguntar.
const conexion = crearIndicador(central.sucesos, "en-linea");
conexion.cambios.escuchar((estado) => { /* … */ });

// El enlace con el otro dispositivo usa el canal de la central.
const enlace = crearEnlace({
  central, tema: "vinculo:123", lado: "computadora",
  url: "https://api.ejemplo/canal/vinculo:123",  // dónde se manda por el servidor
  inicia: true,                                  // uno solo de los dos lados arma la directa
  almacen: localStorage,                         // dónde recordar que la directa no se pudo
});
enlace.recibidos.escuchar((dato) => { /* lo que mandó el otro */ });
enlace.cambios.escuchar((e) => { /* e.conexion: sin-conexion | conectando | solo | directa | servidor */ });
await enlace.mandar({ tipo: "codigo", codigo: "7790001112223" }); // se cumple cuando el otro lo recibió
enlace.probarDirecta();   // si va por el servidor: olvida que no se pudo y prueba una vez
enlace.cerrar();
```

- El canal es uno solo por dispositivo, se abre solo si hay alguna espera temporaria y la página
  está a la vista, y se cierra al irse la última o al ocultarse la página.
- Una espera permanente se dispara solo cuando el valor de su tema cambia (el primero queda de
  referencia).
- Armada la directa, el enlace suelta su tema: si no hay otra espera, el canal se cierra.
- Si la directa no se puede (el navegador no la tiene, o a los 5 segundos no abrió), se recuerda
  en `almacen` y no se vuelve a probar sola: solo con `probarDirecta()`.
- Lo que no se pudo entregar queda en la memoria de la página y sale al reencontrarse.
- Lo grande se parte en mensajes de 16 KB.

## Desarrollo

```bash
pnpm test        # unitarias, con el 100 % de cobertura obligatorio
pnpm typecheck   # tipos y capas: no importa nada de afuera de esta carpeta
pnpm build       # compila a dist/ (también lo hace al instalar)
```

Reglas de este módulo (RNF-68): cada pieza hace una cosa y con pocos caminos; nada repetido; cada
pieza dice en un comentario qué hace; una línea que ninguna prueba recorre no se escribe.
