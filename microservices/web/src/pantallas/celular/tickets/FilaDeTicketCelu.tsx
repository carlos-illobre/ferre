import { cuandoCorto } from "../../../negocio/apartados";
import { DIAS_DE_ESPERA, diasEsperando, fueEnviado, type Pendiente, type Ticket } from "../../../negocio/tickets";
import { Miniatura } from "../../comun/tickets/Fotos";
import { TEXTOS } from "../../textos";
import { Icono } from "../../../ui/iconos";
import css from "./Tickets.module.css";

const t = TEXTOS.ticketsV2;

// Un ticket en la lista: su tipo, el texto, quién y cuándo y, a la derecha, la nube si no salió,
// los días si espera o la primera foto.
export function FilaDeTicketCelu({ ticket: x, alAbrir }: { ticket: Ticket | Pendiente; alAbrir: () => void }) {
  const enviado = fueEnviado(x);
  return (
    <button type="button" className={`${css.tk} ${enviado ? "" : "porenviar"}`} onClick={alAbrir} data-testid="ticket">
      <span className={`tkv-tipo ${x.tipo}`}><Icono nombre={x.tipo === "error" ? "bicho" : "lamparita"} /></span>
      {/* El tipo se ve en el ícono; quien no ve la pantalla lo oye. */}
      <span className="solo-lectores">{x.tipo === "error" ? "Error" : "Mejora"}. </span>
      <span className="tx"><span className="texto">{x.descripcion}</span>
        <span className={`quien ${enviado ? "" : "urgente"}`}>{enviado ? [x.usuario, cuandoCorto(x.creado_en)].join(" · ") : t.porEnviar.corto}</span></span>
      <Lado x={x} />
    </button>
  );
}

function Lado({ x }: { x: Ticket | Pendiente }) {
  const dias = diasEsperando(x);
  if (!fueEnviado(x)) return <Icono nombre="nube-subir" className="nube" />;
  if (dias >= DIAS_DE_ESPERA) return <span className="mv-pastilla urgente">{dias} días</span>;
  return x.fotos.length > 0 ? <span className={`${css.mini} chica`}><Miniatura origen={x.fotos[0]!} /></span> : <span />;
}
