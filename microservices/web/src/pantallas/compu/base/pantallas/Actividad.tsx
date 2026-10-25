import { useEffect, useRef, useState } from "react";
import { useActividad, type Evento } from "../../../../negocio/actividad";
import { useUsuarios } from "../../../../negocio/usuarios";
import { Aviso, Boton, Hoja, Pagina, Progreso, Vacio } from "../ui";
import { fechaCompleta, textoDeError, useEnLinea } from "./negocio-comun";
import { AlLadoDeLasPestanas } from "../../../AlLadoDeLasPestanas";
import { Iniciales } from "../../../iconos-de-negocio";
import { CATEGORIAS, TIPOS, aplanar, detalleDe, diasDelPeriodo, haceCuantoFue, horaDe, inicioDelDia, queFue, type Periodo } from "../../../actividad-en-palabras";
import "../estilos/negocio.css";
import "../estilos/actividad.css";
import { Icono } from "../../../../ui/iconos";

type Filtros = { usuario: string; tipo: string; periodo: Periodo; desde: string; hasta: string };
const AL_ABRIR: Filtros = { usuario: "", tipo: "", periodo: "hoy", desde: "", hasta: "" };
const PERIODOS: { valor: Periodo; nombre: string }[] = [{ valor: "hoy", nombre: "Hoy" }, { valor: "ayer", nombre: "Ayer" }, { valor: "semana", nombre: "Esta semana" }];

const enPalabras = (f: Filtros) => f.periodo === "hoy" ? "hoy" : f.periodo === "ayer" ? "ayer" : f.periodo === "semana" ? "esta semana"
  : f.desde && f.hasta ? `del ${f.desde.slice(8)}/${f.desde.slice(5, 7)} al ${f.hasta.slice(8)}/${f.hasta.slice(5, 7)}` : f.desde ? `desde el ${f.desde.slice(8)}/${f.desde.slice(5, 7)}` : f.hasta ? `hasta el ${f.hasta.slice(8)}/${f.hasta.slice(5, 7)}` : "en todo el registro";
const primerNombre = (n: string | null) => (n ? n.split(/\s+/)[0]! : "El sistema");

// «Quién hizo qué» como la v2 («Registro», decisión 148): los filtros en una fila (quién, el
// período en segmentos y qué), la tabla de a 10 con la acción elegida a la derecha, «Qué pasó»
// con cuántas de cada tipo y el paginador. Es de solo lectura.
export function Actividad() {
  const enLinea = useEnLinea();
  const [filtros, setFiltros] = useState<Filtros>(AL_ABRIR);
  const [pagina, setPagina] = useState(1);
  const [rango, setRango] = useState(false);
  const dias = diasDelPeriodo(filtros);
  const desde = dias.desde ? inicioDelDia(dias.desde) : undefined;
  const hasta = dias.hasta ? inicioDelDia(dias.hasta, 1) : undefined;
  const usuario = filtros.usuario || undefined;
  const registro = useActividad({ pagina, usuario, tipo: filtros.tipo || undefined, desde, hasta });
  const { datos, cargando } = registro;
  const error = registro.error ? textoDeError(registro.error, "No se pudo traer el registro") : null;
  const usuarios = useUsuarios().datos ?? [];
  const [marcado, setMarcado] = useState(0);
  const [abierto, setAbierto] = useState<Evento | null>(null);
  const tabla = useRef<HTMLDivElement>(null);

  // «Qué pasó»: el total de cada tipo en el período, con la persona elegida.
  const todas = useActividad({ pagina: 1, usuario, desde, hasta }).datos?.total ?? null;
  const porTipo = CATEGORIAS.map((c) => useActividad({ pagina: 1, usuario, tipo: c.tipo, desde, hasta }).datos?.total ?? null); // eslint-disable-line react-hooks/rules-of-hooks

  // Cambiar un filtro lleva a la página 1; avanzar y retroceder los conserva.
  const filtrar = (cambio: Partial<Filtros>) => { setFiltros((f) => ({ ...f, ...cambio })); setPagina(1); setMarcado(0); };
  const conFiltros = Boolean(filtros.usuario || filtros.tipo || filtros.periodo !== "hoy");
  const paginas = datos ? Math.max(1, Math.ceil(datos.total / datos.por_pagina)) : 1;
  const eventos = datos?.eventos ?? [];
  const elegido = eventos[Math.min(marcado, eventos.length - 1)] ?? null;
  const fechasAlReves = Boolean(filtros.periodo === "rango" && filtros.desde && filtros.hasta && filtros.desde > filtros.hasta);
  useEffect(() => { setMarcado(0); }, [pagina]);

  function teclear(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const i = Math.min(eventos.length - 1, Math.max(0, marcado + (e.key === "ArrowDown" ? 1 : -1)));
      setMarcado(i);
      tabla.current?.querySelectorAll<HTMLButtonElement>("[data-testid='evento']")[i]?.focus();
    } else if (e.key === "Enter" && elegido) { e.preventDefault(); setAbierto(elegido); }
  }

  const ahora = new Date();
  const hoyTexto = `${ahora.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })} · ${ahora.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
  const desdeN = datos && datos.total ? (datos.pagina - 1) * datos.por_pagina + 1 : 0;
  const hastaN = datos ? Math.min(datos.total, datos.pagina * datos.por_pagina) : 0;
  const numeros = Array.from({ length: paginas }, (_, i) => i + 1).filter((n) => Math.abs(n - pagina) <= 2 || (pagina <= 2 && n <= 5) || (pagina >= paginas - 1 && n > paginas - 5));

  return (
    <Pagina titulo="Quién hizo qué" testId="actividad" className="actividad av2" bajada={<span className="solo-lectores">Cada venta, compra, cambio de precio o de usuario queda anotado con quién lo hizo y cuándo. No se puede editar ni borrar.</span>}>
      <AlLadoDeLasPestanas>
        <span className="av2-hoy">{hoyTexto.charAt(0).toUpperCase() + hoyTexto.slice(1)}</span>
        <button type="button" className="av2-boton" disabled title="Bajar el registro en planilla todavía no se puede"><Icono nombre="file-down" tam={16} />Bajar en planilla</button>
      </AlLadoDeLasPestanas>
      {!enLinea && <Aviso tipo="alerta" testId="actividad-sin-conexion">Sin conexión: el registro necesita internet. Se actualiza solo cuando vuelva.</Aviso>}

      <div className="av2-pantalla">
        <div className="av2-izq">
          <form className="av2-filtros" role="search" aria-label="Filtros del registro" onSubmit={(e) => e.preventDefault()} data-testid="filtros">
            <label className={`av2-selector ${filtros.usuario ? "puesto" : ""}`}>
              <span className="av2-et">Quién</span>
              <select value={filtros.usuario} onChange={(e) => filtrar({ usuario: e.target.value })} data-testid="filtro-usuario">
                <option value="">Todos</option>
                {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre}{u.activo ? "" : " (desactivado)"}</option>)}
              </select>
              <Icono nombre="chevron-down" tam={16} />
            </label>
            <div className="av2-segmentos" role="group" aria-label="Período">
              {PERIODOS.map((p) => <button key={p.valor} type="button" className={filtros.periodo === p.valor ? "elegido" : ""} aria-pressed={filtros.periodo === p.valor} onClick={() => { setRango(false); filtrar({ periodo: p.valor }); }} data-testid={`periodo-${p.valor}`}>{p.nombre}</button>)}
              <button type="button" className={filtros.periodo === "rango" ? "elegido" : ""} aria-pressed={filtros.periodo === "rango"} aria-expanded={rango} onClick={() => { setRango((r) => !r); filtrar({ periodo: "rango" }); }} data-testid="periodo-rango"><Icono nombre="calendar" tam={16} />Desde… hasta</button>
            </div>
            <label className={`av2-selector ${filtros.tipo ? "puesto" : ""}`}>
              <span className="av2-et">Qué</span>
              <select value={filtros.tipo} onChange={(e) => filtrar({ tipo: e.target.value })} data-testid="filtro-tipo">
                <option value="">Todo</option>
                {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.nombre}</option>)}
              </select>
              <Icono nombre="chevron-down" tam={16} />
            </label>
            {conFiltros && <button type="button" className="av2-boton fantasma" onClick={() => { setFiltros(AL_ABRIR); setPagina(1); setRango(false); }} data-testid="quitar-filtros"><Icono nombre="x" tam={16} />Quitar filtros</button>}
          </form>
          {rango && (
            <div className="av2-rango">
              <label className="campo"><span>Desde el día</span><input className="entrada" type="date" value={filtros.desde} max={filtros.hasta || undefined} onChange={(e) => filtrar({ desde: e.target.value })} aria-invalid={fechasAlReves} data-testid="filtro-desde" /></label>
              <label className="campo"><span>Hasta el día</span><input className="entrada" type="date" value={filtros.hasta} min={filtros.desde || undefined} onChange={(e) => filtrar({ hasta: e.target.value })} aria-invalid={fechasAlReves} data-testid="filtro-hasta" /></label>
              <span className="uv-detalle">Sin días, se ve todo el registro.</span>
              {fechasAlReves && <small className="actividad-fechas" role="alert">El «desde» es posterior al «hasta»: así no hay días para mostrar.</small>}
            </div>
          )}

          <div className="av2-total" role="status" aria-live="polite" data-testid="cuenta">
            {datos ? <><b>{datos.total.toLocaleString("es-AR")} {datos.total === 1 ? "acción" : "acciones"}</b><span className="av2-detalle av2-crece">{enPalabras(filtros)}, de la más nueva a la más vieja</span>{datos.total > 0 && <span className="av2-detalle">Página <b>{datos.pagina}</b> de <b>{paginas}</b></span>}</>
              : !error && <span className="av2-detalle">Trayendo el registro…</span>}
            {cargando && datos && <span className="av2-detalle">Trayendo la página…</span>}
          </div>

          <Aviso tipo="error" accion={<Boton tam="chico" onClick={registro.recargar}>Reintentar</Boton>}>{error}</Aviso>
          {!datos && !error && <Progreso texto="Trayendo las últimas acciones…" />}

          {datos && datos.total === 0 && (
            <div className="tarjeta">
              {conFiltros
                ? <Vacio icono="filtro" titulo="No hay acciones con esos filtros" accion={<Boton onClick={() => { setFiltros({ ...AL_ABRIR, periodo: "rango" }); setPagina(1); }}>Ver todo el registro</Boton>}>Probá con otro día, otra persona u otro tipo de acción.</Vacio>
                : <Vacio icono="actividad" titulo="Hoy todavía no hay acciones" accion={<Boton onClick={() => filtrar({ periodo: "rango" })}>Ver todo el registro</Boton>}>Apenas alguien venda, compre o cambie un precio, queda anotado acá.</Vacio>}
            </div>
          )}

          {eventos.length > 0 && (
            <div className={`av2-tabla ${cargando ? "actividad-cargando" : ""}`} data-testid="auditoria" aria-busy={cargando} ref={tabla} onKeyDown={teclear}>
              <div className="av2-fila cab" aria-hidden="true"><span>Hora</span><span>Quién</span><span>Qué</span><span>Detalle</span><span /></div>
              {eventos.map((e, i) => {
                const que = queFue(e);
                const detalle = detalleDe(e, usuarios);
                return (
                  <button key={e.id} type="button" className={`av2-fila ${e === elegido ? "elegida" : ""}`} aria-pressed={e === elegido} onClick={() => setMarcado(i)} onDoubleClick={() => setAbierto(e)} data-testid="evento" title={fechaCompleta(e.fecha)}>
                    <span className="av2-hora">{horaDe(e.fecha)}</span>
                    <span className="av2-quien" title={e.email ?? undefined}><Iniciales nombre={e.nombre ?? "Sistema"} clave={e.email ?? "sistema"} tam="s" />{primerNombre(e.nombre)}</span>
                    <span className="av2-que"><span className={`av2-tipo ${que.tono ?? ""}`}><Icono nombre={que.icono} tam={16} /></span>{que.nombre}</span>
                    <span className="av2-det">{detalle || "—"}</span>
                    <Icono nombre="chevron-right" className="av2-mas" />
                  </button>
                );
              })}
            </div>
          )}

          {datos && datos.total > 0 && (
            <nav className="av2-pie" data-testid="paginado" aria-label="Páginas del registro">
              <span className="av2-detalle">{desdeN} a {hastaN} de {datos.total.toLocaleString("es-AR")} · <span className="av2-kbd">↑</span> <span className="av2-kbd">↓</span> recorren, <span className="av2-kbd">Enter</span> abre</span>
              <span className="av2-paginador">
                <button type="button" className="av2-boton icono" disabled={pagina <= 1 || cargando} onClick={() => setPagina((p) => p - 1)} aria-label="Anteriores" data-testid="anteriores"><Icono nombre="chevron-left" tam={16} /></button>
                {numeros.map((n) => <button key={n} type="button" className={`av2-pag ${n === pagina ? "actual" : ""}`} aria-current={n === pagina ? "page" : undefined} onClick={() => setPagina(n)} disabled={cargando}>{n}</button>)}
                <button type="button" className="av2-boton" disabled={pagina >= paginas || cargando} onClick={() => setPagina((p) => p + 1)} data-testid="siguientes">Siguiente <Icono nombre="chevron-right" tam={16} /></button>
              </span>
            </nav>
          )}
        </div>

        <div className="av2-der">
          <section className="av2-caja" aria-labelledby="av2-que-paso" data-testid="que-paso">
            <h3 id="av2-que-paso">Qué pasó {enPalabras(filtros)}<small>tocá para filtrar</small></h3>
            <div className="av2-barras">
              {CATEGORIAS.map((c, i) => {
                const n = porTipo[i];
                const max = Math.max(1, todas ?? 1);
                return (
                  <button key={c.tipo} type="button" className={`av2-b ${c.tono ?? ""} ${filtros.tipo === c.tipo ? "puesto" : ""}`} aria-pressed={filtros.tipo === c.tipo} onClick={() => filtrar({ tipo: filtros.tipo === c.tipo ? "" : c.tipo })}>
                    <Icono nombre={c.icono} tam={16} /><span>{c.nombre}</span><i style={{ width: `${n ? Math.max(6, (n / max) * 56) : 0}px` }} /><b>{n ?? "—"}</b>
                  </button>
                );
              })}
              <div className="av2-b otras"><Icono nombre="ellipsis" tam={16} /><span>Otras</span><i style={{ width: `${todas !== null && porTipo.every((n) => n !== null) ? Math.max(6, ((todas - porTipo.reduce<number>((s, n) => s + (n ?? 0), 0)) / Math.max(1, todas)) * 56) : 0}px` }} /><b>{todas !== null && porTipo.every((n) => n !== null) ? todas - porTipo.reduce<number>((s, n) => s + (n ?? 0), 0) : "—"}</b></div>
            </div>
          </section>

          {elegido && (() => {
            const que = queFue(elegido);
            const detalle = detalleDe(elegido, usuarios);
            const motivo = typeof elegido.contenido.motivo === "string" ? elegido.contenido.motivo : null;
            const quienFue = usuarios.find((u) => u.email === elegido.email);
            return (
              <section className="av2-caja av2-elegido" aria-label={`${que.nombre}, ${horaDe(elegido.fecha)}`} data-testid="accion-elegida">
                <div className="av2-det-cab"><span className={`av2-tipo l ${que.tono ?? ""}`}><Icono nombre={que.icono} /></span><div><div className="av2-det-titulo">{que.nombre}</div><div className="av2-detalle">{horaDe(elegido.fecha)} · {haceCuantoFue(elegido.fecha)}</div></div></div>
                <dl className="av2-kv">
                  <dt>Quién</dt><dd className="av2-kv-quien"><Iniciales nombre={elegido.nombre ?? "Sistema"} clave={elegido.email ?? "sistema"} tam="s" />{elegido.nombre ?? "El sistema"}</dd>
                  {detalle && <><dt>Qué</dt><dd>{detalle}</dd></>}
                  <dt>Cuándo</dt><dd>{fechaCompleta(elegido.fecha)}</dd>
                </dl>
                {motivo && <div className="av2-cita">«{motivo}»</div>}
                <div className="av2-acciones">
                  <button type="button" className="av2-boton suave" onClick={() => setAbierto(elegido)} aria-haspopup="dialog">Ver todo</button>
                  {quienFue && <button type="button" className="av2-boton suave" onClick={() => filtrar({ usuario: quienFue.id })}>Lo de {primerNombre(elegido.nombre)}</button>}
                </div>
              </section>
            );
          })()}
        </div>
      </div>

      {abierto && (
        <Hoja titulo={queFue(abierto).nombre} alCerrar={() => setAbierto(null)} testId="hoja-evento" pie={<Boton variante="marino" onClick={() => setAbierto(null)}>Entendido</Boton>}>
          {detalleDe(abierto, usuarios) && <p className="actividad-resumen">{detalleDe(abierto, usuarios)}</p>}
          <dl className="actividad-datos">
            <div><dt>Cuándo</dt><dd>{fechaCompleta(abierto.fecha)}</dd></div>
            <div><dt>Quién</dt><dd>{abierto.nombre ? <>{abierto.nombre} <span className="detalle">({abierto.email})</span></> : "El sistema"}</dd></div>
            {aplanar(abierto.contenido).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>
        </Hoja>
      )}
    </Pagina>
  );
}
