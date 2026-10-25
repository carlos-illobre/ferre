import { NOMBRE_DE_MEDIO, type Cobro } from "../../../negocio/ventas";
import { IconoDeMedio } from "../../IconoDeMedio";
import { Aviso, Boton, Hoja, Icono, hora, pesosCortos } from "../base/ui";
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
        <p className="detalle"><IconoDeMedio medio={cobro.medio} tam={16} />{NOMBRE_DE_MEDIO[cobro.medio]}{cobro.cliente ? ` · ${cobro.cliente}` : ""} · {cobro.productos} {cobro.productos === 1 ? "producto" : "productos"} · {hora(cobro.fecha)}{cobro.encolado ? "" : ". El stock ya se descontó."}</p>
      </div>
    </Hoja>
  );
}
