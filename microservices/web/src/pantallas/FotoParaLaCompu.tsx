import { useRef, useState } from "react";
import { fotoPedida, mandarFotoALaCompu } from "../pedidos-al-celular";
import "./foto-de-factura.css";

// La pantalla que abre el celular desde el aviso «La computadora pide una foto»: saca la foto y
// la manda por la conexión entre los dos (specs/023), para que aparezca en la computadora donde
// se pidió (la factura de un ingreso, un producto, un ticket).
export function FotoParaLaCompu({ codigo }: { codigo: string }) {
  const pedido = fotoPedida(codigo);
  const [estado, setEstado] = useState<"lista" | "subiendo" | "enviada" | "vencido">(pedido ? "lista" : "vencido");
  const [error, setError] = useState<string | null>(null);
  const para = pedido?.para ?? "la computadora";
  const archivo = useRef<HTMLInputElement>(null);

  async function subir(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) { setError("Eso no es una foto."); return; }
    setEstado("subiendo"); setError(null);
    try {
      await mandarFotoALaCompu(codigo, f);
      setEstado("enviada");
    } catch (e) {
      setEstado("lista"); setError((e as Error).message || "No se pudo mandar la foto. Probá de nuevo.");
    }
  }

  return (
    <main className="ff-celular" data-testid="foto-para-la-compu">
      <h1>Foto para la computadora</h1>
      <input ref={archivo} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void subir(e.target.files?.[0]); e.target.value = ""; }} data-testid="archivo-para-la-compu" />
      {estado === "vencido" && <><p className="ff-error" role="alert">Este pedido ya no está.</p><p>En la computadora pedí la foto otra vez: el aviso te aparece acá.</p></>}
      {(estado === "lista" || estado === "subiendo") && (
        <>
          <p>La computadora pidió <strong>{para}</strong>. Sacala y va a aparecer sola allá.</p>
          <button type="button" className="ff-boton fuerte ff-grande-boton" disabled={estado === "subiendo"} onClick={() => archivo.current?.click()} data-testid="sacar-comprobante">
            {estado === "subiendo" ? "Mandando la foto…" : "Sacar la foto"}
          </button>
        </>
      )}
      {estado === "enviada" && (
        <>
          <p className="ff-listo" role="status">Listo: la foto ya está en la computadora.</p>
          <p>Si salió mal, en la computadora pedí la foto otra vez.</p>
          <a className="ff-boton ff-grande-boton" href="#/">Ir a la aplicación</a>
        </>
      )}
      {error && <p className="ff-error" role="alert">{error}</p>}
    </main>
  );
}
