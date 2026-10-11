import { Logotipo } from "../Logotipo";
import { BotonGoogle, BotonHuella } from "./pantallas/Login";
import { TEXTOS_DE_ENTRADA } from "../compu/base/pantallas/Entrar";

// La entrada del celular es mínima (decisión 47): la marca, una línea que dice qué hace la
// aplicación y los botones para entrar. La línea es la misma que titula la entrada de la
// computadora, que es la que explica la aplicación con más detalle.
export function Entrar() {
  return (
    <main className="entrar" data-testid="entrar">
      <div className="arriba">
        <div className="entrar-marca-celular"><Logotipo /></div>
        <h1>{TEXTOS_DE_ENTRADA.titulo}</h1>
      </div>
      <div className="abajo">
        {!navigator.onLine && <p className="ayuda-clara" role="alert">{TEXTOS_DE_ENTRADA.sinConexion}</p>}
        <BotonHuella />
        <BotonGoogle />
      </div>
    </main>
  );
}
