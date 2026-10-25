import { useEffect } from "react";
import { useEspejo } from "../../../espejo";
import { sincronizarEmparejamiento } from "../../../puesto";
import type { UsuarioDeLaSesion } from "../../../negocio/usuarios";
import type { Ruta } from "../base/rutas";
import { useEspejoDeLaParte } from "./useEspejoDeLaParte";
import { pantallaDe, useMenu } from "./useMenu";

// El menú de la persona, el espejo con el celular y el emparejamiento. Arrancan desde la entrada, antes de que haya
// sesión: el celular puede estar mandando desde antes (decisión 60).
export function useMarco(usuario: UsuarioDeLaSesion | null, ruta: Ruta) {
  useEspejo();
  const conSesion = usuario !== null;
  // Con la sesión abierta, el emparejamiento con el celular se pone al día con el servidor (decisión 58).
  useEffect(() => { if (conSesion) void sincronizarEmparejamiento(); }, [conSesion]);
  useEffect(() => { if (!conSesion) document.title = "Ferrebress"; }, [conSesion]);
  const actual = pantallaDe(ruta.nombre, location.hash.replace(/^#\/?/, "") === "");
  const m = useMenu(usuario, actual);
  useEspejoDeLaParte(ruta, actual, conSesion, m.menu);
  return { m, actual };
}
