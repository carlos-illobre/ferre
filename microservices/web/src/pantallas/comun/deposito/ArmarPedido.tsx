import { useCallback, useMemo, useRef, useState } from "react";
import { totalDelPedido, useBorrador, type Borrador, type ProveedorDelPedido, type RenglonDelPedido } from "../../../negocio/deposito";
import { traerPorCodigo, type Producto } from "../../../negocio/catalogo";
import { contarAlEspejo, useEspejar } from "../../../espejo";
import { BuscarParaPedir } from "./BuscarParaPedir";
import { MandarPedido } from "./MandarPedido";
import { RenglonesDelPedido } from "./RenglonesDelPedido";
import css from "./Pedidos.module.css";

// Armar el pedido: buscar, agregar, cambiar cantidades, quitar. Se guarda solo como borrador.
type Props = { inicial: Borrador; proveedor: ProveedorDelPedido; celular: boolean; alVolver: (mensaje?: string) => void };

export function ArmarPedido({ inicial, proveedor, celular, alVolver }: Props) {
  const b = useBorrador(inicial, proveedor);
  const [consulta, setConsulta] = useState("");
  const [mandando, setMandando] = useState(false);
  const caja = useRef<HTMLInputElement>(null);
  // En espejo (decisión 60): los renglones del pedido son los mismos en los dos.
  useEspejar<{ id: string; renglones: RenglonDelPedido[] }>("pedido-renglones", useMemo(() => ({ id: inicial.id, renglones: b.renglones }), [inicial.id, b.renglones]), (v) => { if (v.id === inicial.id) b.setRenglones(v.renglones); });
  const { agregar: agregarAlBorrador, setError } = b;
  const agregar = useCallback((p: Producto) => { agregarAlBorrador(p); setConsulta(""); caja.current?.focus(); }, [agregarAlBorrador]);
  const alEscanear = useCallback((codigo: string) => {
    void traerPorCodigo(codigo).then((p) => { if (p) agregar(p); else { setConsulta(codigo); setError(`Ningún producto tiene el código ${codigo}.`); } }).catch((e: Error) => setError(e.message));
  }, [agregar, setError]);
  async function borrar() { if (await b.borrar()) alVolver(`Borrador del pedido a ${proveedor.nombre} borrado.`); }
  async function abrirMandar() {
    if (b.renglones.length === 0) { b.setError("Agregá al menos un producto antes de mandar el pedido."); return; }
    if (await b.guardar(b.renglones)) setMandando(true);
  }
  const total = totalDelPedido(b.renglones);
  return (
    <section className="pd" data-testid="armar-pedido">
      <div><button type="button" className={`${css.boton} chico`} onClick={() => alVolver()} data-testid="volver-a-pedidos">‹ Volver a los pedidos</button></div>
      <header className={css.cabeza}>
        <div className={css.crece}><h1>Pedido a {proveedor.nombre}</h1>
          <p className={css.bajada} data-testid="estado-del-borrador">Borrador · {b.guardado === "guardando" ? "guardando…" : b.guardado === "no" ? "sin guardar" : "se guarda solo mientras lo armás."}</p></div>
        <button type="button" className={`${css.boton} peligro`} onClick={() => void borrar()} data-testid="borrar-borrador">Borrar el borrador</button>
        <button type="button" className={`${css.boton} principal`} onClick={() => void abrirMandar()} data-testid="revisar-y-mandar">Revisar y mandar</button>
      </header>
      {b.error && <p className={css.error} role="alert">{b.error}</p>}
      <BuscarParaPedir consulta={consulta} alCambiar={(v) => { setConsulta(v); b.setError(null); }} alLimpiar={() => setConsulta("")} proveedor={proveedor} celular={celular} caja={caja} alAgregar={agregar} alEscanear={alEscanear} />
      <RenglonesDelPedido b={b} proveedor={proveedor} total={total} />
      {mandando && <MandarPedido id={inicial.id} proveedor={proveedor} renglones={b.renglones} total={total} alCerrar={() => setMandando(false)} alMandar={() => { contarAlEspejo(`Pedido enviado a ${proveedor.nombre}`); alVolver(`Pedido enviado a ${proveedor.nombre}.`); }} />}
    </section>
  );
}
