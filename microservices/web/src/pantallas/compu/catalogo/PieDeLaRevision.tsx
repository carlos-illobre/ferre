import { fraccionAplicada, type Avance, type Cargada } from "../../../negocio/catalogo";
import { numero } from "../../../negocio/formato";
import { TEXTOS } from "../../textos";
import { Icono, Progreso } from "../base/ui";
import css from "./Listas.module.css";

// Al pie: «Descartar» y «Aplicar»; aplicando, cuánto va (tarda un rato, la pantalla puede quedar abierta).
const t = TEXTOS.listas;
type Props = { r: Cargada["resumen"]; progreso: Avance | null; ocupado: boolean; alAplicar: () => void; alDescartar: () => void };

export function PieDeLaRevision({ r, progreso, ocupado, alAplicar, alDescartar }: Props) {
  if (progreso) return <Aplicando r={r} progreso={progreso} />;
  return (
    <footer className={css.pie}>
      <button type="button" className={css.descartar} onClick={alDescartar} disabled={ocupado} aria-keyshortcuts="Alt+D" data-testid="descartar">{t.descartar.largo} <kbd className="tecla" aria-hidden="true">Alt D</kbd></button>
      <span className={css.nota}><Icono nombre="candado" tam={16} />{t.nadaCambiaHastaAplicar.largo}</span>
      <span className={`${css.nota} tenue`} aria-hidden="true"><kbd className="tecla">↑</kbd><kbd className="tecla">↓</kbd><kbd className="tecla">Espacio</kbd></span>
      <button type="button" className={css.aplicar} onClick={alAplicar} disabled={ocupado} aria-keyshortcuts="Control+Enter" data-testid="aplicar">
        Aplicar · cambian {numero(r.nuevos + r.modificados)} precios <kbd className="tecla" aria-hidden="true">Ctrl Enter</kbd>
      </button>
    </footer>
  );
}

function Aplicando({ r, progreso }: { r: Cargada["resumen"]; progreso: Avance }) {
  const texto = progreso.etapa === "duplicados" ? "Precios guardados. Buscando duplicados con otros proveedores…" : `Guardando precios… ${numero(progreso.procesadas)} de ${numero(progreso.total ?? r.leidas)}`;
  return (
    <div className={css.aplicando} aria-label="Aplicando la lista">
      <Progreso fraccion={fraccionAplicada(progreso, r.leidas)} texto={texto} />
      <span className="detalle">Tarda un rato. Podés dejar esta pantalla abierta; cuando termina te avisa.</span>
    </div>
  );
}
