import { useEffect, useRef, useState, type RefObject } from "react";

// El botón «Continuar con Google» lo dibuja Google en el lugar que se le da (decisión 69: el
// original, sin nada encima). Se espera a que llegue su script; si no llega en 8 segundos, se
// avisa y se sigue esperando. Google pide el ancho en píxeles, entre 200 y 400: el del lugar.
export type EstadoDelBotonDeGoogle = "esperando" | "listo" | "sin-google";
type Opciones = {
  lugar: RefObject<HTMLDivElement>; clienteId: string | null; tema: "outline" | "filled_blue" | "filled_black";
  alRecibir: (credencial: string) => Promise<boolean>; alDibujar?: (ancho: number) => void;
};

const anchoDe = (l: HTMLDivElement) => Math.round(Math.min(400, Math.max(200, l.clientWidth || 320)));

export function useBotonDeGoogle({ lugar, clienteId, tema, alRecibir, alDibujar }: Opciones): EstadoDelBotonDeGoogle {
  const [estado, setEstado] = useState<EstadoDelBotonDeGoogle>("esperando");
  const recibir = useRef(alRecibir);
  recibir.current = alRecibir;
  const dibujado = useRef(alDibujar);
  dibujado.current = alDibujar;
  useEffect(() => {
    if (!clienteId || !lugar.current) return;
    const desde = Date.now();
    const intervalo = setInterval(() => {
      const google = window.google;
      if (!google || !lugar.current) { if (Date.now() - desde > 8000) setEstado("sin-google"); return; }
      clearInterval(intervalo);
      const dibujar = () => {
        if (!lugar.current) return;
        const ancho = anchoDe(lugar.current);
        lugar.current.replaceChildren();
        google.accounts.id.renderButton(lugar.current, { theme: tema, size: "large", shape: "pill", text: "continue_with", locale: "es", width: ancho });
        dibujado.current?.(ancho);
      };
      // Si no se pudo entrar, el botón queda con el foco y se ve más claro: se lo suelta y se lo
      // vuelve a dibujar, con su color de siempre.
      const soltar = () => {
        if (document.activeElement instanceof HTMLElement && lugar.current?.contains(document.activeElement)) document.activeElement.blur();
        dibujar();
      };
      google.accounts.id.initialize({ client_id: clienteId, ux_mode: "popup", callback: async ({ credential }) => { if (!(await recibir.current(credential))) soltar(); } });
      dibujar();
      setEstado("listo");
    }, 200);
    return () => clearInterval(intervalo);
  }, [lugar, clienteId, tema]);
  return estado;
}
