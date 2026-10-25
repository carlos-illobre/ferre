import { useRef, useState } from "react";
import { useCatalogo } from "../../../negocio/catalogo";
import { alApretarEnter, useBusquedaDeVenta, useCelularQueEscanea } from "../../../negocio/ventas";
import { useSeVaSolo } from "../../../plataforma/tiempo";
import { useEntrada } from "./useEntrada";
import { usePanel } from "./usePanel";
import { useQuitarConAnimacion } from "./useQuitarConAnimacion";
import { useRenglonElegido } from "./useRenglonElegido";
import { flechasDeLaBusqueda, teclasDeLaCaja, useFlechasFueraDeLaCaja, useTeclasDeVender } from "./useTeclasDeVender";
import { useVentaDeLaCompu } from "./useVentaDeLaCompu";

// Todo lo que usa Vender en la computadora, armado con las piezas del negocio.
export function useVender() {
  const catalogo = useCatalogo();
  const busqueda = useBusquedaDeVenta(catalogo.buscarProductos);
  const caja = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const [eligiendoCliente, setEligiendoCliente] = useState(false);
  const venta = useVentaDeLaCompu({ caja, setConsulta: busqueda.setConsulta, alFaltarCliente: () => setEligiendoCliente(true) });
  const { entrada, conEntrada } = useEntrada();
  const celular = useCelularQueEscanea(venta.delCelular);
  const quitar = useQuitarConAnimacion(venta, lista);
  const elegido = useRenglonElegido(venta.items, lista);
  const panel = usePanel();
  useSeVaSolo(venta.mensaje, () => venta.setMensaje(null), 6000);
  const alEnter = () => alApretarEnter(busqueda.consulta, busqueda.resultados, busqueda.elegido, {
    producto: (p) => conEntrada(() => venta.elegirSugerencia(p)), codigo: (c) => conEntrada(() => venta.agregarPorCodigo(c)),
    libre: (t) => conEntrada(() => venta.agregar(null, t)), vacia: () => void venta.cobrar(),
  });
  const activas = !venta.cobro && !eligiendoCliente;
  const flechas = flechasDeLaBusqueda(busqueda.resultados.length > 0, busqueda.mover);
  useFlechasFueraDeLaCaja(flechas, caja, activas);
  useTeclasDeVender({
    activas, caja, consulta: busqueda.consulta, items: venta.items, renglon: elegido.renglon, elegirMedio: venta.elegirMedio, cobrar: venta.cobrar,
    alternarPanel: panel.alternar, elegirCliente: () => setEligiendoCliente(true), noLlevo: venta.noLlevo, cambiarItem: venta.cambiarItem, quitar: quitar.quitar,
  });
  const alTeclear = teclasDeLaCaja(flechas, alEnter, busqueda.consulta, () => busqueda.setConsulta(""));
  return { catalogo, busqueda, caja, lista, venta, entrada, conEntrada, celular, quitar, elegido, panel, alTeclear, eligiendoCliente, setEligiendoCliente };
}
export type EstadoDeVender = ReturnType<typeof useVender>;
