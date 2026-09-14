import { useEffect } from "react";
import { esAmbienteDePrueba } from "./ambiente";
import { OfrecerHuella } from "./componentes/OfrecerHuella";
import { Icono } from "./componentes/base";
import { ProveedorDeSesion, administra, useSesion } from "./sesion";
import { irA, useRuta } from "./rutas";
import { Login } from "./pantallas/Login";
import { Vincular } from "./pantallas/Vincular";
import { VincularCelular } from "./pantallas/VincularCelular";
import { Vender } from "./pantallas/Vender";
import { Catalogo } from "./pantallas/Catalogo";
import { Deposito } from "./pantallas/Deposito";
import { Negocio } from "./pantallas/Negocio";
import { EstadoDeConexion } from "./componentes/EstadoDeConexion";
import "./estilos.css";

export function App() {
  return (
    <ProveedorDeSesion>
      <Pantallas />
    </ProveedorDeSesion>
  );
}

// Cuatro pestañas, todo el negocio (rediseño en mockups/Ferre iOS.html): en el celular
// van abajo, en la computadora arriba. Mismas pantallas en los dos.
const PESTANAS = [
  { ruta: "vender", nombre: "Vender" },
  { ruta: "catalogo", nombre: "Catálogo" },
  { ruta: "deposito", nombre: "Depósito" },
  { ruta: "negocio", nombre: "Negocio" },
] as const;

function Pantallas() {
  const { sesion, salir } = useSesion();
  const ruta = useRuta();
  const codigoVinculacion = ruta.parametros.get("codigo");
  useEffect(() => { window.scrollTo(0, 0); }, [ruta.nombre, ruta.sub]);

  if (sesion.estado === "cargando") return <main className="pantalla-centrada"><p>Cargando…</p></main>;
  if (ruta.nombre === "vincular" && codigoVinculacion) return <Vincular codigo={codigoVinculacion} />;
  if (ruta.nombre === "vincular-celular" && codigoVinculacion) return <VincularCelular codigo={codigoVinculacion} />;
  if (sesion.estado === "sin-sesion") return <Login />;

  const actual = PESTANAS.some((p) => p.ruta === ruta.nombre) ? ruta.nombre : "vender";
  const usuario = sesion.usuario;

  return (
    <div className="app">
      <header className={`barra solo-escritorio ${esAmbienteDePrueba() ? "de-prueba" : ""}`}>
        <div className="logo"><span>fe</span>ferre</div>
        <nav aria-label="Menú">
          {PESTANAS.map((p) => (
            <button key={p.ruta} type="button" className={actual === p.ruta ? "activo" : ""} onClick={() => irA(p.ruta)}>
              <Icono nombre={p.ruta} grosor={actual === p.ruta ? 2.2 : 1.8} />{p.nombre}
            </button>
          ))}
        </nav>
        <div className="derecha">
          {esAmbienteDePrueba() && <span className="ambiente" data-testid="ambiente">Ambiente de prueba</span>}
          <EstadoDeConexion />
          <span className="usuario" data-testid="usuario">{usuario.nombre} · {usuario.rol}</span>
          <button type="button" className="salir" onClick={salir}>Salir</button>
        </div>
      </header>
      {esAmbienteDePrueba() && <span className="pill-prueba solo-celular" aria-hidden="true">Ambiente de prueba</span>}

      {actual === "catalogo" ? <Catalogo sub={ruta.sub} /> : actual === "deposito" ? <Deposito sub={ruta.sub} /> : actual === "negocio" ? <Negocio /> : <Vender esDueno={administra(usuario)} />}

      <nav className="nav-inferior solo-celular" aria-label="Menú">
        {PESTANAS.map((p) => (
          <button key={p.ruta} type="button" className={actual === p.ruta ? "activo" : ""} onClick={() => irA(p.ruta)} aria-current={actual === p.ruta ? "page" : undefined}>
            <Icono nombre={p.ruta} tam={26} grosor={actual === p.ruta ? 2.2 : 1.8} /><span>{p.nombre}</span>
          </button>
        ))}
      </nav>
      <small className="version" title="Versión de la app (commit)">{import.meta.env.VITE_VERSION ?? "local"}</small>
      <OfrecerHuella />
    </div>
  );
}
