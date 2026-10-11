import { Cargando, Pagina } from "../piezas";
import "../estilos/productos.css";

// Provisoria: falta conectarla (ver ../GUIA.md).
export function Productos() {
  return (
    <Pagina titulo="Productos">
      <Cargando texto="Cargando…" />
    </Pagina>
  );
}
