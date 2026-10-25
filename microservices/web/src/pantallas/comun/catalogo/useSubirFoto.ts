import { useState, type ChangeEvent } from "react";

// Subir la foto nueva de un producto, en las dos interfaces: mientras sube y, si falla, el error
// dicho como lo dice cada pantalla (`explicar`); con `alError`, el error lo muestra quien llama.
export type AlSubir = (archivo: File) => Promise<unknown>;
export function useSubirFoto(alSubir: AlSubir | undefined, explicar: (mensaje: string) => string, alError?: (m: string) => void) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function recibir(f: File | undefined) {
    if (!f || !alSubir) return;
    setSubiendo(true); setError(null);
    try { await alSubir(f); } catch (err) { const m = explicar((err as Error).message); if (alError) alError(m); else setError(m); }
    finally { setSubiendo(false); }
  }
  // Lo elegido en un `<input type="file">`, que queda vacío para poder elegir el mismo otra vez.
  async function elegida(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    await recibir(f);
  }
  return { subiendo, error, setError, recibir, elegida };
}
