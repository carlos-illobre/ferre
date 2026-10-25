import type { Cobro } from "../../../negocio/ventas";
import { LoCobrado } from "../../comun/ventas/LoCobrado";
import { Aviso, Boton, Hoja, Icono, pesosCortos } from "../base/ui";
import css from "./VentaRegistrada.module.css";

// La venta registrada (como en el celular): el total, el medio, cuántos productos y la hora;
// «Seguir vendiendo» (Enter) y «Ver en Ventas del día». Sin conexión, que se envía sola.
export function VentaRegistrada({ cobro, alCerrar, alVerHoy }: { cobro: Cobro; alCerrar: () => void; alVerHoy: () => void }) {
  const que = cobro.encolado ? "Guardada en este dispositivo" : "Venta registrada";
  return (
    <Hoja titulo={que} alCerrar={alCerrar} testId="exito"
      pie={<><Boton icono="ventas" onClick={alVerHoy} data-testid="ver-en-hoy">Ver en Ventas del día</Boton><Boton variante="marino" autoFocus onClick={alCerrar} data-testid="cerrar-exito">Seguir vendiendo</Boton></>}>
      <div className={css.listo}>
        <span className={`${css.tilde} ${cobro.encolado ? css.pendiente : ""}`}><Icono nombre={cobro.encolado ? "nube" : "tilde"} tam={34} grosor={3} /></span>
        <strong className={`importe ${css.total}`} data-testid="exito-total">{pesosCortos(cobro.total)}</strong>
        {cobro.encolado && <Aviso tipo="alerta">Sin conexión: quedó guardada en este dispositivo y se envía sola cuando vuelva internet.</Aviso>}
        <p className="detalle"><LoCobrado cobro={cobro} tam={16} largo /></p>
      </div>
    </Hoja>
  );
}
