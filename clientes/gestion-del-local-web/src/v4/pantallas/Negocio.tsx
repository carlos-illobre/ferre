import { Cargando, Pagina } from "../piezas";
import "../estilos/negocio.css";

// Provisoria: falta conectarla (ver ../GUIA.md).
export function Negocio() {
  return (
    <Pagina titulo="Cómo va el negocio">
      <Cargando texto="Cargando…" />
    </Pagina>
  );
}
