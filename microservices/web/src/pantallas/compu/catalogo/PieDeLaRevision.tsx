import { fraccionAplicada, type Avance, type Cargada } from "../../../negocio/catalogo";
import { numero } from "../../../negocio/formato";
import { TEXTOS } from "../../textos";
import { useEtiqueta } from "../../../plataforma/comandos";
import { Atajo, Icono, Progreso } from "../base/ui";
import css from "./Listas.module.css";

// Al pie: «Descartar» y «Aplicar»; aplicando, cuánto va (tarda un rato, la pantalla puede quedar abierta).
const t = TEXTOS.listas;
type Props = { r: Cargada["resumen"]; progreso: Avance | null; ocupado: boolean; alAplicar: () => void; alDescartar: () => void };

export function PieDeLaRevision({ r, progreso, ocupado, alAplicar, alDescartar }: Props) {
  const [teclaDescartar, teclaAplicar] = [useEtiqueta("listas.descartar"), useEtiqueta("listas.aplicar")];
  if (progreso) return <Aplicando r={r} progreso={progreso} />;
  return (
    <footer className={css.pie}>
      <button type="button" className={css.descartar} onClick={alDescartar} disabled={ocupado} aria-keyshortcuts={teclaDescartar} data-testid="descartar">{t.descartar.largo} <Atajo accion="listas.descartar" /></button>
      <span className={css.nota}><Icono nombre="candado" tam={16} />{t.nadaCambiaHastaAplicar.largo}</span>
      <span className={`${css.nota} tenue`} aria-hidden="true"><Atajo accion="filas.anterior" kbd /><Atajo accion="filas.siguiente" kbd /><Atajo accion="previa.explicar" kbd /></span>
      <button type="button" className={css.aplicar} onClick={alAplicar} disabled={ocupado} aria-keyshortcuts={teclaAplicar} data-testid="aplicar">
        Aplicar · cambian {numero(r.nuevos + r.modificados)} precios <Atajo accion="listas.aplicar" />
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
