import { useEffect, useState } from "react";
import { urlApi } from "./api";
import { ProveedorDeSesion, useSesion } from "./sesion";
import { Login } from "./pantallas/Login";
import { Vincular } from "./pantallas/Vincular";
import { Administracion } from "./pantallas/Administracion";
import "./estilos.css";

export function App() {
  return (
    <ProveedorDeSesion>
      <Rutas />
    </ProveedorDeSesion>
  );
}

// Dos rutas por ahora; un enrutador de verdad llega con las pantallas de venta.
function Rutas() {
  const { sesion, salir } = useSesion();
  const codigoVinculacion = new URLSearchParams(location.search).get("codigo");
  const ruta = location.pathname.replace(import.meta.env.BASE_URL, "/");

  if (sesion.estado === "cargando") return <main className="pantalla-centrada"><p>Cargando…</p></main>;
  if (ruta === "/vincular" && codigoVinculacion) return <Vincular codigo={codigoVinculacion} />;
  if (sesion.estado === "sin-sesion") return <Login />;

  return (
    <main>
      <header className="barra">
        <strong>ferre</strong>
        <span data-testid="usuario">{sesion.usuario.nombre} · {sesion.usuario.rol}{sesion.sinConexion ? " · sin conexión" : ""}</span>
        <button onClick={salir}>Salir</button>
      </header>
      <EstadoDelServidor />
      {sesion.usuario.rol === "dueño" && <Administracion />}
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
