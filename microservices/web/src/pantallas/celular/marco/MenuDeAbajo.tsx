import { useVentaEnCurso } from "../../../negocio/ventas";
import { irA } from "../../../rutas";
import { Icono } from "../componentes/base";
import type { MenuDelCelular } from "./menu-del-celular";

// El menú de abajo. Vender dice cuántos renglones lleva la venta (015-E24).
export function MenuDeAbajo({ m }: { m: MenuDelCelular }) {
  const enLaVenta = useVentaEnCurso().items.length;
  return (
    <nav className="nav-inferior solo-celular" aria-label="Menú">
      {m.pestanas.map((p) => (
        <button key={p.ruta} type="button" data-testid={`menu-${p.ruta}`} className={m.activa(p.ruta) ? "activo" : ""} onClick={() => irA(p.ruta === "negocio" ? `mas/${m.primeras.laParteNegocio}` : p.ruta)} aria-current={m.activa(p.ruta) ? "page" : undefined}>
          <Icono nombre={`menu-${p.ruta}`} tam={26} grosor={m.activa(p.ruta) ? 2.2 : 1.8} />
          <span>{p.nombre}</span>
          {p.ruta === "vender" && enLaVenta > 0 && <b className="cuenta-menu" aria-label={`${enLaVenta} en la venta`} data-testid="cuenta-venta">{enLaVenta}</b>}
        </button>
      ))}
    </nav>
  );
}
