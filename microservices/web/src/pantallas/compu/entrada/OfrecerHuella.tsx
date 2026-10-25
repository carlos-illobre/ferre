import { esFallaDeRed } from "../negocio/negocio-comun";
import { useOfrecerHuella } from "../../../negocio/entrada";
import { Aviso, Boton, Hoja, Icono } from "../base/ui";
import "../base/estilos/entrar.css";

const explicar = (err: Error) => (err.name === "NotAllowedError" ? "No se leyó la huella. Probá de nuevo, o vinculalo después desde Más → Configuración."
  : esFallaDeRed(err) ? "Vincular la huella necesita internet. Probá de nuevo, o hacelo después desde Más → Configuración."
  : `${err.message}. Podés vincularlo después desde Más → Configuración.`);

// La primera vez que alguien entra con Google desde un celular con huella, se le ofrece vincularlo
// (en la computadora no se ofrece: la huella se vincula desde el celular). Una hoja que sube desde
// abajo; cerrarla o tocar afuera vale como «Ahora no».
export function OfrecerHuella() {
  const o = useOfrecerHuella(explicar);
  if (!o.visible) return null;
  if (o.estado === "listo") {
    return (
      <Hoja titulo="Listo" alCerrar={o.cerrar} testId="ofrecer-huella">
        <div className="ofrecer-huella">
          <span className="ofrecer-huella-icono listo"><Icono nombre="tilde" tam={36} grosor={3} /></span>
          <p role="status">Desde ahora entrás con la huella, sin la cuenta de Google. Si perdés este celular, lo quitás desde Más → Configuración.</p>
          <div className="ofrecer-huella-botones"><Boton variante="principal" tam="grande" autoFocus onClick={o.cerrar}>Entendido</Boton></div>
        </div>
      </Hoja>
    );
  }
  const vinculando = o.estado === "vinculando";
  return (
    <Hoja titulo="¿Entrar con la huella?" alCerrar={o.ahoraNo} testId="ofrecer-huella">
      <div className="ofrecer-huella">
        <span className="ofrecer-huella-icono"><Icono nombre="huella" tam={36} grosor={1.8} /></span>
        <p>Vinculá este celular a tu cuenta y la próxima vez entrás apoyando el dedo, sin la cuenta de Google.</p>
        <Aviso tipo="error">{o.error}</Aviso>
        <div className="ofrecer-huella-botones">
          <Boton variante="principal" tam="grande" icono="huella" onClick={o.aceptar} disabled={vinculando} data-testid="aceptar-huella">{vinculando ? "Leyendo la huella…" : o.estado === "error" ? "Probar de nuevo" : "Sí, usar la huella"}</Boton>
          <Boton tam="grande" onClick={o.ahoraNo} disabled={vinculando} data-testid="ahora-no">Ahora no</Boton>
        </div>
      </div>
    </Hoja>
  );
}
