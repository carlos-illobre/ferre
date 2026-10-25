import { useOfrecerHuella } from "../../../negocio/entrada";
import { AvisoError, Hoja, Icono } from "../componentes/base";

const explicar = (err: Error) => (err.name === "NotAllowedError" ? "No se leyó la huella. Podés vincularlo después desde Más → Configuración." : err.message);

// La primera vez que alguien entra con Google desde un celular con huella, se le ofrece vincularlo
// para entrar con la huella la próxima vez. Una hoja del sistema visual (sube desde abajo).
// Cerrarla tocando afuera vale como «Ahora no».
export function OfrecerHuella() {
  const o = useOfrecerHuella(explicar, false);
  if (!o.visible) return null;
  const listo = o.estado === "listo";
  return (
    <Hoja alCerrar={listo ? o.cerrar : o.ahoraNo} testId="ofrecer-huella">
      {listo ? (
        <>
          <div className="ficha-cabeza"><span className="avatar"><Icono nombre="tilde" tam={24} grosor={3} /></span><div className="textos"><strong>Listo</strong></div></div>
          <p className="subtitulo">La próxima vez entrás con la huella, sin Google. Podés quitar este celular desde Más → Configuración.</p>
          <button type="button" className="boton tinta principal centrado" onClick={o.cerrar}>Entendido</button>
        </>
      ) : (
        <>
          <div className="ficha-cabeza"><span className="avatar"><Icono nombre="huella" tam={24} /></span><div className="textos"><strong>¿Entrar con la huella?</strong></div></div>
          <p className="subtitulo">Vinculá este celular a tu cuenta y la próxima vez entrás con la huella, sin la cuenta de Google.</p>
          <AvisoError texto={o.error} />
          <button type="button" className="boton tinta principal centrado" onClick={o.aceptar} disabled={o.estado === "vinculando"} data-testid="aceptar-huella">{o.estado === "vinculando" ? "Leyendo la huella…" : "Sí, usar la huella"}</button>
          <button type="button" className="boton texto gris" onClick={o.ahoraNo} data-testid="ahora-no">Ahora no</button>
        </>
      )}
    </Hoja>
  );
}
