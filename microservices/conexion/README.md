# Conexión entre dispositivos

Un módulo sin dependencias para que dos dispositivos de una misma persona (por ejemplo, un
celular y una computadora) se manden mensajes: **directo** entre los dos cuando la red lo deja
(WebRTC, sin servidores STUN ni TURN), y **por el servidor** cuando no. Cada mensaje llega una
sola vez y en orden por cualquiera de los dos caminos. El porqué está en
[ADR-027](../../docs/adr/ADR-027-conexion-directa-entre-dispositivos.md).

No sabe nada del negocio ni de las sesiones: la aplicación decide quién puede usar cada sala.

## En el servidor

```ts
import { crearCentral } from "conexion-entre-dispositivos/servidor";

const central = crearCentral();
// GET  <sala>: el lado escucha (devuelve un Response con un flujo de eventos).
// POST <sala>: el lado manda una tanda (una lista JSON de textos).
app.get("/salas/:id", (c) => /* comprobar quién es */ central.escuchar(c.req.param("id"), lado));
app.post("/salas/:id", async (c) => new Response(null, { status: central.recibir(c.req.param("id"), lado, await c.req.text()) }));
// Cuando la sala deja de valer (se soltó el vínculo, se cerró una sesión):
central.cerrar(sala);
```

Usa solo `Response` y `ReadableStream` estándar: sirve con Hono, con `fetch` de Deno o Bun, o con
cualquier servidor que devuelva un `Response`.

## En el navegador

```ts
import { crearEnlace } from "conexion-entre-dispositivos/navegador";

const enlace = crearEnlace({
  url: "https://api.ejemplo/salas/123",          // la misma dirección para GET y POST
  inicia: true,                                  // uno solo de los dos lados arma la directa
  cabeceras: () => ({ Authorization: `Bearer ${token}` }),
  almacen: localStorage,                         // dónde recordar que la directa no se pudo
});
enlace.recibidos.escuchar((dato) => { /* lo que mandó el otro */ });
enlace.cambios.escuchar((e) => { /* e.conexion: sin-conexion | conectando | solo | directa | servidor */ });
await enlace.mandar({ tipo: "codigo", codigo: "7790001112223" }); // se cumple cuando el otro lo recibió
enlace.probarDirecta();   // si va por el servidor: olvida que no se pudo y prueba una vez
enlace.cerrar();
```

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
