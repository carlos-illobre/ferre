import { useState } from "react";
import { fueSinConexion, hoyLocal, nombreDelDia, type VentaDelDia } from "../../../negocio/ventas";
import { TEXTOS } from "../../textos";
import { errorDelDia } from "../../comun/ventas/textos-del-dia";
import { Aviso, Icono, Pagina, pesosCortos } from "../base/ui";
import { AnularVenta } from "./AnularVenta";
import { CabezaDelDia } from "./CabezaDelDia";
import { ListaYVentaElegida } from "./ListaYVentaElegida";
import { OtroDia } from "./OtroDia";
import { ResumenDelDia } from "./ResumenDelDia";
import { useListaDelDia, type ListaDelDia } from "./useListaDelDia";
import { useTeclasDelDia } from "./useTeclasDelDia";
import css from "./VentasDelDia.module.css";

// «Ventas de hoy» en la computadora: la v2 del director de arte, «El día y la venta» (decisión 135,
// specs/017 ux.md). Arriba el día: el total con la comparación y los tres números, lo vendido por
// hora con lo de ayer marcado, y los cuatro medios. Debajo, los filtros y el buscador, la tabla del
// día y, a la derecha, la venta elegida con «Corregir» (E) y «Anular» (Supr o A). Corregir edita la
// venta en el mismo panel (specs/019, historia 1).
const t = TEXTOS.hoy;

export function VentasDelDia() {
  const l = useListaDelDia();
  const [campo, setCampo] = useState<HTMLInputElement | null>(null);
  useTeclasDelDia(l, campo);
  const { r } = l;
  const error = errorDeLaLista(r);
  return (
    <Pagina titulo={tituloDelDia(r.esHoy, r.dia)} testId="ventas-de-hoy" className={css.pagina} acciones={<CabezaDelDia l={l} />}>
      <Aviso tipo="error">{error}</Aviso>
      {!r.resumen && !error && <div className="esqueleto ventas-esqueleto" aria-busy="true" aria-label={t.buscando.largo} />}
      {r.resumen && <>
        <ResumenDelDia r={r} />
        <ListaYVentaElegida l={l} alCampo={setCampo} />
      </>}
      <VentanasDelDia l={l} />
    </Pagina>
  );
}

const tituloDelDia = (esHoy: boolean, dia: string) => (esHoy ? t.tituloHoy.largo : `${t.tituloDia.largo} ${nombreDelDia(dia)}`);
function errorDeLaLista(r: ListaDelDia["r"]): string | null {
  if (r.resumen || !r.error) return null;
  return errorDelDia(r.error, r.esHoy, fueSinConexion(r.error), "largo");
}

// Lo que se abre encima: otro día, anular y el aviso de lo que se hizo.
function VentanasDelDia({ l }: { l: ListaDelDia }) {
  const anulada = (v: VentaDelDia) => { l.setPorAnular(null); l.setMensaje(`Venta de ${pesosCortos(v.total)} anulada. El stock volvió.`); };
  return (
    <>
      {l.otroDia && <OtroDia dia={l.r.dia} alElegir={(d) => { l.setDia(d === hoyLocal() ? null : d); l.setOtroDia(false); }} alCerrar={() => l.setOtroDia(false)} />}
      {l.porAnular && <AnularVenta venta={l.porAnular} alCerrar={() => l.setPorAnular(null)} alAnular={() => anulada(l.porAnular!)} />}
      {l.mensaje && <div className={css.aviso} role="status" data-testid="mensaje"><Icono nombre="tilde" tam={20} /><span>{l.mensaje}</span></div>}
    </>
  );
}
