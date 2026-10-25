import { useEffect, useRef, useState, type RefObject } from "react";
import { hayHuella, porQueNoEntro, useClienteDeGoogle, useEntrarConGoogle, useEntrarConHuella, type ErrorDeEntrada } from "../../../negocio/entrada";
import { useBotonDeGoogle } from "../../../plataforma/google";
import { TEXTOS_DE_ENTRADA } from "../../comun/entrada/textos-de-entrada";
import { Aviso, Boton, Progreso } from "../base/ui";

export function ErrorEnElLugar({ error, testId }: { error: ErrorDeEntrada | null; testId: string }) {
  if (!error) return null;
  return (
    <div data-testid={testId}>
      <Aviso tipo="error">{error.titulo && <strong className="entrar-error-titulo">{error.titulo}</strong>}{error.texto}</Aviso>
    </div>
  );
}

// El botón lo dibuja Google; acá va su lugar, lo que pasa mientras se entra y el resultado.
// Al entrar, el servidor acepta solo los correos autorizados en Más → Usuarios.
// `estirar`: Google lo dibuja de 400 px como mucho; estirado, se agranda en proporción hasta
// ocupar el ancho de su lugar (la tarjeta de la entrada de la computadora, decisión 93).
export function BotonGoogle({ tema = "filled_blue", estirar = false }: { tema?: "outline" | "filled_blue" | "filled_black"; estirar?: boolean }) {
  const [error, setError] = useState<ErrorDeEntrada | null>(null);
  const [entrando, setEntrando] = useState(false);
  const lugar = useRef<HTMLDivElement>(null);
  const { clienteId, fallo } = useClienteDeGoogle();
  const conGoogle = useEntrarConGoogle();
  const alRecibir = async (credencial: string) => {
    setEntrando(true); setError(null);
    try { await conGoogle(credencial); return true; }
    catch (e) { setError(porQueNoEntro(e, "google")); setEntrando(false); return false; }
  };
  const alDibujar = useEscala(lugar, estirar);
  const estado = useBotonDeGoogle({ lugar, clienteId, tema, alRecibir, alDibujar });
  return (
    <div className="entrar-google">
      <div className={claseDelLugar(estirar, estado === "listo", entrando)} ref={lugar} aria-busy={estado === "esperando" || entrando} />
      {estado === "esperando" && <span className="solo-lectores" role="status">Cargando el botón de Google…</span>}
      {(estado === "sin-google" || fallo) && <GoogleNoResponde />}
      {entrando && <Progreso texto="Entrando con tu cuenta de Google…" />}
      <ErrorEnElLugar error={error} testId="error-google" />
    </div>
  );
}

const claseDelLugar = (estirar: boolean, listo: boolean, entrando: boolean) => `entrar-google-lugar ${estirar ? "estirado" : ""} ${listo ? "" : "esperando"} ${entrando ? "ocupado" : ""}`;

function GoogleNoResponde() {
  return <Aviso tipo="alerta" accion={<Boton tam="chico" onClick={() => location.reload()}>Reintentar</Boton>}>{TEXTOS_DE_ENTRADA.googleNoResponde}{hayHuella() ? " Si este dispositivo ya está vinculado, podés entrar con la huella." : ""}</Aviso>;
}

// El lugar puede ser más ancho que el botón: la escala es la que lo llena, y se vuelve a calcular
// cada vez que el lugar cambia de ancho. Devuelve qué hacer cada vez que Google lo dibuja.
function useEscala(lugar: RefObject<HTMLDivElement>, estirar: boolean) {
  const dibujado = useRef(400); // el ancho con que Google dibujó el botón
  const ajustar = () => { const l = lugar.current; if (l) l.style.setProperty("--escala-google", String(Math.max(1, l.clientWidth / dibujado.current))); };
  useEffect(() => {
    if (!estirar || typeof ResizeObserver === "undefined" || !lugar.current) return;
    const observador = new ResizeObserver(ajustar);
    observador.observe(lugar.current);
    return () => observador.disconnect();
  }, [lugar, estirar]); // eslint-disable-line react-hooks/exhaustive-deps
  return (ancho: number) => { dibujado.current = ancho; if (estirar) ajustar(); };
}

// Entrar con la huella: solo en dispositivos que la tienen; el celular tiene que estar
// vinculado antes (entrando con Google una vez).
export function BotonHuella() {
  const h = useEntrarConHuella((e) => porQueNoEntro(e, "huella"));
  if (!hayHuella()) return null;
  return (
    <div className="entrar-huella">
      <Boton variante="principal" tam="grande" ancho icono="huella" onClick={h.conHuella} disabled={h.ocupado} data-testid="entrar-huella">{h.ocupado ? "Leyendo la huella…" : "Entrar con la huella"}</Boton>
      <ErrorEnElLugar error={h.error} testId="error-huella" />
    </div>
  );
}
