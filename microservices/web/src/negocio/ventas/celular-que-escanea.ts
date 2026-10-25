import { useCallback, useEffect, useRef, useState } from "react";
import { EVENTO_EMPAREJAMIENTO, puestoLocal, puestoRemoto } from "../../puesto";
import { escucharPuesto, pedirLector } from "../../codigos-del-celular";

// Los códigos que lee el celular vinculado a este puesto entran a la venta. El emparejamiento
// puede llegar después de abrir la pantalla (se pone al día con el servidor) o soltarse.
export function useCelularQueEscanea(alCodigo: (codigo: string) => unknown) {
  const [vinculado, setVinculado] = useState(false);
  // El oyente se crea una vez y tiene que ver siempre la versión nueva.
  const manejar = useRef(alCodigo);
  useEffect(() => { manejar.current = alCodigo; }, [alCodigo]);
  const parar = useRef<(() => void) | null>(null);
  const soltar = useCallback(() => { parar.current?.(); parar.current = null; }, []);
  const alVincular = useCallback((puestoId: string) => {
    setVinculado(true);
    soltar();
    parar.current = escucharPuesto(puestoId, (codigo) => manejar.current(codigo), (conectado) => { if (!conectado) setVinculado(Boolean(puestoLocal())); });
  }, [soltar]);
  useEffect(() => {
    const mirar = () => { const p = puestoLocal(); if (p) alVincular(p.id); else { soltar(); setVinculado(false); } };
    mirar();
    window.addEventListener(EVENTO_EMPAREJAMIENTO, mirar);
    return () => { window.removeEventListener(EVENTO_EMPAREJAMIENTO, mirar); soltar(); };
  }, [alVincular, soltar]);
  return { vinculado, alVincular };
}

// El celular emparejado con una computadora (decisión 58): Vender es su propia venta; para leerle
// códigos a la computadora está el lector, que es un modo aparte (decisión 59).
export function useEmparejadoConLaCompu(): boolean {
  const [emparejado, setEmparejado] = useState(() => Boolean(puestoRemoto()));
  useEffect(() => {
    const mirar = () => setEmparejado(Boolean(puestoRemoto()));
    window.addEventListener(EVENTO_EMPAREJAMIENTO, mirar);
    return () => window.removeEventListener(EVENTO_EMPAREJAMIENTO, mirar);
  }, []);
  return emparejado;
}

// Lo que lee el celular emparejado a este puesto, mientras `activo`: para buscar escaneando.
export function useLoQueLeeElCelular(alCodigo: (codigo: string) => void, activo: boolean) {
  const manejar = useRef(alCodigo);
  useEffect(() => { manejar.current = alCodigo; }, [alCodigo]);
  const [emparejado, setEmparejado] = useState(() => puestoLocal()?.id ?? null);
  useEffect(() => { const mirar = () => setEmparejado(puestoLocal()?.id ?? null); window.addEventListener(EVENTO_EMPAREJAMIENTO, mirar); return () => window.removeEventListener(EVENTO_EMPAREJAMIENTO, mirar); }, []);
  useEffect(() => {
    if (!emparejado || !activo) return;
    return escucharPuesto(emparejado, (codigo) => manejar.current(codigo));
  }, [activo, emparejado]);
  return emparejado;
}

// Pedirle al celular vinculado que abra el lector: si el aviso llegó o no, por 20 segundos.
export function usePedirLector() {
  const [lectorPedido, setLectorPedido] = useState<boolean | null>(null);
  useEffect(() => { if (lectorPedido === null) return; const x = setTimeout(() => setLectorPedido(null), 20000); return () => clearTimeout(x); }, [lectorPedido]);
  return { lectorPedido, pedirLector: () => void pedirLector().then(setLectorPedido) };
}
