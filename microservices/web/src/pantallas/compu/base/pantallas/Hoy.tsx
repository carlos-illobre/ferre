import { useCallback, useEffect, useRef, useState } from "react";
import { IconoDeMedio } from "../../../IconoDeMedio";
import { TEXTOS } from "../../../textos";
import { MEDIOS, NOMBRE_DE_MEDIO } from "../../../../negocio/ventas/venta";
import { fueSinConexion, hoyLocal, type VentaDelDia } from "../../../../negocio/ventas/ventas-del-dia";
import { nombreDelDia, useResumenDelDia, type Comparacion } from "../../../../negocio/ventas/resumen-del-dia";
import { useTeclasGlobales } from "../../../../plataforma/teclado/teclas";
import { irA } from "../rutas";
import { Aviso, Boton, Icono, Pagina, Vacio, hora, numero, pesosCortos } from "../ui";
import "../estilos/hoy.css";

const t = TEXTOS.hoy;
const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// «Hoy» en la computadora (specs/017, la maqueta C en dos columnas): a la izquierda la tarjeta
// oscura con el total, la comparación, lo vendido por hora y los cuatro medios; a la derecha el
// día y «Cambiar fecha», los tres números y la tabla de ventas, que se abren de a una. No deja
// tocar nada (decisión 72). Teclado: ↑ ↓ eligen una venta, Enter la abre o la cierra, F cambia la fecha.
export function Hoy() {
  const [dia, setDia] = useState<string | null>(null);
  const r = useResumenDelDia(dia);
  const [elegida, setElegida] = useState(0);
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  const calendario = useRef<HTMLInputElement>(null);
  const ventas = r.ventas ?? [];
  useEffect(() => { setElegida(0); setAbiertas(new Set()); }, [r.dia]);
  const abrir = useCallback((id: string) => setAbiertas((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }), []);
  const abrirCalendario = () => { const c = calendario.current; if (!c) return; try { c.showPicker(); } catch { c.focus(); c.click(); } };

  const teclas = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setElegida((i) => Math.min(i + 1, ventas.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setElegida((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && ventas[elegida]) { e.preventDefault(); abrir(ventas[elegida]!.id); }
    else if (e.key === "f" || e.key === "F") { e.preventDefault(); abrirCalendario(); }
  }, [ventas, elegida, abrir]);
  useTeclasGlobales(teclas);
  useEffect(() => { document.querySelector(".hoy-tabla tr.elegida")?.scrollIntoView?.({ block: "nearest" }); }, [elegida]);

  const error = r.error && (fueSinConexion(r.error) ? (r.esHoy ? t.sinConexionHoy.largo : t.sinConexionOtroDia.largo) : r.error.message);
  return (
    <Pagina titulo={r.esHoy ? "Ventas de hoy" : `Ventas del ${nombreDelDia(r.dia)}`} testId="ventas-de-hoy">
      <Aviso tipo="error">{error}</Aviso>
      {!r.resumen && !error && <div className="esqueleto ventas-esqueleto" aria-busy="true" aria-label="Buscando las ventas del día" />}
      {r.resumen && (
        <div className="hoy-columnas">
          <section className="hoy-total" data-testid="resumen-hoy" aria-label={t.totalDeVentas.largo}>
            <small>{t.totalDeVentas.largo}</small>
            <span className="hoy-monto" data-testid="total-de-hoy">{pesosCortos(r.resumen.total)}</span>
            <LaComparacion comparacion={r.comparacion} esHoy={r.esHoy} diaAnterior={r.diaAnterior} />
            <Barras barras={r.barras} />
            <ul className="hoy-medios">
              {MEDIOS.map((m) => (
                <li key={m} data-testid={`medio-${m}`}>
                  <IconoDeMedio medio={m} tam={18} conFondo />
                  <span className="hoy-medio-nombre">{NOMBRE_DE_MEDIO[m]}</span>
                  <small>{r.resumen!.medios[m].cuantas} {r.resumen!.medios[m].cuantas === 1 ? t.venta.largo : t.ventas.largo}</small>
                  <b>{pesosCortos(r.resumen!.medios[m].total)}</b>
                </li>
              ))}
            </ul>
          </section>
          <div className="hoy-derecha">
            <div className="hoy-fecha">
              <div>
                <b data-testid="dia-que-se-mira">{r.esHoy ? `${t.hoy.largo}, ${nombreDelDia(r.dia)}` : mayuscula(nombreDelDia(r.dia))}</b>
                {r.esHoy ? <small>{t.hasta.largo} {hora(new Date().toISOString())}</small>
                  : <button type="button" className="enlace" onClick={() => setDia(null)} data-testid="volver-a-hoy">{t.volverAHoy.largo}</button>}
              </div>
              <span className="hoy-fecha-boton">
                <Boton icono="calendario" onClick={abrirCalendario} data-testid="cambiar-fecha">{t.cambiarFecha.largo}</Boton>
                <input ref={calendario} type="date" className="hoy-calendario" value={r.dia} max={hoyLocal()} aria-label={t.cambiarFecha.largo} tabIndex={-1}
                  onChange={(e) => e.target.value && setDia(e.target.value === hoyLocal() ? null : e.target.value)} data-testid="dia" />
              </span>
            </div>
            <div className="hoy-numeros" data-testid="numeros">
              <div><b data-testid="cuantas-ventas">{r.resumen.ventas}</b><small>{t.ventas.largo}</small></div>
              <div><b data-testid="cuantos-productos">{r.resumen.productos}</b><small>{t.productos.largo}</small></div>
              <div><b data-testid="ticket">{r.resumen.ticket === null ? "—" : pesosCortos(r.resumen.ticket)}</b><small>{t.ticket.largo}</small></div>
            </div>
            {ventas.length === 0 ? (
              <div data-testid="sin-ventas"><Vacio icono="ventas" titulo={r.esHoy ? t.sinVentasHoy.largo : t.sinVentasDia.largo}
                accion={r.esHoy ? <Boton variante="principal" icono="vender" onClick={() => irA("vender")}>Ir a vender</Boton> : undefined} /></div>
            ) : (
              <table className="hoy-tabla" data-testid="lista-de-ventas">
                <thead><tr><th>Hora</th><th>Productos</th><th>Cómo pagó</th><th className="num">Total</th><th><span className="solo-lectores">Detalle</span></th></tr></thead>
                {ventas.map((v, i) => <FilaDeVenta key={v.id} venta={v} elegida={i === elegida} abierta={abiertas.has(v.id)} alAbrir={() => { setElegida(i); abrir(v.id); }} />)}
              </table>
            )}
            <p className="hoy-teclas detalle">
              <span><kbd className="tecla">↑</kbd><kbd className="tecla">↓</kbd> {t.teclaElegir.largo}</span>
              <span><kbd className="tecla">Enter</kbd> {t.teclaAbrir.largo}</span>
              <span><kbd className="tecla">F</kbd> {t.teclaFecha.largo}</span>
            </p>
          </div>
        </div>
      )}
    </Pagina>
  );
}

function LaComparacion({ comparacion: c, esHoy, diaAnterior }: { comparacion: Comparacion | null; esHoy: boolean; diaAnterior: string }) {
  if (!c) return null;
  if (c.sinVentas) return <div className="hoy-compara" data-testid="comparacion">{esHoy ? t.ayerSinVentas.largo : t.diaSinVentas.largo}</div>;
  return (
    <div className="hoy-compara" data-testid="comparacion">
      <span className={`hoy-pastilla ${c.porcentaje < 0 ? "baja" : "sube"}`}>{c.porcentaje > 0 ? "+" : ""}{c.porcentaje} %</span>
      <span>{esHoy ? t.vsAyer.largo : `${t.vsDia.largo} ${nombreDelDia(diaAnterior)}`} ({pesosCortos(c.anterior)})</span>
    </div>
  );
}

function Barras({ barras }: { barras: { hora: number; total: number }[] }) {
  const [elegida, setElegida] = useState<number | null>(null);
  if (barras.length === 0) return null;
  const max = Math.max(...barras.map((b) => b.total), 1);
  const b = barras.find((x) => x.hora === elegida);
  return (
    <div className="hoy-grafico" data-testid="grafico">
      <div className="hoy-dato" aria-live="polite">{b ? `${b.hora} h · ${pesosCortos(b.total)}` : ""}</div>
      <div className="hoy-barras">
        {barras.map((x) => (
          <button key={x.hora} type="button" className={`${x.total === 0 ? "vacia" : ""} ${x.hora === elegida ? "elegida" : ""}`} style={{ height: `${Math.max(4, (x.total / max) * 100)}%` }}
            onMouseEnter={() => setElegida(x.hora)} onMouseLeave={() => setElegida(null)} onFocus={() => setElegida(x.hora)} onBlur={() => setElegida(null)}
            aria-label={`${x.hora} h: ${pesosCortos(x.total)}`} data-testid="barra" />
        ))}
      </div>
      <div className="hoy-horas" aria-hidden="true">{barras.map((x) => <span key={x.hora}>{x.hora}</span>)}</div>
    </div>
  );
}

function FilaDeVenta({ venta: v, elegida, abierta, alAbrir }: { venta: VentaDelDia; elegida: boolean; abierta: boolean; alAbrir: () => void }) {
  const anulada = v.estado === "anulada";
  const una = v.items.length === 1 ? v.items[0]! : null;
  return (
    <tbody data-testid="venta-dia" className={anulada ? "anulada" : ""}>
      <tr className={elegida ? "elegida" : ""} aria-selected={elegida} onClick={alAbrir}>
        <td>{hora(v.fecha)}</td>
        <td className="tach"><b>{una ? `${numero(Number(una.cantidad))} × ${una.descripcion}` : `${v.items.length} ${t.productos.largo}`}</b></td>
        <td><span className={`hoy-medio medio-${v.medio_pago}`}><IconoDeMedio medio={v.medio_pago} tam={16} />{NOMBRE_DE_MEDIO[v.medio_pago as keyof typeof NOMBRE_DE_MEDIO] ?? v.medio_pago}</span>{v.cliente && <small className="hoy-cliente">{v.cliente}</small>}</td>
        <td className="num"><b className="tach">{pesosCortos(v.total)}</b>{anulada && <span className="hoy-anulada">{t.anulada.largo}</span>}</td>
        <td className="hoy-flecha"><button type="button" onClick={(e) => { e.stopPropagation(); alAbrir(); }} aria-expanded={abierta} aria-label={abierta ? "Cerrar el detalle" : "Ver el detalle"}><Icono nombre={abierta ? "abajo" : "derecha"} tam={18} /></button></td>
      </tr>
      {abierta && v.items.map((i, n) => (
        <tr key={n} className="hoy-detalle" data-testid="detalle-venta">
          <td /><td colSpan={2}>{numero(Number(i.cantidad))} × {i.descripcion} · {pesosCortos(i.precio_unitario)} {t.cadaUno.largo}</td><td className="num">{pesosCortos(i.subtotal)}</td><td />
        </tr>
      ))}
    </tbody>
  );
}
