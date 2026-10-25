import type { RefObject } from "react";
import { otraCantidad, type Item, type Medio } from "../../../negocio/ventas";
import { useComandos, type Acciones } from "../../../plataforma/comandos";
import { MEDIOS } from "../../textos";

// Lo que Vender ofrece en la computadora: elegir cómo paga, cobrar, mostrar el panel, elegir el
// cliente, «No llevó», cambiar el renglón elegido y moverse por lo encontrado. Qué tecla pide cada
// cosa lo dice el teclado (ADR-029).
type DeVender = {
  activas: boolean; caja: RefObject<HTMLInputElement>; consulta: string; items: Item[]; renglon: Item | null;
  hayResultados: boolean; mover: (paso: 1 | -1) => void;
  elegirMedio: (m: Medio) => void; cobrar: () => unknown; alternarPanel: () => void; elegirCliente: () => void; noLlevo: () => void;
  cambiarItem: (clave: string, c: Partial<Item>) => void; quitar: (it: Item) => void;
};

// Sobre el renglón elegido, solo con la búsqueda vacía.
function accionesDelRenglon(t: DeVender): Acciones {
  const alRenglon = (hacer: (it: Item) => void) => () => (t.activas && t.renglon && !t.consulta ? hacer(t.renglon) : false);
  const sumar = (signo: 1 | -1) => alRenglon((it) => { const cantidad = otraCantidad(it, signo); if (cantidad) t.cambiarItem(it.clave, { cantidad }); });
  return { "vender.renglon.sumar": sumar(1), "vender.renglon.restar": sumar(-1), "vender.renglon.quitar": alRenglon(t.quitar) };
}

// Elegir uno de lo encontrado; sin resultados a la vista no es para eso.
const moverEnLoEncontrado = (t: DeVender, paso: 1 | -1) => () => (t.hayResultados ? t.mover(paso) : false);

export function useAccionesDeVender(t: DeVender) {
  const medios = Object.fromEntries(MEDIOS.map((m) => [`vender.medio.${m.valor}`, () => t.elegirMedio(m.valor)]));
  useComandos({
    ...medios, "vender.panel": t.alternarPanel, "vender.cobrar": () => void t.cobrar(), "vender.cliente": t.elegirCliente,
    "vender.no-llevo": () => { if (t.items.length) t.noLlevo(); },
    ...accionesDelRenglon(t),
    // Fuera de la búsqueda: lo encontrado se sigue eligiendo, y volver a la búsqueda.
    "vender.busqueda.siguiente": moverEnLoEncontrado(t, 1), "vender.busqueda.anterior": moverEnLoEncontrado(t, -1),
    "vender.busqueda.volver": () => { t.caja.current?.focus(); return false; },
  }, { activo: t.activas });
}

// En la búsqueda: elegir lo encontrado, agregarlo (o cobrar, si está vacía), borrar lo escrito y
// cambiar el renglón elegido.
export function accionesDeLaCaja(t: DeVender, alEnter: () => void, limpiar: () => void): Acciones {
  return {
    "lista.siguiente": moverEnLoEncontrado(t, 1), "lista.anterior": moverEnLoEncontrado(t, -1), "lista.elegir": alEnter,
    "lista.salir": () => (t.consulta ? limpiar() : false), ...accionesDelRenglon(t),
  };
}
