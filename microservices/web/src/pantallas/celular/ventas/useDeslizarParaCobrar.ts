import { useEffect, useRef, useState, type PointerEvent } from "react";

// Arrastrar el círculo de «Cobrar»: soltarlo cerca del final cobra; antes, vuelve al principio.
// Un toque sin arrastrar solo explica cómo se cobra.
type Opciones = { apagado: boolean; ocupado: boolean; alCobrar: () => Promise<void> | void; alTocar: () => void };

export function useDeslizarParaCobrar({ apagado, ocupado, alCobrar, alTocar }: Opciones) {
  const caja = useRef<HTMLDivElement>(null);
  const pulgar = useRef<HTMLButtonElement>(null);
  const [x, setX] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const inicio = useRef<number | null>(null);
  const xRef = useRef(0);
  const max = () => Math.max(1, (caja.current?.clientWidth ?? 0) - (pulgar.current?.offsetWidth ?? 0) - 10);
  const mover = (v: number) => { xRef.current = v; setX(v); };
  // Cuando se termina de cobrar (o no se pudo), el círculo vuelve al principio.
  useEffect(() => { if (!ocupado) mover(0); }, [ocupado]);
  const cobrar = async () => { mover(max()); try { await alCobrar(); } finally { mover(0); } };
  const bajar = (e: PointerEvent<HTMLButtonElement>) => {
    if (apagado) return;
    inicio.current = e.clientX;
    setArrastrando(true);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* sin captura, igual sigue */ }
  };
  const moverDedo = (e: PointerEvent<HTMLButtonElement>) => { if (inicio.current !== null) mover(Math.max(0, Math.min(max(), e.clientX - inicio.current))); };
  const soltar = () => {
    const habia = inicio.current !== null; inicio.current = null; setArrastrando(false);
    if (habia && xRef.current >= max() * 0.85) void cobrar(); else if (habia) mover(0);
  };
  const tocar = (e: React.MouseEvent) => { if (e.detail > 0 && xRef.current === 0) alTocar(); };
  return { caja, pulgar, x, arrastrando, opacidad: 1 - x / max(), cobrar, bajar, moverDedo, soltar, tocar };
}
