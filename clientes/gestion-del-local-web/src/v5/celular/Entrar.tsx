import { hayHuella } from "../../credenciales";
import { BotonGoogle, BotonHuella } from "../../pantallas/Login";
import { QUE_HACE, TEXTOS_DE_ENTRADA } from "../../v2/pantallas/Entrar";
import { Icono } from "../../v2/ui";

// La entrada del celular. Dice lo mismo, con las mismas palabras, que la de la computadora
// (los textos se comparten): es una sola aplicación. Cambia solo la disposición.
export function Entrar() {
  return (
    <main className="entrar" data-testid="entrar">
      <div className="arriba">
        <div className="entrar-marca-celular"><div className="logo" aria-hidden="true" /><strong>Ferrebress</strong></div>
        <h1>{TEXTOS_DE_ENTRADA.titulo}</h1>
        <p className="lema">{TEXTOS_DE_ENTRADA.bajada}</p>
        <ul className="entrar-puntos-celular">
          {QUE_HACE.map((q) => <li key={q.icono}><Icono nombre={q.icono} tam={18} />{q.texto}</li>)}
        </ul>
      </div>
      <div className="abajo">
        <h2 className="entrar-titulo-celular">{TEXTOS_DE_ENTRADA.entrar}</h2>
        <p className="ayuda-clara">{hayHuella() ? TEXTOS_DE_ENTRADA.comoConHuella : TEXTOS_DE_ENTRADA.comoSinHuella}</p>
        {!navigator.onLine && <p className="ayuda-clara" role="alert">{TEXTOS_DE_ENTRADA.sinConexion}</p>}
        <BotonHuella />
        <BotonGoogle />
        <p className="ayuda-clara entrar-nota-celular">{TEXTOS_DE_ENTRADA.nota}</p>
      </div>
    </main>
  );
}
