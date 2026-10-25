import { useState } from "react";
import { abreviarUnidad, conUnidad, enteras, unidadDe, type Producto } from "../../../negocio/catalogo";
import { useCorregirStock, useFormularioDeCorreccion } from "../../../negocio/deposito";
import { MOTIVOS_DE_AJUSTE, TEXTOS } from "../../textos";
import { AvisoError } from "../componentes/base";
import { Icono } from "../../../ui/iconos";
import css from "./Stock.module.css";

// La corrección: cuántas hay (con una más y una menos) y el motivo, que es obligatorio, igual que
// en la computadora (RF-53).
const num = (n: number) => n.toLocaleString("es-AR");
type Props = { producto: Producto; cantidad: number; alAjustar: (mensaje: string) => void };

function mensajeDelAjuste(p: Producto, cantidad: number, hay: number, encolado: boolean) {
  const dif = hay - cantidad;
  const unidad = abreviarUnidad(p.unidad);
  if (encolado) return `Quedó en ${conUnidad(hay, p.unidad)}. Se manda al volver internet.`;
  return dif === 0 ? "Sin diferencia: el stock ya decía eso." : `Stock corregido a ${num(hay)} ${unidad} (${dif > 0 ? "+" : ""}${num(dif)} ${unidad}).`;
}

export function CorregirEnLaHoja({ producto: p, cantidad, alAjustar }: Props) {
  const f = useFormularioDeCorreccion(p, cantidad);
  const { faltaEn, corregir, guardando } = useCorregirStock(p);
  const [error, setError] = useState<string | null>(null);
  async function guardar() {
    const falta = faltaEn(f.real, f.motivo);
    if (falta?.real) { setError(TEXTOS.inventario.faltaCuantasHay.corto); return; }
    if (falta?.motivo) { setError(TEXTOS.inventario.faltaElMotivo.corto); return; }
    try { const { hay, encolado } = await corregir(f.real, f.motivo); alAjustar(mensajeDelAjuste(p, cantidad, hay, encolado)); }
    catch (e) { setError((e as Error).message); }
  }
  return (
    <div className={css.corregir} data-testid="correccion">
      <div className={css.filaC}>
        <span className={css.etC}>¿Cuántas hay?</span>
        <span className={css.cantidad}>
          <button type="button" onClick={() => { f.sumar(-1); setError(null); }} aria-label="Una menos"><Icono nombre="minus" /></button>
          <input inputMode={enteras(unidadDe(p)) ? "numeric" : "decimal"} value={f.real} onFocus={(e) => e.target.select()} onChange={(e) => { f.setReal(e.target.value); setError(null); }} onKeyDown={(e) => { if (e.key === "Enter") void guardar(); }} aria-label="Cuántas hay" data-testid="cantidad-real" />
          <button type="button" onClick={() => { f.sumar(1); setError(null); }} aria-label="Una más"><Icono nombre="plus" /></button>
        </span>
      </div>
      <p className={css.vista}>{!f.valida ? <>El sistema dice <b>{num(cantidad)}</b></> : f.hay === cantidad ? "Coincide con el sistema" : <>Había <b>{num(cantidad)}</b>, hay <b>{num(f.hay)}</b></>}</p>
      <div className={css.motivos} role="group" aria-label="Motivo">
        {MOTIVOS_DE_AJUSTE.map((m) => <button key={m} type="button" className={`${css.chip} ${f.motivo === m && !f.otro ? "elegido" : ""}`} aria-pressed={f.motivo === m && !f.otro} onClick={() => { f.elegirMotivo(m); setError(null); }}>{m}</button>)}
        <button type="button" className={`${css.chip} ${f.otro ? "elegido" : ""}`} aria-pressed={f.otro} onClick={f.elegirOtro}>Otro…</button>
      </div>
      {f.otro && <input className="campo" autoFocus placeholder="Escribí el motivo" value={f.motivo} onChange={(e) => { f.setMotivo(e.target.value); setError(null); }} data-testid="motivo" />}
      <AvisoError texto={error} />
      <button type="button" className={css.guardar} onClick={() => void guardar()} disabled={guardando} data-testid="guardar-ajuste">{guardando ? "Guardando…" : "Guardar corrección"}</button>
    </div>
  );
}
