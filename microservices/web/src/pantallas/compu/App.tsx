import { useEffect, type KeyboardEvent as ReactKeyboardEvent, useMemo } from "react";
import { useVentaEnEspejo } from "../../negocio/ventas/venta-en-espejo";
import { useVentaEnCurso } from "../../negocio/ventas/venta-en-curso";
import { Pedidos } from "../Pedidos";
import { sincronizarEmparejamiento } from "../../puesto";
import { useEspejar, useEspejo } from "../../espejo";
import { EspejoEstado } from "../EspejoEstado";
import { irAlPrimerItem, useFlechas, type DisposicionParaFlechas } from "../../plataforma/teclado/flechas";
import { useAtajos } from "../../plataforma/teclado/atajos";
import { zonasConTeclasPropias } from "../../plataforma/teclado/teclas";

zonasConTeclasPropias(".lateral, .pestanas");
const DISPOSICION: DisposicionParaFlechas = {
  pantalla: ".cuerpo",
  noSonListas: ".lateral, .pestanas, .mas-grilla",
  noSonCajas: ".pestanas",
  sinCaja: () => document.getElementById("contenido"),
  arribaDeLaLista: () => document.querySelector<HTMLElement>(".cuerpo .pestanas button[aria-current='page']"),
};
import { VincularParaEscanear } from "./Vender";
import { FotoParaLaCompu } from "../FotoParaLaCompu";
import { esAmbienteDePrueba } from "../../ambiente";
import { ProveedorDeSesion, useSesion } from "../../sesion";
import { ConRutas, irA, useRuta } from "./base/rutas";
import { Boton, EstadoDeConexion, Icono, Marca, Pagina, type NombreDeIcono } from "./base/ui";
import { Entrar } from "./base/pantallas/Entrar";
import { Manual } from "./base/pantallas/Manual";
import { VincularCelular } from "./base/pantallas/VincularCelular";
import { VentasDeHoy } from "./base/pantallas/VentasDeHoy";
import { Productos } from "./base/pantallas/Productos";
import { Listas } from "./base/pantallas/Listas";
import { Duplicados } from "./base/pantallas/Duplicados";
import { Inventario } from "./Inventario";
import { DineroInvertido } from "../DineroInvertido";
import { Ingreso } from "./Ingreso";
import { Configuracion } from "../Configuracion";
import { PantallaDeProcesos } from "../Procesos";
import { ComprasRecientes } from "./ComprasRecientes";
import { Contar } from "./base/pantallas/Contar";
import { ResumenCompras, ResumenInventario, ResumenVentas } from "./base/pantallas/Resumen";
import { MisCelulares, Usuarios } from "./base/pantallas/Usuarios";
import { VinculoPropio } from "../Vinculo";
import { PESTANAS_DE_USUARIOS } from "../pestanas-de-usuarios";
import { PIDE_EL_NEGOCIO, SECCIONES_DE_NEGOCIO, type SeccionDeNegocio } from "../pestanas-de-negocio";
import { Actividad } from "./base/pantallas/Actividad";
import { Vender } from "./Vender";
import { DE_MAS, Mas } from "./Mas";
import { puede, type Permiso } from "../permisos";
import { SinPermiso } from "../SinPermiso";
import { Roles } from "../Roles";
import { Tickets } from "../Tickets";
import { Anomalias } from "../Anomalias";
import { ParaRevisar } from "../ParaRevisar";
import { PESTANAS_DE_ANOMALIAS } from "../pestanas-de-anomalias";
import { useParaRevisar } from "../../negocio/apartados";
import "./base/estilos/base.css";
import "./base/estilos/entrar.css";
import "./tema.css";
import { LUGAR_AL_LADO_DE_LAS_PESTANAS } from "../AlLadoDeLasPestanas";

// La interfaz de computadora (menú lateral, tablas, todo con teclado), con
// la paleta de la v5, la venta con sugeridos y el menú reducido a lo de todos los días: lo
// que se usa poco va en «Más». Alt + número abre cada pantalla.
export function App() {
  return (
    <ConRutas>
      <ProveedorDeSesion>
        <Pantallas />
      </ProveedorDeSesion>
    </ConRutas>
  );
}

// El mismo menú que en el celular, en el mismo orden (primero lo que más se hace), y cada
// parte con sus pestañas adentro. «Más» es una pantalla con lo que se usa poco.
// Cada pantalla dice qué permiso pide (RF-72); sin `pide`, la ve cualquiera con sesión.
type Pestana = { ruta: string; nombre: string; icono: NombreDeIcono; pide?: Permiso[] };
type Parte = { clave: string; nombre: string; icono: NombreDeIcono; pestanas: Pestana[] };
const DE_USUARIOS: Pestana[] = PESTANAS_DE_USUARIOS.map((p) => ({ ruta: p.valor, nombre: p.nombre, icono: p.icono, pide: p.pide }));
const RUTAS_DE_USUARIOS = new Set(DE_USUARIOS.map((p) => p.ruta));
// Cómo va el negocio también es una opción de Más con pestañas, una por sección (decisión 95).
const RUTA_DE_SECCION: Record<SeccionDeNegocio, string> = { ventas: "resumen", compras: "gastos", inventario: "invertido" };
const DE_NEGOCIO: Pestana[] = SECCIONES_DE_NEGOCIO.map((s) => ({ ruta: RUTA_DE_SECCION[s.valor], nombre: s.nombre, icono: s.icono, pide: s.pide }));
const RUTAS_DE_NEGOCIO = new Set(DE_NEGOCIO.map((p) => p.ruta));
// Las opciones de Más con pestañas: sus pestañas no llevan atajo Alt y se recorren con las flechas.
// Anomalías también (014): «Para revisar» y «Anotadas».
const DE_ANOMALIAS: Pestana[] = PESTANAS_DE_ANOMALIAS.map((p) => ({ ruta: p.valor, nombre: p.nombre, icono: p.icono, pide: p.pide }));
const RUTAS_DE_ANOMALIAS = new Set(DE_ANOMALIAS.map((p) => p.ruta));
const SIN_ATAJO = new Set([...RUTAS_DE_USUARIOS, ...RUTAS_DE_NEGOCIO, ...RUTAS_DE_ANOMALIAS]);
const MENU: Parte[] = [
  { clave: "catalogo", nombre: "Catálogo", icono: "catalogo", pestanas: [{ ruta: "productos", icono: "productos", nombre: "Productos" }, { ruta: "listas", icono: "listas", nombre: "Listas", pide: ["catalogo.listas"] }, { ruta: "duplicados", icono: "duplicados", nombre: "Duplicados", pide: ["catalogo.duplicados"] }] },
  { clave: "vender", nombre: "Vender", icono: "vender", pestanas: [{ ruta: "vender", icono: "vender", nombre: "Vender", pide: ["ventas.registrar"] }, { ruta: "hoy", icono: "ventas", nombre: "Hoy", pide: ["ventas.ver"] }, { ruta: "anular", icono: "deshacer", nombre: "Anular", pide: ["ventas.anular", "ventas.anular_cualquiera"] }] },
  { clave: "deposito", nombre: "Depósito", icono: "deposito", pestanas: [{ ruta: "stock", icono: "stock", nombre: "Inventario" }, { ruta: "compras", icono: "compras", nombre: "Ingreso", pide: ["deposito.ingresos"] }, { ruta: "contar", icono: "contar", nombre: "Estanterías", pide: ["deposito.stock"] }, { ruta: "pedidos", icono: "listas", nombre: "Pedidos", pide: ["deposito.pedidos", "deposito.ingresos"] }] },
  // Usuarios (decisión 88) y Cómo va el negocio (decisión 95) son opciones de Más con pestañas: en el menú cuentan sus pestañas.
  { clave: "mas", nombre: "Más", icono: "mas", pestanas: DE_MAS.flatMap((d) => (d.ruta === "usuarios" ? DE_USUARIOS : d.ruta === "resumen" ? DE_NEGOCIO : d.ruta === "anomalias" ? DE_ANOMALIAS : [{ ruta: d.ruta, nombre: d.nombre, icono: d.icono, pide: d.pide }])) },
];
// Pantallas que no están en el menú pero tienen dirección.
const FUERA_DEL_MENU: Pestana[] = [{ ruta: "mas", nombre: "Más", icono: "mas" }];
const TODAS = [...MENU.flatMap((m) => m.pestanas), ...FUERA_DEL_MENU];
const NOMBRES = new Map<string, string>(TODAS.map((p) => [p.ruta, p.nombre]));
// Las partes con el nombre que comparten el celular y la computadora en espejo (decisión 60).
const A_PARTE_COMUN: Record<string, string> = {
  productos: "catalogo", listas: "catalogo/listas", duplicados: "catalogo/duplicados", vender: "vender", hoy: "vender/hoy", anular: "vender/anular",
  pedidos: "deposito/pedidos", compras: "deposito/ingreso", stock: "deposito/stock", contar: "deposito/contar",
  mas: "mas", resumen: "mas/negocio", gastos: "mas/gastos", invertido: "mas/invertido", usuarios: "mas/usuarios", roles: "mas/roles", actividad: "mas/actividad", anomalias: "mas/anomalias", "para-revisar": "mas/para-revisar", tickets: "mas/tickets", configuracion: "mas/configuracion", procesos: "mas/procesos",
};
const DE_PARTE_COMUN: Record<string, string> = { ...Object.fromEntries(Object.entries(A_PARTE_COMUN).map(([ruta, parte]) => [parte, ruta])), "catalogo/productos": "productos" };
// Alt + número abre cada pantalla, en el orden en que se ven: 1 a 9 y 0.
const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

function Pantallas() {
  const { sesion, salir } = useSesion();
  // La venta en curso viaja al otro dispositivo desde cualquier pantalla (ADR-022).
  useVentaEnEspejo();
  // Cuántos renglones lleva la venta, en Vender del menú (015-E24).
  const enLaVenta = useVentaEnCurso().items.length;
  const ruta = useRuta();
  const codigoVinculacion = ruta.parametros.get("codigo");
  // Sin dirección, la app abre en lo primero del menú.
  const sinDireccion = location.hash.replace(/^#\/?/, "") === "";
  const conSesion = sesion.estado === "con-sesion";
  const { emparejado } = useEspejo();
  // Todo con el teclado: las flechas recorren lo que hay en pantalla (ver flechas.ts).
  // La disposición de esta interfaz, para la tecnología de teclado (que no la conoce): el menú
  // de la izquierda, las pestañas y las opciones de Más se recorren por su cuenta.
  useFlechas(true, DISPOSICION);
  useAtajos(true, { alFinal: ".lateral" });
  // Con la sesión abierta, el emparejamiento con el celular se pone al día con el servidor (decisión 58).
  useEffect(() => { if (conSesion) void sincronizarEmparejamiento(); }, [conSesion]);
  // El menú de esta persona: solo las partes y pantallas que sus roles le permiten. Los atajos
  // se numeran sobre lo que ve.
  const usuario = sesion.estado === "con-sesion" ? sesion.usuario : null;
  const menu = useMemo(() => MENU.map((m) => ({ ...m, pestanas: m.pestanas.filter((p) => puede(usuario, ...(p.pide ?? []))) })).filter((m) => m.pestanas.length > 0), [usuario]);
  // Las pestañas de Usuarios no llevan atajo (decisión 88): lo lleva solo la opción de Más, que abre la primera que se ve.
  const deUsuarios = useMemo(() => DE_USUARIOS.filter((p) => puede(usuario, ...(p.pide ?? []))), [usuario]);
  const deNegocio = useMemo(() => DE_NEGOCIO.filter((p) => puede(usuario, ...(p.pide ?? []))), [usuario]);
  const deAnomalias = useMemo(() => DE_ANOMALIAS.filter((p) => puede(usuario, ...(p.pide ?? []))), [usuario]);
  // Lo que hay para revisar, para mostrar la cantidad en su pestaña (014).
  const paraRevisar = useParaRevisar(puede(usuario, "admin.usuarios")).datos?.apartados.length ?? 0;
  const conAtajo = useMemo(() => menu.flatMap((m) => m.pestanas.map((p) => p.ruta)).filter((r) => !SIN_ATAJO.has(r) || r === deUsuarios[0]?.ruta || r === deNegocio[0]?.ruta || r === deAnomalias[0]?.ruta), [menu, deUsuarios, deNegocio, deAnomalias]);
  const atajoDe = (r: string) => { const i = conAtajo.indexOf(r); return i < 0 || i >= TECLAS.length ? null : TECLAS[i]!; };
  const actual = sinDireccion || !NOMBRES.has(ruta.nombre) ? "productos" : ruta.nombre;
  const pideActual = RUTAS_DE_NEGOCIO.has(actual) && !puede(usuario, ...PIDE_EL_NEGOCIO) ? PIDE_EL_NEGOCIO : TODAS.find((p) => p.ruta === actual)?.pide;
  // Sin ninguno de los permisos de Cómo va el negocio se nombran todos, como en el celular (012-E05).
  const falta = usuario && !puede(usuario, ...(pideActual ?? [])) ? pideActual! : null;
  // En espejo con el celular (decisión 60): los dos están en la misma parte. Las direcciones
  // del celular y las de la computadora no son las mismas: viajan con un nombre común.
  // El ingreso que se abre desde un pedido («llegó la mercadería») también viaja, con su pedido.
  const pedidoDeLaRuta = ruta.parametros.get("pedido");
  const soloElPedido = [...ruta.parametros.keys()].every((k) => k === "pedido");
  const parteEnEspejo = conSesion && soloElPedido && A_PARTE_COMUN[actual] ? `${A_PARTE_COMUN[actual]}${pedidoDeLaRuta ? `?pedido=${pedidoDeLaRuta}` : ""}` : null;
  useEspejar<string | null>("ir", parteEnEspejo, (parte) => {
    if (!parte || !conSesion) return;
    const [base = "", consulta] = parte.split("?");
    const destino = base === "deposito" ? (menu.find((m) => m.clave === "deposito")?.pestanas[0]?.ruta ?? "stock") : DE_PARTE_COMUN[base];
    if (!destino) return;
    if (destino !== actual || (consulta ?? "") !== (pedidoDeLaRuta ? `pedido=${pedidoDeLaRuta}` : "")) irA(consulta ? `${destino}?${consulta}` : destino);
  }, parteEnEspejo !== null);

  useEffect(() => { window.scrollTo(0, 0); }, [actual]);
  useEffect(() => { document.title = conSesion ? `${NOMBRES.get(actual)} · Ferrebress` : "Ferrebress"; }, [actual, conSesion]);
  useEffect(() => {
    if (!conSesion) return;
    const tecla = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || !/^Digit[0-9]$/.test(e.code)) return;
      const destino = conAtajo[TECLAS.indexOf(e.code.slice(5))];
      if (destino) { e.preventDefault(); irA(destino); }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [conSesion, conAtajo]);
  // Flechas entre el menú y la pantalla: ← lleva el foco al menú, ↑ ↓ lo recorren, y → (o
  // Enter) abre lo elegido y devuelve el foco a la pantalla, donde ↑ ↓ vuelven a elegir sus
  // renglones. Mientras se escribe, ← sigue moviendo el cursor: solo salta al menú con la
  // caja vacía o con el cursor al principio. En una lista desplegable las opciones se
  // cambian con ↑ ↓, así que ← también lleva al menú.
  useEffect(() => {
    if (!conSesion) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (document.querySelector("dialog[open], [role='dialog'], [aria-modal='true']")) return;
      const foco = document.activeElement as HTMLElement | null;
      if (foco?.closest(".lateral, .pestanas")) return;
      if (foco instanceof HTMLInputElement || foco instanceof HTMLTextAreaElement) {
        const deTexto = foco instanceof HTMLTextAreaElement || ["text", "search", "", "tel", "url", "email", "password"].includes(foco.type);
        if (!deTexto || (foco.value !== "" && !(foco.selectionStart === 0 && foco.selectionEnd === 0))) return;
      } else if (foco && (foco.isContentEditable || ["radio", "tab", "slider", "option", "menuitem"].includes(foco.getAttribute("role") ?? ""))) return;
      const botones = [...document.querySelectorAll<HTMLButtonElement>(".lateral nav button")];
      const destino = botones.find((b) => b.getAttribute("aria-current") === "page") ?? botones[0];
      if (destino) { e.preventDefault(); destino.focus(); }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [conSesion]);
  // Poner el foco en la pantalla: primero la búsqueda (u otro campo); si no tiene, su primer botón.
  // Entrar a la pantalla con el teclado: la marca de las flechas va a la primera fila de su
  // lista y el cursor de escritura queda en su caja de texto. Con la lista vacía no hace nada,
  // y la marca se queda en las pestañas o en el menú (decisión 82).
  const focoALaPantalla = () => irAlPrimerItem();
  // Dejar la marca de las flechas en un lugar aunque la pantalla nueva, al abrirse, ponga el
  // foco en su búsqueda: se insiste un momento, salvo que la persona ya haya tocado otra cosa.
  function dejarElFocoEn(buscar: () => HTMLElement | null | undefined): void {
    let cancelado = false;
    const cancelar = () => { cancelado = true; };
    window.addEventListener("keydown", cancelar, { once: true, capture: true });
    window.addEventListener("mousedown", cancelar, { once: true, capture: true });
    for (const espera of [60, 150, 350, 600]) setTimeout(() => { if (!cancelado) buscar()?.focus(); }, espera);
  }
  const pestanaActual = () => document.querySelector<HTMLButtonElement>(".cuerpo .pestanas button[aria-current='page']") ?? document.querySelector<HTMLButtonElement>(".cuerpo .pestanas button");
  // En el menú lateral: ↑ ↓ recorren todo lo que tiene (las partes y, debajo, los botones del
  // espejo y Salir). → abre la parte y pasa a sus pestañas, si tiene; si no, a la pantalla.
  function teclasDelMenu(e: ReactKeyboardEvent<HTMLElement>) {
    const botones = [...e.currentTarget.querySelectorAll<HTMLButtonElement>("button:not([disabled])")];
    const i = botones.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      botones[(i + (e.key === "ArrowDown" ? 1 : botones.length - 1)) % botones.length]!.focus();
    } else if (e.key === "Enter" && botones[i]!.closest("nav")) {
      // Enter abre la parte y deja la marca de las flechas en su primera pestaña (en Más, en su primera opción).
      e.preventDefault();
      botones[i]!.click();
      dejarElFocoEn(() => pestanaActual() ?? document.querySelector<HTMLButtonElement>(".cuerpo .mas-grilla button"));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      // Solo las partes se abren con →; desde Desvincular o Salir, → vuelve a la pantalla sin tocarlos.
      const esParte = Boolean(botones[i]!.closest("nav"));
      const cambia = esParte && botones[i]!.getAttribute("aria-current") !== "page";
      if (cambia) botones[i]!.click();
      // Al cambiar de parte hay que esperar a que la pantalla nueva esté dibujada.
      const destino = () => (esParte ? pestanaActual() : null) ?? document.querySelector<HTMLButtonElement>(".cuerpo .mas-grilla button");
      if (cambia) dejarElFocoEn(destino); else destino()?.focus();
    }
  }
  // En las pestañas de una parte (Productos, Listas, Duplicados): ← → pasan el foco de una a
  // otra sin abrirla; Enter abre la que tiene el foco; ← desde la primera vuelve al menú; ↓ entra
  // a la pantalla que está abierta.
  function teclasDeLasPestanas(e: ReactKeyboardEvent<HTMLElement>) {
    const botones = [...e.currentTarget.querySelectorAll<HTMLButtonElement>("button")];
    const i = botones.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0 || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      // Las flechas solo pasan el foco, como en el menú: la pestaña se abre con Enter (pedido de Carlos del 2026-10-13).
      e.preventDefault(); e.stopPropagation();
      const destino = botones[i + (e.key === "ArrowRight" ? 1 : -1)];
      if (destino) destino.focus();
      else if (e.key === "ArrowLeft") (document.querySelector<HTMLButtonElement>(".lateral nav button[aria-current='page']") ?? document.querySelector<HTMLButtonElement>(".lateral nav button"))?.focus();
    } else if (e.key === "Enter") {
      e.preventDefault(); e.stopPropagation();
      const elegida = botones[i]!;
      // Enter abre la pestaña que tiene el foco y lo deja en ella; si ya estaba abierta, entra a la pantalla.
      if (elegida.getAttribute("aria-current") === "page") focoALaPantalla();
      else elegida.click();
    } else if (e.key === "ArrowDown") {
      e.preventDefault(); e.stopPropagation();
      focoALaPantalla();
    }
  }

  if (sesion.estado === "cargando") return <main className="entrar-cargando" aria-busy="true"><Marca tam={44} /><p>Abriendo Ferrebress…</p></main>;
  if (ruta.nombre === "vincular-celular" && codigoVinculacion) return <VincularCelular codigo={codigoVinculacion} />;
  // El manual de uso se ve sin sesión: lo abre «Ver tutorial» en la entrada (RF-97).
  if (ruta.nombre === "manual") return <Manual />;
  if (sesion.estado === "sin-sesion") return <Entrar />;
  // El celular llega acá al leer el código QR de la computadora: con la sesión ya iniciada, saca la foto que
  // pidió la computadora.
  if (ruta.nombre === "foto" && codigoVinculacion) return <FotoParaLaCompu codigo={codigoVinculacion} />;

  const parte = MENU.find((m) => m.pestanas.some((p) => p.ruta === actual))?.clave ?? "mas";
  // Vender, Catálogo y Depósito tienen pestañas; con una sola a la vista no se dibujan.
  // En Más, solo Usuarios y Cómo va el negocio tienen pestañas.
  const deLaParte = RUTAS_DE_USUARIOS.has(actual) ? deUsuarios : RUTAS_DE_NEGOCIO.has(actual) ? deNegocio : RUTAS_DE_ANOMALIAS.has(actual) ? deAnomalias : parte === "mas" ? null : (menu.find((m) => m.clave === parte)?.pestanas ?? null);
  const pestanas = deLaParte && deLaParte.length > 1 ? deLaParte : null;
  const deMas = DE_MAS.filter((d) => puede(usuario, ...(d.pide ?? []))).map((d) => (d.ruta === "usuarios" ? { ...d, destino: deUsuarios[0]?.ruta ?? "usuarios" } : d.ruta === "resumen" ? { ...d, destino: deNegocio[0]?.ruta ?? "resumen" } : d.ruta === "anomalias" ? { ...d, destino: deAnomalias[0]?.ruta ?? "anomalias" } : d));
  const prueba = esAmbienteDePrueba();

  return (
    <div className="app">
      <a className="saltar" href="#contenido" onClick={(e) => { e.preventDefault(); document.getElementById("contenido")?.focus(); }}>Ir al contenido</a>
      <aside className="lateral" onKeyDown={teclasDelMenu}>
        <div className="lateral-marca">
          <Marca />
        </div>
        <nav aria-label="Menú">
          {menu.map((m) => {
            const destino = m.clave === "mas" ? "mas" : m.pestanas[0]!.ruta;
            return (
              <button key={m.clave} type="button" aria-current={parte === m.clave ? "page" : undefined} aria-keyshortcuts={atajoDe(destino) ? `Alt+${atajoDe(destino)}` : undefined} onClick={() => irA(destino)} data-testid={`menu-${m.clave}`}>
                <Icono nombre={m.icono} tam={19} grosor={parte === m.clave ? 2.3 : 1.9} />{m.nombre}
                {/* El número que, con Alt, abre la primera pantalla de esta parte. */}
                {atajoDe(m.pestanas[0]!.ruta) && <span className="atajo" aria-hidden="true">Alt+{atajoDe(m.pestanas[0]!.ruta)}</span>}
                {m.pestanas.some((p) => p.ruta === "vender") && enLaVenta > 0 && <b className="cuenta-menu" aria-label={`${enLaVenta} en la venta`} data-testid="cuenta-venta">{enLaVenta}</b>}
              </button>
            );
          })}
        </nav>
        <p className="lateral-ayuda">Con el teclado: ↑ ↓ recorren el menú y las listas, ← → las pestañas, Tab pasa de un campo a otro, Enter acciona y Esc cierra. Alt + número abre cada pantalla; con Alt apretado, cada botón muestra su letra.</p>
        <EspejoEstado />
        {!emparejado && <div className="lateral-vincular"><VincularParaEscanear vinculado={false} alVincular={() => undefined} /></div>}
        <div className="lateral-pie">
          <EstadoDeConexion />
          <div className="quien">
            <span data-testid="usuario" title={sesion.usuario.email}>{sesion.usuario.nombre}</span>
            <Boton variante="sobre-marino" tam="chico" icono="salir" onClick={salir} data-testid="salir">Salir</Boton>
          </div>
          <small className="version" title="Versión de la app">{import.meta.env.VITE_VERSION ?? "local"}</small>
        </div>
      </aside>
      <div className={`cuerpo ${pestanas ? "con-pestanas" : ""}`}>
        {pestanas && (
          <div className="pestanas-fila">
          <nav className="pestanas" aria-label={NOMBRES.get(actual)} onKeyDown={teclasDeLasPestanas}>
            {pestanas.map((p) => (
              <button key={p.ruta} type="button" aria-current={actual === p.ruta ? "page" : undefined} aria-keyshortcuts={atajoDe(p.ruta) && !SIN_ATAJO.has(p.ruta) ? `Alt+${atajoDe(p.ruta)}` : undefined} data-testid={`pestana-${p.ruta}`}
                // Al abrirla (con un clic o con Enter), la marca de las flechas queda en esta pestaña: la pantalla nueva no se la lleva.
                onClick={() => { irA(p.ruta); dejarElFocoEn(() => document.querySelector<HTMLButtonElement>(`[data-testid="pestana-${p.ruta}"]`)); }}>
                <Icono nombre={p.icono} tam={20} grosor={actual === p.ruta ? 2.3 : 2} />{p.nombre}{p.ruta === "para-revisar" && paraRevisar > 0 && <span className="cuenta-pestana" data-testid="cuenta-para-revisar" aria-label={`${paraRevisar} para revisar`}>{paraRevisar}</span>}{atajoDe(p.ruta) && !SIN_ATAJO.has(p.ruta) && <span className="tecla" aria-hidden="true">Alt+{atajoDe(p.ruta)}</span>}
              </button>
            ))}
          </nav>
          {/* La acción de la pantalla, a la derecha de las pestañas (pedido de Carlos del 2026-10-15). */}
          <div className="pestanas-acciones" id={LUGAR_AL_LADO_DE_LAS_PESTANAS} />
          </div>
        )}
        {falta ? <SinPermiso falta={falta} />
          : actual === "mas" ? <Mas atajoDe={atajoDe} opciones={deMas} />
          : actual === "roles" ? <Roles />
          : actual === "pedidos" ? <main id="contenido" className="pagina" tabIndex={-1}><Pedidos alIngresar={(id) => irA(`compras?pedido=${id}`)} /></main>
          : actual === "hoy" ? <VentasDeHoy modo="hoy" /> : actual === "anular" ? <VentasDeHoy modo="anular" /> : actual === "productos" ? <Productos /> : actual === "compras" ? <Ingreso />
          : actual === "stock" ? <Inventario /> : actual === "listas" ? <Listas /> : actual === "duplicados" ? <Duplicados />
          : actual === "contar" ? <Contar /> : actual === "resumen" ? <ResumenVentas />
          : actual === "gastos" ? <ResumenCompras recientes={(vuelta) => <ComprasRecientes key={`recientes-${vuelta}`} />} />
          : actual === "invertido" ? <ResumenInventario invertido={(vuelta) => <DineroInvertido key={vuelta} />} /> : actual === "usuarios" ? <Usuarios />
          : actual === "actividad" ? <Actividad /> : actual === "tickets" ? <Tickets /> : actual === "configuracion" ? <Configuracion propio={<><MisCelulares /><VinculoPropio /></>} /> : actual === "procesos" ? <PantallaDeProcesos interfaz="compu" /> : actual === "anomalias" ? <Anomalias cabeza={pestanas ? null : undefined} /> : actual === "para-revisar" ? <ParaRevisar cabeza={pestanas ? null : <h1>Anomalías</h1>} /> : <Vender />}
      </div>
    </div>
  );
}
