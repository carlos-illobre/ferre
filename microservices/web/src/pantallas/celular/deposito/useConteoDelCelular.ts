import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Acciones } from "../../../plataforma/comandos";
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
  const enLaCaja = accionesDeLaBusqueda({ consulta, resultados, elegido, setElegido, setConsulta, elegirProducto });
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
    resultado, error, setError, cajaCantidad, elegirProducto, alDetectar, enLaCaja, guardar, cerrar,
  };
}
export type ConteoDelCelular = ReturnType<typeof useConteoDelCelular>;

// Lo de la búsqueda: marcar el de al lado, elegir el marcado (si la lista no alcanzó a lo escrito,
// espera la respuesta) y limpiarla.
type Busqueda = { consulta: string; resultados: Producto[]; elegido: number; setElegido: (f: (i: number) => number) => void; setConsulta: (c: string) => void; elegirProducto: (p: Producto) => void };
const accionesDeLaBusqueda = (b: Busqueda): Acciones => ({
  "lista.siguiente": () => b.setElegido((i) => Math.min(i + 1, b.resultados.length - 1)),
  "lista.anterior": () => b.setElegido((i) => Math.max(i - 1, 0)),
  "lista.elegir": () => elegirElMarcado(b),
  "lista.salir": () => b.setConsulta(""),
});
function elegirElMarcado(b: Busqueda) {
  if (!busquedaAlDia(b.consulta)) { void esperarBusqueda(b.consulta).then((r) => { if (r[0]) b.elegirProducto(r[0]); }); return; }
  const marcado = b.resultados[b.elegido];
  if (!marcado) return false;
  b.elegirProducto(marcado);
}
