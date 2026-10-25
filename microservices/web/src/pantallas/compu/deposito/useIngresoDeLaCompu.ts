import { useCallback, useEffect, useId, useRef, useState } from "react";
import { detalleDelRegistro, useIngreso, type Renglon } from "../../../negocio/deposito";
import { useEnLinea } from "../../../plataforma/sin-conexion";
import { usePedidoAIngresar } from "../../../negocio/deposito";
import { irA } from "../base/rutas";
import type { Producto } from "./deposito-comun";

// El estado del Ingreso en la computadora. Si se viene de un pedido (RF-55), arranca con su
// proveedor y con lo que falta llegar. Lo cargado queda guardado en este dispositivo hasta registrarlo.
const CLAVE_BORRADOR = "ferre.v2.ingreso";
const costoATexto = (costo: number) => String(costo).replace(".", ",");
const SIN_CONEXION = "No se registró: se cortó la conexión y registrar un ingreso necesita internet. Lo cargado sigue acá; probá de nuevo cuando vuelva.";
export type Exito = { total: number; proveedor: string; detalle: string };

export function useIngresoDeLaCompu() {
  const enLinea = useEnLinea();
  const { pedido, error: errorPedido } = usePedidoAIngresar();
  const ingreso = useIngreso({ lado: "computadora", costoATexto, pedido, borrador: CLAVE_BORRADOR, textoSinConexion: SIN_CONEXION });
  const [intento, setIntento] = useState(false);
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null);
  const [descartado, setDescartado] = useState<Renglon[] | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [exito, setExito] = useState<Exito | null>(null);
  const caja = useRef<HTMLInputElement>(null);
  const selector = useRef<HTMLSelectElement>(null);
  const zona = useRef<HTMLDivElement>(null);
  const focoPedido = useAlFocoDeLaCantidad(zona, ingreso.renglones);
  const agregar = useCallback((p: Producto | null, libre?: string) => {
    const { clave, cantidad } = ingreso.agregar(p, libre);
    setErrorCodigo(null); setDescartado(null);
    focoPedido.current = clave;
    return cantidad;
  }, [ingreso.agregar]); // eslint-disable-line react-hooks/exhaustive-deps
  async function registrar() {
    if (ingreso.ocupado || !enLinea) return;
    setIntento(true);
    if (ingreso.falta) { irAloQueFalta(ingreso.falta, selector, zona); return; }
    const registro = await ingreso.registrar();
    if (!registro) return;
    setExito({ total: registro.total, proveedor: registro.proveedor, detalle: detalleDelRegistro(registro) });
    setIntento(false); setDescartado(null);
    if (registro.dePedido) irA("ingreso");
  }
  return {
    enLinea, pedido, errorPedido, ingreso, intento, errorCodigo, setErrorCodigo, descartado, setDescartado, mensaje, setMensaje, exito, setExito, caja, selector, zona, agregar, registrar,
    quitar: (clave: string) => { ingreso.quitar(clave); caja.current?.focus(); },
    descartar: () => { setDescartado(ingreso.descartar()); setIntento(false); caja.current?.focus(); },
    problema: queFalta(intento, ingreso.proveedorId, ingreso.incompletos), id: useId(),
  };
}
export type IngresoDeLaCompu = ReturnType<typeof useIngresoDeLaCompu>;

// Después de agregar, el foco pasa solo a la cantidad del renglón nuevo.
function useAlFocoDeLaCantidad(zona: React.RefObject<HTMLDivElement>, renglones: Renglon[]) {
  const pedido = useRef<string | null>(null);
  useEffect(() => {
    const clave = pedido.current;
    if (!clave) return;
    pedido.current = null;
    zona.current?.querySelector<HTMLElement>(`[data-clave="${clave}"]`)?.querySelector<HTMLInputElement>("[data-testid='cantidad']")?.focus();
  }, [renglones, zona]);
  return pedido;
}

// Al intentar registrar con algo pendiente, el foco va a eso.
function irAloQueFalta(falta: string, selector: React.RefObject<HTMLSelectElement>, zona: React.RefObject<HTMLDivElement>) {
  if (falta === "proveedor") selector.current?.focus();
  else if (falta === "renglones") zona.current?.querySelector<HTMLElement>("[aria-invalid='true'], .falta input")?.focus();
}

// Lo que falta para poder registrar. Se calcula de lo cargado: al corregirlo, desaparece.
function queFalta(intento: boolean, proveedorId: string, incompletos: number): string | null {
  if (!intento) return null;
  if (!proveedorId) return "Falta elegir el proveedor.";
  return incompletos ? `${incompletos === 1 ? "Hay un renglón sin" : `Hay ${incompletos} renglones sin`} costo o sin descripción: están marcados, completalos para registrar.` : null;
}
