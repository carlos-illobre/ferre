import { Cargando, Pagina } from "../piezas";
import "../estilos/stock.css";

// Provisoria: falta conectarla (ver ../GUIA.md).
export function Stock() {
  return (
    <Pagina titulo="Stock">
      <Cargando texto="Cargando…" />
    </Pagina>
  );
}
