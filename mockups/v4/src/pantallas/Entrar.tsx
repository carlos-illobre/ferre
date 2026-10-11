import { YO } from "../datos";
import { Aviso, Boton, EstadosDeMaqueta, Icono, useEstadoDeMaqueta, type EstadoDeMaqueta } from "../piezas";
import { cambiarParametro, ir, useEsCelular } from "../ruta";
import "../estilos/entrar.css";

const ESTADOS: EstadoDeMaqueta[] = [
  { clave: "normal", nombre: "Normal" },
  { clave: "oferta-huella", nombre: "Oferta de huella (primera vez)" },
  { clave: "no-autorizado", nombre: "No autorizado" },
  { clave: "sin-conexion", nombre: "Sin conexión" },
];

/** Un correo que entró con Google pero al que nadie le dio acceso. */
const CORREO_SIN_ACCESO = "nicolas.suarez@gmail.com";

function entrarALaApp() {
  ir("vender");
}

function Marca() {
  return <p className="entrar__logo"><span>F</span><strong>Ferrebress</strong></p>;
}

/** La primera vez que se entra con Google desde el celular. */
function OfertaDeHuella() {
  return (
    <main className="entrar entrar--estado">
      <section className="entrar__tarjeta">
        <span className="entrar__circulo"><Icono nombre="huella" tam={34} /></span>
        <h1>¿Querés entrar con la huella la próxima vez?</h1>
        <p>No vas a tener que abrir Google: alcanza con apoyar el dedo en este celular.</p>
        <Boton variante="principal" tam="grande" ancho autoFocus onClick={entrarALaApp}>Sí, usar la huella</Boton>
        <Boton variante="texto" ancho onClick={entrarALaApp}>Ahora no</Boton>
      </section>
    </main>
  );
}

function NoAutorizado() {
  return (
    <main className="entrar entrar--estado">
      <section className="entrar__tarjeta">
        <span className="entrar__circulo entrar__circulo--alerta"><Icono nombre="candado" tam={32} /></span>
        <h1>Todavía no estás autorizado</h1>
        <p>Entraste con <strong>{CORREO_SIN_ACCESO}</strong>, que no tiene acceso a Ferrebress. Pedile acceso a un Administrador.</p>
        <Boton variante="principal" tam="grande" ancho autoFocus onClick={() => cambiarParametro("estado", null)}>Probar con otra cuenta</Boton>
      </section>
    </main>
  );
}

export default function Entrar() {
  const esCelular = useEsCelular();
  const elegido = useEstadoDeMaqueta();
  // La oferta de huella solo existe en el celular.
  const estados = esCelular ? ESTADOS : ESTADOS.filter((e) => e.clave !== "oferta-huella");
  const estado = estados.some((e) => e.clave === elegido) ? elegido : "normal";
  const sinConexion = estado === "sin-conexion";

  function conGoogle() {
    if (esCelular) cambiarParametro("estado", "oferta-huella");
    else entrarALaApp();
  }

  let pantalla;
  if (estado === "oferta-huella") pantalla = <OfertaDeHuella />;
  else if (estado === "no-autorizado") pantalla = <NoAutorizado />;
  else {
    pantalla = (
      <main className="entrar">
        <section className="entrar__marca">
          <span className="entrar__sello" aria-hidden="true"><span>F</span></span>
          <div>
            <p className="entrar__nombre">Ferre<span>bress</span></p>
            <p className="entrar__que-es">Ventas, precios y stock de la ferretería.</p>
          </div>
          <div className="entrar__arte" aria-hidden="true"><div /><div /><div /></div>
        </section>

        <section className="entrar__lado">
          <div className="entrar__caja">
            <Marca />
            <h1>Entrá a tu ferretería</h1>
            <p className="entrar__que-es entrar__que-es--celular">Ventas, precios y stock de la ferretería.</p>

            {sinConexion && (
              <Aviso tipo="alerta" titulo="Sin conexión">
                {esCelular ? "Para entrar con Google hace falta internet. Con la huella podés entrar igual." : "Para entrar hace falta internet. Revisá la conexión y probá de nuevo."}
              </Aviso>
            )}

            <button type="button" className="entrar__opcion" disabled={sinConexion} onClick={conGoogle}>
              <Icono nombre="google" tam={26} />
              <span><strong>Entrar con Google</strong></span>
              <Icono nombre="flecha" />
            </button>

            {esCelular && (
              <button type="button" className="entrar__opcion entrar__opcion--huella" onClick={entrarALaApp}>
                <Icono nombre="huella" tam={28} className="entrar__huella" />
                <span><strong>Entrar con la huella</strong><span>La de {YO.nombre}, guardada en este celular</span></span>
                <Icono nombre="flecha" />
              </button>
            )}

            <p className="entrar__ayuda">¿No podés entrar? Pedile acceso a un Administrador.</p>
            <p className="ambiente entrar__ambiente">Ambiente de prueba</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <>
      {pantalla}
      <EstadosDeMaqueta estados={estados} sinMenu />
    </>
  );
}
