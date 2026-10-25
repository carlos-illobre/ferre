import { useState } from "react";
import { cuandoSeUso, esUnCelular, renglonesDelAcceso, usoDelCelular, type Acceso, type CelularDeOtroFila, type RenglonDeAcceso, type SesionFila } from "../../../negocio/usuarios";
import { Icono } from "../../../ui/iconos";
import css from "./Usuarios.module.css";

type Acciones = { nombre: string; alCerrarSesion: (s: SesionFila) => void; alQuitarCelular: (c: CelularDeOtroFila) => void };

// Sus sesiones y sus celulares con huella (decisión 100), como la v2: un renglón por sesión, con
// su ícono, cuándo se usó y si entra con la huella. «Cerrar» cierra la sesión; si el aparato tiene
// las dos cosas, «…» deja elegir entre cerrar la sesión y quitar la huella.
export function AccesoDeUsuario({ sesiones, celulares, ...acciones }: Acceso & Acciones) {
  const [menu, setMenu] = useState<string | null>(null);
  return (
    <div className={css.lista} data-testid="acceso-de-usuario">
      {renglonesDelAcceso(sesiones, celulares).map((r) => (
        <Renglon key={r.clave} r={r} {...acciones} menu={menu === r.clave} alMenu={() => setMenu(menu === r.clave ? null : r.clave)} />
      ))}
    </div>
  );
}

type DelRenglon = Acciones & { r: RenglonDeAcceso; menu: boolean; alMenu: () => void };

function Renglon({ r, ...resto }: DelRenglon) {
  const { n, s, c } = r;
  return (
    <div className={css.disp} data-testid={s ? "sesion" : "celular-de-otro"}>
      <span className={css.ico}><Icono nombre={esUnCelular(r) ? "smartphone" : "monitor"} /></span>
      <span className={css.texto}><b>{n}</b><small>{s ? cuandoSeUso(s.ultimo_uso_en) : usoDelCelular(c!)}{c && <> · <Icono nombre="fingerprint" tam={16} /> con huella</>}</small></span>
      <Botones r={r} {...resto} />
    </div>
  );
}

// Una sola cosa para hacer: su botón. Las dos: «…», que abre el menú con las dos.
function Botones({ r: { n, s, c }, nombre, menu, alMenu, alCerrarSesion, alQuitarCelular }: DelRenglon) {
  const cerrar = (texto: string) => s && <button type="button" className={css.uaBoton} onClick={() => alCerrarSesion(s)} aria-label={`Cerrar la sesión de ${nombre} en ${s.dispositivo}`}>{texto}</button>;
  const quitar = (texto: string) => c && <button type="button" className={css.uaBoton} onClick={() => alQuitarCelular(c)} aria-label={`Quitar el celular ${c.dispositivo ?? ""} de ${nombre}`}>{texto}</button>;
  if (!s || !c) return s ? cerrar("Cerrar") : quitar("Quitar");
  return (
    <>
      <button type="button" className={`${css.uaBoton} icono`} aria-expanded={menu} aria-label={`Qué hacer con ${n} de ${nombre}`} onClick={alMenu}><Icono nombre="ellipsis" tam={18} /></button>
      {menu && <span className={css.uaMenu}>{cerrar("Cerrar la sesión")}{quitar("Quitar la huella")}</span>}
    </>
  );
}
