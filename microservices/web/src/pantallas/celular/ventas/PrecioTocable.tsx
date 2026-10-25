import { useState } from "react";
import { pesosCortos } from "../../../formato";
import css from "./VentasDelDia.module.css";

// El precio de un renglón: se toca y se escribe otro; Enter o salir lo deja.
const comoNumero = (texto: string) => Number(texto.replace(/\./g, "").replace(",", "."));

export function PrecioTocable({ valor, cambio, alCambiar, etiqueta }: { valor: number; cambio: boolean; alCambiar: (v: number) => void; etiqueta: string }) {
  const [texto, setTexto] = useState<string | null>(null);
  const listo = () => { const n = comoNumero(texto ?? ""); if (n > 0) alCambiar(n); setTexto(null); };
  if (texto === null) return <button type="button" className={`${css.precio} ${cambio ? "cambio" : ""}`} aria-label={`${etiqueta}: ${pesosCortos(valor)}. Tocá para cambiarlo`} onClick={() => setTexto(String(valor))} data-testid="precio">{pesosCortos(valor)}</button>;
  return <span className={`${css.precio} editando`}>$<input autoFocus inputMode="decimal" aria-label={etiqueta} value={texto} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setTexto(e.target.value)} onBlur={listo} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); listo(); } }} data-testid="precio-ed" /></span>;
}
