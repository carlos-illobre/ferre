import { useState } from "react";
import { diferenciaDeCosto, proveedoresDeLaFicha, type Producto } from "../../../negocio/catalogo";
import { fecha, pesos } from "../../../negocio/formato";
import { TEXTOS } from "../../textos";
import { Icono } from "../componentes/base";
import css from "./Ficha.module.css";

// El proveedor en uso (RF-113), como la v2: su inicial en verde, la estrella si es el más barato,
// «Proveedor principal · fecha» y su costo; «+N más» despliega los demás, con «Usar».
const t = TEXTOS.ficha;
const inicial = (nombre: string) => nombre.trim().charAt(0).toUpperCase();
const Estrella = () => <span className="ficha-estrella" title={t.masBarato.corto} data-testid="mas-barato"><Icono nombre="estrella" tam={16} /><span className="solo-lectores">{t.masBarato.corto}</span></span>;
type Props = { producto: Producto; alUsar: (proveedorId: string) => void };

export function TarjetaProveedor({ producto: p, alUsar }: Props) {
  const [abierta, setAbierta] = useState(false);
  if (!p.proveedor) return null;
  const prov = proveedoresDeLaFicha(p);
  return (
    <section className="tarjeta ficha-tarjeta" aria-label={t.proveedor.corto}>
      <div className={css.prov} data-testid="proveedor-en-uso">
        <span className="ficha-inicial" aria-hidden="true">{inicial(p.proveedor)}</span>
        <span className="ficha-proveedor-texto">
          <span className="ficha-proveedor-nombre">{p.proveedor}{prov.elMasBarato && <Estrella />}</span>
          <span className="ficha-detalle">{[t.principal.corto, p.fecha_lista ? fecha(p.fecha_lista).slice(0, 5) : null].filter(Boolean).join(" · ")}</span>
        </span>
        <span className={css.provDer}>
          <strong>{pesos(p.costo_neto)}</strong>
          {prov.otros.length > 0 && <VerLosOtros cuantos={prov.otros.length} abierta={abierta} alTocar={() => setAbierta((a) => !a)} />}
        </span>
      </div>
      {abierta && <LosOtros otros={prov.otros} masBarato={prov.masBarato} costoEnUso={prov.costoEnUso} alUsar={alUsar} />}
    </section>
  );
}

type Otros = ReturnType<typeof proveedoresDeLaFicha>;
function LosOtros({ otros, masBarato, costoEnUso, alUsar }: Pick<Otros, "otros" | "masBarato" | "costoEnUso"> & { alUsar: (id: string) => void }) {
  return (
    <ul className="ficha-otros" data-testid="otros-proveedores">
      {otros.map((v) => (
        <li key={v.proveedor_id}>
          <span className="ficha-inicial otro" aria-hidden="true">{inicial(v.proveedor)}</span>
          <span className="ficha-proveedor-texto">
            <span className="ficha-proveedor-nombre">{v.proveedor}{v.proveedor_id === masBarato && <Estrella />}</span>
            <span className="ficha-detalle">{[`${t.lista.corto} ${fecha(v.fecha_lista).slice(0, 5)}`, pesos(v.costo_neto), diferenciaDeCosto(v.costo_neto ?? 0, costoEnUso)].filter(Boolean).join(" · ")}</span>
          </span>
          <button type="button" className="boton chico" onClick={() => alUsar(v.proveedor_id)} aria-label={`Usar el costo de ${v.proveedor}`} data-testid="proveedor-de-producto">{t.usar.corto}</button>
        </li>
      ))}
    </ul>
  );
}

function VerLosOtros({ cuantos, abierta, alTocar }: { cuantos: number; abierta: boolean; alTocar: () => void }) {
  return (
    <button type="button" className={css.mas} onClick={alTocar} aria-expanded={abierta} aria-label={abierta ? t.esconderProveedores.corto : t.verProveedores.corto} data-testid="ver-proveedores">
      {abierta ? t.menos.corto : `+${cuantos} ${t.mas.corto}`}<Icono nombre={abierta ? "arriba" : "abajo"} tam={16} />
    </button>
  );
}
