import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ErrorApi } from "../../datos/conexion";
import { productoEnMemoria, traerPorCodigo, traerPorIds, useCatalogo } from "../catalogo";
import { contarAlEspejo, useEspejar } from "../../espejo";
import { hoyLocal } from "../formato";
import type { Producto } from "../catalogo";
import { useProveedoresActivos, type Proveedor } from "../proveedores";
import { ingresoParaElEspejo, renglonesDeIngresoDelEspejo, type IngresoEnEspejo } from "./ingreso-en-espejo";
import type { ItemDePedido, Pedido } from "@servidor/pedidos";
import type { CompraEntrada, CompraRegistrada, CompraRepetida, TipoDeComprobante } from "@servidor/compras";

// El ingreso de mercadería, una sola vez para el celular y la computadora (RNF-60): proveedor y
// comprobante, los renglones que llegaron y registrar. Suma stock y, si el comprobante trae
// otro costo, ese pasa a ser el vigente. Las pantallas solo muestran y deciden dónde va el foco.
export type Comprobante = TipoDeComprobante;
export type Renglon = { clave: string; producto: Producto | null; descripcion: string; cantidad: number; costo: number | null; costoTexto: string; costoLista: number | null };
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

type Borrador = { proveedorId: string; comprobante: Comprobante; foto: string | null; fechaCompra: string; renglones: Renglon[] };
function leerBorrador(clave: string | undefined): Borrador | null {
  if (!clave) return null;
  try {
    const b = JSON.parse(localStorage.getItem(clave) ?? "null") as Borrador | null;
    return b && Array.isArray(b.renglones) && b.renglones.length > 0 ? b : null;
  } catch { return null; }
}

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

export function useIngreso(opciones: OpcionesDeIngreso) {
  const { costoATexto, pedido } = opciones;
  const { catalogo, error: errorCatalogo, buscarProductos, actualizarProducto } = useCatalogo();
  const [borrador] = useState(() => leerBorrador(opciones.borrador));
  const proveedores = useProveedoresActivos();
  const [proveedorId, setProveedorId] = useState(borrador?.proveedorId ?? "");
  const [comprobante, setComprobante] = useState<Comprobante>(borrador?.comprobante ?? "factura");
  const [foto, setFoto] = useState<string | null>(borrador?.foto ?? null);
  const [fechaCompra, setFechaCompra] = useState(borrador?.fechaCompra ?? hoyLocal());
  const [consulta, setConsulta] = useState("");
  const [renglones, setRenglones] = useState<Renglon[]>(borrador?.renglones ?? []);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const lista = useRef(renglones);
  lista.current = renglones;

  // En espejo (decisión 60): el ingreso es uno solo, lo cargue quien lo cargue.
  useEspejar<IngresoEnEspejo>("ingreso", useMemo(() => ingresoParaElEspejo(proveedorId, comprobante, foto, fechaCompra, renglones), [proveedorId, comprobante, foto, fechaCompra, renglones]), (v) => {
    setProveedorId(v.proveedorId); setComprobante(v.comprobante as Comprobante); setFoto(v.foto); setFechaCompra(v.fecha);
    setRenglones((previos) => renglonesDeIngresoDelEspejo(v, catalogo, previos, costoATexto));
  }, true);

  // Los productos del pedido se piden al servidor antes de armar los renglones (specs/018).
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

  const claveDelBorrador = opciones.borrador;
  useEffect(() => {
    if (!claveDelBorrador) return;
    try {
      if (renglones.length) localStorage.setItem(claveDelBorrador, JSON.stringify({ proveedorId, comprobante, foto, fechaCompra, renglones } satisfies Borrador));
      else localStorage.removeItem(claveDelBorrador);
    } catch { /* sin lugar o sin permiso: se sigue sin borrador */ }
  }, [claveDelBorrador, proveedorId, comprobante, foto, fechaCompra, renglones]);
  // Lo que respondió el servidor deja de valer en cuanto se toca lo cargado.
  useEffect(() => { setError(null); }, [proveedorId, comprobante, foto, fechaCompra, renglones]);

  const proveedor = proveedores?.find((p) => p.id === proveedorId) ?? null;

  // Primero los productos del proveedor elegido; después el resto. El servidor ya los ordena así
  // sobre todo lo encontrado; acá se ordena lo que llegó.
  const resultados = useMemo(() => {
    if (!consulta.trim()) return [];
    const todos = buscarProductos(consulta, 16, proveedor?.id);
    return proveedor ? [...todos.filter((p) => p.proveedor === proveedor.nombre), ...todos.filter((p) => p.proveedor !== proveedor.nombre)].slice(0, 8) : todos.slice(0, 8);
  }, [buscarProductos, consulta, proveedor]);

  // Un producto que ya está suma uno a su renglón; sin producto, es uno nuevo con la descripción tipeada.
  const agregar = useCallback((p: Producto | null, libre?: string): { clave: string; cantidad: number } => {
    const ya = p ? lista.current.find((r) => r.producto?.id === p.id) : undefined;
    const clave = ya?.clave ?? crypto.randomUUID();
    const costoLista = p && p.costo_neto !== null ? Number(p.costo_neto) : null;
    setRenglones((l) => ya
      ? l.map((r) => (r.clave === clave ? { ...r, cantidad: r.cantidad + 1 } : r))
      : [...l, { clave, producto: p, descripcion: p?.descripcion ?? libre ?? "", cantidad: 1, costo: costoLista, costoTexto: costoLista === null ? "" : costoATexto(costoLista), costoLista }]);
    setConsulta("");
    return { clave, cantidad: ya ? ya.cantidad + 1 : 1 };
  }, [costoATexto]);

  // Lo leído con la cámara: `null` si ese código no está en el catálogo; rechaza si no se pudo buscar.
  const agregarPorCodigo = useCallback(async (codigo: string): Promise<{ producto: Producto; clave: string; cantidad: number } | null> => {
    const producto = await traerPorCodigo(codigo);
    return producto ? { producto, ...agregar(producto) } : null;
  }, [agregar]);

  const cambiar = (clave: string, c: Partial<Renglon>) => setRenglones((l) => l.map((r) => (r.clave === clave ? { ...r, ...c } : r)));
  // El costo tal como se tipea: solo dígitos, coma o punto. Vacío o ilegible, el renglón queda sin costo.
  const cambiarCosto = (clave: string, tipeado: string) => {
    const texto = tipeado.replace(/[^\d,.]/g, "");
    const valor = Number(texto.replace(",", "."));
    cambiar(clave, { costoTexto: texto, costo: texto === "" || !Number.isFinite(valor) ? null : valor });
  };
  const quitar = (clave: string) => setRenglones((l) => l.filter((r) => r.clave !== clave));
  const cambiarFoto = (r: Renglon, fotoUrl: string) => {
    if (!r.producto) return;
    cambiar(r.clave, { producto: { ...r.producto, foto_url: fotoUrl } });
    actualizarProducto(r.producto.id, { foto_url: fotoUrl }).catch(() => undefined);
  };
  // Descartar devuelve lo que había, para poder deshacerlo con `reponer`.
  const descartar = (): Renglon[] => { const habia = lista.current; setRenglones([]); return habia; };

  const total = renglones.reduce((s, r) => s + (r.costo ?? 0) * r.cantidad, 0);
  const incompletos = renglones.filter(incompleto).length;
  const falta: Falta | null = !proveedorId ? "proveedor" : renglones.length === 0 ? "productos" : incompletos ? "renglones" : null;

  // Registra si no falta nada. Devuelve lo registrado, o `null` si faltaba algo o el servidor
  // no lo aceptó (el motivo queda en `error`); lo cargado se conserva para corregir.
  async function registrar(): Promise<Registro | null> {
    if (ocupado || falta) return null;
    setOcupado(true); setError(null);
    try {
      const r = await api<CompraRegistrada | CompraRepetida>("/compras", {
        method: "POST",
        body: JSON.stringify({
          id: crypto.randomUUID(), proveedor_id: proveedorId, fecha: fechaCompra, comprobante_tipo: comprobante, foto: comprobante === "sin_comprobante" ? null : foto,
          pedido_id: pedido?.id ?? null,
          items: renglones.map((x) => ({ producto_id: x.producto?.id ?? null, descripcion: x.descripcion.trim(), cantidad: x.cantidad, costo_unitario: x.costo! })),
        } satisfies CompraEntrada),
      });
      setRenglones([]); setFoto(null);
      contarAlEspejo(`Ingreso de ${proveedor?.nombre ?? "mercadería"} registrado en ${opciones.lado === "celular" ? "el celular" : "la computadora"}`);
      return { total: r.total, proveedor: proveedor?.nombre ?? "", renglones: renglones.length, costosActualizados: "repetida" in r ? 0 : r.costos_actualizados, productosNuevos: "repetida" in r ? 0 : r.productos_nuevos, dePedido: pedido !== null };
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : opciones.textoSinConexion);
      return null;
    } finally {
      setOcupado(false);
    }
  }

  return {
    catalogo, errorCatalogo, proveedores, proveedor, proveedorId, setProveedorId, comprobante, setComprobante, foto, setFoto, fechaCompra, setFechaCompra,
    consulta, setConsulta, resultados, renglones, agregar, agregarPorCodigo, cambiar, cambiarCosto, quitar, cambiarFoto, descartar, reponer: setRenglones,
    total, incompletos, falta, error, setError, ocupado, registrar,
  };
}
