import { useEffect, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { FotoParaLaCompu } from "../FotoParaLaCompu";
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
import { Inventario } from "./Inventario";
import { DineroInvertido } from "../DineroInvertido";
import { Ingreso } from "./Ingreso";
import { Contar } from "../../v2/pantallas/Contar";
import { Resumen } from "../../v2/pantallas/Resumen";
import { Usuarios } from "../../v2/pantallas/Usuarios";
import { Actividad } from "../../v2/pantallas/Actividad";
import { Vender } from "./Vender";
import { DE_MAS, Mas } from "./Mas";
import { Tickets } from "../Tickets";
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

// El mismo menú que en el celular, en el mismo orden (primero lo que más se hace), y cada
// parte con sus pestañas adentro. «Más» es una pantalla con lo que se usa poco.
type Pestana = { ruta: string; nombre: string; icono: NombreDeIcono };
const MENU: { clave: string; nombre: string; icono: NombreDeIcono; pestanas: Pestana[] }[] = [
  { clave: "catalogo", nombre: "Catálogo", icono: "catalogo", pestanas: [{ ruta: "productos", icono: "productos", nombre: "Productos" }, { ruta: "listas", icono: "listas", nombre: "Listas" }, { ruta: "duplicados", icono: "duplicados", nombre: "Duplicados" }] },
  { clave: "vender", nombre: "Vender", icono: "vender", pestanas: [{ ruta: "vender", icono: "vender", nombre: "Vender" }] },
  { clave: "deposito", nombre: "Depósito", icono: "deposito", pestanas: [{ ruta: "compras", icono: "compras", nombre: "Ingreso" }, { ruta: "stock", icono: "stock", nombre: "Inventario" }, { ruta: "contar", icono: "contar", nombre: "Estanterías" }] },
  { clave: "mas", nombre: "Más", icono: "mas", pestanas: DE_MAS.map((d) => ({ ruta: d.ruta, nombre: d.nombre, icono: d.icono })) },
];
// Alt + número abre cada pantalla, en el orden en que se ven: 1 a 9 y 0.
const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
const CON_ATAJO = MENU.flatMap((m) => m.pestanas.map((p) => p.ruta));
const atajoDe = (ruta: string) => { const i = CON_ATAJO.indexOf(ruta); return i < 0 || i >= TECLAS.length ? null : TECLAS[i]!; };
const NOMBRES = new Map<string, string>([...MENU.flatMap((m) => m.pestanas.map((p) => [p.ruta, p.nombre] as [string, string])), ["mas", "Más"], ["ventas", "Ventas de hoy"]]);

function Pantallas() {
  const { sesion, salir } = useSesion();
  const ruta = useRuta();
  const codigoVinculacion = ruta.parametros.get("codigo");
  // Sin dirección, la app abre en lo primero del menú.
  const sinDireccion = location.hash.replace(/^#\/?/, "") === "";
  const actual = sinDireccion ? "productos" : NOMBRES.has(ruta.nombre) ? ruta.nombre : "vender";
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
      if (foco?.closest(".lateral")) return;
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
  function teclasDelMenu(e: ReactKeyboardEvent<HTMLElement>) {
    const botones = [...e.currentTarget.querySelectorAll<HTMLButtonElement>("button")];
    const i = botones.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      botones[(i + (e.key === "ArrowDown" ? 1 : botones.length - 1)) % botones.length]!.focus();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      // Si es otra parte, se abre; cada pantalla pone el foco en su búsqueda. Si es la misma, se vuelve a ella.
      const cambia = botones[i]!.getAttribute("aria-current") !== "page";
      if (cambia) botones[i]!.click();
      // Al cambiar de parte hay que esperar a que la pantalla nueva esté dibujada.
      setTimeout(() => {
        const cuerpo = document.querySelector<HTMLElement>(".cuerpo");
        if (!cuerpo || cuerpo.contains(document.activeElement)) return;
        // Primero la búsqueda (u otro campo); si la pantalla no tiene, su primer botón.
        const deLaPantalla = (selector: string) => [...cuerpo.querySelectorAll<HTMLElement>(selector)].find((x) => !x.closest(".pestanas, .mas-volver"));
        const primero = deLaPantalla("input:not([type='hidden']):not([type='file']):not([disabled]), select:not([disabled])") ?? deLaPantalla("button:not([disabled])");
        (primero ?? document.getElementById("contenido"))?.focus();
      }, cambia ? 150 : 0);
    }
  }

  if (sesion.estado === "cargando") return <main className="entrar-cargando" aria-busy="true"><Marca tam={44} /><p>Abriendo Ferrebress…</p></main>;
  if (ruta.nombre === "vincular-celular" && codigoVinculacion) return <VincularCelular codigo={codigoVinculacion} />;
  if (sesion.estado === "sin-sesion") return <Entrar />;
  // El celular llega acá al leer el código QR del ingreso: con la sesión ya iniciada, saca la foto de la
  // factura para la computadora.
  if (ruta.nombre === "foto-factura" && codigoVinculacion) return <FotoParaLaCompu codigo={codigoVinculacion} />;

  const parte = MENU.find((m) => m.pestanas.some((p) => p.ruta === actual))?.clave ?? (actual === "ventas" ? "vender" : "mas");
  const pestanas = parte === "catalogo" || parte === "deposito" ? MENU.find((m) => m.clave === parte)!.pestanas : null;
  const prueba = esAmbienteDePrueba();

  return (
    <div className="app">
      <a className="saltar" href="#contenido" onClick={(e) => { e.preventDefault(); document.getElementById("contenido")?.focus(); }}>Ir al contenido</a>
      <aside className="lateral">
        <div className="lateral-marca">
          <Marca />
        </div>
        <nav aria-label="Menú" onKeyDown={teclasDelMenu}>
          {MENU.map((m) => {
            const destino = m.clave === "mas" ? "mas" : m.pestanas[0]!.ruta;
            return (
              <button key={m.clave} type="button" aria-current={parte === m.clave ? "page" : undefined} onClick={() => irA(destino)} data-testid={`menu-${m.clave}`}>
                <Icono nombre={m.icono} tam={19} grosor={parte === m.clave ? 2.3 : 1.9} />{m.nombre}
                {/* El número que, con Alt, abre la primera pantalla de esta parte. */}
                {atajoDe(m.pestanas[0]!.ruta) && <span className="atajo" aria-hidden="true">Alt+{atajoDe(m.pestanas[0]!.ruta)}</span>}
              </button>
            );
          })}
        </nav>
        <p className="lateral-ayuda">Alt + número abre cada pantalla. Con ← se pasa al menú y con → se vuelve.</p>
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
          <nav className="pestanas" aria-label={NOMBRES.get(actual)}>
            {pestanas.map((p) => (
              <button key={p.ruta} type="button" aria-current={actual === p.ruta ? "page" : undefined} aria-keyshortcuts={`Alt+${atajoDe(p.ruta)}`} onClick={() => irA(p.ruta)} data-testid={`pestana-${p.ruta}`}>
                <Icono nombre={p.icono} tam={20} grosor={actual === p.ruta ? 2.3 : 2} />{p.nombre}<span className="tecla" aria-hidden="true">Alt+{atajoDe(p.ruta)}</span>
              </button>
            ))}
          </nav>
        )}
        {parte === "mas" && actual !== "mas" && <div className="mas-volver"><Boton icono="izquierda" tam="chico" onClick={() => irA("mas")}>Volver a Más</Boton></div>}
        {actual === "ventas" && <div className="mas-volver"><Boton icono="izquierda" tam="chico" onClick={() => irA("vender")}>Volver a Vender</Boton></div>}
        {actual === "mas" ? <Mas atajoDe={atajoDe} />
          : actual === "ventas" ? <VentasDeHoy /> : actual === "productos" ? <Productos /> : actual === "compras" ? <Ingreso />
          : actual === "stock" ? <Inventario /> : actual === "listas" ? <Listas /> : actual === "duplicados" ? <Duplicados />
          : actual === "contar" ? <Contar /> : actual === "resumen" ? <><Resumen /><DineroInvertido /></> : actual === "usuarios" ? <Usuarios />
          : actual === "actividad" ? <Actividad /> : actual === "tickets" ? <Tickets /> : <Vender />}
      </div>
    </div>
  );
}
