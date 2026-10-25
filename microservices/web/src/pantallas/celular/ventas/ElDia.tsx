import { fueSinConexion, nombreDelDia } from "../../../negocio/ventas";
import { pesosCortos } from "../../../formato";
import { Rodar } from "../../../plataforma/animacion";
import { TEXTOS } from "../../textos";
import { errorDelDia, hora, mayuscula } from "../../comun/ventas/textos-del-dia";
import { Icono } from "../componentes/base";
import { ResumenDelDia } from "./ResumenDelDia";
import type { VentasDelDiaCelular } from "./useVentasDelDia";
import { VentasCortas } from "./VentasCortas";
import css from "./VentasDelDia.module.css";

// El día que se mira y, cuando llega, su resumen, los tres números y las ventas.
const t = TEXTOS.hoy;

export function ElDia({ d }: { d: VentasDelDiaCelular }) {
  const { r } = d;
  return (
    <>
      <div className={css.fecha}>
        <div>
          <b data-testid="dia-que-se-mira">{r.esHoy ? `${t.hoy.corto}, ${nombreDelDia(r.dia)}` : mayuscula(nombreDelDia(r.dia))}{r.esHoy && <small> · {hora(new Date().toISOString())}</small>}</b>
          {!r.esHoy && <button type="button" className="enlace" onClick={() => d.setDia(null)} data-testid="volver-a-hoy">{t.volverAHoy.corto}</button>}
        </div>
        <button type="button" className={`${css.boton} chico`} onClick={() => d.setPanel("otro-dia")} data-testid="cambiar-fecha"><Icono nombre="calendario" tam={18} />{t.otroDia.corto}</button>
      </div>
      {r.resumen ? <ConElResumen d={d} /> : <SinElResumen d={d} />}
    </>
  );
}

function SinElResumen({ d: { r } }: { d: VentasDelDiaCelular }) {
  if (!r.error) return <div className="aviso-suave" aria-busy="true">{t.buscando.corto}…</div>;
  const sinConexion = fueSinConexion(r.error);
  return <div className="aviso-suave" data-testid={sinConexion ? "sin-conexion" : undefined}>{errorDelDia(r.error, r.esHoy, sinConexion, "corto")}</div>;
}

function ConElResumen({ d }: { d: VentasDelDiaCelular }) {
  const { r } = d;
  const resumen = r.resumen!;
  return (
    <>
      <ResumenDelDia r={r} />
      <div className={css.numeros} data-testid="numeros">
        <div><b data-testid="cuantas-ventas"><Rodar texto={String(resumen.ventas)} /></b><small>{t.ventas.corto}</small></div>
        <div><b data-testid="cuantos-productos"><Rodar texto={String(resumen.productos)} /></b><small>{t.productos.corto}</small></div>
        <div><b data-testid="ticket"><Rodar texto={resumen.ticket === null ? "—" : pesosCortos(resumen.ticket)} /></b><small>{t.ticket.corto}</small></div>
      </div>
      <div className={css.tituloFila}>
        <h2 className={css.titulo}>{t.titulo.corto}</h2>
        <span className={css.acciones}>
          {d.cambia && <button type="button" className={`${css.boton} chico`} onClick={() => d.setCambio({ venta: null })} data-testid="registrar-cambio"><Icono nombre="repetir" tam={18} />{t.registrarCambio.corto}</button>}
          {d.todas.length > 0 && <button type="button" className={`${css.boton} chico`} onClick={() => d.setPanel("buscar")} data-testid="abrir-buscar"><Icono nombre="buscar" tam={18} />Buscar</button>}
        </span>
      </div>
      <VentasCortas ventas={d.todas} buscado="" alAbrir={(v) => d.setAbierta(v.id)} sinVentas={r.esHoy ? t.sinVentasHoy.corto : t.sinVentasDia.corto} />
    </>
  );
}
