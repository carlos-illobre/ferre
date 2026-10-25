import { textoDeError } from "../../../negocio/del-servidor";
import { conFiltros, nombreDe, primerNombre, rangoDeLaPagina, type Evento, type Periodo } from "../../../negocio/actividad";
import { Iniciales } from "../../iconos-de-negocio";
import { horaDe, queFue } from "../../comun/negocio/actividad-en-palabras";
import { importeYDetalle } from "../../comun/negocio/registro";
import { Icono } from "../../../ui/iconos";
import { FiltrosDelCelular, PERIODOS } from "./FiltrosDelCelular";
import { HojaDelEventoDelCelular } from "./HojaDelEventoDelCelular";
import { useActividadDelCelular, type ActividadDelCelular } from "./useActividadDelCelular";
import css from "./Actividad.module.css";

const nombreDelPeriodo = (periodo: Periodo, desde: string, hasta: string) =>
  periodo === "rango" ? (desde || hasta ? "En esos días" : "Todo") : PERIODOS.find((p) => p.valor === periodo)!.nombre;

// Quién hizo qué en el celular, como la v2 («Registro», decisión 148): tres números arriba, los
// filtros en pastillas (período, quién y tipo), una tarjeta por acción y, abajo, «Nuevas» y
// «Anteriores». Al tocar una acción sube la hoja con todo. Es de solo lectura.
export function Actividad() {
  const x = useActividadDelCelular();
  const { filtros: f, datos } = x;
  const periodo = nombreDelPeriodo(f.periodo, f.desde, f.hasta);
  return (
    <div data-testid="auditoria" className="ac2">
      <TresNumeros x={x} periodo={periodo} />
      <FiltrosDelCelular x={x} periodo={periodo} />
      <Cuenta x={x} />
      <div className={css.lista}>{(datos?.eventos ?? []).map((e) => <EventoDelCelular key={e.id} e={e} alAbrir={() => x.setAbierto(e)} />)}</div>
      {datos && datos.total > 0 && <Paginador x={x} />}
      {x.abierto && <HojaDelEventoDelCelular evento={x.abierto} alCerrar={() => x.setAbierto(null)} />}
    </div>
  );
}

// Cuántas acciones hay con los filtros puestos o, si no hay ninguna, por qué.
function Cuenta({ x: { datos, error, filtros: f } }: { x: ActividadDelCelular }) {
  if (!datos) return <div className={css.total} role="status" data-testid="cuenta"><span>{error ? textoDeError(error, "No se pudo traer el registro") : "Trayendo el registro…"}</span></div>;
  return (
    <>
      <div className={css.total} role="status" data-testid="cuenta"><b>{datos.total.toLocaleString("es-AR")} {datos.total === 1 ? "acción" : "acciones"}</b><span>la más nueva primero</span></div>
      {datos.total === 0 && <div className="aviso-suave">{conFiltros(f) ? "No hay acciones con esos filtros. Probá con otro día, otra persona u otro tipo." : "Hoy todavía no hay acciones. Apenas alguien venda, compre o cambie un precio, queda anotado acá."}</div>}
    </>
  );
}

// Cuántas hubo en el período, cuántas anuladas (tocarlo filtra) y «A revisar», que todavía no se sabe.
function TresNumeros({ x, periodo }: { x: ActividadDelCelular; periodo: string }) {
  const soloAnuladas = x.filtros.tipo === "venta.anulada";
  return (
    <div className={css.res}>
      <div className={css.num}><span>{periodo}</span><b>{x.todas ?? "—"}</b></div>
      <button type="button" className={`${css.num} rojo ${soloAnuladas ? "puesto" : ""}`} aria-pressed={soloAnuladas} onClick={() => x.filtrar({ tipo: soloAnuladas ? "" : "venta.anulada", grupo: "" })}><span>Anuladas</span><b>{x.anuladas ?? "—"}</b></button>
      <div className={`${css.num} ambar`} title="Todavía no se sabe qué hay para revisar"><span>A revisar</span><b>—</b></div>
    </div>
  );
}

function EventoDelCelular({ e, alAbrir }: { e: Evento; alAbrir: () => void }) {
  const que = queFue(e);
  const { importe, detalle } = importeYDetalle(e);
  return (
    <button type="button" className={`${css.ac} ${que.tono === "error" ? "rojo" : ""}`} onClick={alAbrir} data-testid="evento">
      <span className={`${css.tipo} ${que.tono ?? ""}`}><Icono nombre={que.icono} /></span>
      <span className={css.texto}><span className={css.q}>{que.nombre}{importe}</span><span className={css.d}><Iniciales nombre={nombreDe(e) ?? "Sistema"} clave={e.quien?.id ?? "sistema"} tam="s" />{primerNombre(nombreDe(e))}{detalle && ` · ${detalle}`}</span></span>
      <span className={css.h}>{horaDe(e.fecha)}</span>
    </button>
  );
}

function Paginador({ x }: { x: ActividadDelCelular }) {
  const { desde, hasta } = rangoDeLaPagina(x.datos);
  return (
    <nav className={css.pager} data-testid="paginado" aria-label="Páginas del registro">
      <button type="button" className={css.boton} disabled={x.pagina <= 1} onClick={() => x.setPagina((p) => p - 1)} data-testid="anteriores"><Icono nombre="chevron-left" tam={18} />Nuevas</button>
      <span className={css.t}>{x.datos?.pagina} de {x.paginas}<small>{desde} a {hasta}</small></span>
      <button type="button" className={css.boton} disabled={x.pagina >= x.paginas} onClick={() => x.setPagina((p) => p + 1)} data-testid="siguientes">Anteriores<Icono nombre="chevron-right" tam={18} /></button>
    </nav>
  );
}
