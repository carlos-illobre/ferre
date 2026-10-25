import { useEffect, useRef, useState } from "react";
import { ErrorApi } from "../../datos/conexion";
import { altaDeProveedor, faltaEnProveedor, type DatosDeProveedor } from "../proveedores";
import { aplicarLista, cargarLista, descartarLista, type Avance, type Cargada } from "./listas";

// Cargar una lista de precios (RF-01), igual en el celular y en la computadora: leer el archivo
// (si no se sabe de qué proveedor o de qué fecha es, se pregunta y el archivo queda elegido),
// revisar y aplicar o descartar, y agregar un proveedor.
export const SIN_CONEXION_PARA_LISTAS = "Sin conexión con el servidor. Cargar una lista necesita internet.";
export const mensajeDeLista = (e: unknown) => (e instanceof ErrorApi ? e.message : SIN_CONEXION_PARA_LISTAS);

export type EstadoDeCarga = "esperando" | "leyendo" | "falta-proveedor" | "falta-fecha";

export function useCargaDeLista(alCargar: (c: Cargada) => void) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [estado, setEstado] = useState<EstadoDeCarga>("esperando");
  const [error, setError] = useState<{ archivo: string; motivo: string } | null>(null);
  const cancelar = () => { setArchivo(null); setEstado("esperando"); };
  async function enviar(f: File, extra: Record<string, string> = {}) {
    setEstado("leyendo");
    setError(null);
    try {
      const r = await cargarLista(f, extra);
      if ("falta" in r) { setEstado(r.falta === "proveedor" ? "falta-proveedor" : "falta-fecha"); return; }
      cancelar();
      alCargar(r.cargada);
    } catch (e) {
      cancelar(); setError({ archivo: f.name, motivo: mensajeDeLista(e) });
    }
  }
  const elegir = (f: File) => { setArchivo(f); void enviar(f); };
  return { archivo, estado, error, setError, enviar, elegir, cancelar };
}

// Aplicar corre en el servidor en segundo plano: acá se consulta el avance hasta que termina.
export function useRevisionDeLista(cargada: Cargada) {
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [progreso, setProgreso] = useState<Avance | null>(null);
  const vivo = useRef(true);
  useEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);
  async function aplicar(interrumpida: string) {
    if (ocupado) return null;
    setOcupado(true); setError(null);
    try {
      const fin = await aplicarLista(cargada, setProgreso, () => vivo.current);
      if ("aplicada" in fin) return fin.aplicada;
      if ("interrumpida" in fin) setError(fin.interrumpida ?? interrumpida);
    } catch (e) {
      setError(mensajeDeLista(e));
    } finally {
      if (vivo.current) { setOcupado(false); setProgreso(null); }
    }
    return null;
  }
  async function descartar(): Promise<boolean> {
    if (ocupado) return false;
    setOcupado(true); setError(null);
    try { await descartarLista(cargada.id); return true; }
    catch (e) { setError(mensajeDeLista(e)); setOcupado(false); return false; }
  }
  return { error, ocupado, progreso, aplicar, descartar };
}

// Los datos del proveedor tal como vienen del formulario.
export function datosDelProveedor(form: HTMLFormElement): DatosDeProveedor {
  const d = new FormData(form);
  return { nombre: String(d.get("nombre") ?? ""), lector: String(d.get("lector") ?? "") || null, preciosIncluyenIva: d.get("iva") === "on", descuentoGeneral: String(d.get("general") ?? ""), descuentoContado: String(d.get("contado") ?? "") };
}

export type ErrorDeAlta = { campo: "nombre" | "general" | "contado" | null; texto: string };
const errorDeAlta = (err: unknown): ErrorDeAlta => {
  const repetido = err instanceof ErrorApi && err.estado === 409;
  return { campo: repetido ? "nombre" : null, texto: repetido ? "Ya hay un proveedor con ese nombre. Escribí otro." : err instanceof ErrorApi ? err.message : "Sin conexión con el servidor. Agregar un proveedor necesita internet." };
};

export function useAltaDeProveedor(alAgregar: (nombre: string) => Promise<void>) {
  const [error, setError] = useState<ErrorDeAlta | null>(null);
  const [guardando, setGuardando] = useState(false);
  async function alta(form: HTMLFormElement) {
    const datos = datosDelProveedor(form);
    const falta = faltaEnProveedor(datos);
    if (falta) { setError(falta); return; }
    setGuardando(true);
    try { await altaDeProveedor(datos); setError(null); await alAgregar(datos.nombre.trim()); }
    catch (err) { setError(errorDeAlta(err)); setGuardando(false); }
  }
  return { error, setError, guardando, alta };
}
