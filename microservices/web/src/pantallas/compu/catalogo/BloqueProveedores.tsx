import { diferenciaDeCosto, type Producto } from "../../../negocio/catalogo";
import { fecha, pesos } from "../../../negocio/formato";
import { TEXTOS } from "../../textos";
import { Boton, Icono } from "../base/ui";
import css from "./FichaAlLado.module.css";

const t = TEXTOS.ficha;
// «06/10»: el día y el mes de una lista, como en la v2.
const fechaCorta = (f: string | null | undefined) => (f ? fecha(f).slice(0, 5) : "");

// Todos los proveedores a la vista (RF-06, RF-113): el en uso con su inicial en verde y «en uso»;
// la estrella en el más barato; «Usar» en los demás, con la fecha de su lista y cuánto más caros son.
// El proveedor del que sale el costo: por su id o, si no, por su nombre.
const elEnUso = (p: Producto) => (p.proveedores ?? []).find((v) => v.proveedor_id === p.proveedor_id) ?? (p.proveedores ?? []).find((v) => v.proveedor === p.proveedor);

export function BloqueProveedores({ producto: p, alUsar }: { producto: Producto; alUsar: (proveedorId: string) => void }) {
  const todos = p.proveedores ?? [];
  if (!p.proveedor) return <section className={css.bloque}><h3>{t.proveedores.largo}</h3><p className={css.detalle}>{t.sinCosto.largo}</p></section>;
  const masBarato = todos[0]?.proveedor_id;
  const enUso = elEnUso(p);
  const otros = todos.filter((v) => v !== enUso);
  const costoEnUso = p.costo_neto === null ? null : Number(p.costo_neto);
  const estrella = <span className={css.estrella} title={t.masBarato.largo} data-testid="mas-barato"><Icono nombre="estrella" tam={15} /><span className="solo-lectores">{t.masBarato.largo}</span></span>;
  return (
    <section className={css.bloque} aria-labelledby="fal-proveedores">
      <h3 id="fal-proveedores">{t.proveedores.largo}<span className={css.der}>{Math.max(todos.length, 1)} · {t.elCostoSaleDe.largo}</span></h3>
      <ul className={css.provs} data-testid="otros-proveedores">
        <li className={css.prov} data-testid="proveedor-en-uso">
          <span className={`${css.ini} uso`} aria-hidden="true">{p.proveedor.trim().charAt(0).toUpperCase()}</span>
          <span className={css.provTexto}>
            <span className={css.provNombre}>{p.proveedor}{(enUso ? enUso.proveedor_id === masBarato : todos.length <= 1) && estrella}</span>
            <span className={css.detalle}>{[t.principalCorto.largo, p.fecha_lista ? `${t.lista.largo.toLowerCase()} ${fechaCorta(p.fecha_lista)}` : null].filter(Boolean).join(" · ")}</span>
          </span>
          <span className={css.provCosto}><b>{pesos(p.costo_neto)}</b><small>{t.enUso.largo}</small></span>
        </li>
        {otros.map((v) => (
          <li key={v.proveedor_id} className={css.prov}>
            <span className={css.ini} aria-hidden="true">{v.proveedor.trim().charAt(0).toUpperCase()}</span>
            <span className={css.provTexto}>
              <span className={css.provNombre}>{v.proveedor}{v.proveedor_id === masBarato && estrella}</span>
              <span className={css.detalle}>{[`${t.lista.largo} ${fechaCorta(v.fecha_lista)}`, pesos(v.costo_neto), diferenciaDeCosto(v.costo_neto ?? 0, costoEnUso)].filter(Boolean).join(" · ")}</span>
            </span>
            <Boton tam="chico" className={css.usar} aria-label={`Usar el costo de ${v.proveedor}`} onClick={() => alUsar(v.proveedor_id)} data-ficha-vertical="" data-testid="proveedor-de-producto">{t.usar.largo}</Boton>
          </li>
        ))}
      </ul>
    </section>
  );
}
