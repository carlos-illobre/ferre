import { useMemo, useState } from "react";
import { useCatalogo } from "../../../negocio/catalogo";
import { Aviso, Boton, Buscador } from "../base/ui";
import css from "./Duplicados.module.css";

// Unir dos productos a mano: el que queda y el que se absorbe, cada uno con su buscador.
type Elegido = { id: string; descripcion: string; proveedor: string | null };

export function UnionManual({ quieto, alUnir }: { quieto: boolean; alUnir: (queda: Elegido, sale: Elegido) => Promise<void> }) {
  const { catalogo, buscarProductos } = useCatalogo();
  const [queda, setQueda] = useState<Elegido | null>(null);
  const [sale, setSale] = useState<Elegido | null>(null);
  const mismo = queda !== null && sale !== null && queda.id === sale.id;

  async function unir() {
    if (!queda || !sale || mismo) return;
    await alUnir(queda, sale);
    setQueda(null); setSale(null);
  }

  return (
    <>
      <div className={css.manual}>
        <Elegir titulo="Producto que queda" ayuda="Conserva su nombre y suma los proveedores del otro." testId="conservar" elegido={queda} alElegir={setQueda} buscarProductos={buscarProductos} listo={catalogo !== null} />
        <Elegir titulo="Producto que se absorbe" ayuda="Queda dentro del otro y deja de aparecer en las búsquedas." testId="absorber" elegido={sale} alElegir={setSale} buscarProductos={buscarProductos} listo={catalogo !== null} />
      </div>
      {mismo && <Aviso tipo="error">Elegiste el mismo producto de los dos lados. Cambiá uno.</Aviso>}
      <div className={css.manualPie}>
        <span className="detalle">No pide confirmar: si fue un error, lo separás desde «Unidos».</span>
        <Boton variante="marino" disabled={!queda || !sale || mismo || quieto} onClick={() => void unir()} data-testid="unir-manual">Unir estos dos</Boton>
      </div>
    </>
  );
}

function Elegir({ titulo, ayuda, testId, elegido, alElegir, buscarProductos, listo }: {
  titulo: string; ayuda: string; testId: string; elegido: Elegido | null; alElegir: (p: Elegido | null) => void; listo: boolean;
  buscarProductos: (consulta: string, maximo?: number) => { id: string; descripcion: string; proveedor: string | null; marca: string | null }[];
}) {
  const [q, setQ] = useState("");
  const resultados = useMemo(() => (q.trim() ? buscarProductos(q, 6) : []), [buscarProductos, q]);
  return (
    <div className={css.elegir}>
      <h3>{titulo}</h3>
      <p className="detalle">{ayuda}</p>
      {elegido ? (
        <div className={css.elegido} data-testid={`elegido-${testId}`}>
          <span className={css.elegidoDatos}><strong>{elegido.descripcion}</strong>{elegido.proveedor && <span className="detalle">{elegido.proveedor}</span>}</span>
          <Boton tam="chico" onClick={() => alElegir(null)} aria-label={`Cambiar el ${titulo.toLowerCase()}`}>Cambiar</Boton>
        </div>
      ) : (
        <>
          <Buscador valor={q} alCambiar={setQ} placeholder="Buscar producto" etiqueta={`Buscar el ${titulo.toLowerCase()}`} testId={`buscar-${testId}`} />
          {q.trim() !== "" && (
            resultados.length > 0 ? (
              <ul className="lista">
                {resultados.map((p) => (
                  <li key={p.id}>
                    <button type="button" className="renglon" onClick={() => { alElegir({ id: p.id, descripcion: p.descripcion, proveedor: p.proveedor }); setQ(""); }}>
                      <span className="nombre">{p.descripcion}</span>
                      <span className="detalle">{[p.marca, p.proveedor].filter(Boolean).join(" · ") || "Sin proveedor"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="detalle" role="status">{listo ? `No hay productos que coincidan con «${q.trim()}». Probá con menos palabras.` : "Cargando el catálogo…"}</p>
          )}
        </>
      )}
    </div>
  );
}
