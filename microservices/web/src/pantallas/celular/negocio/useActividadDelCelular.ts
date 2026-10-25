import { useState } from "react";
import { AL_ABRIR_EL_REGISTRO, paginasDe, useActividad, useGrupos, type Evento, type FiltrosDelRegistro } from "../../../negocio/actividad";
import { useUsuarios } from "../../../negocio/usuarios";
import { ventanaDelRegistro } from "../../comun/negocio/registro";

// El estado de «Quién hizo qué» en el celular: los filtros (cambiar uno lleva a la página 1), la
// página, la acción abierta y, arriba, cuántas hubo y cuántas anuladas en el período.
export function useActividadDelCelular() {
  const [filtros, setFiltros] = useState<FiltrosDelRegistro>(AL_ABRIR_EL_REGISTRO);
  const [pagina, setPagina] = useState(1);
  const [abierto, setAbierto] = useState<Evento | null>(null);
  const ventana = ventanaDelRegistro(filtros);
  const { datos, error } = useActividad({ pagina, ...ventana, grupo: filtros.grupo || undefined, tipo: filtros.tipo || undefined });
  const todas = useActividad({ pagina: 1, ...ventana }).datos?.total;
  const anuladas = useActividad({ pagina: 1, ...ventana, tipo: "venta.anulada" }).datos?.total;
  const filtrar = (cambio: Partial<FiltrosDelRegistro>) => { setFiltros((f) => ({ ...f, ...cambio })); setPagina(1); };
  return { filtros, filtrar, pagina, setPagina, paginas: paginasDe(datos), datos, error, todas, anuladas, usuarios: useUsuarios().datos ?? [], grupos: useGrupos(), abierto, setAbierto };
}
export type ActividadDelCelular = ReturnType<typeof useActividadDelCelular>;
