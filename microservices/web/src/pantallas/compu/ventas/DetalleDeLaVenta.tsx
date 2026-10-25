import type { VentaDelDia } from "../../../negocio/ventas";
import { conUnidad } from "../../../negocio/catalogo";
import { nombreDeProducto, pesosCortos } from "../../../negocio/formato";
import { TEXTOS } from "../../textos";
import { Aviso, Boton, Icono } from "../base/ui";
import { MiniaturaDeProducto } from "./MiniaturaDeProducto";

// Mirando la venta: sus productos, el total, «Corregir» (E) y «Anular» (Supr), y cuántas veces se corrigió.
const t = TEXTOS.hoy;
type Props = { venta: VentaDelDia; anula: boolean; alCorregir: () => void; alAnular: () => void };

export function DetalleDeLaVenta({ venta: v, anula, alCorregir, alAnular }: Props) {
  const anulada = v.estado === "anulada";
  const correcciones = v.correcciones ?? 0;
  return (
    <>
      <ul className="renglones" data-testid="detalle-venta">
        {v.items.map((i, n) => (
          <li key={i.id ?? n} className="rv">
            <MiniaturaDeProducto url={i.foto_url} />
            <span className="nom-det"><b>{nombreDeProducto(i.descripcion)}</b><small>{conUnidad(i.cantidad, i.unidad)} × {pesosCortos(i.precio_unitario)}</small></span>
            <span className="st importe">{pesosCortos(i.subtotal)}</span>
          </li>
        ))}
      </ul>
      <div className="tot"><span>{t.columnaTotal.largo}</span><b className={`importe ${anulada ? "tachado" : ""}`}>{pesosCortos(v.total)}</b></div>
      {anulada ? <Aviso tipo="alerta">{t.anuladaDetalle.largo}</Aviso> : anula && (
        <div className="acciones">
          <Boton icono="editar" onClick={alCorregir} accion="hoy.corregir" kbd data-testid="corregir">{t.corregir.largo}{" "}</Boton>
          <Boton variante="peligro" icono="prohibido" onClick={alAnular} accion="hoy.anular" kbd data-testid="anular">{t.anular.largo}{" "}</Boton>
        </div>
      )}
      <div className="rastro"><Icono nombre="reloj" tam={16} />{correcciones > 0 ? `Corregida ${correcciones === 1 ? "una vez" : `${correcciones} veces`}` : t.sinCorrecciones.largo}</div>
    </>
  );
}
