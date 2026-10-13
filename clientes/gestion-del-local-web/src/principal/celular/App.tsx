import { useCallback, useEffect, useRef, useState } from "react";
import { EntrarEnLaCompu } from "./EntrarEnLaCompu";
import { PedidosDeLaCompu } from "../PedidosDeLaCompu";
import { Lector } from "./Lector";
import { EspejoEstado } from "../EspejoEstado";
import { useEspejar, useEspejo } from "../../espejo";
import { Escaner, hayCamara } from "./componentes/Escaner";
import { sincronizarEmparejamiento } from "../../puesto";
import { FotoParaLaCompu } from "../FotoParaLaCompu";
import { esAmbienteDePrueba } from "../../ambiente";
import { OfrecerHuella } from "./componentes/OfrecerHuella";
import { Icono } from "./componentes/base";
import { ProveedorDeSesion, useSesion } from "../../sesion";
import { puede, type Permiso } from "../permisos";
import { SinPermiso } from "../SinPermiso";
import { Roles } from "../Roles";
import { irA, useRuta } from "../../rutas";
import { destinoDelCodigo, Entrar } from "./Entrar";
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
// Cada parte dice qué permiso pide (RF-72); sin `pide`, la ve cualquiera con sesión.
const PESTANAS: { ruta: "catalogo" | "vender" | "deposito" | "mas"; nombre: string; pide?: Permiso[] }[] = [
  { ruta: "catalogo", nombre: "Catálogo" },
  { ruta: "vender", nombre: "Vender", pide: ["ventas.registrar"] },
  { ruta: "deposito", nombre: "Depósito" },
  { ruta: "mas", nombre: "Más" },
];
const DE_MAS: { parte: Parte | "tickets" | "anomalias" | "roles"; nombre: string; detalle: string; icono: NombreDeIcono; pide?: Permiso[] }[] = [
  { parte: "negocio", nombre: "Cómo va el negocio", detalle: "Lo vendido hoy y los gastos de la semana", icono: "resumen", pide: ["negocio.numeros"] },
  { parte: "usuarios", nombre: "Usuarios y sesiones", detalle: "Quién puede entrar y desde qué dispositivos", icono: "usuarios" },
  { parte: "roles", nombre: "Roles", detalle: "Qué puede hacer cada rol", icono: "usuarios", pide: ["admin.roles"] },
  { parte: "actividad", nombre: "Quién hizo qué", detalle: "El registro de todo lo que pasó", icono: "actividad", pide: ["negocio.actividad"] },
  { parte: "anomalias", nombre: "Anomalías", detalle: "Cuando el sistema y la realidad no coinciden", icono: "alerta", pide: ["negocio.anomalias"] },
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
  // Al entrar (con Google o con la huella) se abre siempre el Catálogo, no la pantalla desde la
  // que se había salido (decisión 56). Salvo que se haya llegado leyendo un código QR, que
  // sigue con lo que vino a hacer.
  // Con la sesión abierta, el emparejamiento con la computadora se pone al día con el servidor (decisión 58).
  useEffect(() => { if (sesion.estado === "con-sesion") void sincronizarEmparejamiento(); }, [sesion.estado]);
  // En espejo con la computadora (decisión 60): los dos están en la misma parte. Las pantallas
  // que son solo de este dispositivo (la cámara, un enlace con código) no viajan.
  const sinHash = location.hash.replace(/^#\/?/, "") === "";
  const nombreDeParte = sinHash ? "catalogo" : ruta.nombre === "negocio" ? "mas" : ruta.nombre;
  // El ingreso que se abre desde un pedido («llegó la mercadería») también viaja, con su pedido.
  const pedidoDeLaRuta = ruta.parametros.get("pedido");
  const soloElPedido = [...ruta.parametros.keys()].every((k) => k === "pedido");
  const parteEnEspejo = sesion.estado === "con-sesion" && soloElPedido && ["catalogo", "vender", "deposito", "mas"].includes(nombreDeParte)
    ? `${nombreDeParte}${ruta.nombre === "negocio" ? "/negocio" : ruta.sub ? `/${ruta.sub}` : ""}${pedidoDeLaRuta ? `?pedido=${pedidoDeLaRuta}` : ""}` : null;
  useEspejar<string | null>("ir", parteEnEspejo, (parte) => { if (parte && sesion.estado === "con-sesion") irA(parte); }, parteEnEspejo !== null);
  // Vincular con la computadora sin salir de la aplicación: la cámara se abre acá adentro y lee
  // el código que la computadora muestra en «Vincular el celular» (o en su entrada).
  const { emparejado } = useEspejo();
  const [escaneando, setEscaneando] = useState(false);
  const [errorDeCodigo, setErrorDeCodigo] = useState<string | null>(null);
  const alLeerCodigo = useCallback((leido: string) => {
    const destino = destinoDelCodigo(leido);
    if (destino) location.hash = destino; else setErrorDeCodigo("Ese código no es de Ferrebress. Apuntá al que muestra la computadora al tocar «Vincular el celular».");
  }, []);
  const estadoAnterior = useRef(sesion.estado);
  const [recienEntro, setRecienEntro] = useState(false);
  useEffect(() => {
    const venia = estadoAnterior.current;
    estadoAnterior.current = sesion.estado;
    if (venia !== "sin-sesion" || sesion.estado !== "con-sesion") return;
    // Si se llegó leyendo el código de una computadora, entrar fue la confirmación (RF-76).
    if (ruta.nombre === "entrar-compu") setRecienEntro(true);
    else if (!codigoVinculacion) irA("catalogo");
  }, [sesion.estado, codigoVinculacion, ruta.nombre]);

  if (sesion.estado === "cargando") return <main className="pantalla-centrada"><p>Cargando…</p></main>;
  if (ruta.nombre === "vincular-celular" && codigoVinculacion) return <VincularCelular codigo={codigoVinculacion} />;
  const paraLaCompu = ruta.nombre === "entrar-compu" && Boolean(codigoVinculacion);
  if (sesion.estado === "sin-sesion") return <Entrar paraLaCompu={paraLaCompu} />;
  if (paraLaCompu) return <EntrarEnLaCompu codigo={codigoVinculacion!} automatico={recienEntro || estadoAnterior.current === "sin-sesion"} nombre={sesion.usuario.nombre} />;
  // El celular llega acá al leer el código QR de la computadora: con la sesión ya iniciada, saca la foto que
  // pidió la computadora.
  if (ruta.nombre === "foto" && codigoVinculacion) return <FotoParaLaCompu codigo={codigoVinculacion} />;
  if (ruta.nombre === "lector") return <Lector />;

  const usuario = sesion.usuario;
  const permitido = (pide?: Permiso[]) => puede(usuario, ...(pide ?? []));
  const pestanas = PESTANAS.filter((p) => permitido(p.pide));
  const deMas = DE_MAS.filter((d) => permitido(d.pide));
  // Sin dirección, la app abre en lo primero del menú. Las direcciones viejas de Negocio siguen andando.
  const sinDireccion = location.hash.replace(/^#\/?/, "") === "";
  const nombre = sinDireccion ? "catalogo" : ruta.nombre === "negocio" ? "mas" : ruta.nombre;
  const elegida = DE_MAS.find((d) => d.parte === (ruta.nombre === "negocio" ? "negocio" : ruta.sub)) ?? null;
  const parte = elegida?.parte ?? null;
  const pestana = PESTANAS.find((p) => p.ruta === nombre)?.ruta ?? "catalogo";
  // Lo que pide la pantalla a la que se llegó; si no se tiene, se dice en vez de mostrarla.
  const falta = !permitido(PESTANAS.find((p) => p.ruta === pestana)?.pide) ? PESTANAS.find((p) => p.ruta === pestana)!.pide!
    : pestana === "mas" && elegida && !permitido(elegida.pide) ? elegida.pide! : null;

  return (
    <div className="app">
      <EspejoEstado />

      {pestana === "mas" && parte && (
        <div className="volver-a-mas">
          <button type="button" onClick={() => irA("mas")} data-testid="volver-a-mas">
            <Icono nombre="izquierda" tam={18} grosor={2.4} />
            <span>Volver a Más</span>
          </button>
        </div>
      )}
      {falta ? <SinPermiso falta={falta} />
        : pestana === "mas" && parte === "tickets" ? <Tickets />
        : pestana === "mas" && parte === "roles" ? <Roles />
        : pestana === "mas" && parte === "anomalias" ? <Anomalias />
        : pestana === "mas" && parte && parte !== "tickets" && parte !== "anomalias" && parte !== "roles" ? <Negocio parte={parte} />
        : pestana === "mas" ? (
        <main className="contenido" data-testid="mas">
          <div className="encabezado"><h1 className="titulo">Más</h1></div>
          {!emparejado && hayCamara() && (
            <div className="lista">
              <button type="button" className="fila con-foto" onClick={() => { setErrorDeCodigo(null); setEscaneando(true); }} data-testid="vincular-con-la-compu">
                <span className="miniatura mas-icono"><Icono nombre="escanear" tam={22} /></span>
                <span className="nombre">Vincular con la computadora</span>
                <Icono nombre="derecha" tam={18} grosor={2.4} />
                <span className="detalle">Escaneá el código que muestra la computadora, sin salir de acá</span>
              </button>
              {errorDeCodigo && <p className="aviso-suave" role="alert" data-testid="codigo-no-reconocido">{errorDeCodigo}</p>}
            </div>
          )}
          {escaneando && <Escaner alDetectar={alLeerCodigo} alCerrar={() => setEscaneando(false)} />}
          <div className="lista">
            {deMas.map((d) => (
              <button key={d.parte} type="button" className="fila con-foto" onClick={() => irA(`mas/${d.parte}`)} data-testid={`mas-${d.parte}`}>
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
        : <Vender esDueno={puede(usuario, "ventas.ver")} />}

      <nav className="nav-inferior solo-celular" aria-label="Menú">
        {pestanas.map((p) => (
          <button key={p.ruta} type="button" data-testid={`menu-${p.ruta}`} className={pestana === p.ruta ? "activo" : ""} onClick={() => irA(p.ruta)} aria-current={pestana === p.ruta ? "page" : undefined}>
            {p.ruta === "mas" ? <IconoMas grosor={pestana === "mas" ? 2.2 : 1.8} /> : <Icono nombre={p.ruta} tam={26} grosor={pestana === p.ruta ? 2.2 : 1.8} />}
            <span>{p.nombre}</span>
          </button>
        ))}
      </nav>
      <PedidosDeLaCompu alSacar={(codigo) => irA(`foto?codigo=${encodeURIComponent(codigo)}`)} alLeer={() => irA("lector")} />
      <OfrecerHuella />
    </div>
  );
}
