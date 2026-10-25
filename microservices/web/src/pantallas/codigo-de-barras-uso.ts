import { useCallback, useEffect, useRef, useState } from "react";
import type { Producto } from "../negocio/catalogo";
import { ultimaLectura } from "../negocio/catalogo";
import { puestoLocal } from "../puesto";
import { escucharPuesto } from "../codigos-del-celular";
import { hayCamara } from "../plataforma/camara";
import { copiarTexto } from "../plataforma/portapapeles";
import { TEXTOS } from "./textos";

export type Props = { producto: Producto; celular?: boolean; alGuardar: (codigo: string) => void | Promise<unknown>; quienLoTiene: (codigo: string) => Promise<Producto | undefined>; alCargar?: (abierto: boolean) => void };
const t = TEXTOS.ficha;

// El aviso «copiado» (o que no se pudo), un momento.
function useCopiar(caja: React.RefObject<HTMLElement>) {
  const [copiado, setCopiado] = useState<string | null>(null);
  useEffect(() => { if (!copiado) return; const r = setTimeout(() => setCopiado(null), 2500); return () => clearTimeout(r); }, [copiado]);
  async function copiar(codigo: string) {
    if (await copiarTexto(codigo)) { setCopiado(t.copiado.largo); return; }
    // Si el navegador no deja, el código queda seleccionado para copiarlo a mano.
    const rango = document.createRange();
    if (caja.current) { rango.selectNodeContents(caja.current); window.getSelection()?.removeAllRanges(); window.getSelection()?.addRange(rango); }
    setCopiado(t.noCopiado.largo);
  }
  return { copiado, copiar };
}

// Abrir y cerrar el panel para cargar el código, y avisarlo a la pantalla de atrás.
function usePanel(alCargar?: (abierto: boolean) => void) {
  const [abierto, setAbierto] = useState(false);
  const avisar = useRef(alCargar);
  avisar.current = alCargar;
  useEffect(() => { avisar.current?.(abierto); }, [abierto]);
  return { abierto, setAbierto };
}

// Guardar el código: dice si otro producto ya lo tiene, y queda «Código actualizado» mientras el
// producto lo tenga (si el servidor lo rechaza, vuelve el anterior y el aviso se va; specs/016, E12).
function useGuardarCodigo({ alGuardar, quienLoTiene }: Pick<Props, "alGuardar" | "quienLoTiene">, alGuardado: () => void) {
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recien, setRecien] = useState<string | null>(null);
  const guardar = useCallback(async (crudo: string) => {
    const codigo = crudo.trim();
    if (!codigo) { setError("Escribí el código que figura debajo de las barras."); return; }
    setError(null);
    try {
      const otro = await quienLoTiene(codigo);
      await alGuardar(codigo);
      setRecien(codigo);
      setAviso(otro ? `También lo tiene «${otro.descripcion}»: si son el mismo artículo, unilos en Duplicados.` : null);
      alGuardado();
    } catch (e) { setError(`No se pudo guardar el código: ${(e as Error).message}`); }
  }, [alGuardar, quienLoTiene, alGuardado]);
  return { aviso, setAviso, error, setError, recien, guardar };
}

// En la computadora, con el panel abierto, lo que escanea el celular vinculado es el código de este
// producto. El escáner reinicia la cámara si le cambia la función: se le da siempre la misma.
function useLoQueLlega(guardar: (codigo: string) => Promise<void>, puestoId: string | null) {
  const alLlegar = useRef(guardar);
  useEffect(() => { alLlegar.current = guardar; }, [guardar]);
  useEffect(() => { if (puestoId) return escucharPuesto(puestoId, (codigo) => void alLlegar.current(codigo)); }, [puestoId]);
  return useCallback((codigo: string) => void alLlegar.current(codigo), []);
}

// Lo que dice el botón: escanear (con cámara o con el celular vinculado), cambiar o cargar.
function etiquetaDe(conCamara: boolean, conPuesto: boolean, tieneCodigo: boolean): string {
  if (conCamara) return t.escanear.corto;
  if (conPuesto) return t.escanear.largo;
  return tieneCodigo ? t.cambiar.largo : t.cargar.largo;
}

// Todo lo que el código de barras de la ficha sabe y hace.
export function useCodigoDeBarras({ producto: p, celular = false, alGuardar, quienLoTiene, alCargar }: Props) {
  const { abierto, setAbierto } = usePanel(alCargar);
  const caja = useRef<HTMLElement>(null);
  const { copiado, copiar } = useCopiar(caja);
  const g = useGuardarCodigo({ alGuardar, quienLoTiene }, useCallback(() => setAbierto(false), [setAbierto]));
  const conCamara = celular && hayCamara();
  const puesto = celular ? null : puestoLocal();
  const alDetectar = useLoQueLlega(g.guardar, abierto && puesto ? puesto.id : null);
  const lectura = ultimaLectura(p.codigo_leido_en);
  const recienCargado = g.recien !== null && g.recien === p.codigo_barras;
  const abrir = () => { setAbierto(true); g.setAviso(null); g.setError(null); };
  const etiqueta = etiquetaDe(conCamara, Boolean(puesto), Boolean(p.codigo_barras));
  return { p, celular, abierto, setAbierto, abrir, caja, copiado, copiar, g, conCamara, conPuesto: Boolean(puesto), alDetectar, lectura, recienCargado, etiqueta };
}
export type CodigoDeBarrasEnUso = ReturnType<typeof useCodigoDeBarras>;
