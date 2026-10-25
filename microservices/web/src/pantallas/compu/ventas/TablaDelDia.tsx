import { useEffect, useRef } from "react";
import { loQueSeLlevo, NOMBRE_DE_MEDIO, type Medio, type VentaDelDia } from "../../../negocio/ventas";
import { conUnidad } from "../../../negocio/catalogo";
import { nombreDeProducto } from "../../../formato";
import { IconoDeMedio } from "../../IconoDeMedio";
import { TEXTOS } from "../../textos";
import { Resaltar } from "../../comun/ventas/Resaltar";
import { Icono, Pastilla, hora, pesosCortos } from "../base/ui";
import css from "./VentasDelDia.module.css";

// La tabla del día. La elegida, siempre a la vista, y con el foco si estaba en la tabla.
const t = TEXTOS.hoy;
type Props = { ventas: VentaDelDia[]; buscado: string; elegida: VentaDelDia | null; alElegir: (v: VentaDelDia) => void };

export function TablaDelDia({ ventas, buscado, elegida, alElegir }: Props) {
  const tabla = useRef<HTMLDivElement>(null);
  useEffect(() => { if (tabla.current?.contains(document.activeElement)) tabla.current.querySelector<HTMLButtonElement>("[data-elegida='si']")?.focus({ preventScroll: true }); }, [elegida?.id]);
  useEffect(() => { tabla.current?.querySelector("[data-elegida='si']")?.scrollIntoView?.({ block: "nearest" }); }, [elegida?.id]);
  return (
    <div className={css.tabla} ref={tabla} data-flechas-propias data-testid="ventas-de-hoy-lista">
      <div className={`${css.fila} cab`} aria-hidden="true"><span>{t.columnaHora.largo}</span><span /><span>{t.queSeLlevo.largo}</span><span>{t.quienComo.largo}</span><span className="d">{t.columnaTotal.largo}</span><span /></div>
      {ventas.length === 0
        ? <p className={`detalle ${css.nada}`} data-testid="nada">{buscado.trim() ? `${t.nadaConEsto.largo} «${buscado.trim()}»` : "Ninguna venta acá."}</p>
        : ventas.map((v) => <FilaDelDia key={v.id} venta={v} buscado={buscado} elegida={v.id === elegida?.id} alElegir={() => alElegir(v)} />)}
    </div>
  );
}

// Un renglón: la hora, el medio, qué se llevó («1 × Martillo…» o «3 productos» con los primeros
// nombres), quién o cómo pagó y el total. La anulada, tachada; la corregida, marcada.
function FilaDelDia({ venta: v, buscado, elegida, alElegir }: { venta: VentaDelDia; buscado: string; elegida: boolean; alElegir: () => void }) {
  return (
    <button type="button" className={`${css.fila} ${v.estado === "anulada" ? "anulada" : ""}`} data-elegida={elegida ? "si" : "no"} aria-pressed={elegida} tabIndex={elegida ? 0 : -1} onClick={alElegir} data-testid="venta-dia">
      <span className="hora">{hora(v.fecha)}</span>
      <IconoDeMedio medio={v.medio_pago} tam={16} conFondo />
      <span className="que"><QueSeLlevo venta={v} buscado={buscado} /></span>
      <span className="quien"><QuienOComo venta={v} buscado={buscado} /></span>
      <span className="imp importe">{pesosCortos(v.total)}</span>
      <Icono nombre="derecha" tam={16} />
    </button>
  );
}

function QueSeLlevo({ venta: v, buscado }: { venta: VentaDelDia; buscado: string }) {
  const { una, mas } = loQueSeLlevo(v, buscado);
  if (!una) return <>{v.items.length} {t.productos.largo} <small>{v.items.map((i) => nombreDeProducto(i.descripcion).split(" ")[0]).join(", ")}</small></>;
  return <>{conUnidad(una.cantidad, una.unidad)} <Resaltar texto={nombreDeProducto(una.descripcion)} buscado={buscado} />{mas > 0 ? <small> y {mas} más</small> : null}</>;
}

function QuienOComo({ venta: v, buscado }: { venta: VentaDelDia; buscado: string }) {
  if (v.estado === "anulada") return <Pastilla tipo="mal" sinPunto>{t.anulada.largo}</Pastilla>;
  if ((v.correcciones ?? 0) > 0) return <Pastilla tipo="alerta" sinPunto>{t.corregida.largo}</Pastilla>;
  return v.cliente ? <Resaltar texto={v.cliente} buscado={buscado} /> : <>{NOMBRE_DE_MEDIO[v.medio_pago as Medio]}</>;
}
