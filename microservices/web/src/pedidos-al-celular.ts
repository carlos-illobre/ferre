import { useSyncExternalStore } from "react";
import { alMensajeDelOtro, arrancarEnlace, mandarAlOtro } from "./enlace";
import { puestoLocal } from "./puesto";
import { reducirImagen } from "./datos/conexion";

// Lo que la computadora le pide a su celular emparejado (decisiones 59 y 152): que haga de lector
// o una foto (la factura de un ingreso, un producto, la captura de un ticket). Viaja por el
// enlace entre los dos (specs/023): sin código QR ni preguntas al servidor. Si el celular no está
// abierto, el pedido le llega al abrirlo.

// ---------- En la computadora ----------

// Pedir una foto al celular emparejado; se cumple con la foto como archivo. Sin celular
// emparejado, no se pide (devuelve null): en la computadora queda elegir un archivo (023-E24).
export function pedirFotoAlCelular(para: string): { foto: Promise<File>; cancelar: () => void } | null {
  if (!puestoLocal()) return null;
  const id = crypto.randomUUID();
  let dejar = () => {};
  const foto = new Promise<File>((listo) => {
    dejar = alMensajeDelOtro((m) => {
      if (m.tipo !== "foto" || m.id !== id || !esFoto(m.imagen)) return;
      dejar();
      listo(archivoDe(m.imagen));
    });
  });
  void mandarAlOtro({ tipo: "pedir-foto", id, para });
  return { foto, cancelar: () => dejar() };
}

// Lo que llega del otro lado se valida: una imagen JPEG, PNG o WebP, de hasta 15 MB.
const esFoto = (imagen: unknown): imagen is string =>
  typeof imagen === "string" && imagen.length <= 20_000_000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(imagen);

// La foto viaja como data URL (`data:image/jpeg;base64,…`): se vuelve archivo para seguir el
// camino de siempre (subirla como comprobante, foto del producto o captura del ticket).
function archivoDe(imagen: string): File {
  const [cabecera = "", base64 = ""] = imagen.split(",");
  const tipo = /^data:(image\/[\w.+-]+);base64$/.exec(cabecera)?.[1] ?? "image/jpeg";
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new File([bytes], `foto.${tipo === "image/png" ? "png" : tipo === "image/webp" ? "webp" : "jpg"}`, { type: tipo });
}

// ---------- En el celular ----------

export type PedidoDeFoto = { id: string; para: string };
type Pedidos = { lector: boolean; fotos: PedidoDeFoto[] };
let pedidos: Pedidos = { lector: false, fotos: [] };
const oyentes = new Set<() => void>();
const poner = (p: Pedidos) => { pedidos = p; oyentes.forEach((o) => o()); };

let escuchando = false;
function escuchar() {
  if (escuchando) return;
  escuchando = true;
  arrancarEnlace();
  alMensajeDelOtro((m) => {
    if (m.tipo === "pedir-lector") poner({ ...pedidos, lector: true });
    if (m.tipo === "pedir-foto" && typeof m.id === "string" && typeof m.para === "string") poner({ ...pedidos, fotos: [...pedidos.fotos.filter((f) => f.id !== m.id), { id: m.id, para: m.para.slice(0, 200) }] });
  });
}

// Lo que la computadora está pidiendo, para mostrarlo en el celular.
export function usePedidosDeLaCompu(): Pedidos {
  escuchar();
  return useSyncExternalStore((o) => { oyentes.add(o); return () => { oyentes.delete(o); }; }, () => pedidos);
}
export const fotoPedida = (id: string): PedidoDeFoto | null => pedidos.fotos.find((f) => f.id === id) ?? null;
export const lectorAtendido = () => poner({ ...pedidos, lector: false });
export const fotoDejada = (id: string) => poner({ ...pedidos, fotos: pedidos.fotos.filter((f) => f.id !== id) });

// Mandar la foto a la computadora: achicada, como data URL; se cumple cuando la recibió.
export async function mandarFotoALaCompu(id: string, archivo: File): Promise<void> {
  const reducida = await reducirImagen(archivo, 2000);
  const imagen = await new Promise<string>((listo, fallo) => {
    const lector = new FileReader();
    lector.onload = () => listo(String(lector.result));
    lector.onerror = () => fallo(lector.error);
    lector.readAsDataURL(reducida);
  });
  const envio = mandarAlOtro({ tipo: "foto", id, imagen });
  if (!envio) throw new Error("Este celular no está emparejado con una computadora.");
  await envio;
  fotoDejada(id);
}

// Para las pruebas: como al abrir la aplicación.
export function olvidarPedidos() { pedidos = { lector: false, fotos: [] }; escuchando = false; oyentes.clear(); }
