import { useState } from "react";
import { useActividad, paginasDe, type Evento } from "../../negocio/actividad";
import { useUsuarios } from "../../negocio/usuarios";
import { IconoN, Iniciales } from "../iconos-de-negocio";
import { TIPOS, aplanar, detalleDe, diasDelPeriodo, horaDe, inicioDelDia, queFue, type Periodo } from "../actividad-en-palabras";
import { Hoja } from "./componentes/base";
import "./actividad.css";

const PERIODOS: { valor: Periodo; nombre: string }[] = [{ valor: "hoy", nombre: "Hoy" }, { valor: "ayer", nombre: "Ayer" }, { valor: "semana", nombre: "Esta semana" }, { valor: "rango", nombre: "Desde… hasta" }];
const primerNombre = (n: string | null) => (n ? n.split(/\s+/)[0]! : "El sistema");
const fechaCompleta = (iso: string) => new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

// Quién hizo qué en el celular, como la v2 («Registro», decisión 148): tres números arriba, los
// filtros en pastillas (período, quién y tipo), una tarjeta por acción y, abajo, «Nuevas» y
// «Anteriores». Al tocar una acción sube la hoja con todo. Es de solo lectura.
export function Actividad() {
  const [periodo, setPeriodo] = useState<Periodo>("hoy");
  const [desdeDia, setDesdeDia] = useState("");
  const [hastaDia, setHastaDia] = useState("");
  const [usuario, setUsuario] = useState("");
  const [tipo, setTipo] = useState("");
  const [pagina, setPagina] = useState(1);
  const [abierto, setAbierto] = useState<Evento | null>(null);
  const dias = diasDelPeriodo({ periodo, desde: desdeDia, hasta: hastaDia });
  const desde = dias.desde ? inicioDelDia(dias.desde) : undefined;
  const hasta = dias.hasta ? inicioDelDia(dias.hasta, 1) : undefined;
  const filtro = { usuario: usuario || undefined, desde, hasta };
  const { datos, error } = useActividad({ pagina, ...filtro, tipo: tipo || undefined });
  const todas = useActividad({ pagina: 1, ...filtro }).datos?.total;
  const anuladas = useActividad({ pagina: 1, ...filtro, tipo: "venta.anulada" }).datos?.total;
  const usuarios = useUsuarios().datos ?? [];
  const paginas = paginasDe(datos);
  const cambiar = (f: () => void) => { f(); setPagina(1); };
  const nombrePeriodo = periodo === "rango" ? (desdeDia || hastaDia ? "En esos días" : "Todo") : PERIODOS.find((p) => p.valor === periodo)!.nombre;
  const desdeN = datos && datos.total ? (datos.pagina - 1) * datos.por_pagina + 1 : 0;
  const hastaN = datos ? Math.min(datos.total, datos.pagina * datos.por_pagina) : 0;
  return (
    <div data-testid="auditoria" className="ac2">
      <div className="ac2-res">
        <div className="ac2-num"><span>{nombrePeriodo}</span><b>{todas ?? "—"}</b></div>
        <button type="button" className={`ac2-num rojo ${tipo === "venta.anulada" ? "puesto" : ""}`} aria-pressed={tipo === "venta.anulada"} onClick={() => cambiar(() => setTipo(tipo === "venta.anulada" ? "" : "venta.anulada"))}><span>Anuladas</span><b>{anuladas ?? "—"}</b></button>
        <div className="ac2-num ambar" title="Todavía no se sabe qué hay para revisar"><span>A revisar</span><b>—</b></div>
      </div>
      <div className="ac2-filtros">
        <label className="ac2-chip oscuro"><IconoN nombre="calendar" tam={18} /><span>{nombrePeriodo === "Todo" ? "Todo" : PERIODOS.find((p) => p.valor === periodo)!.nombre}</span><IconoN nombre="chevron-down" tam={16} />
          <select aria-label="Período" value={periodo} onChange={(e) => cambiar(() => setPeriodo(e.target.value as Periodo))} data-testid="filtro-periodo">{PERIODOS.map((p) => <option key={p.valor} value={p.valor}>{p.nombre}</option>)}</select>
        </label>
        <label className={`ac2-chip ${usuario ? "puesto" : ""}`}><IconoN nombre="users" tam={18} /><span>{usuario ? primerNombre(usuarios.find((u) => u.id === usuario)?.nombre ?? null) : "Todos"}</span><IconoN nombre="chevron-down" tam={16} />
          <select aria-label="Quién" value={usuario} onChange={(e) => cambiar(() => setUsuario(e.target.value))} data-testid="filtro-usuario"><option value="">Todos</option>{usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre}{u.activo ? "" : " (desactivado)"}</option>)}</select>
        </label>
        <label className={`ac2-chip ${tipo ? "puesto" : ""}`}><IconoN nombre="list-filter" tam={18} /><span>{tipo ? TIPOS.find((t) => t.valor === tipo)?.nombre ?? "Tipo" : "Todo tipo"}</span><IconoN nombre="chevron-down" tam={16} />
          <select aria-label="Qué" value={tipo} onChange={(e) => cambiar(() => setTipo(e.target.value))} data-testid="filtro-tipo"><option value="">Todo tipo</option>{TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.nombre}</option>)}</select>
        </label>
      </div>
      {periodo === "rango" && (
        <div className="ac2-rango">
          <label><span>Desde</span><input type="date" value={desdeDia} max={hastaDia || undefined} onChange={(e) => cambiar(() => setDesdeDia(e.target.value))} data-testid="filtro-desde" /></label>
          <label><span>Hasta</span><input type="date" value={hastaDia} min={desdeDia || undefined} onChange={(e) => cambiar(() => setHastaDia(e.target.value))} data-testid="filtro-hasta" /></label>
        </div>
      )}
      <div className="ac2-total" role="status" data-testid="cuenta">{datos ? <><b>{datos.total.toLocaleString("es-AR")} {datos.total === 1 ? "acción" : "acciones"}</b><span>la más nueva primero</span></> : <span>{error ? "No se pudo traer el registro. Revisá internet." : "Trayendo el registro…"}</span>}</div>
      {datos && datos.total === 0 && <div className="aviso-suave">{usuario || tipo || periodo !== "hoy" ? "No hay acciones con esos filtros. Probá con otro día, otra persona u otro tipo." : "Hoy todavía no hay acciones. Apenas alguien venda, compre o cambie un precio, queda anotado acá."}</div>}
      <div className="ac2-lista">
        {(datos?.eventos ?? []).map((e) => {
          const que = queFue(e);
          const total = typeof e.contenido.total === "number" ? ` · $${Math.round(e.contenido.total).toLocaleString("es-AR")}` : "";
          // El importe ya va en el título: el detalle sigue con lo demás («5 productos · efectivo»).
          const detalle = total ? detalleDe(e, usuarios).split(" · ").filter((p) => !p.startsWith("$")).join(" · ") : detalleDe(e, usuarios);
          return (
            <button key={e.id} type="button" className={`ac2-ac ${que.tono === "error" ? "rojo" : ""}`} onClick={() => setAbierto(e)} data-testid="evento">
              <span className={`ac2-tipo ${que.tono ?? ""}`}><IconoN nombre={que.icono} /></span>
              <span className="ac2-texto"><span className="ac2-q">{que.nombre}{total}</span><span className="ac2-d"><Iniciales nombre={e.nombre ?? "Sistema"} clave={e.email ?? "sistema"} tam="s" />{primerNombre(e.nombre)}{detalle && ` · ${detalle}`}</span></span>
              <span className="ac2-h">{horaDe(e.fecha)}</span>
            </button>
          );
        })}
      </div>
      {datos && datos.total > 0 && (
        <nav className="ac2-pager" data-testid="paginado" aria-label="Páginas del registro">
          <button type="button" className="ac2-boton" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)} data-testid="anteriores"><IconoN nombre="chevron-left" tam={18} />Nuevas</button>
          <span className="ac2-t">{datos.pagina} de {paginas}<small>{desdeN} a {hastaN}</small></span>
          <button type="button" className="ac2-boton" disabled={pagina >= paginas} onClick={() => setPagina((p) => p + 1)} data-testid="siguientes">Anteriores<IconoN nombre="chevron-right" tam={18} /></button>
        </nav>
      )}
      {abierto && (
        <Hoja titulo={queFue(abierto).nombre} alCerrar={() => setAbierto(null)} testId="hoja-evento">
          {detalleDe(abierto, usuarios) && <p className="ac2-resumen">{detalleDe(abierto, usuarios)}</p>}
          <dl className="ac2-kv">
            <dt>Cuándo</dt><dd>{fechaCompleta(abierto.fecha)}</dd>
            <dt>Quién</dt><dd>{abierto.nombre ? `${abierto.nombre} (${abierto.email})` : "El sistema"}</dd>
            {aplanar(abierto.contenido).map(([k, v]) => <div key={k} style={{ display: "contents" }}><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>
        </Hoja>
      )}
    </div>
  );
}
