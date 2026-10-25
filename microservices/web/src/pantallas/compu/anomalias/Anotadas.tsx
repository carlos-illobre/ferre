import { useState } from "react";
import { cuantasAnomalias, cuantasVeces, errorDeAnomalias, laSemana, ultimaVez, useAnomalias, type LaSemana, type PaginaDeAnomalias } from "../../../negocio/anomalias";
import { nombreDeProducto } from "../../../negocio/formato";
import { NOMBRES, TEXTOS } from "../../textos";
import { Icono, type NombreDeIcono } from "../../../ui/iconos";
import { EntradasDelRegistro, FotoDeProducto, PaginasDelRegistro } from "../../comun/anomalias/piezas";
import { VerEnQuienHizoQue } from "./VerEnQuienHizoQue";
import "../../anomalias.css";
import "../../mas-v2.css";
import css from "./Anomalias.module.css";

// «Anotadas», en la computadora como la v2: lo de esta semana por producto, para saber qué ir a
// contar, y el registro, que no se edita ni se borra.
const t = TEXTOS.anomaliasV2;

export function Anotadas({ titulo = true }: { titulo?: boolean }) {
  const primera = useAnomalias(1);
  const semana = laSemana(primera.datos);
  return (
    <main id="contenido" className={`pagina mv2 anv ${css.anotadas}`} data-testid="anomalias" tabIndex={-1}>
      <h1 className={titulo ? css.titulo : css.oculto}>{NOMBRES.anomalias}</h1>
      <VerEnQuienHizoQue />
      <Resumenes semana={semana} />
      <div className={`${css.cols} anotadas`}>
        <div className={css.lista}>
          <h2 className={`mv-seccion ${css.sub}`}>{t.queHayQueContar.largo}</h2>
          {semana && semana.productos.length === 0 && <p className="mv-detalle">{t.nadaEstaSemana.largo}</p>}
          {!semana && primera.datos && <p className="mv-detalle">—</p>}
          <PorProducto semana={semana} />
        </div>
        <Registro />
      </div>
    </main>
  );
}

function Resumen({ icono, etiqueta, urgente, testId, children }: { icono: NombreDeIcono; etiqueta: string; urgente?: boolean; testId?: string; children: React.ReactNode }) {
  return <div className={urgente ? "mv-resumen urgente" : "mv-resumen"}><span className="ico"><Icono nombre={icono} /></span><div><div className="et">{etiqueta}</div><div className="va" data-testid={testId}>{children}</div>{icono === "lista-tildada" && <div className="mv-barra"><b style={{ width: 0 }} /></div>}</div></div>;
}

function Resumenes({ semana }: { semana: LaSemana | null }) {
  return (
    <div className={css.resumenes}>
      <Resumen icono="alerta" etiqueta={t.estaSemana.largo} testId="anomalias-de-la-semana">{semana ? cuantasAnomalias(semana.cuantas) : "—"}</Resumen>
      <Resumen icono="paquete" etiqueta={t.faltaron.largo}>{semana?.falto || "—"}</Resumen>
      <Resumen icono="lista-tildada" etiqueta={t.contadosDespues.largo}>—</Resumen>
      <Resumen icono="repetir" etiqueta={t.laQueMas.largo} urgente>{semana?.laQueMas ? nombreDeProducto(semana.laQueMas) : "—"}</Resumen>
    </div>
  );
}

function PorProducto({ semana }: { semana: LaSemana | null }) {
  return semana?.productos.map((p) => (
    <div key={p.producto_id} className={css.renglon} data-testid="producto-con-anomalias">
      <FotoDeProducto foto={p.foto_url} tam={20} />
      <span><span className="t">{nombreDeProducto(p.producto)}</span><span className="d">{cuantasVeces(p.veces)} · {ultimaVez(p.ultima)}</span></span>
      <span className="mv-dato error"><span className="et">{p.uno ? t.falto.largo : t.faltaron.largo}</span><span className="va">{p.falto}</span></span>
      <span className={css.contar} />
    </div>
  ));
}

// A la derecha, el registro: de la más nueva a la más vieja, de a una página.
function Registro() {
  const [pagina, setPagina] = useState(1);
  const { datos, error, recargar } = useAnomalias(pagina);
  return (
    <aside className={`mv-tarjeta ${css.registro}`} aria-label={t.registro.largo}>
      <div className="cab"><Icono nombre="candado" /><b>{t.registro.largo}</b><span className="mv-pastilla contorno">{t.noSeEdita.largo}</span></div>
      {error && <div className="mv-aviso error" role="alert"><span>{errorDeAnomalias(error, t.sinConexionAnotadas.largo)}</span><button type="button" className="mv-btn chico" onClick={recargar}>{t.reintentar.largo}</button></div>}
      {!datos && !error && <p className="mv-cargando" aria-busy="true">{t.buscandoAnotadas.largo}</p>}
      {datos && <PaginaDelRegistro datos={datos} pagina={pagina} alCambiar={setPagina} />}
    </aside>
  );
}

function PaginaDelRegistro({ datos, pagina, alCambiar }: { datos: PaginaDeAnomalias; pagina: number; alCambiar: (p: number) => void }) {
  return (
    <>
      {datos.anomalias.length === 0 ? <p className={`mv-detalle ${css.sin}`}>{pagina === 1 ? t.ningunaAnotada.largo : t.noHayMas.largo}</p>
        : <EntradasDelRegistro anomalias={datos.anomalias} clase={css.entradas} sinUsuario={t.sinUsuario.largo} />}
      {(pagina > 1 || datos.hay_mas) && <PaginasDelRegistro clase={css.paginas} pagina={pagina} hayMas={datos.hay_mas} textos={[t.masNuevas.largo, t.pagina.largo, t.masViejas.largo]} alCambiar={alCambiar} />}
    </>
  );
}
