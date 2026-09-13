import { useEffect, useState } from "react";
import { urlApi } from "./api";
import { ProveedorDeSesion, useSesion } from "./sesion";
import { irA, useRuta } from "./rutas";
import { Login } from "./pantallas/Login";
import { Vincular } from "./pantallas/Vincular";
import { Administracion } from "./pantallas/Administracion";
import { Listas } from "./pantallas/Listas";
import { Productos } from "./pantallas/Productos";
import { Vender } from "./pantallas/Vender";
import { Compras } from "./pantallas/Compras";
import { Stock } from "./pantallas/Stock";
import "./estilos.css";

export function App() {
  return (
    <ProveedorDeSesion>
      <Pantallas />
    </ProveedorDeSesion>
  );
}

const MENU: { ruta: string; nombre: string; soloDueno?: boolean }[] = [
  { ruta: "vender", nombre: "Vender" },
  { ruta: "productos", nombre: "Productos" },
  { ruta: "compras", nombre: "Compras" },
  { ruta: "stock", nombre: "Stock" },
  { ruta: "listas", nombre: "Listas de precios" },
  { ruta: "administracion", nombre: "Administración", soloDueno: true },
];

function Pantallas() {
  const { sesion, salir } = useSesion();
  const ruta = useRuta();
  const codigoVinculacion = ruta.parametros.get("codigo");

  if (sesion.estado === "cargando") return <main className="pantalla-centrada"><p>Cargando…</p></main>;
  if (ruta.nombre === "vincular" && codigoVinculacion) return <Vincular codigo={codigoVinculacion} />;
  if (sesion.estado === "sin-sesion") return <Login />;

  const esDueno = sesion.usuario.rol === "dueño";
  const actual = ruta.nombre === "inicio" ? "vender" : ruta.nombre;

  return (
    <main>
      <header className="barra">
        <strong>ferre</strong>
        <nav>
          {MENU.filter((m) => !m.soloDueno || esDueno).map((m) => (
            <button key={m.ruta} className={`enlace ${actual === m.ruta ? "activo" : ""}`} onClick={() => irA(m.ruta)}>{m.nombre}</button>
          ))}
        </nav>
        <span data-testid="usuario">{sesion.usuario.nombre} · {sesion.usuario.rol}{sesion.sinConexion ? " · sin conexión" : ""}</span>
        <button className="secundario" onClick={salir}>Salir</button>
      </header>
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
      ) : (
        <Vender />
      )}
    </main>
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
