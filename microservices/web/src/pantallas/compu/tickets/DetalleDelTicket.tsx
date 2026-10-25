import { useState } from "react";
import { comoSeResolvio, cuantoHaceQueEstaAbierto, fueEnviado, quienYCuando, useResolverTicket, type Pendiente, type Ticket } from "../../../negocio/tickets";
import { FotoGrande, Miniatura } from "../../comun/tickets/Fotos";
import { TEXTOS } from "../../textos";
import { Hoja } from "../base/ui";
import { Icono } from "../../../ui/iconos";
import css from "./Tickets.module.css";

const t = TEXTOS.ticketsV2;
type Props = { ticket: Ticket | Pendiente; alCerrar: () => void; alCambiar: () => Promise<void> };

// El ticket abierto: el texto entero, quién, cuándo y dónde, las fotos y, si se mandó, marcarlo
// resuelto con una nota o reabrirlo.
export function DetalleDelTicket({ ticket: x, alCerrar, alCambiar }: Props) {
  const r = useResolverTicket(x.id, alCambiar);
  const [grande, setGrande] = useState<string | Blob | null>(null);
  return (
    <Hoja ancha testId="ticket-abierto" alCerrar={alCerrar} titulo={x.descripcion}
      foto={<span className={`${css.tipo} grande ${x.tipo}`}><Icono nombre={x.tipo === "error" ? "bicho" : "lamparita"} tam={24} /></span>}
      bajoTitulo={<span className="mv-detalle">{quienYCuando(x, t.porEnviar.largo, { version: true })}</span>}
      pie={<Pie x={x} r={r} />}>
      <div className={`mv2 ${css.detalle}`}>
        {x.fotos.length > 0 && <ul className={`${css.minis} grandes`}>{x.fotos.map((f, i) => <li key={i}><button type="button" className={css.mini} aria-label={`Ver la foto ${i + 1} en grande`} onClick={() => setGrande(f)}><Miniatura origen={f} /></button></li>)}</ul>}
        {fueEnviado(x) && x.estado === "abierto" && <p className="mv-detalle">{cuantoHaceQueEstaAbierto(x, t.abiertoHoy.largo, t.abiertoHace.largo)}</p>}
        {r.error && <p className="mv-aviso error" role="alert">{r.error}</p>}
      </div>
      {grande && <FotoGrande origen={grande} alCerrar={() => setGrande(null)} />}
    </Hoja>
  );
}

// Por enviar, que todavía no salió; resuelto, quién y «Reabrir»; abierto, la nota y «Marcar resuelto».
function Pie({ x, r }: { x: Ticket | Pendiente; r: ReturnType<typeof useResolverTicket> }) {
  if (!fueEnviado(x)) return <div className={`mv-aviso urgente ${css.pieAviso}`}><Icono nombre="nube-subir" tam={16} /><span>{t.todaviaNoSalio.largo}</span></div>;
  if (x.estado === "resuelto") return <><div className={`mv-aviso logro ${css.pieAviso}`}><Icono nombre="tilde-circulo" tam={16} /><span><b>{x.resuelto_por ?? "Alguien"} lo resolvió</b>{comoSeResolvio(x)[0]}{comoSeResolvio(x)[1]}</span></div><button type="button" className="mv-btn" onClick={() => void r.pedir("reabrir")} data-testid="reabrir"><Icono nombre="repetir" tam={16} />{t.reabrir.largo}</button></>;
  return (
    <form className={css.resolver} onSubmit={(e) => { e.preventDefault(); void r.pedir("resolver"); }}>
      <input value={r.nota} onChange={(e) => r.setNota(e.target.value)} maxLength={2000} placeholder={t.notaParaQuienAviso.largo} aria-label={t.notaParaQuienAviso.largo} data-testid="nota" />
      <button type="submit" className="mv-btn accion" data-testid="confirmar-resuelto"><Icono nombre="tilde" tam={16} />{t.marcarResuelto.largo}</button>
    </form>
  );
}
