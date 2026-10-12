import { api, leerToken, urlApi } from "./api";

// Emparejamiento computadora–celular (issue #52, decisión 58). La computadora es un "puesto";
// el celular emparejado le manda cada código escaneado y recibe sus pedidos de foto. Nace solo
// cuando el celular deja entrar a la computadora, o leyendo el código de Vender. Ambos guardan
// su lado en el dispositivo y lo ponen al día con el servidor al abrir la aplicación.
export type PuestoLocal = { id: string; expira_en: string };           // en la laptop
export type PuestoRemoto = { id: string; expira_en: string; nombre: string | null }; // en el celular

const CLAVE_LOCAL = "ferre.puesto";
const CLAVE_REMOTO = "ferre.puesto-remoto";

function leer<T>(clave: string): T | null {
  try { const v = localStorage.getItem(clave); if (!v) return null; const p = JSON.parse(v) as T & { expira_en: string }; return new Date(p.expira_en).getTime() > Date.now() ? p : null; } catch { return null; }
}
export const puestoLocal = () => leer<PuestoLocal>(CLAVE_LOCAL);
export const puestoRemoto = () => leer<PuestoRemoto>(CLAVE_REMOTO);
// Quien muestre el emparejamiento (Vender, Productos, el aviso de fotos) se entera cuando cambia.
export const EVENTO_EMPAREJAMIENTO = "ferre:emparejamiento";
function guardarLado(clave: string, p: object | null) {
  const antes = localStorage.getItem(clave);
  if (p) localStorage.setItem(clave, JSON.stringify(p)); else localStorage.removeItem(clave);
  if (antes !== localStorage.getItem(clave)) window.dispatchEvent(new Event(EVENTO_EMPAREJAMIENTO));
}
export const guardarPuestoLocal = (p: PuestoLocal | null) => guardarLado(CLAVE_LOCAL, p);
export const guardarPuestoRemoto = (p: PuestoRemoto | null) => guardarLado(CLAVE_REMOTO, p);

// Lo que dice el servidor manda sobre lo guardado: si del otro lado soltaron el emparejamiento
// o cerraron la sesión, acá deja de figurar. Sin conexión, queda lo guardado.
export async function sincronizarEmparejamiento(): Promise<{ comoComputadora: PuestoLocal | null; comoCelular: PuestoRemoto | null } | null> {
  try {
    const r = await api<{ comoComputadora: PuestoLocal | null; comoCelular: PuestoRemoto | null }>("/puestos/mio");
    guardarPuestoLocal(r.comoComputadora ? { id: r.comoComputadora.id, expira_en: r.comoComputadora.expira_en } : null);
    guardarPuestoRemoto(r.comoCelular);
    return r;
  } catch { return null; }
}

// Soltar el emparejamiento, desde cualquiera de los dos lados.
export async function soltarEmparejamiento(): Promise<void> {
  const id = puestoLocal()?.id ?? puestoRemoto()?.id;
  if (id) await api(`/puestos/${id}`, { method: "DELETE" }).catch(() => undefined);
  guardarPuestoLocal(null); guardarPuestoRemoto(null);
}

// El celular emparejado manda a la computadora lo que escanea, salvo que se lo apague (para
// vender desde el celular sin que los productos aparezcan también en la venta de la computadora).
const CLAVE_MANDA = "ferre.puesto-remoto-manda";
export const mandaLoQueEscanea = () => { try { return localStorage.getItem(CLAVE_MANDA) !== "no"; } catch { return true; } };
export function fijarMandaLoQueEscanea(manda: boolean) { try { localStorage.setItem(CLAVE_MANDA, manda ? "si" : "no"); } catch { /* sin almacenamiento */ } window.dispatchEvent(new Event(EVENTO_EMPAREJAMIENTO)); }

// El celular manda un código a la laptop vinculada (si hay). Sin red, no se encola: el
// celular ya muestra el producto en su pantalla y el código pierde sentido después.
export async function enviarCodigoAlPuesto(codigo: string): Promise<boolean> {
  const p = puestoRemoto();
  if (!p || !mandaLoQueEscanea()) return false;
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
// `soloNuevos`: no recibir lo que se escaneó antes de empezar a escuchar (para quien espera
// un código en particular, no para la venta, que sí recupera lo que se perdió en un corte).
export function escucharPuesto(puestoId: string, alRecibir: (codigo: string) => void, alCambiarEstado?: (conectado: boolean) => void, soloNuevos = false): () => void {
  let activo = true;
  let control: AbortController | null = null;
  (async () => {
    while (activo) {
      control = new AbortController();
      try {
        const r = await fetch(urlApi(`/puestos/${puestoId}/eventos${soloNuevos ? "?nuevos=1" : ""}`), { headers: { Authorization: `Bearer ${leerToken() ?? ""}` }, signal: control.signal });
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
