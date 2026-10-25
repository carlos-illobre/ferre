import { useState } from "react";
import { aEntrada, fueSinConexion, NOMBRE_DE_MEDIO, useCorregirVenta, ventasCambiaron, type Correccion, type Corrigiendo, type VentaDelDia } from "../../../negocio/ventas";
import { TEXTOS } from "../../textos";
import { signo } from "../../comun/ventas/textos-del-dia";

// Guardar la corrección y decir cómo quedó: la diferencia y cómo se resolvió. Si otra persona la
// corrigió mientras tanto (E28), se vuelve a cargar y se empieza con lo nuevo.
const t = TEXTOS.hoy;

function comoQuedo(k: Corrigiendo): string {
  if (!k.diferencia) return "";
  const como = k.resuelta === "cobrada" ? ` en ${NOMBRE_DE_MEDIO[k.medioDif].toLowerCase()}` : k.resuelta === "devuelta" ? " en efectivo" : " en la cuenta";
  return ` · ${signo(k.diferencia)}${como}`;
}

export function useGuardarCorreccion(v: VentaDelDia, c: Correccion, k: Corrigiendo, alGuardar: (mensaje: string) => void) {
  const { corregir, guardando } = useCorregirVenta();
  const [error, setError] = useState<string | null>(null);
  async function guardar() {
    if (k.falta || guardando) { if (k.falta) setError(k.falta); return; }
    setError(null);
    try {
      await corregir(v, aEntrada(v, c, k.medioDif));
      alGuardar(`${t.correccionGuardada.largo}${comoQuedo(k)}`);
    } catch (e) {
      if ((e as { estado?: number }).estado === 409 && /mientras/i.test((e as Error).message)) { void ventasCambiaron(); alGuardar(t.ventaCambio.largo); return; }
      setError(fueSinConexion(e) ? t.sinConexionCorregir.largo : `${(e as Error).message}.`);
    }
  }
  return { guardar, guardando, error };
}
