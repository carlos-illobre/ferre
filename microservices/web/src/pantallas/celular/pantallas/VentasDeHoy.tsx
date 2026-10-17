import { Icono, Lista } from "../componentes/base";
import { useRef, useState } from "react";
import { IconoDeMedio } from "../../IconoDeMedio";
import { TEXTOS } from "../../textos";
import { nombreDelDia, useResumenDelDia, type Comparacion } from "../../../negocio/ventas/resumen-del-dia";
import "./hoy.css";
import { pesos, pesosCortos } from "../../../formato";
const numero = (n: number) => n.toLocaleString("es-AR");
import { MEDIOS, NOMBRE_DE_MEDIO } from "../../../negocio/ventas/venta";
import { confirmadas, fueSinConexion, hoyLocal, useVentasDelDia, type VentaDelDia } from "../../../negocio/ventas/ventas-del-dia";

// La pestaña «Hoy» de Vender (decisión 72); «Anular» está en AnularVentas.

const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });

// Cada venta con sus productos (uno por renglón), el medio de pago y "Anular".
export function ListaDeVentas({ ventas, alAnular, sinVentas = "Todavía no hay ventas hoy." }: { ventas: VentaDelDia[]; alAnular: ((v: VentaDelDia) => void) | null; sinVentas?: string }) {
  if (ventas.length === 0) return <div className="aviso-suave">{sinVentas}</div>;
  return (
    <Lista data-testid="ventas-de-hoy">
      {ventas.map((v) => {
        const anulada = v.estado === "anulada";
        return (
          <div key={v.id} className={`fila ${anulada ? "apagada" : ""}`} data-testid="venta-dia">
            <span className="nombre" style={{ textDecoration: anulada ? "line-through" : undefined }}>
              {v.items.map((i, n) => <span key={n} style={{ display: "block" }}>{Number(i.cantidad)} × {i.descripcion}</span>)}
            </span>
            <span className="derecha">
              <strong className="importe" style={{ textDecoration: anulada ? "line-through" : undefined }}>{pesos(v.total)}</strong>
              {anulada ? <small>anulada</small> : alAnular && <button type="button" className="enlace" onClick={() => alAnular(v)}>Anular</button>}
            </span>
            <span className="detalle con-medio"><IconoDeMedio medio={v.medio_pago} tam={16} />{hora(v.fecha)} · {NOMBRE_DE_MEDIO[v.medio_pago] ?? v.medio_pago}{v.cliente ? ` · ${v.cliente}` : ""}</span>
          </div>
        );
      })}
    </Lista>
  );
}

// Pestaña «Hoy» (specs/017, maqueta C): el día que se mira y «Cambiar fecha»; en la tarjeta
// oscura el total, la comparación con el día anterior, lo vendido por hora y los cuatro medios;
// los tres números; y cada venta en un renglón corto que se abre. No deja tocar nada (decisión 72).
export function VentasDeHoy() {
  const [dia, setDia] = useState<string | null>(null);
  const r = useResumenDelDia(dia);
  const t = TEXTOS.hoy;
  const calendario = useRef<HTMLInputElement>(null);
  const ahora = new Date();
  const abrirCalendario = () => { const c = calendario.current; if (!c) return; try { c.showPicker(); } catch { c.focus(); c.click(); } };
  return (
    <div className="hoy" data-testid="hoy">
      <div className="hoy-fecha">
        <div>
          <b data-testid="dia-que-se-mira">{r.esHoy ? `${t.hoy.corto}, ${nombreDelDia(r.dia)}` : mayuscula(nombreDelDia(r.dia))}</b>
          {r.esHoy ? <small>{t.hasta.corto} {hora(ahora.toISOString())}</small>
            : <button type="button" className="enlace" onClick={() => setDia(null)} data-testid="volver-a-hoy">{t.volverAHoy.corto}</button>}
        </div>
        <button type="button" className="hoy-boton" onClick={abrirCalendario} data-testid="cambiar-fecha"><Icono nombre="calendario" tam={18} />{t.cambiarFecha.corto}</button>
        <input ref={calendario} type="date" className="hoy-calendario" value={r.dia} max={hoyLocal()} aria-label={t.cambiarFecha.corto}
          onChange={(e) => e.target.value && setDia(e.target.value === hoyLocal() ? null : e.target.value)} data-testid="dia" />
      </div>
      {!r.resumen ? (
        r.error && fueSinConexion(r.error) ? <div className="aviso-suave" data-testid="sin-conexion">{r.esHoy ? t.sinConexionHoy.corto : t.sinConexionOtroDia.corto}</div> : r.error ? <div className="aviso-suave">{(r.error as Error).message}</div> : <div className="aviso-suave" aria-busy="true">…</div>
      ) : <>
        <section className="tarjeta oscura hoy-total" data-testid="resumen-hoy">
          <small>{t.totalDeVentas.corto}</small>
          <span className="hoy-monto importe" data-testid="total-de-hoy">{pesosCortos(r.resumen.total)}</span>
          <Comparacion comparacion={r.comparacion} esHoy={r.esHoy} diaAnterior={r.diaAnterior} />
          <Barras barras={r.barras} />
          <ul className="hoy-medios">
            {MEDIOS.map((m) => (
              <li key={m} data-testid={`medio-${m}`}>
                <IconoDeMedio medio={m} tam={18} conFondo />
                <span className="hoy-medio-nombre">{NOMBRE_DE_MEDIO[m]}</span>
                <small>{r.resumen!.medios[m].cuantas} {r.resumen!.medios[m].cuantas === 1 ? t.venta.corto : t.ventas.corto}</small>
                <b className="importe">{pesosCortos(r.resumen!.medios[m].total)}</b>
              </li>
            ))}
          </ul>
        </section>
        <div className="hoy-numeros" data-testid="numeros">
          <div><b data-testid="cuantas-ventas">{r.resumen.ventas}</b><small>{t.ventas.corto}</small></div>
          <div><b data-testid="cuantos-productos">{r.resumen.productos}</b><small>{t.productos.corto}</small></div>
          <div><b data-testid="ticket">{r.resumen.ticket === null ? "—" : pesosCortos(r.resumen.ticket)}</b><small>{t.ticket.corto}</small></div>
        </div>
        <h2 className="hoy-titulo">{t.titulo.corto}</h2>
        <VentasCortas ventas={r.ventas ?? []} sinVentas={r.esHoy ? t.sinVentasHoy.corto : t.sinVentasDia.corto} />
      </>}
    </div>
  );
}

const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Comparacion({ comparacion: c, esHoy, diaAnterior }: { comparacion: Comparacion | null; esHoy: boolean; diaAnterior: string }) {
  const t = TEXTOS.hoy;
  if (!c) return null;
  if (c.sinVentas) return <div className="hoy-compara" data-testid="comparacion">{esHoy ? t.ayerSinVentas.corto : t.diaSinVentas.corto}</div>;
  const contra = esHoy ? t.vsAyer.corto : `${t.vsDia.corto} ${nombreDelDia(diaAnterior)}`;
  return (
    <div className="hoy-compara" data-testid="comparacion">
      <span className={`hoy-pastilla ${c.porcentaje < 0 ? "baja" : "sube"}`}><Icono nombre={c.porcentaje < 0 ? "baja" : "sube"} tam={14} grosor={2.6} />{c.porcentaje > 0 ? "+" : ""}{c.porcentaje} %</span>
      <span>{contra} ({pesosCortos(c.anterior)})</span>
    </div>
  );
}

// Lo vendido por hora; tocar una barra dice su importe.
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
            onClick={() => setElegida(x.hora === elegida ? null : x.hora)} aria-label={`${x.hora} h: ${pesosCortos(x.total)}`} data-testid="barra" />
        ))}
      </div>
      <div className="hoy-horas" aria-hidden="true">{barras.map((x) => <span key={x.hora}>{x.hora}</span>)}</div>
    </div>
  );
}

// Cada venta, un renglón corto; tocarla la abre con sus productos.
function VentasCortas({ ventas, sinVentas }: { ventas: VentaDelDia[]; sinVentas: string }) {
  const [abierta, setAbierta] = useState<string | null>(null);
  const t = TEXTOS.hoy;
  if (ventas.length === 0) return <div className="aviso-suave" data-testid="sin-ventas">{sinVentas}</div>;
  return (
    <ul className="hoy-ventas" data-testid="ventas-de-hoy">
      {ventas.map((v) => {
        const anulada = v.estado === "anulada";
        const una = v.items.length === 1 ? v.items[0]! : null;
        const abre = abierta === v.id;
        return (
          <li key={v.id} className={anulada ? "anulada" : ""} data-testid="venta-dia">
            <button type="button" className="hoy-venta" onClick={() => setAbierta(abre ? null : v.id)} aria-expanded={abre}>
              <IconoDeMedio medio={v.medio_pago} tam={20} conFondo />
              <span className="hoy-venta-texto">
                <b>{una ? `${numero(Number(una.cantidad))} × ${una.descripcion}` : `${v.items.length} ${t.productos.corto}`}{anulada && <span className="hoy-anulada">{t.anulada.corto}</span>}</b>
                <small>{hora(v.fecha)} · {NOMBRE_DE_MEDIO[v.medio_pago as keyof typeof NOMBRE_DE_MEDIO] ?? v.medio_pago}{v.cliente ? ` · ${v.cliente}` : ""}</small>
              </span>
              <strong className="importe">{pesosCortos(v.total)}</strong>
              <Icono nombre={abre ? "abajo" : "derecha"} tam={18} />
            </button>
            {abre && (
              <ul className="hoy-detalle" data-testid="detalle-venta">
                {v.items.map((i, n) => <li key={n}><span>{numero(Number(i.cantidad))} × {i.descripcion}</span><span>{pesosCortos(i.subtotal)}</span></li>)}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
