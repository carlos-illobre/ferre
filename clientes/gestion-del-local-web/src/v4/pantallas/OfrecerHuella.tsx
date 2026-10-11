import { useState, type ReactNode } from "react";
import { ErrorApi } from "../../api";
import { hayHuella, vincularEsteDispositivo } from "../../credenciales";
import { describirDispositivo, esCelular } from "../dispositivo";
import { Aviso, Boton, Icono } from "../piezas";
import "../estilos/entrar.css";

// Como en las apps del banco: la primera vez que alguien entra con Google desde un celular con
// huella, se le ofrece guardarla para entrar con ella la próxima vez. Se ofrece una sola vez
// por dispositivo (acepte o no); si ya estaba vinculado, no molesta. En la computadora no se
// ofrece. Las claves son las de las versiones anteriores: lo ya ofrecido no se repite.
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

/** Envuelve a la app: si corresponde ofrecer la huella, muestra la oferta antes; si no, la app. */
export function OfrecerHuella({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(corresponde);
  const [estado, setEstado] = useState<"pregunta" | "vinculando" | "listo" | "error">("pregunta");
  const [error, setError] = useState<{ titulo: string; texto: string } | null>(null);
  if (!visible) return <>{children}</>;

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
      const despues = "o hacelo después desde «Usuarios y sesiones».";
      setError(err.name === "NotAllowedError" ? { titulo: "No se leyó la huella", texto: `Probá de nuevo, ${despues}` }
        : !(e instanceof ErrorApi) ? { titulo: "Sin conexión", texto: `Guardar la huella necesita internet. Probá de nuevo, ${despues}` }
        : { titulo: "No se pudo guardar la huella", texto: `${err.message}. Probá de nuevo, ${despues}` });
      setEstado("error");
    }
  }
  function ahoraNo() { yaOfrecida(); setVisible(false); }

  if (estado === "listo") {
    return (
      <main className="entrar entrar--estado" data-testid="ofrecer-huella">
        <section className="entrar__tarjeta">
          <span className="entrar__circulo entrar__circulo--bien"><Icono nombre="tilde" tam={34} grosor={2.4} /></span>
          <h1>Listo: la próxima vez entrás con la huella</h1>
          <p role="status">Si perdés este celular, lo quitás desde «Usuarios y sesiones».</p>
          <Boton variante="principal" tam="grande" ancho autoFocus onClick={() => setVisible(false)} data-testid="huella-lista">Seguir</Boton>
        </section>
      </main>
    );
  }
  const vinculando = estado === "vinculando";
  return (
    <main className="entrar entrar--estado" data-testid="ofrecer-huella">
      <section className="entrar__tarjeta">
        <span className="entrar__circulo"><Icono nombre="huella" tam={34} /></span>
        <h1>¿Querés entrar con la huella la próxima vez?</h1>
        <p>No vas a tener que abrir Google: alcanza con apoyar el dedo en este celular.</p>
        {error && <Aviso tipo="error" titulo={error.titulo}>{error.texto}</Aviso>}
        <Boton variante="principal" tam="grande" ancho autoFocus disabled={vinculando} onClick={() => void aceptar()} data-testid="aceptar-huella">{vinculando ? "Leyendo la huella…" : estado === "error" ? "Probar de nuevo" : "Sí, usar la huella"}</Boton>
        <Boton variante="texto" ancho disabled={vinculando} onClick={ahoraNo} data-testid="ahora-no">Ahora no</Boton>
      </section>
    </main>
  );
}
