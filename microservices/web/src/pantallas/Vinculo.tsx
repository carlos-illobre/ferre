import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api";
import { useEspejo } from "../espejo";
import { puestoLocal, puestoRemoto, soltarEmparejamiento } from "../puesto";
import { fecha } from "../formato";
import { usePuede } from "./permisos";
import "./vinculo.css";
import type { DiasDelVinculo } from "@servidor/puestos";

// El vínculo entre un celular y una computadora (decisiones 73, 74, 99 y 100), en dos lugares que
// no se repiten: lo de cada uno, en Configuración, y cuántos días dura, al final de Más → Usuarios.

// En Configuración: a quien está vinculado le dice con qué y hasta cuándo, y le ofrece
// «Desvincular», que es el corte definitivo y por eso pregunta. Sin vínculo, no se ve.
export function VinculoPropio() {
  const { emparejado, lado } = useEspejo();
  if (!emparejado) return null;
  const computadora = lado === "computadora";
  const vence = (computadora ? puestoLocal() : puestoRemoto())?.expira_en;
  function desvincular() {
    if (window.confirm(`¿Desvincular ${computadora ? "el celular de esta computadora" : "este celular de la computadora"}? Para volver a trabajar juntos vas a tener que escanear el código.`)) void soltarEmparejamiento();
  }
  return (
    <section className="dias-de-vinculo" aria-labelledby="vinculo-propio" data-testid="vinculo">
      <h2 id="vinculo-propio">Vínculo entre celular y computadora</h2>
      <div className="dias-de-vinculo-fila" data-testid="vinculo-actual">
        <span className="dias-de-vinculo-estado">
          {computadora ? "Esta computadora está vinculada con tu celular." : "Este celular está vinculado con tu computadora."}
          {vence && <small className="dias-de-vinculo-vence">Hasta el {fecha(vence.slice(0, 10))}</small>}
        </span>
        <button type="button" className="peligro" onClick={desvincular} data-testid="desvincular-vinculo" aria-label={`Desvincular ${computadora ? "el celular" : "la computadora"}`}>Desvincular</button>
      </div>
    </section>
  );
}

// Al final de Más → Usuarios, para quien administra usuarios: cuántos días dura el vínculo, para
// todo el negocio. El cambio vale para los vínculos nuevos y los que se renueven.
export function DiasDelVinculoDelNegocio() {
  const cambia = usePuede()("admin.usuarios");
  const [dias, setDias] = useState<string>("");
  const [guardado, setGuardado] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState<{ texto: string; mal?: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => { api<DiasDelVinculo>("/puestos/configuracion").then((r) => { if (Number.isInteger(r.dias)) { setDias(String(r.dias)); setGuardado(r.dias); } }).catch(() => undefined); }, []);
  if (!cambia || guardado === null) return null;
  const numero = Number(dias);
  const valido = Number.isInteger(numero) && numero >= 1 && numero <= 365;
  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!valido || ocupado) return;
    setOcupado(true); setMensaje(null);
    try { const r = await api<DiasDelVinculo>("/puestos/configuracion", { method: "PUT", body: JSON.stringify({ dias: numero } satisfies DiasDelVinculo) }); setGuardado(r.dias); setMensaje({ texto: `Listo: el vínculo dura ${r.dias} ${r.dias === 1 ? "día" : "días"}.` }); }
    catch (err) { setMensaje({ texto: (err as Error).message || "No se pudo guardar. Probá de nuevo.", mal: true }); }
    finally { setOcupado(false); }
  }
  return (
    <form className="dias-de-vinculo" onSubmit={guardar} data-testid="dias-del-vinculo">
      <h2>Vínculo entre celular y computadora</h2>
      <p>Vale para todos: cuántos días quedan vinculados sin escanear de nuevo. Se renueva cada vez que se entra a la computadora escaneando su código con el celular.</p>
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
