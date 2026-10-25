import { useCallback, useEffect, useRef, useState } from "react";
import { decidir, elQueSigue, porPersona, useParaRevisar, type CambioApartado } from "../../../negocio/apartados";
import { useEnLinea } from "../../../plataforma/sin-conexion";
import { useComandos } from "../../../plataforma/comandos";
import { hayUnaVentanaAbierta } from "../base/ui";

type Decision = "aceptar" | "descartar";


// La bandeja de la computadora: el elegido (el primero si no se eligió), decidirlo de a uno (con
// su error al lado) y lo que ofrece: elegir el de al lado, aceptar y descartar (014-E09), con
// ninguna ventana abierta.
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

  const conElegido = (hacerlo: (c: CambioApartado) => void) => () => (!elegido || hayUnaVentanaAbierta() ? false : hacerlo(elegido));
  const mover = (paso: number) => conElegido((c) => setElegidoId(orden[Math.max(0, Math.min(orden.length - 1, orden.indexOf(c) + paso))]!.id));
  useComandos({
    "revisar.siguiente": mover(1),
    "revisar.anterior": mover(-1),
    "revisar.aceptar": conElegido((c) => void hacer(c, "aceptar")),
    "revisar.descartar": conElegido((c) => void hacer(c, "descartar")),
  });

  return { datos, error, recargar, conRed, grupos, orden, elegido, elegir: setElegidoId, errores, enCurso, hacer, lista };
}
export type ParaRevisarDeLaCompu = ReturnType<typeof useParaRevisarDeLaCompu>;
