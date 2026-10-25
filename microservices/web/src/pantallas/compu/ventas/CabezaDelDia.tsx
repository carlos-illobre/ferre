import { nombreDelDia } from "../../../negocio/ventas";
import { hora } from "../../../negocio/formato";
import { AlLadoDeLasPestanas } from "../../AlLadoDeLasPestanas";
import { TEXTOS } from "../../textos";
import { mayuscula } from "../../comun/ventas/textos-del-dia";
import { Boton } from "../base/ui";
import type { ListaDelDia } from "./useListaDelDia";
import css from "./VentasDelDia.module.css";

// Al lado de las pestañas: qué día se mira (hoy, hasta qué hora), volver a hoy y «Otro día» (F).
const t = TEXTOS.hoy;

export function CabezaDelDia({ l }: { l: ListaDelDia }) {
  const { r } = l;
  return (
    <AlLadoDeLasPestanas><div className="fila">
      <span className={css.fecha} data-testid="dia-que-se-mira">{mayuscula(nombreDelDia(r.dia))}{r.esHoy ? ` · ${t.hasta.largo.toLowerCase()} ${hora(new Date().toISOString())}` : ""}</span>
      {!r.esHoy && <button type="button" className="enlace" onClick={() => l.setDia(null)} data-testid="volver-a-hoy">{t.volverAHoy.largo}</button>}
      <Boton icono="calendario" onClick={() => l.setOtroDia(true)} accion="hoy.otro-dia" kbd data-testid="cambiar-fecha">{t.otroDia.largo}{" "}</Boton>
    </div></AlLadoDeLasPestanas>
  );
}
