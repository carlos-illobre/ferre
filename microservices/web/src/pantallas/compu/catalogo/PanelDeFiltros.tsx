import { useEffect, useRef, useState } from "react";
import { SIN_FILTROS, type Disponibilidad, type Filtros } from "../../../negocio/catalogo";
import { TEXTOS } from "../../textos";
import { Icono } from "../base/ui";

// Los filtros, en un panel debajo de su botón (maqueta de 015): la disponibilidad y la marca, con
// su buscador. Se aplican mientras se eligen; Esc o tocar afuera lo cierra y quedan puestos.
const t = TEXTOS.catalogo;
const OPCIONES: { valor: Disponibilidad; nombre: string }[] = [{ valor: "todos", nombre: t.todos.largo }, { valor: "con-stock", nombre: t.conStock.largo }, { valor: "sin-stock", nombre: t.sinStock.largo }];
type Props = { filtros: Filtros; marcas: string[]; alCambiar: (f: Filtros) => void; alCerrar: () => void };

export function PanelDeFiltros({ filtros, marcas, alCambiar, alCerrar }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  useCerrarConEscOAfuera(panel, alCerrar);
  return (
    <div className="panel-filtros" role="dialog" aria-label={t.filtros.largo} ref={panel} data-testid="panel-filtros">
      <div className="panel-filtros-cabeza"><h2>{t.filtros.largo}</h2><button type="button" className="enlace" onClick={() => alCambiar(SIN_FILTROS)} data-testid="panel-sacar-filtros">{t.sacarFiltros.largo}</button></div>
      <h3>{t.disponibilidad.largo}</h3>
      <div className="filtros-disponibilidad" role="radiogroup" aria-label={t.disponibilidad.largo}>
        {OPCIONES.map((o) => <button key={o.valor} type="button" role="radio" aria-checked={filtros.disponibilidad === o.valor} onClick={() => alCambiar({ ...filtros, disponibilidad: o.valor })} data-testid={`disponibilidad-${o.valor}`}>{o.nombre}</button>)}
      </div>
      <Marcas filtros={filtros} marcas={marcas} alCambiar={alCambiar} />
      <p className="detalle">La lista se filtra mientras elegís. Esc cierra.</p>
    </div>
  );
}

function Marcas({ filtros, marcas, alCambiar }: Omit<Props, "alCerrar">) {
  const [buscarMarca, setBuscarMarca] = useState("");
  const visibles = marcas.filter((m) => m.toLocaleLowerCase("es-AR").includes(buscarMarca.trim().toLocaleLowerCase("es-AR")));
  return (
    <>
      <h3>{t.marca.largo}</h3>
      <label className="filtros-buscar-marca"><Icono nombre="buscar" tam={18} /><input type="search" value={buscarMarca} onChange={(e) => setBuscarMarca(e.target.value)} placeholder={t.buscarMarca.largo} aria-label={t.buscarMarca.largo} data-testid="buscar-marca" /></label>
      <ul className="filtros-marcas" role="radiogroup" aria-label={t.marca.largo}>
        {[null, ...visibles].map((m) => (
          <li key={m ?? ""}><button type="button" role="radio" aria-checked={filtros.marca === m} onClick={() => alCambiar({ ...filtros, marca: m })} data-testid="marca"><i aria-hidden="true" />{m ?? t.todasLasMarcas.largo}</button></li>
        ))}
      </ul>
    </>
  );
}

// El foco entra una sola vez, al abrir; el padre pasa un `alCerrar` nuevo en cada dibujo, y depender
// de él movería el foco cada vez que cambia la lista (015-E30).
function useCerrarConEscOAfuera(panel: React.RefObject<HTMLDivElement>, alCerrar: () => void) {
  const cerrar = useRef(alCerrar);
  useEffect(() => { cerrar.current = alCerrar; });
  useEffect(() => {
    panel.current?.querySelector<HTMLElement>("[aria-checked='true']")?.focus();
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); cerrar.current(); } };
    const afuera = (e: MouseEvent) => { if (panel.current && !panel.current.parentElement?.contains(e.target as Node)) cerrar.current(); };
    window.addEventListener("keydown", tecla, true);
    document.addEventListener("mousedown", afuera);
    return () => { window.removeEventListener("keydown", tecla, true); document.removeEventListener("mousedown", afuera); };
  }, [panel]);
}
