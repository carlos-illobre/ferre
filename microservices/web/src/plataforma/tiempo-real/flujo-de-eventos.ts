// Escuchar un flujo de eventos del servidor (SSE) con la sesión en la cabecera, cosa que el
// `EventSource` del navegador no permite. Lee el flujo, entrega cada evento y, si la conexión
// se corta, espera y vuelve a conectar sola. Sirve para cualquier aplicación.
export type OpcionesDeFlujo = {
  url: string;
  // Las cabeceras de cada intento (el token puede cambiar entre un intento y otro).
  cabeceras?: () => Record<string, string>;
  // Qué hacer con el código de respuesta antes de leer. «cortar» deja de escuchar para siempre
  // (por ejemplo, si lo que se escuchaba ya no existe).
  alResponder?: (estado: number) => "cortar" | void;
  // Cada evento, con sus datos ya leídos de JSON (o nada). «cortar» deja de escuchar.
  alEvento: (evento: string, datos: unknown) => "cortar" | void;
  // La conexión se cortó y se va a reintentar.
  alDesconectar?: () => void;
  // Eventos que no se entregan (los latidos que mantienen viva la conexión).
  ignorar?: readonly string[];
  esperaMs?: number;
};

// Devuelve la función que deja de escuchar.
export function escucharFlujo(opciones: OpcionesDeFlujo): () => void {
  let activo = true;
  let control: AbortController | null = null;
  (async () => {
    while (activo) {
      control = new AbortController();
      try {
        const r = await fetch(opciones.url, { headers: opciones.cabeceras?.() ?? {}, signal: control.signal });
        if (opciones.alResponder?.(r.status) === "cortar") return;
        if (!r.ok || !r.body) throw new Error(`flujo ${r.status}`);
        const lector = r.body.getReader();
        const decodificador = new TextDecoder();
        let resto = "";
        while (activo) {
          const { value, done } = await lector.read();
          if (done) break;
          resto += decodificador.decode(value, { stream: true });
          const bloques = resto.split("\n\n");
          resto = bloques.pop() ?? "";
          for (const bloque of bloques) {
            const lineas = bloque.split("\n");
            const evento = lineas.find((l) => l.startsWith("event:"))?.slice(6).trim();
            const crudo = lineas.filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join("\n");
            if (!evento || opciones.ignorar?.includes(evento)) continue;
            if (opciones.alEvento(evento, crudo ? (JSON.parse(crudo) as unknown) : null) === "cortar") return;
          }
        }
      } catch { /* se reconecta abajo */ }
      if (activo) { opciones.alDesconectar?.(); await new Promise((r) => setTimeout(r, opciones.esperaMs ?? 3000)); }
    }
  })();
  return () => { activo = false; control?.abort(); };
}
