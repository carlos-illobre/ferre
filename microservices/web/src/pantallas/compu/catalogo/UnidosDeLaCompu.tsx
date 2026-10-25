import { useState } from "react";
import { buscarUniones, type Union } from "../../../negocio/catalogo";
import { fecha, numero } from "../../../negocio/formato";
import { TEXTOS } from "../../textos";
import { Boton, Buscador, Hoja } from "../base/ui";
import css from "./Duplicados.module.css";

// Los productos unidos, para separarlos si fue un error, con un buscador.
type Props = { uniones: Union[]; quieto: boolean; alSeparar: (u: Union) => Promise<void>; alCerrar: () => void };

export function UnidosDeLaCompu({ uniones, quieto, alSeparar, alCerrar }: Props) {
  const [buscado, setBuscado] = useState("");
  const vistas = buscarUniones(uniones, buscado);
  return (
    <Hoja titulo={`${TEXTOS.duplicados.productosUnidos.largo} (${numero(uniones.length)})`} alCerrar={alCerrar} ancha testId="unidos">
      {uniones.length === 0 ? <p className={css.nada}>Todavía no se unió ningún producto. Los que unas quedan acá, para poder separarlos si fue un error.</p> : (
        <>
          <Buscador valor={buscado} alCambiar={setBuscado} placeholder="Buscar un producto unido" etiqueta="Buscar un producto unido" testId="buscar-union" autoFoco />
          {vistas.length === 0 ? <p className={css.nada}>Ningún producto unido coincide con la búsqueda.</p> : <TablaDeUnidos vistas={vistas} quieto={quieto} alSeparar={alSeparar} />}
        </>
      )}
    </Hoja>
  );
}

function TablaDeUnidos({ vistas, quieto, alSeparar }: { vistas: Union[]; quieto: boolean; alSeparar: (u: Union) => Promise<void> }) {
  return (
    <table className={`tabla ${css.tabla}`}>
      <thead><tr><th scope="col">Producto que quedó</th><th scope="col">Absorbió a</th><th scope="col">Proveedores</th><th scope="col">Cuándo</th><th scope="col"><span className="solo-lectores">Separar</span></th></tr></thead>
      <tbody>
        {vistas.map((u) => (
          <tr key={u.absorbido_id} data-testid="union">
            <td className="nombre">{u.conservado}</td>
            <td>{u.absorbido}</td>
            <td className="detalle">{u.proveedores ?? "—"}</td>
            <td className="angosta">{fecha(u.unido_en.slice(0, 10))}</td>
            <td className="angosta"><Boton tam="chico" icono="separar" disabled={quieto} onClick={() => void alSeparar(u)} aria-label={`Separar ${u.absorbido} de ${u.conservado}`} data-testid="separar">{TEXTOS.duplicados.separar.largo}</Boton></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
