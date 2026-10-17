import { useState, useSyncExternalStore, type ReactNode } from "react";
import { decidir, describir, diaYHora, porPersona, useParaRevisar, type CambioApartado } from "../negocio/apartados";
import "./anomalias.css";

// Más → Anomalías → Para revisar (specs/014-cambios-apartados): lo que hicieron sin conexión
// personas a las que desactivaron, antes de enterarse. Agrupado por persona, una tarjeta por
// cambio con «Aceptar» y «Descartar»; se decide de a uno. La misma pantalla en el celular y en
// la computadora (maqueta `para-revisar-c-*`). `cabeza` es lo de arriba (el título y las
// pestañas en el celular); en la computadora las pestañas las pone la aplicación.
const enLinea = () => navigator.onLine;
const escucharLaRed = (avisar: () => void) => { window.addEventListener("online", avisar); window.addEventListener("offline", avisar); return () => { window.removeEventListener("online", avisar); window.removeEventListener("offline", avisar); }; };

export function ParaRevisar({ cabeza = null }: { cabeza?: ReactNode }) {
  const { datos, error, recargar } = useParaRevisar();
  const conRed = useSyncExternalStore(escucharLaRed, enLinea);
  const grupos = datos ? porPersona(datos.apartados) : [];
  return (
    <main id="contenido" className="an" data-testid="para-revisar" tabIndex={-1}>
      {cabeza}
      <p className="an-bajada">Lo que hicieron sin conexión personas a las que desactivaron, antes de enterarse. No cuenta para nada hasta que lo aceptás: queda a nombre de quien lo hizo, con su fecha y hora.</p>
      {!conRed && <p className="an-error" role="status">Sin conexión: para aceptar o descartar hace falta internet.</p>}
      {error && <p className="an-error" role="alert">{conRed ? (error as Error).message : "Sin conexión: lo que hay para revisar se ve cuando vuelva internet."} <button type="button" className="an-boton" onClick={recargar}>Reintentar</button></p>}
      {!datos && !error && <p className="an-bajada" aria-busy="true">Buscando lo que hay para revisar…</p>}
      {datos && grupos.length === 0 && <p className="an-vacio" data-testid="nada-para-revisar">No hay nada para revisar.</p>}
      {grupos.map((g) => (
        <section key={g.usuario_id} className="pr-persona" aria-label={g.usuario}>
          <p className="pr-quien"><strong>{g.usuario}</strong>{(g.desactivado_en || g.dispositivo) && <span>{[g.desactivado_en ? `sesión cerrada el ${diaYHora(g.desactivado_en)}` : null, g.dispositivo ? `desde «${g.dispositivo}»` : null].filter(Boolean).join(" · ")}</span>}</p>
          <ul className="pr-lista">{g.cambios.map((c) => <Tarjeta key={c.id} cambio={c} conRed={conRed} />)}</ul>
        </section>
      ))}
    </main>
  );
}

function Tarjeta({ cambio, conRed }: { cambio: CambioApartado; conRed: boolean }) {
  const d = describir(cambio);
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // El motivo de la última vez que no se pudo aceptar, si nadie lo intentó desde esta pantalla.
  const motivo = error ?? (cambio.error ? `No se pudo aceptar: ${cambio.error}` : null);
  async function hacer(decision: "aceptar" | "descartar") {
    setEnCurso(true); setError(null);
    try { await decidir(cambio.id, decision); }
    catch (e) { setError((e as Error).message); }
    finally { setEnCurso(false); }
  }
  return (
    <li className="pr-tarjeta" data-testid="apartado">
      <span className="pr-que"><b>{d.titulo}</b>{d.resumen && <> · {d.resumen}</>}</span>
      {d.renglones.length > 0 && <ul className="pr-renglones">{d.renglones.map((r, i) => <li key={i}>{r}</li>)}</ul>}
      <span className="pr-cuando">{d.cuando}</span>
      {motivo && <p className="pr-error" role="alert" data-testid="error-de-apartado">{motivo}</p>}
      <div className="pr-botones">
        <button type="button" className="pr-boton si" disabled={!conRed || enCurso} onClick={() => void hacer("aceptar")} data-testid="aceptar-apartado">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" /></svg>Aceptar
        </button>
        <button type="button" className="pr-boton" disabled={!conRed || enCurso} onClick={() => void hacer("descartar")} data-testid="descartar-apartado">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3" /></svg>Descartar
        </button>
      </div>
    </li>
  );
}
