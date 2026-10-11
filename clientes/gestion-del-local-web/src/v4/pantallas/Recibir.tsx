import { Cargando, Pagina } from "../piezas";
import "../estilos/recibir.css";

// Provisoria: falta conectarla (ver ../GUIA.md).
export function Recibir() {
  return (
    <Pagina titulo="Recibir mercadería">
      <Cargando texto="Cargando…" />
    </Pagina>
  );
}
