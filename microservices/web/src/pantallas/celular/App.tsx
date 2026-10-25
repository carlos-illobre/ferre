// Las hojas de las piezas que comparten las pantallas, antes que los módulos de cada pantalla:
// un módulo pisa lo de ellas con el mismo peso (specs/024).
import "../medios.css";
import { useEffect } from "react";
import { useVentaEnEspejo } from "../../negocio/ventas";
import { EntrarEnLaCompu } from "./entrada/EntrarEnLaCompu";
import { PedidosDeLaCompu } from "../PedidosDeLaCompu";
import { Lector } from "./Lector";
import { LineaDeArriba } from "./marco/LineaDeArriba";
import { useEspejo } from "../../negocio/espejo";
import { Escaner } from "../../plataforma/camara";
import { sincronizarEmparejamiento } from "../../negocio/vinculo";
import { FotoParaLaCompu } from "../FotoParaLaCompu";
import { OfrecerHuella } from "./entrada/OfrecerHuella";
import { Icono } from "./componentes/base";
import { ProveedorDeSesion, useSesion } from "../../negocio/entrada";
import type { UsuarioDeLaSesion } from "../../negocio/usuarios";
import { animarNavegacion, ConRutas, irA, useRuta, type Ruta } from "./rutas";
import { Entrar } from "./entrada/Entrar";
import { VincularCelular } from "./entrada/VincularCelular";
import { VincularArriba } from "./marco/VincularArriba";
// Las pantallas, en el orden de siempre: el orden de las hojas decide cuál gana cuando dos reglas
// pesan lo mismo (specs/024).
import { PantallaDelCelular } from "./marco/PantallaDelCelular";
import { MenuDeMas } from "./marco/MenuDeMas";
import { MenuDeAbajo } from "./marco/MenuDeAbajo";
import { menuDelCelular } from "./marco/menu-del-celular";
import { useAlEntrar } from "./marco/useAlEntrar";
import { useParteEnEspejo } from "./marco/useParteEnEspejo";
import { useVincularDesdeAca, type VincularDesdeAca } from "./marco/useVincularDesdeAca";
import "./estilos.css";
import "./tema.css";

export { DE_MAS } from "./marco/menu";

// La interfaz de celular (una cosa por vez, tarjetas y hojas), con la
// paleta de la v5, sin que la búsqueda tome el foco sola. El menú es
// el mismo que en la computadora: Catálogo, Vender, Depósito y Más, con sus pestañas adentro.
export function App() {
  return (
    <ConRutas>
      <ProveedorDeSesion>
        <Pantallas />
      </ProveedorDeSesion>
    </ConRutas>
  );
}

function Pantallas() {
  // En el celular la navegación se anima (decisión 78).
  useEffect(() => { animarNavegacion(true); return () => animarNavegacion(false); }, []);
  const { sesion } = useSesion();
  // La venta en curso viaja al otro dispositivo desde cualquier pantalla (ADR-022).
  useVentaEnEspejo();
  const ruta = useRuta();
  const codigo = ruta.parametros.get("codigo");
  useEffect(() => { window.scrollTo(0, 0); }, [ruta.nombre, ruta.sub]);
  // Con la sesión abierta, el emparejamiento con la computadora se pone al día con el servidor (decisión 58).
  useEffect(() => { if (sesion.estado === "con-sesion") void sincronizarEmparejamiento(); }, [sesion.estado]);
  useParteEnEspejo(ruta, sesion.estado === "con-sesion");
  const vincular = useVincularDesdeAca();
  const { recienEntro, veniaSinSesion } = useAlEntrar(sesion.estado, ruta, codigo);

  if (sesion.estado === "con-sesion" && !aparte(ruta.nombre, codigo)) return <Marco usuario={sesion.usuario} vincular={vincular} />;
  return <FueraDelMarco ruta={ruta} automatico={recienEntro || veniaSinSesion} />;
}

// Las pantallas de un solo dispositivo, que se ven sin el menú: con un código QR, el lector, la foto.
const aparte = (nombre: string, codigo: string | null) => nombre === "lector" || (Boolean(codigo) && ["vincular-celular", "entrar-compu", "foto"].includes(nombre));

// Sin sesión, la entrada; vincular el celular se ve igual. Con sesión, lo que se vino a hacer con el código.
function FueraDelMarco({ ruta, automatico }: { ruta: Ruta; automatico: boolean }) {
  const { sesion } = useSesion();
  const codigo = ruta.parametros.get("codigo");
  if (sesion.estado === "cargando") return <main className="pantalla-centrada"><p>Cargando…</p></main>;
  if (ruta.nombre === "vincular-celular" && codigo) return <VincularCelular codigo={codigo} />;
  if (sesion.estado === "sin-sesion") return <Entrar paraLaCompu={ruta.nombre === "entrar-compu" && Boolean(codigo)} />;
  return <LoQueVinoAHacer ruta={ruta} automatico={automatico} nombre={sesion.usuario.nombre} />;
}

// Con la sesión abierta: entrar en la computadora, sacarle una foto o leer un código.
function LoQueVinoAHacer({ ruta, automatico, nombre }: { ruta: Ruta; automatico: boolean; nombre: string }) {
  const codigo = ruta.parametros.get("codigo");
  if (ruta.nombre === "entrar-compu" && codigo) return <EntrarEnLaCompu codigo={codigo} automatico={automatico} nombre={nombre} />;
  // El celular llega acá al leer el código QR de la computadora: con la sesión ya iniciada, saca la foto que
  // pidió la computadora.
  if (ruta.nombre === "foto" && codigo) return <FotoParaLaCompu codigo={codigo} />;
  return <Lector />;
}

function Marco({ usuario, vincular }: { usuario: UsuarioDeLaSesion; vincular: VincularDesdeAca }) {
  const { salir } = useSesion();
  const ruta = useRuta();
  const { emparejado } = useEspejo();
  const m = menuDelCelular(usuario, ruta);
  return (
    <div className="app">
      <LineaDeArriba />
      <VincularArriba emparejado={emparejado} escanear={vincular.escanear} />
      {vincular.escaneando && <Escaner alDetectar={vincular.alLeerCodigo} alCerrar={vincular.dejarDeEscanear} />}
      {vincular.errorDeCodigo && m.pestana !== "mas" && <p className="aviso-suave vincular-error" role="alert" data-testid="codigo-no-reconocido">{vincular.errorDeCodigo}</p>}
      {m.pestana === "mas" && m.parte && !m.enNegocio && (
        <div className="volver-a-mas">
          <button type="button" onClick={() => irA("mas")} data-testid="volver-a-mas">
            <Icono nombre="izquierda" tam={18} grosor={2.4} />
            <span>Volver a Más</span>
          </button>
        </div>
      )}
      <PantallaDelCelular m={m} menuDeMas={<MenuDeMas m={m} vincular={vincular} emparejado={emparejado} nombre={usuario.nombre} salir={salir} />} />
      <MenuDeAbajo m={m} />
      <PedidosDeLaCompu alSacar={(c) => irA(`foto?codigo=${encodeURIComponent(c)}`)} alLeer={() => irA("lector")} />
      <OfrecerHuella />
    </div>
  );
}
