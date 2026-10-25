import { useState } from "react";
import { resumenDeTickets, sinTicketsQueVer, type Pendiente, type Ticket, type useTickets } from "../../../negocio/tickets";
import { TEXTOS } from "../../textos";
import { Icono } from "../../../ui/iconos";
import { FilaDeTicket } from "./FilaDeTicket";
import css from "./Tickets.module.css";

const t = TEXTOS.ticketsV2;
type Filtro = "todos" | "mejora" | "error";
type Viendo = "abierto" | "resuelto";
type Seguidos = ReturnType<typeof useTickets>;

// A la derecha se sigue: los números, abiertos o resueltos, idea o error, y la lista.
export function SeguirTickets({ seguidos: s, alAbrir }: { seguidos: Seguidos; alAbrir: (x: Ticket | Pendiente) => void }) {
  const [viendo, setViendo] = useState<Viendo>("abierto");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const lista = s.tickets ?? [];
  const delEstado = lista.filter((x) => x.estado === viendo);
  const visibles = delEstado.filter((x) => filtro === "todos" || x.tipo === filtro);
  return (
    <section className={css.seguir} aria-label="Tickets">
      <Resumenes tickets={s.tickets} />
      <div className={css.filtros}>
        <Segmentos tickets={s.tickets} viendo={viendo} alVer={setViendo} />
        <span className={css.esp} />
        <Chips delEstado={delEstado} filtro={filtro} alFiltrar={setFiltro} />
      </div>
      <div className={css.lista}>
        {s.pendientes.map((p) => <FilaDeTicket key={p.id} ticket={p} alAbrir={() => alAbrir(p)} />)}
        {s.error && <p className="mv-aviso error" role="alert">{s.error} <button type="button" className="mv-btn chico" onClick={() => void s.cargar()}>{t.reintentar.largo}</button></p>}
        {!s.tickets && !s.error && <p className="mv-cargando" aria-busy="true">Buscando los tickets…</p>}
        {s.tickets && visibles.length === 0 && <p className={css.vacio}>{sinTicketsQueVer(viendo, lista.length > 0, "acá al lado")}</p>}
        {visibles.length > 0 && <div data-testid="lista-de-tickets">{visibles.map((x) => <FilaDeTicket key={x.id} ticket={x} alAbrir={() => alAbrir(x)} />)}</div>}
      </div>
    </section>
  );
}

function Resumenes({ tickets }: { tickets: Ticket[] | null }) {
  const r = resumenDeTickets(tickets ?? []);
  const maxBarra = Math.max(1, ...r.semanas.flatMap((x) => [x.creados, x.resueltos]));
  const o = (n: number) => (tickets ? n : "—");
  return (
    <div className={css.resumenes}>
      <div className="mv-resumen"><span className="ico"><Icono nombre="bandeja" /></span><div><div className="et">{t.abiertos.largo}</div><div className="va">{o(r.abiertos)}</div></div>
        <div className={css.barras} title={t.creadosYResueltos.largo} aria-hidden="true">{r.semanas.map((x, i) => <span key={i}><b style={{ height: `${(x.creados / maxBarra) * 100}%` }} /><b className="r" style={{ height: `${(x.resueltos / maxBarra) * 100}%` }} /></span>)}</div>
      </div>
      <div className="mv-resumen urgente"><span className="ico"><Icono nombre="reloj-de-arena" /></span><div><div className="et">{t.esperan.largo}</div><div className="va">{o(r.esperan)}</div></div></div>
      <div className="mv-resumen logro"><span className="ico"><Icono nombre="tilde-circulo" /></span><div><div className="et">{t.resueltosEn.largo} {r.mes}</div><div className="va">{o(r.resueltosDelMes)}</div></div></div>
    </div>
  );
}

function Segmentos({ tickets, viendo, alVer }: { tickets: Ticket[] | null; viendo: Viendo; alVer: (v: Viendo) => void }) {
  const abiertos = (tickets ?? []).filter((x) => x.estado === "abierto").length;
  const cuenta = (n: number) => (tickets ? ` ${n}` : "");
  return (
    <div className={css.segmentos} role="group" aria-label="Cuáles ver">
      <button type="button" aria-pressed={viendo === "abierto"} className={viendo === "abierto" ? "elegido" : ""} onClick={() => alVer("abierto")}>{t.abiertos.largo}{cuenta(abiertos)}</button>
      <button type="button" aria-pressed={viendo === "resuelto"} className={viendo === "resuelto" ? "elegido" : ""} onClick={() => alVer("resuelto")}>{t.resueltos.largo}{cuenta((tickets ?? []).length - abiertos)}</button>
    </div>
  );
}

function Chips({ delEstado, filtro, alFiltrar }: { delEstado: Ticket[]; filtro: Filtro; alFiltrar: (f: Filtro) => void }) {
  const chip = (f: Filtro) => ({ type: "button" as const, className: filtro === f ? "elegido" : "", "aria-pressed": filtro === f, onClick: () => alFiltrar(f) });
  const cuantos = (tipo: Ticket["tipo"]) => delEstado.filter((x) => x.tipo === tipo).length;
  return (
    <div className={css.chips} role="group" aria-label="Ideas o errores">
      <button {...chip("todos")}>{t.todos.largo}</button>
      <button {...chip("mejora")}><Icono nombre="lamparita" tam={16} />{t.ideas.largo} {cuantos("mejora")}</button>
      <button {...chip("error")}><Icono nombre="bicho" tam={16} />{t.errores.largo} {cuantos("error")}</button>
    </div>
  );
}
