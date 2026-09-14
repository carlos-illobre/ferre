import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buscar, indexar } from "@ferre/calculo-de-precios";
import { api } from "./api";
import { guardarMeta, leerTodo, reemplazarTodo } from "./almacen";
import { enviarOEncolar } from "./cola";
import type { Producto } from "./pantallas/Productos";

// Los datos del mostrador (catálogo, stock, clientes) en memoria y en IndexedDB (#18):
// arrancan desde el dispositivo, se refrescan del servidor cuando hay conexión, y los
// cambios hechos acá salen por la cola si no hay red.
export type StockFila = { id: string; stock: string; costo_neto: string | null; proveedor: string | null; valor: string; ultimo_movimiento: string | null };
export type Cliente = { id: string; nombre: string; telefono: string | null; cuenta_corriente: boolean; deuda: string };

export function useCatalogo() {
  const [catalogo, setCatalogo] = useState<Producto[] | null>(null);
  const [stock, setStock] = useState<Map<string, number>>(new Map());
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [desdeDispositivo, setDesdeDispositivo] = useState(false);
  // Cambios hechos acá mientras la bajada estaba en vuelo: se vuelven a aplicar sobre lo
  // que llega y se conservan hasta que esa bajada termina.
  const pendientes = useRef(new Map<string, Partial<Pick<Producto, "margen_elegido" | "precio_manual" | "codigo_barras">>>());

  useEffect(() => {
    let vigente = true;
    (async () => {
      // 1. Lo guardado en el dispositivo, al instante.
      try {
        const [c, s, cl] = await Promise.all([leerTodo<Producto>("catalogo"), leerTodo<StockFila>("stock"), leerTodo<Cliente>("clientes")]);
        if (!vigente) return;
        if (c.length) { setCatalogo(c); setDesdeDispositivo(true); }
        if (s.length) setStock(new Map(s.map((x) => [x.id, Number(x.stock)])));
        if (cl.length) setClientes(cl);
      } catch { /* sin IndexedDB: se sigue solo con el servidor */ }
      // 2. El servidor, si responde.
      try {
        const [bajado, st, cl] = await Promise.all([
          api<Producto[]>("/productos"),
          api<{ productos: StockFila[] }>("/stock").then((d) => d.productos).catch(() => null),
          api<Cliente[]>("/clientes").catch(() => null),
        ]);
        if (!vigente) return;
        const c = bajado.map((p) => (pendientes.current.has(p.id) ? { ...p, ...pendientes.current.get(p.id) } : p));
        pendientes.current.clear();
        setCatalogo(c); setDesdeDispositivo(false); setError(null);
        if (st) setStock(new Map(st.map((x) => [x.id, Number(x.stock)])));
        if (cl) setClientes(cl);
        await Promise.all([reemplazarTodo("catalogo", c), st ? reemplazarTodo("stock", st) : null, cl ? reemplazarTodo("clientes", cl) : null, guardarMeta("catalogo_bajado", new Date().toISOString())]).catch(() => undefined);
      } catch (e) {
        if (!vigente) return;
        const estado = (e as { estado?: number }).estado;
        if (estado) setError((e as Error).message);
        else setCatalogo((c) => { if (!c) setError("Sin conexión con el servidor y sin catálogo guardado en este dispositivo: conectá una vez para bajarlo."); return c; });
      }
    })();
    return () => { vigente = false; };
  }, []);

  const indice = useMemo(() => (catalogo ? indexar(catalogo.map((p) => ({ ...p, codigos: [p.codigo_proveedor, p.codigo_barras] }))) : null), [catalogo]);
  const buscarProductos = useCallback((consulta: string, maximo = 50) => (indice ? buscar(indice, consulta, maximo) : []), [indice]);

  const actualizarProducto = useCallback(async (id: string, cambios: Partial<Pick<Producto, "margen_elegido" | "precio_manual" | "codigo_barras">>) => {
    pendientes.current.set(id, { ...pendientes.current.get(id), ...cambios });
    setCatalogo((c) => {
      const nuevo = c && c.map((p) => (p.id === id ? { ...p, ...cambios } : p));
      if (nuevo) reemplazarTodo("catalogo", nuevo).catch(() => undefined);
      return nuevo;
    });
    const cuerpo: Record<string, number | string | null> = {};
    if ("margen_elegido" in cambios) cuerpo.margen_elegido = cambios.margen_elegido ?? null;
    if ("precio_manual" in cambios) cuerpo.precio_manual = cambios.precio_manual === null || cambios.precio_manual === undefined ? null : Number(cambios.precio_manual);
    if ("codigo_barras" in cambios) cuerpo.codigo_barras = cambios.codigo_barras ?? null;
    return enviarOEncolar("producto.cambio", "PATCH", `/productos/${id}`, cuerpo);
  }, []);

  // Stock que ve el mostrador después de un movimiento local (venta sin conexión).
  const ajustarStockLocal = useCallback((id: string, delta: number) => {
    setStock((m) => { const n = new Map(m); n.set(id, (n.get(id) ?? 0) + delta); return n; });
  }, []);

  return { catalogo, stock, clientes, error, desdeDispositivo, buscarProductos, actualizarProducto, ajustarStockLocal };
}
