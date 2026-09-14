import { useState } from "react";
import { api } from "../api";
import { useSesion } from "../sesion";
import { BotonGoogle } from "./Login";
import { AvisoError } from "../componentes/base";

// Se abre en el celular al leer el QR de la computadora. Si acá ya hay sesión, aprueba y
// la computadora entra sola. Si no, primero hay que entrar con Google en este celular.
export function Vincular({ codigo }: { codigo: string }) {
  const { sesion } = useSesion();
  const [resultado, setResultado] = useState<string | null>(null);

  if (sesion.estado === "cargando") return <main className="pantalla-centrada"><p>Cargando…</p></main>;
  if (sesion.estado !== "con-sesion") {
    return (
      <main className="entrar">
        <div className="arriba">
          <div className="logo">fe</div>
          <h1>Dejar entrar a la computadora</h1>
          <p className="lema">Entrá con tu cuenta de Google para confirmar. La computadora va a entrar como vos.</p>
        </div>
        <div className="abajo"><BotonGoogle /></div>
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
          <button type="button" className="boton tinta" onClick={aprobar}>Sí, dejar entrar</button>
        </>
      )}
      <AvisoError texto={null} />
    </main>
  );
}
