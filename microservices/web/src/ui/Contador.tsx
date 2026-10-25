import { useState, type ReactNode } from "react";
import { Icono } from "./iconos";

// La cantidad con − y +: enteros por unidad, de a 0,5 a granel (hasta un decimal). Se puede
// tipear (a medio tipear se ve lo tipeado, «2,» camino a «2,5») y las flechas ↑ ↓ suman y
// restan. Con `alQuitar`, «−» en el mínimo quita el renglón (Vender, decisión 119); `children`
// va al final (por ejemplo, la unidad).
type Props = {
  valor: number; entera: boolean; alCambiar: (v: number) => void; min?: number; etiqueta?: string; testId?: string;
  sinBotones?: boolean; alQuitar?: () => void; children?: ReactNode;
  /** Lo que vale si se deja la caja vacía; si no se dice, el mínimo. */
  siQuedaVacio?: number;
};

// Lo tipeado, con un solo separador decimal (coma o punto) y sin letras.
const limpiar = (crudo: string) => crudo.replace(/[^\d.,]/g, "").replace(/[.,](?=.*[.,])/g, "");

function useCantidad({ valor, entera, alCambiar, min = entera ? 1 : 0.1, alQuitar, siQuedaVacio = min }: Props) {
  const paso = entera ? 1 : 0.5;
  const redondear = (v: number) => (entera ? Math.floor(v) : Math.round(v * 10) / 10);
  const [texto, setTexto] = useState<string | null>(null);
  const poner = (v: number) => { setTexto(null); alCambiar(v); };
  const quita = Boolean(alQuitar) && valor - paso < min - 1e-9;
  const restar = () => poner(Math.max(min, redondear(valor - paso)));
  return {
    quita, mostrado: texto ?? (valor === 0 ? "" : String(valor).replace(".", ",")),
    menos: () => (quita ? alQuitar?.() : restar()),
    mas: () => poner(redondear(valor + paso)),
    flecha: (tecla: string) => (tecla === "ArrowUp" ? poner(redondear(valor + paso)) : restar()),
    // A medio tipear («2,») se ve lo tipeado; si no, la cantidad ya ajustada (1,55 → 1,6).
    tipear: (crudo: string) => {
      const limpio = limpiar(crudo);
      const v = Number(limpio.replace(",", "."));
      const ajustado = !Number.isFinite(v) || v <= 0 ? 0 : redondear(v);
      setTexto(!entera && /[.,]$/.test(limpio) ? limpio.replace(".", ",") : null);
      alCambiar(ajustado);
    },
    alSalir: () => { setTexto(null); if (valor === 0) alCambiar(siQuedaVacio); },
  };
}

export function Contador(props: Props) {
  const { entera, etiqueta = "Cantidad", testId = "cantidad", sinBotones, children } = props;
  const c = useCantidad(props);
  return (
    <div className="contador">
      {!sinBotones && <button type="button" aria-label={c.quita ? "Quitar" : "Uno menos"} onClick={c.menos}><Icono nombre="menos" tam={18} grosor={2.4} /></button>}
      <input inputMode={entera ? "numeric" : "decimal"} aria-label={etiqueta} value={c.mostrado} onFocus={(e) => e.target.select()} onChange={(e) => c.tipear(e.target.value)}
        onKeyDown={(e) => { if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); e.stopPropagation(); c.flecha(e.key); } }}
        onBlur={c.alSalir} data-testid={testId} />
      {!sinBotones && <button type="button" aria-label="Uno más" onClick={c.mas}><Icono nombre="mas" tam={18} grosor={2.4} /></button>}
      {children}
    </div>
  );
}
