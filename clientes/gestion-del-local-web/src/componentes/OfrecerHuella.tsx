import { useState } from "react";
import { hayHuella, vincularEsteDispositivo } from "../credenciales";
import { describirDispositivo } from "../pantallas/Login";

// Como en las apps del banco: la primera vez que alguien entra con Google desde un
// celular con huella, se le ofrece vincularlo para entrar con la huella la próxima vez.
// Se ofrece una sola vez por dispositivo (acepte o no); si ya estaba vinculado, no molesta.
const CLAVE_OFRECIDA = "ferre.huella-ofrecida";
const CLAVE_RECIEN_GOOGLE = "ferre.recien-google";

export const marcarEntradaConGoogle = () => { try { sessionStorage.setItem(CLAVE_RECIEN_GOOGLE, "1"); } catch { /* sin almacenamiento */ } };
function corresponde(): boolean {
  try {
    return hayHuella() && sessionStorage.getItem(CLAVE_RECIEN_GOOGLE) === "1" && localStorage.getItem(CLAVE_OFRECIDA) === null;
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
      setError(err.name === "NotAllowedError" ? "No se leyó la huella. Podés vincularlo después desde Administración." : err.message);
      setEstado("error");
    }
  }
  function ahoraNo() { yaOfrecida(); setVisible(false); }

  return (
    <div className="hoja-fondo-modal" role="dialog" aria-label="Entrar con la huella" data-testid="ofrecer-huella">
      <div className="tarjeta modal">
        {estado === "listo" ? (
          <>
            <h2>Listo</h2>
            <p>La próxima vez entrás con la huella, sin Google. Podés quitar este celular desde Administración.</p>
            <div className="acciones"><button className="grande" onClick={() => setVisible(false)}>Entendido</button></div>
          </>
        ) : (
          <>
            <h2>👆 ¿Entrar con la huella?</h2>
            <p>Vinculá este celular a tu cuenta y la próxima vez entrás con la huella, sin la cuenta de Google.</p>
            {error && <p className="error" role="alert">{error}</p>}
            <div className="acciones">
              <button className="grande" onClick={aceptar} disabled={estado === "vinculando"} data-testid="aceptar-huella">{estado === "vinculando" ? "Leyendo la huella…" : "Sí, usar la huella"}</button>
              <button className="secundario" onClick={ahoraNo} data-testid="ahora-no">Ahora no</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
