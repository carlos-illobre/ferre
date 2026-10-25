import { Icono } from "../componentes/base";
import css from "./AbrirLaBusqueda.module.css";

// La caja de buscar, que abre la hoja de la búsqueda (decisión 140), y el botón de la cámara.
export function AbrirLaBusqueda({ alAbrir, alEscanear }: { alAbrir: () => void; alEscanear?: () => void }) {
  return (
    <div className={`buscador ${css.buscador}`}>
      <button type="button" className={`buscador-caja ${css.abrir}`} onClick={alAbrir} data-testid="abrir-busqueda">
        <Icono nombre="buscar" tam={20} grosor={2.2} className="lupa" /><span>Producto, código o marca</span>
      </button>
      {alEscanear && <button type="button" className="escanear" aria-label="Escanear" onClick={alEscanear} data-testid="escanear"><Icono nombre="escanear" tam={22} /></button>}
    </div>
  );
}
