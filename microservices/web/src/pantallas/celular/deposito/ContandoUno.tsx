import { conUnidad, type Producto } from "../../../negocio/catalogo";
import { useAccionesDelLugar } from "../../../plataforma/comandos";
import type { ConteoDelCelular } from "./useConteoDelCelular";

// El producto que se cuenta: «¿Cuántas hay?» y «Siguiente»; terminar el campo cuenta y deshacerlo, o «Cancelar», lo suelta.
export function ContandoUno({ x, producto }: { x: ConteoDelCelular; producto: Producto }) {
  useAccionesDelLugar(x.cajaCantidad, { "campo.listo": () => void x.guardar(), "campo.deshacer": () => x.setProducto(null) });
  const previo = x.contadoPorId.get(producto.id);
  return (
    <div className="contando" data-testid="contando">
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontSize: 18, fontWeight: 600 }}>{producto.descripcion}</span><small>{[producto.marca, producto.codigo_proveedor].filter(Boolean).join(" · ")}{previo ? ` · teórico ${conUnidad(previo.stock_teorico, producto.unidad)}` : ""}</small></div>
      <label className="cuantas">¿Cuántas hay?
        <input ref={x.cajaCantidad} inputMode="numeric" value={x.cantidad} onChange={(e) => x.setCantidad(e.target.value.replace(/[^\d]/g, ""))} placeholder="0"
          data-testid="cantidad" />
      </label>
      <div className="acciones auto-1fr">
        <button type="button" className="boton gris-oscuro" onClick={() => x.setProducto(null)}>Cancelar</button>
        <button type="button" className="boton coral" style={{ height: 50 }} onClick={x.guardar} data-testid="siguiente">Siguiente</button>
      </div>
    </div>
  );
}
