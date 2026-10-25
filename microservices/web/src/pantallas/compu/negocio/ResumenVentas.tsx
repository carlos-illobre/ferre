import { compararConElAnterior, consultasDeHoy, diaAnterior, hoyLocal, resumenDelDia, useConsultas, useVentasDelDia } from "../../../negocio/ventas";
import { TEXTOS } from "../../textos";
import { AbajoDeVentas } from "./AbajoDeVentas";
import { ComoPagaron } from "./ComoPagaron";
import { KpisDeVentas } from "./KpisDeVentas";
import { PorHora } from "./PorHora";
import { SeccionDelNegocio } from "./SeccionDelNegocio";
import { comoCarga } from "./negocio-comun";
import "./negocio.css";
import css from "./Resumen.module.css";

// Ventas: cuatro números con su comparación con ayer a la misma hora, lo vendido por hora, cómo
// pagaron, lo más vendido, lo que no llevaron y el cierre de caja.


export function ResumenVentas() {
  const { hoy, ayer, consultas, r, comp } = useResumenVentas();
  return (
    <SeccionDelNegocio seccion="ventas" testId="resumen" bajada={TEXTOS.negocio.seccionVentas.largo} cargando={hoy.cargando || consultas.cargando} datos={hoy.datos} alActualizar={() => { hoy.recargar(); consultas.recargar(); }}>
      <KpisDeVentas hoy={hoy} r={r} comp={comp} />
      <div className={css.filaC}>
        <PorHora ventas={hoy.datos?.ventas ?? null} anteriores={ayer?.ventas ?? null} carga={hoy} />
        <ComoPagaron hoy={hoy} r={r} />
      </div>
      <AbajoDeVentas consultas={consultas} deHoy={consultasDeHoy(consultas.datos)} />
    </SeccionDelNegocio>
  );
}

// Las ventas de hoy y de ayer, las consultas, el resumen de hoy y la comparación con ayer a la misma hora.
function useResumenVentas() {
  const hoy = comoCarga(useVentasDelDia(), "No se pudieron traer las ventas de hoy");
  const ayer = useVentasDelDia(diaAnterior(hoyLocal())).datos;
  const consultas = comoCarga(useConsultas(), "No se pudieron traer las consultas");
  const ahora = new Date();
  const comp = hoy.datos && ayer ? compararConElAnterior(hoy.datos.ventas, ayer.ventas, ahora.getHours() * 60 + ahora.getMinutes()) : null;
  return { hoy, ayer, consultas, r: hoy.datos ? resumenDelDia(hoy.datos.ventas) : null, comp };
}
