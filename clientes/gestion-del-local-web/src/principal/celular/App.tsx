import { useEffect } from "react";
import { FotoParaLaCompu } from "../FotoParaLaCompu";
import { esAmbienteDePrueba } from "../../ambiente";
import { OfrecerHuella } from "./componentes/OfrecerHuella";
import { Icono } from "./componentes/base";
import { ProveedorDeSesion, administra, useSesion } from "../../sesion";
import { irA, useRuta } from "../../rutas";
import { Entrar } from "./Entrar";
import { VincularCelular } from "./pantallas/VincularCelular";
import { Catalogo } from "./Catalogo";
import { Icono as IconoDeMas, type NombreDeIcono } from "../compu/base/ui";
import { Deposito } from "./Deposito";
import { Negocio, type Parte } from "./Negocio";
import { Tickets } from "../Tickets";
import { Anomalias } from "../Anomalias";
import { Vender } from "./Vender";
import "./estilos.css";
import "./tema.css";

// La interfaz de celular de la versión 1, que es la que resultó más fácil de usar, con la
// paleta de la v5, la venta con sugeridos y sin que la búsqueda tome el foco sola. El menú es
// el mismo que en la computadora: Catálogo, Vender, Depósito y Más, con sus pestañas adentro.
export function App() {
  return (
    <ProveedorDeSesion>
      <Pantallas />
    </ProveedorDeSesion>
  );
}

// El mismo menú que en la computadora, en el mismo orden: primero lo que más se hace.
const PESTANAS = [
  { ruta: "catalogo", nombre: "Catálogo" },
  { ruta: "vender", nombre: "Vender" },
  { ruta: "deposito", nombre: "Depósito" },
  { ruta: "mas", nombre: "Más" },
] as const;
const DE_MAS: { parte: Parte | "tickets" | "anomalias"; nombre: string; detalle: string; icono: NombreDeIcono }[] = [
  { parte: "negocio", nombre: "Cómo va el negocio", detalle: "Lo vendido hoy y los gastos de la semana", icono: "resumen" },
  { parte: "usuarios", nombre: "Usuarios y sesiones", detalle: "Quién puede entrar y desde qué dispositivos", icono: "usuarios" },
  { parte: "actividad", nombre: "Quién hizo qué", detalle: "El registro de todo lo que pasó", icono: "actividad" },
  { parte: "anomalias", nombre: "Anomalías", detalle: "Cuando el sistema y la realidad no coinciden", icono: "alerta" },
  { parte: "tickets", nombre: "Mejoras y errores", detalle: "Avisar de un error o proponer una mejora, con fotos", icono: "editar" },
];
const IconoMas = ({ grosor }: { grosor: number }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={grosor} strokeLinecap="round" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14" /></svg>
);

function Pantallas() {
  const { sesion, salir } = useSesion();
  const ruta = useRuta();
  const codigoVinculacion = ruta.parametros.get("codigo");
  useEffect(() => { window.scrollTo(0, 0); }, [ruta.nombre, ruta.sub]);

  if (sesion.estado === "cargando") return <main className="pantalla-centrada"><p>Cargando…</p></main>;
  if (ruta.nombre === "vincular-celular" && codigoVinculacion) return <VincularCelular codigo={codigoVinculacion} />;
  if (sesion.estado === "sin-sesion") return <Entrar />;
  // El celular llega acá al leer el código QR de la computadora: con la sesión ya iniciada, saca la foto que
  // pidió la computadora.
  if (ruta.nombre === "foto" && codigoVinculacion) return <FotoParaLaCompu codigo={codigoVinculacion} />;

  const usuario = sesion.usuario;
  // Sin dirección, la app abre en lo primero del menú. Las direcciones viejas de Negocio siguen andando.
  const sinDireccion = location.hash.replace(/^#\/?/, "") === "";
  const nombre = sinDireccion ? "catalogo" : ruta.nombre === "negocio" ? "mas" : ruta.nombre;
  const parte = DE_MAS.find((d) => d.parte === (ruta.nombre === "negocio" ? "negocio" : ruta.sub))?.parte ?? null;
  const pestana = PESTANAS.some((p) => p.ruta === nombre) ? nombre : "vender";

  return (
    <div className="app">

      {pestana === "mas" && parte === "tickets" ? <Tickets />
        : pestana === "mas" && parte === "anomalias" ? <Anomalias />
        : pestana === "mas" && parte && parte !== "tickets" && parte !== "anomalias" ? <Negocio parte={parte} />
        : pestana === "mas" ? (
        <main className="contenido" data-testid="mas">
          <div className="encabezado"><h1 className="titulo">Más</h1></div>
          <div className="lista">
            {DE_MAS.map((d) => (
              <button key={d.parte} type="button" className="fila con-foto" onClick={() => irA(`mas/${d.parte}`)}>
                <span className="miniatura mas-icono"><IconoDeMas nombre={d.icono} tam={22} /></span>
                <span className="nombre">{d.nombre}</span>
                <Icono nombre="derecha" tam={18} grosor={2.4} />
                <span className="detalle">{d.detalle}</span>
              </button>
            ))}
          </div>
          <div className="lista">
            <button type="button" className="fila" onClick={salir} data-testid="salir">
              <span className="nombre">Salir</span>
              <Icono nombre="salir" tam={18} grosor={2.2} />
              <span className="detalle" data-testid="usuario">Entraste como {usuario.nombre}</span>
            </button>
          </div>
        </main>
      ) : pestana === "catalogo" ? <Catalogo sub={sinDireccion ? null : ruta.sub} />
        : pestana === "deposito" ? <Deposito sub={ruta.sub} />
        : <Vender esDueno={administra(usuario)} />}

      <nav className="nav-inferior solo-celular" aria-label="Menú">
        {PESTANAS.map((p) => (
          <button key={p.ruta} type="button" className={pestana === p.ruta ? "activo" : ""} onClick={() => irA(p.ruta)} aria-current={pestana === p.ruta ? "page" : undefined}>
            {p.ruta === "mas" ? <IconoMas grosor={pestana === "mas" ? 2.2 : 1.8} /> : <Icono nombre={p.ruta} tam={26} grosor={pestana === p.ruta ? 2.2 : 1.8} />}
            <span>{p.nombre}</span>
          </button>
        ))}
      </nav>
      <OfrecerHuella />
    </div>
  );
}
