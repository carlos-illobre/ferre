import { useState } from "react";
import { hayHuella, vincularEsteDispositivo } from "../../datos/credenciales";
import { describirDispositivo, esCelular } from "../../plataforma/dispositivo";

// Como en las apps del banco: la primera vez que alguien entra con Google desde un celular con
// huella, se le ofrece vincularlo para entrar con la huella la próxima vez. Se ofrece una sola vez
// por dispositivo (acepte o no); si ya estaba vinculado, no molesta.
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

// `explicar` dice el error como lo dice cada pantalla; si no se pudo, no se marca como ofrecida y
// vuelve a aparecer en la próxima entrada con Google. La computadora borra el error al probar de
// nuevo; el celular lo deja hasta saber cómo salió (`limpiar`).
export function useOfrecerHuella(explicar: (e: Error) => string, limpiar = true) {
  const [visible, setVisible] = useState(corresponde);
  const [estado, setEstado] = useState<"pregunta" | "vinculando" | "listo" | "error">("pregunta");
  const [error, setError] = useState<string | null>(null);
  async function aceptar() {
    setEstado("vinculando"); if (limpiar) setError(null);
    try {
      await vincularEsteDispositivo(describirDispositivo().slice(0, 40));
      yaOfrecida();
      setEstado("listo");
    } catch (e) {
      const err = e as Error;
      if (err.name === "InvalidStateError") { yaOfrecida(); setVisible(false); return; } // ya estaba vinculado
      setError(explicar(err));
      setEstado("error");
    }
  }
  return { visible, estado, error, aceptar, ahoraNo: () => { yaOfrecida(); setVisible(false); }, cerrar: () => setVisible(false) };
}
