import { useCallback, useEffect, useRef, useState } from "react";
import { decidir, elQueSigue, porPersona, useParaRevisar, type CambioApartado } from "../../../negocio/apartados";
import { useEnLinea } from "../../../plataforma/sin-conexion";
import { useTeclasGlobales } from "../../../plataforma/teclado";

type Decision = "aceptar" | "descartar";

// Las teclas de la bandeja, sin modificadores y con ninguna ventana abierta.
function teclaDeLaBandeja(e: KeyboardEvent): string | null {
  if (e.ctrlKey || e.metaKey || e.altKey || document.querySelector("dialog[open]")) return null;
  const k = e.key.toLowerCase();
  return ["arrowdown", "arrowup", "a", "d"].includes(k) ? k : null;
}

// La bandeja de la computadora: el elegido (el primero si no se eligió), decidirlo de a uno (con
// su error al lado) y las teclas: ↑ ↓ eligen, A acepta y D descarta (014-E09).
export function useParaRevisarDeLaCompu() {
  const { datos, error, recargar } = useParaRevisar();
  const conRed = useEnLinea();
  const [elegidoId, setElegidoId] = useState<string | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enCurso, setEnCurso] = useState(false);
  const lista = useRef<HTMLDivElement>(null);
  const grupos = datos ? porPersona(datos.apartados) : [];
  const orden = grupos.flatMap((g) => g.cambios);
  const elegido = orden.find((c) => c.id === elegidoId) ?? orden[0] ?? null;
  useEffect(() => { lista.current?.querySelector("[data-elegido='si']")?.scrollIntoView?.({ block: "nearest" }); }, [elegido?.id]);

  const hacer = useCallback(async (c: CambioApartado, decision: Decision) => {
    if (!conRed || enCurso) return;
    setEnCurso(true); setErrores((e) => ({ ...e, [c.id]: "" }));
    try { await decidir(c.id, decision); setElegidoId(elQueSigue(orden, c)); }
    catch (e) { setErrores((x) => ({ ...x, [c.id]: (e as Error).message })); }
    finally { setEnCurso(false); }
  }, [conRed, enCurso, orden]);

  const teclas = useCallback((e: KeyboardEvent) => {
    const k = teclaDeLaBandeja(e);
    if (!k || !elegido) return;
    e.preventDefault();
    if (k === "a" || k === "d") { void hacer(elegido, k === "a" ? "aceptar" : "descartar"); return; }
    const i = orden.indexOf(elegido) + (k === "arrowdown" ? 1 : -1);
    setElegidoId(orden[Math.max(0, Math.min(orden.length - 1, i))]!.id);
  }, [elegido, orden, hacer]);
  useTeclasGlobales(teclas);

  return { datos, error, recargar, conRed, grupos, orden, elegido, elegir: setElegidoId, errores, enCurso, hacer, lista };
}
export type ParaRevisarDeLaCompu = ReturnType<typeof useParaRevisarDeLaCompu>;
