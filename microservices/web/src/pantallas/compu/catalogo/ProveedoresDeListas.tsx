import { descuentosDe, situacionDelProveedor, type ListaFila, type Proveedor } from "../../../negocio/catalogo";
import { TEXTOS } from "../../textos";
import { Boton, Icono, Vacio } from "../base/ui";
import type { ListasDeLaCompu } from "./useListasDeLaCompu";
import css from "./Listas.module.css";

// Los proveedores, con su lista vigente o vieja y cómo se calcula su costo; «/» los busca.
const t = TEXTOS.listas;

export function ProveedoresDeListas({ x }: { x: ListasDeLaCompu }) {
  return (
    <section className={css.prov} aria-labelledby="lv-proveedores">
      <h2 id="lv-proveedores" className={css.cab}>
        <b>{t.proveedores.largo}</b>{x.activos.length > 0 && <span className={css.cuenta}>{x.activos.length}</span>}
        {x.activos.length > 0 && <button type="button" className={css.mas} onClick={() => x.buscar((b) => (b === null ? "" : null))} aria-keyshortcuts="/" aria-expanded={x.buscado !== null}>{t.buscar.largo} <kbd className="tecla" aria-hidden="true">/</kbd></button>}
      </h2>
      {x.buscado !== null && (
        <label className={css.buscar}>
          <Icono nombre="buscar" tam={18} />
          <input ref={x.cajaProveedor} type="search" value={x.buscado} onChange={(e) => x.setBuscado(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); x.setBuscado(null); } }}
            placeholder={t.buscarProveedor.largo} aria-label={t.buscarProveedor.largo} autoComplete="off" data-testid="buscar-proveedor" />
        </label>
      )}
      <LosProveedores x={x} />
    </section>
  );
}

function LosProveedores({ x }: { x: ListasDeLaCompu }) {
  if (x.proveedores === null) return x.error ? null : <div className={`esqueleto ${css.esqueleto}`} aria-label="Cargando los proveedores" role="status" />;
  if (x.activos.length === 0) {
    return (
      <Vacio icono="proveedor" titulo="Todavía no hay proveedores" accion={<Boton variante="marino" icono="mas" onClick={() => x.setAltaAbierta(true)} data-testid="agregar-proveedor">Agregar el primer proveedor</Boton>}>
        El primer paso es agregar al proveedor, con sus descuentos y si sus precios traen IVA. Después cargás su planilla.
      </Vacio>
    );
  }
  if (x.aLaVista.length === 0) return <p className={css.nada}>Ningún proveedor con «{x.buscado}».</p>;
  return <ul className={css.proveedores} data-testid="estado-proveedores">{x.aLaVista.map((p) => <ElProveedor key={p.id} proveedor={p} ultima={x.ultima.get(p.id)} />)}</ul>;
}

// Cómo se calcula el costo de un proveedor: si sus precios traen IVA, sus descuentos y su lector.
const comoSeCalcula = (p: Proveedor) => [p.precios_incluyen_iva ? "Con IVA" : "Sin IVA", ...descuentosDe(p), p.lector ? `lector ${p.lector}` : "lector a mano"].join(" · ");
const ESTADO: Record<string, [string, (dias: number | null) => string]> = {
  vieja: ["ambar", (dias) => `Vieja · ${dias} días`], "sin lista": ["", () => "Sin lista"], "al día": ["verde", () => "Al día"],
};

function ElProveedor({ proveedor: p, ultima }: { proveedor: Proveedor; ultima: ListaFila | undefined }) {
  const { estado, dias } = situacionDelProveedor(ultima);
  const [clase, texto] = ESTADO[estado] ?? ["verde", () => "Vigente"];
  return (
    <li className={css.proveedor} aria-label={p.nombre}>
      <span className={`${css.punto} ${estado === "vieja" || estado === "sin lista" ? "vieja" : ""}`} aria-hidden="true" />
      <b>{p.nombre}</b>
      <span className={`${css.pastilla} ${clase}`}>{texto(dias)}</span>
      <span className={css.como}>{comoSeCalcula(p)}</span>
    </li>
  );
}
