import { useCallback, useEffect, useState } from "react";
import { ErrorApi } from "../../datos/conexion";
import { borrarAnterioresA, enviarPendientes } from "../../datos/almacenamiento";
import { pedirClientes, useCatalogo, type Producto } from "../catalogo";
import { anotarNoLlevo, haySinPrecio, porQueNoSeCobra, registrarVenta, totalDe, type Cobro, type MotivoDeNoCobrar } from "./cobrar";
import type { Medio } from "./medios";
import { useAgregar } from "./venta-agregar";
import { useRenglones } from "./venta-renglones";
import { agregarALaVenta, ponerCliente, ponerItems, ponerMedio, useVentaEnCurso, vaciarVenta, type Item } from "./venta-en-curso";
export type { Item };
export * from "./medios";
export * from "./precio-del-renglon";
export type { Cobro, MotivoDeNoCobrar } from "./cobrar";

// La venta, una sola vez para el celular y la computadora (RNF-60). Acá están los renglones,
// el precio de cada uno, cómo se paga, cobrar y «no llevó». Las pantallas solo muestran y
// reciben lo que la persona toca: qué tecla, qué hoja y qué texto son cosa de cada interfaz.
export type MotivoDeCambio = "agregar" | "quitar" | "no-llevo";
export type OpcionesDeVenta = {
  // Desde dónde se vende: se le cuenta al otro dispositivo cuando están en espejo.
  lado: "computadora" | "celular";
  dispositivo: () => string;
  // Quién puede fijar márgenes deja el margen elegido guardado en el producto; si no, vale para esta venta.
  fijaMargen: boolean;
  textoDe: (motivo: MotivoDeNoCobrar) => string;
  // El servidor rechazó la venta: cómo se dice en esta interfaz.
  textoDeRechazo: (mensaje: string) => string;
  // La venta cambió por algo que la persona hizo (agregó, quitó, no llevó): la pantalla acomoda el foco.
  alCambiar?: (motivo: MotivoDeCambio) => void;
  alFaltarCliente?: () => void;
  alCobrar?: (cobro: Cobro) => void;
};

// Al abrir Vender: los clientes (no en cada pantalla, specs/018), reintentar lo pendiente al volver
// la conexión y borrar las ventas de más de 7 días del dispositivo (ADR-002).
function useAlAbrirVender() {
  useEffect(() => { pedirClientes(); }, []);
  useEffect(() => {
    const reintentar = () => { enviarPendientes().catch(() => undefined); };
    window.addEventListener("online", reintentar);
    borrarAnterioresA("ventas", "fecha", new Date(Date.now() - 7 * 86400000).toISOString()).catch(() => undefined);
    return () => window.removeEventListener("online", reintentar);
  }, []);
}

export function useVenta(opciones: OpcionesDeVenta) {
  const { clientes } = useCatalogo();
  useAlAbrirVender();
  // La venta en curso no es de esta pantalla (ADR-022): la comparte la aplicación entera.
  const { items, medio, clienteId } = useVentaEnCurso();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Un aviso («elegí el cliente», «elegí cómo paga») se va solo apenas se corrige su causa.
  useEffect(() => { setError(null); }, [items, medio, clienteId]);
  const { alCambiar } = opciones;
  const agregar = useCallback((p: Producto | null, descripcionLibre?: string) => { agregarALaVenta(p, descripcionLibre); setMensaje(null); alCambiar?.("agregar"); }, [alCambiar]);
  const cliente = clientes.find((c) => c.id === clienteId);
  const elegirMedio = (valor: Medio) => { ponerMedio(valor); if (valor === "cuenta_corriente" && !clienteId) opciones.alFaltarCliente?.(); };
  const cobro = useCobrar({ items, medio, clienteId, cliente: cliente?.nombre ?? null, opciones, setError });
  const noLlevo = (aviso: string) => { if (!items.length) return; anotarNoLlevo(items, opciones.dispositivo()); vaciarVenta(); setMensaje(aviso); alCambiar?.("no-llevo"); };
  return {
    items, medio, setMedio: ponerMedio, clienteId, setClienteId: ponerCliente, cliente, total: totalDe(items), sinPrecio: haySinPrecio(items),
    mensaje, setMensaje, error, setError, ...useAgregar(agregar, setError), ...useRenglones(opciones.fijaMargen, alCambiar), ...cobro,
    agregar, elegirMedio, elegirCliente: (id: string) => ponerCliente(id), noLlevo, vaciar: vaciarVenta,
    // Volver a poner los renglones que se vaciaron o quitaron (Deshacer).
    devolver: (renglones: Item[]) => ponerItems(renglones),
  };
}

type ParaCobrar = { items: Item[]; medio: Medio | null; clienteId: string; cliente: string | null; opciones: OpcionesDeVenta; setError: (e: string | null) => void };

function useCobrar({ items, medio, clienteId, cliente, opciones, setError }: ParaCobrar) {
  const { ajustarStockLocal } = useCatalogo();
  const [ocupado, setOcupado] = useState(false);
  const [cobro, setCobro] = useState<Cobro | null>(null);
  // Si falta algo, lo dice (y si falta el cliente, lo pide); devuelve si se puede cobrar.
  function sePuede(): boolean {
    const motivo = porQueNoSeCobra(items, medio, clienteId);
    if (!motivo) return true;
    setError(opciones.textoDe(motivo));
    if (motivo === "sin-cliente") opciones.alFaltarCliente?.();
    return false;
  }
  async function cobrar() {
    if (items.length === 0 || ocupado || !sePuede()) return;
    setOcupado(true);
    setError(null);
    try {
      const hecho = await registrarVenta({ items, medio: medio!, clienteId, cliente, dispositivo: opciones.dispositivo(), lado: opciones.lado, ajustarStock: ajustarStockLocal });
      setCobro(hecho);
      opciones.alCobrar?.(hecho);
    } catch (e) {
      setOcupado(false);
      if (e instanceof ErrorApi) { setError(opciones.textoDeRechazo(e.message)); return; }
      throw e;
    }
    vaciarVenta(); setOcupado(false);
  }
  return { ocupado, cobro, cerrarCobro: () => setCobro(null), cobrar };
}
