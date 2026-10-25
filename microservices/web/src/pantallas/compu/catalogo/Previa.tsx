import { useRef, useState } from "react";
import { useAccionesDelLugar } from "../../../plataforma/comandos";
import { variacion, type Fila } from "../../../negocio/catalogo";
import { pesos, porcentaje } from "../../../negocio/formato";
import { TEXTOS } from "../../textos";
import { Explicado, Icono } from "../base/ui";
import { SUBA_GRANDE } from "./FiltrosDeLaRevision";
import css from "./Listas.module.css";

function Cambio({ fila }: { fila: Fila }) {
  const cambio = variacion(fila);
  if (fila.costo_anterior === null) return <span className={`${css.var} nuevo`}>Nuevo</span>;
  if (cambio === null || cambio === 0) return <span className={css.var}>0 %</span>;
  const diferencia = Number(fila.costo_neto) - Number(fila.costo_anterior);
  return (
    <span className={`${css.var} ${cambio > SUBA_GRANDE ? "grande" : cambio < 0 ? "baja" : ""}`}>
      <Explicado valor={porcentaje(cambio)} etiqueta={`${cambio > 0 ? "Sube" : "Baja"} ${porcentaje(cambio)}`} titulo={`De dónde sale ${porcentaje(cambio)}`}
        pasos={[`Costo hasta ahora: ${pesos(fila.costo_anterior)}`, `Costo nuevo: ${pesos(fila.costo_neto)}`, `${diferencia > 0 ? "Sube" : "Baja"} ${pesos(Math.abs(diferencia))}, que sobre el costo de hasta ahora es ${porcentaje(cambio)}`]} />
    </span>
  );
}

// La tabla de la revisión. Se recorre por filas; la fila con foco muestra debajo, en pasos, de
// dónde sale su costo, y la explicación se pliega y se despliega.
export function Previa({ filas, mas }: { filas: Fila[]; mas: React.ReactNode }) {
  const [activa, setActiva] = useState(0);
  const [explicada, setExplicada] = useState(true);
  const tabla = useRef<HTMLTableElement>(null);
  useAccionesDelLugar(tabla, { "previa.explicar": () => setExplicada((x) => !x) });
  return (
    <div className={css.tabla}>
      <table ref={tabla} className={css.previa} data-testid="vista-previa" data-flechas-propias>
        <colgroup><col className="c-foto" /><col /><col className="c-antes" /><col className="c-nuevo" /><col className="c-cambio" /><col className="c-estante" /></colgroup>
        <thead><tr><th scope="col"><span className="solo-lectores">Foto</span></th><th scope="col">Producto</th><th scope="col" className="num">Costo antes</th><th scope="col" className="num">Costo nuevo</th><th scope="col" className="num">Cambio</th><th scope="col" className="num">{TEXTOS.listas.precioEnEstanteria.largo}</th></tr></thead>
        <tbody>
          {filas.map((f, i) => (
            <FilaDePrevia key={f.codigo_proveedor} fila={f} i={i} foco={i === activa} explicada={explicada && i === activa}
              alEnfocar={() => setActiva(i)} />
          ))}
        </tbody>
      </table>
      {mas}
    </div>
  );
}

function FilaDePrevia({ fila: f, i, foco, explicada, alEnfocar }: { fila: Fila; i: number; foco: boolean; explicada: boolean; alEnfocar: () => void }) {
  return (
    <>
      <tr data-fila={i} className={foco ? "foco" : ""} tabIndex={foco ? 0 : -1} onFocus={alEnfocar} onClick={alEnfocar}>
        <td className={css.fotoCelda}><span className={css.foto} aria-hidden="true"><Icono nombre="productos" tam={16} /></span></td>
        <td><span className={css.n}>{f.descripcion}</span><span className={css.d}>{[f.marca, f.codigo_proveedor].filter(Boolean).join(" · ")}</span></td>
        <td className={`num ${css.antes}`}>{f.costo_anterior === null ? "—" : pesos(f.costo_anterior)}</td>
        <td className="num"><Explicado valor={pesos(f.costo_neto)} pasos={f.explicacion} className={css.nuevo} titulo={`De dónde sale el costo de ${f.descripcion}`} /></td>
        <td className="num"><Cambio fila={f} /></td>
        <td className={`num ${css.estante}`} title="Todavía no se calcula acá">—</td>
      </tr>
      {explicada && f.explicacion.length > 0 && (
        <tr className={css.explica} aria-label={`De dónde sale el costo de ${f.descripcion}`}>
          <td colSpan={6}>
            <span className={css.pasos}>
              {f.explicacion.map((p, k) => (
                <span key={k} className={css.pasoLugar}>
                  {k > 0 && <Icono nombre="derecha" tam={14} />}
                  <span className={`${css.paso} ${k === f.explicacion.length - 1 ? "fin" : ""}`}>{p}</span>
                </span>
              ))}
            </span>
          </td>
        </tr>
      )}
    </>
  );
}

