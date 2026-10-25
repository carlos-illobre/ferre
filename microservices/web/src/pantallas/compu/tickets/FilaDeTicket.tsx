import { DIAS_DE_ESPERA, diasEsperando, fueEnviado, quienYCuando, type Pendiente, type Ticket } from "../../../negocio/tickets";
import { Miniatura } from "../../comun/tickets/Fotos";
import { TEXTOS } from "../../textos";
import { Icono } from "../../../ui/iconos";
import css from "./Tickets.module.css";

const t = TEXTOS.ticketsV2;

// Un ticket en la lista: su tipo, el texto, quién y cuándo, dos fotos (y «+N»), los días que espera.
export function FilaDeTicket({ ticket: x, alAbrir }: { ticket: Ticket | Pendiente; alAbrir: () => void }) {
  const enviado = fueEnviado(x);
  return (
    <button type="button" className={`${css.tk} ${enviado ? "" : "porenviar"}`} onClick={alAbrir} data-testid="ticket">
      <span className={`${css.tipo} ${x.tipo}`}><Icono nombre={x.tipo === "error" ? "bicho" : "lamparita"} /></span>
      {/* El tipo se ve en el ícono; quien no ve la pantalla lo oye. */}
      <span className="solo-lectores">{x.tipo === "error" ? "Error" : "Mejora"}. </span>
      <span className="tx"><span className="texto">{x.descripcion}</span>
        <span className={`quien ${enviado ? "" : "urgente"}`}>{quienYCuando(x, t.porEnviar.largo)}</span></span>
      <Lado x={x} />
      <Icono nombre="derecha" tam={16} className="chev" />
    </button>
  );
}

function Lado({ x }: { x: Ticket | Pendiente }) {
  const dias = diasEsperando(x);
  const enviado = fueEnviado(x);
  return (
    <span className="lado">
      {x.fotos.length > 0 && <span className={css.apilado}>{x.fotos.slice(0, 2).map((f, i) => <span key={i} className={`${css.mini} chica`}><Miniatura origen={f} /></span>)}{x.fotos.length > 2 && <span className={`${css.mini} chica mas`}>+{x.fotos.length - 2}</span>}</span>}
      {dias >= DIAS_DE_ESPERA && <span className="mv-pastilla urgente"><Icono nombre="reloj-de-arena" tam={16} />{dias} días</span>}
      {enviado && x.estado === "resuelto" && <span className="mv-pastilla logro">{t.resuelto.largo}</span>}
      {!enviado && <Icono nombre="nube-subir" />}
    </span>
  );
}
