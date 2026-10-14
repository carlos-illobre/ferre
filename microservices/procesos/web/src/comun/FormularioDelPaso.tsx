import { useEffect, useState } from "react";
import { NOMBRE_DEL_TIPO, type Grafo, type Paso, type TipoDePaso } from "../modelo/grafo";
import type { CambiosDelPaso } from "../editor/Lienzo";

// Los datos de un paso (E06): nombre, tipo, quién lo hace, la pantalla donde se hace, cómo se
// hace y con qué sigue. Cada cambio va al dibujo en el momento; el texto, al salir del campo.

const TIPOS = Object.entries(NOMBRE_DEL_TIPO) as [TipoDePaso, string][];

export function FormularioDelPaso({ paso, grafo, pantallas, soloLectura, alCambiar, corto = false }: {
  paso: Paso; grafo: Grafo; pantallas: string[]; soloLectura: boolean; alCambiar: (cambios: CambiosDelPaso) => void;
  /** En el celular, los textos mínimos (sistema visual, «Textos»). */
  corto?: boolean;
}) {
  const [nombre, setNombre] = useState(paso.nombre);
  const [como, setComo] = useState(paso.como);
  useEffect(() => { setNombre(paso.nombre); setComo(paso.como); }, [paso.id, paso.nombre, paso.como]);
  const salen = grafo.flechas.filter((f) => f.desde === paso.id);
  const nombreDe = (id: string) => grafo.pasos.find((p) => p.id === id)?.nombre || "(sin nombre)";
  const otros = grafo.pasos.filter((p) => p.id !== paso.id && p.tipo !== "inicio" && p.tipo !== "nota" && p.tipo !== "documento");
  const conPantalla = paso.tipo !== "inicio" && paso.tipo !== "fin" && paso.tipo !== "nota" && paso.tipo !== "documento";

  return (
    <div className={`procesos-formulario ${corto ? "renglones" : ""}`} data-testid="procesos-formulario-paso">
      <label className="procesos-campo">
        <span>Nombre</span>
        <input id="procesos-nombre-del-paso" value={nombre} readOnly={soloLectura} onChange={(e) => setNombre(e.target.value)}
          onBlur={() => { if (nombre !== paso.nombre) alCambiar({ nombre }); }}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} data-testid="procesos-paso-nombre" />
      </label>
      <label className="procesos-campo">
        <span>Tipo</span>
        <select value={paso.tipo} disabled={soloLectura} onChange={(e) => alCambiar({ tipo: e.target.value as TipoDePaso })} data-testid="procesos-paso-tipo">
          {TIPOS.map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
        </select>
      </label>
      <label className="procesos-campo">
        <span>Quién lo hace</span>
        {grafo.carriles.length ? (
          <select value={paso.carril ?? ""} disabled={soloLectura} onChange={(e) => alCambiar({ carril: e.target.value })} data-testid="procesos-paso-carril">
            {!paso.carril && <option value="">—</option>}
            {grafo.carriles.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        ) : <span className="procesos-ayuda">{corto ? "Sin carriles todavía." : "Sin carriles todavía: arrastrá «Carril» al dibujo para decir quién hace cada paso."}</span>}
      </label>
      {conPantalla && (
        <label className="procesos-campo">
          <span>Pantalla donde se hace</span>
          <select value={paso.pantalla} disabled={soloLectura} onChange={(e) => alCambiar({ pantalla: e.target.value })} data-testid="procesos-paso-pantalla">
            <option value="">— Ninguna</option>
            {!pantallas.includes(paso.pantalla) && paso.pantalla && <option value={paso.pantalla}>{paso.pantalla}</option>}
            {pantallas.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
      )}
      <label className="procesos-campo largo">
        <span>Cómo se hace</span>
        <textarea value={como} readOnly={soloLectura} rows={3} onChange={(e) => setComo(e.target.value)} onBlur={() => { if (como !== paso.como) alCambiar({ como }); }} placeholder={soloLectura || corto ? "" : "Lo que hay que saber para hacerlo bien"} data-testid="procesos-paso-como" />
      </label>
      {paso.tipo !== "fin" && paso.tipo !== "nota" && paso.tipo !== "documento" && (
        <label className="procesos-campo">
          <span>Sigue con</span>
          {salen.length > 1 || soloLectura ? (
            <span className="procesos-valor" data-testid="procesos-paso-sigue">{salen.length ? salen.map((f) => (f.nombre ? `${f.nombre}: ${nombreDe(f.hasta)}` : nombreDe(f.hasta))).join(" · ") : "—"}</span>
          ) : (
            <select value={salen[0]?.hasta ?? ""} onChange={(e) => alCambiar({ sigueCon: e.target.value })} data-testid="procesos-paso-sigue">
              {!salen.length && <option value="">— Nada todavía</option>}
              {otros.map((p) => <option key={p.id} value={p.id}>{p.nombre || NOMBRE_DEL_TIPO[p.tipo]}</option>)}
            </select>
          )}
        </label>
      )}
    </div>
  );
}
