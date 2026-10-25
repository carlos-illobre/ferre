import { useEffect, useState } from "react";
import { crearTicket, MAXIMO_DE_FOTOS, type Ticket } from "./tickets";

// Escribir un ticket (RF-80), igual en el celular y en la computadora: idea o error (la idea
// elegida al abrir), el texto, hasta cinco fotos y «Enviar». Sin conexión queda guardado y sale solo.
export function useTicketNuevo(dispositivo: () => string, version: string) {
  const [tipo, setTipo] = useState<Ticket["tipo"]>("mejora");
  const [texto, setTexto] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [falta, setFalta] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  useEffect(() => { if (!aviso) return; const x = setTimeout(() => setAviso(null), 6000); return () => clearTimeout(x); }, [aviso]);

  function agregarFotos(nuevas: File[]) {
    const imagenes = nuevas.filter((f) => f.type.startsWith("image/"));
    if (!imagenes.length) return;
    setFotos((actuales) => {
      const todas = [...actuales, ...imagenes];
      setFalta(todas.length > MAXIMO_DE_FOTOS ? `Son hasta ${MAXIMO_DE_FOTOS} fotos por ticket: quedaron las primeras ${MAXIMO_DE_FOTOS}.` : null);
      return todas.slice(0, MAXIMO_DE_FOTOS);
    });
  }
  async function enviar() {
    if (texto.trim().length < 3) { setFalta("Contá qué pasó o qué te gustaría, aunque sea en una línea."); return; }
    setEnviando(true); setFalta(null);
    try {
      await crearTicket({ tipo, descripcion: texto.trim(), dispositivo: dispositivo(), version }, fotos);
      setTexto(""); setFotos([]);
      setAviso(navigator.onLine ? "Ticket enviado. Gracias por avisar." : "Quedó guardado en este dispositivo: se envía solo cuando vuelva internet.");
    } catch { setFalta("No se pudo guardar el ticket en este dispositivo. Probá de nuevo."); }
    finally { setEnviando(false); }
  }
  return {
    tipo, setTipo, texto, fotos, falta, setFalta, aviso, enviando, agregarFotos, enviar,
    escribir: (t: string) => { setTexto(t); if (falta) setFalta(null); },
    quitarFoto: (i: number) => { setFotos(fotos.filter((_, n) => n !== i)); setFalta(null); },
    lleno: fotos.length >= MAXIMO_DE_FOTOS,
    corto: falta !== null && texto.trim().length < 3,
  };
}
export type TicketNuevo = ReturnType<typeof useTicketNuevo>;
