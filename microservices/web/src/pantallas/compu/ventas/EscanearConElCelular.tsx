import { useState } from "react";
import { VincularParaEscanear } from "./VincularParaEscanear";
import css from "./EscanearConElCelular.module.css";

// Con el celular vinculado: «Escanear con el celular» y, mientras escanea, «El celular está
// escaneando» (de la v4) en lugar del botón.
export function EscanearConElCelular({ alVincular }: { alVincular: (puestoId: string) => void }) {
  const [escaneando, setEscaneando] = useState(false);
  if (!escaneando) return <VincularParaEscanear vinculado alVincular={alVincular} alPedir={() => setEscaneando(true)} comoV2={{ clase: css.escanear }} />;
  return (
    <div className={css.camara} role="status" data-testid="celular-escaneando">
      <span className={css.vivo} aria-hidden="true" />
      <span className={css.texto}>El celular está escaneando<small>Lo que lea entra acá</small></span>
      <span className={css.graba} aria-hidden="true" />
      <button type="button" onClick={() => setEscaneando(false)} data-testid="dejar-de-escanear">Detener</button>
    </div>
  );
}
