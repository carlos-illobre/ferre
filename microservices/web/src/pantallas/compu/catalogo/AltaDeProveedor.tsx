import { useId, type FormEvent } from "react";
import { useAltaDeProveedor, useLectores } from "../../../negocio/catalogo";
import { Aviso, Boton, Hoja } from "../base/ui";
import css from "./Listas.module.css";

// El alta de un proveedor: nombre, cómo se lee su planilla, si trae IVA y sus descuentos.
type Props = { enLinea: boolean; alCerrar: () => void; alAgregar: (nombre: string) => Promise<void> };
type Campo = "nombre" | "general" | "contado";

export function AltaDeProveedor({ enLinea, alCerrar, alAgregar }: Props) {
  const lectores = useLectores();
  const { error, setError, guardando, alta } = useAltaDeProveedor(alAgregar);
  const idError = useId();
  const ligar = (campo: Campo) => ({ "aria-invalid": error?.campo === campo, "aria-describedby": error?.campo === campo ? idError : undefined, onChange: () => { if (error?.campo === campo) setError(null); } });
  const enviar = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); void alta(e.currentTarget); };
  return (
    <Hoja titulo="Agregar un proveedor" alCerrar={alCerrar} testId="panel-proveedores">
      <form onSubmit={enviar} className="pila" noValidate>
        <label className="campo">
          <span>Nombre</span>
          <input className="entrada" name="nombre" autoFocus autoComplete="off" placeholder="Como figura en su planilla" {...ligar("nombre")} />
        </label>
        <label className="campo">
          <span>Cómo se lee su planilla</span>
          <select className="selector" name="lector" defaultValue="">
            <option value="">Se elige a mano al cargar</option>
            {lectores.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <label className={css.casilla}>
          <input type="checkbox" name="iva" />
          <span>Los precios de su lista ya incluyen IVA</span>
        </label>
        <div className={css.dos}>
          <Descuento nombre="general" texto="Descuento general (%)" ligar={ligar} />
          <Descuento nombre="contado" texto="Descuento por contado (%)" ligar={ligar} />
        </div>
        <p className="detalle">Vale para las listas que cargues de acá en adelante.</p>
        {error && <div id={idError}><Aviso tipo="error">{error.texto}</Aviso></div>}
        {!enLinea && <Aviso tipo="alerta">Sin conexión. Agregar un proveedor necesita internet.</Aviso>}
        <div className="hoja-pie">
          <Boton onClick={alCerrar}>Cancelar</Boton>
          <Boton type="submit" variante="principal" disabled={guardando || !enLinea}>{guardando ? "Agregando…" : "Agregar proveedor"}</Boton>
        </div>
      </form>
    </Hoja>
  );
}

function Descuento({ nombre, texto, ligar }: { nombre: "general" | "contado"; texto: string; ligar: (c: Campo) => object }) {
  return (
    <label className="campo">
      <span>{texto}</span>
      <input className="entrada numero" name={nombre} inputMode="decimal" defaultValue="0" onFocus={(e) => e.target.select()} {...ligar(nombre)} />
    </label>
  );
}
