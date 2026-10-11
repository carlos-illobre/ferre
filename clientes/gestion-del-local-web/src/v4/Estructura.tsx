import { useEffect, useRef, useState, type ReactNode } from "react";
import { esAmbienteDePrueba } from "../ambiente";
import { Iniciales } from "./piezas/basicas";
import { Icono } from "./piezas/Icono";
import { PRINCIPALES, enlace, ir, principalDe, useRuta } from "./rutas";
import { useUsuario } from "./usuario";

function MenuDeUsuario() {
  const usuario = useUsuario();
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

  if (!usuario) return null;
  return (
    <div className="menu-usuario" ref={caja}>
      {abierto && (
        <div className="menu-usuario__opciones">
          <button type="button" onClick={() => { setAbierto(false); ir("usuarios"); }}><Icono nombre="usuarios" tam={20} />Usuarios y sesiones</button>
          <button type="button" className="menu-usuario__salir" onClick={() => { setAbierto(false); usuario.salir(); }} data-testid="salir"><Icono nombre="salir" tam={20} />Salir</button>
        </div>
      )}
      <button type="button" className="menu-usuario__boton" aria-expanded={abierto} aria-label={`${usuario.nombre}, ${usuario.rol}. Abrir el menú de usuario`} onClick={() => setAbierto(!abierto)} data-testid="menu-usuario">
        <Iniciales nombre={usuario.nombre} tono="avatar" />
        <span className="menu-usuario__nombre"><strong data-testid="usuario" title={usuario.correo}>{usuario.nombre}</strong><span>{usuario.rol}</span></span>
        <Icono nombre={abierto ? "flecha-abajo" : "flecha-arriba"} tam={18} />
      </button>
    </div>
  );
}

/** El marco de la app: menú lateral verde en la computadora, barra de pestañas abajo en el celular. */
export function Estructura({ children }: { children: ReactNode }) {
  const { camino } = useRuta();
  const marcado = principalDe(camino);
  const prueba = esAmbienteDePrueba();

  return (
    <div className="estructura">
      <aside className="menu">
        <a className="menu__marca" href={enlace("vender")} aria-label="Ferrebress, ir a Vender"><span>F</span><strong>Ferrebress</strong></a>
        {prueba && <p className="ambiente ambiente--menu" data-testid="ambiente">Ambiente de prueba</p>}
        <nav className="menu__destinos" aria-label="Principal">
          {PRINCIPALES.map((d) => (
            <a key={d.camino} href={enlace(d.camino)} className={marcado === d.camino ? "menu__destino menu__destino--marcado" : "menu__destino"} aria-current={marcado === d.camino ? "page" : undefined} data-testid={`menu-${d.camino}`}>
              <Icono nombre={d.icono} /><span>{d.nombre}</span>
            </a>
          ))}
        </nav>
        <MenuDeUsuario />
      </aside>

      {prueba && <div className="ambiente ambiente--celular"><p>Ambiente de prueba</p></div>}
      <div className="estructura__pantalla">{children}</div>

      <nav className="pestanas" aria-label="Principal">
        {PRINCIPALES.map((d) => (
          <a key={d.camino} href={enlace(d.camino)} className={marcado === d.camino ? "pestanas__destino pestanas__destino--marcado" : "pestanas__destino"} aria-current={marcado === d.camino ? "page" : undefined} data-testid={`pestana-${d.camino}`}>
            <Icono nombre={d.icono} tam={24} /><span>{d.corto ?? d.nombre}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
