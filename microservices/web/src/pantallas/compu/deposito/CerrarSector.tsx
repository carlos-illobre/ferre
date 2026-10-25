import { useState } from "react";
import type { Cierre, Conteo } from "../../../negocio/deposito";
import { Aviso, Boton, Hoja } from "../base/ui";
import { mensajeDe, plural } from "./deposito-comun";
import css from "./Contar.module.css";

// Cerrar no se deshace: antes muestra qué se contó, qué tiene diferencia y qué quedó sin
// contar, y las dos salidas se leen completas.
export function CerrarSector({ conteo, cerrarConteo, conDiferencia, enLinea, pendientes, alCerrar, alCerrado }: { conteo: Conteo; cerrarConteo: (faltantesEnCero: boolean) => Promise<Cierre>; conDiferencia: number; enLinea: boolean; pendientes: number; alCerrar: () => void; alCerrado: (c: Cierre) => void }) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const faltan = conteo.sin_contar.length;
  const bloqueado = ocupado || !enLinea || pendientes > 0;
  async function cerrar(faltantesEnCero: boolean) {
    if (bloqueado) return;
    setOcupado(true); setError(null);
    try {
      alCerrado(await cerrarConteo(faltantesEnCero));
    } catch (e) {
      setError(mensajeDe(e, "No se cerró: se cortó la conexión. Lo contado sigue guardado; probá de nuevo cuando vuelva internet."));
      setOcupado(false);
    }
  }
  return (
    <Hoja titulo={`¿Cerrar ${conteo.sector}?`} alCerrar={alCerrar} testId="confirmar-cierre">
      <dl className={css.cierreNumeros}>
        <div><dt>Contados</dt><dd className="importe">{conteo.renglones.length}</dd></div>
        <div><dt>Con diferencia</dt><dd className="importe">{conDiferencia}</dd></div>
        <div><dt>Sin contar</dt><dd className="importe">{faltan}</dd></div>
      </dl>
      <p>Cada diferencia se aplica al stock como un ajuste que queda explicado en los movimientos del producto. <strong>Cerrar no se puede deshacer.</strong></p>
      {faltan > 0 && <QueHacerConLosQueFaltan faltan={faltan} />}
      <Aviso tipo="alerta">{porQueNoSeCierra(enLinea, pendientes)}</Aviso>
      <Aviso tipo="error">{error}</Aviso>
      <div className={css.cierreBotones}>
        {faltan > 0 && <Boton variante="peligro" disabled={bloqueado} onClick={() => void cerrar(true)} data-testid="cerrar-en-cero">Cerrar y poner en cero los no contados</Boton>}
        <Boton variante="marino" disabled={bloqueado} onClick={() => void cerrar(false)} data-testid="cerrar-confirmar">{ocupado ? "Cerrando…" : faltan > 0 ? "Cerrar y dejar los no contados como están" : `Cerrar ${conteo.sector}`}</Boton>
        <Boton onClick={alCerrar} disabled={ocupado}>Seguir contando</Boton>
      </div>
    </Hoja>
  );
}

function QueHacerConLosQueFaltan({ faltan }: { faltan: number }) {
  const uno = faltan === 1;
  return <p>{uno ? "Hay un producto del sector que no contaste." : `Hay ${faltan} productos del sector que no contaste.`} Elegí qué pasa con {uno ? "él" : "ellos"}: si no {uno ? "está" : "están"} más en la estantería, van a cero.</p>;
}

function porQueNoSeCierra(enLinea: boolean, pendientes: number): string | null {
  if (!enLinea) return "Sin conexión: cerrar el sector necesita internet. Lo contado queda guardado.";
  return pendientes > 0 ? `Todavía hay ${plural(pendientes, "producto contado que no llegó", "productos contados que no llegaron")} al servidor. Esperá un momento y volvé a intentar.` : null;
}
