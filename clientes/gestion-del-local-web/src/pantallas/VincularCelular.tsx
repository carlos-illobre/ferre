import { useEffect, useState } from "react";
import { api } from "../api";
import { guardarPuestoRemoto } from "../puesto";
import { useSesion } from "../sesion";
import { irA } from "../rutas";
import { BotonGoogle } from "./Login";
import { AvisoError } from "../componentes/base";

// Se abre en el celular al leer el QR de la computadora: lo vincula 12 horas y vuelve a vender.
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
  if (sesion.estado === "cargando") return <main className="pantalla-centrada"><p>Cargando…</p></main>;
  if (sesion.estado !== "con-sesion") {
    return (
      <main className="entrar">
        <div className="arriba">
          <div className="logo">fe</div>
          <h1>Usar este celular para escanear</h1>
          <p className="lema">Entrá con tu cuenta de Google y este celular queda vinculado a la computadora.</p>
        </div>
        <div className="abajo"><BotonGoogle /></div>
      </main>
    );
  }
  return (
    <main className="pantalla-centrada">
      <h1>Vincular celular</h1>
      {resultado && <p role="status" data-testid="vinculacion-ok">{resultado}</p>}
      <AvisoError texto={error} />
      {(resultado || error) && <button type="button" className="boton tinta" onClick={() => irA("vender")}>Ir a vender</button>}
    </main>
  );
}
