import { irA } from "../rutas";
import { TEXTOS } from "../../textos";
import { Icono } from "../../../ui/iconos";
import css from "./Compras.module.css";

// Fija al pulgar: «Sacale foto a la factura» y escanear, que llevan al ingreso.
const t = TEXTOS.compras;

export function FotoDeLaFactura() {
  return (
    <div className={css.foto}>
      <button type="button" className={css.fotoBoton} onClick={() => irA("deposito/ingreso")} data-testid="sacale-foto">
        <Icono nombre="camera" tam={26} /><span><b>{t.sacaleFoto.corto}</b><small>{t.sacaleFotoDetalle.corto}</small></span>
      </button>
      <button type="button" className={css.escanear} onClick={() => irA("deposito/ingreso")} aria-label="Registrar la compra escaneando"><Icono nombre="scan-barcode" tam={26} /></button>
    </div>
  );
}
