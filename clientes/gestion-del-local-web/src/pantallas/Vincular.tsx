import { useState } from "react";
import { api } from "../api";
import { useSesion } from "../sesion";

// Se abre en el celular al leer el QR de la laptop. Si acá ya hay sesión, aprueba y la
// laptop entra sola. Si no, primero hay que entrar con Google en este celular.
export function Vincular({ codigo }: { codigo: string }) {
  const { sesion } = useSesion();
  const [resultado, setResultado] = useState<string | null>(null);

  if (sesion.estado !== "con-sesion") {
    return <main className="pantalla-centrada"><p>Primero entrá con Google en este celular y volvé a leer el código.</p></main>;
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
