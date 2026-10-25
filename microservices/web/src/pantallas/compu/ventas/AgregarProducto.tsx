import { useRef, useState } from "react";
import { useAccionesDelLugar } from "../../../plataforma/comandos";
import { precioDelProducto, useCatalogo, type Producto } from "../../../negocio/catalogo";
import type { RenglonCorregido } from "../../../negocio/ventas";
import { nombreDeProducto, pesosCortos } from "../../../negocio/formato";
import { TEXTOS } from "../../textos";
import { Icono } from "../base/ui";
import { MiniaturaDeProducto } from "./MiniaturaDeProducto";
import css from "./VentasDelDia.module.css";

// Agregar un producto a la venta que se corrige: se busca como en Vender y se elige de la lista.
const t = TEXTOS.hoy;
function renglonDe(p: Producto): RenglonCorregido | null {
  const precio = precioDelProducto(p);
  if (precio.valor === null) return null;
  return { producto_id: p.id, descripcion: p.descripcion, foto_url: p.foto_url ?? null, unidad: p.unidad, cantidad: 1, precio_unitario: precio.valor, margen_aplicado: p.margen_elegido, costo_neto: precio.costo, devuelto: 0, antes: null };
}

export function AgregarProducto({ alAgregar, alCerrar }: { alAgregar: (r: RenglonCorregido) => void; alCerrar: () => void }) {
  const { buscarProductos } = useCatalogo();
  const [texto, setTexto] = useState("");
  const [marcado, setMarcado] = useState(0);
  const hallados = texto.trim() ? buscarProductos(texto, 5) : [];
  const agregar = (i: number) => { const r = hallados[i] ? renglonDe(hallados[i]!) : null; if (r) alAgregar(r); };
  const caja = useRef<HTMLInputElement>(null);
  useAccionesDelLugar(caja, {
    "lista.salir": alCerrar, "lista.siguiente": () => setMarcado((m) => Math.min(m + 1, hallados.length - 1)),
    "lista.anterior": () => setMarcado((m) => Math.max(m - 1, 0)), "lista.elegir": () => agregar(marcado),
  });
  return (
    <div className={css.agregando}>
      <label className={`${css.buscar} con-texto`}><Icono nombre="buscar" tam={18} />
        <input ref={caja} autoFocus type="search" value={texto} placeholder="Escribí el producto" aria-label={t.agregarProducto.largo} data-testid="buscar-producto"
          onChange={(e) => { setTexto(e.target.value); setMarcado(0); }} />
      </label>
      {hallados.length > 0 && <ul className={css.hallados}>{hallados.map((p, i) => <Hallado key={p.id} producto={p} marcado={i === marcado} alElegir={() => agregar(i)} />)}</ul>}
    </div>
  );
}

function Hallado({ producto: p, marcado, alElegir }: { producto: Producto; marcado: boolean; alElegir: () => void }) {
  const precio = precioDelProducto(p).valor;
  return (
    <li><button type="button" className={marcado ? "marcado" : ""} disabled={precio === null} onClick={alElegir} data-testid="producto-para-agregar">
      <MiniaturaDeProducto url={p.foto_url} /><span>{nombreDeProducto(p.descripcion)}</span><b className="importe">{precio === null ? "sin precio" : pesosCortos(precio)}</b>
    </button></li>
  );
}
