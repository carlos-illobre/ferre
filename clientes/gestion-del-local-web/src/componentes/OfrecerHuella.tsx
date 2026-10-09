import { useState } from "react";
import { hayHuella, vincularEsteDispositivo } from "../credenciales";
import { describirDispositivo, esCelular } from "../pantallas/Login";
import { AvisoError, Hoja, Icono } from "./base";

// Como en las apps del banco: la primera vez que alguien entra con Google desde un
// celular con huella, se le ofrece vincularlo para entrar con la huella la próxima vez.
// Se ofrece una sola vez por dispositivo (acepte o no); si ya estaba vinculado, no molesta.
// En la computadora no se ofrece: la huella se vincula desde el celular (Negocio).
const CLAVE_OFRECIDA = "ferre.huella-ofrecida";
const CLAVE_RECIEN_GOOGLE = "ferre.recien-google";

export const marcarEntradaConGoogle = () => { try { sessionStorage.setItem(CLAVE_RECIEN_GOOGLE, "1"); } catch { /* sin almacenamiento */ } };
function corresponde(): boolean {
  try {
    return esCelular() && hayHuella() && sessionStorage.getItem(CLAVE_RECIEN_GOOGLE) === "1" && localStorage.getItem(CLAVE_OFRECIDA) === null;
  } catch { return false; }
}
function yaOfrecida() {
  try { localStorage.setItem(CLAVE_OFRECIDA, new Date().toISOString()); sessionStorage.removeItem(CLAVE_RECIEN_GOOGLE); } catch { /* nada */ }
}

export function OfrecerHuella() {
  const [visible, setVisible] = useState(corresponde);
  const [estado, setEstado] = useState<"pregunta" | "vinculando" | "listo" | "error">("pregunta");
  const [error, setError] = useState<string | null>(null);
  if (!visible) return null;

  async function aceptar() {
    setEstado("vinculando");
    try {
      await vincularEsteDispositivo(describirDispositivo().slice(0, 40));
      yaOfrecida();
      setEstado("listo");
    } catch (e) {
      const err = e as Error;
      if (err.name === "InvalidStateError") { yaOfrecida(); setVisible(false); return; } // ya estaba vinculado
      setError(err.name === "NotAllowedError" ? "No se leyó la huella. Podés vincularlo después desde Negocio." : err.message);
      setEstado("error");
    }
  }
  function ahoraNo() { yaOfrecida(); setVisible(false); }

  // Una hoja del sistema visual (sube desde abajo). Cerrarla tocando afuera vale como "Ahora no".
  return (
    <Hoja alCerrar={estado === "listo" ? () => setVisible(false) : ahoraNo} testId="ofrecer-huella">
      {estado === "listo" ? (
        <>
          <div className="ficha-cabeza"><span className="avatar"><Icono nombre="tilde" tam={24} grosor={3} /></span><div className="textos"><strong>Listo</strong></div></div>
          <p className="subtitulo">La próxima vez entrás con la huella, sin Google. Podés quitar este celular desde Negocio.</p>
          <button type="button" className="boton tinta principal centrado" onClick={() => setVisible(false)}>Entendido</button>
        </>
      ) : (
        <>
          <div className="ficha-cabeza"><span className="avatar"><Icono nombre="huella" tam={24} /></span><div className="textos"><strong>¿Entrar con la huella?</strong></div></div>
          <p className="subtitulo">Vinculá este celular a tu cuenta y la próxima vez entrás con la huella, sin la cuenta de Google.</p>
          <AvisoError texto={error} />
          <button type="button" className="boton tinta principal centrado" onClick={aceptar} disabled={estado === "vinculando"} data-testid="aceptar-huella">{estado === "vinculando" ? "Leyendo la huella…" : "Sí, usar la huella"}</button>
          <button type="button" className="boton texto gris" onClick={ahoraNo} data-testid="ahora-no">Ahora no</button>
        </>
      )}
    </Hoja>
  );
}
