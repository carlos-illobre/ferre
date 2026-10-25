import type { Evento, FiltrosDelRegistro } from "../../../negocio/actividad";
import { detalleDe, diasDelPeriodo, inicioDelDia } from "./actividad-en-palabras";

// Lo que se le pide al registro con los filtros puestos: la persona y los días, del primer
// instante del primer día al primero del día siguiente al último. Igual en el celular y la computadora.
export function ventanaDelRegistro(f: FiltrosDelRegistro) {
  const dias = diasDelPeriodo(f);
  return { usuario: f.usuario || undefined, desde: dias.desde ? inicioDelDia(dias.desde) : undefined, hasta: dias.hasta ? inicioDelDia(dias.hasta, 1) : undefined };
}

// En la tarjeta del celular el importe va en el título («Venta · $12.500») y el detalle sigue con
// lo demás («5 productos · efectivo»).
export function importeYDetalle(e: Evento): { importe: string; detalle: string } {
  const importe = typeof e.contenido.total === "number" ? ` · $${Math.round(e.contenido.total).toLocaleString("es-AR")}` : "";
  const todo = detalleDe(e);
  return { importe, detalle: importe ? todo.split(" · ").filter((p) => !p.startsWith("$")).join(" · ") : todo };
}
