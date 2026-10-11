import { Cargando, Pagina } from "../piezas";
import "../estilos/duplicados.css";

// Provisoria: falta conectarla (ver ../GUIA.md).
export function Duplicados() {
  return (
    <Pagina titulo="Duplicados">
      <Cargando texto="Cargando…" />
    </Pagina>
  );
}
