import { TEXTOS } from "../../textos";
import { Icono } from "../componentes/base";
import css from "./Duplicados.module.css";

// «Es el mismo» y «Son distintos», en la barra fija de abajo, bajo el pulgar.
export function BarraDeDuplicados({ ocupado, alResolver }: { ocupado: boolean; alResolver: (accion: "unir" | "rechazar") => void }) {
  const t = TEXTOS.duplicados;
  return (
    <>
      <div className={css.hueco} aria-hidden="true" />
      <div className={css.barra}>
        <button type="button" className={css.mismo} disabled={ocupado} onClick={() => alResolver("unir")} data-testid="unir"><Icono nombre="unir" tam={22} />{t.esElMismo.corto}</button>
        <button type="button" className={css.distintos} disabled={ocupado} onClick={() => alResolver("rechazar")} data-testid="rechazar"><Icono nombre="cerrar" tam={22} />{t.sonDistintos.corto}</button>
      </div>
    </>
  );
}
