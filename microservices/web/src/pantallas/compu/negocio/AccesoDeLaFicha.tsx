import { fecha } from "../../../formato";
import { Icono, haceCuanto } from "../base/ui";
import { fechaCompleta } from "./negocio-comun";
import type { Acceso, CelularDeOtroFila, SesionFila } from "../../../negocio/usuarios";
import css from "./Usuarios.module.css";

type Props = { nombre: string; acceso: Acceso; enLinea: boolean; alCerrarSesion: (s: SesionFila) => void; alQuitarCelular: (c: CelularDeOtroFila) => void };

// Sus sesiones abiertas con «Cerrar» y sus celulares con huella con «Quitar» (decisión 100).
export function AccesoDeLaFicha({ nombre, acceso, enLinea, alCerrarSesion, alQuitarCelular }: Props) {
  return (
    <>
      <div data-testid="lista-de-acceso">
        <h3>Sesiones abiertas ({acceso.sesiones.length})</h3>
        {acceso.sesiones.length === 0 && <p className={css.detalle}>No tiene sesiones abiertas.</p>}
        {acceso.sesiones.map((s) => (
          <Dispositivo key={s.id} testId="sesion" icono={/celular/i.test(s.dispositivo) ? "smartphone" : "monitor"} nombre={s.dispositivo} detalle={`usada ${haceCuanto(s.ultimo_uso_en)}`} title={fechaCompleta(s.ultimo_uso_en)}
            accion="Cerrar" disabled={!enLinea} alTocar={() => alCerrarSesion(s)} ariaLabel={`Cerrar la sesión de ${nombre} en ${s.dispositivo}`} />
        ))}
      </div>
      <div>
        <h3>Celular con huella ({acceso.celulares.length})</h3>
        {acceso.celulares.length === 0 && <p className={css.detalle}>No vinculó ningún celular.</p>}
        {acceso.celulares.map((c) => (
          <Dispositivo key={c.id} testId="celular-de-otro" icono="fingerprint" nombre={c.dispositivo ?? "Celular"} detalle={c.ultimo_uso_en ? `Último uso ${fecha(c.ultimo_uso_en.slice(0, 10))}` : `Vinculado el ${fecha(c.creada_en.slice(0, 10))}`}
            accion="Quitar" disabled={!enLinea} alTocar={() => alQuitarCelular(c)} ariaLabel={`Quitar el celular ${c.dispositivo ?? ""} de ${nombre}`} />
        ))}
      </div>
    </>
  );
}

type Disp = { testId: string; icono: "smartphone" | "monitor" | "fingerprint"; nombre: string; detalle: string; title?: string; accion: string; disabled: boolean; alTocar: () => void; ariaLabel: string };
function Dispositivo({ testId, icono, nombre, detalle, title, accion, disabled, alTocar, ariaLabel }: Disp) {
  return (
    <div className={css.disp} data-testid={testId}>
      <span className={css.dispIco}><Icono nombre={icono} /></span>
      <div className={css.dispTexto}><div className={css.dispN}>{nombre}</div><div className={css.detalle} title={title}>{detalle}</div></div>
      <button type="button" className={`${css.boton} suave`} disabled={disabled} onClick={alTocar} aria-label={ariaLabel}>{accion}</button>
    </div>
  );
}
