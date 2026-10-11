import { Cargando, Pagina } from "../piezas";
import "../estilos/contar.css";

// Provisoria: falta conectarla (ver ../GUIA.md).
export function Contar() {
  return (
    <Pagina titulo="Contar stock">
      <Cargando texto="Cargando…" />
    </Pagina>
  );
}
