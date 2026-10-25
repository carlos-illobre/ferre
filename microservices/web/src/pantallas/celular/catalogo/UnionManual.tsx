import { useMemo, useState } from "react";
import { unirProductos, useCatalogo } from "../../../negocio/catalogo";
import { AvisoError, Buscador, Hoja, Lista } from "../componentes/base";

// Unir dos productos a mano: el que se conserva y el que se absorbe, cada uno con su buscador.
type Props = { alCerrar: () => void; alUnir: (mensaje: string) => Promise<void> };

export function UnionManual({ alCerrar, alUnir }: Props) {
  const { catalogo } = useCatalogo();
  const [id1, setId1] = useState(""); const [id2, setId2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const nombre = (id: string) => catalogo?.find((p) => p.id === id)?.descripcion ?? "";
  async function unir() {
    try { await unirProductos(id1, id2); await alUnir(`Unidos: "${nombre(id1)}" absorbió a "${nombre(id2)}".`); }
    catch (e) { setError((e as Error).message); }
  }
  return (
    <Hoja titulo="Unir dos productos a mano" alCerrar={alCerrar} testId="union-manual">
      <AvisoError texto={error} />
      <ElegirUno titulo="Conservar" testId="conservar" id={id1} setId={setId1} nombre={nombre} />
      <ElegirUno titulo="Absorber (queda dentro del otro)" testId="absorber" id={id2} setId={setId2} nombre={nombre} />
      <button type="button" className="boton tinta" disabled={!id1 || !id2 || id1 === id2} onClick={unir}>Unir</button>
    </Hoja>
  );
}

function ElegirUno({ titulo, testId, id, setId, nombre }: { titulo: string; testId: string; id: string; setId: (id: string) => void; nombre: (id: string) => string }) {
  const { buscarProductos } = useCatalogo();
  const [q, setQ] = useState("");
  const r = useMemo(() => (q.trim() ? buscarProductos(q, 6) : []), [buscarProductos, q]);
  return (
    <div className="tarjeta">
      <strong>{titulo}</strong>
      {id ? <div className="fila-otro"><span>{nombre(id)}</span><button type="button" className="enlace" onClick={() => setId("")}>cambiar</button></div> : (
        <>
          <Buscador chico valor={q} alCambiar={setQ} placeholder="Buscar producto" testId={`buscar-${testId}`} />
          {r.length > 0 && <Lista>{r.map((p) => <button key={p.id} type="button" className="fila" onClick={() => { setId(p.id); setQ(""); }}><span className="nombre">{p.descripcion}</span><span /><span className="detalle">{p.proveedor ?? ""}</span></button>)}</Lista>}
        </>
      )}
    </div>
  );
}
