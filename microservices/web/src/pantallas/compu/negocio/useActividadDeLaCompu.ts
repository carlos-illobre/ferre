import { useEffect, useRef, useState } from "react";
import { useAccionesDelLugar } from "../../../plataforma/comandos";
import { AL_ABRIR_EL_REGISTRO, conFiltros, useActividad, useGrupos, type Evento, type FiltrosDelRegistro } from "../../../negocio/actividad";
import { useUsuarios } from "../../../negocio/usuarios";
import { CATEGORIAS } from "../../comun/negocio/actividad-en-palabras";
import { ventanaDelRegistro } from "../../comun/negocio/registro";
import { textoDeError, useEnLinea } from "./negocio-comun";

// El estado de «Quién hizo qué» en la computadora: los filtros (cambiar uno lleva a la página 1;
// avanzar y retroceder los conserva), la página, la acción elegida (se recorre y se abre desde la tabla) y
// cuántas hubo de cada tipo en el período, con la persona elegida.
export function useActividadDeLaCompu() {
  const [filtros, setFiltros] = useState<FiltrosDelRegistro>(AL_ABRIR_EL_REGISTRO);
  const [pagina, setPagina] = useState(1);
  const [rango, setRango] = useState(false);
  const [marcado, setMarcado] = useState(0);
  const [abierto, setAbierto] = useState<Evento | null>(null);
  const tabla = useRef<HTMLDivElement>(null);
  const { registro, todas, porTipo } = useRegistro(filtros, pagina);
  useEffect(() => { setMarcado(0); }, [pagina]);
  const eventos = registro.datos?.eventos ?? [];
  const elegido = eventos[Math.min(marcado, eventos.length - 1)] ?? null;
  const filtrar = (cambio: Partial<FiltrosDelRegistro>) => { setFiltros((f) => ({ ...f, ...cambio })); setPagina(1); setMarcado(0); };
  const mover = (paso: 1 | -1) => () => {
    const i = Math.min(eventos.length - 1, Math.max(0, marcado + paso));
    setMarcado(i);
    tabla.current?.querySelectorAll<HTMLButtonElement>("[data-testid='evento']")[i]?.focus();
  };
  useAccionesDelLugar(tabla, { "lista.siguiente": mover(1), "lista.anterior": mover(-1), "lista.elegir": () => (elegido ? setAbierto(elegido) : false) });
  return {
    enLinea: useEnLinea(), filtros, setFiltros, filtrar, pagina, setPagina, rango, setRango, registro, datos: registro.datos, cargando: registro.cargando,
    error: registro.error ? textoDeError(registro.error, "No se pudo traer el registro") : null, usuarios: useUsuarios().datos ?? [], grupos: useGrupos(), todas, porTipo,
    eventos, elegido, setMarcado, abierto, setAbierto, tabla, conFiltros: conFiltros(filtros),
    quitarFiltros: () => { setFiltros(AL_ABRIR_EL_REGISTRO); setPagina(1); setRango(false); },
  };
}
export type ActividadDeLaCompu = ReturnType<typeof useActividadDeLaCompu>;

// La página pedida y, para «Qué pasó», el total y el de cada tipo, con la persona elegida.
function useRegistro(filtros: FiltrosDelRegistro, pagina: number) {
  const { usuario, desde, hasta } = ventanaDelRegistro(filtros);
  const registro = useActividad({ pagina, usuario, grupo: filtros.grupo || undefined, tipo: filtros.tipo || undefined, desde, hasta });
  const todas = useActividad({ pagina: 1, usuario, desde, hasta }).datos?.total ?? null;
  const porTipo = CATEGORIAS.map((c) => useActividad({ pagina: 1, usuario, tipo: c.tipo, desde, hasta }).datos?.total ?? null); // eslint-disable-line react-hooks/rules-of-hooks
  return { registro, todas, porTipo };
}
