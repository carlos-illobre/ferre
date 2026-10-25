import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { busquedaAlDia, esperarBusqueda } from "../../../negocio/catalogo";
import { detalleDelRegistro, useIngreso } from "../../../negocio/deposito";
import { irA } from "../../../rutas";
import { usePedidoAIngresar } from "../../../negocio/deposito";

// El estado del Ingreso en el celular. Si se viene de un pedido (RF-55), arranca con su proveedor y
// con lo que falta llegar. Lo que falta para registrar se dice al intentarlo y se va al corregir lo cargado.
export type Exito = { total: number; proveedor: string; detalle: string };
const AVISOS = { proveedor: "Elegí el proveedor.", productos: "La compra no tiene productos.", renglones: "Hay renglones sin costo o sin descripción." } as const;

export function useIngresoDelCelular() {
  const { pedido, error: errorPedido } = usePedidoAIngresar();
  const ingreso = useIngreso({ lado: "celular", costoATexto: String, pedido, textoSinConexion: "Sin conexión con el servidor. Registrar una compra necesita internet." });
  const [elegido, setElegido] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);
  const [hoja, setHoja] = useState<"proveedores" | null>(null);
  const [escaneando, setEscaneando] = useState(false);
  const [exito, setExito] = useState<Exito | null>(null);
  const caja = useRef<HTMLInputElement>(null);
  const { consulta, resultados, renglones, proveedorId, agregar } = ingreso;
  useEffect(() => { setElegido(0); }, [consulta]);
  useEffect(() => { setAviso(null); }, [proveedorId, renglones]);
  const alDetectar = useCallback((codigo: string) => {
    ingreso.agregarPorCodigo(codigo).then((agregado) => { if (agregado) setEscaneando(false); else setAviso(`El código ${codigo} no está en el catálogo: buscalo por nombre.`); }).catch((e: Error) => setAviso(e.message));
  }, [ingreso.agregarPorCodigo]); // eslint-disable-line react-hooks/exhaustive-deps
  function enter() {
    const texto = consulta.trim();
    const proveedor = ingreso.proveedor?.id;
    if (!busquedaAlDia(texto, proveedor)) { void esperarBusqueda(texto, 16, proveedor).then((r) => (r[0] ? agregar(r[0]) : agregar(null, texto))); return; }
    if (resultados[elegido]) agregar(resultados[elegido]); else if (texto) agregar(null, texto);
  }
  function teclas(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setElegido((i) => (e.key === "ArrowDown" ? Math.min(i + 1, resultados.length - 1) : Math.max(i - 1, 0))); }
    else if (e.key === "Enter") { e.preventDefault(); enter(); }
    else if (e.key === "Escape") ingreso.setConsulta("");
  }
  async function confirmar() {
    if (ingreso.ocupado) return;
    if (ingreso.falta) { setAviso(AVISOS[ingreso.falta]); if (ingreso.falta === "proveedor") setHoja("proveedores"); return; }
    const registro = await ingreso.registrar();
    if (!registro) return;
    setExito({ total: registro.total, proveedor: registro.proveedor, detalle: detalleDelRegistro(registro) });
    if (registro.dePedido) irA("deposito/ingreso");
  }
  const setError = (texto: string | null) => { setAviso(texto); if (texto === null) ingreso.setError(null); };
  return { pedido, errorPedido, ingreso, elegido, error: aviso ?? ingreso.error, setError, hoja, setHoja, escaneando, setEscaneando, exito, setExito, caja, alDetectar, teclas, confirmar };
}
export type IngresoDelCelular = ReturnType<typeof useIngresoDelCelular>;
