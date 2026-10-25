import { conUnidad, enteras, unidadDe } from "../../../negocio/catalogo";
import type { Contado } from "../../../negocio/deposito";
import { Boton } from "../base/ui";
import { Icono } from "../../../ui/iconos";
import { FotoChica } from "./FotoChica";
import { nombreUnidad, type Producto } from "./deposito-comun";
import type { ConteoDeSector } from "./useConteoDeSector";
import css from "./Contar.module.css";

// El producto que se está contando: «¿Cuántas hay?», Enter y el siguiente; Esc cancela. Si ya se
// había contado, lo nuevo lo reemplaza, y se puede quitar de lo contado.
export function ContandoUno({ x, producto }: { x: ConteoDeSector; producto: Producto }) {
  const previo = x.contadoPorId.get(producto.id);
  const unidad = unidadDe(producto);
  return (
    <form className={css.contando} onSubmit={(e) => { e.preventDefault(); void x.guardar(); }} noValidate data-testid="contando" onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); x.setProducto(null); } }}>
      <FotoChica id={producto.id} grande />
      <QueSeCuenta producto={producto} previo={previo} />
      <label className={css.cuantas} htmlFor={`${x.id}-cantidad`}>
        <span>¿Cuántas hay?</span>
        <input ref={x.cajaCantidad} id={`${x.id}-cantidad`} inputMode={enteras(unidad) ? "numeric" : "decimal"} enterKeyHint="next" autoComplete="off" placeholder="0" value={x.cantidad}
          onChange={(e) => { x.setCantidad(e.target.value.replace(enteras(unidad) ? /[^\d]/g : /[^\d,.]/g, "")); x.setErrorCantidad(null); }}
          aria-invalid={Boolean(x.errorCantidad)} aria-describedby={x.errorCantidad ? `${x.id}-falta` : undefined} data-testid="cantidad" />
        <small>{nombreUnidad(unidad)}</small>
      </label>
      <Boton type="submit" variante="marino" className={css.siguiente} disabled={x.guardando} data-testid="siguiente">{x.guardando ? "Guardando…" : "Siguiente"} <kbd className="tecla">Enter</kbd></Boton>
      <PieDelContando x={x} unidad={unidad} conPrevio={Boolean(previo)} />
    </form>
  );
}

function QueSeCuenta({ producto, previo }: { producto: Producto; previo: Contado | undefined }) {
  return (
    <div className={css.contandoTexto}>
      <b>{producto.descripcion}</b>
      <span className="detalle">{[producto.marca, producto.codigo_proveedor && `Cód. ${producto.codigo_proveedor}`].filter(Boolean).join(" · ") || "Sin marca"}</span>
      {previo && <span className={css.previo} data-testid="ya-contado"><Icono nombre="history" tam={16} />Antes {conUnidad(previo.cantidad_contada, previo.unidad)}: lo que pongas lo reemplaza</span>}
    </div>
  );
}

function PieDelContando({ x, unidad, conPrevio }: { x: ConteoDeSector; unidad: ReturnType<typeof unidadDe>; conPrevio: boolean }) {
  return (
    <div className={css.contandoPie}>
      {x.errorCantidad && <p className={css.falta} id={`${x.id}-falta`} role="alert">{x.errorCantidad}</p>}
      {!enteras(unidad) && <span className="detalle">En {nombreUnidad(unidad)}, con un decimal.</span>}
      <Boton tam="chico" onClick={() => x.setProducto(null)} disabled={x.guardando}>Cancelar <kbd className="tecla">Esc</kbd></Boton>
      {conPrevio && <Boton variante="peligro" tam="chico" icono="basura" onClick={() => void x.quitar()} disabled={x.guardando} data-testid="quitar-contado">Quitar de lo contado</Boton>}
    </div>
  );
}
