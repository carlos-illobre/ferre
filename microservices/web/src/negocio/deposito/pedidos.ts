import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Proveedor as ProveedorDelServidor } from "@servidor/proveedores";
import type { BorradorDePedido, EnvioDePedido, Pedido } from "@servidor/pedidos";
import { api } from "../../datos/conexion";
import { conUnidad, traerPorIds, type Producto } from "../catalogo";

// Pedidos a proveedores (RF-55, decisión 52), una sola vez para el celular y la computadora: la
// lista, el borrador que se guarda solo mientras se arma, el mensaje que recibe el proveedor (sin
// costos) y el pedido que se manda, llega o se cierra.
export type { Pedido };
export type ProveedorDelPedido = Pick<ProveedorDelServidor, "id" | "nombre" | "activo" | "whatsapp">;
export type RenglonDelPedido = { producto_id: string; descripcion: string; marca: string | null; unidad: string; codigo: string | null; cantidad: number; costo: number | null };
export type Borrador = { id: string; proveedorId: string; renglones: RenglonDelPedido[] };

export const ESTADOS: Record<Pedido["estado"], string> = { borrador: "Borrador", enviado: "Enviado", recibido_parcial: "Recibido parcial", recibido: "Recibido", cancelado: "Cancelado", cerrado_incompleto: "Cerrado incompleto" };
export const cantidadConUnidad = (cantidad: number, unidad: string) => conUnidad(cantidad, unidad);
export const pluralDelPedido = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
export const esperaMercaderia = (p: Pick<Pedido, "estado">) => p.estado === "enviado" || p.estado === "recibido_parcial";
// Un error del servidor ya viene en castellano; cualquier otro es que no hubo conexión.
export const mensajeDePedido = (e: unknown, quehacer: string) => ((e as { estado?: number }).estado ? `${(e as Error).message}.` : `Sin conexión: ${quehacer} necesita internet.`);

// El mensaje que recibe el proveedor: el negocio, la fecha y, por renglón, cantidad,
// descripción y su código. Sin costos ni total (decisión 52).
export function textoDelPedido(renglones: { descripcion: string; codigo: string | null; cantidad: number; unidad: string }[], fecha = new Date()): string {
  const lineas = renglones.map((r) => `${cantidadConUnidad(r.cantidad, r.unidad)} × ${r.descripcion}${r.codigo ? ` (${r.codigo})` : ""}`);
  return `Ferrebress · pedido del ${fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}\n\n${lineas.join("\n")}\n\n${pluralDelPedido(renglones.length, "renglón", "renglones")}. Gracias.`;
}

// Lo que ese proveedor cobra por el producto y con qué código lo conoce, según su última lista.
export function segunProveedor(p: Producto, proveedor: ProveedorDelPedido): { codigo: string | null; costo: number | null } {
  const suyo = p.proveedores?.find((x) => x.proveedor_id === proveedor.id);
  if (suyo) return { codigo: suyo.codigo_proveedor, costo: Number(suyo.costo_neto) };
  if (p.proveedor === proveedor.nombre) return { codigo: p.codigo_proveedor, costo: p.costo_neto === null ? null : Number(p.costo_neto) };
  return { codigo: null, costo: null };
}
export const aRenglones = (p: Pedido): RenglonDelPedido[] => p.items.map((i) => ({ producto_id: i.producto_id, descripcion: i.descripcion, marca: i.marca, unidad: i.unidad, codigo: i.codigo_proveedor, cantidad: Number(i.cantidad), costo: i.costo_estimado === null ? null : Number(i.costo_estimado) }));
export const totalDelPedido = (renglones: { cantidad: number; costo: number | null }[]) => renglones.reduce((s, r) => s + r.cantidad * (r.costo ?? 0), 0);

// Los pedidos (null mientras llegan) y los proveedores activos, para quien encarga.
export function usePedidos(encarga: boolean) {
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [proveedores, setProveedores] = useState<ProveedorDelPedido[]>([]);
  const [error, setError] = useState<string | null>(null);
  const cargar = useCallback(async () => {
    try { setPedidos(await api<Pedido[]>("/pedidos")); setError(null); }
    catch (e) { setError(mensajeDePedido(e, "ver los pedidos")); }
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);
  useEffect(() => { if (encarga) api<ProveedorDelPedido[]>("/proveedores").then((l) => setProveedores(l.filter((p) => p.activo))).catch(() => undefined); }, [encarga]);
  return { pedidos, proveedores, error, cargar };
}

// El borrador: sus renglones, que se guardan solos un momento después de dejar de tocar.
export function useBorrador(inicial: Borrador, proveedor: ProveedorDelPedido) {
  const [renglones, setRenglones] = useState<RenglonDelPedido[]>(inicial.renglones);
  const [guardado, setGuardado] = useState<"si" | "guardando" | "no">("si");
  const [error, setError] = useState<string | null>(null);
  const existe = useRef(inicial.renglones.length > 0);
  const guardar = useCallback(async (lista: RenglonDelPedido[]) => {
    setGuardado("guardando");
    try {
      await api(`/pedidos/${inicial.id}`, { method: "PUT", body: JSON.stringify({ proveedor_id: proveedor.id, items: lista.map((r) => ({ producto_id: r.producto_id, cantidad: r.cantidad })) } satisfies BorradorDePedido) });
      existe.current = true; setGuardado("si"); setError(null); return true;
    } catch (e) { setGuardado("no"); setError(mensajeDePedido(e, "guardar el pedido")); return false; }
  }, [inicial.id, proveedor.id]);
  const primera = useRef(true);
  useEffect(() => {
    if (primera.current) { primera.current = false; return; }
    const t = setTimeout(() => void guardar(renglones), 500);
    return () => clearTimeout(t);
  }, [renglones, guardar]);
  const agregar = useCallback((p: Producto) => setRenglones((l) => (l.some((r) => r.producto_id === p.id)
    ? l.map((r) => (r.producto_id === p.id ? { ...r, cantidad: r.cantidad + 1 } : r))
    : [...l, { producto_id: p.id, descripcion: p.descripcion, marca: p.marca, unidad: p.unidad, cantidad: 1, ...segunProveedor(p, proveedor) }])), [proveedor]);
  // Borrar el borrador: si nunca se guardó, alcanza con soltarlo. Devuelve si se pudo.
  async function borrar(): Promise<boolean> {
    if (!existe.current) return true;
    try { await api(`/pedidos/${inicial.id}`, { method: "DELETE" }); return true; } catch (e) { setError(mensajeDePedido(e, "borrar el borrador")); return false; }
  }
  return {
    renglones, setRenglones, guardado, error, setError, guardar, agregar, borrar,
    cambiar: (id: string, cantidad: number) => setRenglones((l) => l.map((r) => (r.producto_id === id ? { ...r, cantidad } : r))),
    quitar: (id: string) => setRenglones((l) => l.filter((x) => x.producto_id !== id)),
  };
}

// Lo encontrado para pedir: primero lo que figura en la lista del proveedor.
export function useParaPedir(buscarProductos: (q: string, n: number, primero?: string) => Producto[], consulta: string, proveedor: ProveedorDelPedido) {
  return useMemo(() => {
    if (!consulta.trim()) return [];
    const todos = buscarProductos(consulta, 16, proveedor.id);
    const suyos = todos.filter((p) => segunProveedor(p, proveedor).costo !== null);
    return [...suyos, ...todos.filter((p) => !suyos.includes(p))].slice(0, 8);
  }, [buscarProductos, consulta, proveedor]);
}

// Mandarlo: queda «Enviado»; si se dio un WhatsApp nuevo, se guarda para la próxima.
export const marcarEnviado = (id: string, whatsapp?: string) => api(`/pedidos/${id}/enviar`, { method: "POST", body: JSON.stringify((whatsapp ? { whatsapp } : {}) satisfies EnvioDePedido) });
// Cancelar uno que no llegó, o cerrar uno que llegó en parte.
export const cerrarPedido = (id: string, accion: "cancelar" | "cerrar") => api(`/pedidos/${id}/${accion}`, { method: "POST", body: "{}" });

// ---------- El ingreso de mercadería desde un pedido (RF-50) ----------
// El pedido que se está ingresando viaja en la dirección (…?pedido=<id>). Lo leen los dos
// ingresos, el del celular y el de la computadora, para precargar el proveedor y lo que falta llegar.
const pedidoDeLaDireccion = () => new URLSearchParams(location.hash.split("?")[1] ?? "").get("pedido");
export function usePedidoAIngresar(): { pedido: Pedido | null; error: string | null } {
  const [id, setId] = useState(pedidoDeLaDireccion);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { const alCambiar = () => setId(pedidoDeLaDireccion()); window.addEventListener("hashchange", alCambiar); return () => window.removeEventListener("hashchange", alCambiar); }, []);
  useEffect(() => {
    if (!id) { setPedido(null); setError(null); return; }
    let vigente = true;
    api<Pedido>(`/pedidos/${id}`).then((p) => { void traerPorIds(p.items.map((i) => i.producto_id)); if (vigente) { setPedido(esperaMercaderia(p) ? p : null); setError(esperaMercaderia(p) ? null : "Ese pedido ya no espera mercadería."); } })
      .catch((e) => { if (vigente) setError(mensajeDePedido(e, "traer el pedido")); });
    return () => { vigente = false; };
  }, [id]);
  return { pedido, error };
}
