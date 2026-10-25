import { useState, type FormEvent } from "react";
import { datosDelProveedor, useLectores } from "../../../negocio/catalogo";
import { altaDeProveedor, faltaEnProveedor } from "../../../negocio/proveedores";
import { AvisoError, Hoja } from "../componentes/base";

// Agregar un proveedor: nombre, lector, si sus precios traen IVA y sus descuentos.
export function AltaDeProveedor({ alCerrar, alCambiar }: { alCerrar: () => void; alCambiar: () => Promise<void> }) {
  const lectores = useLectores();
  const [error, setError] = useState<string | null>(null);
  async function alta(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = datosDelProveedor(e.currentTarget);
    const falta = faltaEnProveedor(datos);
    if (falta) { setError(falta.texto); return; }
    try { await altaDeProveedor(datos); setError(null); await alCambiar(); } catch (err) { setError((err as Error).message); }
  }
  return (
    <Hoja titulo="Agregar un proveedor" alCerrar={alCerrar} testId="panel-proveedores">
      <form onSubmit={alta} className="formulario">
        <label className="renglon"><span>Nombre</span><input name="nombre" placeholder="Nombre del proveedor" required /></label>
        <label className="renglon"><span>Lector</span><select name="lector" defaultValue=""><option value="">elegir a mano al cargar</option>{lectores.map((l) => <option key={l} value={l}>{l}</option>)}</select></label>
        <label className="renglon"><span>Precios con IVA</span><input type="checkbox" name="iva" style={{ width: 22, height: 22, flex: "none" }} /></label>
        <label className="renglon"><span>Dto. general %</span><input name="general" type="number" min="0" max="100" step="0.5" defaultValue="0" /></label>
        <label className="renglon"><span>Dto. contado %</span><input name="contado" type="number" min="0" max="100" step="0.5" defaultValue="0" /></label>
        <div className="acciones" style={{ padding: "12px 0" }}><button type="submit" className="boton tinta">Agregar</button></div>
      </form>
      <AvisoError texto={error} />
    </Hoja>
  );
}
