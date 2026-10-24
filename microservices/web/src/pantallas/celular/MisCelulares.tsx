import { useEffect, useState } from "react";
import { fecha } from "../../formato";
import { EVENTO_CREDENCIALES, hayHuella, listarCredenciales, quitarCredencial, vincularEsteDispositivo, type Credencial } from "../../datos/credenciales";
import { AvisoError, Icono, Lista, Toast } from "./componentes/base";
import { describirDispositivo } from "./pantallas/Login";

// Mis celulares con huella, en Configuración (decisión 99): desde acá se vincula este dispositivo
// con la huella, y se quita uno perdido. Cada usuario ve los suyos; los de otros, quien administra
// usuarios, en la tarjeta de cada persona.
export function MisCelulares() {
  const [filas, setFilas] = useState<Credencial[]>([]);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cargar = () => listarCredenciales().then(setFilas).catch(() => undefined);
  useEffect(() => { void cargar(); window.addEventListener(EVENTO_CREDENCIALES, cargar); return () => window.removeEventListener(EVENTO_CREDENCIALES, cargar); }, []);
  async function vincular() {
    setError(null); setMensaje(null);
    const nombre = window.prompt("¿Cómo llamamos a este celular?", describirDispositivo().slice(0, 40));
    if (nombre === null) return;
    try { const c = await vincularEsteDispositivo(nombre); setMensaje(`Listo: "${c.dispositivo}" entra con la huella desde ahora.`); await cargar(); }
    catch (e) { setError((e as Error).name === "NotAllowedError" ? "No se pudo leer la huella. Probá de nuevo." : (e as Error).message); }
  }
  async function quitar(c: Credencial) {
    if (!window.confirm(`¿Quitar "${c.dispositivo ?? "este celular"}"? Ya no va a poder entrar con la huella.`)) return;
    try { await quitarCredencial(c.id); await cargar(); } catch (e) { setError((e as Error).message); }
  }
  return (
    <div data-testid="celulares" style={{ display: "contents" }}>
      <h2 className="seccion">Mis celulares con huella</h2>
      <small style={{ padding: "0 4px" }}>Vinculá el celular una vez y desde entonces entra con la huella, sin Google. Si lo perdés, quitalo de acá.</small>
      <AvisoError texto={error} alCerrar={() => setError(null)} />
      <Toast texto={mensaje} alCerrar={() => setMensaje(null)} testId="mensaje-celular" />
      <Lista>
        {filas.map((c) => (
          <div key={c.id} className="fila" data-testid="celular">
            <span className="nombre">{c.dispositivo ?? "celular"}</span>
            <button type="button" className="boton chico texto derecha" onClick={() => quitar(c)}>Quitar</button>
            <span className="detalle">vinculado el {fecha(c.creada_en.slice(0, 10))} · último uso {c.ultimo_uso_en ? fecha(c.ultimo_uso_en.slice(0, 10)) : "todavía no"}</span>
          </div>
        ))}
        {hayHuella() ? (
          <button type="button" className="fila" onClick={vincular} data-testid="vincular-celular"><span className="nombre" style={{ color: "var(--coral-texto)", display: "flex", gap: 8, alignItems: "center" }}><Icono nombre="huella" tam={18} />Vincular este celular con mi huella</span></button>
        ) : <div className="fila"><small>Este dispositivo no tiene lector de huella o desbloqueo compatible: vinculá desde el celular.</small></div>}
      </Lista>
    </div>
  );
}
