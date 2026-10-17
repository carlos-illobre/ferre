import { api, ErrorApi, EVENTO_SESION_CERRADA, urlApi } from "./api";
import { abrirBase, guardarMeta } from "./almacen";
import { guardaEnElDispositivo, SIN_CONEXION_Y_SIN_GUARDADO } from "./guardado";
import { crearCola, type Cambio } from "./plataforma/sin-conexion/cola";
import { idDelUsuarioDeEsteDispositivo } from "./sesion";

// La cola de cambios de Ferrebress hechos sin conexión (issue #18): ventas, «no llevó»,
// márgenes y precios, ajustes de stock, renglones de conteo. La cola en sí es tecnología de la
// plataforma; acá se dice cómo se mandan los cambios de esta aplicación y sus reglas:
// - un cambio de producto reemplaza al anterior del mismo producto que siga en la cola;
// - cada envío anota cuándo fue el último, para mostrar «Sincronizado hace…»;
// - un celular con el guardado deshabilitado (RF-84) manda directo, y si no hay conexión no
//   registra ni guarda nada y dice cómo habilitar el trabajo sin conexión;
// - cada cambio queda a nombre de quien lo hizo y sale solo con su sesión: si entra otra persona
//   en el dispositivo, lo que quedó sin mandar no sale a su nombre (decisión 97).
export type { Cambio };

const cola = crearCola({
  abrirBase,
  almacen: "cola",
  enviar: async (c) => { await api(c.ruta, { method: c.metodo, body: JSON.stringify(c.cuerpo), keepalive: true }); },
  estadoDe: (e) => (e as { estado?: number }).estado,
  seFunde: (c) => c.tipo === "producto.cambio",
  alEnviar: () => guardarMeta("ultimo_envio", new Date().toISOString()),
  autor: idDelUsuarioDeEsteDispositivo,
  errorSinBase: (e) => (!(e instanceof ErrorApi) && !guardaEnElDispositivo() ? new ErrorApi(503, SIN_CONEXION_Y_SIN_GUARDADO) : e),
});

export const alCambiarLaCola = cola.alCambiar;
export const pendientes = cola.pendientes;
export const apartados = cola.apartados;
export const enviarPendientes = cola.enviarPendientes;
export const enviarOEncolar = cola.enviarOEncolar;

// Los cambios de productos que todavía no llegaron al servidor, para aplicarlos sobre un
// catálogo recién bajado (que no los tiene). Se aplican en orden: el último gana.
export async function cambiosDeProductosPendientes(): Promise<Map<string, Record<string, unknown>>> {
  const resultado = new Map<string, Record<string, unknown>>();
  for (const c of await pendientes()) {
    const id = c.tipo === "producto.cambio" ? c.ruta.split("/").pop() : undefined;
    if (id) resultado.set(id, { ...resultado.get(id), ...(c.cuerpo as Record<string, unknown>) });
  }
  return resultado;
}

// Lo que dejó sin mandar alguien cuya sesión se cerró (014, ADR-021). Si a esa persona la
// desactivaron, sube al servidor con el token de esa sesión y queda apartado para que alguien lo
// revise; si sigue activa (409) o el token ya no es de ninguna sesión (401), queda en el
// dispositivo y sale cuando la persona vuelva a entrar. Sin conexión, se intenta de nuevo al volver.
const PARA_APARTAR = "ferre.para-apartar";
const POR_PEDIDO = 200;
type ParaApartar = { autor: string; token: string };
function leerParaApartar(): ParaApartar | null {
  try { const v = localStorage.getItem(PARA_APARTAR); return v ? (JSON.parse(v) as ParaApartar) : null; } catch { return null; }
}
function olvidarParaApartar(): void { try { localStorage.removeItem(PARA_APARTAR); } catch { /* sin almacenamiento */ } }
export async function apartarLoDeQuienSalio(): Promise<void> {
  const pendiente = leerParaApartar();
  if (!pendiente) return;
  const suyos = await cola.deAutor(pendiente.autor);
  for (let i = 0; i < suyos.length; i += POR_PEDIDO) {
    const lote = suyos.slice(i, i + POR_PEDIDO);
    let respuesta: Response;
    try {
      respuesta = await fetch(urlApi("/apartados"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${pendiente.token}` },
        body: JSON.stringify({ cambios: lote.map(({ orden, creado_en, tipo, metodo, ruta, cuerpo }) => ({ orden, creado_en, tipo, metodo, ruta, cuerpo })) }),
      });
    } catch { return; } // sin conexión: se intenta de nuevo
    if (respuesta.ok) { await cola.quitar(lote.map((c) => c.orden)); continue; }
    if (respuesta.status >= 500 || respuesta.status === 429) return; // el servidor no pudo: se intenta de nuevo
    break; // 409, 401 o 400: queda en el dispositivo, para cuando la persona vuelva a entrar
  }
  olvidarParaApartar();
}
if (typeof window !== "undefined") {
  window.addEventListener(EVENTO_SESION_CERRADA, (e) => {
    const token = (e as CustomEvent<{ token?: string } | null>).detail?.token;
    const autor = idDelUsuarioDeEsteDispositivo();
    if (!token || !autor) return;
    try { localStorage.setItem(PARA_APARTAR, JSON.stringify({ autor, token } satisfies ParaApartar)); } catch { return; }
    void apartarLoDeQuienSalio();
  });
  window.addEventListener("online", () => { void apartarLoDeQuienSalio(); });
  void apartarLoDeQuienSalio();
}
