import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buscar, indexar } from "@ferre/calculo-de-precios";
import { api, ErrorApi } from "./api";
import type { Producto } from "./pantallas/Productos";

// El catálogo entero en memoria, compartido por Productos y Vender. Se baja una vez por
// sesión y se guarda una copia en el navegador para arrancar sin conexión (#18, parcial:
// la sincronización completa llega con ese issue).
const CLAVE = "ferre.catalogo";

export function useCatalogo() {
  const [catalogo, setCatalogo] = useState<Producto[] | null>(() => {
    try { const v = localStorage.getItem(CLAVE); return v ? (JSON.parse(v) as Producto[]) : null; } catch { return null; }
  });
  const [error, setError] = useState<string | null>(null);
  // Cambios hechos acá mientras la bajada del catálogo estaba en vuelo: se vuelven a
  // aplicar sobre lo que llega, para que la respuesta vieja no los pise. Se conservan
  // hasta que esa bajada termina (el PATCH puede terminar antes que el GET, y el GET
  // haber leído la base antes del PATCH).
  const pendientes = useRef(new Map<string, Partial<Pick<Producto, "margen_elegido" | "precio_manual">>>());

  useEffect(() => {
    api<Producto[]>("/productos")
      .then((bajado) => {
        const c = bajado.map((p) => (pendientes.current.has(p.id) ? { ...p, ...pendientes.current.get(p.id) } : p));
        pendientes.current.clear();
        setCatalogo(c);
        try { localStorage.setItem(CLAVE, JSON.stringify(c)); } catch { /* sin espacio: se sigue en memoria */ }
      })
      .catch((e) => setError(e instanceof ErrorApi ? e.message : catalogo ? "Sin conexión: usando el catálogo guardado en este dispositivo." : "Sin conexión con el servidor: el catálogo no se pudo bajar."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const indice = useMemo(() => (catalogo ? indexar(catalogo.map((p) => ({ ...p, codigos: [p.codigo_proveedor, p.codigo_barras] }))) : null), [catalogo]);
  const buscarProductos = useCallback((consulta: string, maximo = 50) => (indice ? buscar(indice, consulta, maximo) : []), [indice]);

  const actualizarProducto = useCallback((id: string, cambios: Partial<Pick<Producto, "margen_elegido" | "precio_manual">>) => {
    pendientes.current.set(id, { ...pendientes.current.get(id), ...cambios });
    setCatalogo((c) => {
      const nuevo = c && c.map((p) => (p.id === id ? { ...p, ...cambios } : p));
      try { if (nuevo) localStorage.setItem(CLAVE, JSON.stringify(nuevo)); } catch { /* ídem */ }
      return nuevo;
    });
    const cuerpo: Record<string, number | null> = {};
    if ("margen_elegido" in cambios) cuerpo.margen_elegido = cambios.margen_elegido ?? null;
    if ("precio_manual" in cambios) cuerpo.precio_manual = cambios.precio_manual === null || cambios.precio_manual === undefined ? null : Number(cambios.precio_manual);
    return api(`/productos/${id}`, { method: "PATCH", body: JSON.stringify(cuerpo) });
  }, []);

  return { catalogo, error, buscarProductos, actualizarProducto };
}
