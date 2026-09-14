import { api, leerToken, urlApi } from "./api";

// Vinculación laptop–celular (issue #52). La laptop es un "puesto"; el celular vinculado
// le manda cada código escaneado. Ambos guardan su lado en el dispositivo.
export type PuestoLocal = { id: string; expira_en: string };           // en la laptop
export type PuestoRemoto = { id: string; expira_en: string; nombre: string | null }; // en el celular

const CLAVE_LOCAL = "ferre.puesto";
const CLAVE_REMOTO = "ferre.puesto-remoto";

function leer<T>(clave: string): T | null {
  try { const v = localStorage.getItem(clave); if (!v) return null; const p = JSON.parse(v) as T & { expira_en: string }; return new Date(p.expira_en).getTime() > Date.now() ? p : null; } catch { return null; }
}
export const puestoLocal = () => leer<PuestoLocal>(CLAVE_LOCAL);
export const puestoRemoto = () => leer<PuestoRemoto>(CLAVE_REMOTO);
export const guardarPuestoLocal = (p: PuestoLocal | null) => (p ? localStorage.setItem(CLAVE_LOCAL, JSON.stringify(p)) : localStorage.removeItem(CLAVE_LOCAL));
export const guardarPuestoRemoto = (p: PuestoRemoto | null) => (p ? localStorage.setItem(CLAVE_REMOTO, JSON.stringify(p)) : localStorage.removeItem(CLAVE_REMOTO));

// El celular manda un código a la laptop vinculada (si hay). Sin red, no se encola: el
// celular ya muestra el producto en su pantalla y el código pierde sentido después.
export async function enviarCodigoAlPuesto(codigo: string): Promise<boolean> {
  const p = puestoRemoto();
  if (!p) return false;
  try {
    await api(`/puestos/${p.id}/codigos`, { method: "POST", body: JSON.stringify({ codigo }) });
    return true;
  } catch (e) {
    if ((e as { estado?: number }).estado === 403) guardarPuestoRemoto(null);
    return false;
  }
}

// La laptop escucha los códigos de su puesto por un flujo de eventos que se reconecta
// solo. Se lee con fetch (no EventSource) para mandar el token en la cabecera.
export function escucharPuesto(puestoId: string, alRecibir: (codigo: string) => void, alCambiarEstado?: (conectado: boolean) => void): () => void {
  let activo = true;
  let control: AbortController | null = null;
  (async () => {
    while (activo) {
      control = new AbortController();
      try {
        const r = await fetch(urlApi(`/puestos/${puestoId}/eventos`), { headers: { Authorization: `Bearer ${leerToken() ?? ""}` }, signal: control.signal });
        if (r.status === 404 || r.status === 401) { guardarPuestoLocal(null); alCambiarEstado?.(false); return; }
        if (!r.ok || !r.body) throw new Error(`eventos ${r.status}`);
        alCambiarEstado?.(true);
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
            const datos = lineas.filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join("\n");
            if (evento === "codigo" && datos) {
              const c = JSON.parse(datos) as { id: string; codigo: string };
              alRecibir(c.codigo);
              api(`/puestos/${puestoId}/codigos/${c.id}/recibido`, { method: "POST" }).catch(() => undefined);
            }
          }
        }
      } catch {
        /* se reconecta abajo */
      }
      alCambiarEstado?.(false);
      if (activo) await new Promise((r) => setTimeout(r, 3000));
    }
  })();
  return () => { activo = false; control?.abort(); };
}
