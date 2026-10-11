import { useEffect, useRef, useState, type ReactNode } from "react";
import { YO } from "../datos";
import { Iniciales } from "../piezas/basicas";
import { Icono } from "../piezas/Icono";
import { enlace, useRuta } from "../ruta";
import { ACCIONES_DE_USUARIO, PRINCIPALES, principalDe } from "./destinos";

function MenuDeUsuario() {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const afuera = (e: PointerEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("pointerdown", afuera);
    document.addEventListener("keydown", tecla);
    return () => { document.removeEventListener("pointerdown", afuera); document.removeEventListener("keydown", tecla); };
  }, [abierto]);

  return (
    <div className="menu-usuario" ref={caja}>
      {abierto && (
        <div className="menu-usuario__opciones">
          {ACCIONES_DE_USUARIO.map((a) => (
            <button key={a.clave} type="button" className={a.clave === "salir" ? "menu-usuario__salir" : undefined} onClick={() => { setAbierto(false); a.alTocar(); }}>
              <Icono nombre={a.icono} tam={20} />{a.nombre}
            </button>
          ))}
        </div>
      )}
      <button type="button" className="menu-usuario__boton" aria-expanded={abierto} aria-label={`${YO.nombre}, ${YO.rol}. Abrir el menú de usuario`} onClick={() => setAbierto(!abierto)}>
        <Iniciales nombre={YO.nombre} tono="avatar" />
        <span className="menu-usuario__nombre"><strong>{YO.nombre}</strong><span>{YO.rol}</span></span>
        <Icono nombre={abierto ? "flecha-abajo" : "flecha-arriba"} tam={18} />
      </button>
    </div>
  );
}

/** El marco de la app: menú lateral verde en la computadora, barra de pestañas abajo en el celular. */
export function Estructura({ children }: { children: ReactNode }) {
  const { camino } = useRuta();
  const marcado = principalDe(camino);

  return (
    <div className="estructura">
      <aside className="menu">
        <a className="menu__marca" href={enlace("vender")} aria-label="Ferrebress, ir a Vender"><span>F</span><strong>Ferrebress</strong></a>
        <p className="ambiente ambiente--menu">Ambiente de prueba</p>
        <nav className="menu__destinos" aria-label="Principal">
          {PRINCIPALES.map((d) => (
            <a key={d.camino} href={enlace(d.camino)} className={marcado === d.camino ? "menu__destino menu__destino--marcado" : "menu__destino"} aria-current={marcado === d.camino ? "page" : undefined}>
              <Icono nombre={d.icono} /><span>{d.nombre}</span>
            </a>
          ))}
        </nav>
        <MenuDeUsuario />
      </aside>

      <div className="ambiente ambiente--celular">
        {/* En el celular, el control «Maqueta» se dibuja acá adentro (ver EstadosDeMaqueta). */}
        <span id="lugar-de-maqueta" />
        <p>Ambiente de prueba</p>
      </div>
      <div className="estructura__pantalla">{children}</div>

      <nav className="pestanas" aria-label="Principal">
        {PRINCIPALES.map((d) => (
          <a key={d.camino} href={enlace(d.camino)} className={marcado === d.camino ? "pestanas__destino pestanas__destino--marcado" : "pestanas__destino"} aria-current={marcado === d.camino ? "page" : undefined}>
            <Icono nombre={d.icono} tam={24} /><span>{d.corto ?? d.nombre}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
