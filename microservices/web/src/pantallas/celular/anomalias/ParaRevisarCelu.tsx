import { useState, type ReactNode } from "react";
import { elQueSigue, iniciales, porPersona, useParaRevisar, type DeUnaPersona } from "../../../negocio/apartados";
import { useEnLinea } from "../../../plataforma/sin-conexion";
import { TEXTOS } from "../../textos";
import { Icono } from "../../../ui/iconos";
import { TarjetaDelCambio } from "./TarjetaDelCambio";
import "../../anomalias.css";
import "../../mas-v2.css";
import css from "./Anomalias.module.css";

// Más → Anomalías en el celular, como la v2 del director de arte (variante 1, «Tarjetas que se
// abren»; specs/014 y 005, decisión 148). «Para revisar»: por persona, una tarjeta por cambio que se
// abre de a una, con los productos, las dos horas y «Descartar» o «Aceptar» bajo el pulgar (014-E09).
// `cabeza` es el título y las pestañas.
const t = TEXTOS.anomaliasV2;

export function ParaRevisarCelu({ cabeza }: { cabeza: ReactNode }) {
  const { datos, error, recargar } = useParaRevisar();
  const conRed = useEnLinea();
  // null: el primero abierto; "": ninguno.
  const [abiertoId, setAbiertoId] = useState<string | null>(null);
  const grupos = datos ? porPersona(datos.apartados) : [];
  const orden = grupos.flatMap((g) => g.cambios);
  const abierto = abiertoId === "" ? null : orden.find((c) => c.id === abiertoId) ?? orden[0] ?? null;
  return (
    <main id="contenido" className="mv2 anvc" data-testid="para-revisar" tabIndex={-1}>
      {cabeza}
      <Avisos conRed={conRed} error={error} cargando={!datos && !error} recargar={recargar} />
      {datos && <ArribaDeLaBandeja hay={orden.length > 0} />}
      {grupos.map((g, i) => (
        <Persona key={g.usuario_id} g={g} otra={i > 0}>
          {g.cambios.map((c) => <TarjetaDelCambio key={c.id} cambio={c} abierta={c.id === abierto?.id} conRed={conRed} alTocar={() => setAbiertoId(c.id === abierto?.id ? "" : c.id)} alDecidir={() => setAbiertoId(elQueSigue(orden, c) ?? "")} />)}
        </Persona>
      ))}
    </main>
  );
}

// Sin nada, «Nada para revisar»; con algo, que nada cuenta hasta aceptarlo.
function ArribaDeLaBandeja({ hay }: { hay: boolean }) {
  if (hay) return <p className={css.linea}><Icono nombre="info" tam={16} /><span>{t.nadaCuenta.corto}</span></p>;
  return <div className="mv-vacio" data-testid="nada-para-revisar"><span className="tilde"><Icono nombre="tilde" tam={32} /></span><b>{t.nadaParaRevisar.corto}</b><span>{t.nadaParaRevisarDetalle.corto}</span></div>;
}

function Avisos({ conRed, error, cargando, recargar }: { conRed: boolean; error: unknown; cargando: boolean; recargar: () => void }) {
  return (
    <>
      {!conRed && <div className="mv-aviso urgente" role="status"><Icono nombre="alerta" tam={16} /><div>{t.sinConexionDecidir.corto}</div></div>}
      {Boolean(error) && <div className="mv-aviso error" role="alert"><Icono nombre="alerta" tam={16} /><div>{conRed ? (error as Error).message : t.sinConexionVer.corto} <button type="button" className="mv-btn chico" onClick={recargar}>{t.reintentar.corto}</button></div></div>}
      {cargando && <p className="mv-cargando" aria-busy="true">{t.buscando.corto}</p>}
    </>
  );
}

function Persona({ g, otra, children }: { g: DeUnaPersona; otra: boolean; children: ReactNode }) {
  return (
    <section className={`${css.grupo} ${otra ? "otro" : ""}`} aria-label={g.usuario}>
      <div className={css.persona}><span className="mv-avatar">{iniciales(g.usuario)}</span><div><div className="nm">{g.usuario}</div>{g.dispositivo && <div className="mv-detalle">{g.dispositivo}</div>}</div><span className="mv-pastilla error">{t.sinAcceso.corto}</span></div>
      {children}
    </section>
  );
}
