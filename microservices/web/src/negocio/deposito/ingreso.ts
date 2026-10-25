import { useEffect, useMemo, useState } from "react";
import { api, ErrorApi } from "../../datos/conexion";
import { productoEnMemoria, traerPorIds, useCatalogo } from "../catalogo";
import { contarAlEspejo, useEspejar } from "../../espejo";
import { hoyLocal } from "../formato";
import type { Producto } from "../catalogo";
import { useProveedoresActivos, type Proveedor } from "../proveedores";
import { ingresoParaElEspejo, renglonesDeIngresoDelEspejo, type IngresoEnEspejo } from "./ingreso-en-espejo";
import type { ItemDePedido, Pedido } from "@servidor/pedidos";
import type { CompraEntrada, CompraRegistrada, CompraRepetida } from "@servidor/compras";
import { leerBorrador, useGuardarBorrador, type Borrador } from "./ingreso-borrador";
import { useRenglonesDelIngreso } from "./ingreso-renglones";

// El ingreso de mercadería, una sola vez para el celular y la computadora (RNF-60): proveedor y
// comprobante, los renglones que llegaron y registrar. Suma stock y, si el comprobante trae
// otro costo, ese pasa a ser el vigente. Las pantallas solo muestran y deciden dónde va el foco.
export type { Comprobante, Renglon } from "./tipos-del-ingreso";
import type { Comprobante, Renglon } from "./tipos-del-ingreso";
export type { Proveedor };

// El pedido del que viene la mercadería (RF-55): el ingreso arranca con su proveedor y con lo que falta llegar.
export type PedidoAIngresar = Pick<Pedido, "id" | "proveedor_id"> & { items: Pick<ItemDePedido, "producto_id" | "descripcion" | "cantidad" | "recibido" | "costo_estimado">[] };
// Lo que falta para poder registrar, en el orden en que se pide.
export type Falta = "proveedor" | "productos" | "renglones";
export type Registro = { total: number; proveedor: string; renglones: number; costosActualizados: number; productosNuevos: number; dePedido: boolean };

export type OpcionesDeIngreso = {
  lado: "computadora" | "celular";
  // Cómo escribe esta pantalla un costo en su campo (con coma o con punto).
  costoATexto: (costo: number) => string;
  textoSinConexion: string;
  pedido: PedidoAIngresar | null;
  // Con una clave, lo cargado se guarda en el dispositivo y sobrevive a una recarga hasta registrarlo o descartarlo.
  borrador?: string;
};

// Cuánto cambió el costo contra la lista, en porcentaje; `null` si no hay con qué comparar.
export const diferenciaConLaLista = (r: Renglon): number | null => (r.costo !== null && r.costoLista !== null && r.costoLista > 0 ? ((r.costo - r.costoLista) / r.costoLista) * 100 : null);
export const incompleto = (r: Renglon): boolean => r.costo === null || !r.descripcion.trim() || r.cantidad <= 0;

const plural = (n: number, uno: string, varios: string) => `${n.toLocaleString("es-AR")} ${n === 1 ? uno : varios}`;
export const detalleDelRegistro = (r: Registro): string =>
  `${plural(r.renglones, "renglón sumado", "renglones sumados")} al stock · ${plural(r.costosActualizados, "costo actualizado", "costos actualizados")} según el comprobante${r.productosNuevos ? ` · ${plural(r.productosNuevos, "producto nuevo", "productos nuevos")}` : ""}.`;

export function renglonesDelPedido(pedido: PedidoAIngresar, catalogo: Producto[], costoATexto: (costo: number) => string): Renglon[] {
  return pedido.items.filter((i) => Number(i.recibido) < Number(i.cantidad)).map((i) => {
    const costo = i.costo_estimado === null ? null : Number(i.costo_estimado);
    return {
      clave: crypto.randomUUID(), producto: catalogo.find((p) => p.id === i.producto_id) ?? null, descripcion: i.descripcion,
      cantidad: Math.round((Number(i.cantidad) - Number(i.recibido)) * 1000) / 1000, costo, costoTexto: costo === null ? "" : costoATexto(costo), costoLista: costo,
    };
  });
}

type Cabecera = Omit<Borrador, "renglones">;

// Proveedor, comprobante, foto y fecha: los del borrador, si había.
function cabeceraInicial(b: Borrador | null): Cabecera {
  if (!b) return { proveedorId: "", comprobante: "factura", foto: null, fechaCompra: hoyLocal() };
  return { proveedorId: b.proveedorId ?? "", comprobante: b.comprobante ?? "factura", foto: b.foto ?? null, fechaCompra: b.fechaCompra ?? hoyLocal() };
}
function useCabecera(borrador: Borrador | null) {
  const [inicial] = useState(() => cabeceraInicial(borrador));
  const [proveedorId, setProveedorId] = useState(inicial.proveedorId);
  const [comprobante, setComprobante] = useState<Comprobante>(inicial.comprobante);
  const [foto, setFoto] = useState<string | null>(inicial.foto);
  const [fechaCompra, setFechaCompra] = useState(inicial.fechaCompra);
  return { proveedorId, setProveedorId, comprobante, setComprobante, foto, setFoto, fechaCompra, setFechaCompra };
}

// Los productos del pedido se piden al servidor antes de armar los renglones (specs/018).
function useDelPedido(pedido: PedidoAIngresar | null, costoATexto: (costo: number) => string, setProveedorId: (id: string) => void, setRenglones: (r: Renglon[]) => void) {
  useEffect(() => {
    if (!pedido) return;
    let vigente = true;
    void traerPorIds(pedido.items.map((i) => i.producto_id)).then(() => {
      if (!vigente) return;
      setProveedorId(pedido.proveedor_id);
      setRenglones(renglonesDelPedido(pedido, pedido.items.map((i) => productoEnMemoria(i.producto_id)).filter((p): p is Producto => Boolean(p)), costoATexto));
    });
    return () => { vigente = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido]);
}

// Primero los productos del proveedor elegido; después el resto. El servidor ya los ordena así
// sobre todo lo encontrado; acá se ordena lo que llegó.
function useResultados(buscarProductos: (consulta: string, maximo?: number, primero?: string | null) => Producto[], consulta: string, proveedor: Proveedor | null) {
  return useMemo(() => {
    if (!consulta.trim()) return [];
    const todos = buscarProductos(consulta, 16, proveedor?.id);
    return proveedor ? [...todos.filter((p) => p.proveedor === proveedor.nombre), ...todos.filter((p) => p.proveedor !== proveedor.nombre)].slice(0, 8) : todos.slice(0, 8);
  }, [buscarProductos, consulta, proveedor]);
}

function cuentas(proveedorId: string, renglones: Renglon[]) {
  const total = renglones.reduce((s, r) => s + (r.costo ?? 0) * r.cantidad, 0);
  const incompletos = renglones.filter(incompleto).length;
  const falta: Falta | null = !proveedorId ? "proveedor" : renglones.length === 0 ? "productos" : incompletos ? "renglones" : null;
  return { total, incompletos, falta };
}

const compraDe = (c: Cabecera, renglones: Renglon[], pedido: PedidoAIngresar | null): CompraEntrada => ({
  id: crypto.randomUUID(), proveedor_id: c.proveedorId, fecha: c.fechaCompra, comprobante_tipo: c.comprobante, foto: c.comprobante === "sin_comprobante" ? null : c.foto,
  pedido_id: pedido?.id ?? null,
  items: renglones.map((x) => ({ producto_id: x.producto?.id ?? null, descripcion: x.descripcion.trim(), cantidad: x.cantidad, costo_unitario: x.costo! })),
});

const registroDe = (r: CompraRegistrada | CompraRepetida, proveedor: Proveedor | null, renglones: number, dePedido: boolean): Registro => (
  { total: r.total, proveedor: proveedor?.nombre ?? "", renglones, costosActualizados: "repetida" in r ? 0 : r.costos_actualizados, productosNuevos: "repetida" in r ? 0 : r.productos_nuevos, dePedido });

type ParaRegistrar = { cabecera: Cabecera; renglones: Renglon[]; proveedor: Proveedor | null; falta: Falta | null; opciones: OpcionesDeIngreso; alRegistrar: () => void };

// Registra si no falta nada. Devuelve lo registrado, o `null` si faltaba algo o el servidor
// no lo aceptó (el motivo queda en `error`); lo cargado se conserva para corregir.
function useRegistrar() {
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  async function registrar({ cabecera, renglones, proveedor, falta, opciones, alRegistrar }: ParaRegistrar): Promise<Registro | null> {
    if (ocupado || falta) return null;
    setOcupado(true); setError(null);
    try {
      const r = await api<CompraRegistrada | CompraRepetida>("/compras", { method: "POST", body: JSON.stringify(compraDe(cabecera, renglones, opciones.pedido)) });
      alRegistrar();
      contarAlEspejo(`Ingreso de ${proveedor?.nombre ?? "mercadería"} registrado en ${opciones.lado === "celular" ? "el celular" : "la computadora"}`);
      return registroDe(r, proveedor, renglones.length, opciones.pedido !== null);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : opciones.textoSinConexion);
      return null;
    } finally {
      setOcupado(false);
    }
  }
  return { error, setError, ocupado, registrar };
}

export function useIngreso(opciones: OpcionesDeIngreso) {
  const { costoATexto, pedido } = opciones;
  const { catalogo, error: errorCatalogo, buscarProductos, actualizarProducto } = useCatalogo();
  const [borrador] = useState(() => leerBorrador(opciones.borrador));
  const proveedores = useProveedoresActivos();
  const c = useCabecera(borrador);
  const r = useRenglonesDelIngreso(borrador?.renglones ?? [], costoATexto, actualizarProducto);
  const reg = useRegistrar();
  const { proveedorId, comprobante, foto, fechaCompra } = c;

  // En espejo (decisión 60): el ingreso es uno solo, lo cargue quien lo cargue.
  useEspejar<IngresoEnEspejo>("ingreso", useMemo(() => ingresoParaElEspejo(proveedorId, comprobante, foto, fechaCompra, r.renglones), [proveedorId, comprobante, foto, fechaCompra, r.renglones]), (v) => {
    c.setProveedorId(v.proveedorId); c.setComprobante(v.comprobante as Comprobante); c.setFoto(v.foto); c.setFechaCompra(v.fecha);
    r.setRenglones((previos) => renglonesDeIngresoDelEspejo(v, catalogo, previos, costoATexto));
  }, true);
  useDelPedido(pedido, costoATexto, c.setProveedorId, r.setRenglones);
  useGuardarBorrador(opciones.borrador, { proveedorId, comprobante, foto, fechaCompra, renglones: r.renglones });
  // Lo que respondió el servidor deja de valer en cuanto se toca lo cargado.
  useEffect(() => { reg.setError(null); }, [proveedorId, comprobante, foto, fechaCompra, r.renglones]); // eslint-disable-line react-hooks/exhaustive-deps

  const proveedor = proveedores?.find((p) => p.id === proveedorId) ?? null;
  const resultados = useResultados(buscarProductos, r.consulta, proveedor);
  const { total, incompletos, falta } = cuentas(proveedorId, r.renglones);
  const registrar = () => reg.registrar({ cabecera: { proveedorId, comprobante, foto, fechaCompra }, renglones: r.renglones, proveedor, falta, opciones, alRegistrar: () => { r.setRenglones([]); c.setFoto(null); } });
  const { setRenglones: _, ...renglones } = r;
  return { catalogo, errorCatalogo, proveedores, proveedor, ...c, ...renglones, resultados, total, incompletos, falta, error: reg.error, setError: reg.setError, ocupado: reg.ocupado, registrar };
}
