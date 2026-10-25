import { useState } from "react";
import {
  aEntradaDeCambio, diferenciaDelCambio, fueSinConexion, valorQueVuelve, paraVolver, paraVolverDeLaBusqueda, resolucionDelCambio, useRegistrarCambio,
  type CobroDeDiferencia, type Medio, type ParaVolver, type SeLleva, type VentaDelDia, type VentaParaCambio, type Vuelve,
} from "../../../negocio/ventas";
import { pesosCortos } from "../../../negocio/formato";
import { TEXTOS } from "../../textos";
import { signo } from "../../comun/ventas/textos-del-dia";

// El cambio (o la devolución, si no se lleva nada): la venta de la que vuelve, lo que vuelve (cuánto
// y si está fallado), lo que se lleva, la diferencia y cómo se resuelve.
const t = TEXTOS.hoy;
type Original = { id: string; fecha: string; medio: Medio; renglones: ParaVolver[] };
const deLaVenta = (v: VentaDelDia): Original => ({ id: v.id, fecha: v.fecha, medio: v.medio_pago as Medio, renglones: paraVolver(v) });
export const valorDe = (l: SeLleva) => diferenciaDelCambio([], [l]);
export const valorQueVuelveDe = (k: { vuelve: Vuelve[] }) => valorQueVuelve(k.vuelve);

function conVuelve(vs: Vuelve[], r: ParaVolver, cambio: Partial<Vuelve> | null): Vuelve[] {
  if (cambio === null) return vs.filter((x) => x.renglon.id !== r.id);
  if (vs.some((x) => x.renglon.id === r.id)) return vs.map((x) => (x.renglon.id === r.id ? { ...x, ...cambio } : x));
  return [...vs, { renglon: r, cantidad: r.porDevolver >= 1 ? 1 : r.porDevolver, fallado: false, ...cambio }];
}

export function useCambio(venta: VentaDelDia | null) {
  const [original, setOriginal] = useState<Original | null>(venta ? deLaVenta(venta) : null);
  const [vuelve, setVuelve] = useState<Vuelve[]>([]);
  const [lleva, setLleva] = useState<SeLleva[]>([]);
  const [medioDif, setMedioDif] = useState<CobroDeDiferencia>("efectivo");
  const diferencia = diferenciaDelCambio(vuelve, lleva);
  return {
    original, vuelve, lleva, setLleva, medioDif, setMedioDif, diferencia,
    resuelto: original ? resolucionDelCambio(original.medio, diferencia) : "sin_diferencia",
    elegir: (v: VentaParaCambio) => { setOriginal({ id: v.id, fecha: v.fecha, medio: v.medio_pago, renglones: paraVolverDeLaBusqueda(v) }); setVuelve([]); },
    otraVenta: () => setOriginal(null),
    marca: (r: ParaVolver) => vuelve.find((x) => x.renglon.id === r.id),
    cambiarVuelve: (r: ParaVolver, cambio: Partial<Vuelve> | null) => setVuelve((vs) => conVuelve(vs, r, cambio)),
  };
}
export type Cambio = ReturnType<typeof useCambio>;

// Qué se hizo, con cuánto se cobró, devolvió o pasó a la cuenta.
function comoQuedo(k: Cambio): string {
  const que = k.lleva.length ? t.cambioRegistrado.corto : t.devolucionRegistrada.corto;
  if (!k.diferencia) return que;
  const como = k.diferencia > 0 ? `${signo(k.diferencia)} cobrados` : k.resuelto === "cuenta_corriente" ? `${signo(k.diferencia)} en la cuenta` : `${pesosCortos(-k.diferencia)} devueltos`;
  return `${que} · ${como}`;
}

export function useRegistrarElCambio(k: Cambio, alListo: (mensaje: string) => void) {
  const { registrar, registrando } = useRegistrarCambio();
  const [error, setError] = useState<string | null>(null);
  async function confirmar() {
    if (!k.original || k.vuelve.length === 0) return;
    setError(null);
    try {
      await registrar(k.original.id, aEntradaDeCambio(k.vuelve, k.lleva, k.medioDif, k.original.medio));
      alListo(comoQuedo(k));
    } catch (e) { setError(fueSinConexion(e) ? t.sinConexionCambio.corto : `${(e as Error).message}.`); }
  }
  return { confirmar, registrando, error };
}

// El botón dice qué pasa: cobrar o devolver la diferencia, o registrar el cambio o la devolución.
export function textoDelBoton(k: Cambio): string {
  if (!k.vuelve.length) return "Marcá lo que vuelve";
  if (k.diferencia > 0 && k.resuelto === "cobrado") return `Cobrar ${pesosCortos(k.diferencia)}`;
  if (k.diferencia < 0 && k.resuelto === "devuelto") return `Devolver ${pesosCortos(-k.diferencia)}`;
  return k.lleva.length ? t.registrarElCambio.corto : "Registrar la devolución";
}
