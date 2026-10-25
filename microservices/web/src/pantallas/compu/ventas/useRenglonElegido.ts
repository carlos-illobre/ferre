import { useEffect, useState, type RefObject } from "react";
import type { Item } from "../../../negocio/ventas";

// El renglón elegido, que se ve en «De dónde sale» (decisión 122): lo último agregado; si se va,
// el último que quede. La marca de las flechas (flechas.ts) también lo elige.
export function useRenglonElegido(items: Item[], lista: RefObject<HTMLUListElement>) {
  const [elegida, setElegida] = useState<string | null>(null);
  const claves = items.map((i) => i.clave).join(",");
  const ultima = items.at(-1)?.clave ?? null;
  useEffect(() => { setElegida(ultima); }, [items.length, ultima]);
  useEffect(() => { if (elegida && !items.some((i) => i.clave === elegida)) setElegida(ultima); }, [claves]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = lista.current; if (!el) return;
    const obs = new MutationObserver(() => { const m = el.querySelector<HTMLElement>("[data-flecha]"); if (m?.dataset.clave) setElegida(m.dataset.clave); });
    obs.observe(el, { attributes: true, subtree: true, attributeFilter: ["data-flecha"] });
    return () => obs.disconnect();
  });
  return { elegida, setElegida, renglon: items.find((i) => i.clave === elegida) ?? null };
}
