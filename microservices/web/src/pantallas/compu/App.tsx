import "../../plataforma/animacion/animacion.css";
// Las hojas de las piezas que comparten las pantallas, antes que los módulos de cada pantalla:
// un módulo pisa lo de ellas con el mismo peso (specs/024).
import "../medios.css";
import { useEffect, useRef } from "react";
import { useVentaEnEspejo } from "../../negocio/ventas";
import type { UsuarioDeLaSesion } from "../../negocio/usuarios";
import { FotoParaLaCompu } from "../FotoParaLaCompu";
import { ProveedorDeSesion, useSesion } from "../../negocio/entrada";
import { ConRutas, useRuta } from "./base/rutas";
import { Marca } from "./base/ui";
import { Entrar } from "./entrada/Entrar";
import { Manual } from "./base/pantallas/Manual";
import { VincularCelular } from "./entrada/VincularCelular";
// Las pantallas antes que las hojas del marco, y el menú al final: el orden de las hojas decide
// cuál gana cuando dos reglas pesan lo mismo (specs/024).
import { PantallaActual } from "./marco/PantallaActual";
import { NOMBRES } from "./marco/menu";
import { useAtajosConAlt, useFlechaAlMenu } from "./marco/atajos-del-marco";
import { useDosFocos } from "./marco/dos-focos";
import { useMarco } from "./marco/useMarco";
import type { MenuDeLaPersona } from "./marco/useMenu";
import { usePlegado } from "./marco/usePlegado";
import "./base/estilos/base.css";
import "./base/estilos/entrar.css";
import "./tema.css";
import "./base/estilos/menu.css";
import { CabezaDeLaParte } from "./marco/CabezaDeLaParte";
import { Lateral } from "./marco/Lateral";

// La interfaz de computadora (menú lateral, tablas, todo con teclado), con la paleta de la v5 y el
// menú reducido a lo de todos los días: lo que se usa poco va en «Más». Alt + número abre cada pantalla.
export function App() {
  return (
    <ConRutas>
      <ProveedorDeSesion>
        <Pantallas />
      </ProveedorDeSesion>
    </ConRutas>
  );
}

// Sin sesión, la entrada; el manual y vincular el celular se ven igual (RF-97). Con sesión, el marco.
function Pantallas() {
  const { sesion } = useSesion();
  // La venta en curso viaja al otro dispositivo desde cualquier pantalla (ADR-022).
  useVentaEnEspejo();
  const ruta = useRuta();
  const codigo = ruta.parametros.get("codigo");
  const conSesion = sesion.estado === "con-sesion";
  const { m, actual } = useMarco(conSesion ? sesion.usuario : null, ruta);
  if (sesion.estado === "con-sesion" && !aparte(ruta.nombre, codigo)) return <Marco usuario={sesion.usuario} m={m} actual={actual} />;
  return <FueraDelMarco nombre={ruta.nombre} codigo={codigo} />;
}

// Lo que se ve sin el menú, con o sin sesión: el manual, vincular el celular y la foto que pidió.
const aparte = (nombre: string, codigo: string | null) => nombre === "manual" || (Boolean(codigo) && (nombre === "vincular-celular" || nombre === "foto"));

function FueraDelMarco({ nombre, codigo }: { nombre: string; codigo: string | null }) {
  const { sesion } = useSesion();
  if (sesion.estado === "cargando") return <main className="entrar-cargando" aria-busy="true"><Marca tam={44} /><p>Abriendo Ferrebress…</p></main>;
  if (nombre === "vincular-celular" && codigo) return <VincularCelular codigo={codigo} />;
  if (nombre === "manual") return <Manual />;
  if (sesion.estado === "sin-sesion") return <Entrar />;
  // El celular llega acá al leer el código QR de la computadora: con la sesión ya iniciada, saca la foto que pidió.
  return <FotoParaLaCompu codigo={codigo!} />;
}

function Marco({ usuario, m, actual }: { usuario: UsuarioDeLaSesion; m: MenuDeLaPersona; actual: string }) {
  const porLaMarca = useRef(false);
  const { plegado, plegar } = usePlegado(true);
  useAtajosConAlt(true, m.conAtajo);
  useFlechaAlMenu(true);
  useDosFocos(true, porLaMarca);
  useEffect(() => { window.scrollTo(0, 0); }, [actual]);
  useEffect(() => { document.title = `${NOMBRES.get(actual)} · Ferrebress`; }, [actual]);
  return (
    <div className={`app ${plegado ? "plegado" : ""}`}>
      <a className="saltar" href="#contenido" onClick={(e) => { e.preventDefault(); document.getElementById("contenido")?.focus(); }}>Ir al contenido</a>
      <Lateral m={m} plegado={plegado} plegar={plegar} porLaMarca={porLaMarca} />
      <div className={`cuerpo ${m.pestanas ? "con-pestanas" : ""} ${m.titulo ? "con-titulo" : ""}`}>
        {(m.pestanas || m.titulo) && <CabezaDeLaParte m={m} actual={actual} porLaMarca={porLaMarca} />}
        <PantallaActual actual={actual} usuario={usuario} m={m} conPestanas={Boolean(m.pestanas)} />
      </div>
    </div>
  );
}
