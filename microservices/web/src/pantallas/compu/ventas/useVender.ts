import { useRef, useState } from "react";
import { useCatalogo } from "../../../negocio/catalogo";
import { alApretarEnter, useBusquedaDeVenta, useCelularQueEscanea } from "../../../negocio/ventas";
import { useSeVaSolo } from "../../../plataforma/tiempo";
import { useEntrada } from "./useEntrada";
import { usePanel } from "./usePanel";
import { useQuitarConAnimacion } from "./useQuitarConAnimacion";
import { useRenglonElegido } from "./useRenglonElegido";
import { accionesDeLaCaja, useAccionesDeVender } from "./useAccionesDeVender";
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
  const deVender = {
    activas: !venta.cobro && !eligiendoCliente, caja, consulta: busqueda.consulta, items: venta.items, renglon: elegido.renglon,
    hayResultados: busqueda.resultados.length > 0, mover: busqueda.mover, elegirMedio: venta.elegirMedio, cobrar: venta.cobrar,
    alternarPanel: panel.alternar, elegirCliente: () => setEligiendoCliente(true), noLlevo: venta.noLlevo, cambiarItem: venta.cambiarItem, quitar: quitar.quitar,
  };
  useAccionesDeVender(deVender);
  const enLaCaja = accionesDeLaCaja(deVender, alEnter, () => busqueda.setConsulta(""));
  return { catalogo, busqueda, caja, lista, venta, entrada, conEntrada, celular, quitar, elegido, panel, enLaCaja, eligiendoCliente, setEligiendoCliente };
}
export type EstadoDeVender = ReturnType<typeof useVender>;
