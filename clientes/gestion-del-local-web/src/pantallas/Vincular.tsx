import { useState } from "react";
import { api } from "../api";
import { useSesion } from "../sesion";
import { BotonGoogle } from "./Login";

// Se abre en el celular al leer el QR de la laptop. Si acá ya hay sesión, aprueba y la
// laptop entra sola. Si no, primero hay que entrar con Google en este celular.
export function Vincular({ codigo }: { codigo: string }) {
  const { sesion } = useSesion();
  const [resultado, setResultado] = useState<string | null>(null);

  if (sesion.estado === "cargando") return <main className="pantalla-centrada"><p>Cargando…</p></main>;
  if (sesion.estado !== "con-sesion") {
    return (
      <main className="pantalla-centrada">
        <h1>ferre</h1>
        <h2>Dejar entrar a la computadora</h2>
        <p>Entrá con tu cuenta de Google para confirmar. La computadora va a entrar como vos.</p>
        <BotonGoogle />
      </main>
    );
  }
  const nombre = sesion.usuario.nombre;

  async function aprobar() {
    try {
      const r = await api<{ dispositivo: string }>(`/sesiones/vinculaciones/${encodeURIComponent(codigo)}/aprobar`, { method: "POST" });
      setResultado(`Listo: ${r.dispositivo} ya entró como ${nombre}. Podés cerrar esta pantalla.`);
    } catch (e) {
      setResultado((e as Error).message);
    }
  }

  return (
    <main className="pantalla-centrada">
      <h1>Vincular la computadora</h1>
      {resultado ? <p role="status">{resultado}</p> : (
        <>
          <p>Vas a dejar entrar a la computadora como <strong>{nombre}</strong>.</p>
          <button onClick={aprobar}>Sí, dejar entrar</button>
        </>
      )}
    </main>
  );
}
