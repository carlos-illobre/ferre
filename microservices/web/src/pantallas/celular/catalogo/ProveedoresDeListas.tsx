import { useState } from "react";
import { buscarProveedores, descuentosDe, situacionDelProveedor, type ListaFila, type Proveedor } from "../../../negocio/catalogo";
import { TEXTOS } from "../../textos";
import { diaYMes } from "../../comun/catalogo/fechas-de-listas";
import { mayuscula } from "../../comun/ventas/textos-del-dia";
import { Icono } from "../componentes/base";
import css from "./Listas.module.css";

// Los proveedores, con su lista vigente o vieja; la lupa los busca y quien carga listas los agrega.
const t = TEXTOS.listas;
const miles = (n: number | string) => Number(n).toLocaleString("es-AR");
type Props = { activos: Proveedor[]; ultima: Map<string, ListaFila>; esDueno: boolean; alAgregar: () => void };

export function ProveedoresDeListas({ activos, ultima, esDueno, alAgregar }: Props) {
  const [buscado, setBuscado] = useState("");
  const [buscando, setBuscando] = useState(false);
  const hay = activos.length > 0;
  return (
    <>
      <h2 className={css.sec}>
        <b>{t.proveedores.corto}</b>{hay && <span className={css.cuenta}>{activos.length}</span>}
        {hay && <button type="button" className={css.lupa} onClick={() => setBuscando((b) => !b)} aria-label={t.buscarProveedor.corto} aria-expanded={buscando}><Icono nombre="buscar" tam={20} /></button>}
        {esDueno && <button type="button" className={`enlace ${css.agregar}`} onClick={alAgregar} data-testid="agregar-proveedor">+ Agregar</button>}
      </h2>
      {!hay ? <div className="aviso-suave">Todavía no hay proveedores cargados.</div> : (
        <>
          {buscando && (
            <label className="lp-buscar">
              <Icono nombre="buscar" tam={22} />
              <input type="search" value={buscado} onChange={(e) => setBuscado(e.target.value)} placeholder={t.buscarProveedor.corto} aria-label={t.buscarProveedor.corto} autoComplete="off" autoFocus data-testid="buscar-proveedor" />
            </label>
          )}
          <ul className={css.grupo} data-testid="estado-proveedores">
            {buscarProveedores(activos, buscado).map((p) => <ElProveedor key={p.id} p={p} l={ultima.get(p.id)} />)}
          </ul>
        </>
      )}
    </>
  );
}

const PASTILLA: Record<string, string> = { vieja: "ambar", "sin lista": "" };

function ElProveedor({ p, l }: { p: Proveedor; l: ListaFila | undefined }) {
  const { estado, dias } = situacionDelProveedor(l);
  return (
    <li className={css.row} role="row" aria-label={p.nombre}>
      <span className={css.ic}><Icono nombre="proveedor" tam={20} /></span>
      <span className={css.n}>{p.nombre}</span>
      <span className={`${css.pastilla} ${PASTILLA[estado] ?? "verde"}`}>{mayuscula(estado)}</span>
      <span className={css.d}>{l ? <>Lista del {diaYMes(l.fecha_lista)} · hace <b>{dias} {dias === 1 ? "día" : "días"}</b></> : "Nunca se cargó una lista"}</span>
      <ComoSeLee p={p} l={l} />
    </li>
  );
}

// Cuántos productos trajo su última lista, su lector y sus descuentos, si hay algo de eso.
function ComoSeLee({ p, l }: { p: Proveedor; l: ListaFila | undefined }) {
  const datos = [l ? `${miles(l.resumen.leidas)} productos` : null, p.lector, descuentosDe(p).join(" · ") || null].filter(Boolean);
  return datos.length > 0 ? <span className={css.d}>{datos.join(" · ")}</span> : null;
}
