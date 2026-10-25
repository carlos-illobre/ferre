import { useCallback } from "react";
import { useVenta, type MotivoDeCambio } from "../../../negocio/ventas";
import { usePuede } from "../../../negocio/usuarios";
import { TEXTOS } from "../../textos";
import { textoDeNoCobrar } from "../../comun/ventas/textos-de-la-venta";
import { describirDispositivo } from "../../../plataforma/dispositivo";

type Opciones = { cerrarBusqueda: () => void; alFaltarCliente: () => void };

// La venta en sí (renglones, precios, cobrar, «no llevó») está una sola vez, en el negocio: acá
// va solo lo del celular: sus textos cortos y sus hojas. Agregar cierra la búsqueda.
export function useVentaDelCelular({ cerrarBusqueda, alFaltarCliente }: Opciones) {
  const puede = usePuede();
  const venta = useVenta({
    lado: "celular", dispositivo: describirDispositivo, fijaMargen: puede("catalogo.margenes"),
    textoDe: (motivo) => textoDeNoCobrar(motivo, "corto"),
    textoDeRechazo: (m) => m,
    alCambiar: useCallback((motivo: MotivoDeCambio) => { if (motivo === "agregar") cerrarBusqueda(); }, [cerrarBusqueda]),
    alFaltarCliente,
  });
  // Un código que no es de ningún producto deja la búsqueda limpia, para elegir a cuál asociarlo.
  const { agregarPorCodigo: porCodigo } = venta;
  const agregarPorCodigo = useCallback((codigo: string) => { const conocido = porCodigo(codigo); cerrarBusqueda(); return conocido; }, [porCodigo, cerrarBusqueda]);
  return { ...venta, agregarPorCodigo, noLlevo: () => venta.noLlevo(TEXTOS.vender.noLlevo.corto) };
}
