import { useEffect, useRef, useState } from "react";
import { useAccionesDelLugar } from "../../../plataforma/comandos";
import { otroMargen, margenAMano, type Producto } from "../../../negocio/catalogo";
import { TEXTOS } from "../../textos";
import { Margenes } from "../base/ui";
import type { Cambios } from "./tipos";
import css from "./FichaAlLado.module.css";

const t = TEXTOS.ficha;

// Los cinco márgenes y «Otro» en una sola tira, como los segmentos de la v2. «Otro» abre la caja
// del porcentaje a mano; con un margen a mano, «Otro» lo muestra y queda marcado.
export function MargenEnSegmentos({ producto: p, alCambiar }: { producto: Producto; alCambiar: (c: Cambios) => void }) {
  const manual = margenAMano(p);
  const [escribiendo, setEscribiendo] = useState(false);
  const [texto, setTexto] = useState("");
  useEffect(() => { setEscribiendo(false); }, [p.id]);
  const sinCosto = p.costo_neto === null;
  const caja = useRef<HTMLInputElement>(null);
  useAccionesDelLugar(caja, { "campo.listo": () => guardar(), "campo.deshacer": () => setEscribiendo(false) });
  function guardar() {
    const v = otroMargen(texto);
    if (v !== null && v !== p.margen_elegido) alCambiar({ margen_elegido: v });
    setEscribiendo(false);
  }
  return (
    <div className={css.margen}>
      <Margenes flechasDeAfuera sinSigno elegido={p.margen_elegido} disabled={sinCosto} etiqueta="Margen" accionDe={(i) => `productos.margen.${i + 1}`} alElegir={(m) => alCambiar({ margen_elegido: m })} />
      {escribiendo ? (
        <label className={css.otroCaja}>
          <input ref={caja} autoFocus inputMode="numeric" placeholder="ej. 120" aria-label={`${t.otroMargen.largo} para ${p.descripcion}, en porcentaje`} value={texto} data-testid="otro-margen"
            onChange={(e) => setTexto(e.target.value.replace(/[^\d]/g, "").slice(0, 5))}
            onBlur={guardar} />
          <span aria-hidden="true">%</span>
        </label>
      ) : (
        <button type="button" className={css.otro} aria-pressed={manual !== null} disabled={sinCosto} onClick={() => { setTexto(manual === null ? "" : String(manual)); setEscribiendo(true); }}
          title={t.otroMargen.largo} aria-label={manual !== null ? `${t.otroMargen.largo}: ${manual} % ${t.aMano.largo}` : t.otroMargen.largo} data-testid="margen-otro">
          {manual !== null ? `${manual} %` : t.otro.largo}
        </button>
      )}
    </div>
  );
}
