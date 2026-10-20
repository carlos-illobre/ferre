import { useState } from "react";
import { Icono } from "./base";
import "./calendario.css";

// Un calendario propio, con los colores de «Mostrador» (decisión 141), en lugar del del sistema: el
// mes con ‹ ›, los días de lunes a domingo, hoy marcado con un anillo, el elegido en verde oscuro y
// los días después de `hasta`, apagados. Las fechas van como AAAA-MM-DD.
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["L", "M", "M", "J", "V", "S", "D"];
const aTexto = (a: number, m: number, d: number) => `${a}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export function Calendario({ elegido, hasta, hoy, alElegir }: { elegido: string; hasta: string; hoy: string; alElegir: (dia: string) => void }) {
  const [anio, mes] = elegido.split("-").map(Number) as [number, number];
  const [vista, setVista] = useState({ anio, mes: mes - 1 });
  const [aTope, mTope] = hasta.split("-").map(Number) as [number, number];
  const hayDespues = vista.anio < aTope || (vista.anio === aTope && vista.mes < mTope - 1);
  const mover = (paso: number) => setVista((v) => { const m = v.mes + paso; return { anio: v.anio + Math.floor(m / 12), mes: ((m % 12) + 12) % 12 }; });
  // El primer día del mes cae en: 0 lunes … 6 domingo.
  const corrimiento = (new Date(vista.anio, vista.mes, 1).getDay() + 6) % 7;
  const cuantos = new Date(vista.anio, vista.mes + 1, 0).getDate();
  return (
    <div className="calendario" data-testid="calendario">
      <div className="calendario-cab">
        <button type="button" onClick={() => mover(-1)} aria-label="Mes anterior" data-testid="mes-anterior"><Icono nombre="izquierda" tam={20} grosor={2.4} /></button>
        <b aria-live="polite" data-testid="mes">{MESES[vista.mes]} {vista.anio}</b>
        <button type="button" onClick={() => mover(1)} disabled={!hayDespues} aria-label="Mes siguiente" data-testid="mes-siguiente"><Icono nombre="derecha" tam={20} grosor={2.4} /></button>
      </div>
      <div className="calendario-grilla" role="grid">
        {DIAS.map((d, i) => <span key={i} className="calendario-sem" aria-hidden="true">{d}</span>)}
        {Array.from({ length: corrimiento }, (_, i) => <span key={`v${i}`} />)}
        {Array.from({ length: cuantos }, (_, i) => {
          const dia = aTexto(vista.anio, vista.mes, i + 1);
          const futuro = dia > hasta;
          return (
            <button key={dia} type="button" role="gridcell" disabled={futuro} aria-selected={dia === elegido} aria-current={dia === hoy ? "date" : undefined}
              className={`${dia === elegido ? "elegido" : ""} ${dia === hoy ? "hoy" : ""}`} onClick={() => alElegir(dia)} data-testid={`dia-${dia}`}>{i + 1}</button>
          );
        })}
      </div>
    </div>
  );
}
