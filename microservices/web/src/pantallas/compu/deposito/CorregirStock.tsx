import { useId, useState, type FormEvent } from "react";
import { numero } from "../../../negocio/formato";
import { enteras, unidadDe } from "../../../negocio/catalogo";
import { useCorregirStock, useFormularioDeCorreccion } from "../../../negocio/deposito";
import { MOTIVOS_DE_AJUSTE, TEXTOS } from "../../textos";
import { Aviso, Boton } from "../base/ui";
import { Icono } from "../../../ui/iconos";
import type { Producto } from "./deposito-comun";
import css from "./Inventario.module.css";

// Corregir pide cuántas hay y por qué, y no confirma: el ajuste queda a la vista entre los
// movimientos. Enter guarda y Esc cancela.
type Props = { producto: Producto; cantidad: number; alCorregir: (habia: number, hay: number, encolado: boolean) => void; alTerminar: () => void };
type Falta = { real?: string; motivo?: string };

export function CorregirStock({ producto: p, cantidad, alCorregir, alTerminar }: Props) {
  const f = useFormularioDeCorreccion(p, cantidad);
  const { faltaEn, corregir, guardando } = useCorregirStock(p);
  const [falta, setFalta] = useState<Falta>({});
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (guardando) return;
    const faltan = faltaEn(f.real, f.motivo);
    setFalta({ real: faltan?.real ? TEXTOS.inventario.faltaCuantasHay.largo : undefined, motivo: faltan?.motivo ? TEXTOS.inventario.faltaElMotivo.largo : undefined });
    if (faltan) return;
    setError(null);
    try {
      const { hay, encolado } = await corregir(f.real, f.motivo);
      f.elegirMotivo("");
      alCorregir(cantidad, hay, encolado);
      alTerminar();
    } catch (err) { setError(`No se guardó la corrección: ${(err as Error).message}`); }
  }
  const cancelar = () => { f.limpiar(); setFalta({}); alTerminar(); };
  return (
    <form className={css.corregir} onSubmit={guardar} onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cancelar(); } }} noValidate data-testid="correccion">
      <CuantasHay id={id} producto={p} cantidad={cantidad} f={f} falta={falta.real} alCambiar={() => setFalta((x) => ({ ...x, real: undefined }))} />
      {falta.real && <p className="stock-falta" id={`${id}-falta-real`} role="alert">{falta.real}</p>}
      <Motivo id={id} f={f} falta={falta.motivo} alCambiar={() => setFalta((x) => ({ ...x, motivo: undefined }))} />
      {falta.motivo && <p className="stock-falta" id={`${id}-falta-motivo`} role="alert">{falta.motivo}</p>}
      <Aviso tipo="error">{error}</Aviso>
      <div className={css.filaC}>
        <Boton type="submit" variante="marino" className={css.guardar} disabled={guardando} data-testid="guardar-ajuste">{guardando ? "Guardando…" : "Guardar corrección"} <kbd className="tecla">Enter</kbd></Boton>
        <Boton className={css.cancelar} onClick={cancelar} disabled={guardando}>Cancelar <kbd className="tecla">Esc</kbd></Boton>
      </div>
    </form>
  );
}

type Formulario = ReturnType<typeof useFormularioDeCorreccion>;

function CuantasHay({ id, producto: p, cantidad, f, falta, alCambiar }: { id: string; producto: Producto; cantidad: number; f: Formulario; falta?: string; alCambiar: () => void }) {
  const enteraS = enteras(unidadDe(p));
  return (
    <div className={css.filaC}>
      <label className={css.etC} htmlFor={`${id}-real`}>¿Cuántas hay?</label>
      <span className={css.cantidad}>
        <button type="button" onClick={() => { f.sumar(-1); alCambiar(); }} aria-label="Una menos"><Icono nombre="minus" tam={16} /></button>
        <input id={`${id}-real`} inputMode={enteraS ? "numeric" : "decimal"} autoComplete="off" value={f.real} onFocus={(e) => e.target.select()}
          onChange={(e) => { f.setReal(e.target.value.replace(enteraS ? /[^\d]/g : /[^\d,.]/g, "")); alCambiar(); }}
          aria-invalid={Boolean(falta)} aria-describedby={falta ? `${id}-falta-real` : `${id}-vista`} data-testid="cantidad-real" />
        <button type="button" onClick={() => { f.sumar(1); alCambiar(); }} aria-label="Una más"><Icono nombre="plus" tam={16} /></button>
      </span>
      <span className={css.vista} id={`${id}-vista`}>{!f.valida ? <>el sistema dice <b>{numero(cantidad)}</b></> : f.hay === cantidad ? "coincide con el sistema" : <>había <b>{numero(cantidad)}</b>, hay <b>{numero(f.hay)}</b></>}</span>
    </div>
  );
}

function Motivo({ id, f, falta, alCambiar }: { id: string; f: Formulario; falta?: string; alCambiar: () => void }) {
  return (
    <>
      <div className={css.motivos} role="group" aria-label="Motivo">
        {MOTIVOS_DE_AJUSTE.map((m) => <button key={m} type="button" className={`${css.chip} ${f.motivo === m && !f.otro ? "elegido" : ""}`} aria-pressed={f.motivo === m && !f.otro} onClick={() => { f.elegirMotivo(m); alCambiar(); }}>{m}</button>)}
        <button type="button" className={`${css.chip} ${f.otro ? "elegido" : ""}`} aria-pressed={f.otro} onClick={f.elegirOtro}>Otro…</button>
      </div>
      {f.otro && <input className="entrada" autoFocus value={f.motivo} onChange={(e) => { f.setMotivo(e.target.value); alCambiar(); }} placeholder="Escribí el motivo" aria-label="Motivo de la corrección" maxLength={200}
        aria-invalid={Boolean(falta)} aria-describedby={falta ? `${id}-falta-motivo` : undefined} data-testid="motivo" />}
    </>
  );
}
