import { useEffect, useRef, useState } from "react";
import { irA, type Ruta } from "../../../rutas";

type EstadoDeLaSesion = "cargando" | "sin-sesion" | "con-sesion";

// Al entrar (con Google o con la huella) se abre siempre el Catálogo, no la pantalla desde la
// que se había salido (decisión 56). Salvo que se haya llegado leyendo un código QR, que
// sigue con lo que vino a hacer.
export function useAlEntrar(estado: EstadoDeLaSesion, ruta: Ruta, codigo: string | null) {
  const estadoAnterior = useRef(estado);
  const [recienEntro, setRecienEntro] = useState(false);
  useEffect(() => {
    const venia = estadoAnterior.current;
    estadoAnterior.current = estado;
    if (venia !== "sin-sesion" || estado !== "con-sesion") return;
    // Si se llegó leyendo el código de una computadora, entrar fue la confirmación (RF-76).
    if (ruta.nombre === "entrar-compu") setRecienEntro(true);
    else if (!codigo) irA("catalogo");
  }, [estado, codigo, ruta.nombre]);
  return { recienEntro, veniaSinSesion: estadoAnterior.current === "sin-sesion" };
}
