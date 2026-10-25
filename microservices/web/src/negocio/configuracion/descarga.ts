import type { useDescarga } from "../../datos/almacenamiento";

// Los datos para trabajar sin conexión (specs/018, historia 5): cómo va la descarga, en palabras.
// La computadora lo explica largo; el celular, resumido (decisión 47).
type Descarga = ReturnType<typeof useDescarga>;
const numero = (n: number) => n.toLocaleString("es-AR");
const dos = (n: number) => String(n).padStart(2, "0");

export const porcentajeBajado = (avance: NonNullable<Descarga["avance"]>) => (avance.total ? Math.min(100, (avance.hechos / avance.total) * 100) : 0);

export function comoVaLaDescarga({ avance }: Pick<Descarga, "avance">, largo: boolean): string {
  if (!avance) return "";
  const bajando = avance.total ? `Bajando… ${numero(avance.hechos)} de ${numero(avance.total)} productos.` : `Bajando lo que cambió… ${numero(avance.hechos)} productos.`;
  return largo ? `${bajando} Se puede seguir usando la aplicación.` : bajando;
}

export function queSeBajo({ descarga }: Pick<Descarga, "descarga">, largo: boolean): string {
  if (!descarga) return largo ? "Todavía no se bajaron. Bajá los productos, el stock y los clientes para buscar y vender sin internet. Ocupa unos 10 MB; después, «Actualizar» trae solo lo que cambia." : "Todavía no se bajaron. Bajá los productos, el stock y los clientes para buscar y vender sin internet. Ocupa unos 10 MB.";
  const c = new Date(descarga.cuando);
  const cuando = `Bajados el ${dos(c.getDate())}/${dos(c.getMonth() + 1)} a las ${dos(c.getHours())}:${dos(c.getMinutes())}: ${numero(descarga.cuantos)} productos, su stock y los clientes.`;
  return largo ? `${cuando} Sin internet se busca acá. «Actualizar» trae solo lo que cambió desde entonces.` : `${cuando} «Actualizar» trae solo lo que cambió.`;
}

export const botonDeLaDescarga = ({ descarga, avance }: Pick<Descarga, "descarga" | "avance">) => (avance ? "Descargando…" : descarga ? "Actualizar" : "Descargar");
