import { useComandos } from "../../../plataforma/comandos";
import type { ListaDelDia } from "./useListaDelDia";

// Lo que ofrece «Ventas del día»: elegir la venta, buscar, cambiar la fecha, corregir y anular
// (corregir y anular, solo si la venta se puede tocar); corrigiendo, guardar y descartar. Nada
// mientras hay una ventana abierta. Qué tecla pide cada cosa lo dice el teclado (ADR-029).
export function useAccionesDelDia(l: ListaDelDia, campo: HTMLInputElement | null) {
  const activas = !l.porAnular && !l.hojaAbierta && !l.otroDia;
  const conVenta = (hacer: () => void) => (l.sePuede ? hacer : undefined);
  useComandos(l.corrigiendo ? { "hoy.guardar": () => l.guardarRef.current(), "hoy.descartar": l.descartar } : {
    "hoy.siguiente": () => l.mover(1), "hoy.anterior": () => l.mover(-1), "hoy.buscar": () => campo?.focus(),
    "hoy.otro-dia": () => l.setOtroDia(true), "hoy.corregir": conVenta(l.empezar), "hoy.anular": conVenta(() => l.setPorAnular(l.elegida)),
  }, { activo: activas });
}
