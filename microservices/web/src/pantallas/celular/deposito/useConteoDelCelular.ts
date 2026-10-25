import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { busquedaAlDia, esperarBusqueda, traerPorCodigo, useCatalogo, type Producto } from "../../../negocio/catalogo";
import { cantidadContada, useConteo, type Conteo } from "../../../negocio/deposito";

// El conteo abierto en el celular: lo buscado (o escaneado), el producto que se cuenta y cuántas
// hay. La búsqueda no toma el foco sola (abriría el teclado y taparía el menú); la cantidad sí,
// porque se acaba de elegir el producto.
export type Resultado = { ajustados: number; puestos_en_cero: number; contados: number };

export function useConteoDelCelular(conteo: Conteo, alActualizar: (c: Conteo) => void) {
  const { catalogo, buscarProductos } = useCatalogo();
  const [consulta, setConsulta] = useState("");
  const [elegido, setElegido] = useState(0);
  const [producto, setProducto] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState("");
  const [cerrando, setCerrando] = useState(false);
  const [escaneando, setEscaneando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cajaCantidad = useRef<HTMLInputElement>(null);
  const resultados = useMemo(() => (consulta.trim() ? buscarProductos(consulta, 6) : []), [buscarProductos, consulta]);
  useEffect(() => { setElegido(0); }, [consulta]);
  useEffect(() => { if (producto) cajaCantidad.current?.focus(); }, [producto]);
  const c = useConteo(conteo, alActualizar);
  function elegirProducto(p: Producto) {
    setProducto(p);
    const previo = c.contadoPorId.get(p.id);
    setCantidad(previo ? String(Number(previo.cantidad_contada)) : "");
    setConsulta("");
  }
  const alDetectar = useCallback((codigo: string) => {
    void traerPorCodigo(codigo).then((p) => { if (p) { setEscaneando(false); elegirProducto(p); } else setError(`El código ${codigo} no está en el catálogo: buscalo por nombre.`); }).catch((e: Error) => setError(e.message));
  }, [catalogo]); // eslint-disable-line react-hooks/exhaustive-deps
  const teclasBusqueda = (e: KeyboardEvent<HTMLInputElement>) => teclasDeLaBusqueda(e, { consulta, resultados, elegido, setElegido, setConsulta, elegirProducto });
  async function guardar() {
    if (!producto) return;
    const n = cantidadContada(cantidad, producto);
    if (Number.isNaN(n)) { setError("Escribí cuántas hay."); return; }
    try { await c.contar(producto, n); setError(null); setProducto(null); setCantidad(""); } catch (e) { setError((e as Error).message); }
  }
  async function cerrar(faltantesEnCero: boolean) {
    try { setResultado(await c.cerrar(faltantesEnCero)); setCerrando(false); } catch (e) { setError((e as Error).message); }
  }
  return {
    conteo, contadoPorId: c.contadoPorId, consulta, setConsulta, elegido, resultados, producto, setProducto, cantidad, setCantidad, cerrando, setCerrando, escaneando, setEscaneando,
    resultado, error, setError, cajaCantidad, elegirProducto, alDetectar, teclasBusqueda, guardar, cerrar,
  };
}
export type ConteoDelCelular = ReturnType<typeof useConteoDelCelular>;

// ↑ ↓ eligen, Enter elige (si la lista no alcanzó a lo escrito, espera la respuesta), Esc limpia.
type Busqueda = { consulta: string; resultados: Producto[]; elegido: number; setElegido: (f: (i: number) => number) => void; setConsulta: (c: string) => void; elegirProducto: (p: Producto) => void };
function teclasDeLaBusqueda(e: KeyboardEvent<HTMLInputElement>, b: Busqueda) {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); b.setElegido((i) => (e.key === "ArrowDown" ? Math.min(i + 1, b.resultados.length - 1) : Math.max(i - 1, 0))); }
  else if (e.key === "Enter") enterEnLaBusqueda(e, b);
  else if (e.key === "Escape") b.setConsulta("");
}
function enterEnLaBusqueda(e: KeyboardEvent<HTMLInputElement>, b: Busqueda) {
  if (!busquedaAlDia(b.consulta)) { e.preventDefault(); void esperarBusqueda(b.consulta).then((r) => { if (r[0]) b.elegirProducto(r[0]); }); }
  else if (b.resultados[b.elegido]) { e.preventDefault(); b.elegirProducto(b.resultados[b.elegido]!); }
}
