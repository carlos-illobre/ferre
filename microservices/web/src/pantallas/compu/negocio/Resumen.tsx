import { useState, type ReactNode } from "react";
import { usePuede } from "../../permisos";
import { TEXTOS } from "../../textos";
import { SeccionDelNegocio } from "./SeccionDelNegocio";
import "./negocio.css";
import css from "./Resumen.module.css";

// Cómo va el negocio como la v2 (decisión 148): las secciones como segmentos con ícono, el
// período a la derecha y, en Ventas, cuatro números con su comparación, lo vendido por hora,
// cómo pagaron, lo más vendido, lo que no llevaron y el cierre de caja. Cada sección conserva su
// permiso (decisión 95); lo que el sistema todavía no sabe queda en su lugar con «—» (021, E02).
export { ResumenVentas } from "./ResumenVentas";

// Compras: los gastos de la semana con «Ver los gastos» y las compras recientes con «Ver las
// compras». La sección se ve con cualquiera de los dos y muestra lo que cada uno deja.
export function ResumenCompras({ recientes }: { recientes: (vuelta: number) => ReactNode }) {
  const puedeEsto = usePuede();
  const [vuelta, setVuelta] = useState(0);
  return (
    <SeccionDelNegocio seccion="compras" testId="resumen-compras" bajada={TEXTOS.negocio.seccionCompras.largo} alActualizar={() => setVuelta((v) => v + 1)}>
      {/* Como la v2 de Compras (decisión 148, 021-T004): los gastos y las compras recientes en una sola pantalla. */}
      {puedeEsto("negocio.gastos", "deposito.compras") && <div className={css.otra}>{recientes(vuelta)}</div>}
    </SeccionDelNegocio>
  );
}

// Inventario: el dinero invertido, en total y por proveedor.
export function ResumenInventario({ invertido }: { invertido: (vuelta: number) => ReactNode }) {
  const [vuelta, setVuelta] = useState(0);
  return (
    <SeccionDelNegocio seccion="inventario" testId="resumen-inventario" bajada={TEXTOS.negocio.seccionInventario.largo} alActualizar={() => setVuelta((v) => v + 1)}>
      <div className={css.otra}>{invertido(vuelta)}</div>
    </SeccionDelNegocio>
  );
}
