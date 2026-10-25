import { Isotipo, Logotipo } from "../../Logotipo";
import { TEXTOS_DE_ENTRADA } from "../../comun/entrada/textos-de-entrada";
import { TEXTOS } from "../../textos";
import { PieConOnda } from "./PieConOnda";
import "./entrar.css";

// Volviendo de Google con la cuenta ya confirmada (007-T021): en lugar de la entrada, que haría
// pensar que no se pudo entrar, se ve que se está abriendo la sesión hasta que queda abierta.
const TILDE = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
const G = (
  <svg width="34" height="34" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

// El local: adonde se llega cuando la sesión queda abierta.
const LOCAL = <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--p-verde)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9l1.5-5h15L21 9M3 9h18M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M5 12v8h14v-8M10 20v-5h4v5" /></svg>;

export function ConectandoConGoogle() {
  const t = TEXTOS.entrar;
  return (
    <main className="en en-conectando" data-testid="conectando-con-google" role="status" aria-live="polite">
      <header className="en-marca">
        <h1><Logotipo sobre="claro" /></h1>
        <p>{TEXTOS_DE_ENTRADA.lema}</p>
      </header>
      <section className="cg">
        <h2>{t.conectandoConGoogle.corto}</h2>
        <p className="cg-bajada">{t.googleConfirmo.corto}</p>
        <div className="cg-camino" aria-hidden="true">
          <span className="cg-bola">{G}</span>
          <span className="cg-punto" /><span className="cg-hecho">{TILDE}</span><span className="cg-punto" />
          <span className="cg-bola grande"><span className="cg-anillo" /><Isotipo sobre="claro" lado={46} /></span>
          <span className="cg-punto falta" /><span className="cg-punto falta" />
          <span className="cg-bola local">{LOCAL}</span>
        </div>
        <ol className="cg-pasos">
          <li><span className="cg-marca hecho">{TILDE}</span><span><strong>{t.cuentaVerificada.corto}</strong><span>{t.cuentaVerificadaDetalle.corto}</span></span></li>
          <li><span className="cg-marca ahora" /><span><strong>{t.abriendoSesion.corto}</strong><span>{t.abriendoSesionDetalle.corto}</span></span></li>
        </ol>
      </section>
      <PieConOnda />
    </main>
  );
}
