import { Cargando, Pagina } from "../piezas";
import "../estilos/ventas.css";

// Provisoria: falta conectarla (ver ../GUIA.md).
export function VentasDelDia() {
  return (
    <Pagina titulo="Ventas del día">
      <Cargando texto="Cargando…" />
    </Pagina>
  );
}
