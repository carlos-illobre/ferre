import { useEffect, useState } from "react";
import { urlApi } from "./api";
import { ProveedorDeSesion, administra, useSesion } from "./sesion";
import { irA, useRuta } from "./rutas";
import { Login } from "./pantallas/Login";
import { Vincular } from "./pantallas/Vincular";
import { VincularCelular } from "./pantallas/VincularCelular";
import { Administracion } from "./pantallas/Administracion";
import { Listas } from "./pantallas/Listas";
import { Productos } from "./pantallas/Productos";
import { Vender } from "./pantallas/Vender";
import { Compras } from "./pantallas/Compras";
import { Stock } from "./pantallas/Stock";
import { Contar } from "./pantallas/Contar";
import { Duplicados } from "./pantallas/Duplicados";
import { EstadoDeConexion } from "./componentes/EstadoDeConexion";
import "./estilos.css";

export function App() {
  return (
    <ProveedorDeSesion>
      <Pantallas />
    </ProveedorDeSesion>
  );
}

// En el celular, las cinco primeras van en la barra de abajo (como una app de Android) y
// el resto en "Más".
// Íconos de Material Design (trazado SVG, sin depender de las fuentes del teléfono).
const ICONOS: Record<string, string> = {
  vender: "M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.6-1.4 2.4c-.6 1.3.3 3 1.8 3h12v-2H7.4l1.1-2h7.5c.7 0 1.4-.4 1.7-1l3.6-6.5L19.6 4H5.2L4.3 2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",
  productos: "M15.5 14h-.8l-.3-.3c1-1.1 1.6-2.6 1.6-4.2C16 5.9 13.1 3 9.5 3S3 5.9 3 9.5 5.9 16 9.5 16c1.6 0 3.1-.6 4.2-1.6l.3.3v.8l5 5 1.5-1.5-5-5zm-6 0C7 14 5 12 5 9.5S7 5 9.5 5 14 7 14 9.5 12 14 9.5 14z",
  compras: "M20 2H4c-1 0-2 .9-2 2v3c0 .7.4 1.4 1 1.7V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.6-.3 1-1 1-1.7V4c0-1.1-1-2-2-2zm-5 12H9v-2h6v2zm5-7H4V4h16v3z",
  stock: "M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z",
  contar: "M22 5.2l-1.4-1.4-5.7 5.7 1.4 1.4L22 5.2zM16.3 3.8l1.4 1.4-2.8 2.8-1.4-1.4 2.8-2.8zM2 14l4 4 1.4-1.4L4.8 14 2 14zM11 14h11v2H11v-2zm0 4h11v2H11v-2zM2 6h7v2H2V6zm0 4h7v2H2v-2z",
  listas: "M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
  duplicados: "M17 7h-4v2h4c1.65 0 3 1.35 3 3s-1.35 3-3 3h-4v2h4c2.76 0 5-2.24 5-5s-2.24-5-5-5zm-6 8H7c-1.65 0-3-1.35-3-3s1.35-3 3-3h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-2zm-3-4h8v2H8z",
  administracion: "M19.4 13c0-.3.1-.6.1-1s0-.7-.1-1l2.1-1.7c.2-.2.2-.4.1-.6l-2-3.5c-.1-.2-.4-.3-.6-.2l-2.5 1c-.5-.4-1.1-.7-1.7-1l-.4-2.6c0-.2-.2-.4-.5-.4h-4c-.2 0-.4.2-.5.4l-.4 2.6c-.6.3-1.2.6-1.7 1l-2.5-1c-.2-.1-.5 0-.6.2l-2 3.5c-.1.2-.1.5.1.6L4.6 11c0 .3-.1.6-.1 1s0 .7.1 1l-2.1 1.7c-.2.2-.2.4-.1.6l2 3.5c.1.2.4.3.6.2l2.5-1c.5.4 1.1.7 1.7 1l.4 2.6c0 .2.2.4.5.4h4c.2 0 .4-.2.5-.4l.4-2.6c.6-.3 1.2-.6 1.7-1l2.5 1c.2.1.5 0 .6-.2l2-3.5c.1-.2.1-.5-.1-.6L19.4 13zM12 15.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z",
  mas: "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",
  salir: "M17 7l-1.4 1.4L17.2 10H8v2h9.2l-1.6 1.6L17 15l4-4-4-4zM5 5h7V3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h7v-2H5V5z",
};
const Icono = ({ nombre }: { nombre: string }) => <svg className="icono" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d={ICONOS[nombre] ?? ""} /></svg>;
const MENU: { ruta: string; nombre: string; soloDueno?: boolean }[] = [
  { ruta: "vender", nombre: "Vender" },
  { ruta: "productos", nombre: "Productos" },
  { ruta: "compras", nombre: "Compras" },
  { ruta: "stock", nombre: "Stock" },
  { ruta: "contar", nombre: "Contar" },
  { ruta: "listas", nombre: "Listas de precios" },
  { ruta: "duplicados", nombre: "Duplicados", soloDueno: true },
  { ruta: "administracion", nombre: "Administración", soloDueno: true },
];
const EN_BARRA_INFERIOR = 5;

function Pantallas() {
  const { sesion, salir } = useSesion();
  const ruta = useRuta();
  const codigoVinculacion = ruta.parametros.get("codigo");

  if (sesion.estado === "cargando") return <main className="pantalla-centrada"><p>Cargando…</p></main>;
  if (ruta.nombre === "vincular" && codigoVinculacion) return <Vincular codigo={codigoVinculacion} />;
  if (ruta.nombre === "vincular-celular" && codigoVinculacion) return <VincularCelular codigo={codigoVinculacion} />;
  if (sesion.estado === "sin-sesion") return <Login />;

  const esDueno = administra(sesion.usuario);
  const actual = ruta.nombre === "inicio" ? "vender" : ruta.nombre;
  const visibles = MENU.filter((m) => !m.soloDueno || esDueno);
  const pantalla = visibles.find((m) => m.ruta === actual)?.nombre ?? "ferre";

  return (
    <main>
      <header className="barra">
        <strong>ferre</strong>
        <span className="pantalla-actual solo-celular">{pantalla}</span>
        <nav className="solo-escritorio">
          {visibles.map((m) => (
            <button key={m.ruta} className={`enlace ${actual === m.ruta ? "activo" : ""}`} onClick={() => irA(m.ruta)}>{m.nombre}</button>
          ))}
        </nav>
        <EstadoDeConexion />
        <span data-testid="usuario" className="solo-escritorio">{sesion.usuario.nombre} · {sesion.usuario.rol}</span>
        <button className="secundario solo-escritorio" onClick={salir}>Salir</button>
      </header>
      <BarraInferior opciones={visibles} actual={actual} usuario={`${sesion.usuario.nombre} · ${sesion.usuario.rol}`} salir={salir} />
      <small className="version" title="Versión de la app (commit)">{import.meta.env.VITE_VERSION ?? "local"}</small>
      {actual === "administracion" && esDueno ? (
        <>
          <EstadoDelServidor />
          <Administracion />
        </>
      ) : actual === "listas" ? (
        <Listas />
      ) : actual === "productos" ? (
        <Productos />
      ) : actual === "compras" ? (
        <Compras />
      ) : actual === "stock" ? (
        <Stock />
      ) : actual === "contar" ? (
        <Contar />
      ) : actual === "duplicados" && esDueno ? (
        <Duplicados />
      ) : (
        <Vender />
      )}
    </main>
  );
}

// Barra de navegación de abajo, solo en el celular: cinco opciones con ícono y "Más" con
// el resto (y Salir) en una hoja que sube desde abajo.
function BarraInferior({ opciones, actual, usuario, salir }: { opciones: typeof MENU; actual: string; usuario: string; salir: () => void }) {
  const [masAbierto, setMasAbierto] = useState(false);
  const principales = opciones.slice(0, EN_BARRA_INFERIOR);
  const resto = opciones.slice(EN_BARRA_INFERIOR);
  const enResto = resto.some((m) => m.ruta === actual);
  return (
    <>
      <nav className="barra-inferior solo-celular" aria-label="Menú">
        {principales.map((m) => (
          <button key={m.ruta} className={actual === m.ruta ? "activo" : ""} onClick={() => { setMasAbierto(false); irA(m.ruta); }}>
            <Icono nombre={m.ruta} /><span>{m.nombre}</span>
          </button>
        ))}
        <button className={masAbierto || enResto ? "activo" : ""} onClick={() => setMasAbierto((a) => !a)} aria-expanded={masAbierto}>
          <Icono nombre="mas" /><span>Más</span>
        </button>
      </nav>
      {masAbierto && (
        <div className="hoja-fondo solo-celular" onClick={() => setMasAbierto(false)}>
          <div className="hoja" onClick={(e) => e.stopPropagation()}>
            <small>{usuario}</small>
            {resto.map((m) => (
              <button key={m.ruta} className={`opcion-hoja ${actual === m.ruta ? "activo" : ""}`} onClick={() => { setMasAbierto(false); irA(m.ruta); }}>
                <Icono nombre={m.ruta} />{m.nombre}
              </button>
            ))}
            <button className="opcion-hoja" onClick={salir}><Icono nombre="salir" />Salir</button>
          </div>
        </div>
      )}
    </>
  );
}

function EstadoDelServidor() {
  const [texto, setTexto] = useState("Consultando el servidor…");
  useEffect(() => {
    fetch(urlApi("/health"))
      .then((r) => r.json() as Promise<{ ok: boolean; db: string }>)
      .then((s) => setTexto(`Servidor ${s.ok ? "ok" : "con problemas"} · base ${s.db}`))
      .catch(() => setTexto("Sin conexión con el servidor."));
  }, []);
  return <p data-testid="estado">{texto}</p>;
}
