// Dobles de la red para las pruebas: un `fetch` que guarda cada pedido y deja contestar a mano, y
// un reloj que dispara las esperas cuando se le pide.
export type Pedido = { url: string; metodo: string; cabeceras: Record<string, string>; cuerpo: string | undefined };

export function fetchDePrueba() {
  const pedidos: Pedido[] = [];
  const flujos: Array<{ escribir(t: string): void; terminar(): void; fallar(): void }> = [];
  // Cómo contestar cada pedido: por omisión, un flujo abierto a un GET y 204 a un POST.
  let contestar: (p: Pedido) => Response | Promise<Response> | "flujo" = (p) => (p.metodo === "GET" ? "flujo" : new Response(null, { status: 204 }));
  const codificador = new TextEncoder();
  const fn = (async (url: string, init: RequestInit = {}) => {
    const p: Pedido = { url, metodo: init.method ?? "GET", cabeceras: (init.headers ?? {}) as Record<string, string>, cuerpo: init.body as string | undefined };
    pedidos.push(p);
    const r = contestar(p);
    if (r !== "flujo") return r;
    let control!: ReadableStreamDefaultController<Uint8Array>;
    const cuerpo = new ReadableStream<Uint8Array>({ start: (c) => { control = c; } });
    const flujo = { escribir: (t: string) => control.enqueue(codificador.encode(t)), terminar: () => control.close(), fallar: () => control.error(new Error("corte")) };
    init.signal?.addEventListener("abort", flujo.fallar);
    flujos.push(flujo);
    return new Response(cuerpo, { status: 200 });
  }) as unknown as typeof fetch;
  return {
    fetch: fn, pedidos, flujos,
    ultimo: () => flujos[flujos.length - 1]!,
    contestarCon: (f: typeof contestar) => { contestar = f; },
  };
}

export function relojDePrueba() {
  let ahora = 0;
  const esperas = new Map<number, { cuando: number; hacer: () => void }>();
  let siguiente = 0;
  return {
    ahora: () => ahora,
    esperar: (ms: number, hacer: () => void) => {
      const id = siguiente++;
      esperas.set(id, { cuando: ahora + ms, hacer });
      return () => { esperas.delete(id); };
    },
    // Avanza el reloj y dispara lo que venció.
    avanzar(ms: number) {
      ahora += ms;
      for (const [id, e] of [...esperas]) if (e.cuando <= ahora) { esperas.delete(id); e.hacer(); }
    },
    pendientes: () => esperas.size,
  };
}

// Deja correr las promesas pendientes.
export const soltar = () => new Promise((ok) => setTimeout(ok, 0));
