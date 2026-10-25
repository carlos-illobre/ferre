import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { buscarEnElManual, plano, recortar, type Encontrado } from "./buscar";

function Resaltado({ texto, buscado }: { texto: string; buscado: string }) {
  const desde = plano(texto).indexOf(plano(buscado.trim()));
  if (desde < 0 || !buscado.trim()) return <>{texto}</>;
  const hasta = desde + buscado.trim().length;
  return <>{texto.slice(0, desde)}<mark>{texto.slice(desde, hasta)}</mark>{texto.slice(hasta)}</>;
}
// Ctrl+F abre el buscador del manual en lugar del buscar del navegador.
function useCtrlF(abrir: () => void) {
  useEffect(() => {
    const alTeclear = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") { e.preventDefault(); abrir(); }
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

// Lleva a lo encontrado y lo marca un momento. Si es de otro capítulo, una vez que se muestra.
function llevarA(r: Encontrado) {
  const llevar = () => {
    r.elemento.scrollIntoView({ behavior: "smooth", block: "center" });
    if (!r.elemento.hasAttribute("tabindex")) r.elemento.setAttribute("tabindex", "-1");
    r.elemento.focus({ preventScroll: true });
    r.elemento.classList.add("manual-encontrado");
    setTimeout(() => r.elemento.classList.remove("manual-encontrado"), 2000);
  };
  if (r.elemento.closest("article")?.hidden) setTimeout(llevar, 0); else llevar();
}

function Resultados({ resultados, activa, buscado, alElegir }: { resultados: Encontrado[]; activa: number; buscado: string; alElegir: (r: Encontrado) => void }) {
  return (
    <ol className="manual-resultados" id="manual-resultados" role="listbox" aria-label="Resultados">
      {resultados.map((r, i) => (
        <li key={i} id={`manual-resultado-${i}`} role="option" aria-selected={i === activa} className={i === activa ? "activa" : undefined}
          onMouseDown={(e) => e.preventDefault()} onClick={() => alElegir(r)} data-testid="manual-resultado">
          <span className="manual-resultado-ruta">{r.ruta}</span>
          <strong><Resaltado texto={r.titulo} buscado={buscado} /></strong>
          {r.texto && <small><Resaltado texto={recortar(r.texto, buscado)} buscado={buscado} /></small>}
        </li>
      ))}
    </ol>
  );
}

// Escape cierra; las flechas recorren los resultados y Enter abre el marcado.
function teclasDelBuscador(e: KeyboardEvent<HTMLInputElement>, cuantos: number, cerrar: () => void, mover: (paso: number) => void, abrir: () => boolean) {
  if (e.key === "Escape") { cerrar(); return; }
  const accion: (() => boolean) | null | undefined = { ArrowDown: cuantos ? () => { mover(1); return true; } : null, ArrowUp: cuantos ? () => { mover(-1); return true; } : null, Enter: abrir }[e.key];
  if (accion?.()) e.preventDefault();
}

// Elegir un resultado de otro capítulo lo abre.
export function Buscador({ alAbrirCapitulo }: { alAbrirCapitulo: (capitulo: number) => void }) {
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [activa, setActiva] = useState(0);
  const caja = useRef<HTMLInputElement>(null);
  const resultados = abierto ? buscarEnElManual(texto) : [];
  useCtrlF(() => { caja.current?.focus(); caja.current?.select(); setAbierto(true); });
  const ir = (r: Encontrado) => { setAbierto(false); alAbrirCapitulo(r.capitulo); llevarA(r); };
  const mover = (paso: number) => setActiva((i) => (paso > 0 ? (i + 1) % resultados.length : (i <= 0 ? resultados.length : i) - 1));
  const abrirElMarcado = () => { const r = resultados[activa]; if (r) ir(r); return Boolean(r); };
  return (
    <div className={`manual-buscar${abierto ? " abierto" : ""}`}>
      <label>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
        <input ref={caja} value={texto} placeholder="Buscar en el manual…" aria-label="Buscar en el manual" role="combobox" aria-expanded={resultados.length > 0}
          aria-controls="manual-resultados" aria-autocomplete="list" aria-activedescendant={resultados.length ? `manual-resultado-${activa}` : undefined}
          onChange={(e) => { setTexto(e.target.value); setAbierto(true); setActiva(0); }} onFocus={() => setAbierto(true)} onBlur={() => setAbierto(false)}
          onKeyDown={(e) => teclasDelBuscador(e, resultados.length, () => { setAbierto(false); caja.current?.blur(); }, mover, abrirElMarcado)} data-testid="manual-buscar" />
        <kbd>Ctrl + F</kbd>
      </label>
      {resultados.length > 0 && <Resultados resultados={resultados} activa={activa} buscado={texto} alElegir={ir} />}
      {abierto && texto.trim().length >= 2 && resultados.length === 0 && <p className="manual-resultados vacio" role="status">No hay nada con «{texto}».</p>}
    </div>
  );
}
