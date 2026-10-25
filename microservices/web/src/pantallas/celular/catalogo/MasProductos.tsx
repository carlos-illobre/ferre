import { useEffect, useRef } from "react";
import type { useListaDeProductos } from "../../../negocio/catalogo";
import { TEXTOS } from "../../textos";

// Al llegar al final de la lista, trae los siguientes (specs/018).
export function MasProductos({ lista }: { lista: ReturnType<typeof useListaDeProductos> }) {
  const centinela = useRef<HTMLDivElement>(null);
  const { hayMas, cargarMas } = lista;
  const cuantos = lista.productos.length;
  useEffect(() => {
    const el = centinela.current;
    if (!el || !hayMas) return;
    const obs = new IntersectionObserver((entradas) => { if (entradas.some((e) => e.isIntersecting)) cargarMas(); }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hayMas, cargarMas, cuantos]);
  return hayMas ? <div ref={centinela} className="aviso-suave" data-testid="cargar-mas">{TEXTOS.catalogo.cargandoMas.corto}</div> : null;
}
