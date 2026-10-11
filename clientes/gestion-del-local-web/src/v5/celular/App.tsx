import { useEffect } from "react";
import { esAmbienteDePrueba } from "../../ambiente";
import { OfrecerHuella } from "../../componentes/OfrecerHuella";
import { Icono } from "../../componentes/base";
import { ProveedorDeSesion, administra, useSesion } from "../../sesion";
import { irA, useRuta } from "../../rutas";
import { Login } from "../../pantallas/Login";
import { VincularCelular } from "../../pantallas/VincularCelular";
import { Catalogo } from "../../pantallas/Catalogo";
import { Deposito } from "../../pantallas/Deposito";
import { Negocio } from "../../pantallas/Negocio";
import { Vender } from "./Vender";
import "../../estilos.css";
import "./tema.css";

// La interfaz de celular de la versión 1, que es la que resultó más fácil de usar, con la
// paleta de la v5, la venta con sugeridos y sin que la búsqueda tome el foco sola. La cuarta
// pestaña es «Más»: guarda lo que se usa poco.
export function App() {
  return (
    <ProveedorDeSesion>
      <Pantallas />
    </ProveedorDeSesion>
  );
}

const PESTANAS = [
  { ruta: "vender", nombre: "Vender" },
  { ruta: "catalogo", nombre: "Productos" },
  { ruta: "deposito", nombre: "Depósito" },
  { ruta: "mas", nombre: "Más" },
] as const;
const DE_MAS = [
  { camino: "catalogo/listas", nombre: "Listas de precios", detalle: "Cargar la planilla de un proveedor y actualizar los costos" },
  { camino: "catalogo/duplicados", nombre: "Duplicados", detalle: "Unir el mismo producto cuando llega de dos proveedores" },
  { camino: "negocio", nombre: "Cómo va el negocio", detalle: "Ventas de hoy, gastos, usuarios, sesiones y quién hizo qué" },
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
  if (sesion.estado === "sin-sesion") return <Login />;

  const usuario = sesion.usuario;
  const deMas = ruta.nombre === "mas" || ruta.nombre === "negocio" || (ruta.nombre === "catalogo" && ruta.sub !== null);
  const pestana = deMas ? "mas" : PESTANAS.some((p) => p.ruta === ruta.nombre) ? ruta.nombre : "vender";

  return (
    <div className="app">
      {esAmbienteDePrueba() && <span className="pill-prueba solo-celular" data-testid="ambiente">Ambiente de prueba</span>}

      {ruta.nombre === "mas" ? (
        <main className="contenido" data-testid="mas">
          <div className="encabezado"><h1 className="titulo">Más</h1></div>
          <div className="lista">
            {DE_MAS.map((d) => (
              <button key={d.camino} type="button" className="fila" onClick={() => irA(d.camino)}>
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
      ) : ruta.nombre === "catalogo" ? <Catalogo sub={ruta.sub} />
        : ruta.nombre === "deposito" ? <Deposito sub={ruta.sub} />
        : ruta.nombre === "negocio" ? <Negocio />
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
