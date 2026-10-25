import { useCallback, useEffect, useRef, useState } from "react";
import { traerPorCodigo, type Producto } from "../../../negocio/catalogo";
import { TEXTOS } from "../../textos";

// La cámara sigue abierta arriba: cada código suma su producto, que se marca en la lista y se
// muestra abajo de la cámara. «Asociar» cierra la cámara para buscar el producto del código.
export function useCamaraDeLaVenta(catalogo: Producto[], agregarPorCodigo: (codigo: string) => boolean, abrirBusqueda: () => void) {
  const [escaneando, setEscaneando] = useState(false);
  const [ultimo, setUltimo] = useState<string | null>(null);
  const [recien, setRecien] = useState<string | null>(null);
  const actual = useRef({ catalogo, agregarPorCodigo });
  useEffect(() => { actual.current = { catalogo, agregarPorCodigo }; }, [catalogo, agregarPorCodigo]);
  const alDetectar = useCallback((codigo: string) => {
    const conocido = actual.current.agregarPorCodigo(codigo);
    const mostrar = (q: Producto | null | undefined) => { setRecien(q?.id ?? null); setUltimo(conocido && q !== null ? `${q?.descripcion ?? codigo} · ${TEXTOS.vender.sumado.corto}` : null); };
    const p = actual.current.catalogo.find((x) => x.codigo_barras === codigo || x.codigo_proveedor === codigo);
    // Un código que este dispositivo todavía no vio se le pregunta al servidor (specs/018).
    if (p) mostrar(p); else void traerPorCodigo(codigo).then(mostrar, () => mostrar(undefined));
  }, []);
  const cerrar = useCallback(() => { setEscaneando(false); setUltimo(null); setRecien(null); }, []);
  return { escaneando, abrir: () => setEscaneando(true), ultimo, recien: escaneando ? recien : null, alDetectar, cerrar, asociar: () => { cerrar(); abrirBusqueda(); } };
}
