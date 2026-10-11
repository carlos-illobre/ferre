import { Cargando, Pagina } from "../piezas";
import "../estilos/listas.css";

// Provisoria: falta conectarla (ver ../GUIA.md).
export function Listas() {
  return (
    <Pagina titulo="Listas de precios">
      <Cargando texto="Cargando…" />
    </Pagina>
  );
}
