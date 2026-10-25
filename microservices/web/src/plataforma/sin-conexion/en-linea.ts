import { useEffect, useState } from "react";

// Si el navegador tiene conexión, al día con lo que avisa al perderla o recuperarla.
export function useEnLinea(): boolean {
  const [enLinea, setEnLinea] = useState(() => navigator.onLine);
  useEffect(() => {
    const si = () => setEnLinea(true);
    const no = () => setEnLinea(false);
    window.addEventListener("online", si);
    window.addEventListener("offline", no);
    return () => { window.removeEventListener("online", si); window.removeEventListener("offline", no); };
  }, []);
  return enLinea;
}
