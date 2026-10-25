import { useId, useState, type FormEvent } from "react";
import { crearSector } from "../../../negocio/deposito";
import { Boton, Hoja } from "../base/ui";
import { mensajeDe } from "./deposito-comun";
import css from "./Contar.module.css";

// Crear un sector: su nombre, y se empieza a contar.
export function SectorNuevo({ alCerrar, alCrear }: { alCerrar: () => void; alCrear: (id: string) => Promise<void> }) {
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const id = useId();
  async function crear(e: FormEvent) {
    e.preventDefault();
    if (ocupado) return;
    if (!nombre.trim()) { setError("Escribí el nombre del sector."); return; }
    setOcupado(true);
    try {
      await alCrear(await crearSector(nombre));
    } catch (err) {
      setError(mensajeDe(err, "No se creó: se cortó la conexión. Crear un sector necesita internet."));
      setOcupado(false);
    }
  }
  return (
    <Hoja titulo="Sector nuevo" alCerrar={alCerrar} testId="hoja-sector-nuevo">
      <form className="pila" onSubmit={crear} noValidate>
        <label className="campo" htmlFor={`${id}-nombre`}><span>Nombre del sector</span>
          <input id={`${id}-nombre`} name="nombre" className="entrada" value={nombre} onChange={(e) => { setNombre(e.target.value); setError(null); }} placeholder="Estantería 1, Pared de herramientas…" autoFocus autoComplete="off" maxLength={80}
            aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} data-testid="nombre-sector" />
        </label>
        {error && <p className={css.falta} id={`${id}-error`} role="alert">{error}</p>}
        <div className="hoja-pie">
          <Boton onClick={alCerrar} disabled={ocupado}>Cancelar</Boton>
          <Boton type="submit" variante="principal" disabled={ocupado} data-testid="crear-sector">{ocupado ? "Creando…" : "Crear y empezar a contar"}</Boton>
        </div>
      </form>
    </Hoja>
  );
}

