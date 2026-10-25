import { TEXTOS } from "../../textos";
import { Icono } from "../componentes/base";
import css from "./CodigoDesconocido.module.css";

// Un código que no está en el catálogo. Con la cámara abierta, «Asociar»: se cierra la cámara y se
// busca el producto; al elegirlo, el código queda en él.
type Props = { codigo: string; escaneando: boolean; alAsociar: () => void; alIgnorar: () => void };

export function CodigoDesconocido({ codigo, escaneando, alAsociar, alIgnorar }: Props) {
  return (
    <div className={css.aviso} data-testid="codigo-desconocido">
      <Icono nombre="alerta" tam={20} />
      <span><b>Código {codigo}</b><small>{TEXTOS.vender.noEstaEnElCatalogo.corto}</small></span>
      {escaneando ? <button type="button" onClick={alAsociar} data-testid="asociar-codigo">Asociar</button>
        : <button type="button" className={css.fantasma} onClick={alIgnorar}>Ignorar</button>}
    </div>
  );
}
