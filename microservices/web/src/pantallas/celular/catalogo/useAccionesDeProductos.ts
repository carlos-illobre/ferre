import { esperarBusqueda } from "../../../negocio/catalogo";
import { MARGENES } from "../../../negocio/precios";
import { useAccionesDelLugar, useComandos, type Accion } from "../../../plataforma/comandos";
import type { ProductosDelCelular } from "./useProductosDelCelular";

// Lo que ofrece la búsqueda de productos (con un teclado, un celular en la computadora): elegir el
// de al lado, abrir el elegido, limpiar la búsqueda y fijar el margen del elegido. Si la lista
// todavía no alcanzó a lo que se escribió, abrir espera la respuesta y abre el primero. Vale con
// el cursor en la búsqueda y fuera de cualquier campo; con una ficha abierta, nada.
function accionesDeProductos(x: ProductosDelCelular): Record<string, Accion> {
  const mover = (paso: 1 | -1) => () => { const tope = x.lista.productos.length - 1; x.setElegido((i) => Math.max(0, Math.min(i + paso, tope))); };
  const abrir = () => {
    const elegido = x.lista.productos[x.elegido];
    if ((x.consulta !== x.consultaEstable || x.lista.cargando) && x.consulta.trim()) { void esperarBusqueda(x.consulta).then((r) => { if (r[0]) x.setAbiertoId(r[0].id); }); return; }
    if (!elegido) return false;
    x.setAbiertoId(elegido.id);
  };
  const margen = (n: number) => () => {
    if (!x.fijaMargen) return false;
    const p = x.lista.productos[x.elegido];
    if (p) x.actualizar(p.id, { margen_elegido: MARGENES[n - 1]! });
  };
  return {
    "productos.siguiente": mover(1),
    "productos.anterior": mover(-1),
    "productos.abrir": abrir,
    "productos.volver": () => { x.setConsulta(""); x.caja.current?.focus(); },
    ...Object.fromEntries(MARGENES.map((_, i) => [`productos.margen.${i + 1}`, margen(i + 1)])),
  };
}

export function useAccionesDeProductos(x: ProductosDelCelular) {
  const acciones = x.abiertoId ? {} : accionesDeProductos(x);
  useComandos(acciones, { activo: !x.abiertoId });
  useAccionesDelLugar(x.caja, acciones);
}
