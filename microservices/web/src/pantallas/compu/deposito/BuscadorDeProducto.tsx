import { useEffect, useId, useState, type ReactNode, type RefObject } from "react";
import { busquedaAlDia, esperarBusqueda } from "../../../negocio/catalogo";
import { Buscador } from "../base/ui";
import { detalleDe, type Producto } from "./deposito-comun";
import css from "./Deposito.module.css";

// Busca mientras se escribe. Con el foco en la caja se marca el de al lado, se elige el marcado y se limpia. Los resultados flotan
// debajo de la caja; si no hay, se ofrece agregarlo como producto nuevo (Ingreso).
type Props = {
  consulta: string; alCambiar: (v: string) => void; resultados: Producto[]; alElegir: (p: Producto) => void;
  alCrear?: (descripcion: string) => void; alEscanear?: () => void; aLaDerecha?: (p: Producto) => ReactNode;
  cajaRef?: RefObject<HTMLInputElement>; placeholder: string; disabled?: boolean; autoFoco?: boolean;
  primero?: string | null; // el proveedor cuyos productos van primero (Ingreso)
};

export function BuscadorDeProducto(props: Props) {
  const { consulta, alCambiar, cajaRef, placeholder, disabled, alEscanear, autoFoco } = props;
  const b = useBuscadorDeProducto(props);
  return (
    <div className={css.buscador}>
      <Buscador valor={consulta} alCambiar={alCambiar} placeholder={placeholder} disabled={disabled} acciones={b.acciones} cajaRef={cajaRef} alEscanear={alEscanear} autoFoco={autoFoco}
        controla={b.conLista ? b.id : undefined} activo={b.conLista ? `${b.id}-${b.marcado}` : undefined} />
      {b.conLista && <Sugerencias props={props} id={b.id} marcado={b.marcado} ofreceCrear={b.ofreceCrear} />}
      {b.abierta && b.total === 0 && <p className={css.nada} role="status">Nada con «{b.texto}». Probá con otra palabra o con el código.</p>}
    </div>
  );
}

function useBuscadorDeProducto({ consulta, alCambiar, resultados, alElegir, alCrear, disabled, primero }: Props) {
  const [marcado, setMarcado] = useState(0);
  const id = useId();
  useEffect(() => { setMarcado(0); }, [consulta]);
  const texto = consulta.trim();
  const abierta = texto !== "" && !disabled;
  const ofreceCrear = Boolean(alCrear) && abierta && resultados.length === 0;
  const total = resultados.length + (ofreceCrear ? 1 : 0);
  // Si el servidor todavía no contestó lo escrito, Enter espera esa respuesta (specs/018).
  function enter() {
    if (!busquedaAlDia(texto, primero)) { void esperarBusqueda(texto, 16, primero).then((r) => { if (r[0]) alElegir(r[0]); else if (alCrear && !disabled) alCrear(texto); }); return; }
    const p = resultados[marcado];
    if (p) alElegir(p); else if (ofreceCrear) alCrear?.(texto);
  }
  // Sin resultados a la vista, marcar no aplica y se recorre la pantalla.
  const marcar = (paso: number) => () => (total > 0 ? setMarcado((i) => Math.min(Math.max(i + paso, 0), total - 1)) : false);
  const acciones = {
    "lista.siguiente": marcar(1),
    "lista.anterior": marcar(-1),
    "lista.elegir": enter,
    "lista.salir": () => (consulta ? alCambiar("") : false),
  };
  return { id, marcado, texto, abierta, ofreceCrear, total, conLista: abierta && total > 0, acciones };
}

function Sugerencias({ props: { resultados, alElegir, alCrear, aLaDerecha, consulta }, id, marcado, ofreceCrear }: { props: Props; id: string; marcado: number; ofreceCrear: boolean }) {
  const texto = consulta.trim();
  return (
    <ul id={id} role="listbox" aria-label="Productos encontrados" className={`lista ${css.sugerencias}`} data-testid="sugerencias">
      {resultados.map((p, i) => (
        // mousedown no saca el foco de la caja: se sigue escribiendo después de elegir.
        <li key={p.id} id={`${id}-${i}`} role="option" aria-selected={i === marcado} className="renglon" onMouseDown={(e) => e.preventDefault()} onClick={() => alElegir(p)}>
          <span className="nombre">{p.descripcion}</span>
          {aLaDerecha?.(p)}
          <span className="detalle">{detalleDe(p) || "Sin marca ni proveedor"}</span>
        </li>
      ))}
      {ofreceCrear && (
        <li id={`${id}-0`} role="option" aria-selected className="renglon" onMouseDown={(e) => e.preventDefault()} onClick={() => alCrear?.(texto)} data-testid="agregar-nuevo">
          <span className="nombre">Agregar «{texto}» como producto nuevo</span>
          <span className="detalle">No está en el catálogo. Le ponés la cantidad y el costo del comprobante.</span>
        </li>
      )}
    </ul>
  );
}
