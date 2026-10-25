import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Icono } from "../base/ui";

const inicialesDe = (nombre: string) => nombre.trim().split(/\s+/).map((p) => p[0] ?? "").slice(0, 2).join("").toUpperCase();

// Mientras está abierto, el foco va a su primera opción y un clic afuera lo cierra.
function useCerrarAfuera(abierto: boolean, cerrar: () => void, raiz: React.RefObject<HTMLElement>, menu: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!abierto) return;
    menu.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const fuera = (e: MouseEvent) => { if (!raiz.current?.contains(e.target as Node) && !menu.current?.contains(e.target as Node)) cerrar(); };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps
}

// El usuario abajo del menú, como la v2 (decisión 126): las iniciales, el nombre y el rol; al tocarlo,
// un menú con el nombre y el rol arriba y «Cerrar sesión». Esc lo cierra.
export function CuentaDelUsuario({ nombre, rol, detalle, alSalir }: { nombre: string; rol: string; detalle: string; alSalir: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const menuDeCuenta = useRef<HTMLDivElement>(null);
  useCerrarAfuera(abierto, () => setAbierto(false), raiz, menuDeCuenta);
  const conEsc = (soloAbierto: boolean) => (e: KeyboardEvent) => {
    if (e.key !== "Escape" || (soloAbierto && !abierto)) return;
    e.preventDefault(); e.stopPropagation(); setAbierto(false); raiz.current?.querySelector<HTMLButtonElement>(".quien-boton")?.focus();
  };
  return (
    <div className="quien" ref={raiz} onKeyDown={conEsc(true)}>
      <button type="button" className="quien-boton" aria-haspopup="menu" aria-expanded={abierto} onClick={() => setAbierto((a) => !a)} title={detalle} aria-label={`${nombre}${rol ? `, ${rol}` : ""}: opciones de la cuenta`} data-testid="cuenta">
        <span className="avatar" aria-hidden="true">{inicialesDe(nombre)}</span>
        <span className="quien-nombre"><b data-testid="usuario">{nombre}</b>{rol ? <small>{rol}</small> : null}</span>
      </button>
      {/* Se dibuja en el cuerpo de la página: dentro del menú lateral lo tapaba la barra del cobro. */}
      {abierto && createPortal(
        <div className="cuenta-menu" role="menu" aria-label="La cuenta" ref={menuDeCuenta} onKeyDown={conEsc(false)}>
          <p className="cuenta-menu-cab">{nombre}{rol ? ` · ${rol}` : ""}</p>
          <button type="button" role="menuitem" onClick={alSalir} data-testid="salir"><Icono nombre="salir" tam={20} />Cerrar sesión</button>
        </div>, document.body,
      )}
    </div>
  );
}
