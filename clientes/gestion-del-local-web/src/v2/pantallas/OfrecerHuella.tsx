import { useState } from "react";
import { hayHuella, vincularEsteDispositivo } from "../../credenciales";
import { describirDispositivo, esCelular } from "./Entrar";
import { esFallaDeRed } from "./negocio-comun";
import { Aviso, Boton, Hoja, Icono } from "../ui";
import "../estilos/entrar.css";

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
    setEstado("vinculando"); setError(null);
    try {
      await vincularEsteDispositivo(describirDispositivo().slice(0, 40));
      yaOfrecida();
      setEstado("listo");
    } catch (e) {
      const err = e as Error;
      if (err.name === "InvalidStateError") { yaOfrecida(); setVisible(false); return; } // ya estaba vinculado
      // No se marca como ofrecida: vuelve a aparecer en la próxima entrada con Google.
      setError(err.name === "NotAllowedError" ? "No se leyó la huella. Probá de nuevo, o vinculalo después desde Negocio, en «Usuarios y sesiones»."
        : esFallaDeRed(e) ? "Vincular la huella necesita internet. Probá de nuevo, o hacelo después desde Negocio, en «Usuarios y sesiones»."
        : `${err.message}. Podés vincularlo después desde Negocio, en «Usuarios y sesiones».`);
      setEstado("error");
    }
  }
  function ahoraNo() { yaOfrecida(); setVisible(false); }

  // Una hoja que sube desde abajo. Cerrarla o tocar afuera vale como «Ahora no».
  if (estado === "listo") {
    return (
      <Hoja titulo="Listo" alCerrar={() => setVisible(false)} testId="ofrecer-huella">
        <div className="ofrecer-huella">
          <span className="ofrecer-huella-icono listo"><Icono nombre="tilde" tam={36} grosor={3} /></span>
          <p role="status">Desde ahora entrás con la huella, sin la cuenta de Google. Si perdés este celular, lo quitás desde Negocio, en «Usuarios y sesiones».</p>
          <div className="ofrecer-huella-botones"><Boton variante="principal" tam="grande" autoFocus onClick={() => setVisible(false)}>Entendido</Boton></div>
        </div>
      </Hoja>
    );
  }
  return (
    <Hoja titulo="¿Entrar con la huella?" alCerrar={ahoraNo} testId="ofrecer-huella">
      <div className="ofrecer-huella">
        <span className="ofrecer-huella-icono"><Icono nombre="huella" tam={36} grosor={1.8} /></span>
        <p>Vinculá este celular a tu cuenta y la próxima vez entrás apoyando el dedo, sin la cuenta de Google.</p>
        <Aviso tipo="error">{error}</Aviso>
        <div className="ofrecer-huella-botones">
          <Boton variante="principal" tam="grande" icono="huella" onClick={aceptar} disabled={estado === "vinculando"} data-testid="aceptar-huella">{estado === "vinculando" ? "Leyendo la huella…" : estado === "error" ? "Probar de nuevo" : "Sí, usar la huella"}</Boton>
          <Boton tam="grande" onClick={ahoraNo} disabled={estado === "vinculando"} data-testid="ahora-no">Ahora no</Boton>
        </div>
      </div>
    </Hoja>
  );
}
