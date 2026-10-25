import { useEffect, useRef, useState } from "react";
import { useTicketNuevo, useTickets, type Pendiente, type Ticket } from "../../../negocio/tickets";
import { describirDispositivo } from "../../../plataforma/dispositivo";
import { TEXTOS } from "../../textos";
import { VERSION } from "../../../plataforma/ambiente";
import { Icono } from "../../../ui/iconos";
import { DetalleDelTicket } from "./DetalleDelTicket";
import { EscribirTicket } from "./EscribirTicket";
import { SeguirTickets } from "./SeguirTickets";
import { useComandos } from "../../../plataforma/comandos";
import "../../mas-v2.css";
import css from "./Tickets.module.css";

// Mejoras y errores (RF-80) en la computadora, como la v2 del director de arte (variante 1, «El
// buzón»; specs/008, decisión 148). A la izquierda se escribe: idea o error (la idea elegida al
// abrir), el texto, las fotos o capturas (Ctrl V pega, Alt F elige archivos, o con el celular) y lo
// que va solo; Ctrl Enter envía. A la derecha se sigue: los números, abiertos o resueltos, idea o
// error, y cada ticket, que se abre para verlo entero, marcarlo resuelto o reabrirlo.
const t = TEXTOS.ticketsV2;

export function Tickets() {
  const seguidos = useTickets();
  const nuevo = useTicketNuevo(describirDispositivo, VERSION);
  const [abierto, setAbierto] = useState<Ticket | Pendiente | null>(null);
  const [pidiendo, setPidiendo] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);
  // Al abrir, el cursor ya está en la caja de texto: así se nota que ahí se escribe.
  const caja = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { caja.current?.focus({ preventScroll: true }); }, []);
  // Enviar y elegir archivos, salvo con un ticket abierto o pidiéndole la foto al celular.
  const libre = !abierto && !pidiendo;
  useComandos({ "tickets.enviar": () => void nuevo.enviar(), "tickets.archivos": () => archivo.current?.click() }, { activo: libre });

  return (
    <main id="contenido" className="pagina mv2 tkv" data-testid="tickets" tabIndex={-1}>
      <header className={css.cabeza}>
        <div><div className={css.migas}>{t.mas.largo} <Icono nombre="derecha" tam={16} /></div><h1>{t.titulo.largo}</h1></div>
        <span className="mv-detalle">{t.loVenTodos.largo}</span>
      </header>
      <div className={css.cols}>
        <EscribirTicket nuevo={nuevo} caja={caja} archivo={archivo} pidiendo={pidiendo} alPedir={setPidiendo} />
        <SeguirTickets seguidos={seguidos} alAbrir={setAbierto} />
      </div>
      {abierto && <DetalleDelTicket ticket={abierto} alCerrar={() => setAbierto(null)} alCambiar={async () => { await seguidos.cargar(); setAbierto(null); }} />}
    </main>
  );
}
