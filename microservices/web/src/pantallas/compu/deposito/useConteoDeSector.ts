import { useCallback, useEffect, useId, useMemo, useRef, useState, type RefObject } from "react";
import { productoEnMemoria, traerPorCodigo, traerPorIds, useCatalogo } from "../../../negocio/catalogo";
import { cantidadContada, useConteo, type Cierre, type Contado, type Conteo } from "../../../negocio/deposito";
import { useLoQueLeeElCelular, usePedirLector } from "../../../negocio/ventas";
import { useEnLinea } from "../../../plataforma/sin-conexion";
import type { Producto } from "./deposito-comun";

// El conteo abierto de un sector: lo buscado, el producto que se está contando y cuántas hay; el
// foco va y vuelve solo (buscador, cantidad, buscador). Lo que lee el celular vinculado elige el
// producto (decisión 59). Lo contado sin conexión se ve marcado hasta que el servidor lo recibe.
export function useConteoDeSector(conteo: Conteo, alActualizar: (c: Conteo) => void) {
  const enLinea = useEnLinea();
  const { error: errorCatalogo, buscarProductos } = useCatalogo();
  const [consulta, setConsulta] = useState("");
  const [cerrando, setCerrando] = useState(false);
  const [resultado, setResultado] = useState<{ cierre: Cierre; ajustes: Contado[] } | null>(null);
  const avisos = useAvisos();
  const c = useConteo(conteo, alActualizar);
  const caja = useRef<HTMLInputElement>(null);
  const cajaCantidad = useRef<HTMLInputElement>(null);
  const uno = useContandoUno(c, avisos, cajaCantidad, () => setConsulta(""));
  const resultados = useMemo(() => (consulta.trim() ? buscarProductos(consulta, 6) : []), [buscarProductos, consulta]);
  useEffect(() => { if (uno.producto) { cajaCantidad.current?.focus(); cajaCantidad.current?.select(); } else caja.current?.focus(); }, [uno.producto]);
  useEffect(() => { if (enLinea && c.enElDispositivo.size) void c.recargar(); }, [enLinea, c.enElDispositivo.size, c.recargar]); // eslint-disable-line react-hooks/exhaustive-deps
  const { elegir } = uno;
  const { setError } = avisos;
  const alDetectar = useCallback((codigo: string) => {
    void traerPorCodigo(codigo).then((p) => { if (p) elegir(p); else setError(`El código ${codigo} no está en el catálogo. Buscá el producto por su nombre.`); }).catch((e: Error) => setError(e.message));
  }, [elegir, setError]);
  // El producto se pide al servidor si este dispositivo todavía no lo trajo (specs/018).
  const elegirPorId = (productoId: string, descripcion: string) => {
    void traerPorIds([productoId]).then(() => { const p = productoEnMemoria(productoId); if (p) elegir(p); else setError(`No se pudo traer «${descripcion}»: hace falta internet.`); });
  };
  return {
    conteo, enLinea, errorCatalogo, consulta, setConsulta, resultados, cerrando, setCerrando, resultado, setResultado, ...avisos, ...c, ...uno,
    caja, cajaCantidad, elegirPorId, emparejado: useLoQueLeeElCelular(alDetectar, !resultado), ...usePedirLector(), id: useId(),
  };
}
export type ConteoDeSector = ReturnType<typeof useConteoDeSector>;

function useAvisos() {
  const [error, setError] = useState<string | null>(null);
  const [errorCantidad, setErrorCantidad] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  return { error, setError, errorCantidad, setErrorCantidad, mensaje, setMensaje };
}

// El producto que se cuenta: elegirlo (con lo que ya se había contado), guardarlo o quitarlo.
type Avisos = ReturnType<typeof useAvisos>;
function useContandoUno(c: ReturnType<typeof useConteo>, avisos: Avisos, cajaCantidad: RefObject<HTMLInputElement>, limpiarBusqueda: () => void) {
  const [producto, setProducto] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState("");
  const [guardando, setGuardando] = useState(false);
  const { setError, setErrorCantidad, setMensaje } = avisos;
  const elegir = useCallback((p: Producto) => {
    const previo = c.contadoPorId.get(p.id);
    setProducto(p); setCantidad(previo ? String(Number(previo.cantidad_contada)).replace(".", ",") : ""); limpiarBusqueda(); setError(null); setErrorCantidad(null);
  }, [c.contadoPorId]); // eslint-disable-line react-hooks/exhaustive-deps
  const soltar = () => { setProducto(null); setCantidad(""); setError(null); };
  async function conGuardando(tarea: () => Promise<void>, fallo: string) {
    setGuardando(true);
    try { await tarea(); } catch (err) { setError(`${fallo}: ${(err as Error).message}`); } finally { setGuardando(false); }
  }
  async function guardar() {
    if (!producto || guardando) return;
    const leida = cantidadContada(cantidad, producto);
    if (Number.isNaN(leida)) { setErrorCantidad("Escribí cuántas hay: un número, cero o más."); cajaCantidad.current?.focus(); return; }
    await conGuardando(() => c.contar(producto, leida).then(soltar), `No se guardó ${producto.descripcion}`);
  }
  async function quitar() {
    if (!producto || guardando) return;
    await conGuardando(() => c.quitar(producto).then(() => { setMensaje(`${producto.descripcion} salió de lo contado.`); soltar(); }), `No se quitó ${producto.descripcion}`);
  }
  return { producto, setProducto, cantidad, setCantidad, guardando, elegir, guardar, quitar };
}
