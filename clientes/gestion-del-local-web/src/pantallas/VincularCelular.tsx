import { useEffect, useState } from "react";
import { api } from "../api";
import { guardarPuestoRemoto } from "../puesto";
import { useSesion } from "../sesion";
import { irA } from "../rutas";

// Se abre en el celular al leer el QR de la laptop: lo vincula 12 horas y vuelve a vender.
export function VincularCelular({ codigo }: { codigo: string }) {
  const { sesion } = useSesion();
  const [resultado, setResultado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (sesion.estado !== "con-sesion") return;
    api<{ id: string; nombre: string | null; horas: number }>(`/puestos/${encodeURIComponent(codigo)}/vincular`, { method: "POST" })
      .then((r) => { guardarPuestoRemoto({ id: r.id, nombre: r.nombre, expira_en: new Date(Date.now() + r.horas * 3600_000).toISOString() }); setResultado(`Listo: este celular quedó vinculado a ${r.nombre ?? "la computadora"} por ${r.horas} horas. Lo que escanees acá aparece allá.`); })
      .catch((e: Error) => setError(e.message));
  }, [codigo, sesion.estado]);
  if (sesion.estado !== "con-sesion") return <main className="pantalla-centrada"><p>Primero entrá con Google en este celular y volvé a leer el código.</p></main>;
  return (
    <main className="pantalla-centrada">
      <h1>Vincular celular</h1>
      {resultado && <p role="status" data-testid="vinculacion-ok">{resultado}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {(resultado || error) && <button className="grande" onClick={() => irA("vender")}>Ir a vender</button>}
    </main>
  );
}
