import { useEffect } from "react";
import { esAmbienteDePrueba } from "../../ambiente";
import { ProveedorDeSesion, useSesion } from "../../sesion";
import { irA, useRuta } from "../../v2/rutas";
import { Boton, EstadoDeConexion, Icono, Marca, type NombreDeIcono } from "../../v2/ui";
import { Entrar } from "../../v2/pantallas/Entrar";
import { VincularCelular } from "../../v2/pantallas/VincularCelular";
import { VentasDeHoy } from "../../v2/pantallas/VentasDeHoy";
import { Productos } from "../../v2/pantallas/Productos";
import { Listas } from "../../v2/pantallas/Listas";
import { Duplicados } from "../../v2/pantallas/Duplicados";
import { Stock } from "../../v2/pantallas/Stock";
import { Compras } from "../../v2/pantallas/Compras";
import { Contar } from "../../v2/pantallas/Contar";
import { Resumen } from "../../v2/pantallas/Resumen";
import { Usuarios } from "../../v2/pantallas/Usuarios";
import { Actividad } from "../../v2/pantallas/Actividad";
import { Vender } from "./Vender";
import { DE_MAS, Mas } from "./Mas";
import "../../v2/estilos/base.css";
import "../../v2/estilos/entrar.css";
import "./tema.css";

// La interfaz de computadora de la versión 2 (menú lateral, tablas, todo con teclado), con
// la paleta de la v5, la venta con sugeridos y el menú reducido a lo de todos los días: lo
// que se usa poco va en «Más». Alt + número abre cada pantalla.
export function App() {
  return (
    <ProveedorDeSesion>
      <Pantallas />
    </ProveedorDeSesion>
  );
}

const MENU: { ruta: string; nombre: string; icono: NombreDeIcono }[] = [
  { ruta: "vender", nombre: "Vender", icono: "vender" },
  { ruta: "ventas", nombre: "Ventas de hoy", icono: "ventas" },
  { ruta: "productos", nombre: "Productos", icono: "productos" },
  { ruta: "compras", nombre: "Recibir mercadería", icono: "compras" },
  { ruta: "stock", nombre: "Stock", icono: "stock" },
  { ruta: "mas", nombre: "Más", icono: "mas" },
];
// Alt + 1 a 6 son las del menú; 7, 8, 9 y 0, las primeras cuatro de «Más».
const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
const CON_ATAJO = [...MENU.map((m) => m.ruta), ...DE_MAS.map((d) => d.ruta)].slice(0, TECLAS.length);
const atajoDe = (ruta: string) => { const i = CON_ATAJO.indexOf(ruta); return i < 0 ? null : TECLAS[i]!; };
const NOMBRES = new Map([...MENU, ...DE_MAS].map((p) => [p.ruta, p.nombre]));

function Pantallas() {
  const { sesion, salir } = useSesion();
  const ruta = useRuta();
  const codigoVinculacion = ruta.parametros.get("codigo");
  const actual = NOMBRES.has(ruta.nombre) ? ruta.nombre : "vender";
  const conSesion = sesion.estado === "con-sesion";

  useEffect(() => { window.scrollTo(0, 0); }, [actual]);
  useEffect(() => { document.title = conSesion ? `${NOMBRES.get(actual)} · Ferrebress` : "Ferrebress"; }, [actual, conSesion]);
  useEffect(() => {
    if (!conSesion) return;
    const tecla = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || !/^Digit[0-9]$/.test(e.code)) return;
      const destino = CON_ATAJO[TECLAS.indexOf(e.code.slice(5))];
      if (destino) { e.preventDefault(); irA(destino); }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [conSesion]);

  if (sesion.estado === "cargando") return <main className="entrar-cargando" aria-busy="true"><Marca tam={44} /><p>Abriendo Ferrebress…</p></main>;
  if (ruta.nombre === "vincular-celular" && codigoVinculacion) return <VincularCelular codigo={codigoVinculacion} />;
  if (sesion.estado === "sin-sesion") return <Entrar />;

  const enMas = DE_MAS.some((d) => d.ruta === actual);
  const prueba = esAmbienteDePrueba();

  return (
    <div className="app">
      <a className="saltar" href="#contenido" onClick={(e) => { e.preventDefault(); document.getElementById("contenido")?.focus(); }}>Ir al contenido</a>
      <aside className="lateral">
        <div className="lateral-marca">
          <Marca />
          {prueba && <span className="prueba" data-testid="ambiente">Ambiente de prueba</span>}
        </div>
        <nav aria-label="Menú">
          {MENU.map((m) => {
            const activo = actual === m.ruta || (m.ruta === "mas" && enMas);
            return (
              <button key={m.ruta} type="button" aria-current={activo ? "page" : undefined} aria-keyshortcuts={`Alt+${atajoDe(m.ruta)}`} onClick={() => irA(m.ruta)} data-testid={`menu-${m.ruta}`}>
                <Icono nombre={m.icono} tam={19} grosor={activo ? 2.3 : 1.9} />{m.nombre}
                <span className="atajo" aria-hidden="true">{atajoDe(m.ruta)}</span>
              </button>
            );
          })}
        </nav>
        <p className="lateral-ayuda">Alt + número abre cada pantalla</p>
        <div className="lateral-pie">
          <EstadoDeConexion />
          <div className="quien">
            <span data-testid="usuario" title={sesion.usuario.email}>{sesion.usuario.nombre}</span>
            <Boton variante="sobre-marino" tam="chico" icono="salir" onClick={salir} data-testid="salir">Salir</Boton>
          </div>
          <small className="version" title="Versión de la app">{import.meta.env.VITE_VERSION ?? "local"}</small>
        </div>
      </aside>
      <div className="cuerpo">
        {enMas && <div className="mas-volver"><Boton icono="izquierda" tam="chico" onClick={() => irA("mas")}>Volver a Más</Boton></div>}
        {actual === "mas" ? <Mas atajoDe={atajoDe} />
          : actual === "ventas" ? <VentasDeHoy /> : actual === "productos" ? <Productos /> : actual === "compras" ? <Compras />
          : actual === "stock" ? <Stock /> : actual === "listas" ? <Listas /> : actual === "duplicados" ? <Duplicados />
          : actual === "contar" ? <Contar /> : actual === "resumen" ? <Resumen /> : actual === "usuarios" ? <Usuarios />
          : actual === "actividad" ? <Actividad /> : <Vender />}
      </div>
    </div>
  );
}
