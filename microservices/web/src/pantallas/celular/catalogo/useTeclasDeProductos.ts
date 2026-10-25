import { useCallback } from "react";
import { esperarBusqueda } from "../../../negocio/catalogo";
import { MARGENES } from "../../../negocio/precios";
import { useTeclasGlobales } from "../../../plataforma/teclado";
import type { ProductosDelCelular } from "./useProductosDelCelular";

// Con teclado (un celular en la computadora): flechas eligen, Enter abre, Shift+1..5 fijan el margen
// del elegido, Esc limpia. Si la lista todavía no alcanzó a lo que se escribió, Enter espera la
// respuesta y abre el primero.
type Accion = "mover" | "abrir" | "limpiar" | "margen";
type Tecla = globalThis.KeyboardEvent;

function accionDe(e: Tecla, fijaMargen: boolean): Accion | null {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") return "mover";
  if (e.key === "Enter") return "abrir";
  if (e.key === "Escape") return "limpiar";
  return fijaMargen && e.shiftKey && /^Digit[1-5]$/.test(e.code) ? "margen" : null;
}

const ACCIONES: Record<Accion, (e: Tecla, x: ProductosDelCelular) => void> = {
  mover: (e, x) => { e.preventDefault(); const tope = x.lista.productos.length - 1; x.setElegido((i) => (e.key === "ArrowDown" ? Math.min(i + 1, tope) : Math.max(i - 1, 0))); },
  abrir: (e, x) => {
    const elegido = x.lista.productos[x.elegido];
    if ((x.consulta !== x.consultaEstable || x.lista.cargando) && x.consulta.trim()) { e.preventDefault(); void esperarBusqueda(x.consulta).then((r) => { if (r[0]) x.setAbiertoId(r[0].id); }); }
    else if (elegido) { e.preventDefault(); x.setAbiertoId(elegido.id); }
  },
  limpiar: (_e, x) => { x.setConsulta(""); x.caja.current?.focus(); },
  margen: (e, x) => {
    e.preventDefault();
    const p = x.lista.productos[x.elegido];
    if (p) x.actualizar(p.id, { margen_elegido: MARGENES[Number(e.code.slice(5)) - 1]! });
  },
};

export function useTeclasDeProductos(x: ProductosDelCelular) {
  const { abiertoId, lista, elegido, consulta, consultaEstable, fijaMargen, actualizar } = x;
  const teclas = useCallback((e: Tecla) => {
    if (abiertoId) return;
    const accion = accionDe(e, fijaMargen);
    if (accion) ACCIONES[accion](e, x);
  }, [lista.productos, elegido, actualizar, abiertoId, fijaMargen, consulta, consultaEstable, lista.cargando]); // eslint-disable-line react-hooks/exhaustive-deps
  useTeclasGlobales(teclas, x.caja.current);
}
