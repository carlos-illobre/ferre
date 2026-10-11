import { Cargando, Pagina } from "../piezas";
import "../estilos/usuarios.css";

// Provisoria: falta conectarla (ver ../GUIA.md).
export function Usuarios() {
  return (
    <Pagina titulo="Usuarios y sesiones">
      <Cargando texto="Cargando…" />
    </Pagina>
  );
}
