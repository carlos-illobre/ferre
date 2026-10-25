import { useEffect, useState } from "react";
import { numero } from "../../../negocio/formato";
import { buscarDuplicados, mensajeDeDuplicados, resolverSugerencia, separarProductos, unirProductos, useColaDeDuplicados, useDuplicados, type Sugerencia, type Union } from "../../../negocio/catalogo";
import { useEnLinea } from "../../../plataforma/sin-conexion";

// El estado de Duplicados en la computadora: la cola (filtrada por motivo), lo último que se hizo
// (con su «Deshacer»), el error y qué panel está abierto. Unir y separar se deshacen una con la otra.
export type Hecho = { tipo: "union" | "separacion" | "otro"; texto: string; deshacer?: { absorbido_id: string } | { conservar_id: string; absorber_id: string } };
export type Motivo = "todas" | "codigo_barras" | "descripcion";
type Elegido = { id: string; descripcion: string };

const mensajeDe = mensajeDeDuplicados;
const encontradas = (n: number) => (n === 0 ? "No encontré duplicados nuevos en el catálogo." : n === 1 ? "Encontré 1 posible duplicado nuevo." : `Encontré ${numero(n)} posibles duplicados nuevos.`);
const proveedoresDe = (s: Sugerencia) => [s.a.proveedor, s.b.proveedor].filter(Boolean).join(" y ") || "los dos proveedores";

export function useDuplicadosDeLaCompu() {
  const enLinea = useEnLinea();
  const { sugerencias, uniones, error: fallo, recargar } = useDuplicados();
  const [hecho, setHecho] = useState<Hecho | null>(null);
  const [errorAlHacer, setError] = useState<string | null>(null);
  const error = errorAlHacer ?? (fallo ? mensajeDe(fallo) : null);
  const [buscando, setBuscando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [motivo, setMotivo] = useState<Motivo>("todas");
  const [panel, setPanel] = useState<"unir" | "unidos" | null>(null);
  const todas = sugerencias ?? [];
  const cola = motivo === "todas" ? todas : todas.filter((s) => s.motivo === motivo);
  const elegida = useColaDeDuplicados(cola);
  const quieto = ocupado || buscando || !enLinea;

  useEffect(() => { if (enLinea && error) recargar(); }, [enLinea]); // eslint-disable-line react-hooks/exhaustive-deps

  async function hacer(tarea: () => Promise<void>) {
    setOcupado(true); setError(null);
    try { await tarea(); } catch (e) { setError(mensajeDe(e)); } finally { setOcupado(false); }
  }
  async function buscar() {
    if (buscando) return;
    setBuscando(true); setError(null); setHecho(null);
    try { setHecho({ tipo: "otro", texto: encontradas(await buscarDuplicados()) }); } catch (e) { setError(mensajeDe(e)); } finally { setBuscando(false); }
  }
  const { resolver, unirAMano, separar, deshacer } = useAccionesDeDuplicados(hacer, elegida, setHecho, () => setPanel(null));
  const elegirMotivo = (m: Motivo) => { setMotivo(m); elegida.setElegidaId(null); };
  return {
    enLinea, sugerencias, todas, uniones: uniones ?? [], cola, elegida, motivo, elegirMotivo, error, recargar, hecho, setHecho,
    buscando, quieto, panel, setPanel, buscar, resolver, unirAMano, separar, deshacer,
  };
}
export type DuplicadosDeLaCompu = ReturnType<typeof useDuplicadosDeLaCompu>;

// Resolver una sugerencia, unir a mano, separar y deshacer, cada una con su aviso.
type Cola = ReturnType<typeof useColaDeDuplicados>;
function useAccionesDeDuplicados(hacer: (tarea: () => Promise<void>) => Promise<void>, elegida: Cola, setHecho: (h: Hecho) => void, cerrarPanel: () => void) {
  // Al resolver una, queda elegida la que ocupa su lugar.
  const resolver = (s: Sugerencia, accion: "unir" | "rechazar") => hacer(async () => {
    const siguiente = elegida.laQueSigue();
    const { queda, sale } = await resolverSugerencia(s, accion, elegida.conservar(s));
    elegida.setElegidaId(siguiente?.id ?? null);
    setHecho(accion === "unir"
      ? { tipo: "union", texto: `Unidos: «${queda.descripcion}» ahora tiene ${proveedoresDe(s)}. Si fue un error, deshacelo.`, deshacer: { absorbido_id: sale.id } }
      : { tipo: "otro", texto: `Marcados como distintos: «${s.a.descripcion}» y «${s.b.descripcion}» no se van a volver a sugerir.` });
  });
  const unirAMano = (queda: Elegido, sale: Elegido) => hacer(async () => {
    await unirProductos(queda.id, sale.id);
    cerrarPanel();
    setHecho({ tipo: "union", texto: `Unidos: «${queda.descripcion}» absorbió a «${sale.descripcion}». Si fue un error, deshacelo.`, deshacer: { absorbido_id: sale.id } });
  });
  const separar = (u: Union) => hacer(async () => {
    await separarProductos(u.absorbido_id);
    setHecho({ tipo: "separacion", texto: `Separados: «${u.absorbido}» vuelve a ser un producto aparte, con sus precios, ventas y stock.`, deshacer: { conservar_id: u.conservado_id, absorber_id: u.absorbido_id } });
  });
  const deshacer = (h: Hecho) => hacer(async () => {
    if (!h.deshacer) return;
    if ("absorbido_id" in h.deshacer) {
      await separarProductos(h.deshacer.absorbido_id);
      setHecho({ tipo: "separacion", texto: "Unión deshecha: vuelven a ser dos productos, cada uno con sus precios, ventas y stock." });
    } else {
      await unirProductos(h.deshacer.conservar_id, h.deshacer.absorber_id);
      setHecho({ tipo: "union", texto: "Separación deshecha: vuelven a ser un solo producto." });
    }
  });
  return { resolver, unirAMano, separar, deshacer };
}
