import { useCallback, type RefObject } from "react";
import { marcarLoQueEntro, useVenta, ventaActual, type MotivoDeCambio } from "../../../negocio/ventas";
import { usePuede } from "../../permisos";
import { TEXTOS } from "../../textos";
import { textoDeNoCobrar } from "../../comun/ventas/textos-de-la-venta";
import { describirDispositivo } from "../base/dispositivo";

type Opciones = { caja: RefObject<HTMLInputElement>; setConsulta: (texto: string) => void; alFaltarCliente: () => void };

// La venta en sí (renglones, precios, cobrar, «no llevó») está una sola vez, en el negocio:
// acá va solo lo de la computadora: sus textos largos y su foco.
export function useVentaDeLaCompu({ caja, setConsulta, alFaltarCliente }: Opciones) {
  const puede = usePuede();
  const venta = useVenta({
    lado: "computadora", dispositivo: describirDispositivo, fijaMargen: puede("catalogo.margenes"),
    textoDe: (motivo) => textoDeNoCobrar(motivo, "largo"),
    textoDeRechazo: (m) => `${m}. La venta sigue armada: corregila y cobrá de nuevo.`,
    alCambiar: useCallback((motivo: MotivoDeCambio) => { if (motivo === "agregar") setConsulta(""); caja.current?.focus(); }, [caja, setConsulta]),
    alFaltarCliente,
  });
  // Un código que no es de ningún producto deja la búsqueda limpia, para elegir a cuál asociarlo.
  const { agregarPorCodigo: porCodigo } = venta;
  const agregarPorCodigo = useCallback((codigo: string) => { const conocido = porCodigo(codigo); setConsulta(""); return conocido; }, [porCodigo, setConsulta]);
  // Lo que lee el celular como lector se marca «Llegó del celular» un momento (decisión 127).
  const delCelular = useCallback((codigo: string) => { const antes = ventaActual().items; agregarPorCodigo(codigo); marcarLoQueEntro(antes, ventaActual().items); }, [agregarPorCodigo]);
  const noLlevo = () => venta.noLlevo(TEXTOS.vender.noLlevo.largo);
  return { ...venta, agregarPorCodigo, delCelular, noLlevo };
}
