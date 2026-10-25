import { useEffect, useRef, useState } from "react";
import { buscarVentas, empezarCorreccion, pasaElFiltro, useResumenDelDia, type Correccion, type FiltroDeVentas, type VentaDelDia } from "../../../negocio/ventas";
import { pedirClientes } from "../../../negocio/catalogo";
import { useSeVaSolo } from "../../../plataforma/tiempo";
import { usePuedeAnular } from "../../../negocio/usuarios";

// El estado de «Ventas del día» en la computadora: el día, el filtro y lo buscado, la venta elegida
// (si no, la primera no anulada), la que se corrige, la que se anula y las ventanas abiertas.
export function useListaDelDia() {
  const [dia, setDia] = useState<string | null>(null);
  const r = useResumenDelDia(dia);
  const lista = useFiltroYBusqueda(r.ventas ?? []);
  const [correccion, setCorreccion] = useState<{ ventaId: string; c: Correccion } | null>(null);
  const e = useElegida(lista.visibles, (v) => { if (correccion && correccion.ventaId !== v.id) setCorreccion(null); });
  const anula = usePuedeAnular().delDia(r.esHoy);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [porAnular, setPorAnular] = useState<VentaDelDia | null>(null);
  const [hojaAbierta, setHojaAbierta] = useState(false);
  const [otroDia, setOtroDia] = useState(false);
  useEffect(() => { setCorreccion(null); e.setElegidaId(null); }, [r.dia]); // eslint-disable-line react-hooks/exhaustive-deps
  useSeVaSolo(mensaje, () => setMensaje(null), 6000);
  const { elegida } = e;
  const sePuede = Boolean(elegida && anula && elegida.estado === "confirmada");
  const empezar = () => { if (sePuede) { pedirClientes(); setCorreccion({ ventaId: elegida!.id, c: empezarCorreccion(elegida!) }); } };
  return {
    r, ...lista, ...e, anula, sePuede, empezar, setDia, guardarRef: useRef<() => void>(() => undefined),
    corrigiendo: correccion && elegida && correccion.ventaId === elegida.id ? correccion.c : null,
    descartar: () => setCorreccion(null), cambiar: (c: Correccion) => elegida && setCorreccion({ ventaId: elegida.id, c }),
    porAnular, setPorAnular, mensaje, setMensaje, hojaAbierta, setHojaAbierta, otroDia, setOtroDia,
  };
}
export type ListaDelDia = ReturnType<typeof useListaDelDia>;


function useFiltroYBusqueda(todas: VentaDelDia[]) {
  const [filtro, setFiltro] = useState<FiltroDeVentas>("todas");
  const [texto, setTexto] = useState("");
  const halladas = buscarVentas(todas, texto, null);
  return { todas, filtro, setFiltro, texto, setTexto, halladas, visibles: halladas.filter((v) => pasaElFiltro(v, filtro)) };
}

// La venta elegida (si no, la primera no anulada); ↑ ↓ eligen la de al lado.
function useElegida(visibles: VentaDelDia[], alElegir: (v: VentaDelDia) => void) {
  const [elegidaId, setElegidaId] = useState<string | null>(null);
  const elegida = visibles.find((v) => v.id === elegidaId) ?? visibles.find((v) => v.estado !== "anulada") ?? visibles[0] ?? null;
  const elegir = (v: VentaDelDia) => { alElegir(v); setElegidaId(v.id); };
  const mover = (paso: number) => {
    if (!visibles.length) return;
    const i = elegida ? visibles.indexOf(elegida) : -1;
    elegir(visibles[Math.max(0, Math.min(visibles.length - 1, i + paso))]!);
  };
  return { elegida, elegir, mover, setElegidaId };
}
