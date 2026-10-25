import { useState } from "react";
import { pesosCortos } from "../base/ui";
import css from "./VentasDelDia.module.css";

// El precio de un renglón: se toca y se escribe otro; Enter o salir lo deja, Esc lo deja como estaba.
const comoNumero = (texto: string) => Number(texto.replace(/\./g, "").replace(",", "."));
type Props = { valor: number; cambio: boolean; etiqueta: string; alCambiar: (v: number) => void };

export function PrecioEditable({ valor, cambio, etiqueta, alCambiar }: Props) {
  const [texto, setTexto] = useState<string | null>(null);
  const listo = (ok: boolean) => { if (texto === null) return; const n = comoNumero(texto); if (ok && n > 0) alCambiar(n); setTexto(null); };
  if (texto === null) return <button type="button" className={`${css.precio} ${cambio ? "cambio" : ""}`} aria-label={`${etiqueta}: ${pesosCortos(valor)}. Tocá para cambiarlo`} onClick={() => setTexto(String(valor))} data-testid="precio">{pesosCortos(valor)}</button>;
  return (
    <span className={`${css.precio} editando`}>$<input autoFocus onFocus={(e) => e.currentTarget.select()} inputMode="decimal" aria-label={etiqueta} value={texto} onChange={(e) => setTexto(e.target.value)} onBlur={() => listo(true)} data-testid="precio-ed"
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); listo(true); } else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setTexto(null); } }} /></span>
  );
}
