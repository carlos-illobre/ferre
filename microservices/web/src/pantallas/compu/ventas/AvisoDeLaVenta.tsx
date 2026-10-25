import { Icono } from "../base/ui";
import css from "./AvisoDeLaVenta.module.css";

// Como la maqueta (decisión 133): verde oscuro y centrado sobre la barra del cobro; con el tacho y
// «Deshacer» si se quitó algo, o con el tilde para lo demás («No llevó»). Se va solo.
type Props = { aviso: { texto: string; deshacer?: () => void } | null; mensaje: string | null; alDeshacer: () => void };

export function AvisoDeLaVenta({ aviso, mensaje, alDeshacer }: Props) {
  if (!aviso && !mensaje) return null;
  return (
    <div className={`${css.aviso} anim-sube`} role="status" data-testid="mensaje">
      <Icono nombre={aviso?.deshacer ? "basura" : "tilde"} tam={20} />
      <span>{aviso ? aviso.texto : mensaje}</span>
      {aviso?.deshacer && <button type="button" onClick={alDeshacer}>Deshacer</button>}
    </div>
  );
}
