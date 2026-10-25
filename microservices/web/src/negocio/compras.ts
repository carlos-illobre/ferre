import { api, reducirImagen } from "../datos/conexion";
import { consultas } from "../datos/conexion";
import { useDelServidor } from "./del-servidor";
import { stockCambio } from "./deposito/inventario";
import type { AnulacionDeCompra, CompraReciente, FotoDeComprobante, GastosDeLaSemana } from "@servidor/compras";
import type { Pedido } from "@servidor/pedidos";

// Las compras recientes y los gastos, una sola vez para el celular y la computadora (RNF-60).
// Están en Cómo va el negocio (decisión 67); anular una devuelve el stock que sumó.
export type CompraFila = CompraReciente;
export type Gastos = GastosDeLaSemana;

const COMPRAS = ["compras"] as const;

// Cada una se pide solo con su permiso: sin él, el servidor la rechaza (013-E02, E03).
export const useComprasRecientes = (activo = true) => useDelServidor<CompraFila[]>(COMPRAS, "/compras", { activo });
export const useGastosDeLaSemana = (activo = true) => useDelServidor<Gastos>([...COMPRAS, "semana"], "/compras/semana", { activo });

export const nombreDelComprobante = (c: CompraFila): string =>
  c.comprobante_tipo === "sin_comprobante" ? "sin comprobante" : `${c.comprobante_tipo}${c.comprobante_numero ? ` ${c.comprobante_numero}` : c.foto ? " con foto" : " sin foto"}`;

export async function anularCompra(id: string, motivo: string): Promise<void> {
  await api(`/compras/${id}/anular`, { method: "POST", body: JSON.stringify({ motivo: motivo.trim() } satisfies AnulacionDeCompra) });
  await consultas.invalidateQueries({ queryKey: COMPRAS });
  void stockCambio();
}

// Compras como la v2 (decisión 148): lo que muestran arriba las dos interfaces.
export type { Pedido };
const PEDIDOS = ["pedidos"] as const;
// Los pedidos que se mandaron y todavía no llegaron enteros: los «por llegar».
export function usePedidosPorLlegar(activo: boolean) {
  const { datos, error } = useDelServidor<Pedido[]>(PEDIDOS, "/pedidos", { activo });
  const porLlegar = (datos ?? []).filter((p) => p.estado === "enviado" || p.estado === "recibido_parcial");
  return { porLlegar: datos ? porLlegar : null, error };
}
export const faltanDe = (p: Pedido) => p.items.filter((i) => Number(i.recibido) < Number(i.cantidad)).length;

// Los siete días de la semana de los gastos, del primero al último. Lo de cada día sale de las
// compras recientes sin anular; si esas compras no alcanzan para explicar el total de la semana
// (hay más de las que trae la lista), no se dibuja nada: mejor vacío que un número que no cierra.
export function gastoPorDia(gastos: Gastos | null, compras: CompraFila[] | null): { letra: string; total: number }[] | null {
  if (!gastos?.desde || !compras) return null;
  const desde = new Date(`${gastos.desde}T00:00:00`);
  const dias = Array.from({ length: 7 }, (_, i) => { const d = new Date(desde.getTime() + i * 86_400_000); return { clave: d.toISOString().slice(0, 10), letra: "DLMMJVS"[d.getDay()]!, total: 0 }; });
  for (const c of compras) {
    if (c.estado === "anulada") continue;
    const dia = dias.find((d) => d.clave === c.fecha.slice(0, 10));
    if (dia) dia.total += Number(c.total);
  }
  const suma = dias.reduce((s, d) => s + d.total, 0);
  return Math.abs(suma - gastos.total) < 1 ? dias.map(({ letra, total }) => ({ letra, total })) : null;
}
// La inicial de cada día de la semana de los gastos (sin gastos, la semana de lunes a domingo).
export const letrasDeLaSemana = (gastos: Gastos | null): string[] => {
  if (!gastos) return [..."LMMJVSD"];
  const desde = new Date(`${gastos.desde}T00:00:00`);
  return Array.from({ length: 7 }, (_, i) => "DLMMJVS"[new Date(desde.getTime() + i * 86_400_000).getDay()]!);
};
// Las compras recientes que caen en la semana de los gastos.
export const esDeLaSemana = (c: CompraFila, gastos: Gastos | null): boolean => {
  if (!gastos) return false;
  const desde = new Date(`${gastos.desde}T00:00:00`).getTime();
  const dia = new Date(`${c.fecha.slice(0, 10)}T00:00:00`).getTime();
  return dia >= desde && dia < desde + 7 * 86_400_000;
};

// Qué se abre en Depósito → Compras (decisiones 149 y 153): el escritorio de compras para quien
// ve las compras o los gastos; si no, el ingreso para quien recibe mercadería, y los pedidos para
// quien solo encarga.
export type PantallaDeCompras = "escritorio" | "ingreso" | "pedidos";
export function pantallaDeCompras(puede: (...permisos: ("negocio.gastos" | "deposito.compras" | "deposito.ingresos")[]) => boolean): PantallaDeCompras {
  return puede("negocio.gastos", "deposito.compras") ? "escritorio" : puede("deposito.ingresos") ? "ingreso" : "pedidos";
}

// Cómo viene un pedido por llegar: a medias (con cuántos faltan) o enviado (cuándo y cuántos renglones).
export function comoVieneElPedido(p: Pedido, cuantos: (n: number, uno: string, varios: string) => string, dia: (iso: string) => string): { aMedias: boolean; texto: string } {
  if (p.estado === "recibido_parcial") return { aMedias: true, texto: `Llegó a medias · ${faltanDe(p) === 1 ? "falta 1" : `faltan ${faltanDe(p)}`}` };
  return { aMedias: false, texto: `Enviado${p.enviado_en ? ` el ${dia(p.enviado_en)}` : ""} · ${cuantos(p.items.length, "renglón", "renglones")}` };
}

// La foto del comprobante (RF-50), achicada, al servidor. Devuelve cómo se la nombra en la compra.
export async function subirFotoDelComprobante(f: File): Promise<string> {
  const datos = new FormData();
  datos.append("foto", await reducirImagen(f, 2000), "comprobante.jpg");
  return (await api<FotoDeComprobante>("/compras/fotos", { method: "POST", body: datos })).foto;
}
// Por qué no se subió: lo que dijo el servidor o, si no contestó, que falta la conexión.
export function porQueNoSeSubio(e: unknown): string {
  const err = e as { estado?: number; message: string };
  return err.estado ? `${err.message}.` : "Sin conexión: la foto se sube cuando vuelva internet. Probá de nuevo.";
}
