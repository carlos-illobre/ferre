import { useEffect, useState } from "react";
import { abrirConteo, avanceDelConteo, crearSector as crearSectorNuevo, mensajeDeStock, ordenarSectores, useSectores, type Conteo, type Sector } from "../../../negocio/deposito";
import { AvisoError, Hoja } from "../componentes/base";
import { ConteoDeSector } from "./ConteoDeSector";
import { SectoresDelCelular } from "./SectoresDelCelular";
import { SeguiDondeQuedaste, SeguirContando } from "./SeguirContando";

// Conteo cíclico con el celular (issue #31), con una mano: elegir sector → buscar o
// escanear → cuántas hay → siguiente. El sector queda abierto hasta cerrarlo; al cerrar,
// las diferencias contra el stock teórico se aplican como ajustes explicados. Como la v2
// (decisión 148): primero el conteo a medias, con su avance y «Seguir contando» al pulgar;
// después lo que toca hoy y los sectores con su estado.
export function Contar() {
  const x = useContarDelCelular();
  if (x.conteo) return <ConteoDeSector conteo={x.conteo} alActualizar={x.setConteo} alSalir={x.salir} />;
  return (
    <div className="ctc">
      <AvisoError texto={x.error} alCerrar={x.cerrarError} />
      {x.enCurso && <SeguiDondeQuedaste sector={x.enCurso} retomable={x.retomable} avance={x.avance} alAbrir={() => void x.abrir(x.enCurso!.id)} />}
      <SectoresDelCelular ordenados={x.ordenados} enCurso={x.enCurso} alAbrir={(id) => void x.abrir(id)} alNuevo={() => x.setNuevo(true)} />
      {x.enCurso && <SeguirContando sector={x.enCurso} alAbrir={() => void x.abrir(x.enCurso!.id)} />}
      {x.nuevo && <SectorNuevo alCerrar={() => x.setNuevo(false)} alCrear={(n) => void x.crearSector(n)} />}
    </div>
  );
}

function useContarDelCelular() {
  const { sectores: traidos, error: fallo, recargar: cargarSectores } = useSectores();
  const sectores = traidos ?? [];
  const [conteo, setConteo] = useState<Conteo | null>(null);
  // El aviso se puede cerrar; vuelve si el próximo pedido falla de nuevo.
  const [cerrado, setCerrado] = useState<unknown>(null);
  const [aviso, setError] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const ordenados = ordenarSectores(sectores);
  // El conteo a medias, para mostrar cuánto falta: retomarlo solo lo trae, no cambia nada.
  const enCurso: Sector | null = ordenados.find((s) => s.conteo_abierto) ?? null;
  const [retomable, setRetomable] = useState<Conteo | null>(null);
  useEffect(() => { if (enCurso && retomable?.sector_id !== enCurso.id) abrirConteo(enCurso.id).then(setRetomable).catch(() => undefined); }, [enCurso, retomable?.sector_id]);
  async function abrir(sectorId: string) {
    try { setConteo(await abrirConteo(sectorId)); setError(null); } catch (e) { setError((e as Error).message); }
  }
  async function crearSector(nombre: string) {
    try { const id = await crearSectorNuevo(nombre); setNuevo(false); await abrir(id); } catch (err) { setError((err as Error).message); }
  }
  return {
    conteo, setConteo, ordenados, enCurso, retomable, avance: retomable ? avanceDelConteo(retomable) : 0, abrir, crearSector, nuevo, setNuevo,
    error: aviso ?? (!fallo || fallo === cerrado ? null : mensajeDeStock(fallo)), cerrarError: () => { setError(null); setCerrado(fallo); },
    salir: () => { setConteo(null); setRetomable(null); void cargarSectores(); },
  };
}

function SectorNuevo({ alCerrar, alCrear }: { alCerrar: () => void; alCrear: (nombre: string) => void }) {
  return (
    <Hoja titulo="Sector nuevo" alCerrar={alCerrar}>
      <form className="formulario" onSubmit={(e) => { e.preventDefault(); const n = String(new FormData(e.currentTarget).get("nombre") ?? "").trim(); if (n) alCrear(n); }}>
        <label className="renglon"><span>Nombre</span><input name="nombre" placeholder="Sector nuevo (Estantería 1, Pared herramientas…)" required autoFocus /></label>
        <div className="acciones" style={{ padding: "12px 0" }}><button type="submit" className="boton tinta">Agregar sector</button></div>
      </form>
    </Hoja>
  );
}
