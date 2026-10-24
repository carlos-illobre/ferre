// Ayudas de las pruebas: leer lo que llega por un flujo de eventos como una lista de bloques.
export function lectorDeFlujo(respuesta: Response) {
  const lector = respuesta.body!.getReader();
  const decodificador = new TextDecoder();
  let texto = "";
  // La lectura en curso: si no llegó nada a tiempo, se la reusa la vez siguiente (si no, lo que
  // llegue después se lo llevaría una lectura abandonada).
  let pendiente: Promise<ReadableStreamReadResult<Uint8Array>> | null = null;
  return {
    // Lee lo que haya llegado hasta ahora y devuelve los bloques completos.
    async leer(): Promise<string[]> {
      for (;;) {
        pendiente ??= lector.read();
        const r = await Promise.race([pendiente, new Promise<null>((ok) => setTimeout(() => ok(null), 5))]);
        if (!r) break;
        pendiente = null;
        if (r.done) break;
        texto += decodificador.decode(r.value);
      }
      const bloques = texto.split("\n\n");
      texto = bloques.pop()!;
      return bloques;
    },
    cancelar: () => lector.cancel(),
    async terminado() { const r = await (pendiente ?? lector.read()); pendiente = null; return r.done; },
  };
}
