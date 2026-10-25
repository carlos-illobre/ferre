import { useState } from "react";
import { NOMBRE_DE_MEDIO, empezarCorreccion, sePuedeCambiar, type Correccion, type VentaDelDia } from "../../../negocio/ventas";
import { pedirClientes } from "../../../negocio/catalogo";
import { IconoDeMedio } from "../../IconoDeMedio";
import { TEXTOS } from "../../textos";
import { hora } from "../../comun/ventas/textos-del-dia";
import { Hoja } from "../componentes/base";
import { ConfirmarAnulacion } from "./ConfirmarAnulacion";
import { CorregirEnLaHoja } from "./CorregirEnLaHoja";
import { ProductosDeLaVenta } from "./ProductosDeLaVenta";
import css from "./VentasDelDia.module.css";

// La hoja de una venta: la hora, el medio y el cliente; los tres verbos de la v2 (Corregir · Cambio ·
// Anular, specs/019) y sus productos. Corregir y anular piden el permiso según el día de la venta; el
// cambio, el de anular las del día, hasta 15 días (decisión 135).
const t = TEXTOS.hoy;
type Props = { venta: VentaDelDia; anula: boolean; cambia: boolean; esHoy: boolean; alCerrar: () => void; alCambio: () => void; alAviso: (texto: string) => void };

export function HojaDeLaVenta({ venta: v, anula, cambia, esHoy, alCerrar, alCambio, alAviso }: Props) {
  const [confirmando, setConfirmando] = useState(false);
  const [correccion, setCorreccion] = useState<Correccion | null>(null);
  const viva = v.estado !== "anulada";
  return (
    <Hoja titulo={`Venta de las ${hora(v.fecha)}`} alCerrar={alCerrar} testId="hoja-venta">
      <p className={css.hojaDetalle}><IconoDeMedio medio={v.medio_pago} tam={18} />{detalleDe(v, esHoy)}</p>
      {viva && (anula || cambia) && <Verbos venta={v} anula={anula} cambia={cambia} corrigiendo={Boolean(correccion)}
        alCorregir={() => { pedirClientes(); setCorreccion(correccion ?? empezarCorreccion(v)); }} alCambio={() => { setCorreccion(null); alCambio(); }} alAnular={() => setConfirmando(true)} />}
      {cambia && viva && <PasoElPlazo fecha={v.fecha} />}
      {correccion ? <CorregirEnLaHoja venta={v} c={correccion} alCambiar={setCorreccion} alDescartar={() => setCorreccion(null)} alGuardar={(m) => { setCorreccion(null); alAviso(m); alCerrar(); }} />
        : <ProductosDeLaVenta venta={v} alListo={alCerrar} />}
      {confirmando && <ConfirmarAnulacion venta={v} alCerrar={() => setConfirmando(false)} alAnular={() => { setConfirmando(false); alCerrar(); }} />}
    </Hoja>
  );
}

const detalleDe = (v: VentaDelDia, esHoy: boolean) =>
  `${NOMBRE_DE_MEDIO[v.medio_pago] ?? v.medio_pago}${v.cliente ? ` · ${v.cliente}` : ""}${esHoy ? "" : " · otro día"}${(v.correcciones ?? 0) > 0 ? " · corregida" : ""}`;

// Los tres verbos de la v2: Corregir · Cambio · Anular (specs/019).
type Verbos = { venta: VentaDelDia; anula: boolean; cambia: boolean; corrigiendo: boolean; alCorregir: () => void; alCambio: () => void; alAnular: () => void };
function Verbos({ venta: v, anula, cambia, corrigiendo, alCorregir, alCambio, alAnular }: Verbos) {
  const enPlazo = sePuedeCambiar(v.fecha);
  return (
    <div className={`segmentos ${css.verbos}`} role="group" aria-label="Qué hacer con la venta">
      {anula && <button type="button" className={corrigiendo ? "activo" : ""} aria-pressed={corrigiendo} onClick={alCorregir} data-testid="corregir">{t.corregir.corto}</button>}
      {cambia && <button type="button" disabled={!enPlazo} title={enPlazo ? undefined : t.pasoElPlazo.corto} onClick={alCambio} data-testid="cambio">{t.cambio.corto}</button>}
      {anula && <button type="button" className={css.anular} onClick={alAnular} data-testid="anular">{t.anular.corto}</button>}
    </div>
  );
}

// Fuera de los 15 días ya no se cambia: se dice debajo de los verbos.
function PasoElPlazo({ fecha }: { fecha: string }) {
  return sePuedeCambiar(fecha) ? null : <p className={css.hojaDetalle} data-testid="paso-el-plazo">{t.pasoElPlazo.corto}</p>;
}
