import { useEffect, useRef } from "react";
import type { Cobro } from "../../../negocio/ventas";
import { pesosCortos } from "../../../negocio/formato";
import { LoCobrado } from "../../comun/ventas/LoCobrado";
import { TEXTOS } from "../../textos";
import { Icono } from "../componentes/base";
import css from "./VentaRegistrada.module.css";

// La venta registrada (decisión 119): una ventana con el tilde, el total, el medio, el cliente,
// cuántos productos y la hora, «Ver en Ventas del día» y «Seguir vendiendo». Sin conexión dice que
// quedó guardada en el celular y que se envía sola.
type Props = { cobro: Cobro; veHoy: boolean; alCerrar: () => void; alVerHoy: () => void };

export function VentaRegistrada({ cobro, veHoy, alCerrar, alVerHoy }: Props) {
  const boton = useRef<HTMLButtonElement>(null);
  useEffect(() => { boton.current?.focus(); }, []);
  const que = cobro.encolado ? TEXTOS.vender.guardadaEnElCelular.corto : TEXTOS.vender.ventaRegistrada.corto;
  return (
    <div className={`hoja-fondo ${css.fondo}`} role="presentation">
      <div className={css.listo} role="dialog" aria-label={que} data-testid="exito">
        <span className={`${css.tilde} ${cobro.encolado ? css.pendiente : ""}`}><Icono nombre={cobro.encolado ? "subir" : "tilde"} tam={38} grosor={3} /></span>
        <h2>{que}</h2>
        <div className={`${css.total} importe`} data-testid="exito-total">{pesosCortos(cobro.total)}</div>
        {cobro.encolado && <div className={css.sinRed}><Icono nombre="alerta" tam={18} />{TEXTOS.vender.seEnviaSola.corto}</div>}
        <p className={css.detalle}>
          <LoCobrado cobro={cobro} tam={18} />
        </p>
        <div className={css.botones}>
          {veHoy && <button type="button" className="boton" onClick={alVerHoy} data-testid="ver-en-hoy"><Icono nombre="lista" tam={18} />Ver en Ventas del día</button>}
          <button ref={boton} type="button" className="boton tinta" onClick={alCerrar} data-testid="cerrar-exito">Seguir vendiendo</button>
        </div>
      </div>
    </div>
  );
}
