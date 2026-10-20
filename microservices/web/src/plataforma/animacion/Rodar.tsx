import { useEffect, useRef, useState } from "react";
import { conMovimiento } from "./animacion";
import "./animacion.css";

// Un texto con un número que rueda letra por letra: al aparecer (si `alAparecer`), desde abajo;
// cuando cambia, hacia arriba si el número sube y hacia abajo si baja. Terminado el giro queda el
// texto común. Sin movimiento (preferencia del sistema), se ve el texto y nada más.
const valorDe = (t: string) => { const n = Number(t.replace(/[^\d]/g, "")) || 0; return /[−-]\$?\d/.test(t) ? -n : n; };

export function Rodar({ texto, escalon = 20, alAparecer = false }: { texto: string; escalon?: number; alAparecer?: boolean }) {
  const [giro, setGiro] = useState<{ dir: "sube" | "baja"; vez: number } | null>(() => (alAparecer && conMovimiento() ? { dir: "sube", vez: 0 } : null));
  const antes = useRef(texto);
  useEffect(() => {
    if (antes.current === texto) return;
    const dir = valorDe(texto) >= valorDe(antes.current) ? "sube" : "baja";
    antes.current = texto;
    if (conMovimiento()) setGiro((g) => ({ dir, vez: (g?.vez ?? 0) + 1 }));
  }, [texto]);
  useEffect(() => {
    if (!giro) return;
    const t = setTimeout(() => setGiro(null), texto.length * escalon + 300);
    return () => clearTimeout(t);
  }, [giro, texto.length, escalon]);
  if (!giro) return <>{texto}</>;
  return (
    <span key={giro.vez} className="anim-rueda">
      {[...texto].map((c, i) => (c === " " ? " " : <span key={i} className={`anim-d ${giro.dir}`} style={{ animationDelay: `${i * escalon}ms` }}>{c}</span>))}
    </span>
  );
}
