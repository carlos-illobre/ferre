import { useState } from "react";
import { comoSeResolvio, fueEnviado, quienYCuando, useResolverTicket, type Pendiente, type Ticket } from "../../../negocio/tickets";
import { FotoGrande, Miniatura } from "../../comun/tickets/Fotos";
import { TEXTOS } from "../../textos";
import { Hoja } from "../componentes/base";
import { Icono } from "../../../ui/iconos";
import css from "./Tickets.module.css";

const t = TEXTOS.ticketsV2;
type Props = { ticket: Ticket | Pendiente; alCerrar: () => void; alCambiar: () => Promise<void> };

// La hoja del ticket: el texto, quién y cuándo, las fotos y marcarlo resuelto o reabrirlo.
export function DetalleDelTicketCelu({ ticket: x, alCerrar, alCambiar }: Props) {
  const r = useResolverTicket(x.id, alCambiar);
  const [grande, setGrande] = useState<string | Blob | null>(null);
  return (
    <Hoja titulo={x.tipo === "error" ? t.encontreUnError.corto : t.tengoUnaIdea.corto} alCerrar={alCerrar} testId="ticket-abierto" clase={`mv2 ${css.hoja}`}>
      <div className={css.detCab}><span className={`tkv-tipo ${x.tipo}`}><Icono nombre={x.tipo === "error" ? "bicho" : "lamparita"} /></span>
        <div><p className="texto">{x.descripcion}</p><p className="mv-detalle">{quienYCuando(x, t.porEnviar.corto)}</p></div></div>
      {x.fotos.length > 0 && <div className={css.tira}>{x.fotos.map((f, i) => <button key={i} type="button" className={`${css.mini} grande`} aria-label={`Ver la foto ${i + 1} en grande`} onClick={() => setGrande(f)}><Miniatura origen={f} /></button>)}</div>}
      {r.error && <p className="mv-aviso error" role="alert">{r.error}</p>}
      <Pie x={x} r={r} />
      {grande && <FotoGrande origen={grande} alCerrar={() => setGrande(null)} />}
    </Hoja>
  );
}

function Pie({ x, r }: { x: Ticket | Pendiente; r: ReturnType<typeof useResolverTicket> }) {
  if (!fueEnviado(x)) return <div className="mv-aviso urgente"><Icono nombre="nube-subir" tam={16} /><span>{t.todaviaNoSalio.corto}</span></div>;
  if (x.estado === "resuelto") return <>
    <div className="mv-aviso logro"><Icono nombre="tilde-circulo" tam={16} /><span><b>{x.resuelto_por ?? "Alguien"} lo resolvió</b>{comoSeResolvio(x)[0]}{comoSeResolvio(x)[1]}</span></div>
    <button type="button" className={`mv-btn grande ${css.ancho}`} onClick={() => void r.pedir("reabrir")} data-testid="reabrir"><Icono nombre="repetir" />{t.reabrir.corto}</button>
  </>;
  return (
    <form className={css.resolver} onSubmit={(e) => { e.preventDefault(); void r.pedir("resolver"); }}>
      <input value={r.nota} onChange={(e) => r.setNota(e.target.value)} maxLength={2000} placeholder={t.notaParaQuienAviso.corto} aria-label={t.notaParaQuienAviso.corto} data-testid="nota" />
      <button type="submit" className={`mv-btn accion grande ${css.ancho}`} data-testid="confirmar-resuelto"><Icono nombre="tilde" />{t.marcarResuelto.largo}</button>
    </form>
  );
}
