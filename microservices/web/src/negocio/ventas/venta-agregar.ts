import { useCallback, useState } from "react";
import { traerPorCodigo, useCatalogo, type Producto } from "../catalogo";

// Agregar por código y desde la búsqueda. Un código de barras, venga de la cámara, del celular
// vinculado o de un lector que tipea y manda Enter: si es de un producto, se agrega; si no, se
// ofrece asociarlo. Elegir un producto con un código desconocido pendiente se lo asocia.
export function useAgregar(agregar: (p: Producto) => void, setError: (e: string | null) => void) {
  const { catalogo, actualizarProducto } = useCatalogo();
  const [codigoDesconocido, setCodigoDesconocido] = useState<string | null>(null);
  // Devuelve si se lo reconoció (o si se lo está buscando en el servidor).
  const agregarPorCodigo = useCallback((codigo: string): boolean => {
    const c = codigo.trim();
    const exacto = (catalogo ?? []).find((p) => p.codigo_barras === c || p.codigo_proveedor === c);
    if (exacto) { agregar(exacto); setCodigoDesconocido(null); return true; }
    // El catálogo está en el servidor (specs/018): lo que no está en memoria se pide por su código.
    void traerPorCodigo(c).then((p) => { if (p) { agregar(p); setCodigoDesconocido(null); } else setCodigoDesconocido(c); }).catch((e: Error) => setError(e.message));
    return true;
  }, [catalogo, agregar, setError]);
  // Si se venía de leer un código que nadie tenía, se le asocia a este producto: la próxima vez se encuentra directo.
  function elegirSugerencia(p: Producto) {
    if (!codigoDesconocido) { agregar(p); return; }
    actualizarProducto(p.id, { codigo_barras: codigoDesconocido }).catch(() => undefined);
    agregar({ ...p, codigo_barras: codigoDesconocido });
    setCodigoDesconocido(null);
  }
  return { codigoDesconocido, setCodigoDesconocido, agregarPorCodigo, elegirSugerencia };
}
