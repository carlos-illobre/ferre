import { DE_MAS } from "../estructura/destinos";
import { Figura, Icono, Pagina } from "../piezas";
import { enlace } from "../ruta";
import "../estilos/mas.css";

export default function Mas() {
  return (
    <Pagina titulo="Más">
      <nav className="mas" aria-label="Más cosas para hacer">
        {DE_MAS.map((d) => (
          <a key={d.camino} className="mas__tarjeta" href={enlace(d.camino)}>
            <Figura icono={d.icono} tono="naranja" tam="grande" />
            <span className="mas__texto">
              <strong>{d.nombre}</strong>
              <span>{d.detalle}</span>
            </span>
            <Icono nombre="flecha" tam={20} className="mas__flecha" />
          </a>
        ))}
      </nav>
    </Pagina>
  );
}
