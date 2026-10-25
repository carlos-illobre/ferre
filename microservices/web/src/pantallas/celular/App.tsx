import { useCallback, useEffect, useRef, useState } from "react";
import { useVentaEnEspejo } from "../../negocio/ventas/venta-en-espejo";
import { useVentaEnCurso } from "../../negocio/ventas/venta-en-curso";
import { EntrarEnLaCompu } from "./EntrarEnLaCompu";
import { PedidosDeLaCompu } from "../PedidosDeLaCompu";
import { Lector } from "./Lector";
import { TEXTOS_DEL_VINCULO } from "../textos";
import { IndicadorDelVinculo } from "../IndicadorDelVinculo";
import { useCatalogo } from "../../negocio/catalogo";
import { ConfiguracionCelu } from "./pantallas/Configuracion";
import { PantallaDeProcesos } from "../Procesos";
import { EstadoDeConexion } from "./componentes/EstadoDeConexion";
import { alAvisoDelEspejo, useEspejar, useEspejo } from "../../espejo";
import { Escaner, hayCamara } from "../../plataforma/camara/Escaner";
import { sincronizarEmparejamiento } from "../../puesto";
import { FotoParaLaCompu } from "../FotoParaLaCompu";
import { OfrecerHuella } from "./componentes/OfrecerHuella";
import { Icono, Lista } from "./componentes/base";
import { ProveedorDeSesion, useSesion } from "../../datos/sesion";
import { puede, type Permiso } from "../permisos";
import { SinPermiso } from "../SinPermiso";
import { Roles } from "../Roles";
import { animarNavegacion, ConRutas, irA, useRuta } from "../../rutas";
import { destinoDelCodigo, Entrar } from "./Entrar";
import { VincularCelular } from "./pantallas/VincularCelular";
import { Catalogo } from "./Catalogo";
import { Icono as IconoDeMas, type NombreDeIcono } from "../compu/base/ui";
import { Deposito } from "./Deposito";
import { Negocio, type Parte } from "./Negocio";
import { TicketsCelu } from "./pantallas/Tickets";
import { CabezaDeNegocio } from "./Usuarios";
import { PESTANAS_DE_USUARIOS, PIDE_USUARIOS } from "../pestanas-de-usuarios";
import { Sistema } from "../Sistema";
import { PIDE_EL_NEGOCIO, SECCIONES_DE_NEGOCIO } from "../pestanas-de-negocio";
import { ComoVaElNegocio, SUB_DE_SECCION } from "./ComoVaElNegocio";
import { NOMBRES, TEXTOS } from "../textos";
import { AnotadasCelu, ParaRevisarCelu } from "./pantallas/Anomalias";
import { CabezaDeAnomalias } from "./CabezaDeAnomalias";
import { PESTANAS_DE_ANOMALIAS, PIDE_LAS_ANOMALIAS } from "../pestanas-de-anomalias";
import { ParteVender } from "./Vender";
import "./estilos.css";
import "./tema.css";

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

// El mismo menú que en la computadora, en el mismo orden: primero lo que más se hace.
// Cada parte dice qué permiso pide (RF-72); sin `pide`, la ve cualquiera con sesión.
// Como la v2 (decisión 148): Vender · Catálogo · Depósito · Negocio · Más. Negocio no tiene dirección
// propia: sus pantallas siguen en mas/… (las direcciones de siempre) y se ven con Negocio marcado.
const PESTANAS: { ruta: "catalogo" | "vender" | "deposito" | "negocio" | "mas"; nombre: string; pide?: Permiso[] }[] = [
  { ruta: "vender", nombre: "Vender", pide: ["ventas.registrar", "ventas.ver", "ventas.anular", "ventas.anular_cualquiera"] },
  { ruta: "catalogo", nombre: "Catálogo" },
  { ruta: "deposito", nombre: "Depósito" },
  { ruta: "negocio", nombre: NOMBRES.negocio, pide: [...PIDE_EL_NEGOCIO, ...PIDE_USUARIOS] },
  { ruta: "mas", nombre: "Más" },
];
export const DE_MAS: { parte: Exclude<Parte, "actividad"> | "negocio" | "tickets" | "anomalias" | "configuracion" | "sistema" | "procesos"; nombre: string; detalle: string; icono: NombreDeIcono; pide?: Permiso[] }[] = [
  // Cómo va el negocio abre en la primera de sus secciones que la persona puede ver (decisión 95).
  { parte: "negocio", nombre: NOMBRES.comoVaElNegocio, detalle: TEXTOS.negocio.queHayEnElNegocio.corto, icono: "resumen", pide: PIDE_EL_NEGOCIO },
  // Usuarios abre en la primera de sus pestañas que la persona puede ver (decisión 88).
  { parte: "usuarios", nombre: NOMBRES.usuarios, detalle: TEXTOS.usuarios.queHayEnUsuarios.corto, icono: "usuarios", pide: PIDE_USUARIOS },
  // Anomalías abre en la primera de sus pestañas que la persona puede ver: «Para revisar» o «Anotadas» (014).
  { parte: "anomalias", nombre: "Anomalías", detalle: "Cuando el sistema y la realidad no coinciden", icono: "alerta", pide: PIDE_LAS_ANOMALIAS },
  { parte: "procesos", nombre: "Procesos", detalle: "Cómo se hace cada cosa en el negocio, paso a paso", icono: "procesos", pide: ["procesos.ver", "procesos.dibujar"] },
  { parte: "tickets", nombre: "Mejoras y errores", detalle: "Avisar de un error o proponer una mejora, con fotos", icono: "editar" },
  { parte: "configuracion", nombre: "Configuración", detalle: TEXTOS.configuracion.queHay.corto, icono: "ajustes" },
  // Lo que vale para todos los dispositivos (specs/020).
  { parte: "sistema", nombre: "Sistema", detalle: TEXTOS.sistema.queHay.corto, icono: "computadora", pide: ["admin.sistema"] },
];

// Buscando en el servidor (RF-85): mientras una consulta está en curso, se dice arriba.
function BuscandoEnElServidor() {
  const { buscandoEnElServidor } = useCatalogo();
  return buscandoEnElServidor ? <span className="estado-chico pendiente" role="status" data-testid="buscando-en-el-servidor"><i aria-hidden="true" />Buscando en el servidor…</span> : null;
}

// Lo que terminó en la computadora («venta cobrada») se dice acá un momento.
function AvisoDeLaCompu() {
  const [aviso, setAviso] = useState<string | null>(null);
  useEffect(() => alAvisoDelEspejo(setAviso), []);
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 7000); return () => clearTimeout(t); }, [aviso]);
  return aviso ? <span className="aviso-de-la-compu" role="status" data-testid="espejo-aviso">{aviso}</span> : null;
}

function Pantallas() {
  // En el celular la navegación se anima (decisión 78).
  useEffect(() => { animarNavegacion(true); return () => animarNavegacion(false); }, []);
  const { sesion, salir } = useSesion();
  // La venta en curso viaja al otro dispositivo desde cualquier pantalla (ADR-022).
  useVentaEnEspejo();
  // Cuántos renglones lleva la venta, en Vender del menú (015-E24).
  const enLaVenta = useVentaEnCurso().items.length;
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
    // Depósito sin pestaña elegida es Inventario, y se lo nombra así: es como lo nombra la
    // computadora. Si cada uno nombrara distinto la misma pantalla, la computadora le devolvería
    // al celular su propio nombre y lo traería de vuelta a Depósito aunque ya se hubiera ido a otra parte.
    ? `${nombreDeParte}${ruta.nombre === "negocio" ? "/negocio" : ruta.sub ? `/${ruta.sub}` : nombreDeParte === "deposito" ? "/stock" : ""}${pedidoDeLaRuta ? `?pedido=${pedidoDeLaRuta}` : ""}` : null;
  useEspejar<string | null>("ir", parteEnEspejo, (parte) => { if (parte && sesion.estado === "con-sesion") irA(parte); }, parteEnEspejo !== null);
  // Vincular con la computadora sin salir de la aplicación: la cámara se abre acá adentro y lee
  // el código que la computadora muestra en «Vincular el celular» (o en su entrada).
  const { emparejado } = useEspejo();
  const [escaneando, setEscaneando] = useState(false);
  const [errorDeCodigo, setErrorDeCodigo] = useState<string | null>(null);
  const alLeerCodigo = useCallback((leido: string) => {
    const destino = destinoDelCodigo(leido);
    if (destino) irA(destino.replace(/^#\//, "")); else setErrorDeCodigo("Ese código no es de Ferrebress. Apuntá al que muestra la computadora al tocar «Vincular el celular».");
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
  // En Más quedan las opciones que no pasaron a Negocio.
  const deMas = DE_MAS.filter((d) => d.parte !== "negocio" && d.parte !== "usuarios" && permitido(d.pide));
  // Sin dirección, la app abre en lo primero del menú. Las direcciones viejas de Negocio siguen andando.
  const sinDireccion = location.hash.replace(/^#\/?/, "") === "";
  const nombre = sinDireccion ? "catalogo" : ruta.nombre === "negocio" ? "mas" : ruta.nombre;
  // Las pestañas de Usuarios (decisión 88) son de la opción «Usuarios» de Más.
  const deUsuarios = PESTANAS_DE_USUARIOS.find((p) => ruta.nombre === "mas" && p.valor === ruta.sub) ?? null;
  const primeraDeUsuarios = PESTANAS_DE_USUARIOS.find((p) => permitido(p.pide))?.valor ?? "usuarios";
  // Las secciones de Cómo va el negocio (decisión 95), cada una con su dirección.
  const subDeNegocio = ruta.nombre === "negocio" ? "negocio" : ruta.nombre === "mas" ? ruta.sub : null;
  const deNegocio = SECCIONES_DE_NEGOCIO.find((s) => SUB_DE_SECCION[s.valor] === subDeNegocio) ?? null;
  const primeraDeNegocio = SUB_DE_SECCION[SECCIONES_DE_NEGOCIO.find((s) => permitido(s.pide))?.valor ?? "ventas"];
  // Las pestañas de Anomalías (014): `mas/para-revisar` y `mas/anomalias`.
  const deAnomalias = PESTANAS_DE_ANOMALIAS.find((p) => ruta.nombre === "mas" && p.valor === ruta.sub) ?? null;
  const primeraDeAnomalias = PESTANAS_DE_ANOMALIAS.find((p) => permitido(p.pide))?.valor ?? "anomalias";
  const elegida = deUsuarios ? DE_MAS.find((d) => d.parte === "usuarios")! : deNegocio ? DE_MAS.find((d) => d.parte === "negocio")! : deAnomalias ? DE_MAS.find((d) => d.parte === "anomalias")! : DE_MAS.find((d) => d.parte === ruta.sub) ?? null;
  const parte = elegida?.parte ?? null;
  const pestana = PESTANAS.find((p) => p.ruta === nombre && p.ruta !== "negocio")?.ruta ?? "catalogo";
  // Negocio: Cómo va el negocio, Usuarios (con Roles) y Quién hizo qué.
  const enNegocio = pestana === "mas" && Boolean(deUsuarios || deNegocio);
  const primeraDeLaParteNegocio = permitido(PIDE_EL_NEGOCIO) ? primeraDeNegocio : primeraDeUsuarios;
  // Lo que pide la pantalla a la que se llegó; si no se tiene, se dice en vez de mostrarla.
  const falta = !permitido(PESTANAS.find((p) => p.ruta === pestana)?.pide) ? PESTANAS.find((p) => p.ruta === pestana)!.pide!
    : pestana === "mas" && elegida && !permitido(elegida.pide) ? elegida.pide!
    : pestana === "mas" && deUsuarios && !permitido(deUsuarios.pide) ? deUsuarios.pide!
    : pestana === "mas" && deNegocio && !permitido(deNegocio.pide) ? deNegocio.pide
    : pestana === "mas" && deAnomalias && !permitido(deAnomalias.pide) ? deAnomalias.pide : null;

  const activa = (r: string) => (r === "negocio" ? enNegocio : r === pestana && !(r === "mas" && enNegocio));
  return (
    <div className="app">
      {/* La línea de arriba (decisión 76): cómo está la conexión, siempre a la vista, y lo que
          termina en la computadora, un momento. El estado del vínculo lo dice el color del botón. */}
      <div className="linea-de-arriba"><EstadoDeConexion testId="conexion-celular" /><BuscandoEnElServidor /><AvisoDeLaCompu /></div>

      {/* A la derecha del encabezado de cualquier pantalla (decisiones 70 y 73): sin vínculo,
          «Vincular»; con vínculo, el estado de la conexión con la computadora (specs/023), que al
          tocarlo muestra el detalle con «Desconectar» o «Reconectar». Desvincular está en Más. */}
      {(emparejado || hayCamara()) && (
        <div className="vincular-lugar">
          {!emparejado ? (
            <button type="button" className="vincular-boton" data-testid="vincular-arriba" aria-label="Vincular con la computadora" title="Vincular con la computadora"
              onClick={() => { setErrorDeCodigo(null); setEscaneando(true); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4M12 7v6M9 10h6" /></svg>
              <span>{TEXTOS_DEL_VINCULO.vincular}</span>
            </button>
          ) : <IndicadorDelVinculo celular />}
        </div>
      )}
      {escaneando && <Escaner alDetectar={alLeerCodigo} alCerrar={() => setEscaneando(false)} />}
      {errorDeCodigo && pestana !== "mas" && <p className="aviso-suave vincular-error" role="alert" data-testid="codigo-no-reconocido">{errorDeCodigo}</p>}
      {pestana === "mas" && parte && !enNegocio && (
        <div className="volver-a-mas">
          <button type="button" onClick={() => irA("mas")} data-testid="volver-a-mas">
            <Icono nombre="izquierda" tam={18} grosor={2.4} />
            <span>Volver a Más</span>
          </button>
        </div>
      )}
      {falta ? <SinPermiso falta={falta} />
        : pestana === "mas" && parte === "tickets" ? <TicketsCelu />
        : pestana === "mas" && parte === "configuracion" ? <ConfiguracionCelu />
        : pestana === "mas" && parte === "sistema" ? <Sistema celular />
        : pestana === "mas" && parte === "procesos" ? <PantallaDeProcesos interfaz="celu" />
        : pestana === "mas" && deUsuarios?.valor === "roles" ? <Roles cabeza={<CabezaDeNegocio actual="roles" />} />
        : pestana === "mas" && deUsuarios ? <Negocio parte={deUsuarios.valor as Exclude<typeof deUsuarios.valor, "roles">} cabeza={<CabezaDeNegocio actual={deUsuarios.valor} />} />
        : pestana === "mas" && deAnomalias?.valor === "para-revisar" ? <ParaRevisarCelu cabeza={<CabezaDeAnomalias actual="para-revisar" />} />
        : pestana === "mas" && parte === "anomalias" ? <AnotadasCelu cabeza={<CabezaDeAnomalias actual="anomalias" />} />
        : pestana === "mas" && deNegocio ? <ComoVaElNegocio seccion={deNegocio.valor} />
        : pestana === "mas" && parte && parte !== "tickets" && parte !== "anomalias" && parte !== "configuracion" && parte !== "sistema" && parte !== "procesos" && parte !== "negocio" ? <Negocio parte={parte} />
        : pestana === "mas" ? (
        <main className="contenido" data-testid="mas">
          <div className="encabezado"><h1 className="titulo">Más</h1></div>
          {!emparejado && hayCamara() && (
            <Lista>
              <button type="button" className="fila con-foto" onClick={() => { setErrorDeCodigo(null); setEscaneando(true); }} data-testid="vincular-con-la-compu">
                <span className="miniatura mas-icono"><Icono nombre="escanear" tam={22} /></span>
                <span className="nombre">Vincular con la computadora</span>
                <Icono nombre="derecha" tam={18} grosor={2.4} />
                <span className="detalle">Escaneá el código que muestra la computadora, sin salir de acá</span>
              </button>
              {errorDeCodigo && <p className="aviso-suave" role="alert" data-testid="codigo-no-reconocido">{errorDeCodigo}</p>}
            </Lista>
          )}
          <Lista>
            {deMas.map((d) => (
              <button key={d.parte} type="button" className="fila con-foto" onClick={() => irA(`mas/${d.parte === "usuarios" ? primeraDeUsuarios : d.parte === "negocio" ? primeraDeNegocio : d.parte === "anomalias" ? primeraDeAnomalias : d.parte}`)} data-testid={`mas-${d.parte}`}>
                <span className="miniatura mas-icono"><IconoDeMas nombre={d.icono} tam={22} /></span>
                <span className="nombre">{d.nombre}</span>
                <Icono nombre="derecha" tam={18} grosor={2.4} />
                <span className="detalle">{d.detalle}</span>
              </button>
            ))}
          </Lista>
          <Lista>
            <button type="button" className="fila con-foto" onClick={salir} data-testid="salir">
              <span className="miniatura mas-icono"><Icono nombre="salir" tam={22} /></span>
              <span className="nombre">Salir</span>
              <Icono nombre="derecha" tam={18} grosor={2.4} />
              <span className="detalle" data-testid="usuario">Entraste como {usuario.nombre}</span>
            </button>
          </Lista>
        </main>
      ) : pestana === "catalogo" ? <Catalogo sub={sinDireccion ? null : ruta.sub} />
        : pestana === "deposito" ? <Deposito sub={ruta.sub} />
        : <ParteVender sub={ruta.sub} />}

      <nav className="nav-inferior solo-celular" aria-label="Menú">
        {pestanas.map((p) => (
          <button key={p.ruta} type="button" data-testid={`menu-${p.ruta}`} className={activa(p.ruta) ? "activo" : ""} onClick={() => irA(p.ruta === "negocio" ? `mas/${primeraDeLaParteNegocio}` : p.ruta)} aria-current={activa(p.ruta) ? "page" : undefined}>
            <Icono nombre={`menu-${p.ruta}`} tam={26} grosor={activa(p.ruta) ? 2.2 : 1.8} />
            <span>{p.nombre}</span>
            {p.ruta === "vender" && enLaVenta > 0 && <b className="cuenta-menu" aria-label={`${enLaVenta} en la venta`} data-testid="cuenta-venta">{enLaVenta}</b>}
          </button>
        ))}
      </nav>
      <PedidosDeLaCompu alSacar={(codigo) => irA(`foto?codigo=${encodeURIComponent(codigo)}`)} alLeer={() => irA("lector")} />
      <OfrecerHuella />
    </div>
  );
}
