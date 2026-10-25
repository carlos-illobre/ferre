import { useComandos } from "../../../plataforma/comandos";
import { hayUnaVentanaAbierta } from "../base/ui";
import type { DuplicadosDeLaCompu } from "./useDuplicadosDeLaCompu";

// Lo que ofrece Duplicados: decir que son el mismo o distintos, pasar a la siguiente y a la
// anterior, elegir qué lado se conserva, buscar en todo el catálogo, unir a mano y ver los unidos.
// Siempre con lo último (qué se conserva, cuál está elegida); nada con una ventana abierta.
export function useAccionesDeDuplicados(x: DuplicadosDeLaCompu) {
  const libre = (hacer: () => void, conElegida = true) => () => (hayUnaVentanaAbierta() || (conElegida && x.elegida.actual === null) ? false : hacer());
  const resolver = (como: "unir" | "rechazar") => () => { if (!x.quieto) void x.resolver(x.elegida.actual!, como); };
  useComandos({
    "duplicados.mismo": libre(resolver("unir")),
    "duplicados.distintos": libre(resolver("rechazar")),
    "duplicados.siguiente": libre(() => x.elegida.mover(1)),
    "duplicados.anterior": libre(() => x.elegida.mover(-1)),
    "duplicados.conservar-a": libre(() => x.elegida.elegirLado(x.elegida.actual!, "a")),
    "duplicados.conservar-b": libre(() => x.elegida.elegirLado(x.elegida.actual!, "b")),
    "duplicados.buscar": libre(() => { if (!x.quieto) void x.buscar(); }, false),
    "duplicados.unir": libre(() => x.setPanel("unir"), false),
    "duplicados.unidos": libre(() => x.setPanel("unidos"), false),
  });
}
