import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api";
import { usePuede } from "./permisos";
import "./dias-de-vinculo.css";

// Cuántos días dura el vínculo entre un celular y una computadora (decisión 73). Lo cambia
// quien tiene «Administrar sesiones»; vale para los vínculos nuevos y los que se renueven.
export function DiasDeVinculo() {
  const cambia = usePuede()("admin.sesiones");
  const [dias, setDias] = useState<string>("");
  const [guardado, setGuardado] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState<{ texto: string; mal?: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => { api<{ dias: number }>("/puestos/configuracion").then((r) => { if (Number.isInteger(r.dias)) { setDias(String(r.dias)); setGuardado(r.dias); } }).catch(() => undefined); }, []);
  if (!cambia || guardado === null) return null;
  const numero = Number(dias);
  const valido = Number.isInteger(numero) && numero >= 1 && numero <= 365;
  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!valido || ocupado) return;
    setOcupado(true); setMensaje(null);
    try { const r = await api<{ dias: number }>("/puestos/configuracion", { method: "PUT", body: JSON.stringify({ dias: numero }) }); setGuardado(r.dias); setMensaje({ texto: `Listo: el vínculo dura ${r.dias} ${r.dias === 1 ? "día" : "días"}.` }); }
    catch (err) { setMensaje({ texto: (err as Error).message || "No se pudo guardar. Probá de nuevo.", mal: true }); }
    finally { setOcupado(false); }
  }
  return (
    <form className="dias-de-vinculo" onSubmit={guardar} data-testid="dias-de-vinculo">
      <h2>Vínculo entre celular y computadora</h2>
      <p>Cuántos días quedan vinculados sin tener que escanear de nuevo. Se renueva cada vez que se entra a la computadora escaneando su código con el celular.</p>
      <div className="dias-de-vinculo-fila">
        <label htmlFor="dias-vinculo">Dura</label>
        <input id="dias-vinculo" type="number" inputMode="numeric" min={1} max={365} value={dias} onChange={(e) => setDias(e.target.value)} data-testid="dias-vinculo" />
        <span>días</span>
        <button type="submit" disabled={!valido || ocupado || numero === guardado} data-testid="guardar-dias-vinculo">{ocupado ? "Guardando…" : "Guardar"}</button>
      </div>
      {!valido && dias !== "" && <p className="dias-de-vinculo-mal" role="alert">Tiene que ser un número entero entre 1 y 365.</p>}
      {mensaje && <p className={mensaje.mal ? "dias-de-vinculo-mal" : "dias-de-vinculo-bien"} role="status">{mensaje.texto}</p>}
    </form>
  );
}
