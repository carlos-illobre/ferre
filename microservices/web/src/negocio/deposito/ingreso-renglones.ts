import { useCallback, useRef, useState } from "react";
import { traerPorCodigo, type Producto } from "../catalogo";
import type { Renglon } from "./tipos-del-ingreso";

type ActualizarProducto = (id: string, cambios: { foto_url: string }) => Promise<unknown>;

// Un renglón nuevo para un producto (con su costo de lista) o para una descripción tipeada.
function renglonNuevo(clave: string, p: Producto | null, libre: string | undefined, costoATexto: (costo: number) => string): Renglon {
  const costoLista = p && p.costo_neto !== null ? Number(p.costo_neto) : null;
  return { clave, producto: p, descripcion: p?.descripcion ?? libre ?? "", cantidad: 1, costo: costoLista, costoTexto: costoLista === null ? "" : costoATexto(costoLista), costoLista };
}

// El costo tal como se tipea: solo dígitos, coma o punto. Vacío o ilegible, el renglón queda sin costo.
function costoTipeado(tipeado: string): Pick<Renglon, "costoTexto" | "costo"> {
  const texto = tipeado.replace(/[^\d,.]/g, "");
  const valor = Number(texto.replace(",", "."));
  return { costoTexto: texto, costo: texto === "" || !Number.isFinite(valor) ? null : valor };
}

// Los renglones del ingreso y la búsqueda con que se agregan.
export function useRenglonesDelIngreso(inicial: Renglon[], costoATexto: (costo: number) => string, actualizarProducto: ActualizarProducto) {
  const [consulta, setConsulta] = useState("");
  const [renglones, setRenglones] = useState<Renglon[]>(inicial);
  const lista = useRef(renglones);
  lista.current = renglones;

  // Un producto que ya está suma uno a su renglón; sin producto, es uno nuevo con la descripción tipeada.
  const agregar = useCallback((p: Producto | null, libre?: string): { clave: string; cantidad: number } => {
    const ya = p ? lista.current.find((r) => r.producto?.id === p.id) : undefined;
    const clave = ya?.clave ?? crypto.randomUUID();
    setRenglones((l) => (ya ? l.map((r) => (r.clave === clave ? { ...r, cantidad: r.cantidad + 1 } : r)) : [...l, renglonNuevo(clave, p, libre, costoATexto)]));
    setConsulta("");
    return { clave, cantidad: ya ? ya.cantidad + 1 : 1 };
  }, [costoATexto]);

  // Lo leído con la cámara: `null` si ese código no está en el catálogo; rechaza si no se pudo buscar.
  const agregarPorCodigo = useCallback(async (codigo: string): Promise<{ producto: Producto; clave: string; cantidad: number } | null> => {
    const producto = await traerPorCodigo(codigo);
    return producto ? { producto, ...agregar(producto) } : null;
  }, [agregar]);

  const cambiar = (clave: string, c: Partial<Renglon>) => setRenglones((l) => l.map((r) => (r.clave === clave ? { ...r, ...c } : r)));
  const cambiarCosto = (clave: string, tipeado: string) => cambiar(clave, costoTipeado(tipeado));
  const quitar = (clave: string) => setRenglones((l) => l.filter((r) => r.clave !== clave));
  const cambiarFoto = (r: Renglon, fotoUrl: string) => {
    if (!r.producto) return;
    cambiar(r.clave, { producto: { ...r.producto, foto_url: fotoUrl } });
    actualizarProducto(r.producto.id, { foto_url: fotoUrl }).catch(() => undefined);
  };
  // Descartar devuelve lo que había, para poder deshacerlo con `reponer`.
  const descartar = (): Renglon[] => { const habia = lista.current; setRenglones([]); return habia; };
  return { consulta, setConsulta, renglones, setRenglones, agregar, agregarPorCodigo, cambiar, cambiarCosto, quitar, cambiarFoto, descartar, reponer: setRenglones };
}
