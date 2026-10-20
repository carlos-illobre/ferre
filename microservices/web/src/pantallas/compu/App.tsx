import { createPortal } from "react-dom";
import { saltar } from "../../plataforma/animacion/animacion";
import "../../plataforma/animacion/animacion.css";
import { useEffect, type KeyboardEvent as ReactKeyboardEvent, useMemo, useRef, useState } from "react";
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
import { Hoy } from "./base/pantallas/Hoy";
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
import "./base/estilos/menu.css";
import { Isotipo, Logotipo } from "../Logotipo";
import { LUGAR_AL_LADO_DE_LAS_PESTANAS } from "../AlLadoDeLasPestanas";

// La interfaz de computadora (menú lateral, tablas, todo con teclado), con
// la paleta de la v5 y el menú reducido a lo de todos los días: lo
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
  { clave: "vender", nombre: "Vender", icono: "vender", pestanas: [{ ruta: "vender", icono: "vender", nombre: "Vender", pide: ["ventas.registrar"] }, { ruta: "hoy", icono: "ventas", nombre: "Ventas del día", pide: ["ventas.ver", "ventas.anular", "ventas.anular_cualquiera"] }] },
  { clave: "deposito", nombre: "Depósito", icono: "deposito", pestanas: [{ ruta: "stock", icono: "stock", nombre: "Inventario" }, { ruta: "compras", icono: "compras", nombre: "Ingreso", pide: ["deposito.ingresos"] }, { ruta: "contar", icono: "contar", nombre: "Estanterías", pide: ["deposito.stock"] }, { ruta: "pedidos", icono: "listas", nombre: "Pedidos", pide: ["deposito.pedidos", "deposito.ingresos"] }] },
  // Usuarios (decisión 88) y Cómo va el negocio (decisión 95) son opciones de Más con pestañas: en el menú cuentan sus pestañas.
  { clave: "mas", nombre: "Más", icono: "mas", pestanas: DE_MAS.flatMap((d) => (d.ruta === "usuarios" ? DE_USUARIOS : d.ruta === "resumen" ? DE_NEGOCIO : d.ruta === "anomalias" ? DE_ANOMALIAS : [{ ruta: d.ruta, nombre: d.nombre, icono: d.icono, pide: d.pide }])) },
];
// Pantallas que no están en el menú pero tienen dirección.
// «anular» era la pestaña de anular, que ahora está en «Ventas de hoy» (decisión 120): lleva ahí.
const FUERA_DEL_MENU: Pestana[] = [{ ruta: "mas", nombre: "Más", icono: "mas" }, { ruta: "anular", nombre: "Ventas del día", icono: "ventas" }];
// La cantidad de productos en la venta, en el menú: salta cuando suma, como la maqueta (decisión 134).
function CuentaDeLaVenta({ n }: { n: number }) {
  const ref = useRef<HTMLElement>(null);
  const antes = useRef(n);
  useEffect(() => { if (n > antes.current) saltar(ref.current); antes.current = n; }, [n]);
  return <b ref={ref} className="cuenta-menu" aria-label={`${n} en la venta`} data-testid="cuenta-venta">{n}</b>;
}
const inicialesDe = (nombre: string) => nombre.trim().split(/\s+/).map((p) => p[0] ?? "").slice(0, 2).join("").toUpperCase();
// El usuario abajo del menú, como la v2 (decisión 126): las iniciales, el nombre y el rol; al tocarlo,
// un menú con el nombre y el rol arriba y «Cerrar sesión». Esc lo cierra.
function CuentaDelUsuario({ nombre, rol, detalle, alSalir }: { nombre: string; rol: string; detalle: string; alSalir: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const menuDeCuenta = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    menuDeCuenta.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const fuera = (e: MouseEvent) => { if (!raiz.current?.contains(e.target as Node) && !menuDeCuenta.current?.contains(e.target as Node)) setAbierto(false); };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);
  return (
    <div className="quien" ref={raiz} onKeyDown={(e) => { if (e.key === "Escape" && abierto) { e.preventDefault(); e.stopPropagation(); setAbierto(false); raiz.current?.querySelector<HTMLButtonElement>(".quien-boton")?.focus(); } }}>
      <button type="button" className="quien-boton" aria-haspopup="menu" aria-expanded={abierto} onClick={() => setAbierto((a) => !a)} title={detalle} aria-label={`${nombre}${rol ? `, ${rol}` : ""}: opciones de la cuenta`} data-testid="cuenta">
        <span className="avatar" aria-hidden="true">{inicialesDe(nombre)}</span>
        <span className="quien-nombre"><b data-testid="usuario">{nombre}</b>{rol ? <small>{rol}</small> : null}</span>
      </button>
      {/* Se dibuja en el cuerpo de la página: dentro del menú lateral lo tapaba la barra del cobro. */}
      {abierto && createPortal(
        <div className="cuenta-menu" role="menu" aria-label="La cuenta" ref={menuDeCuenta} onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setAbierto(false); raiz.current?.querySelector<HTMLButtonElement>(".quien-boton")?.focus(); } }}>
          <p className="cuenta-menu-cab">{nombre}{rol ? ` · ${rol}` : ""}</p>
          <button type="button" role="menuitem" onClick={alSalir} data-testid="salir"><Icono nombre="salir" tam={20} />Cerrar sesión</button>
        </div>, document.body,
      )}
    </div>
  );
}
const TODAS = [...MENU.flatMap((m) => m.pestanas), ...FUERA_DEL_MENU];
const NOMBRES = new Map<string, string>(TODAS.map((p) => [p.ruta, p.nombre]));
// Las partes con el nombre que comparten el celular y la computadora en espejo (decisión 60).
const A_PARTE_COMUN: Record<string, string> = {
  productos: "catalogo", listas: "catalogo/listas", duplicados: "catalogo/duplicados", vender: "vender", hoy: "vender/hoy",
  pedidos: "deposito/pedidos", compras: "deposito/ingreso", stock: "deposito/stock", contar: "deposito/contar",
  mas: "mas", resumen: "mas/negocio", gastos: "mas/gastos", invertido: "mas/invertido", usuarios: "mas/usuarios", roles: "mas/roles", actividad: "mas/actividad", anomalias: "mas/anomalias", "para-revisar": "mas/para-revisar", tickets: "mas/tickets", configuracion: "mas/configuracion", procesos: "mas/procesos",
};
const DE_PARTE_COMUN: Record<string, string> = { ...Object.fromEntries(Object.entries(A_PARTE_COMUN).map(([ruta, parte]) => [parte, ruta])), "catalogo/productos": "productos", "vender/anular": "hoy" };
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
  const actual = sinDireccion || !NOMBRES.has(ruta.nombre) ? "productos" : ruta.nombre === "anular" ? "hoy" : ruta.nombre;
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

  // El menú se achica a solo íconos con su botón o Ctrl+B, y recuerda cómo se dejó (decisión 122).
  const porLaMarca = useRef(false);
  const [plegado, setPlegado] = useState(() => { try { return localStorage.getItem("ferre.menu") === "plegado"; } catch { return false; } });
  const plegar = () => setPlegado((p) => { try { localStorage.setItem("ferre.menu", p ? "abierto" : "plegado"); } catch { /* sin almacenamiento: dura lo que la pestaña */ } return !p; });
  useEffect(() => {
    if (!conSesion) return;
    const tecla = (e: KeyboardEvent) => { if (e.ctrlKey && !e.altKey && !e.metaKey && (e.key === "b" || e.key === "B")) { e.preventDefault(); plegar(); } };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [conSesion]);

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
  // renglones. Con el cursor en un campo, ← no lo saca de ahí (decisión 130): mueve la marca del
  // teclado (ver más abajo, «Dos focos independientes»).
  useEffect(() => {
    if (!conSesion) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (document.querySelector("dialog[open], [role='dialog'], [aria-modal='true']")) return;
      const foco = document.activeElement as HTMLElement | null;
      // Una zona que recorre sus flechas por su cuenta (la tabla de Ventas de hoy) usa ← para ella.
      if (foco?.closest(".lateral, .pestanas, [data-flechas-propias]")) return;
      // Con el cursor en un campo, ← es del campo: las flechas nunca sacan el cursor (decisión 130).
      if (foco instanceof HTMLInputElement || foco instanceof HTMLTextAreaElement || foco instanceof HTMLSelectElement) return;
      else if (foco && (foco.isContentEditable || ["radio", "tab", "slider", "option", "menuitem"].includes(foco.getAttribute("role") ?? ""))) return;
      const botones = [...document.querySelectorAll<HTMLButtonElement>(".lateral nav button")];
      const destino = botones.find((b) => b.getAttribute("aria-current") === "page") ?? botones[0];
      if (destino) { e.preventDefault(); destino.focus(); }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [conSesion]);
  // Dos focos independientes (decisiones 82 y 137): con el cursor en una caja de texto, las flechas
  // mueven la marca del teclado por el menú y las pestañas sin sacar el cursor de la caja. ← (con la
  // caja vacía o el cursor al principio) lleva la marca al menú; ahí ↑ ↓ lo recorren y Enter o → abre
  // la parte y pasa la marca a sus pestañas; en las pestañas, ← → las recorren (← desde la primera
  // vuelve al menú), Enter abre la pestaña, y ↓ o Esc devuelven la marca a la pantalla. Escribir algo,
  // Tab o el mouse la sacan.
  useEffect(() => {
    if (!conSesion) return;
    let marca: { zona: "menu" | "pestanas"; i: number } | null = null;
    const menu = () => [...document.querySelectorAll<HTMLButtonElement>(".lateral nav button")];
    const pestanas = () => [...document.querySelectorAll<HTMLButtonElement>(".cuerpo .pestanas button")];
    const actualDe = (bs: HTMLButtonElement[]) => Math.max(0, bs.findIndex((b) => b.getAttribute("aria-current") === "page"));
    const pintar = () => {
      document.querySelectorAll("[data-marca]").forEach((b) => b.removeAttribute("data-marca"));
      if (!marca) return;
      const b = (marca.zona === "menu" ? menu() : pestanas())[marca.i];
      if (b) { b.setAttribute("data-marca", ""); b.scrollIntoView?.({ block: "nearest" }); } else marca = null;
    };
    const sacar = () => { if (marca) { marca = null; pintar(); } };
    // Después de abrir algo, la marca va a las pestañas de lo que quedó abierto (se espera a que se dibuje).
    const aLasPestanas = (ruta: string) => {
      let intentos = 0;
      const mirar = () => {
        const ps = pestanas();
        if (ps.length && !ps.some((b) => b.getAttribute("aria-current") === "page" && b.dataset.testid === `pestana-${ruta}`) && ruta && intentos++ < 10) { setTimeout(mirar, 40); return; }
        marca = ps.length > 1 ? { zona: "pestanas", i: actualDe(ps) } : null; pintar();
      };
      setTimeout(mirar, 40);
    };
    // Al abrir algo con la marca, el cursor sigue en una caja de texto: la de la pantalla nueva, si tiene.
    const abrirConLaMarca = (b: HTMLButtonElement | undefined) => { if (!b) return; porLaMarca.current = true; b.click(); setTimeout(() => { porLaMarca.current = false; }, 700); };
    const tecla = (e: KeyboardEvent) => {
      const foco = document.activeElement;
      const enCaja = foco instanceof HTMLTextAreaElement || (foco instanceof HTMLInputElement && ["text", "search", "", "tel", "url", "email", "password", "number"].includes(foco.type));
      if (!enCaja || e.altKey || e.ctrlKey || e.metaKey || document.querySelector("dialog[open], [role='dialog'], [aria-modal='true']")) { sacar(); return; }
      const campo = foco as HTMLInputElement | HTMLTextAreaElement;
      const usar = () => { e.preventDefault(); e.stopImmediatePropagation(); };
      if (!marca) {
        const alPrincipio = campo.value === "" || (campo.selectionStart === 0 && campo.selectionEnd === 0);
        if (e.key === "ArrowLeft" && !e.shiftKey && alPrincipio && !foco!.closest("[data-flechas-propias]")) {
          usar(); marca = { zona: "menu", i: actualDe(menu()) }; pintar();
          document.querySelectorAll("[data-flecha]").forEach((f) => f.removeAttribute("data-flecha")); // la marca es una sola
        }
        return;
      }
      if (marca.zona === "menu") {
        const bs = menu();
        if (e.key === "ArrowDown" || e.key === "ArrowUp") { usar(); marca.i = (marca.i + (e.key === "ArrowDown" ? 1 : bs.length - 1)) % bs.length; pintar(); }
        else if (e.key === "Enter" || e.key === "ArrowRight") { usar(); const b = bs[marca.i]; sacar(); abrirConLaMarca(b); aLasPestanas(""); }
        else if (e.key === "ArrowLeft") usar();
        else if (e.key === "Escape") { usar(); sacar(); }
        else sacar();
        return;
      }
      const ps = pestanas();
      if (e.key === "ArrowLeft") { usar(); if (marca.i > 0) marca.i--; else marca = { zona: "menu", i: actualDe(menu()) }; pintar(); }
      else if (e.key === "ArrowRight") { usar(); if (marca.i < ps.length - 1) marca.i++; pintar(); }
      else if (e.key === "Enter") { usar(); const b = ps[marca.i]; abrirConLaMarca(b); aLasPestanas(b?.dataset.testid?.replace("pestana-", "") ?? ""); }
      else if (e.key === "ArrowUp") usar();
      else if (e.key === "Escape") { usar(); sacar(); }
      else sacar(); // ↓ vuelve a la pantalla (y sigue: marca la primera fila), escribir saca la marca
    };
    window.addEventListener("keydown", tecla, { capture: true });
    window.addEventListener("mousedown", sacar, { capture: true });
    return () => { window.removeEventListener("keydown", tecla, { capture: true }); window.removeEventListener("mousedown", sacar, { capture: true }); sacar(); };
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
    // En Vender el cursor va siempre a la búsqueda, se llegue como se llegue (Carlos, 2026-10-20; decisión 127).
    // Y si se abrió con la marca del teclado, el cursor va a la caja de texto de la pantalla nueva, si tiene (decisión 137).
    const caja = () => porLaMarca.current ? document.querySelector<HTMLInputElement>(".cuerpo input[type='search']:not(:disabled), .cuerpo input[type='text']:not(:disabled)") : null;
    const destino = () => document.querySelector<HTMLInputElement>('.vmc-pagina [data-testid="busqueda"]:not(:disabled)') ?? caja() ?? buscar();
    for (const espera of [60, 150, 350, 600]) setTimeout(() => { if (!cancelado) destino()?.focus(); }, espera);
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
    <div className={`app ${plegado ? "plegado" : ""}`}>
      <a className="saltar" href="#contenido" onClick={(e) => { e.preventDefault(); document.getElementById("contenido")?.focus(); }}>Ir al contenido</a>
      <aside className="lateral" onKeyDown={teclasDelMenu}>
        <div className="lateral-marca">
          <span className="marca-larga"><Logotipo sobre="claro" /></span>
          <span className="marca-corta"><Isotipo sobre="claro" lado={34} /></span>
          <button type="button" className="plegar" onClick={plegar} aria-label={plegado ? "Agrandar el menú" : "Achicar el menú"} title={`${plegado ? "Agrandar" : "Achicar"} el menú (Ctrl+B)`} aria-keyshortcuts="Control+B" aria-expanded={!plegado} data-testid="plegar-menu">
            <Icono nombre={plegado ? "agrandar-menu" : "achicar-menu"} tam={20} grosor={1.9} />
          </button>
        </div>
        <nav aria-label="Menú">
          {menu.map((m) => {
            const destino = m.clave === "mas" ? "mas" : m.pestanas[0]!.ruta;
            return (
              <button key={m.clave} type="button" aria-current={parte === m.clave ? "page" : undefined} aria-keyshortcuts={atajoDe(destino) ? `Alt+${atajoDe(destino)}` : undefined} onClick={() => irA(destino)} data-testid={`menu-${m.clave}`} aria-label={plegado ? m.nombre : undefined} title={plegado ? m.nombre : undefined}>
                <Icono nombre={m.icono} tam={20} grosor={parte === m.clave ? 2.3 : 1.9} /><span className="txt">{m.nombre}</span>
                {/* El número que, con Alt, abre la primera pantalla de esta parte. */}
                {atajoDe(m.pestanas[0]!.ruta) && <span className="atajo" aria-hidden="true">Alt+{atajoDe(m.pestanas[0]!.ruta)}</span>}
                {m.pestanas.some((p) => p.ruta === "vender") && enLaVenta > 0 && <CuentaDeLaVenta n={enLaVenta} />}
              </button>
            );
          })}
        </nav>
        <div className="lateral-pie">
          <EspejoEstado />
          {!emparejado && <div className="lateral-vincular"><VincularParaEscanear vinculado={false} alVincular={() => undefined} /></div>}
          <EstadoDeConexion />
          <CuentaDelUsuario nombre={sesion.usuario.nombre} rol={sesion.usuario.roles?.join(", ") ?? ""} detalle={`${sesion.usuario.email} · versión ${import.meta.env.VITE_VERSION ?? "local"}`} alSalir={salir} />
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
          : actual === "hoy" ? <Hoy /> : actual === "productos" ? <Productos /> : actual === "compras" ? <Ingreso />
          : actual === "stock" ? <Inventario /> : actual === "listas" ? <Listas /> : actual === "duplicados" ? <Duplicados />
          : actual === "contar" ? <Contar /> : actual === "resumen" ? <ResumenVentas />
          : actual === "gastos" ? <ResumenCompras recientes={(vuelta) => <ComprasRecientes key={`recientes-${vuelta}`} />} />
          : actual === "invertido" ? <ResumenInventario invertido={(vuelta) => <DineroInvertido key={vuelta} />} /> : actual === "usuarios" ? <Usuarios />
          : actual === "actividad" ? <Actividad /> : actual === "tickets" ? <Tickets /> : actual === "configuracion" ? <Configuracion propio={<><MisCelulares /><VinculoPropio /></>} /> : actual === "procesos" ? <PantallaDeProcesos interfaz="compu" /> : actual === "anomalias" ? <Anomalias cabeza={pestanas ? null : undefined} /> : actual === "para-revisar" ? <ParaRevisar cabeza={pestanas ? null : <h1>Anomalías</h1>} /> : <Vender />}
      </div>
    </div>
  );
}
