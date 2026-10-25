import { useCallback, useEffect, useRef, useState } from "react";
import { cuantosFiltros, SIN_FILTROS, traerPorCodigo, useCatalogo, useListaDeProductos, useMarcas, useResumenDelCatalogo, type Filtros, type Producto } from "../../../negocio/catalogo";
import { agregarALaVenta } from "../../../negocio/ventas";
import { useDebounce, useSeVaSolo } from "../../../plataforma/tiempo";
import { usePuede } from "../../permisos";
import { TEXTOS } from "../../textos";

// El estado de Productos en el celular: lo buscado (le pregunta al servidor y trae de a 50,
// specs/018), los filtros por disponibilidad y marca (RF-109, de esta pantalla, no se guardan), el
// elegido, la ficha abierta, buscar escaneando (RF-08) y agregar a la venta (RF-108).
export type Cambios = Partial<Pick<Producto, "margen_elegido" | "foto_url" | "codigo_barras">> & { proveedor_preferido_id?: string };

export function useProductosDelCelular() {
  const puede = usePuede();
  const { catalogo, actualizarProducto, stock } = useCatalogo();
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);
  const [viendoFiltros, setViendoFiltros] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // El error de la lista también se cierra; si llega otro distinto, se muestra.
  const [errorDeListaCerrado, setErrorDeListaCerrado] = useState<string | null>(null);
  const [consulta, setConsulta] = useState("");
  const consultaEstable = useDebounce(consulta, 300);
  const [elegido, setElegido] = useState(0);
  const [abiertoId, setAbiertoId] = useState<string | null>(null);
  // En el celular la búsqueda no toma el foco sola: abriría el teclado y taparía el menú.
  // Las marcas para elegir son las de lo encontrado (015-E29).
  const lista = useListaDeProductos({ buscar: consultaEstable, marca: filtros.marca, disponibilidad: filtros.disponibilidad });
  useEffect(() => { setElegido(0); }, [consultaEstable, filtros]);
  const actualizar = useCallback((id: string, cambios: Cambios) => {
    actualizarProducto(id, cambios as never).catch((e: Error) => setError(`No se pudo guardar: ${e.message}`));
  }, [actualizarProducto]);
  const errorAlaVista = error ?? (errorDeListaCerrado === lista.error ? null : lista.error);
  const cerrarError = () => { if (error) setError(null); else setErrorDeListaCerrado(lista.error); };
  return {
    fijaMargen: puede("catalogo.margenes"), puedeVender: puede("ventas.registrar"), stock, filtros, setFiltros, conFiltros: cuantosFiltros(filtros) > 0, cuantosFiltros: cuantosFiltros(filtros),
    viendoFiltros, setViendoFiltros, marcas: useMarcas(consultaEstable, viendoFiltros), consulta, setConsulta, consultaEstable, lista, elegido, setElegido,
    abiertoId, setAbiertoId, abierto: abiertoId ? catalogo.find((p) => p.id === abiertoId) ?? null : null, actualizar, setError, errorAlaVista, cerrarError,
    resumen: useResumenDelCatalogo(), caja: useRef<HTMLInputElement>(null), ...useAgregarALaVenta(), ...useEscanear(setConsulta, setAbiertoId, setError),
  };
}
export type ProductosDelCelular = ReturnType<typeof useProductosDelCelular>;

// Agregar a la venta desde acá: avisa unos segundos qué se agregó.
function useAgregarALaVenta() {
  const [agregado, setAgregado] = useState<string | null>(null);
  useSeVaSolo(agregado, () => setAgregado(null), 3000);
  const agregar = useCallback((p: Producto) => { agregarALaVenta(p); setAgregado(`${TEXTOS.catalogo.agregado.corto}: ${p.descripcion}`); }, []);
  return { agregado, setAgregado, agregar };
}

// Buscar escaneando: el código de un producto abre su ficha; uno que nadie tiene, lo dice.
function useEscanear(setConsulta: (c: string) => void, abrir: (id: string) => void, setError: (e: string) => void) {
  const [escaneando, setEscaneando] = useState(false);
  const alEscanear = useCallback((codigo: string) => {
    setEscaneando(false);
    void traerPorCodigo(codigo).then((p) => {
      if (p) { setConsulta(""); abrir(p.id); return; }
      setConsulta(codigo);
      setError(`Ningún producto tiene el código ${codigo}. Buscá el producto, abrilo y tocá «Escanear el código» para cargárselo.`);
    }).catch((e: Error) => setError(e.message));
  }, [setConsulta, abrir, setError]);
  return { escaneando, setEscaneando, alEscanear };
}
