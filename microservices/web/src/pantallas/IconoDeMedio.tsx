import { ISOTIPO_DE_MERCADO_PAGO } from "./mercado-pago";
import "./medios.css";

// El ícono de un medio de pago, con su color (decisión 108): el mismo en «Hoy», «Anular», el
// cobro de Vender y «Cómo va el negocio», en el celular y en la computadora. Mercado Pago lleva
// su isotipo. `conFondo` lo pone sobre su color suave, en un cuadrado redondeado.
const DIBUJO_DE_MEDIO: Record<string, string> = {
  efectivo: "M3 7h18v10H3ZM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM6 10v4M18 10v4",
  tarjeta: "M3 6h18v12H3ZM3 10h18M7 15h4",
  cuenta_corriente: "M6 3h12v18H6ZM9 8h6M9 12h6M9 16h3",
};

export function IconoDeMedio({ medio, tam = 22, conFondo = false, className = "" }: { medio: string; tam?: number; conFondo?: boolean; className?: string }) {
  return (
    <span className={`medio-icono medio-${medio} ${conFondo ? "con-fondo" : ""} ${className}`} aria-hidden="true">
      {medio === "mercado_pago"
        ? <svg className="isotipo-mp" width={tam + 6} height={tam + 6} viewBox="0 0 24 24" fill="currentColor"><path d={ISOTIPO_DE_MERCADO_PAGO} /></svg>
        : <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={DIBUJO_DE_MEDIO[medio] ?? DIBUJO_DE_MEDIO.efectivo} /></svg>}
    </span>
  );
}
