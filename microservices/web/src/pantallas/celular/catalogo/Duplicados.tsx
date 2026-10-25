import { useState } from "react";
import { buscarDuplicados, resolverSugerencia, useColaDeDuplicados, useDuplicados, type Sugerencia } from "../../../negocio/catalogo";
import { AvisoError, Toast } from "../componentes/base";
import { AccionesDeDuplicados } from "./AccionesDeDuplicados";
import { BarraDeDuplicados } from "./BarraDeDuplicados";
import { SugerenciaDelCelular } from "./SugerenciaDelCelular";
import { UnidosDelCelular } from "./UnidosDelCelular";
import { UnionManual } from "./UnionManual";

// Un mismo artículo en varios proveedores (issue #29): quien administra ve las sugerencias
// lado a lado y decide "es el mismo" o "son distintos". También une dos a mano y separa. Como
// la v2 (decisión 148, «Renovada»): una sugerencia por vez, tocar un producto lo elige para
// conservar, y «Es el mismo» / «Son distintos» van en la barra fija de abajo, bajo el pulgar.
const mensajeDeUnir = (s: Sugerencia, lado: "a" | "b") => `Unidos: "${s[lado].descripcion}" ahora tiene ${s.a.proveedor} y ${s.b.proveedor}.`;

export function Duplicados() {
  const { sugerencias: traidas, uniones, error: fallo } = useDuplicados();
  const sugerencias = traidas ?? [];
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [aviso, setError] = useState<string | null>(null);
  const [cerrado, setCerrado] = useState<unknown>(null);
  const error = aviso ?? (fallo && fallo !== cerrado ? fallo.message : null);
  const [aMano, setAMano] = useState(false);
  // «Separar» y «Ver todo» abren la lista de todos los productos unidos, con su buscador.
  const [todas, setTodas] = useState(false);
  const cola = useColaDeDuplicados(sugerencias);
  const [ocupado, setOcupado] = useState(false);
  const s = cola.actual;

  async function buscar() {
    try { const nuevas = await buscarDuplicados(); setMensaje(nuevas ? `${nuevas} sugerencia(s) nueva(s).` : "Sin sugerencias nuevas."); }
    catch (e) { setError((e as Error).message); }
  }
  async function resolver(accion: "unir" | "rechazar") {
    if (!s || ocupado) return;
    const lado = cola.conservar(s);
    const siguiente = cola.laQueSigue();
    setOcupado(true);
    try {
      await resolverSugerencia(s, accion, lado);
      cola.setElegidaId(siguiente?.id ?? null);
      setMensaje(accion === "unir" ? mensajeDeUnir(s, lado) : "Marcados como distintos.");
    } catch (e) { setError((e as Error).message); } finally { setOcupado(false); }
  }

  return (
    <>
      <AccionesDeDuplicados alBuscar={buscar} alUnirAMano={() => setAMano(true)} alVerUnidos={() => setTodas(true)} />
      <Toast texto={mensaje} alCerrar={() => setMensaje(null)} />
      <AvisoError texto={error} alCerrar={() => { setError(null); setCerrado(fallo); }} />
      <SugerenciaDelCelular sugerencias={sugerencias} cola={cola} />
      {aMano && <UnionManual alCerrar={() => setAMano(false)} alUnir={async (m) => { setMensaje(m); setAMano(false); }} />}
      <UnidosDelCelular uniones={uniones ?? []} todas={todas} alVerTodas={setTodas} />
      {s && <BarraDeDuplicados ocupado={ocupado} alResolver={(accion) => void resolver(accion)} />}
    </>
  );
}
