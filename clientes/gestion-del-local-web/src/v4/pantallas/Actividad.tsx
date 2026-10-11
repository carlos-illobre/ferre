import { Cargando, Pagina } from "../piezas";
import "../estilos/actividad.css";

// Provisoria: falta conectarla (ver ../GUIA.md).
export function Actividad() {
  return (
    <Pagina titulo="Quién hizo qué">
      <Cargando texto="Cargando…" />
    </Pagina>
  );
}
