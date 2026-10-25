import { useState } from "react";
import { cuandoCorto, cuantosProductos, decidir, diaCorto, enMiles, horaCorta, vistaDelCambio, type CambioApartado, type VistaDelCambio } from "../../../negocio/apartados";
import { nombreDeMedio } from "../../../negocio/ventas";
import { nombreDeProducto } from "../../../negocio/formato";
import { TEXTOS } from "../../textos";
import { Icono } from "../../../ui/iconos";
import { FotoDeProducto, ICONO_DEL_CAMBIO, Pesos } from "../../comun/anomalias/piezas";
import css from "./Anomalias.module.css";

const t = TEXTOS.anomaliasV2;
type Props = { cambio: CambioApartado; abierta: boolean; conRed: boolean; alTocar: () => void; alDecidir: () => void };
const elDia = (iso: string) => `${diaCorto(iso).split(" ")[0]} ${horaCorta(iso)}`;

function textosDeLaFila(c: CambioApartado, v: VistaDelCambio) {
  if (v.tipo !== "venta") return { titulo: v.nombre, detalle: v.detalle };
  return { titulo: `${v.nombre}${v.medio ? ` · ${nombreDeMedio(v.medio)}` : ""}`, detalle: `${elDia(c.hecho_en)} · ${cuantosProductos(v.productos.length)}` };
}

// Una tarjeta por cambio: plegada, qué es y su importe (o la hora); abierta, los productos, cuándo
// se hizo y cuándo llegó, y «Descartar» o «Aceptar».
export function TarjetaDelCambio({ cambio: c, abierta, conRed, alTocar, alDecidir }: Props) {
  const v = vistaDelCambio(c);
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function hacer(decision: "aceptar" | "descartar") {
    setEnCurso(true); setError(null);
    try { await decidir(c.id, decision); alDecidir(); }
    catch (e) { setError((e as Error).message); }
    finally { setEnCurso(false); }
  }
  return (
    <div className={`${css.card} ${abierta ? "abierta" : ""}`} data-testid="apartado">
      <Fila c={c} v={v} abierta={abierta} alTocar={alTocar} />
      {abierta && <>
        {v.productos.length > 0 && <Productos v={v} />}
        <div className="hor">
          <span className="mv-pastilla contorno"><Icono nombre="celular" tam={16} />{v.hecho} {elDia(c.hecho_en)}</span>
          <span className="mv-pastilla contorno"><Icono nombre="nube-subir" tam={16} />{t.llego.corto} {cuandoCorto(c.llegado_en)}</span>
        </div>
        <Aviso c={c} v={v} error={error} />
        <div className="botones">
          <button type="button" className="mv-btn peligro" disabled={!conRed || enCurso} onClick={() => void hacer("descartar")} data-testid="descartar-apartado"><Icono nombre="cruz" tam={16} />{t.descartar.corto}</button>
          <button type="button" className="mv-btn accion" disabled={!conRed || enCurso} onClick={() => void hacer("aceptar")} data-testid="aceptar-apartado"><Icono nombre="tilde" tam={16} />{v.boton}</button>
        </div>
      </>}
    </div>
  );
}

function Fila({ c, v, abierta, alTocar }: { c: CambioApartado; v: VistaDelCambio; abierta: boolean; alTocar: () => void }) {
  const noSePuede = Boolean(c.error);
  const { titulo, detalle } = textosDeLaFila(c, v);
  return (
    <button type="button" className={`fila ${noSePuede ? "no" : ""}`} aria-expanded={abierta} onClick={alTocar}>
      <span className="ico"><Icono nombre={ICONO_DEL_CAMBIO[v.tipo]} /></span>
      <span className="tx"><span className="t">{titulo}</span><span className="d">{detalle}</span></span>
      <span className={`m ${v.importe === null ? "hora" : ""}`}>{v.importe === null ? (noSePuede ? t.noVa.corto : horaCorta(c.hecho_en)) : <Pesos valor={v.importe} />}</span>
      {abierta ? <span /> : <Icono nombre="abajo" tam={16} className="ch" />}
    </button>
  );
}

function Productos({ v }: { v: VistaDelCambio }) {
  return (
    <div className="prods">
      {v.productos.map((p, i) => (
        <div key={i} className="p">
          <FotoDeProducto foto={p.foto_url} tam={18} />
          <span className="tx"><span className="n">{nombreDeProducto(p.descripcion)}</span><span className="q">{p.cantidad}</span></span>
          <b>{p.importe === null ? "—" : `$${enMiles(p.importe)}`}</b>
        </div>
      ))}
    </div>
  );
}

// Por qué no se pudo (o el error de recién); si no, qué pasa al aceptarlo.
function Aviso({ c, v, error }: { c: CambioApartado; v: VistaDelCambio; error: string | null }) {
  const motivo = error ?? (c.error ? `${t.noSePudo.corto}: ${c.error}` : null);
  if (motivo) return <div className="mv-aviso error" role="alert" data-testid="error-de-apartado"><Icono nombre={c.error ? "unir" : "alerta"} tam={16} /><div>{motivo}</div></div>;
  if (v.tipo === "venta" || !v.efecto[0]) return null;
  return <div className="mv-aviso pino"><Icono nombre="info" tam={16} /><div>{v.efecto[0]}</div></div>;
}
