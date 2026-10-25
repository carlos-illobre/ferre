import { useState, type KeyboardEvent, type RefObject } from "react";
import { busquedaAlDia, esperarBusqueda, useCatalogo, type Producto } from "../../../negocio/catalogo";
import { segunProveedor, useParaPedir, type ProveedorDelPedido } from "../../../negocio/deposito";
import { Escaner, hayCamara } from "../../../plataforma/camara";
import { pesos } from "./formato-de-pedidos";
import css from "./Pedidos.module.css";

// Buscar lo que hay que pedir (o escanearlo, en el celular): primero lo que figura en la lista del
// proveedor; Enter agrega el primero.
type Props = {
  consulta: string; alCambiar: (v: string) => void; alLimpiar: () => void; proveedor: ProveedorDelPedido; celular: boolean; caja: RefObject<HTMLInputElement>;
  alAgregar: (p: Producto) => void; alEscanear: (codigo: string) => void;
};

export function BuscarParaPedir({ consulta, alCambiar, alLimpiar, proveedor, celular, caja, alAgregar, alEscanear }: Props) {
  const { buscarProductos } = useCatalogo();
  const resultados = useParaPedir(buscarProductos, consulta, proveedor);
  const [escaneando, setEscaneando] = useState(false);
  const conCamara = celular && hayCamara();
  function teclas(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !busquedaAlDia(consulta, proveedor.id)) { e.preventDefault(); void esperarBusqueda(consulta, 16, proveedor.id).then((r) => { if (r[0]) alAgregar(r[0]); }); }
    else if (e.key === "Enter" && resultados[0]) { e.preventDefault(); alAgregar(resultados[0]); }
    else if (e.key === "Escape") alLimpiar();
  }
  return (
    <>
      <div className={css.buscar}>
        <input ref={caja} type="search" value={consulta} onChange={(e) => alCambiar(e.target.value)} placeholder={conCamara ? "Buscá lo que hay que pedir, o escanealo" : "Buscá lo que hay que pedir"}
          autoFocus={!celular} autoComplete="off" aria-label="Buscar un producto para agregar al pedido" data-testid="buscar-para-pedir" onKeyDown={teclas} />
        {conCamara && <button type="button" className={css.boton} onClick={() => setEscaneando(true)} aria-label="Escanear" data-testid="escanear-para-pedir">Escanear</button>}
      </div>
      {escaneando && <Escaner alDetectar={(codigo) => { setEscaneando(false); alEscanear(codigo); }} alCerrar={() => setEscaneando(false)} />}
      {consulta.trim() && <ResultadosParaPedir consulta={consulta} resultados={resultados} proveedor={proveedor} alAgregar={alAgregar} />}
    </>
  );
}

function ResultadosParaPedir({ consulta, resultados, proveedor, alAgregar }: { consulta: string; resultados: Producto[]; proveedor: ProveedorDelPedido; alAgregar: (p: Producto) => void }) {
  return (
    <ul className={css.resultados} data-testid="resultados-para-pedir">
      {resultados.length === 0 && <li className={`${css.bajada} ${css.relleno}`}>Ningún producto coincide con «{consulta}».</li>}
      {resultados.map((p, i) => {
        const s = segunProveedor(p, proveedor);
        return (
          <li key={p.id}><button type="button" className={`${css.resultado} ${i === 0 ? "primero" : ""}`} onClick={() => alAgregar(p)} data-testid="resultado-para-pedir">
            <span className={css.quien}><strong>{p.descripcion}</strong><span className={css.detalle}>{[p.marca, s.codigo].filter(Boolean).join(" · ") || "sin marca"}</span></span>
            <span className={css.detalle}>{s.costo === null ? `no figura en la lista de ${proveedor.nombre}` : `${pesos(s.costo)} c/u`}</span>
          </button></li>
        );
      })}
    </ul>
  );
}
