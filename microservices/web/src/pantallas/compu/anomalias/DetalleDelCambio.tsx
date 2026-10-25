import type { CSSProperties } from "react";
import { cuantosProductos, cuandoCorto, diaCorto, enMiles, horaCorta, vistaDelCambio, type CambioApartado, type VistaDelCambio } from "../../../negocio/apartados";
import { nombreDeMedio } from "../../../negocio/ventas";
import { nombreDeProducto } from "../../../formato";
import { IconoDeMedio } from "../../IconoDeMedio";
import { TEXTOS } from "../../textos";
import { Icono } from "../../../ui/iconos";
import { FotoDeProducto, ICONO_DEL_CAMBIO, Pesos } from "../../comun/anomalias/piezas";
import css from "./Anomalias.module.css";

const t = TEXTOS.anomaliasV2;
type Decision = "aceptar" | "descartar";
type Props = { cambio: CambioApartado; numero: number; de: number; conRed: boolean; enCurso: boolean; error: string | null; alDecidir: (d: Decision) => void };

// A la derecha, el cambio elegido: qué es, cuándo se hizo y cuándo llegó, sus productos, qué pasa
// si se acepta (o por qué no se puede) y «Descartar» (D) o «Aceptar» (A).
export function DetalleDelCambio({ cambio: c, numero, de, conRed, enCurso, error, alDecidir }: Props) {
  const v = vistaDelCambio(c);
  const noSePuede = Boolean(c.error);
  const motivo = error || (c.error ? `${t.noSePudo.largo}: ${c.error}` : null);
  return (
    <section className={`mv-tarjeta-2 ${css.detalle}`} aria-label={t.elCambioElegido.largo} data-testid="cambio-elegido">
      <div className={css.detCab}>
        <div><div className="mv-etiqueta">{v.nombre} de {c.usuario} · {numero} de {de}</div><h2 className="mv-seccion">{v.titulo}</h2></div>
        <MedioOTipo v={v} noSePuede={noSePuede} />
      </div>
      <Linea c={c} v={v} />
      <div className={css.cuerpo}>
        <Productos v={v} />
        <div className={css.efecto}>{noSePuede ? <PorQueNo error={c.error!} /> : <SiLoAceptas v={v} />}</div>
      </div>
      {motivo && !noSePuede && <div className={`mv-aviso error ${css.motivo}`} role="alert" data-testid="error-de-apartado"><Icono nombre="alerta" tam={16} /><div>{motivo}</div></div>}
      <Pie v={v} habilitado={conRed && !enCurso} alDecidir={alDecidir} />
    </section>
  );
}

function MedioOTipo({ v, noSePuede }: { v: VistaDelCambio; noSePuede: boolean }) {
  if (v.medio) return <span className={`${css.medio} medio-${v.medio}`}><IconoDeMedio medio={v.medio} tam={16} />{nombreDeMedio(v.medio)}</span>;
  return <span className={`mv-pastilla ${noSePuede ? "error" : "contorno"}`}><Icono nombre={ICONO_DEL_CAMBIO[v.tipo]} tam={16} />{v.nombre}</span>;
}

// Cuándo se hizo, cuándo se cerró la sesión (si se cerró) y cuándo llegó.
function Linea({ c, v }: { c: CambioApartado; v: VistaDelCambio }) {
  const pasos = [
    { nombre: v.hecho, cuando: `${diaCorto(c.hecho_en)} ${horaCorta(c.hecho_en)}`, clase: "" },
    ...(c.desactivado_en ? [{ nombre: t.sesionCerrada.largo, cuando: `${diaCorto(c.desactivado_en)} ${horaCorta(c.desactivado_en)}`, clase: "rojo" }] : []),
    { nombre: t.llego.largo, cuando: cuandoCorto(c.llegado_en), clase: "pino" },
  ];
  return (
    <ol className={css.linea} style={{ gridTemplateColumns: `repeat(${pasos.length}, 1fr)`, "--pasos": pasos.length } as CSSProperties}>
      {pasos.map((p) => <li key={p.nombre} className="paso"><span className={`pt ${p.clase}`} /><b>{p.nombre}</b><span>{p.cuando}</span></li>)}
    </ol>
  );
}

function Productos({ v }: { v: VistaDelCambio }) {
  return (
    <div className={css.productos}>
      {v.productos.map((p, i) => (
        <div key={i} className={css.prod}>
          <FotoDeProducto foto={p.foto_url} tam={20} />
          <span><span className="n">{nombreDeProducto(p.descripcion)}</span><span className="d">{[p.cantidad, p.marca].filter(Boolean).join(" · ")}</span></span>
          <span className="p">{p.importe === null ? "—" : `$${enMiles(p.importe)}`}</span>
        </div>
      ))}
      {v.tipo === "venta" ? <div className={css.total}><span className="mv-etiqueta">{t.total.largo} · {cuantosProductos(v.productos.length)}</span><span className={`mv-numero ${css.grande}`}><Pesos valor={v.importe ?? 0} /></span></div>
        : <div className={css.que}><span className="mv-etiqueta">{v.nombre}</span><b>{v.detalle}</b></div>}
    </div>
  );
}

function PorQueNo({ error }: { error: string }) {
  return <>
    <h3>{t.porQueNo.largo}</h3>
    <div className="mv-aviso error" data-testid="error-de-apartado"><Icono nombre="unir" tam={16} /><div>{error}</div></div>
    <div className="ef"><Icono nombre="historia" tam={16} /><div>{t.siLoDescartas.largo}</div></div>
  </>;
}

function SiLoAceptas({ v }: { v: VistaDelCambio }) {
  const venta = v.tipo === "venta";
  return <>
    <h3>{venta ? t.siLaAceptas.largo : t.siLoAceptas.largo}</h3>
    {v.efecto.map((e, i) => <div key={i} className="ef"><Icono nombre={i === 0 && venta ? "calendario" : "paquete"} tam={16} /><div>{e}</div></div>)}
    <div className="ef"><Icono nombre="historia" tam={16} /><div>{t.quienHizoQueDira.largo} <b>{venta ? t.laAceptasteVos.largo : t.loAceptasteVos.largo}</b>.</div></div>
  </>;
}

function Pie({ v, habilitado, alDecidir }: { v: VistaDelCambio; habilitado: boolean; alDecidir: (d: Decision) => void }) {
  return (
    <div className={css.pie}>
      <span className="nav"><span className="mv-kbd">↑</span><span className="mv-kbd">↓</span>{t.otroCambio.largo}</span>
      <div className="der">
        <button type="button" className="mv-btn peligro" disabled={!habilitado} onClick={() => alDecidir("descartar")} aria-keyshortcuts="D" data-testid="descartar-apartado"><Icono nombre="cruz" tam={16} />{t.descartar.largo} <span className="mv-kbd">D</span></button>
        <button type="button" className="mv-btn accion" disabled={!habilitado} onClick={() => alDecidir("aceptar")} aria-keyshortcuts="A" data-testid="aceptar-apartado"><Icono nombre="tilde" tam={16} />{v.boton} <span className="mv-kbd">A</span></button>
      </div>
    </div>
  );
}
