import { abreviarUnidad, enteras, unidadDe } from "../../../negocio/catalogo";
import { diferenciaConLaLista, type Renglon } from "../../../negocio/deposito";
import { pesos, porcentaje } from "../../../formato";
import { Contador, Explicado, Pastilla } from "../base/ui";
import { FotoDeProducto } from "./FotoDeProducto";
import { detalleDe } from "./deposito-comun";
import type { IngresoDeLaCompu } from "./useIngresoDeLaCompu";
import css from "./Deposito.module.css";

// Las celdas de un renglón del ingreso.
type Props = { x: IngresoDeLaCompu; r: Renglon };

// El producto con su foto, o la descripción a escribir si es nuevo.
export function NombreDelRenglon({ x, r }: Props) {
  if (r.producto) {
    return <span className="con-foto-de-producto"><FotoDeProducto producto={r.producto} alCambiar={(f) => x.ingreso.cambiarFoto(r, f)} /><span><span className="nombre">{r.descripcion}</span><span className="detalle compras-bajo-nombre">{detalleDe(r.producto) || "Sin marca ni proveedor"}</span></span></span>;
  }
  return (
    <span className="compras-nuevo">
      <Pastilla tipo="azul" sinPunto>Producto nuevo</Pastilla>
      <input className="entrada" value={r.descripcion} placeholder="Descripción del producto nuevo" aria-label="Descripción del producto nuevo" aria-invalid={!r.descripcion.trim()} onChange={(e) => x.ingreso.cambiar(r.clave, { descripcion: e.target.value })} data-testid="descripcion-nueva" />
    </span>
  );
}

// La cantidad: entera, o con un decimal a granel (kg, m, l).
export function CantidadDelRenglon({ x, r }: Props) {
  const unidad = unidadDe(r.producto);
  const cambiar = x.ingreso.cambiar;
  return (
    <span className="compras-cantidad">
      {enteras(unidad)
        ? <Contador valor={r.cantidad} entera sinBotones alCambiar={(v) => cambiar(r.clave, { cantidad: Math.floor(v) })} etiqueta={`Cantidad de ${r.descripcion || "producto nuevo"}`} />
        : <Contador valor={r.cantidad} entera={false} sinBotones siQuedaVacio={1} alCambiar={(v) => cambiar(r.clave, { cantidad: v })} etiqueta={`Cantidad de ${r.descripcion}, en ${unidad}`} />}
      <span className="detalle" data-testid="unidad-ingreso">{abreviarUnidad(unidad)}</span>
    </span>
  );
}

export function CostoDelRenglon({ x, r }: Props) {
  return (
    <label className={`con-prefijo compras-costo ${r.costo === null ? "falta" : ""}`}>
      <span aria-hidden="true">$</span>
      <input inputMode="decimal" placeholder="costo" value={r.costoTexto} aria-label={`Costo unitario sin IVA de ${r.descripcion || "producto nuevo"}`} aria-invalid={x.intento && r.costo === null ? true : undefined} onFocus={(e) => e.target.select()}
        onChange={(e) => x.ingreso.cambiarCosto(r.clave, e.target.value)} data-testid="costo" />
    </label>
  );
}

// El costo según la lista y, si el comprobante dice otro, cuánto subió o bajó.
export function SegunLaLista({ r }: { r: Renglon }) {
  const dif = diferenciaConLaLista(r);
  if (r.costoLista === null) return <span className="detalle">{r.producto ? "sin costo de lista" : "no tiene lista"}</span>;
  if (dif === null || Math.abs(dif) < 0.05) return <span className="detalle">{dif === null ? `lista ${pesos(r.costoLista)}` : `igual que la lista (${pesos(r.costoLista)})`}</span>;
  return <CambioContraLaLista r={r} costoLista={r.costoLista} dif={dif} />;
}

function CambioContraLaLista({ r, costoLista, dif }: { r: Renglon; costoLista: number; dif: number }) {
  const sube = dif > 0;
  return (
    <span className="compras-segun-lista">
      <span className="detalle">lista {pesos(costoLista)}</span>
      <Explicado className={`${css.dif} ${sube ? "falta" : "sobra"}`} valor={`${porcentaje(dif)} ${sube ? "subió" : "bajó"}`} titulo="Diferencia contra la lista" pasos={[
        `Costo según la lista${r.producto?.proveedor ? ` de ${r.producto.proveedor}` : ""}: ${pesos(costoLista)}`,
        `Costo del comprobante: ${pesos(r.costo)}`,
        `${pesos(r.costo)} contra ${pesos(costoLista)}: ${sube ? "subió" : "bajó"} ${porcentaje(Math.abs(dif)).replace("+", "")}. Al registrar, el costo del comprobante pasa a ser el vigente.`,
      ]} />
    </span>
  );
}
