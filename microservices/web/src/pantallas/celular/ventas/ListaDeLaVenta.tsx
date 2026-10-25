import { TEXTOS } from "../../textos";
import { AvisoError, Icono } from "../componentes/base";
import { CodigoDesconocido } from "./CodigoDesconocido";
import type { Item } from "../../../negocio/ventas";
import { Renglon, type AccionesDelRenglon } from "./Renglon";
import type { EstadoDeVender } from "./useVender";
import css from "./ListaDeLaVenta.module.css";

// «Esta venta»: cuántos, «No llevó» y «Vaciar» (con la venta vacía no se muestran, decisión 126), y
// los renglones o la venta vacía. Con la hoja de buscar abierta, el aviso del catálogo va en la hoja.
export function ListaDeLaVenta({ v }: { v: EstadoDeVender }) {
  const { venta, deshacer } = v;
  const noLlevo = () => { deshacer.setAviso(null); venta.noLlevo(); };
  return (
    <div className="columna">
      <AvisoError texto={v.buscando ? null : v.catalogo.error} />
      {venta.codigoDesconocido && <CodigoDesconocido codigo={venta.codigoDesconocido} escaneando={v.camara.escaneando} alAsociar={v.camara.asociar} alIgnorar={() => venta.setCodigoDesconocido(null)} />}
      <div className={css.cab} data-testid="titulo-venta">
        <h2>Esta venta</h2><span className={css.cuenta} data-testid="cuantos-en-venta">{venta.items.length}</span>
        {venta.items.length > 0 && <>
          <button type="button" onClick={noLlevo} data-testid="no-llevo"><Icono nombre="prohibido" tam={18} />No llevó</button>
          <button type="button" onClick={deshacer.vaciar} data-testid="vaciar-venta"><Icono nombre="tacho" tam={18} />Vaciar</button>
        </>}
      </div>
      {venta.items.length === 0 ? <VentaVacia /> : venta.items.map((it) => (
        <Renglon key={it.clave} item={it} stock={it.producto ? v.catalogo.stock.get(it.producto.id) : undefined} recien={Boolean(v.camara.recien) && it.producto?.id === v.camara.recien} acciones={accionesDe(v, it)} />
      ))}
    </div>
  );
}

function VentaVacia() {
  return (
    <div className={css.vacia} data-testid="venta-vacia">
      <span className={css.icono}><Icono nombre="carrito" tam={26} /></span>
      <b>{TEXTOS.vender.ventaVacia.corto}</b>
      <span>{TEXTOS.vender.comoEmpezar.corto}</span>
    </div>
  );
}

function accionesDe({ venta, deshacer, setRenglonAbierto }: EstadoDeVender, it: Item): AccionesDelRenglon {
  return {
    alCambiar: (c) => venta.cambiarItem(it.clave, c), alQuitar: () => deshacer.quitar(it), alElegirMargen: (m) => venta.elegirMargen(it, m),
    alCambiarUnidad: (u) => venta.cambiarUnidad(it, u), alAbrir: () => setRenglonAbierto(it.clave),
    alSubirFoto: it.producto ? (archivo) => venta.subirFotoDe(it, archivo) : undefined,
  };
}
