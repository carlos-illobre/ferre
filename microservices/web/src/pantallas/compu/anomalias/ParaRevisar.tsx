import { haceCuanto, resumenDeLoApartado, type CambioApartado } from "../../../negocio/apartados";
import { NOMBRES, TEXTOS } from "../../textos";
import { Icono, type NombreDeIcono } from "../../../ui/iconos";
import { Pesos } from "../../comun/anomalias/piezas";
import { BandejaParaRevisar } from "./BandejaParaRevisar";
import { DetalleDelCambio } from "./DetalleDelCambio";
import { VerEnQuienHizoQue } from "./VerEnQuienHizoQue";
import { useParaRevisarDeLaCompu, type ParaRevisarDeLaCompu } from "./useParaRevisarDeLaCompu";
import "../../anomalias.css";
import "../../mas-v2.css";
import css from "./Anomalias.module.css";

// Más → Anomalías en la computadora, como la v2 del director de arte (variante 1, «Bandeja y
// detalle»; specs/014 y 005, decisión 148). «Para revisar»: cuatro números arriba, la bandeja por
// persona a la izquierda y el detalle del elegido a la derecha, con «Si la aceptás». ↑ ↓ eligen,
// A acepta y D descarta, de a uno (014-E09). Las pestañas las pone la aplicación.
const t = TEXTOS.anomaliasV2;

export function ParaRevisar({ titulo = true }: { titulo?: boolean }) {
  const x = useParaRevisarDeLaCompu();
  const { datos, elegido } = x;
  return (
    <main id="contenido" className="pagina mv2 anv" data-testid="para-revisar" tabIndex={-1}>
      <h1 className={titulo ? css.titulo : css.oculto}>{NOMBRES.anomalias}</h1>
      <VerEnQuienHizoQue />
      <Avisos x={x} />
      {datos && <Resumenes apartados={datos.apartados} />}
      {datos && x.orden.length === 0 && <NadaParaRevisar />}
      {datos && elegido && <Columnas x={x} elegido={elegido} />}
    </main>
  );
}

function Columnas({ x, elegido }: { x: ParaRevisarDeLaCompu; elegido: CambioApartado }) {
  return (
    <div className={css.cols}>
      <BandejaParaRevisar x={x} elegido={elegido} />
      <DetalleDelCambio key={elegido.id} cambio={elegido} numero={x.orden.indexOf(elegido) + 1} de={x.orden.length} conRed={x.conRed} enCurso={x.enCurso} error={x.errores[elegido.id] || null} alDecidir={(d) => void x.hacer(elegido, d)} />
    </div>
  );
}

const NadaParaRevisar = () => <div className={`mv-tarjeta ${css.vacio}`} data-testid="nada-para-revisar"><div className="mv-vacio"><span className="tilde"><Icono nombre="tilde" tam={32} /></span><b>{t.nadaParaRevisar.largo}</b><span>{t.nadaParaRevisarDetalle.largo}</span></div></div>;

function Avisos({ x: { conRed, error, datos, recargar } }: { x: ParaRevisarDeLaCompu }) {
  return (
    <>
      {!conRed && <div className="mv-aviso urgente" role="status"><Icono nombre="alerta" tam={16} />{t.sinConexionDecidir.largo}</div>}
      {error && <div className="mv-aviso error" role="alert"><Icono nombre="alerta" tam={16} /><span>{conRed ? (error as Error).message : t.sinConexionVer.largo}</span><button type="button" className="mv-btn chico" onClick={recargar}>{t.reintentar.largo}</button></div>}
      {!datos && !error && <p className="mv-cargando" aria-busy="true">{t.buscando.largo}</p>}
    </>
  );
}

function Resumen({ icono, etiqueta, urgente, testId, children }: { icono: NombreDeIcono; etiqueta: string; urgente?: boolean; testId?: string; children: React.ReactNode }) {
  return <div className={urgente ? "mv-resumen urgente" : "mv-resumen"}><span className="ico"><Icono nombre={icono} /></span><div><div className="et">{etiqueta}</div><div className="va" data-testid={testId}>{children}</div></div></div>;
}

// Los cuatro números de arriba: cuántos esperan, la plata de las ventas, cuántas personas y el más viejo.
function Resumenes({ apartados }: { apartados: CambioApartado[] }) {
  const r = resumenDeLoApartado(apartados);
  return (
    <div className={css.resumenes}>
      <Resumen icono="bandeja" etiqueta={t.esperan.largo} urgente testId="cuantos-para-revisar">{r.cambios === 1 ? "1 cambio" : `${r.cambios} cambios`}</Resumen>
      <Resumen icono="recibo" etiqueta={r.ventas ? `En ${r.ventas === 1 ? "1 venta" : `${r.ventas} ventas`} sin registrar` : t.ningunaVenta.largo}><Pesos valor={r.plata} /></Resumen>
      <Resumen icono="persona-fuera" etiqueta={t.personas.largo}>{r.personas}</Resumen>
      <Resumen icono="reloj-de-arena" etiqueta={t.masViejo.largo}>{r.masViejo ? haceCuanto(r.masViejo) : "—"}</Resumen>
    </div>
  );
}
