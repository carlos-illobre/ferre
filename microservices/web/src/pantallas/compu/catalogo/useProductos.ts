import { useCallback, useEffect, useRef, useState } from "react";
import { cuantosFiltros, SIN_FILTROS, useCatalogo, useListaDeProductos, useMarcas, type Filtros, type Producto } from "../../../negocio/catalogo";
import { agregarALaVenta, useLoQueLeeElCelular } from "../../../negocio/ventas";
import { useDebounce, useSeVaSolo } from "../../../plataforma/tiempo";
import { usePuede } from "../../permisos";
import { TEXTOS } from "../../textos";
import type { Cambios } from "./tipos";

// El estado de Productos: lo buscado (le pregunta al servidor y trae de a 50, specs/018), los filtros
// por disponibilidad y marca (RF-109, de esta pantalla, no se guardan), el elegido con su ficha al
// lado, agregar a la venta (RF-108, solo quien puede vender) y lo que lee el celular emparejado, que
// queda escrito en la búsqueda (decisión 139) salvo mientras la ficha carga un código.
export function useProductos() {
  const puede = usePuede();
  const { catalogo, stock, actualizarProducto } = useCatalogo();
  const [consulta, setConsulta] = useState("");
  const consultaEstable = useDebounce(consulta, 300);
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);
  const [viendoFiltros, setViendoFiltros] = useState(false);
  const lista = useListaDeProductos({ buscar: consultaEstable, marca: filtros.marca, disponibilidad: filtros.disponibilidad });
  const [elegido, setElegido] = useState(0);
  useEffect(() => { setElegido(0); }, [consultaEstable, filtros]);
  const [cargandoCodigo, setCargandoCodigo] = useState(false);
  const emparejado = useLoQueLeeElCelular(setConsulta, !cargandoCodigo);
  const { agregado, agregar } = useAgregarALaVenta();
  const [error, setError] = useState<string | null>(null);
  const actualizar = useCallback((id: string, cambios: Cambios) => {
    setError(null);
    actualizarProducto(id, cambios).catch((e: Error) => setError(`No se pudo guardar el cambio: ${e.message}. Probá de nuevo.`));
  }, [actualizarProducto]);
  const elDeLaLista = lista.productos[elegido];
  return {
    puede, fijaMargen: puede("catalogo.margenes"), puedeVender: puede("ventas.registrar"), stock, consulta, setConsulta, consultaEstable,
    filtros, setFiltros, conFiltros: cuantosFiltros(filtros) > 0, viendoFiltros, setViendoFiltros, marcas: useMarcas(consultaEstable, viendoFiltros),
    lista, elegido, setElegido, setCargandoCodigo, emparejado, agregado, agregar, error, actualizar,
    // El de la ficha, con lo último que se sabe de él.
    delaFicha: elDeLaLista ? catalogo.find((p) => p.id === elDeLaLista.id) ?? elDeLaLista : null,
    caja: useRef<HTMLInputElement>(null), ficha: useRef<HTMLElement>(null), ...usePlegarCalculo(),
  };
}
export type EstadoDeProductos = ReturnType<typeof useProductos>;

// Agregar a la venta desde acá: avisa unos segundos qué se agregó.
function useAgregarALaVenta() {
  const [agregado, setAgregado] = useState<string | null>(null);
  useSeVaSolo(agregado, () => setAgregado(null), 3000);
  const agregar = useCallback((p: Producto) => { agregarALaVenta(p); setAgregado(`${TEXTOS.catalogo.agregado.largo}: ${p.descripcion}`); }, []);
  return { agregado, agregar };
}

// «Así se calcula» empieza abierto; F1 lo pliega.
function usePlegarCalculo() {
  const [calculoAbierto, setCalculoAbierto] = useState(true);
  return { calculoAbierto, plegarCalculo: () => setCalculoAbierto((a) => !a) };
}
