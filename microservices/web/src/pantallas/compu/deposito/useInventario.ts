import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { conUnidad, useCatalogo } from "../../../negocio/catalogo";
import { cuentaDelStock, errorDelStock, pasaElFiltro, productosConStock, useStock, type FiltroDeStock } from "../../../negocio/deposito";
import { useLoQueLeeElCelular, usePedirLector } from "../../../negocio/ventas";
import { useEnLinea } from "../../../plataforma/sin-conexion";
import { usePuede } from "../../permisos";
import { conSigno, nombreUnidad, type Producto } from "./deposito-comun";

// El estado de Stock en la computadora: lo buscado (o lo que lee el celular vinculado, decisión 59),
// el filtro, el orden, el elegido (el primero de la lista hasta que se elige otro) y las correcciones
// guardadas sin conexión, que se ven en la fila hasta que el servidor las confirma.
export type Columna = "producto" | "stock" | "ultimo";
export type Orden = { columna: Columna; sube: boolean } | null;
export const TOPE = 100;


export function useInventario() {
  const puede = usePuede();
  const enLinea = useEnLinea();
  const { catalogo, buscandoEnElServidor, error: errorCatalogo, buscarProductos, actualizarProducto } = useCatalogo();
  const { datos, porId, delDispositivo, error: fallo, recargar: cargar } = useStock();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [consulta, setConsulta] = useState("");
  const [filtro, setFiltro] = useState<FiltroDeStock>("todos");
  const [orden, setOrden] = useState<Orden>(null);
  const [elegidoId, setElegidoId] = useState<string | null>(null);
  const porEnviar = usePorEnviar(Boolean(datos && !delDispositivo));
  useEffect(() => { if (enLinea && delDispositivo) cargar(); }, [enLinea, delDispositivo, cargar]);
  const emparejado = useLoQueLeeElCelular(setConsulta, true);
  const cantidadDe = useCallback((id: string) => porEnviar.mapa.get(id) ?? Number(porId.get(id)?.stock ?? 0), [porEnviar.mapa, porId]);
  const cuenta = useMemo(() => cuentaDelStock(datos?.productos ?? []), [datos]);
  const { filas, hayMas } = useMemo(() => {
    const base = (consulta.trim() ? buscarProductos(consulta, TOPE) : productosConStock(catalogo, porId)).filter((p) => pasaElFiltro(filtro, cantidadDe(p.id)));
    const ordenadas = ordenar(base, orden, (p) => claveDe(p, orden, cantidadDe, porId));
    return { filas: ordenadas.slice(0, TOPE), hayMas: ordenadas.length > TOPE };
  }, [catalogo, consulta, buscarProductos, porId, filtro, orden, cantidadDe]);
  const marcada = Math.max(0, filas.findIndex((p) => p.id === elegidoId));
  useEffect(() => { setElegidoId(null); }, [consulta, filtro]);
  useEffect(() => { document.querySelector("[data-testid='tabla-stock'] [aria-selected='true']")?.scrollIntoView?.({ block: "nearest" }); }, [marcada]);
  function corregido(p: Producto, habia: number, hay: number, encolado: boolean) {
    if (encolado) { porEnviar.anotar(p.id, hay); setMensaje(`${p.descripcion}: quedó en ${conUnidad(hay, p.unidad)}. Guardado en este dispositivo, se manda al volver internet.`); return; }
    setMensaje(mensajeDeCorreccion(p, habia, hay));
  }
  const sinNada = datos !== null && datos.productos.length === 0 && !consulta.trim();
  return {
    sinNada, conDatos: datos !== null && !sinNada, esperando: datos === null && !fallo && !errorCatalogo,
    corrige: puede("deposito.stock"), veInvertido: puede("negocio.invertido"), pidePedidos: puede("deposito.pedidos"), enLinea, catalogo, buscandoEnElServidor, errorCatalogo, actualizarProducto,
    datos, porId, delDispositivo, error: errorDelStock(fallo), cargar, mensaje, setMensaje, consulta, setConsulta, filtro, setFiltro, orden, setOrden, setElegidoId,
    porEnviar: porEnviar.mapa, emparejado, ...usePedirLector(), cantidadDe, cuenta, filas, hayMas, marcada, elegido: filas[marcada] ?? null, corregido,
    caja: useRef<HTMLInputElement>(null), panel: useRef<HTMLElement>(null),
  };
}
export type Inventario = ReturnType<typeof useInventario>;

// Cuando el servidor vuelve a contestar, lo que estaba por enviarse ya está en lo que trae.
function usePorEnviar(alDia: boolean) {
  const [mapa, setMapa] = useState<Map<string, number>>(new Map());
  useEffect(() => { if (alDia) setMapa(new Map()); }, [alDia]);
  return { mapa, anotar: (id: string, hay: number) => setMapa((m) => new Map(m).set(id, hay)) };
}

const mensajeDeCorreccion = (p: Producto, habia: number, hay: number) => {
  const dif = hay - habia;
  return dif === 0 ? `${p.descripcion}: sin diferencia, el stock ya decía ${conUnidad(hay, p.unidad)}.` : `${p.descripcion}: había ${conUnidad(habia, p.unidad)}, hay ${conUnidad(hay, p.unidad)} (${conSigno(dif)} ${nombreUnidad(p.unidad)}).`;
};

type PorId = ReturnType<typeof useStock>["porId"];
function claveDe(p: Producto, orden: Orden, cantidadDe: (id: string) => number, porId: PorId): string | number {
  if (orden?.columna === "producto") return p.descripcion.toLocaleLowerCase("es");
  if (orden?.columna === "stock") return cantidadDe(p.id);
  return porId.get(p.id)?.ultimo_movimiento ?? "";
}
function ordenar(base: Producto[], orden: Orden, clave: (p: Producto) => string | number): Producto[] {
  if (!orden) return base;
  return [...base].sort((a, b) => { const x = clave(a), y = clave(b); return (x < y ? -1 : x > y ? 1 : 0) * (orden.sube ? 1 : -1); });
}
