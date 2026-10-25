import { useState, type ReactNode } from "react";
import { cuantasVeces, errorDeAnomalias, laSemana, useAnomalias, type LaSemana, type PaginaDeAnomalias } from "../../../negocio/anomalias";
import { nombreDeProducto } from "../../../negocio/formato";
import { TEXTOS } from "../../textos";
import { Hoja } from "../componentes/base";
import { Icono } from "../../../ui/iconos";
import { EntradasDelRegistro, FotoDeProducto, PaginasDelRegistro } from "../../comun/anomalias/piezas";
import "../../anomalias.css";
import "../../mas-v2.css";
import css from "./Anomalias.module.css";

// «Anotadas» en el celular, como la v2: lo de esta semana por producto y el registro entero en una
// hoja. `cabeza` es el título y las pestañas.
const t = TEXTOS.anomaliasV2;

export function AnotadasCelu({ cabeza }: { cabeza: ReactNode }) {
  const primera = useAnomalias(1);
  const [registro, setRegistro] = useState(false);
  const semana = laSemana(primera.datos);
  return (
    <main id="contenido" className="mv2 anvc" data-testid="anomalias" tabIndex={-1}>
      {cabeza}
      <Avisos error={primera.error} cargando={!primera.datos && !primera.error} recargar={primera.recargar} />
      {primera.datos && <EstaSemana semana={semana} />}
      {primera.datos && primera.datos.anomalias.length === 0 && <p className={`mv-detalle ${css.sin}`}>{t.ningunaAnotada.corto}</p>}
      <PorProducto semana={semana} />
      {primera.datos && <button type="button" className={css.registro} onClick={() => setRegistro(true)} data-testid="ver-registro"><Icono nombre="candado" /><span>{t.noSeEdita.corto}</span><Icono nombre="derecha" tam={16} className="ch" /></button>}
      {registro && <Registro alCerrar={() => setRegistro(false)} />}
    </main>
  );
}

function Avisos({ error, cargando, recargar }: { error: unknown; cargando: boolean; recargar: () => void }) {
  return (
    <>
      {Boolean(error) && <div className="mv-aviso error" role="alert"><Icono nombre="alerta" tam={16} /><div>{errorDeAnomalias(error, t.sinConexionAnotadas.corto)} <button type="button" className="mv-btn chico" onClick={recargar}>{t.reintentar.corto}</button></div></div>}
      {cargando && <p className="mv-cargando" aria-busy="true">{t.buscandoAnotadas.corto}</p>}
    </>
  );
}

function PorProducto({ semana }: { semana: LaSemana | null }) {
  return semana?.productos.map((p) => (
    <div key={p.producto_id} className={css.prod} data-testid="producto-con-anomalias">
      <FotoDeProducto foto={p.foto_url} tam={18} />
      <span className="tx"><span className="n">{nombreDeProducto(p.producto)}</span><span className="mv-detalle">{cuantasVeces(p.veces)}</span></span>
      <b>−{p.falto}</b>
    </div>
  ));
}

function EstaSemana({ semana }: { semana: LaSemana | null }) {
  const cuantas = semana ? `${semana.cuantas} esta semana` : "— esta semana";
  const falto = semana && semana.cuantas > 0 ? ` · faltaron ${semana.falto.replace(" + ", " y ")}` : "";
  return <p className={css.linea} data-testid="anomalias-de-la-semana"><Icono nombre="alerta" tam={16} /><span><b>{cuantas}</b>{falto}</span></p>;
}

// El registro entero, de la más nueva a la más vieja, de a una página.
function Registro({ alCerrar }: { alCerrar: () => void }) {
  const [pagina, setPagina] = useState(1);
  const { datos, error } = useAnomalias(pagina);
  return (
    <Hoja titulo={t.registro.corto} alCerrar={alCerrar} testId="hoja-registro" clase={`mv2 ${css.hoja}`}>
      <div className="mv-aviso pino"><Icono nombre="candado" tam={16} /><div>{t.noSeEditaDetalle.corto}</div></div>
      {error && <p className="mv-aviso error" role="alert">{errorDeAnomalias(error, t.sinConexionAnotadas.corto)}</p>}
      {datos && <PaginaDelRegistro datos={datos} pagina={pagina} alCambiar={setPagina} />}
    </Hoja>
  );
}

function PaginaDelRegistro({ datos, pagina, alCambiar }: { datos: PaginaDeAnomalias; pagina: number; alCambiar: (p: number) => void }) {
  return (
    <>
      {datos.anomalias.length === 0 && <p className="mv-detalle">{pagina === 1 ? t.ningunaAnotada.corto : t.noHayMas.corto}</p>}
      <EntradasDelRegistro anomalias={datos.anomalias} clase={css.entradas} sinUsuario={t.sinUsuario.corto} />
      {(pagina > 1 || datos.hay_mas) && <PaginasDelRegistro clase={css.paginas} pagina={pagina} hayMas={datos.hay_mas} textos={[t.masNuevas.corto, t.pagina.corto, t.masViejas.corto]} alCambiar={alCambiar} />}
    </>
  );
}
