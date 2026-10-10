import { useEffect } from "react";
import { esAmbienteDePrueba } from "../ambiente";
import { ProveedorDeSesion, useSesion } from "../sesion";
import { OfrecerHuella } from "./pantallas/OfrecerHuella";
import { GRUPOS, PANTALLAS, irA, useRuta } from "./rutas";
import { Boton, EstadoDeConexion, Icono, Marca } from "./ui";
import { Entrar } from "./pantallas/Entrar";
import { VincularCelular } from "./pantallas/VincularCelular";
import { Vender } from "./pantallas/Vender";
import { VentasDeHoy } from "./pantallas/VentasDeHoy";
import { Productos } from "./pantallas/Productos";
import { Listas } from "./pantallas/Listas";
import { Duplicados } from "./pantallas/Duplicados";
import { Stock } from "./pantallas/Stock";
import { Compras } from "./pantallas/Compras";
import { Contar } from "./pantallas/Contar";
import { Resumen } from "./pantallas/Resumen";
import { Usuarios } from "./pantallas/Usuarios";
import { Actividad } from "./pantallas/Actividad";
import "./estilos/base.css";
import "./estilos/entrar.css";

export function App() {
  return (
    <ProveedorDeSesion>
      <Pantallas />
    </ProveedorDeSesion>
  );
}

const COMPONENTES: Record<string, () => JSX.Element> = {
  vender: Vender, ventas: VentasDeHoy, productos: Productos, listas: Listas, duplicados: Duplicados,
  stock: Stock, compras: Compras, contar: Contar, resumen: Resumen, usuarios: Usuarios, actividad: Actividad,
};

function Pantallas() {
  const { sesion, salir } = useSesion();
  const ruta = useRuta();
  const codigoVinculacion = ruta.parametros.get("codigo");
  const actual = PANTALLAS.some((p) => p.ruta === ruta.nombre) ? ruta.nombre : "vender";
  const conSesion = sesion.estado === "con-sesion";

  useEffect(() => { window.scrollTo(0, 0); }, [actual]);
  useEffect(() => {
    const pantalla = PANTALLAS.find((p) => p.ruta === actual);
    document.title = conSesion && pantalla ? `${pantalla.nombre} · Ferrebress` : "Ferrebress";
  }, [actual, conSesion]);
  // Alt + número abre cada pantalla del menú, en el orden en que se ven.
  useEffect(() => {
    if (!conSesion) return;
    const tecla = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || !/^Digit[1-9]$/.test(e.code)) return;
      const destino = PANTALLAS[Number(e.code.slice(5)) - 1];
      if (destino) { e.preventDefault(); irA(destino.ruta); }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [conSesion]);

  if (sesion.estado === "cargando") return <main className="entrar-cargando" aria-busy="true"><Marca tam={44} /><p>Abriendo Ferrebress…</p></main>;
  if (ruta.nombre === "vincular-celular" && codigoVinculacion) return <VincularCelular codigo={codigoVinculacion} />;
  if (sesion.estado === "sin-sesion") return <Entrar />;

  const grupo = GRUPOS.find((g) => g.pantallas.some((p) => p.ruta === actual))!;
  const Pantalla = COMPONENTES[actual]!;
  const prueba = esAmbienteDePrueba();
  const version = import.meta.env.VITE_VERSION ?? "local";

  return (
    <div className="app">
      <a className="saltar" href="#contenido" onClick={(e) => { e.preventDefault(); document.getElementById("contenido")?.focus(); }}>Ir al contenido</a>

      <aside className="lateral">
        <div className="lateral-marca">
          <Marca />
          {prueba && <span className="prueba" data-testid="ambiente">Ambiente de prueba</span>}
        </div>
        <nav aria-label="Menú">
          {GRUPOS.map((g) => (
            <section key={g.clave} aria-labelledby={`menu-${g.clave}`}>
              <h2 id={`menu-${g.clave}`}>{g.clave === "mostrador" ? "Mostrador" : g.nombre}</h2>
              {g.pantallas.map((p) => {
                const n = PANTALLAS.indexOf(p) + 1;
                return (
                  <button key={p.ruta} type="button" aria-current={actual === p.ruta ? "page" : undefined} aria-keyshortcuts={n <= 9 ? `Alt+${n}` : undefined} onClick={() => irA(p.ruta)} data-testid={`menu-${p.ruta}`}>
                    <Icono nombre={p.icono} tam={19} grosor={actual === p.ruta ? 2.3 : 1.9} />{p.nombre}
                    {n <= 9 && <span className="atajo" aria-hidden="true">{n}</span>}
                  </button>
                );
              })}
            </section>
          ))}
        </nav>
        <p className="lateral-ayuda">Alt + número abre cada pantalla</p>
        <div className="lateral-pie">
          <EstadoDeConexion />
          <div className="quien">
            <span data-testid="usuario" title={sesion.usuario.email}>{sesion.usuario.nombre}</span>
            <Boton variante="sobre-marino" tam="chico" icono="salir" onClick={salir} data-testid="salir">Salir</Boton>
          </div>
          <small className="version" title="Versión de la app">{version}</small>
        </div>
      </aside>

      <div className="cuerpo">
        <header className="tope">
          <Marca tam={26} />
          <span className="espacio" />
          <EstadoDeConexion testId="conexion-celular" />
          <Boton variante="sobre-marino" tam="chico" icono="salir" aria-label={`Salir (${sesion.usuario.nombre})`} onClick={salir} />
        </header>
        {prueba && <div className="prueba franja solo-celu">Ambiente de prueba</div>}
        {grupo.pantallas.length > 1 && (
          <nav className="subnav" aria-label={grupo.nombre}>
            {grupo.pantallas.map((p) => (
              <button key={p.ruta} type="button" aria-current={actual === p.ruta ? "page" : undefined} onClick={() => irA(p.ruta)}>{p.corto ?? p.nombre}</button>
            ))}
          </nav>
        )}

        <Pantalla />

        <nav className="abajo" aria-label="Partes del negocio">
          {GRUPOS.map((g) => (
            <button key={g.clave} type="button" aria-current={g === grupo ? "page" : undefined} onClick={() => irA(g.pantallas[0]!.ruta)} data-testid={`pestana-${g.clave}`}>
              <span className="lomo"><Icono nombre={g.icono} tam={22} grosor={g === grupo ? 2.3 : 1.9} /></span>
              {g.nombre}
            </button>
          ))}
        </nav>
      </div>
      <OfrecerHuella />
    </div>
  );
}
